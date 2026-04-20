import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import * as Astronomy from "npm:astronomy-engine@2.1.19";
import {
  normalizeLocale,
  PLANET_NAMES,
  type Locale,
  type Element as LElement,
} from "../_shared/astrology-content.ts";
import {
  DAY_SHORT,
  ASPECT_EVENTS as LASPECT_EVENTS,
  ASPECT_ADVICE as LASPECT_ADVICE,
  STORYLINES as LSTORYLINES,
  BEST_DAYS_ACTIVITIES as LBEST_DAYS,
  NATAL_WORD,
  formatShortLocalized,
} from "../_shared/astrology-content-extra.ts";
import { AppError, handler } from "../_shared/handler.ts";

type Planet = "Sun" | "Moon" | "Mercury" | "Venus" | "Mars" | "Jupiter" | "Saturn" | "Uranus" | "Neptune" | "Pluto";
type AspectType = "conjunction" | "opposition" | "trine" | "square" | "sextile";

const SIGN_ELEMENTS: Record<string, string> = {
  Aries: "Fire", Taurus: "Earth", Gemini: "Air", Cancer: "Water",
  Leo: "Fire", Virgo: "Earth", Libra: "Air", Scorpio: "Water",
  Sagittarius: "Fire", Capricorn: "Earth", Aquarius: "Air", Pisces: "Water",
};

interface WeeklyRequest {
  locale?: string;
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

Deno.serve(
  handler<WeeklyRequest>({
    fn: "astrology-weekly",
    auth: "required",
    rateLimit: { max: 30, windowMs: 60_000 },
    run: async (ctx, body) => {
      const locale: Locale = normalizeLocale(body.locale);

      const now = new Date();
      const weekStart = getWeekStart(now);
      const weekEnd = new Date(weekStart);
      weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
      const weekKey = formatDate(weekStart);

      const cacheType = locale === "en" ? "weekly" : `weekly:${locale}`;
      const { data: cached } = await ctx.supabase
        .from("astrology_horoscope_cache")
        .select("content_json")
        .eq("user_id", ctx.userId!)
        .eq("date", weekKey)
        .eq("type", cacheType)
        .maybeSingle();

      if (cached?.content_json && Object.keys(cached.content_json).length > 0) {
        ctx.log.info("astrology_weekly.cache_hit", { locale, weekKey });
        return new Response(JSON.stringify(cached.content_json), {
          status: 200,
          headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=86400" },
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

      const natalPlanets: NatalPlanet[] = (chartRow.natal_json.planets || []).map(
        (p: { planet: string; longitude: number; sign: string }) => ({
          planet: p.planet,
          longitude: p.longitude,
          sign: p.sign,
        }),
      );
      const sunSign = chartRow.big_three_json?.sun?.sign || "Aries";
      const element = (SIGN_ELEMENTS[sunSign] || "Fire") as LElement;
      const dayShort = DAY_SHORT[locale];
      const aspectEvents = LASPECT_EVENTS[locale];
      const aspectAdvice = LASPECT_ADVICE[locale];
      const storylines = LSTORYLINES[locale];
      const bestDaysPoolSrc = LBEST_DAYS[locale];
      const natalWord = NATAL_WORD[locale];
      const planetNames = PLANET_NAMES[locale];

      const seed = weekKey.split("-").map(Number).reduce((a, b) => a * 31 + b, sunSign.charCodeAt(0));
      const rng = seededRandom(Math.abs(seed));

      const keyMoments: WeekDayEvent[] = [];

      for (let d = 0; d < 7; d++) {
        const dayDate = new Date(weekStart);
        dayDate.setUTCDate(dayDate.getUTCDate() + d);
        const dayName = dayShort[dayDate.getUTCDay()];

        for (const [tName, tBody] of bodyMap) {
          if (tName === "Moon") continue;
          const tLon = getPlanetLongitude(tBody, dayDate);

          for (const np of natalPlanets) {
            let diff = Math.abs(tLon - np.longitude);
            if (diff > 180) diff = 360 - diff;

            for (const def of aspectDefs) {
              const orb = Math.abs(diff - def.angle);
              if (orb <= def.maxOrb * 0.6) {
                const eventPhrases = aspectEvents[def.type];
                const advicePhrases = aspectAdvice[def.type];
                const tPlanetLocal = planetNames[tName] ?? tName;
                const nPlanetLocal = planetNames[np.planet] ?? np.planet;
                const phrase = pick(eventPhrases, rng);
                const eventText =
                  locale === "en" ? `${tPlanetLocal} ${phrase} your ${natalWord} ${nPlanetLocal}` :
                  locale === "ja" ? `${tPlanetLocal}${phrase}あなたの${natalWord}${nPlanetLocal}` :
                  locale === "ko" ? `${tPlanetLocal}이(가) ${phrase} 당신의 ${natalWord} ${nPlanetLocal}` :
                  /* zh */           `${tPlanetLocal}${phrase}你的${natalWord}${nPlanetLocal}`;
                keyMoments.push({
                  day: dayName,
                  event: eventText,
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

      const bestDaysPool = [...bestDaysPoolSrc[element]];
      const bestDays: { activity: string; day: string }[] = [];
      for (let i = 0; i < 4 && bestDaysPool.length > 0; i++) {
        const idx = Math.floor(rng() * bestDaysPool.length);
        const activity = bestDaysPool.splice(idx, 1)[0];
        const dayOffset = Math.floor(rng() * 7);
        const dayDate = new Date(weekStart);
        dayDate.setUTCDate(dayDate.getUTCDate() + dayOffset);
        bestDays.push({
          activity,
          day: dayShort[dayDate.getUTCDay()],
        });
      }

      const content = {
        weekStart: formatShortLocalized(weekStart, locale),
        weekEnd: formatShortLocalized(weekEnd, locale),
        mainStoryline: pick(storylines[element], rng),
        keyMoments: uniqueMoments,
        bestDays,
      };

      await ctx.supabase.from("astrology_horoscope_cache").upsert(
        {
          user_id: ctx.userId!,
          date: weekKey,
          type: cacheType,
          content_json: content,
          generated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,date,type" },
      );

      ctx.log.info("astrology_weekly.generated", { locale, weekKey, sunSign });

      return new Response(JSON.stringify(content), {
        status: 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=86400" },
      });
    },
  }),
);
