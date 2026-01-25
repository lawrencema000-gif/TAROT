import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
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
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const webhookData: RevenueCatEvent = await req.json();
    const eventType = webhookData.event.type;
    const userId = webhookData.event.app_user_id;
    const productId = webhookData.event.product_id;
    const entitlements = webhookData.event.entitlement_ids;

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
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log(`[RevenueCat] User ${userId} upgraded to premium via ${productId}`);

      const { error: logError } = await supabase.from("audit_logs").insert({
        user_id: userId,
        action: "premium_purchase",
        details: {
          product_id: productId,
          transaction_id: webhookData.event.transaction_id,
          environment: webhookData.event.environment,
          store: webhookData.event.store,
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

      console.log(`[RevenueCat] User ${userId} premium expired/cancelled`);

      const { error: logError } = await supabase.from("audit_logs").insert({
        user_id: userId,
        action: "premium_cancelled",
        details: {
          product_id: productId,
          reason: eventType,
        },
      });

      if (logError) {
        console.error("[RevenueCat] Error logging cancellation:", logError);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[RevenueCat] Webhook error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
