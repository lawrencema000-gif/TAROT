import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14.10.0";
import { AppError, handler } from "../_shared/handler.ts";

interface PortalRequest {
  returnUrl?: string;
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
  handler<PortalRequest>({
    fn: "create-portal-session",
    auth: "required",
    rateLimit: { max: 10, windowMs: 10 * 60_000 },
    run: async (ctx, body) => {
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
        apiVersion: "2024-11-20.acacia",
        httpClient: Stripe.createFetchHttpClient(),
      });

      const { returnUrl } = body;

      if (!returnUrl) {
        throw new AppError("MISSING_RETURN_URL", "returnUrl is required", 400);
      }

      if (!isAllowedRedirectUrl(returnUrl)) {
        throw new AppError("INVALID_REDIRECT_URL", "returnUrl must be on an approved host", 400);
      }

      const { data: subscription } = await ctx.supabase
        .from("subscriptions")
        .select("transaction_id")
        .eq("user_id", ctx.userId!)
        .eq("provider", "stripe")
        .eq("status", "active")
        .maybeSingle();

      if (!subscription?.transaction_id) {
        throw new AppError(
          "NO_ACTIVE_SUBSCRIPTION",
          "No active Stripe subscription found",
          404,
        );
      }

      const stripeSubscription = await stripe.subscriptions.retrieve(
        subscription.transaction_id,
      );

      if (!stripeSubscription.customer) {
        throw new AppError(
          "NO_CUSTOMER_ON_SUBSCRIPTION",
          "No customer associated with subscription",
          404,
        );
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: stripeSubscription.customer as string,
        return_url: returnUrl,
      });

      ctx.log.info("create_portal_session.created");

      return new Response(
        JSON.stringify({ url: session.url }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  }),
);
