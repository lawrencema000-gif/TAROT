import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import * as Astronomy from "npm:astronomy-engine@2.1.19";
import { normalizeLocale, SIGN_NAMES, PLANET_NAMES, type Locale, type Element as LElement } from "../_shared/astrology-content.ts";
import { NEW_MOON_THEMES as LNEW_MOON_THEMES, FULL_MOON_THEMES as LFULL_MOON_THEMES, OVERVIEWS as LOVERVIEWS, ONE_THING as LONE_THING, OUTER_PLANET_THEMES as LOUTER_PLANET_THEMES, KEY_DATES as LKEY_DATES, OUTER_PLANET_FALLBACK, formatShortLocalized } from "../_shared/astrology-content-extra.ts";

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

const SIGN_ELEMENTS: Record<string, string> = {
  Aries: "Fire", Taurus: "Earth", Gemini: "Air", Cancer: "Water",
  Leo: "Fire", Virgo: "Earth", Libra: "Air", Scorpio: "Water",
  Sagittarius: "Fire", Capricorn: "Earth", Aquarius: "Air", Pisces: "Water",
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function normDeg(d: number): number {
  return ((d % 360) + 360) % 360;
}

function lonToSign(lon: number): { sign: ZodiacSign; degree: number } {
  const n = normDeg(lon);
  const idx = Math.floor(n / 30);
  return { sign: SIGNS[idx], degree: Math.round((n % 30) * 100) / 100 };
}

function findHouse(lon: number, cusps: number[]): number | null {
  if (!cusps || cusps.length === 0) return null;
  const n = normDeg(lon);
  for (let i = 0; i < 12; i++) {
    const curr = cusps[i];
    const next = cusps[(i + 1) % 12];
    if (curr <= next) {
      if (n >= curr && n < next) return i + 1;
    } else {
      if (n >= curr || n < next) return i + 1;
    }
  }
  return 1;
}

function formatShort(d: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
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

interface LunarEvent {
  date: string;
  sign: ZodiacSign;
  house: number | null;
  theme: string;
}

function findLunarPhases(year: number, month: number): { newMoon: Date | null; fullMoon: Date | null } {
  const startDate = new Date(Date.UTC(year, month, 1));
  const endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));

  let newMoon: Date | null = null;
  let fullMoon: Date | null = null;

  const stepHours = 6;
  const cursor = new Date(startDate);

  let prevPhase = Astronomy.MoonPhase(cursor);

  while (cursor <= endDate) {
    cursor.setUTCHours(cursor.getUTCHours() + stepHours);
    const phase = Astronomy.MoonPhase(cursor);

    if (prevPhase > 350 && phase < 10) {
      newMoon = new Date(cursor);
    }
    if (prevPhase < 180 && phase >= 180 && !fullMoon) {
      fullMoon = new Date(cursor);
    }

    prevPhase = phase;
  }

  return { newMoon, fullMoon };
}

const NEW_MOON_THEMES: Record<string, string[]> = {
  Fire: ["Plant seeds of bold new beginnings. Initiate projects that excite your passion.", "A fresh start in self-expression. Dare to show the world who you really are.", "Set intentions around leadership, courage, and creative risk-taking."],
  Earth: ["Ground your intentions in practical reality. What tangible goal will you commit to?", "New beginnings in finances, health, or home. Build something lasting.", "A fertile moment for planting seeds of material security and comfort."],
  Air: ["Fresh ideas spark exciting possibilities. Communicate your vision clearly.", "New connections and conversations open doors. Set intentions around learning.", "A reset in your social sphere. Reach out, share ideas, begin dialogues."],
  Water: ["Emotional renewal invites deeper self-understanding. Set heartfelt intentions.", "A new chapter in intimacy, creativity, or spiritual practice begins now.", "Trust the quiet whisper of intuition as you set intentions for inner growth."],
};

