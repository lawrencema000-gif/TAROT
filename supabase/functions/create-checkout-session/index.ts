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

      const { priceId, productId, successUrl, cancelUrl } = body;

      if (!priceId || !productId || !successUrl || !cancelUrl) {
        throw new AppError("MISSING_REQUIRED_FIELDS", "priceId, productId, successUrl, and cancelUrl are required", 400);
      }

      if (!isAllowedRedirectUrl(successUrl) || !isAllowedRedirectUrl(cancelUrl)) {
        throw new AppError("INVALID_REDIRECT_URL", "Redirect URLs must be on an approved host", 400);
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
      // `priceId` and `productId` both arrive in the request body, and
      // nothing used to check them against each other. That let a caller
      // pair a cheap price with productId "…lifetime" (one-time charge,
      // permanent entitlement) or with "…yearly" to attach the 3-day trial
      // to a plan that is deliberately trial-free — the client chose both
      // what Stripe charges AND which rules applied to it.
      //
      // The real fix is an allowlist of price ids in this function's env.
      // That needs secrets only the owner can set, so short of it: ask
      // Stripe what the price actually is and derive the rules from the
      // answer instead of from a client-supplied string. This closes the
      // mismatch attacks with no new configuration. It does NOT stop a
      // caller substituting a different *legitimate* price from the same
      // account — add STRIPE_PRICE_MONTHLY/YEARLY/LIFETIME and compare
      // against them to close that too.
      let price: Stripe.Price;
      try {
        price = await stripe.prices.retrieve(priceId);
      } catch {
        throw new AppError("INVALID_PRICE", "Unknown price", 400);
      }
      if (!price.active) {
        throw new AppError("INACTIVE_PRICE", "That plan is no longer available", 400);
      }

      // One-time price => lifetime. Recurring => subscription. The trial is
      // granted only on a genuinely yearly recurring price.
      const isLifetime = price.type === "one_time";
      const isYearly = price.type === "recurring" && price.recurring?.interval === "year";
      const trialDays = isYearly ? 3 : undefined;

      // The ledger records what Stripe says was bought, not what the client
      // claimed. Keeps the webhook's product_id honest.
      const resolvedProductId = isLifetime
        ? "premium_lifetime"
        : isYearly
          ? "premium_yearly"
          : "premium_monthly";

      const session = await stripe.checkout.sessions.create({
        customer_email: profile?.email || ctx.user?.email,
        client_reference_id: ctx.userId!,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: isLifetime ? "payment" : "subscription",
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          user_id: ctx.userId!,
          product_id: resolvedProductId,
          client_product_id: productId,
        },
        subscription_data: isLifetime
          ? undefined
          : {
              metadata: {
                user_id: ctx.userId!,
                product_id: resolvedProductId,
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
