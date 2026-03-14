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

const SIGN_ELEMENTS: Record<string, string> = {
  Aries: "Fire", Taurus: "Earth", Gemini: "Air", Cancer: "Water",
  Leo: "Fire", Virgo: "Earth", Libra: "Air", Scorpio: "Water",
  Sagittarius: "Fire", Capricorn: "Earth", Aquarius: "Air", Pisces: "Water",
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function normDeg(d: number): number {
  return ((d % 360) + 360) % 360;
}

function lonToSign(lon: number): { sign: ZodiacSign; degree: number } {
  const n = normDeg(lon);
  const idx = Math.floor(n / 30);
  return { sign: SIGNS[idx], degree: Math.round((n % 30) * 100) / 100 };
}

function getPlanetLongitude(body: Astronomy.Body | "Sun" | "Moon", date: Date): number {
  if (body === "Sun") return Astronomy.SunPosition(date).elon;
  if (body === "Moon") return Astronomy.EclipticGeoMoon(date).lon;
  return Astronomy.EclipticLongitude(body as Astronomy.Body, date);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

interface NatalPlanet {
  planet: string;
  longitude: number;
  sign: string;
}

interface WeekDayEvent {
  day: string;
  event: string;
  advice: string;
}

function getWeekStart(now: Date): Date {
  const d = new Date(now);
  const dayOfWeek = d.getUTCDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatShort(d: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

const bodyMap: [Planet, Astronomy.Body | "Sun" | "Moon"][] = [
  ["Sun", "Sun"],
  ["Moon", "Moon"],
  ["Mercury", Astronomy.Body.Mercury],
  ["Venus", Astronomy.Body.Venus],
  ["Mars", Astronomy.Body.Mars],
  ["Jupiter", Astronomy.Body.Jupiter],
  ["Saturn", Astronomy.Body.Saturn],
];

const aspectDefs: { type: AspectType; angle: number; maxOrb: number }[] = [
  { type: "conjunction", angle: 0, maxOrb: 5 },
  { type: "opposition", angle: 180, maxOrb: 5 },
  { type: "trine", angle: 120, maxOrb: 4 },
  { type: "square", angle: 90, maxOrb: 4 },
  { type: "sextile", angle: 60, maxOrb: 3 },
];

const ASPECT_EVENTS: Record<AspectType, string[]> = {
  conjunction: [
    "intensifies themes around",
    "merges powerfully with",
    "brings a concentrated focus on",
  ],
  opposition: [
    "creates a revealing tension with",
    "highlights a balance point for",
    "challenges you to integrate",
  ],
  trine: [
    "flows effortlessly with",
    "supports natural growth in",
    "opens easy doors for",
  ],
  square: [
    "pushes you to take action on",
    "creates productive friction with",
    "motivates change around",
  ],
  sextile: [
    "offers an opportunity involving",
    "gently activates",
    "brings a helpful nudge toward",
  ],
};

const ASPECT_ADVICE: Record<AspectType, string[]> = {
  conjunction: ["Focus your energy. This is a powerful moment for clarity.", "Lean into this energy fully -- half-measures won't cut it."],
  opposition: ["Find the middle ground. Both sides hold wisdom.", "Step back and see the bigger picture before reacting."],
  trine: ["Accept the gifts being offered. Don't overthink this.", "Let things flow naturally. Effort isn't required here."],
  square: ["Embrace the discomfort -- growth lives here.", "Take one decisive step rather than ruminating."],
  sextile: ["Be alert for subtle opportunities. They're easy to miss.", "Say yes to invitations and suggestions from others."],
};

const STORYLINES: Record<string, string[]> = {
  Fire: [
    "This week ignites your ambition and desire for self-expression. You're called to step forward with courage, take creative risks, and let your authentic fire shine. Energy is high -- channel it with intention.",
    "A week of dynamic action and bold decisions. Your confidence is magnetized, drawing opportunities and attention. Balance your drive with moments of stillness to avoid burnout.",
    "Passion and purpose align this week. Whether in relationships, creative projects, or career moves, your enthusiasm inspires others. Trust the spark of inspiration when it strikes.",
  ],
  Earth: [
    "This week favors building, consolidating, and strengthening your foundations. Patient effort yields impressive results. Focus on what's real and tangible rather than hypothetical possibilities.",
    "Stability and structure are your allies this week. Financial matters, health routines, and long-term plans benefit from your grounded attention. Small improvements compound into significant gains.",
    "A week for practical magic. Your ability to turn ideas into reality is heightened. Trust the process, stay disciplined, and celebrate incremental progress.",
  ],
  Air: [
    "Communication and connection are this week's superpowers. Conversations spark insights, networks expand, and intellectual curiosity leads you somewhere unexpected. Stay open and flexible.",
    "Ideas are flowing fast this week. Your mind is sharp, your words are persuasive, and social interactions bring both joy and opportunity. Write down what inspires you before it fades.",
    "This week invites you to share, learn, and explore. New perspectives challenge old assumptions in liberating ways. Let curiosity guide you -- the most interesting discoveries often come sideways.",
  ],
  Water: [
    "This week takes you deeper into emotional territory. Intuition is your compass, pointing toward what needs healing, release, or nurturing. Honor your sensitivity -- it's a strength, not a weakness.",
    "Emotional currents run strong this week. Dreams may be vivid, empathy heightened, and creative inspiration plentiful. Create space for reflection alongside your responsibilities.",
    "A week for soul-level work. Whether through art, meditation, intimate conversation, or quiet reflection, you're processing something important beneath the surface. Trust the timing.",
  ],
};

const BEST_DAYS_POOL: Record<string, { activity: string }[]> = {
  Fire: [
    { activity: "Starting something new" },
    { activity: "Physical activity" },
    { activity: "Public speaking" },
    { activity: "Negotiations" },
    { activity: "Creative work" },
    { activity: "Socializing" },
  ],
  Earth: [
    { activity: "Financial planning" },
    { activity: "Home improvement" },
    { activity: "Health checkups" },
    { activity: "Organizing" },
    { activity: "Long-term planning" },
    { activity: "Cooking & nourishing" },
  ],
  Air: [
    { activity: "Brainstorming" },
    { activity: "Networking" },
    { activity: "Writing" },
    { activity: "Learning new skills" },
    { activity: "Social gatherings" },
    { activity: "Research" },
  ],
  Water: [
    { activity: "Journaling" },
    { activity: "Meditation" },
    { activity: "Creative expression" },
    { activity: "Deep conversations" },
    { activity: "Self-care" },
    { activity: "Spending time near water" },
  ],
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    const now = new Date();
    const weekStart = getWeekStart(now);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    const weekKey = formatDate(weekStart);

    const { data: cached } = await supabase
      .from("astrology_horoscope_cache")
      .select("content_json")
      .eq("user_id", user.id)
      .eq("date", weekKey)
      .eq("type", "weekly")
      .maybeSingle();

    if (cached?.content_json && Object.keys(cached.content_json).length > 0) {
      return new Response(JSON.stringify(cached.content_json), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=86400" },
      });
    }

    const { data: chartRow } = await supabase
      .from("astrology_natal_charts")
      .select("natal_json, big_three_json")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!chartRow?.natal_json) {
      return new Response(
        JSON.stringify({ error: "No natal chart found. Please compute your chart first." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const natalPlanets: NatalPlanet[] = (chartRow.natal_json.planets || []).map(
      (p: { planet: string; longitude: number; sign: string }) => ({
        planet: p.planet, longitude: p.longitude, sign: p.sign,
      })
    );
    const sunSign = chartRow.big_three_json?.sun?.sign || "Aries";
    const element = SIGN_ELEMENTS[sunSign] || "Fire";

    const seed = weekKey.split("-").map(Number).reduce((a, b) => a * 31 + b, sunSign.charCodeAt(0));
    const rng = seededRandom(Math.abs(seed));

    const keyMoments: WeekDayEvent[] = [];

    for (let d = 0; d < 7; d++) {
      const dayDate = new Date(weekStart);
      dayDate.setUTCDate(dayDate.getUTCDate() + d);
      const dayName = DAY_NAMES[dayDate.getUTCDay()];

      for (const [tName, tBody] of bodyMap) {
        if (tName === "Moon") continue;
        const tLon = getPlanetLongitude(tBody, dayDate);

        for (const np of natalPlanets) {
          let diff = Math.abs(tLon - np.longitude);
          if (diff > 180) diff = 360 - diff;

          for (const def of aspectDefs) {
            const orb = Math.abs(diff - def.angle);
            if (orb <= def.maxOrb * 0.6) {
              const eventPhrases = ASPECT_EVENTS[def.type];
              const advicePhrases = ASPECT_ADVICE[def.type];
              keyMoments.push({
                day: dayName,
                event: `${tName} ${pick(eventPhrases, rng)} your natal ${np.planet}`,
                advice: pick(advicePhrases, rng),
              });
            }
          }
        }
      }
    }

    const uniqueMoments: WeekDayEvent[] = [];
    const seenDays = new Set<string>();
    for (const m of keyMoments) {
      if (!seenDays.has(m.day) && uniqueMoments.length < 5) {
        uniqueMoments.push(m);
        seenDays.add(m.day);
      }
    }

    const bestDaysPool = [...BEST_DAYS_POOL[element]];
    const bestDays: { activity: string; day: string }[] = [];
    for (let i = 0; i < 4 && bestDaysPool.length > 0; i++) {
      const idx = Math.floor(rng() * bestDaysPool.length);
      const item = bestDaysPool.splice(idx, 1)[0];
      const dayOffset = Math.floor(rng() * 7);
      const dayDate = new Date(weekStart);
      dayDate.setUTCDate(dayDate.getUTCDate() + dayOffset);
      bestDays.push({
        activity: item.activity,
        day: DAY_NAMES[dayDate.getUTCDay()],
      });
    }

    const content = {
      weekStart: formatShort(weekStart),
      weekEnd: formatShort(weekEnd),
      mainStoryline: pick(STORYLINES[element], rng),
      keyMoments: uniqueMoments,
      bestDays,
    };

    await supabase.from("astrology_horoscope_cache").upsert(
      {
        user_id: user.id,
        date: weekKey,
        type: "weekly",
        content_json: content,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,date,type" }
    );

    return new Response(JSON.stringify(content), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=86400" },
    });
  } catch (error) {
    console.error("Weekly forecast error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to generate weekly forecast",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
