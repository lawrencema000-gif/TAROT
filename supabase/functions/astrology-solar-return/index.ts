/**
 * Solar return — the chart for the exact moment each year when the Sun
 * returns to its natal longitude. One chart per year, used in Western
 * astrology to characterize the year ahead.
 *
 * Search strategy:
 *   1. Estimate: target_year birthday ± 2 days.
 *   2. Binary search (with Astronomy.SunPosition at minute-resolution)
 *      around that window until Sun longitude matches natal to <0.001°.
 *   3. Return positions at that moment.
 */

import * as Astronomy from "npm:astronomy-engine@2.1.19";
import { AppError, handler } from "../_shared/handler.ts";
import { z } from "npm:zod@3.24.1";

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

const BODIES: { name: string; body: Astronomy.Body | "Sun" }[] = [
  { name: "Sun",     body: "Sun" },
  { name: "Moon",    body: Astronomy.Body.Moon },
  { name: "Mercury", body: Astronomy.Body.Mercury },
  { name: "Venus",   body: Astronomy.Body.Venus },
  { name: "Mars",    body: Astronomy.Body.Mars },
  { name: "Jupiter", body: Astronomy.Body.Jupiter },
  { name: "Saturn",  body: Astronomy.Body.Saturn },
  { name: "Uranus",  body: Astronomy.Body.Uranus },
  { name: "Neptune", body: Astronomy.Body.Neptune },
  { name: "Pluto",   body: Astronomy.Body.Pluto },
];

const RequestSchema = z.object({
  year: z.number().int().min(1900).max(2100).optional(),
});
type Req = z.infer<typeof RequestSchema>;

interface Position {
  planet: string;
  longitude: number;
  sign: string;
  degree: number;
}

interface Resp {
  returnMoment: string;
  year: number;
  natalSunLongitude: number;
  positions: Position[];
}

function normDeg(d: number): number { return ((d % 360) + 360) % 360; }
function sunLonAt(d: Date): number { return normDeg(Astronomy.SunPosition(d).elon); }
function longitudeOf(body: Astronomy.Body | "Sun", date: Date): number {
  if (body === "Sun") return sunLonAt(date);
  return Astronomy.EclipticLongitude(body, date);
}

/**
 * Find the moment within [start, end] when Sun longitude equals target.
 * Uses a tight minute-resolution bisection. Assumes Sun moves monotonically
 * across the window (true for ~7 days, never reversed).
 */
function findSunReturn(target: number, start: Date, end: Date): Date {
  let lo = start.getTime();
  let hi = end.getTime();
  const targetN = normDeg(target);

  // Unwrap so lon increases monotonically across the window
  const unwrap = (lon: number, prev: number): number => {
    while (lon < prev - 10) lon += 360;
    return lon;
  };

  let lonLo = sunLonAt(new Date(lo));
  const lonHiRaw = sunLonAt(new Date(hi));
  const lonHi = unwrap(lonHiRaw, lonLo);
  const tgt = unwrap(targetN, lonLo);
  if (tgt < lonLo || tgt > lonHi) {
    // Target not inside window — return midpoint fallback.
    return new Date(Math.round((lo + hi) / 2));
  }

  while (hi - lo > 60_000) {  // 1-minute resolution
    const mid = (lo + hi) / 2;
    const midLon = unwrap(sunLonAt(new Date(mid)), lonLo);
    if (midLon < tgt) {
      lo = mid;
      lonLo = midLon;
    } else {
      hi = mid;
    }
  }
  return new Date(Math.round((lo + hi) / 2));
}

Deno.serve(handler<Req, Resp>({
  fn: "astrology-solar-return",
  auth: "required",
  methods: ["POST"],
  rateLimit: { max: 15, windowMs: 60_000 },
  requestSchema: RequestSchema,
  run: async (ctx, body) => {
    const { data: profile } = await ctx.supabase
      .from("profiles")
      .select("birth_date, birth_time")
      .eq("id", ctx.userId!)
      .maybeSingle();
    if (!profile?.birth_date) {
      throw new AppError("BIRTH_DATE_MISSING", "Birth date required for solar return", 404);
    }

    const birthDate = profile.birth_date as string;
    const birthTime = (profile.birth_time as string) || "12:00";
    const birthMoment = new Date(`${birthDate}T${birthTime}:00Z`);
    if (Number.isNaN(birthMoment.getTime())) {
      throw new AppError("BIRTH_MOMENT_INVALID", "Could not parse birth moment", 400);
    }
    const natalSunLon = sunLonAt(birthMoment);

    const year = body.year ?? new Date().getUTCFullYear();
    const birthYear = birthMoment.getUTCFullYear();
    if (year < birthYear || year > birthYear + 120) {
      throw new AppError("YEAR_OUT_OF_RANGE", "Year out of range", 400);
    }

    const candidate = new Date(Date.UTC(
      year,
      birthMoment.getUTCMonth(),
      birthMoment.getUTCDate(),
      birthMoment.getUTCHours(),
      birthMoment.getUTCMinutes(),
    ));
    const windowStart = new Date(candidate.getTime() - 3 * 86400000);
    const windowEnd   = new Date(candidate.getTime() + 3 * 86400000);

    const returnMoment = findSunReturn(natalSunLon, windowStart, windowEnd);

    const positions: Position[] = BODIES.map((b) => {
      const lon = normDeg(longitudeOf(b.body, returnMoment));
      return {
        planet: b.name,
        longitude: Math.round(lon * 100) / 100,
        sign: SIGNS[Math.floor(lon / 30)],
        degree: Math.round((lon % 30) * 100) / 100,
      };
    });

    return {
      returnMoment: returnMoment.toISOString(),
      year,
      natalSunLongitude: Math.round(natalSunLon * 100) / 100,
      positions,
    };
  },
}));
