import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handler, AppError } from "../_shared/handler.ts";
import { z } from "npm:zod@3.24.1";

/**
 * Device-driven premium reconcile (downgrade-only safety net).
 *
 * Why this exists:
 *   The RevenueCat → profiles webhook is the primary source of truth for
 *   `profiles.is_premium`. But webhooks occasionally fail silently —
 *   sandbox / test accounts, RC project misconfig, transient errors that
 *   exhaust retries, deploys mid-fire. When that happens for an
 *   EXPIRATION event, the user's trial ends but the DB never flips
 *   `is_premium=false`, so the user keeps premium access forever.
 *
 *   Meanwhile, the device's RevenueCat SDK gets fresh entitlement state
 *   directly from RC every time the app opens. So the device knows the
 *   truth even when the webhook missed. This endpoint lets the client
 *   tell the server "RC says I no longer have the entitlement" and
 *   updates the DB to match.
 *
 * Security model:
 *   - Auth required. ctx.userId comes from the verified Supabase JWT —
 *     a user can only reconcile their own profile.
 *   - DOWNGRADE-ONLY. We will only ever flip `is_premium` true → false.
 *     Upgrades remain webhook-driven (the existing INITIAL_PURCHASE /
 *     RENEWAL path) because trusting a client claim of "I have premium"
 *     would be exploitable.
 *   - Idempotent. Calling repeatedly with the same state is a no-op.
 *
 * What it does:
 *   1. Reads the caller's user_id from auth context (NOT from body —
 *      no spoofing).
 *   2. Reads `profiles.is_premium`.
 *   3. If body says hasPremiumEntitlement=false AND DB says
 *      is_premium=true → flip DB to false, mark any open subscriptions
 *      row as expired, log the event.
 *   4. Otherwise no-op.
 */

const RequestSchema = z.object({
  /** True if the device's RC SDK reports the user has the "premium"
   *  entitlement active right now. False if not. The server uses this
   *  ONLY to drive downgrades — never upgrades. */
  hasPremiumEntitlement: z.boolean(),
  /** Optional debug context — logged so we can attribute any false
   *  downgrades to a buggy client. Not used for any decision. */
  debugContext: z.object({
    rcAppUserId: z.string().max(120).optional(),
    sdkVersion: z.string().max(60).optional(),
    platform: z.string().max(20).optional(),
  }).optional(),
});

type Req = z.infer<typeof RequestSchema>;

interface Resp {
  /** Whether DB was changed. False = already in sync. */
  changed: boolean;
  /** The is_premium value AFTER this call (whether changed or not). */
  isPremium: boolean;
  /** Why the DB wasn't changed, if applicable. */
  reason?: string;
}

Deno.serve(handler<Req, Resp>({
  fn: "reconcile-premium-from-device",
  auth: "required",
  methods: ["POST"],
  rateLimit: { max: 20, windowMs: 60_000 },
  requestSchema: RequestSchema,
  run: async (ctx, body) => {
    const userId = ctx.userId!;

    // 1. Read current profile state.
    const { data: profile, error: fetchErr } = await ctx.supabase
      .from("profiles")
      .select("is_premium")
      .eq("id", userId)
      .maybeSingle();
    if (fetchErr) {
      throw new AppError("PROFILE_FETCH_FAILED", "Could not read profile", 500);
    }
    if (!profile) {
      throw new AppError("PROFILE_NOT_FOUND", "Profile not found", 404);
    }

    const dbIsPremium = !!profile.is_premium;

    // 2. The only state we act on: device says NO, DB says YES.
    //    Every other combination is a no-op (and we log the discrepancy
    //    if the directions are reversed so we can investigate).
    if (body.hasPremiumEntitlement) {
      // Client claims user IS premium — we don't trust this for upgrades.
      // The webhook handles INITIAL_PURCHASE / RENEWAL. Just no-op.
      return {
        changed: false,
        isPremium: dbIsPremium,
        reason: "device-claims-premium-no-op",
      };
    }

    if (!dbIsPremium) {
      // Already in sync — both say not premium.
      return { changed: false, isPremium: false, reason: "already-not-premium" };
    }

    // 3. The downgrade case. Device says no entitlement, DB says premium.
    //    Flip the DB.
    ctx.log.info("reconcile_premium_from_device.downgrading", {
      userId,
      debugContext: body.debugContext,
    });

    const { error: updateErr } = await ctx.supabase
      .from("profiles")
      .update({ is_premium: false })
      .eq("id", userId);
    if (updateErr) {
      ctx.log.error("reconcile_premium_from_device.profile_update_failed", {
        err: updateErr,
        userId,
      });
      throw new AppError("PROFILE_UPDATE_FAILED", "Could not update profile", 500);
    }

    // Mark any still-open subscriptions row as expired so the ledger
    // reflects reality. If there's no row (the freeloader case from
    // before this fix), nothing happens — the profiles flag is what
    // gates premium access elsewhere in the app.
    const { error: subErr } = await ctx.supabase
      .from("subscriptions")
      .update({
        status: "expired",
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .in("status", ["active", "trial", "grace_period", "cancelled"]);
    if (subErr) {
      // Non-fatal — the profiles flag is what matters for gating.
      ctx.log.warn("reconcile_premium_from_device.subscriptions_update_failed", {
        err: subErr,
        userId,
      });
    }

    return { changed: true, isPremium: false };
  },
}));
