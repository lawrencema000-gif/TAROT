import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import * as Astronomy from "npm:astronomy-engine@2.1.19";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;
type ZodiacSign = typeof SIGNS[number];
type Planet = "Sun" | "Moon" | "Mercury" | "Venus" | "Mars" | "Jupiter" | "Saturn" | "Uranus" | "Neptune" | "Pluto";
type AspectType = "conjunction" | "opposition" | "trine" | "square" | "sextile";

function normDeg(d: number): number {
  return ((d % 360) + 360) % 360;
}

function lonToSign(lon: number): { sign: ZodiacSign; degree: number } {
  const n = normDeg(lon);
  const idx = Math.floor(n / 30);
  return { sign: SIGNS[idx], degree: Math.round((n % 30) * 100) / 100 };
}

function formatDate(d: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

interface NatalPlanet {
  planet: string;
  longitude: number;
  sign: string;
}

interface TransitEvent {
  date: string;
  transitPlanet: Planet;
  natalPlanet: Planet;
  aspectType: AspectType;
  orb: number;
  transitSign: ZodiacSign;
  natalSign: ZodiacSign;
}

const transitBodies: [Planet, Astronomy.Body | "Sun"][] = [
  ["Sun", "Sun"],
  ["Mercury", Astronomy.Body.Mercury],
  ["Venus", Astronomy.Body.Venus],
  ["Mars", Astronomy.Body.Mars],
  ["Jupiter", Astronomy.Body.Jupiter],
  ["Saturn", Astronomy.Body.Saturn],
  ["Uranus", Astronomy.Body.Uranus],
  ["Neptune", Astronomy.Body.Neptune],
  ["Pluto", Astronomy.Body.Pluto],
];

const aspectDefs: { type: AspectType; angle: number; maxOrb: number }[] = [
  { type: "conjunction", angle: 0, maxOrb: 3 },
  { type: "opposition", angle: 180, maxOrb: 3 },
  { type: "trine", angle: 120, maxOrb: 2.5 },
  { type: "square", angle: 90, maxOrb: 2.5 },
  { type: "sextile", angle: 60, maxOrb: 2 },
];

function getPlanetLongitude(body: Astronomy.Body | "Sun", date: Date): number {
  if (body === "Sun") return Astronomy.SunPosition(date).elon;
  return Astronomy.EclipticLongitude(body as Astronomy.Body, date);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const authClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    let days = 30;
    let natalPlanetFilter: string | undefined;
    try {
      const body = await req.json();
      if (body.days && typeof body.days === "number") days = Math.min(body.days, 90);
      if (body.natalPlanet) natalPlanetFilter = body.natalPlanet;
    } catch { /* empty body is fine */ }

    const { data: chartRow } = await supabase
      .from("astrology_natal_charts")
      .select("natal_json")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!chartRow?.natal_json) {
      return new Response(
        JSON.stringify({ error: "No natal chart found. Please compute your chart first.", events: [] }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let natalPlanets: NatalPlanet[] = (chartRow.natal_json.planets || []).map(
      (p: { planet: string; longitude: number; sign: string }) => ({
        planet: p.planet, longitude: p.longitude, sign: p.sign,
      })
    );

    if (natalPlanetFilter) {
      natalPlanets = natalPlanets.filter((np) => np.planet === natalPlanetFilter);
    }

    const events: TransitEvent[] = [];
    const seen = new Set<string>();
    const now = new Date();

    for (let d = 0; d < days; d++) {
      const date = new Date(now);
      date.setUTCDate(date.getUTCDate() + d);
      date.setUTCHours(12, 0, 0, 0);

      for (const [tName, tBody] of transitBodies) {
        const tLon = getPlanetLongitude(tBody, date);
        const tSignData = lonToSign(tLon);

        for (const np of natalPlanets) {
          if (tName === np.planet) continue;

          let diff = Math.abs(tLon - np.longitude);
          if (diff > 180) diff = 360 - diff;

          for (const def of aspectDefs) {
            const orb = Math.abs(diff - def.angle);
            if (orb <= def.maxOrb) {
              const key = `${tName}-${np.planet}-${def.type}`;
              if (!seen.has(key)) {
                seen.add(key);
                events.push({
                  date: formatDate(date),
                  transitPlanet: tName,
                  natalPlanet: np.planet as Planet,
                  aspectType: def.type,
                  orb: Math.round(orb * 10) / 10,
                  transitSign: tSignData.sign,
                  natalSign: np.sign as ZodiacSign,
                });
              }
              break;
            }
          }
        }
      }
    }

    events.sort((a, b) => {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const parseShort = (s: string) => {
        const [m, day] = s.split(" ");
        return months.indexOf(m) * 100 + parseInt(day);
      };
      return parseShort(a.date) - parseShort(b.date);
    });

    return new Response(JSON.stringify({ events }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Transit calendar error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to compute transits",
        events: [],
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
