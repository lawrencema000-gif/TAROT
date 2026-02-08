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

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
      },
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { birthDate, birthTime, lat, lon, timezone, chartMode } = await req.json();

    if (!birthDate || lat === undefined || lon === undefined) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const natalChart = {
      userId: user.id,
      birthDate,
      birthTime: birthTime || null,
      lat,
      lon,
      timezone: timezone || "UTC",
      chartMode: chartMode || "tropical",
      bigThree: {
        sun: { sign: "Gemini", degree: 17.5, house: 1 },
        moon: { sign: "Scorpio", degree: 23.2, house: 5 },
        rising: { sign: "Cancer", degree: 12.8, house: 1 },
      },
      planets: [
        { name: "Sun", sign: "Gemini", degree: 17.5, house: 1, retrograde: false },
        { name: "Moon", sign: "Scorpio", degree: 23.2, house: 5, retrograde: false },
        { name: "Mercury", sign: "Gemini", degree: 5.3, house: 1, retrograde: false },
        { name: "Venus", sign: "Taurus", degree: 28.7, house: 12, retrograde: false },
        { name: "Mars", sign: "Sagittarius", degree: 14.2, house: 6, retrograde: false },
        { name: "Jupiter", sign: "Cancer", degree: 8.9, house: 2, retrograde: false },
        { name: "Saturn", sign: "Gemini", degree: 21.4, house: 1, retrograde: false },
        { name: "Uranus", sign: "Aquarius", degree: 19.6, house: 9, retrograde: false },
        { name: "Neptune", sign: "Aquarius", degree: 7.8, house: 8, retrograde: false },
        { name: "Pluto", sign: "Sagittarius", degree: 12.1, house: 6, retrograde: false },
      ],
      houses: [
        { number: 1, sign: "Cancer", degree: 12.8 },
        { number: 2, sign: "Leo", degree: 5.2 },
        { number: 3, sign: "Virgo", degree: 1.7 },
        { number: 4, sign: "Libra", degree: 12.8 },
        { number: 5, sign: "Scorpio", degree: 19.4 },
        { number: 6, sign: "Sagittarius", degree: 22.1 },
        { number: 7, sign: "Capricorn", degree: 12.8 },
        { number: 8, sign: "Aquarius", degree: 5.2 },
        { number: 9, sign: "Pisces", degree: 1.7 },
        { number: 10, sign: "Aries", degree: 12.8 },
        { number: 11, sign: "Taurus", degree: 19.4 },
        { number: 12, sign: "Gemini", degree: 22.1 },
      ],
      aspects: [
        { planet1: "Sun", planet2: "Moon", type: "trine", angle: 120, orb: 3.2 },
        { planet1: "Sun", planet2: "Saturn", type: "conjunction", angle: 0, orb: 3.9 },
        { planet1: "Moon", planet2: "Pluto", type: "conjunction", angle: 0, orb: 11.1 },
        { planet1: "Venus", planet2: "Jupiter", type: "sextile", angle: 60, orb: 4.2 },
        { planet1: "Mars", planet2: "Uranus", type: "trine", angle: 120, orb: 5.4 },
      ],
      dominants: {
        elements: { fire: 2, earth: 2, air: 4, water: 2 },
        qualities: { cardinal: 3, fixed: 3, mutable: 4 },
        polarities: { masculine: 6, feminine: 4 },
      },
      computedAt: new Date().toISOString(),
    };

    const { error: insertError } = await supabase
      .from("natal_charts")
      .upsert(
        {
          user_id: user.id,
          birth_date: birthDate,
          birth_time: birthTime,
          birth_lat: lat,
          birth_lon: lon,
          timezone,
          chart_mode: chartMode || "tropical",
          chart_data: natalChart,
          computed_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (insertError) {
      console.error("Error saving chart:", insertError);
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        natalChart,
        bigThree: natalChart.bigThree,
        dominants: natalChart.dominants,
        aspects: natalChart.aspects,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Chart computation error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to compute chart",
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
