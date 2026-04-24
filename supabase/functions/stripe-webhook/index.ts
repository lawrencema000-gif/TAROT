import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14.10.0";
import { AppError, handler } from "../_shared/handler.ts";

/**
 * Stripe webhook handler.
 *
 * Auth: `auth: "optional"` — we do NOT use the handler's generic webhook
 * secret check because Stripe's HMAC signature scheme is non-trivial (it
 * includes a timestamp plus scheme-specific payload serialization). Instead
 * we keep Stripe's own `webhooks.constructEvent` inside `run`.
 *
 * Idempotency: the first DB call is an INSERT into `webhook_events`. If the
 * event_id already exists, ON CONFLICT makes the INSERT a no-op, and we
 * return `{received:true, duplicate:true}` without touching profiles /
 * subscriptions / audit_events.
 */

interface StripeSubscriptionMetadata {
  provider: string;
  productId: string;
  status: string;
  period: string;
  transactionId: string;
  startedAt?: string;
  expiresAt?: string;
}

function getPeriodFromInterval(interval: string): string {
  switch (interval) {
    case "month": return "monthly";
    case "year":  return "yearly";
    case "week":  return "weekly";
    default:      return "monthly";
  }
}

Deno.serve(
  handler({
    fn: "stripe-webhook",
    auth: "optional",
    // Stripe retries on 5xx; keep idle headroom for bursts.
    rateLimit: { max: 300, windowMs: 60_000 },
    run: async (ctx) => {
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
        apiVersion: "2024-11-20.acacia",
        httpClient: Stripe.createFetchHttpClient(),
      });
      const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

      const signature = ctx.req.headers.get("stripe-signature");
      if (!signature) {
        ctx.log.warn("stripe_webhook.missing_signature");
        throw new AppError("STRIPE_SIGNATURE_MISSING", "Missing Stripe signature", 400);
      }
      if (!webhookSecret) {
        ctx.log.error("stripe_webhook.secret_not_configured");
        throw new AppError("WEBHOOK_SECRET_MISSING", "Stripe webhook secret not configured", 500);
      }

      // Stripe signature verification needs the RAW body — it was NOT parsed
      // by the handler wrapper because there's no JSON content-type match for
      // the handler's default parse path on Stripe's POST (Stripe sends JSON
      // but we need the raw text for HMAC). We re-read via clone().
      const rawBody = await ctx.req.clone().text();

      let event: Stripe.Event;
      try {
        event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
      } catch (err) {
        ctx.log.warn("stripe_webhook.signature_invalid", { err });
        throw new AppError("STRIPE_SIGNATURE_INVALID", "Invalid Stripe signature", 400);
      }

      // ── Idempotency: insert event.id into webhook_events. If already
      // present, bail with a success no-op so Stripe stops retrying.
      const { data: inserted, error: idemErr } = await ctx.supabase
        .from("webhook_events")
        .insert({ source: "stripe", event_id: event.id })
        .select("id")
        .maybeSingle();

      if (idemErr && idemErr.code !== "23505") {
        // 23505 = unique_violation; anything else is a real problem.
        ctx.log.error("stripe_webhook.idempotency_insert_failed", { err: idemErr, eventId: event.id });
        throw new AppError("IDEMPOTENCY_WRITE_FAILED", "Could not record webhook event", 500);
      }

      if (!inserted) {
        ctx.log.info("stripe_webhook.duplicate", { eventId: event.id, type: event.type });
        return new Response(
          JSON.stringify({ received: true, duplicate: true }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      ctx.log.info("stripe_webhook.received", { eventId: event.id, type: event.type });

      async function updateUserPremiumStatus(
        userId: string,
        isPremium: boolean,
        subscriptionData?: StripeSubscriptionMetadata,
      ): Promise<void> {
        const { error: profileError } = await ctx.supabase
          .from("profiles")
          .update({ is_premium: isPremium })
          .eq("id", userId);

        if (profileError) {
          ctx.log.error("stripe_webhook.profile_update_failed", { err: profileError, userId });
          throw profileError;
        }

        if (subscriptionData) {
          const { error: subError } = await ctx.supabase.from("subscriptions").upsert(
            {
              user_id: userId,
              provider: subscriptionData.provider,
              product_id: subscriptionData.productId,
              status: subscriptionData.status,
              period: subscriptionData.period,
              transaction_id: subscriptionData.transactionId,
              started_at: subscriptionData.startedAt,
              expires_at: subscriptionData.expiresAt,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "transaction_id" },
          );

          if (subError) {
            ctx.log.error("stripe_webhook.subscription_upsert_failed", { err: subError, userId });
          }
        }

        const { error: auditError } = await ctx.supabase.from("audit_events").insert({
          user_id: userId,
          event_name: isPremium ? "premium_activated" : "premium_deactivated",
          payload: {
            provider: "stripe",
            ...subscriptionData,
          },
        });

        if (auditError) {
          ctx.log.error("stripe_webhook.audit_insert_failed", { err: auditError, userId });
        }
      }

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.client_reference_id || session.metadata?.user_id;
          const productId = session.metadata?.product_id;
          const purchaseType = session.metadata?.purchase_type;

          if (!userId) {
            ctx.log.warn("stripe_webhook.missing_user_id", { eventType: event.type });
            break;
          }

          // Moonstone pack branch: credit ledger.
          if (purchaseType === "moonstones") {
            const packId = session.metadata?.product_id || "";
            const amountRaw = session.metadata?.moonstones;
            const amount = amountRaw ? parseInt(amountRaw, 10) : 0;
            if (!Number.isFinite(amount) || amount <= 0 || amount > 100_000) {
              ctx.log.warn("stripe_webhook.moonstone_bad_amount", { packId, amountRaw });
              break;
            }
            const { error: ledgerErr } = await ctx.supabase
              .from("moonstone_transactions")
              .insert({
                user_id: userId,
                amount,
                kind: "purchase",
                reference: session.payment_intent as string,
                note: `Pack: ${packId}`,
              });
            if (ledgerErr) {
              ctx.log.error("stripe_webhook.moonstone_ledger_failed", { err: ledgerErr.message });
            } else {
              ctx.log.info("stripe_webhook.moonstones_credited", { userId, packId, amount });
            }
            break;
          }

          // Pay-per-report branch: insert report_unlocks + optional affiliate accrual.
          if (purchaseType === "report") {
            const reportKey = session.metadata?.report_key;
            const reference = session.metadata?.reference;
            const amountCents = session.amount_total ?? 0;
            if (!reportKey || !reference || amountCents <= 0) {
              ctx.log.warn("stripe_webhook.report_missing_metadata", { sessionId: session.id });
              break;
            }
            const { error: unlockErr } = await ctx.supabase
              .from("report_unlocks")
              .upsert(
                {
                  user_id: userId,
                  report_key: reportKey,
                  reference,
                  cost_currency: "usd",
                  cost_amount: amountCents,
                },
                { onConflict: "user_id,report_key,reference" },
              );
            if (unlockErr) {
              ctx.log.error("stripe_webhook.report_unlock_failed", { err: unlockErr.message });
            } else {
              ctx.log.info("stripe_webhook.report_unlocked", { userId, reportKey });
            }

            const affiliateReferrerId = session.metadata?.affiliate_referrer_id;
            if (affiliateReferrerId) {
              const affiliateShare = Math.floor(amountCents * 0.1);
              if (affiliateShare > 0) {
                const { error: accrueErr } = await ctx.supabase
                  .from("affiliate_earnings")
                  .insert({
                    referrer_id: affiliateReferrerId,
                    invitee_id: userId,
                    source: "pay-per-report",
                    source_ref: session.id,
                    invitee_revenue_cents: amountCents,
                    affiliate_share_cents: affiliateShare,
                    share_percent: 10.00,
                    currency: "usd",
                  });
                if (accrueErr) {
                  ctx.log.error("stripe_webhook.affiliate_accrual_failed", { err: accrueErr.message });
                } else {
                  ctx.log.info("stripe_webhook.affiliate_accrued", {
                    affiliateReferrerId,
                    affiliateShare,
                  });
                }
              }
            }
            break;
          }

          if (session.mode === "subscription") {
            const subscription = await stripe.subscriptions.retrieve(
              session.subscription as string,
            );

            await updateUserPremiumStatus(userId, true, {
              provider: "stripe",
              productId: productId || subscription.items.data[0].price.id,
              status: subscription.status === "trialing" ? "trial" : "active",
              period: getPeriodFromInterval(subscription.items.data[0].price.recurring?.interval || "month"),
              transactionId: subscription.id,
              startedAt: new Date(subscription.created * 1000).toISOString(),
              expiresAt: subscription.current_period_end
                ? new Date(subscription.current_period_end * 1000).toISOString()
                : undefined,
            });

            ctx.log.info("stripe_webhook.user_subscribed", { userId });
          } else if (session.mode === "payment") {
            await updateUserPremiumStatus(userId, true, {
              provider: "stripe",
              productId: productId || "lifetime",
              status: "active",
              period: "lifetime",
              transactionId: session.payment_intent as string,
              startedAt: new Date().toISOString(),
            });

            ctx.log.info("stripe_webhook.user_lifetime", { userId });
          }
          break;
        }

        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription;
          const userId = subscription.metadata?.user_id;

          if (!userId) {
            ctx.log.warn("stripe_webhook.missing_user_id", { eventType: event.type });
            break;
          }

          const isActive = ["active", "trialing"].includes(subscription.status);

          await updateUserPremiumStatus(userId, isActive, {
            provider: "stripe",
            productId: subscription.items.data[0].price.id,
            status: subscription.status === "trialing" ? "trial" : subscription.status,
            period: getPeriodFromInterval(subscription.items.data[0].price.recurring?.interval || "month"),
            transactionId: subscription.id,
            startedAt: new Date(subscription.created * 1000).toISOString(),
            expiresAt: subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : undefined,
          });

          ctx.log.info("stripe_webhook.subscription_updated", { subscriptionId: subscription.id, status: subscription.status });
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          const userId = subscription.metadata?.user_id;

          if (!userId) {
            ctx.log.warn("stripe_webhook.missing_user_id", { eventType: event.type });
            break;
          }

          await updateUserPremiumStatus(userId, false, {
            provider: "stripe",
            productId: subscription.items.data[0].price.id,
            status: "cancelled",
            period: getPeriodFromInterval(subscription.items.data[0].price.recurring?.interval || "month"),
            transactionId: subscription.id,
            startedAt: new Date(subscription.created * 1000).toISOString(),
            expiresAt: subscription.ended_at
              ? new Date(subscription.ended_at * 1000).toISOString()
              : undefined,
          });

          ctx.log.info("stripe_webhook.subscription_cancelled", { subscriptionId: subscription.id });
          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          const subscriptionId = invoice.subscription;

          if (subscriptionId) {
            const sub = await stripe.subscriptions.retrieve(subscriptionId as string);
            const userId = sub.metadata?.user_id;

            if (userId) {
              const { error } = await ctx.supabase
                .from("subscriptions")
                .update({ status: "grace_period" })
                .eq("transaction_id", subscriptionId as string);

              if (error) {
                ctx.log.error("stripe_webhook.grace_period_update_failed", { err: error, userId });
              }

              ctx.log.info("stripe_webhook.payment_failed_grace", { userId });
            }
          }
          break;
        }

        case "account.updated": {
          const account = event.data.object as Stripe.Account;
          const onboardingComplete = !!account.details_submitted;
          const payoutsEnabled = !!account.payouts_enabled;
          const { error } = await ctx.supabase
            .from("advisor_payout_accounts")
            .update({
              onboarding_complete: onboardingComplete,
              payouts_enabled: payoutsEnabled,
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_account_id", account.id);
          if (error) {
            ctx.log.error("stripe_webhook.account_updated_failed", { err: error.message });
          } else {
            ctx.log.info("stripe_webhook.account_updated", {
              accountId: account.id,
              onboardingComplete,
              payoutsEnabled,
            });
          }
          break;
        }

        default:
          ctx.log.info("stripe_webhook.unhandled_event", { type: event.type });
      }

      return new Response(
        JSON.stringify({ received: true }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  }),
);
