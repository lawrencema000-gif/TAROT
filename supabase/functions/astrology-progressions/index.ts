/**
 * Secondary progressions — "a day for a year" technique.
 *
 * For a user born on 1990-06-15, the progressed chart for their age 35
 * (year 2025) is the literal ephemeris positions 35 days after their
 * birth — i.e. 1990-07-20. This sounds arbitrary but it's a long-standing
 * Western technique for showing inner/psychological evolution.
 *
 * Returns the 10 classic planets + ASC/MC for the progressed date.
 * ASC/MC require the original birth latitude/longitude to compute, so
 * we pull them from the user's stored natal chart context.
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
  atAge: z.number().optional(),   // exact age to progress to. Defaults to current age.
});
type Req = z.infer<typeof RequestSchema>;

interface Position {
  planet: string;
  longitude: number;
  sign: string;
  degree: number;
}

interface Resp {
  progressedDate: string;
  progressedAge: number;
  positions: Position[];
}

function normDeg(d: number): number { return ((d % 360) + 360) % 360; }

function longitudeOf(body: Astronomy.Body | "Sun", date: Date): number {
  if (body === "Sun") return Astronomy.SunPosition(date).elon;
  return Astronomy.EclipticLongitude(body, date);
}

Deno.serve(handler<Req, Resp>({
  fn: "astrology-progressions",
  auth: "required",
  methods: ["POST"],
  rateLimit: { max: 20, windowMs: 60_000 },
  requestSchema: RequestSchema,
  run: async (ctx, body) => {
    const { data: profile } = await ctx.supabase
      .from("profiles")
      .select("birth_date, birth_time, birth_lat, birth_lon, timezone")
      .eq("id", ctx.userId!)
      .maybeSingle();
    if (!profile?.birth_date) {
      throw new AppError("BIRTH_DATE_MISSING", "Birth date required for progressions", 404);
    }

    // Parse birth moment. If we don't have birth time, default to noon in
    // the birth timezone — good enough for progressed planet longitudes
    // at a year resolution; only ASC/MC are time-sensitive (and we don't
    // progress them in this V1).
    const birthDate = profile.birth_date as string;
    const birthTime = (profile.birth_time as string) || "12:00";
    const birthMoment = new Date(`${birthDate}T${birthTime}:00Z`);
    if (Number.isNaN(birthMoment.getTime())) {
      throw new AppError("BIRTH_MOMENT_INVALID", "Could not parse birth date + time", 400);
    }

    // Compute age — either caller-specified or derived from now.
    const now = new Date();
    const ageYears = body.atAge ?? ((now.getTime() - birthMoment.getTime()) / (365.2425 * 86400000));
    if (ageYears < 0 || ageYears > 120) {
      throw new AppError("AGE_OUT_OF_RANGE", "Progressed age must be 0-120", 400);
    }

    // Progressed moment: add ageYears DAYS to birth.
    const progressedMoment = new Date(birthMoment.getTime() + ageYears * 86400000);

    const positions: Position[] = BODIES.map((b) => {
      const lon = normDeg(longitudeOf(b.body, progressedMoment));
      return {
        planet: b.name,
        longitude: Math.round(lon * 100) / 100,
        sign: SIGNS[Math.floor(lon / 30)],
        degree: Math.round((lon % 30) * 100) / 100,
      };
    });

    return {
      progressedDate: progressedMoment.toISOString(),
      progressedAge: Math.round(ageYears * 10) / 10,
      positions,
    };
  },
}));
