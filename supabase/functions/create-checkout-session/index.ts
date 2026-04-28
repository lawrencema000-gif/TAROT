import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14.10.0";
import { AppError, handler } from "../_shared/handler.ts";

interface CheckoutRequest {
  priceId?: string;
  productId?: string;
  successUrl?: string;
  cancelUrl?: string;
}

function isAllowedRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const allowedHosts = [
      "localhost",
      "127.0.0.1",
      "arcana.app",
      "www.arcana.app",
      "tarotlife.app",
      "www.tarotlife.app",
      "arcana-ritual-app.netlify.app",
    ];
    return allowedHosts.some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`),
    );
  } catch {
    return false;
  }
}

Deno.serve(
  handler<CheckoutRequest>({
    fn: "create-checkout-session",
    auth: "required",
    rateLimit: { max: 10, windowMs: 10 * 60_000 },
    run: async (ctx, body) => {
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
        apiVersion: "2024-11-20.acacia",
        httpClient: Stripe.createFetchHttpClient(),
      });

      const { priceId: bodyPriceId, productId, successUrl, cancelUrl } = body;
      let priceId = bodyPriceId;

      if (!productId || !successUrl || !cancelUrl) {
        throw new AppError("MISSING_REQUIRED_FIELDS", "productId, successUrl, and cancelUrl are required", 400);
      }

      if (!isAllowedRedirectUrl(successUrl) || !isAllowedRedirectUrl(cancelUrl)) {
        throw new AppError("INVALID_REDIRECT_URL", "Redirect URLs must be on an approved host", 400);
      }

      // Credit-pack flow: server resolves the Stripe priceId from env
      // so the client never needs to know it. Maps:
      //   credit_pack_starter   → STRIPE_PRICE_CREDITS_33   ($0.99 / 33)
      //   credit_pack_standard  → STRIPE_PRICE_CREDITS_333  ($4.99 / 333)
      //   credit_pack_value     → STRIPE_PRICE_CREDITS_777  ($6.99 / 777)
      const isCreditPack = productId.startsWith("credit_pack_");
      if (isCreditPack && !priceId) {
        const packEnvMap: Record<string, string> = {
          credit_pack_starter: "STRIPE_PRICE_CREDITS_33",
          credit_pack_standard: "STRIPE_PRICE_CREDITS_333",
          credit_pack_value: "STRIPE_PRICE_CREDITS_777",
        };
        const envName = packEnvMap[productId];
        if (!envName) {
          throw new AppError("UNKNOWN_CREDIT_PACK", `Unknown credit pack: ${productId}`, 400);
        }
        priceId = Deno.env.get(envName) || undefined;
        if (!priceId) {
          throw new AppError("CREDIT_PACK_NOT_CONFIGURED", `Credit pack price env var ${envName} not set`, 503);
        }
      }

      if (!priceId) {
        throw new AppError("MISSING_REQUIRED_FIELDS", "priceId is required for non-credit-pack purchases", 400);
      }

      const { data: profile } = await ctx.supabase
        .from("profiles")
        .select("email, display_name")
        .eq("id", ctx.userId!)
        .maybeSingle();

      // Yearly plan ships with a 3-day free trial. Stripe handles the
      // trial natively: Subscription is created in `trialing` status,
      // no charge for 3 days, then auto-converts to `active`. The
      // webhook flips profiles.is_premium = true on checkout.completed
      // regardless of trial state, so the user gets premium access
      // immediately.
      //
      // Lifetime is one-time payment — no subscription, no trial.
      // Monthly plan stays no-trial because trial-monthly is a known
      // abuse vector (cancel before charge, no real commitment).
      const isYearly = productId.includes("yearly");
      const isLifetime = productId.includes("lifetime");
      const trialDays = isYearly ? 3 : undefined;
      // Credit packs are one-time payments — same checkout mode as lifetime
      // but without subscription_data and without trials.
      const isOneTime = isLifetime || isCreditPack;

      const session = await stripe.checkout.sessions.create({
        customer_email: profile?.email || ctx.user?.email,
        client_reference_id: ctx.userId!,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: isOneTime ? "payment" : "subscription",
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          user_id: ctx.userId!,
          product_id: productId,
        },
        subscription_data: isOneTime
          ? undefined
          : {
              metadata: {
                user_id: ctx.userId!,
                product_id: productId,
              },
              ...(trialDays ? { trial_period_days: trialDays } : {}),
            },
        payment_method_collection: isYearly ? "always" : undefined,
      });

      ctx.log.info("create_checkout_session.created", { sessionId: session.id });

      return new Response(
        JSON.stringify({ sessionId: session.id, url: session.url }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  }),
);