const FULL_MOON_THEMES: Record<string, string[]> = {
  Fire: ["A culmination of effort brings recognition. Celebrate your courage and progress.", "Passionate emotions reach a peak. Let yourself feel fully, then channel that fire wisely.", "What you started with boldness now shows results. Release what didn't ignite."],
  Earth: ["Tangible results of your patient work become visible. Harvest what you've grown.", "A material or financial matter reaches resolution. Assess your resources with clarity.", "Practical wisdom illuminates the path forward. Release ineffective habits."],
  Air: ["An important truth or insight comes to light. Communication reaches clarity.", "Social dynamics shift as hidden information surfaces. Speak your truth.", "Ideas you've been developing reach maturity. Share or release to make room for more."],
  Water: ["Emotions crest, revealing what your heart truly needs. Allow tears and joy alike.", "A relationship or emotional pattern reaches fullness. Release with compassion.", "Deep intuitive knowing surfaces. Trust what you feel even if logic can't explain it."],
};

const OVERVIEWS: Record<string, string[]> = {
  Fire: [
    "This month channels fiery determination into meaningful achievements. Your vitality is high, your ambition sharp, and opportunities respond to bold initiative. Balance your drive with rest to sustain your momentum throughout the month.",
    "A month of dynamic action and creative breakthroughs. You're drawn to take the lead, start fresh projects, and express yourself without reservation. Your enthusiasm is contagious -- use it to rally support for what matters most.",
    "Passion fuels your month ahead. Whether pursuing career goals, deepening relationships, or embarking on personal adventures, your confidence lights the way. Channel your fire with intention to avoid scattered energy.",
  ],
  Earth: [
    "This month rewards patience, planning, and persistence. Material matters benefit from your careful attention, and routines you establish now create lasting positive change. Trust the slow build -- it's more powerful than it seems.",
    "A month for strengthening foundations and enjoying the fruits of consistent effort. Financial clarity, health improvements, and practical progress are all favored. Stay grounded in what you know to be true.",
    "Steady growth defines your month ahead. Your natural ability to turn ideas into reality is amplified. Focus on quality over speed, and invest your energy where it generates the most tangible return.",
  ],
  Air: [
    "This month buzzes with intellectual energy and social activity. Conversations lead to breakthroughs, new connections spark inspiration, and your curiosity guides you toward valuable discoveries. Stay flexible and open to unexpected turns.",
    "A month of ideas, communication, and mental expansion. Your words carry extra weight, making this ideal for negotiations, writing, teaching, or any form of self-expression. Let your mind roam freely.",
    "Social and intellectual currents carry you forward this month. New perspectives challenge comfortable assumptions, and the willingness to learn opens exciting doors. Embrace variety and stay curious.",
  ],
  Water: [
    "This month invites you into emotional depth and intuitive wisdom. Inner work is especially productive, relationships deepen through vulnerability, and creative inspiration flows freely. Honor your sensitivity as the gift it is.",
    "A month for soul-level exploration and emotional honesty. Dreams may carry messages, empathy connects you with others profoundly, and artistic expression provides a powerful outlet. Create space for stillness.",
    "Emotional intelligence is your superpower this month. Trust gut feelings, nurture important relationships, and allow yourself the healing that comes from acknowledging what you truly feel. Beauty and meaning await in quiet moments.",
  ],
};

const ONE_THING: Record<string, string[]> = {
  Fire: ["Take one bold risk that scares you just enough to know it matters.", "Initiate a passion project you've been daydreaming about.", "Have a courageous conversation you've been postponing."],
  Earth: ["Complete one practical goal you've been working toward.", "Create a financial plan or health routine you'll actually follow.", "Declutter one area of your life to make space for growth."],
  Air: ["Write down your ideas and share them with someone who can help.", "Reconnect with a person whose perspective always challenges you.", "Learn one new skill or subject that genuinely excites you."],
  Water: ["Practice a daily mindfulness or gratitude ritual all month.", "Express a deep feeling to someone important, without editing yourself.", "Create something purely for the joy of it, with no outcome attached."],
};

