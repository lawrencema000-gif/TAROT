import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { AppError, handler } from "../_shared/handler.ts";

/**
 * RevenueCat webhook handler.
 *
 * RC's signature scheme is a shared-secret Bearer token in the Authorization
 * header, which the generic `auth: "webhook"` mode in the handler wrapper
 * already supports. We use `webhookSecretEnv: "REVENUECAT_WEBHOOK_SECRET"`
 * to delegate that check.
 *
 * Idempotency uses the webhook_events ledger with source='revenuecat'. The
 * unique key is `event.id` as issued by RevenueCat.
 */

interface RevenueCatEvent {
  api_version: string;
  event: {
    id: string;
    type: string;
    app_user_id: string;
    aliases: string[];
    original_app_user_id: string;
    product_id: string;
    period_type: string;
    purchased_at_ms: number;
    expiration_at_ms: number | null;
    environment: string;
    entitlement_ids: string[];
    presented_offering_id: string | null;
    transaction_id: string;
    original_transaction_id: string;
    is_trial_conversion: boolean;
    store: string;
    takehome_percentage: number;
    currency: string;
    price: number;
    price_in_purchased_currency: number;
  };
}

Deno.serve(
  handler<RevenueCatEvent>({
    fn: "revenuecat-webhook",
    auth: "webhook",
    webhookSecretEnv: "REVENUECAT_WEBHOOK_SECRET",
    rateLimit: { max: 300, windowMs: 60_000 },
    run: async (ctx, body) => {
      // Test webhook (no event body) — RC uses these to validate the endpoint.
      if (!body?.event) {
        ctx.log.info("revenuecat_webhook.test_ping");
        return new Response(
          JSON.stringify({ success: true, message: "Test webhook received" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      const eventId = body.event.id;
      const eventType = body.event.type;
      const userId = body.event.app_user_id;
      const productId = body.event.product_id || "";
      const entitlements = body.event.entitlement_ids || [];

      if (!eventId) {
        ctx.log.warn("revenuecat_webhook.missing_event_id");
        throw new AppError("EVENT_ID_MISSING", "event.id required for idempotency", 400);
      }

      // ── Idempotency gate ──
      const { data: inserted, error: idemErr } = await ctx.supabase
        .from("webhook_events")
        .insert({ source: "revenuecat", event_id: eventId })
        .select("id")
        .maybeSingle();

      if (idemErr && idemErr.code !== "23505") {
        ctx.log.error("revenuecat_webhook.idempotency_insert_failed", { err: idemErr, eventId });
        throw new AppError("IDEMPOTENCY_WRITE_FAILED", "Could not record webhook event", 500);
      }

      if (!inserted) {
        ctx.log.info("revenuecat_webhook.duplicate", { eventId, type: eventType });
        return new Response(
          JSON.stringify({ received: true, duplicate: true }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      ctx.log.info("revenuecat_webhook.received", {
        eventId,
        type: eventType,
        userId,
        productId,
        entitlementCount: entitlements.length,
      });

      const hasPremium = entitlements.includes("premium");

      // ── Moonstone pack credit (non-subscription IAP) ──────────────────
      // Product IDs encode the pack size: arcana_moonstones_<N>. We parse N
      // out rather than hard-code the table here so new packs require only
      // a Play Console + RevenueCat dashboard change, not a code deploy.
      const moonstonePackMatch = /^arcana_moonstones_(\d+)$/i.exec(productId);
      if (moonstonePackMatch && eventType === "NON_RENEWING_PURCHASE") {
        const amount = parseInt(moonstonePackMatch[1], 10);
        if (amount > 0 && amount <= 100_000) {
          const { error: ledgerErr } = await ctx.supabase
            .from("moonstone_transactions")
            .insert({
              user_id: userId,
              amount,
              kind: "purchase",
              reference: body.event.transaction_id,
              note: `Pack: ${productId}`,
            });
          if (ledgerErr) {
            ctx.log.error("revenuecat_webhook.moonstone_ledger_failed", {
              err: ledgerErr, userId, productId, amount,
            });
            // Don't throw — idempotency already claimed the eventId.
            // A stuck ledger insert means manual reconciliation, not a
            // double-credit on retry.
          } else {
            ctx.log.info("revenuecat_webhook.moonstones_credited", {
              userId, productId, amount,
            });
          }
        } else {
          ctx.log.warn("revenuecat_webhook.invalid_pack_amount", { productId, amount });
        }
        // Return early — Moonstone packs are not subscriptions.
        return new Response(
          JSON.stringify({ success: true, kind: "moonstone-pack" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (
        eventType === "INITIAL_PURCHASE" ||
        eventType === "RENEWAL" ||
        eventType === "UNCANCELLATION"
      ) {
        const { error } = await ctx.supabase
          .from("profiles")
          .update({ is_premium: hasPremium })
          .eq("id", userId);

        if (error) {
          ctx.log.error("revenuecat_webhook.profile_update_failed", { err: error, userId });
          throw new AppError("PROFILE_UPDATE_FAILED", "Failed to update profile", 500);
        }

        const period = productId.includes("lifetime")
          ? "lifetime"
          : productId.includes("yearly")
          ? "yearly"
          : "monthly";

        const { error: subError } = await ctx.supabase.from("subscriptions").upsert(
          {
            user_id: userId,
            provider: "google",
            product_id: productId,
            status: body.event.period_type === "TRIAL" ? "trial" : "active",
            period,
            transaction_id: body.event.original_transaction_id,
            started_at: new Date(body.event.purchased_at_ms).toISOString(),
            expires_at: body.event.expiration_at_ms
              ? new Date(body.event.expiration_at_ms).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "transaction_id" },
        );

        if (subError) {
          ctx.log.error("revenuecat_webhook.subscription_upsert_failed", { err: subError, userId });
        }

        ctx.log.info("revenuecat_webhook.user_premium", { userId, productId });

        const { error: logError } = await ctx.supabase.from("audit_events").insert({
          user_id: userId,
          event_name: "premium_purchase",
          payload: {
            product_id: productId,
            transaction_id: body.event.transaction_id,
            environment: body.event.environment,
            store: body.event.store,
            provider: "revenuecat",
          },
        });

        if (logError) {
          ctx.log.error("revenuecat_webhook.audit_insert_failed", { err: logError, userId });
        }
      }

      if (
        eventType === "CANCELLATION" ||
        eventType === "EXPIRATION" ||
        eventType === "BILLING_ISSUE"
      ) {
        const { error } = await ctx.supabase
          .from("profiles")
          .update({ is_premium: false })
          .eq("id", userId);

        if (error) {
          ctx.log.error("revenuecat_webhook.profile_update_failed", { err: error, userId });
        }

        const newStatus = eventType === "BILLING_ISSUE" ? "grace_period" : "cancelled";
        const { error: subError } = await ctx.supabase
          .from("subscriptions")
          .update({
            status: newStatus,
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .eq("provider", "google")
          .in("status", ["active", "trial"]);

        if (subError) {
          ctx.log.error("revenuecat_webhook.subscription_update_failed", { err: subError, userId });
        }

        ctx.log.info("revenuecat_webhook.user_cancelled", { userId, eventType });

        const { error: logError } = await ctx.supabase.from("audit_events").insert({
          user_id: userId,
          event_name: "premium_cancelled",
          payload: {
            product_id: productId,
            reason: eventType,
            provider: "revenuecat",
          },
        });

        if (logError) {
          ctx.log.error("revenuecat_webhook.audit_insert_failed", { err: logError, userId });
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  }),
);
