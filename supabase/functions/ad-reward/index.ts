import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { z } from "npm:zod@3.24.1";
import { AppError, handler } from "../_shared/handler.ts";
import { AD_MIN_GAP_MS, rewardedAdStatus } from "../_shared/rewarded-ads.ts";

/**
 * Rewarded-ad Moonstone credit.
 *
 * The client used to call the SECURITY DEFINER RPC moonstone_credit_for_ad
 * directly, with any ad-event id and any amount up to 200 — which is how a
 * QA balance went 100 → 710 with zero ads watched (p7-ai-audit §0.1). That
 * RPC is now service-role only (20261003000005). The credit runs here as the
 * service role, through moonstone_credit_for_ad_srv, which fixes the amount
 * at 50 and enforces per user: at most 6 credits per UTC day, at least 20 s
 * between credits, and idempotency on the client's ad_event_id (a replay
 * returns the same outcome and is not another ad).
 *
 * Bounded exposure without AdMob server-side verification: 300 Moonstones
 * per user per day. True verification is the AdMob SSV callback (a signed
 * GET from Google) — an AdMob console task for the owner; this function is
 * where that callback would be verified and the credit issued instead of on
 * the client's word.
 *
 * Every answer says how many credits are left today (`creditsRemaining`),
 * and the two refusals carry what the client needs to stop offering an ad
 * that would earn nothing (p7 #33):
 *   429 AD_DAILY_CAP  details { creditsRemaining: 0, resetAt }
 *   429 AD_TOO_SOON   details { retryAfterMs, creditsRemaining }
 */

const RequestSchema = z.object({
  adEventId: z.string().min(8).max(128).regex(/^[A-Za-z0-9_.:-]+$/),
});
type Req = z.infer<typeof RequestSchema>;

interface Resp {
  amountCredited: number;
  newBalance: number;
  alreadyCredited: boolean;
  /** Credits still possible today (UTC); null if the ledger could not be read. */
  creditsRemaining: number | null;
  /** When the daily cap resets (next UTC midnight, ISO). */
  resetAt: string | null;
}

Deno.serve(
  handler<Req, Resp>({
    fn: "ad-reward",
    auth: "required",
    methods: ["POST"],
    rateLimit: { max: 12, windowMs: 60_000 },
    requestSchema: RequestSchema,
    run: async (ctx, body) => {
      const { data, error } = await ctx.supabase.rpc("moonstone_credit_for_ad_srv", {
        p_user_id: ctx.userId,
        p_ad_event_id: body.adEventId,
      });

      if (error) {
        const msg = error.message ?? "";
        if (msg.startsWith("AD_DAILY_CAP")) {
          const status = await rewardedAdStatus(ctx.supabase, ctx.userId!);
          throw new AppError(
            "AD_DAILY_CAP",
            "You have earned today's rewarded-ad Moonstones. Come back tomorrow.",
            429,
            { creditsRemaining: 0, resetAt: status?.resetAt ?? null },
          );
        }
        if (msg.startsWith("AD_TOO_SOON")) {
          const status = await rewardedAdStatus(ctx.supabase, ctx.userId!);
          const retryAfterMs = status
            ? Math.max(0, Date.parse(status.nextAvailableAt) - Date.now())
            : AD_MIN_GAP_MS;
          throw new AppError("AD_TOO_SOON", "Give it a moment before the next ad.", 429, {
            retryAfterMs,
            creditsRemaining: status?.creditsRemaining ?? null,
          });
        }
        ctx.log.error("ad_reward.rpc_failed", { err: msg });
        throw new AppError("CREDIT_FAILED", "Could not credit the reward", 500);
      }

      const row = Array.isArray(data) ? data[0] : data;
      if (!row) throw new AppError("NO_ROW", "RPC returned no row", 500);

      const status = await rewardedAdStatus(ctx.supabase, ctx.userId!);
      const result: Resp = {
        amountCredited: Number(row.amount_credited ?? 0),
        newBalance: Number(row.new_balance ?? 0),
        alreadyCredited: Boolean(row.already_credited),
        creditsRemaining: status?.creditsRemaining ?? null,
        resetAt: status?.resetAt ?? null,
      };
      ctx.log.info("ad_reward.credited", {
        amount: result.amountCredited,
        alreadyCredited: result.alreadyCredited,
      });
      return result;
    },
  }),
);