const OUTER_PLANET_THEMES: Record<string, Record<string, string[]>> = {
  Jupiter: {
    Fire: ["Expanding your confidence and creative self-expression."],
    Earth: ["Growing your financial resources and material security."],
    Air: ["Broadening your intellectual horizons and social circle."],
    Water: ["Deepening emotional wisdom and spiritual understanding."],
  },
  Saturn: {
    Fire: ["Disciplining your ambitions into sustainable achievement."],
    Earth: ["Building structures that create lasting financial stability."],
    Air: ["Committing to ideas and relationships that truly matter."],
    Water: ["Setting healthy emotional boundaries with compassion."],
  },
  Uranus: {
    Fire: ["Liberating your authentic self-expression from old constraints."],
    Earth: ["Revolutionizing your approach to money, body, or daily routine."],
    Air: ["Awakening radical new ideas and unconventional connections."],
    Water: ["Breaking free from emotional patterns that no longer serve you."],
  },
  Neptune: {
    Fire: ["Dissolving ego barriers to connect with creative source."],
    Earth: ["Infusing practical life with imagination and spiritual purpose."],
    Air: ["Expanding consciousness through visionary thinking and compassion."],
    Water: ["Deepening mystical awareness and artistic sensitivity."],
  },
  Pluto: {
    Fire: ["Transforming personal power and identity at a fundamental level."],
    Earth: ["Deep restructuring of values, finances, or physical wellbeing."],
    Air: ["Profound shifts in thinking, communication, or social dynamics."],
    Water: ["Emotional death-and-rebirth cycles leading to profound healing."],
  },
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

    let locale: Locale = "en";
    try {
      const body = await req.json();
      locale = normalizeLocale(body.locale);
    } catch { /* empty body ok */ }

    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const monthKey = `${year}-${String(month + 1).padStart(2, "0")}-01`;

    const cacheType = locale === "en" ? "monthly" : `monthly:${locale}`;
    const { data: cached } = await supabase
      .from("astrology_horoscope_cache")
      .select("content_json")
      .eq("user_id", user.id)
      .eq("date", monthKey)
      .eq("type", cacheType)
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

    const sunSign = chartRow.big_three_json?.sun?.sign || "Aries";
    const element = (SIGN_ELEMENTS[sunSign] || "Fire") as LElement;
    const signNames = SIGN_NAMES[locale];
    const planetNames = PLANET_NAMES[locale];
    const newMoonThemes = LNEW_MOON_THEMES[locale];
    const fullMoonThemes = LFULL_MOON_THEMES[locale];
    const overviews = LOVERVIEWS[locale];
    const oneThings = LONE_THING[locale];
    const outerThemes = LOUTER_PLANET_THEMES[locale];
    const keyDateLabels = LKEY_DATES[locale];
    const outerFallback = OUTER_PLANET_FALLBACK[locale];
    const houseCusps: number[] = chartRow.natal_json.houses || [];

    const seed = year * 13 + month * 7 + sunSign.charCodeAt(0);
    const rng = seededRandom(Math.abs(seed));

    const { newMoon: newMoonDate, fullMoon: fullMoonDate } = findLunarPhases(year, month);

    let newMoonEvent: LunarEvent | null = null;
    if (newMoonDate) {
      const moonLon = Astronomy.EclipticGeoMoon(newMoonDate).lon;
      const moonSignData = lonToSign(moonLon);
      const moonEl = (SIGN_ELEMENTS[moonSignData.sign] || "Fire") as LElement;
      newMoonEvent = {
        date: formatShortLocalized(newMoonDate, locale),
        sign: moonSignData.sign,
        house: findHouse(moonLon, houseCusps),
        theme: pick(newMoonThemes[moonEl], rng),
      };
    }

    let fullMoonEvent: LunarEvent | null = null;
    if (fullMoonDate) {
      const moonLon = Astronomy.EclipticGeoMoon(fullMoonDate).lon;
      const moonSignData = lonToSign(moonLon);
      const moonEl = (SIGN_ELEMENTS[moonSignData.sign] || "Fire") as LElement;
      fullMoonEvent = {
        date: formatShortLocalized(fullMoonDate, locale),
        sign: moonSignData.sign,
        house: findHouse(moonLon, houseCusps),
        theme: pick(fullMoonThemes[moonEl], rng),
      };
    }

    const keyDates: { date: string; event: string }[] = [];
    if (newMoonDate && newMoonEvent) {
      keyDates.push({
        date: formatShortLocalized(newMoonDate, locale),
        event: keyDateLabels.newMoonLabel.replace("{sign}", signNames[newMoonEvent.sign] ?? newMoonEvent.sign),
      });
    }
    if (fullMoonDate && fullMoonEvent) {
      keyDates.push({
        date: formatShortLocalized(fullMoonDate, locale),
        event: keyDateLabels.fullMoonLabel.replace("{sign}", signNames[fullMoonEvent.sign] ?? fullMoonEvent.sign),
      });
    }

    const midMonth = new Date(Date.UTC(year, month, 15));
    const outerBodies: [Planet, Astronomy.Body][] = [
      ["Jupiter", Astronomy.Body.Jupiter],
      ["Saturn", Astronomy.Body.Saturn],
      ["Uranus", Astronomy.Body.Uranus],
      ["Neptune", Astronomy.Body.Neptune],
      ["Pluto", Astronomy.Body.Pluto],
    ];

    const outerPlanetTransits: { planet: Planet; sign: ZodiacSign; theme: string }[] = [];
    for (const [name, body] of outerBodies) {
      const lon = Astronomy.EclipticLongitude(body, midMonth);
      const signData = lonToSign(lon);
      const planetEl = (SIGN_ELEMENTS[signData.sign] || "Fire") as LElement;
      const themes = outerThemes[name]?.[planetEl];
      const theme = themes
        ? pick(themes, rng)
        : outerFallback
            .replace("{planet}", planetNames[name] ?? name)
            .replace("{sign}", signNames[signData.sign] ?? signData.sign);
      outerPlanetTransits.push({
        planet: name,
        sign: signData.sign,
        theme,
      });
    }

    const signIngresses = ["Mercury", "Venus", "Mars"] as const;
    const endOfMonth = new Date(Date.UTC(year, month + 1, 0));
    for (const pName of signIngresses) {
      const body = Astronomy.Body[pName];
      for (let day = 1; day <= endOfMonth.getUTCDate(); day++) {
        const d = new Date(Date.UTC(year, month, day));
        const lon = Astronomy.EclipticLongitude(body, d);
        const sign = lonToSign(lon).sign;
        const prevD = new Date(Date.UTC(year, month, day - 1 < 1 ? 1 : day - 1));
        const prevLon = Astronomy.EclipticLongitude(body, prevD);
        const prevSign = lonToSign(prevLon).sign;

        if (sign !== prevSign && day > 1) {
          const pLocal = planetNames[pName] ?? pName;
          const sLocal = signNames[sign] ?? sign;
          const enters =
            locale === "en" ? `${pLocal} enters ${sLocal}` :
            locale === "ja" ? `${pLocal}が${sLocal}に入る` :
            locale === "ko" ? `${pLocal}이(가) ${sLocal}에 진입` :
            /* zh */           `${pLocal}进入${sLocal}`;
          keyDates.push({ date: formatShortLocalized(d, locale), event: enters });
          break;
        }
      }
    }

    keyDates.sort((a, b) => {
      const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const parseShort = (s: string) => {
        const [m, d] = s.split(" ");
        return monthsShort.indexOf(m) * 100 + parseInt(d);
      };
      return parseShort(a.date) - parseShort(b.date);
    });

    const monthLabel = locale === "en" ? `${MONTH_NAMES[month]} ${year}` :
      locale === "ja" ? `${year}年${month + 1}月` :
      locale === "ko" ? `${year}년 ${month + 1}월` :
      /* zh */           `${year}年${month + 1}月`;
    const content = {
      month: monthLabel,
      overview: pick(overviews[element], rng),
      newMoon: newMoonEvent,
      fullMoon: fullMoonEvent,
      keyDates: keyDates.slice(0, 6),
      oneThingToDoThisMonth: pick(oneThings[element], rng),
      outerPlanetTransits,
    };

    await supabase.from("astrology_horoscope_cache").upsert(
      {
        user_id: user.id,
        date: monthKey,
        type: cacheType,
        content_json: content,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,date,type" }
    );

    return new Response(JSON.stringify(content), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=86400" },
    });
  } catch (error) {
    console.error("Monthly forecast error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to generate monthly forecast",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
