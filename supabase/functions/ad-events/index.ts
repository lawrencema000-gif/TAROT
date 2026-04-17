import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { callerKey, checkRateLimit, rateLimitHeaders } from "../_shared/rate-limit.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
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

type AdType = "banner" | "interstitial" | "rewarded" | "app_open";
type ActionTrigger = "reading" | "quiz" | "journal" | "app_launch" | "navigation" | "feature_unlock";

interface AdEvent {
  adType: AdType;
  platform: "android" | "ios";
  adUnitId: string;
  actionTrigger: ActionTrigger;
  durationMs?: number;
  completed?: boolean;
  clicked?: boolean;
  rewardAmount?: number;
  rewardType?: string;
  errorCode?: string;
}

interface AdEventsRequest {
  events: AdEvent[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }

  try {
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader) {
      const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user } } = await supabaseClient.auth.getUser();
      userId = user?.id || null;
    }

    // Rate limit: 120 requests / minute per caller (ad events can burst)
    const rl = checkRateLimit(callerKey(req, userId), 120, 60_000);
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

    const body: AdEventsRequest = await req.json();

    if (!body.events || !Array.isArray(body.events) || body.events.length === 0) {
      return new Response(
        JSON.stringify({ error: "No events provided" }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    if (body.events.length > 50) {
      return new Response(
        JSON.stringify({ error: "Too many events. Maximum 50 per request" }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const results: { success: boolean; id?: string; error?: string }[] = [];

    for (const event of body.events) {
      if (!isValidAdType(event.adType)) {
        results.push({ success: false, error: `Invalid ad type: ${event.adType}` });
        continue;
      }

      if (!isValidPlatform(event.platform)) {
        results.push({ success: false, error: `Invalid platform: ${event.platform}` });
        continue;
      }

      if (!isValidActionTrigger(event.actionTrigger)) {
        results.push({ success: false, error: `Invalid action trigger: ${event.actionTrigger}` });
        continue;
      }

      const { data, error } = await supabaseAdmin.rpc("record_ad_impression", {
        p_user_id: userId,
        p_ad_type: event.adType,
        p_platform: event.platform,
        p_ad_unit_id: event.adUnitId,
        p_action_trigger: event.actionTrigger,
        p_duration_ms: event.durationMs || 0,
        p_completed: event.completed || false,
        p_clicked: event.clicked || false,
        p_reward_amount: event.rewardAmount || 0,
        p_reward_type: event.rewardType || null,
        p_error_code: event.errorCode || null,
      });

      if (error) {
        console.error("[AdEvents] Error recording impression:", error);
        results.push({ success: false, error: error.message });
      } else {
        results.push({ success: true, id: data });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`[AdEvents] Processed ${body.events.length} events: ${successCount} success, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        processed: body.events.length,
        success: successCount,
        failed: failCount,
        results,
      }),
      { status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[AdEvents] Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});

function isValidAdType(adType: string): adType is AdType {
  return ["banner", "interstitial", "rewarded", "app_open"].includes(adType);
}

function isValidPlatform(platform: string): platform is "android" | "ios" {
  return ["android", "ios"].includes(platform);
}

function isValidActionTrigger(trigger: string): trigger is ActionTrigger {
  return ["reading", "quiz", "journal", "app_launch", "navigation", "feature_unlock"].includes(trigger);
}
