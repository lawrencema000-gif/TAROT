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
 *   1. Pages through every active OR trialing subscription in Stripe (limit=100/page).
 *   2. For each one, reads metadata.user_id and checks profiles.is_premium.
 *   3. If mismatched (profile says false but Stripe says active/trialing),
 *      fixes profiles.is_premium = true.
 *   4. **No reverse-direction downgrade.** We deliberately do NOT auto-flip
 *      is_premium=true → false based on "no Stripe sub". Reasons:
 *        - Trial users in `trialing` state. (Even with #1 fix, race
 *          conditions during sub state transitions can produce false
 *          negatives.)
 *        - Admin grants / comped accounts that have no subscription record.
 *        - RevenueCat (mobile) users where the subscriptions row may have
 *          stale status.
 *        - Newly-purchased users in the window between webhook firing and
 *          subscriptions row being written.
 *      Cancellations are handled by the customer.subscription.deleted
 *      webhook, which is reliable. If it ever misses, manual support ticket
 *      is the right path — better than wrongly downgrading a paying user.
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

    // 1. Walk all active + trialing Stripe subscriptions. Trialing users
    //    (3-day free trial) DO have premium access — they were missed by
    //    the original `status: "active"` filter, which incorrectly
    //    downgraded them.
    for (const status of ["active", "trialing"] as const) {
      let starting_after: string | undefined;
      while (true) {
        const page = await stripe.subscriptions.list({
          status,
          limit: 100,
          starting_after,
          expand: ["data.items"],
        });
        for (const sub of page.data) {
          summary.scanned++;
          const userId = sub.metadata?.user_id;
          if (!userId) continue;

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
            ctx.log.info("reconcile.fixed_to_premium", { userId, subscriptionId: sub.id, subStatus: status });
          }
        }
        if (!page.has_more) break;
        starting_after = page.data[page.data.length - 1]?.id;
      }
    }

    // 2. NO reverse-direction downgrade. See header comment for why.
    //    Cancellations are reliable via customer.subscription.deleted
    //    webhook; if it misses, manual support ticket is the right path.
    //    The previous reverse-direction logic incorrectly downgraded
    //    admin grants, comped accounts, trial users, and race-window
    //    new-purchase users.

    ctx.log.info("reconcile.complete", {
      scanned: summary.scanned,
      fixed_to_premium: summary.fixed_to_premium,
      fixed_to_free: summary.fixed_to_free,
      errors: summary.errors.length,
    });

    return summary;
  },
}));
