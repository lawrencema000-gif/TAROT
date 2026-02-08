import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const authClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { data: chart, error: chartError } = await supabase
      .from("astrology_natal_charts")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (chartError) {
      console.error("Error fetching chart:", chartError);
      throw chartError;
    }

    if (!chart) {
      return new Response(
        JSON.stringify({
          error: "No chart found",
          natalChart: null,
          bigThree: null,
          dominants: null,
          aspects: null,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const natalChart = {
      ...(chart.natal_json || {}),
      bigThree: chart.big_three_json || null,
      dominants: chart.dominants_json || null,
      aspects: chart.aspects_json || [],
    };

    return new Response(
      JSON.stringify({
        natalChart,
        bigThree: chart.big_three_json || null,
        dominants: chart.dominants_json || null,
        aspects: chart.aspects_json || [],
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Chart retrieval error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to retrieve chart",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
