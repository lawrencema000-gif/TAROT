import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14.10.0";
import { callerKey, checkRateLimit, rateLimitHeaders } from "../_shared/rate-limit.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2024-11-20.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:4173",
  "https://arcana.app",
  "https://www.arcana.app",
  "https://tarotlife.app",
  "https://www.tarotlife.app",
  "https://arcana-ritual-app.netlify.app",
  "capacitor://localhost",
  "http://localhost",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
    "Vary": "Origin",
  };
}

function isAllowedRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const allowedHosts = ["localhost", "127.0.0.1", "arcana.app", "www.arcana.app", "tarotlife.app", "www.tarotlife.app", "arcana-ritual-app.netlify.app"];
    return allowedHosts.some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`)
    );
  } catch {
    return false;
  }
}

interface PortalRequest {
  returnUrl: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: getCorsHeaders(req) });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Rate limit: 10 portal sessions / 10 minutes per user
    const rl = checkRateLimit(callerKey(req, user.id), 10, 10 * 60_000);
    if (!rl.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many requests" }),
        {
          status: 429,
          headers: {
            ...getCorsHeaders(req),
            ...rateLimitHeaders(rl),
            "Content-Type": "application/json",
          },
        }
      );
    }

    const body: PortalRequest = await req.json();
    const { returnUrl } = body;

    if (!returnUrl) {
      return new Response(
        JSON.stringify({ error: "Missing returnUrl" }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    if (!isAllowedRedirectUrl(returnUrl)) {
      return new Response(
        JSON.stringify({ error: "Invalid redirect URL" }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("transaction_id")
      .eq("user_id", user.id)
      .eq("provider", "stripe")
      .eq("status", "active")
      .maybeSingle();

    if (!subscription?.transaction_id) {
      return new Response(
        JSON.stringify({ error: "No active Stripe subscription found" }),
        { status: 404, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.transaction_id
    );

    if (!stripeSubscription.customer) {
      return new Response(
        JSON.stringify({ error: "No customer associated with subscription" }),
        { status: 404, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeSubscription.customer as string,
      return_url: returnUrl,
    });

    console.log(`[Stripe] Portal session created for user ${user.id}`);

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[Stripe] Portal session error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
