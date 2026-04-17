import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const revenuecatWebhookSecret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET") || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// No CORS headers — this is a server-to-server webhook, not called from browsers
const responseHeaders = {
  "Content-Type": "application/json",
};

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  try {
    if (!revenuecatWebhookSecret) {
      console.error("[RevenueCat] REVENUECAT_WEBHOOK_SECRET is not configured — rejecting all requests");
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured" }),
        { status: 500, headers: responseHeaders }
      );
    }

    const authHeader = req.headers.get("Authorization");
    const expectedAuth = `Bearer ${revenuecatWebhookSecret}`;

    if (!authHeader || authHeader !== expectedAuth) {
      console.error("[RevenueCat] Invalid or missing authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: responseHeaders }
      );
    }

    const rawBody = await req.text();
    // Do NOT log raw webhook body — contains user identifiers, transaction IDs,
    // and store-issued tokens. Log safe fields only after parsing.

    let webhookData: RevenueCatEvent;
    try {
      webhookData = JSON.parse(rawBody);
    } catch (parseError) {
      console.error("[RevenueCat] Failed to parse JSON:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON payload" }),
        { status: 400, headers: responseHeaders }
      );
    }

    if (!webhookData.event) {
      console.log("[RevenueCat] Test webhook received (no event data)");
      return new Response(
        JSON.stringify({ success: true, message: "Test webhook received" }),
        { status: 200, headers: responseHeaders }
      );
    }

    const eventType = webhookData.event.type;
    const userId = webhookData.event.app_user_id;
    const productId = webhookData.event.product_id || "";
    const entitlements = webhookData.event.entitlement_ids || [];

    console.log("[RevenueCat] Webhook received:", {
      type: eventType,
      userId,
      productId,
      entitlements,
    });

    const hasPremium = entitlements.includes("premium");

    if (
      eventType === "INITIAL_PURCHASE" ||
      eventType === "RENEWAL" ||
      eventType === "UNCANCELLATION"
    ) {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_premium: hasPremium,
        })
        .eq("id", userId);

      if (error) {
        console.error("[RevenueCat] Error updating profile:", error);
        return new Response(
          JSON.stringify({ error: "Failed to update profile" }),
          {
            status: 500,
            headers: responseHeaders,
          }
        );
      }

      const period = productId.includes("lifetime")
        ? "lifetime"
        : productId.includes("yearly")
        ? "yearly"
        : "monthly";

      const { error: subError } = await supabase.from("subscriptions").upsert(
        {
          user_id: userId,
          provider: "google",
          product_id: productId,
          status: webhookData.event.period_type === "TRIAL" ? "trial" : "active",
          period,
          transaction_id: webhookData.event.original_transaction_id,
          started_at: new Date(webhookData.event.purchased_at_ms).toISOString(),
          expires_at: webhookData.event.expiration_at_ms
            ? new Date(webhookData.event.expiration_at_ms).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "transaction_id",
        }
      );

      if (subError) {
        console.error("[RevenueCat] Error updating subscription:", subError);
      }

      console.log(`[RevenueCat] User ${userId} upgraded to premium via ${productId}`);

      const { error: logError } = await supabase.from("audit_events").insert({
        user_id: userId,
        event_name: "premium_purchase",
        payload: {
          product_id: productId,
          transaction_id: webhookData.event.transaction_id,
          environment: webhookData.event.environment,
          store: webhookData.event.store,
          provider: "revenuecat",
        },
      });

      if (logError) {
        console.error("[RevenueCat] Error logging purchase:", logError);
      }
    }

    if (
      eventType === "CANCELLATION" ||
      eventType === "EXPIRATION" ||
      eventType === "BILLING_ISSUE"
    ) {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_premium: false,
        })
        .eq("id", userId);

      if (error) {
        console.error("[RevenueCat] Error updating profile:", error);
      }

      const newStatus = eventType === "BILLING_ISSUE" ? "grace_period" : "cancelled";
      const { error: subError } = await supabase
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
        console.error("[RevenueCat] Error updating subscription:", subError);
      }

      console.log(`[RevenueCat] User ${userId} premium expired/cancelled`);

      const { error: logError } = await supabase.from("audit_events").insert({
        user_id: userId,
        event_name: "premium_cancelled",
        payload: {
          product_id: productId,
          reason: eventType,
          provider: "revenuecat",
        },
      });

      if (logError) {
        console.error("[RevenueCat] Error logging cancellation:", logError);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error("[RevenueCat] Webhook error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: responseHeaders,
      }
    );
  }
});
