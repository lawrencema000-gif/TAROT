import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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
  "capacitor://localhost",
  "http://localhost",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
    "Vary": "Origin",
  };
}

interface AdConfigRequest {
  platform: "android" | "ios";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: getCorsHeaders(req) });
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

    let platform: string;

    if (req.method === "GET") {
      const url = new URL(req.url);
      platform = url.searchParams.get("platform") || "android";
    } else {
      const body: AdConfigRequest = await req.json();
      platform = body.platform || "android";
    }

    if (!["android", "ios"].includes(platform)) {
      return new Response(
        JSON.stringify({ error: "Invalid platform. Must be 'android' or 'ios'" }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: configData, error: configError } = await supabaseAdmin.rpc(
      "get_ad_config",
      { p_platform: platform, p_user_id: userId }
    );

    if (configError) {
      console.error("[AdConfig] Error fetching config:", configError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch ad configuration" }),
        { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    let dailyStats = null;
    if (userId) {
      const { data: statsData } = await supabaseAdmin.rpc(
        "get_user_daily_ad_stats",
        { p_user_id: userId }
      );
      dailyStats = statsData;
    }

    const response = {
      ...configData,
      dailyStats,
      timestamp: new Date().toISOString(),
    };

    console.log("[AdConfig] Returning config for platform:", platform, "userId:", userId);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[AdConfig] Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
