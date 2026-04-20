import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import * as Astronomy from "npm:astronomy-engine@2.1.19";
import {
  normalizeLocale,
  SIGN_NAMES,
  PLANET_NAMES,
  type Locale,
  type Element as LElement,
} from "../_shared/astrology-content.ts";
import {
  NEW_MOON_THEMES as LNEW_MOON_THEMES,
  FULL_MOON_THEMES as LFULL_MOON_THEMES,
  OVERVIEWS as LOVERVIEWS,
  ONE_THING as LONE_THING,
  OUTER_PLANET_THEMES as LOUTER_PLANET_THEMES,
  KEY_DATES as LKEY_DATES,
  OUTER_PLANET_FALLBACK,
  formatShortLocalized,
} from "../_shared/astrology-content-extra.ts";
import { AppError, handler } from "../_shared/handler.ts";

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

interface MonthlyRequest {
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

Deno.serve(
  handler<MonthlyRequest>({
    fn: "astrology-monthly",
    auth: "required",
    rateLimit: { max: 20, windowMs: 60_000 },
    run: async (ctx, body) => {
      const locale: Locale = normalizeLocale(body.locale);

      const now = new Date();
      const year = now.getUTCFullYear();
      const month = now.getUTCMonth();
      const monthKey = `${year}-${String(month + 1).padStart(2, "0")}-01`;

      const cacheType = locale === "en" ? "monthly" : `monthly:${locale}`;
      const { data: cached } = await ctx.supabase
        .from("astrology_horoscope_cache")
        .select("content_json")
        .eq("user_id", ctx.userId!)
        .eq("date", monthKey)
        .eq("type", cacheType)
        .maybeSingle();

      if (cached?.content_json && Object.keys(cached.content_json).length > 0) {
        ctx.log.info("astrology_monthly.cache_hit", { locale, monthKey });
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
        const pBody = Astronomy.Body[pName];
        for (let day = 1; day <= endOfMonth.getUTCDate(); day++) {
          const d = new Date(Date.UTC(year, month, day));
          const lon = Astronomy.EclipticLongitude(pBody, d);
          const sign = lonToSign(lon).sign;
          const prevD = new Date(Date.UTC(year, month, day - 1 < 1 ? 1 : day - 1));
          const prevLon = Astronomy.EclipticLongitude(pBody, prevD);
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

      const monthLabel =
        locale === "en" ? `${MONTH_NAMES[month]} ${year}` :
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

      await ctx.supabase.from("astrology_horoscope_cache").upsert(
        {
          user_id: ctx.userId!,
          date: monthKey,
          type: cacheType,
          content_json: content,
          generated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,date,type" },
      );

      ctx.log.info("astrology_monthly.generated", { locale, monthKey, sunSign });

      return new Response(JSON.stringify(content), {
        status: 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=86400" },
      });
    },
  }),
);
