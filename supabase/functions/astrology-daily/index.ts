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
import { geoEclipticLongitude } from "../_shared/astro.ts";
import { readingDayFor, cacheTypeFor } from "../_shared/readingDay.ts";
import { isFreshFor, stampedRow } from "../_shared/horoscope-cache.ts";

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

/** The cache revision of a locale's generated text (see the cache lookup in run). */
const CACHE_REVISION: Partial<Record<Locale, number>> = { ja: 2, zh: 2 };

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
    // GEOCENTRIC longitude (shared helper) — EclipticLongitude is
    // heliocentric and put planets in the wrong sign most days.
    const lon = geoEclipticLongitude(body, now);
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

/** What changes during the day: the Moon's sign and natal house, and the active transits, at `now`. */
function liveSky(locale: Locale, natalChart: { planets?: NatalPlanet[]; houses?: number[] }, now: Date) {
  const natalPlanets: NatalPlanet[] = (natalChart.planets || []).map((p) => ({
    planet: p.planet,
    longitude: p.longitude,
    sign: p.sign,
    house: p.house,
  }));
  const transitPlanets = getCurrentPlanets(now);
  const moon = transitPlanets.find((p) => p.planet === "Moon")!;
  const moonSign = lonToSign(moon.longitude).sign;
  const houseCusps: number[] = natalChart.houses || [];
  return {
    moonSign,
    moonSignLocalized: SIGN_NAMES[locale][moonSign] ?? moonSign,
    moonHouse: houseCusps.length > 0 ? findHouse(moon.longitude, houseCusps) : null,
    transitHighlights: findTransitHits(transitPlanets, natalPlanets).map((h) => ({
      planet: h.planet,
      aspect: h.aspect,
      natalPlanet: h.natalPlanet,
      brief: buildAspectBrief(locale, h.planet, h.aspect, h.natalPlanet),
    })),
  };
}

function json(body: unknown): Response {
  // Per member and partly live: nothing between the app and here may keep a copy.
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" },
  });
}

Deno.serve(
  handler<DailyRequest>({
    fn: "astrology-daily",
    auth: "required",
    rateLimit: { max: 60, windowMs: 60_000 },
    run: async (ctx, body) => {
      const now = new Date();
      const locale: Locale = normalizeLocale(body.locale);
      // The member's day (home-astro-02): the app's date within a day of the
      // UTC date, else the request's zone, the profile's zone, then UTC.
      const { day: today, source, rejected } = await readingDayFor(body, now, async () => {
        const { data } = await ctx.supabase.from("profiles").select("timezone").eq("id", ctx.userId!).maybeSingle();
        return (data?.timezone as string | null | undefined) ?? null;
      });
      if (rejected) ctx.log.warn("astrology_daily.date_rejected", { rejected, source });

      // Include locale in the cache type key so switching language
      // re-generates cleanly; English keeps the bare "daily" key so existing
      // cache rows are still valid. A locale's revision is bumped when its
      // generated text changes, so a day cached before the change is not
      // served for the rest of that day (ja and zh r2: full-width
      // punctuation, p10 d2-ja-05, d3-ko-08).
      const cacheType = cacheTypeFor("daily", locale, CACHE_REVISION[locale]);

      const [{ data: cached, error: cacheError }, { data: chartRow }] = await Promise.all([
        ctx.supabase
          .from("astrology_horoscope_cache")
          .select("content_json, chart_computed_at, generated_at")
          .eq("user_id", ctx.userId!)
          .eq("date", today)
          .eq("type", cacheType)
          .maybeSingle(),
        ctx.supabase
          .from("astrology_natal_charts")
          .select("natal_json, big_three_json, computed_at")
          .eq("user_id", ctx.userId!)
          .maybeSingle(),
      ]);

      if (!chartRow?.natal_json) {
        throw new AppError(
          "NATAL_CHART_MISSING",
          "No natal chart found. Please compute your chart first.",
          404,
        );
      }

      // A row is served only while it was built from the member's chart
      // (gap-1-04): after a recast the day is generated again.
      if (
        !cacheError &&
        cached?.content_json &&
        Object.keys(cached.content_json).length > 0 &&
        isFreshFor(cached, chartRow)
      ) {
        // The day's text is kept; the Moon and the transits are read now
        // (home-astro-14). A row written before a Moon ingress or house
        // cusp no longer names the sign or house the Moon has left.
        ctx.log.info("astrology_daily.cache_hit", { locale, date: today, source, live: true });
        return json({ ...cached.content_json, ...liveSky(locale, chartRow.natal_json, now) });
      }

      const bigThree = chartRow.big_three_json;

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

      // liveSky uses no RNG, so the picks above run in the same order as
      // before and a date's text is unchanged.
      const content = {
        date: today,
        theme,
        summary,
        ...liveSky(locale, chartRow.natal_json, now),
        categories,
        doList,
        avoidList,
        powerMove,
        ritual,
        journalPrompt,
      };

      const { error: writeError } = await ctx.supabase
        .from("astrology_horoscope_cache")
        .upsert(
          stampedRow(ctx.userId!, today, cacheType, content, chartRow.computed_at, now),
          { onConflict: "user_id,date,type" },
        );
      if (writeError) {
        ctx.log.warn("astrology_daily.cache_write_failed", { code: writeError.code, type: cacheType, date: today });
      }

      ctx.log.info("astrology_daily.generated", { locale, date: today, source, sunSign });

      return json(content);
    },
  }),
);
