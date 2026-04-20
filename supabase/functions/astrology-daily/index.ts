import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import * as Astronomy from "npm:astronomy-engine@2.1.19";
import {
  normalizeLocale,
  SIGN_NAMES,
  THEMES as LTHEMES,
  SUMMARIES as LSUMMARIES,
  CATEGORIES as LCATEGORIES,
  DO_LISTS as LDO_LISTS,
  AVOID_LISTS as LAVOID_LISTS,
  POWER_MOVES as LPOWER_MOVES,
  RITUALS as LRITUALS,
  JOURNAL_PROMPTS as LJOURNAL_PROMPTS,
  buildAspectBrief,
  type Locale,
  type Element as LElement,
} from "../_shared/astrology-content.ts";
import { AppError, handler } from "../_shared/handler.ts";

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

interface DailyRequest {
  date?: string;
  timezone?: string;
  locale?: string;
}

function normDeg(d: number): number {
  return ((d % 360) + 360) % 360;
}

function lonToSign(lon: number): { sign: ZodiacSign; degree: number } {
  const n = normDeg(lon);
  const idx = Math.floor(n / 30);
  return { sign: SIGNS[idx], degree: Math.round((n % 30) * 100) / 100 };
}

function findHouse(lon: number, cusps: number[]): number {
  if (!cusps || cusps.length === 0) return 0;
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

interface TransitPlanetData {
  planet: Planet;
  longitude: number;
  sign: ZodiacSign;
}

function getCurrentPlanets(now: Date): TransitPlanetData[] {
  const planets: TransitPlanetData[] = [];

  const sunPos = Astronomy.SunPosition(now);
  const sunSign = lonToSign(sunPos.elon);
  planets.push({ planet: "Sun", longitude: sunPos.elon, sign: sunSign.sign });

  const moonPos = Astronomy.EclipticGeoMoon(now);
  const moonSign = lonToSign(moonPos.lon);
  planets.push({ planet: "Moon", longitude: moonPos.lon, sign: moonSign.sign });

  const bodyMap: [Planet, Astronomy.Body][] = [
    ["Mercury", Astronomy.Body.Mercury],
    ["Venus", Astronomy.Body.Venus],
    ["Mars", Astronomy.Body.Mars],
    ["Jupiter", Astronomy.Body.Jupiter],
    ["Saturn", Astronomy.Body.Saturn],
    ["Uranus", Astronomy.Body.Uranus],
    ["Neptune", Astronomy.Body.Neptune],
    ["Pluto", Astronomy.Body.Pluto],
  ];

  for (const [name, body] of bodyMap) {
    const lon = Astronomy.EclipticLongitude(body, now);
    const signData = lonToSign(lon);
    planets.push({ planet: name, longitude: lon, sign: signData.sign });
  }

  return planets;
}

interface NatalPlanet {
  planet: string;
  longitude: number;
  sign: string;
  house: number | null;
}

interface TransitHit {
  planet: Planet;
  aspect: AspectType;
  natalPlanet: Planet;
  orb: number;
}

function findTransitHits(
  transitPlanets: TransitPlanetData[],
  natalPlanets: NatalPlanet[],
): TransitHit[] {
  const aspectDefs: { type: AspectType; angle: number; maxOrb: number }[] = [
    { type: "conjunction", angle: 0, maxOrb: 6 },
    { type: "opposition", angle: 180, maxOrb: 6 },
    { type: "trine", angle: 120, maxOrb: 5 },
    { type: "square", angle: 90, maxOrb: 5 },
    { type: "sextile", angle: 60, maxOrb: 4 },
  ];

  const hits: TransitHit[] = [];

  for (const tp of transitPlanets) {
    for (const np of natalPlanets) {
      if (tp.planet === np.planet) continue;
      let diff = Math.abs(tp.longitude - np.longitude);
      if (diff > 180) diff = 360 - diff;

      for (const def of aspectDefs) {
        const orb = Math.abs(diff - def.angle);
        if (orb <= def.maxOrb) {
          hits.push({
            planet: tp.planet,
            aspect: def.type,
            natalPlanet: np.planet as Planet,
            orb: Math.round(orb * 10) / 10,
          });
          break;
        }
      }
    }
  }

  hits.sort((a, b) => a.orb - b.orb);
  return hits.slice(0, 5);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function dateSeed(dateStr: string, extra: number): number {
  let hash = extra;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash + dateStr.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

Deno.serve(
  handler<DailyRequest>({
    fn: "astrology-daily",
    auth: "required",
    rateLimit: { max: 60, windowMs: 60_000 },
    run: async (ctx, body) => {
      const requestDate = body.date;
      const timezone = body.timezone;
      const locale: Locale = normalizeLocale(body.locale);

      let today: string;
      if (requestDate) {
        today = requestDate;
      } else if (timezone) {
        try {
          const formatter = new Intl.DateTimeFormat("en-CA", {
            timeZone: timezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          });
          today = formatter.format(new Date());
        } catch {
          today = new Date().toISOString().split("T")[0];
        }
      } else {
        today = new Date().toISOString().split("T")[0];
      }

      // Include locale in the cache type key so switching language
      // re-generates cleanly; English keeps the bare "daily" key so existing
      // cache rows are still valid.
      const cacheType = locale === "en" ? "daily" : `daily:${locale}`;

      const { data: cached } = await ctx.supabase
        .from("astrology_horoscope_cache")
        .select("content_json")
        .eq("user_id", ctx.userId!)
        .eq("date", today)
        .eq("type", cacheType)
        .maybeSingle();

      if (cached?.content_json && Object.keys(cached.content_json).length > 0) {
        ctx.log.info("astrology_daily.cache_hit", { locale, date: today });
        return new Response(JSON.stringify(cached.content_json), {
          status: 200,
          headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" },
        });
      }

      const { data: chartRow } = await ctx.supabase
        .from("astrology_natal_charts")
        .select("natal_json, big_three_json")
        .eq("user_id", ctx.userId!)
        .maybeSingle();

      if (!chartRow?.natal_json) {
        throw new AppError(
          "NATAL_CHART_MISSING",
          "No natal chart found. Please compute your chart first.",
          404,
        );
      }

      const natalChart = chartRow.natal_json;
      const bigThree = chartRow.big_three_json;
      const natalPlanets: NatalPlanet[] = (natalChart.planets || []).map(
        (p: { planet: string; longitude: number; sign: string; house: number | null }) => ({
          planet: p.planet,
          longitude: p.longitude,
          sign: p.sign,
          house: p.house,
        }),
      );

      const now = new Date();
      const transitPlanets = getCurrentPlanets(now);

      const moonTransit = transitPlanets.find((p) => p.planet === "Moon")!;
      const moonSign = lonToSign(moonTransit.longitude);
      const houseCusps: number[] = natalChart.houses || [];
      const moonHouse = houseCusps.length > 0 ? findHouse(moonTransit.longitude, houseCusps) : null;

      const hits = findTransitHits(transitPlanets, natalPlanets);

      const sunSign = bigThree?.sun?.sign || "Aries";
      const element = (SIGN_ELEMENTS[sunSign] || "Fire") as LElement;

      const rng = seededRandom(dateSeed(today, sunSign.charCodeAt(0)));

      // Locale-specific content arrays — each table is indexed by locale then
      // element so switching locale changes ALL strings, not just summary.
      const themesForEl = LTHEMES[locale][element];
      const summariesForEl = LSUMMARIES[locale][element];
      const categoriesForLoc = LCATEGORIES[locale];
      const doForEl = LDO_LISTS[locale][element];
      const avoidForEl = LAVOID_LISTS[locale][element];
      const powerForEl = LPOWER_MOVES[locale][element];
      const ritualsForEl = LRITUALS[locale][element];
      const promptsForEl = LJOURNAL_PROMPTS[locale][element];

      const theme = pick(themesForEl, rng);
      const summary = pick(summariesForEl, rng);

      const transitHighlights = hits.map((h) => ({
        planet: h.planet,
        aspect: h.aspect,
        natalPlanet: h.natalPlanet,
        brief: buildAspectBrief(locale, h.planet, h.aspect, h.natalPlanet),
      }));

      const categories = {
        love: pick(categoriesForLoc.love[element], rng),
        career: pick(categoriesForLoc.career[element], rng),
        money: pick(categoriesForLoc.money[element], rng),
        energy: pick(categoriesForLoc.energy[element], rng),
      };

      const doList = pick(doForEl, rng);
      const avoidList = pick(avoidForEl, rng);
      const powerMove = pick(powerForEl, rng);
      const ritual = pick(ritualsForEl, rng);
      const journalPrompt = pick(promptsForEl, rng);

      const content = {
        date: today,
        theme,
        summary,
        moonSign: moonSign.sign,
        moonSignLocalized: SIGN_NAMES[locale][moonSign.sign] ?? moonSign.sign,
        moonHouse,
        transitHighlights,
        categories,
        doList,
        avoidList,
        powerMove,
        ritual,
        journalPrompt,
      };

      await ctx.supabase.from("astrology_horoscope_cache").upsert(
        {
          user_id: ctx.userId!,
          date: today,
          type: cacheType,
          content_json: content,
          generated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,date,type" },
      );

      ctx.log.info("astrology_daily.generated", { locale, date: today, sunSign });

      return new Response(JSON.stringify(content), {
        status: 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" },
      });
    },
  }),
);
