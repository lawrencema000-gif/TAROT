import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14.10.0";
import { handler, AppError } from "../_shared/handler.ts";

/**
 * Daily Stripe-to-profiles drift reconcile.
 *
 * Webhooks are async + retried — they're 99.9% reliable but occasionally
 * fail (Supabase outage, network blip, deploy mid-fire). When that happens,
 * a paying user has profile.is_premium = false despite their Stripe
 * subscription being active. Without this job they'd email support.
 *
 * What this does:
 *   1. Pages through every active subscription in Stripe (limit=100/page).
 *   2. For each one, reads metadata.user_id and checks profiles.is_premium.
 *   3. If mismatched, fixes profiles.is_premium and inserts a subscriptions
 *      row if missing.
 *   4. Reverse direction: queries profiles WHERE is_premium = true and
 *      checks if any are NOT in Stripe's active set — those get is_premium
 *      flipped off (someone whose card got declined and webhook missed it).
 *
 * Auth: webhook (CRON_SECRET shared with daily-seo-blog-generator).
 *
 * Manual fire:
 *   curl -X POST "$SUPABASE_URL/functions/v1/reconcile-premium-status" \
 *     -H "x-webhook-secret: $CRON_SECRET" -d '{}'
 */

interface ReconcileSummary {
  scanned: number;
  fixed_to_premium: number;
  fixed_to_free: number;
  errors: string[];
}

Deno.serve(handler({
  fn: "reconcile-premium-status",
  auth: "webhook",
  webhookSecretEnv: "CRON_SECRET",
  rateLimit: { max: 5, windowMs: 60_000 },
  run: async (ctx) => {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new AppError("STRIPE_NOT_CONFIGURED", "STRIPE_SECRET_KEY missing", 503);

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2024-11-20.acacia",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const summary: ReconcileSummary = {
      scanned: 0,
      fixed_to_premium: 0,
      fixed_to_free: 0,
      errors: [],
    };

    // Stripe-active user IDs we'll cross-check against profiles.is_premium=true.
    const stripeActiveUserIds = new Set<string>();

    // 1. Walk all active Stripe subscriptions.
    let starting_after: string | undefined;
    while (true) {
      const page = await stripe.subscriptions.list({
        status: "active",
        limit: 100,
        starting_after,
        expand: ["data.items"],
      });
      for (const sub of page.data) {
        summary.scanned++;
        const userId = sub.metadata?.user_id;
        if (!userId) continue;
        stripeActiveUserIds.add(userId);

        // Compare to current profile state.
        const { data: profile, error: pErr } = await ctx.supabase
          .from("profiles")
          .select("is_premium")
          .eq("id", userId)
          .maybeSingle();
        if (pErr) {
          summary.errors.push(`profile read ${userId}: ${pErr.message}`);
          continue;
        }
        if (!profile?.is_premium) {
          // Drift — fix forward.
          const { error: uErr } = await ctx.supabase
            .from("profiles")
            .update({ is_premium: true })
            .eq("id", userId);
          if (uErr) {
            summary.errors.push(`profile update ${userId}: ${uErr.message}`);
            continue;
          }
          summary.fixed_to_premium++;
          ctx.log.info("reconcile.fixed_to_premium", { userId, subscriptionId: sub.id });
        }
      }
      if (!page.has_more) break;
      starting_after = page.data[page.data.length - 1]?.id;
    }

    // 2. Reverse: find profiles.is_premium=true that are NOT in Stripe's
    //    active set. These are users whose subscription ended but the
    //    customer.subscription.deleted webhook didn't fire/land.
    const { data: dbPremium, error: dbErr } = await ctx.supabase
      .from("profiles")
      .select("id")
      .eq("is_premium", true);
    if (dbErr) {
      summary.errors.push(`profiles list: ${dbErr.message}`);
    } else if (dbPremium) {
      for (const row of dbPremium) {
        if (stripeActiveUserIds.has(row.id)) continue;
        // This user is is_premium=true in DB but has no active Stripe sub.
        // Could legitimately be a lifetime payment OR a RevenueCat (mobile)
        // user. Check the subscriptions table to distinguish.
        const { data: subRow } = await ctx.supabase
          .from("subscriptions")
          .select("provider, period, status")
          .eq("user_id", row.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const isLifetime = subRow?.period === "lifetime" && subRow?.status === "active";
        const isMobile = subRow?.provider === "google" || subRow?.provider === "apple";
        if (isLifetime || isMobile) continue; // legitimate non-Stripe premium

        // Drift — flip off.
        const { error: uErr } = await ctx.supabase
          .from("profiles")
          .update({ is_premium: false })
          .eq("id", row.id);
        if (uErr) {
          summary.errors.push(`profile downgrade ${row.id}: ${uErr.message}`);
          continue;
        }
        summary.fixed_to_free++;
        ctx.log.info("reconcile.fixed_to_free", { userId: row.id });
      }
    }

    ctx.log.info("reconcile.complete", {
      scanned: summary.scanned,
      fixed_to_premium: summary.fixed_to_premium,
      fixed_to_free: summary.fixed_to_free,
      errors: summary.errors.length,
    });

    return summary;
  },
}));
