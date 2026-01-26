import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14.10.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2024-11-20.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, Stripe-Signature",
};

async function updateUserPremiumStatus(
  userId: string,
  isPremium: boolean,
  subscriptionData?: {
    provider: string;
    productId: string;
    status: string;
    period: string;
    transactionId: string;
    startedAt?: string;
    expiresAt?: string;
  }
) {
  const isAdRemovalOnly = subscriptionData?.productId === "arcana_ad_removal";

  const profileUpdate = isAdRemovalOnly
    ? { is_ad_free: isPremium }
    : { is_premium: isPremium };

  const { error: profileError } = await supabase
    .from("profiles")
    .update(profileUpdate)
    .eq("id", userId);

  if (profileError) {
    console.error("[Stripe] Error updating profile:", profileError);
    throw profileError;
  }

  if (subscriptionData) {
    const { error: subError } = await supabase.from("subscriptions").upsert(
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
      {
        onConflict: "transaction_id",
      }
    );

    if (subError) {
      console.error("[Stripe] Error updating subscription:", subError);
    }
  }

  const { error: auditError } = await supabase.from("audit_events").insert({
    user_id: userId,
    event_name: isPremium ? "premium_activated" : "premium_deactivated",
    payload: {
      provider: "stripe",
      ...subscriptionData,
    },
  });

  if (auditError) {
    console.error("[Stripe] Error logging audit event:", auditError);
  }
}

function getPeriodFromInterval(interval: string): string {
  switch (interval) {
    case "month":
      return "monthly";
    case "year":
      return "yearly";
    case "week":
      return "weekly";
    default:
      return "monthly";
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      console.error("[Stripe] Missing stripe-signature header");
      return new Response(
        JSON.stringify({ error: "Missing signature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("[Stripe] Webhook signature verification failed:", err);
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Stripe] Webhook received: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id || session.metadata?.user_id;
        const productId = session.metadata?.product_id;

        if (!userId) {
          console.error("[Stripe] No user ID in checkout session");
          break;
        }

        if (session.mode === "subscription") {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
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

          console.log(`[Stripe] User ${userId} subscribed (trial or active)`);
        } else if (session.mode === "payment") {
          await updateUserPremiumStatus(userId, true, {
            provider: "stripe",
            productId: productId || "lifetime",
            status: "active",
            period: "lifetime",
            transactionId: session.payment_intent as string,
            startedAt: new Date().toISOString(),
          });

          console.log(`[Stripe] User ${userId} purchased lifetime access`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;

        if (!userId) {
          console.error("[Stripe] No user ID in subscription metadata");
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

        console.log(`[Stripe] Subscription ${subscription.id} updated: ${subscription.status}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;

        if (!userId) {
          console.error("[Stripe] No user ID in subscription metadata");
          break;
        }

        await updateUserPremiumStatus(userId, false, {
          provider: "stripe",
          productId: subscription.items.data[0].price.id,
          status: "cancelled",
          period: getPeriodFromInterval(subscription.items.data[0].price.recurring?.interval || "month"),
          transactionId: subscription.id,
          startedAt: new Date(subscription.created * 1000).toISOString(),
          expiresAt: new Date(subscription.ended_at! * 1000).toISOString(),
        });

        console.log(`[Stripe] Subscription ${subscription.id} cancelled`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscription = invoice.subscription;

        if (subscription) {
          const sub = await stripe.subscriptions.retrieve(subscription as string);
          const userId = sub.metadata?.user_id;

          if (userId) {
            const { error } = await supabase
              .from("subscriptions")
              .update({ status: "grace_period" })
              .eq("transaction_id", subscription as string);

            if (error) {
              console.error("[Stripe] Error updating subscription status:", error);
            }

            console.log(`[Stripe] Payment failed for user ${userId}, subscription in grace period`);
          }
        }
        break;
      }

      default:
        console.log(`[Stripe] Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[Stripe] Webhook error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
