/**
 * Synastry — compute partner planet positions from provided birth data.
 *
 * The caller passes a partner's birth date (optionally birth time), and we
 * return their 10 planets + a rough "cross-aspects" listing (partner planet
 * aspects against the caller's natal planets).
 *
 * Design choices:
 *   - Partner birth time is optional; without it, Moon is skipped (moves
 *     too fast to be meaningful without a time) and ASC/MC aren't computed.
 *   - Cross-aspects use the same set we use elsewhere (conj/opp/tri/sq/sex)
 *     with tight orbs (2.5° for major, 1.5° for sextile).
 *   - The caller's natal chart comes from the stored astrology_natal_charts
 *     row — we don't re-send it up the wire.
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

const ASPECTS: { type: string; angle: number; maxOrb: number }[] = [
  { type: "conjunction", angle: 0,   maxOrb: 2.5 },
  { type: "opposition",  angle: 180, maxOrb: 2.5 },
  { type: "trine",       angle: 120, maxOrb: 2.5 },
  { type: "square",      angle: 90,  maxOrb: 2.0 },
  { type: "sextile",     angle: 60,  maxOrb: 1.5 },
];

const RequestSchema = z.object({
  partnerBirthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  partnerBirthTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  partnerName: z.string().min(1).max(80).optional(),
});
type Req = z.infer<typeof RequestSchema>;

interface Position {
  planet: string;
  longitude: number;
  sign: string;
  degree: number;
}

interface CrossAspect {
  partnerPlanet: string;
  natalPlanet: string;
  type: string;
  orb: number;
}

interface Resp {
  partnerName: string | null;
  partnerBirthUtc: string;
  hasTime: boolean;
  partnerPositions: Position[];
  crossAspects: CrossAspect[];
}

function normDeg(d: number): number { return ((d % 360) + 360) % 360; }
function longitudeOf(body: Astronomy.Body | "Sun", date: Date): number {
  if (body === "Sun") return Astronomy.SunPosition(date).elon;
  return Astronomy.EclipticLongitude(body, date);
}

Deno.serve(handler<Req, Resp>({
  fn: "astrology-synastry",
  auth: "required",
  methods: ["POST"],
  rateLimit: { max: 15, windowMs: 60_000 },
  ai: true,
  requestSchema: RequestSchema,
  run: async (ctx, body) => {
    const { data: natal } = await ctx.supabase
      .from("astrology_natal_charts")
      .select("natal_json")
      .eq("user_id", ctx.userId!)
      .maybeSingle();
    if (!natal?.natal_json) {
      throw new AppError("NATAL_CHART_MISSING", "Compute your natal chart first", 404);
    }

    const hasTime = !!body.partnerBirthTime;
    const time = body.partnerBirthTime ?? "12:00";
    const partnerMoment = new Date(`${body.partnerBirthDate}T${time}:00Z`);
    if (Number.isNaN(partnerMoment.getTime())) {
      throw new AppError("PARTNER_MOMENT_INVALID", "Invalid partner birth date/time", 400);
    }

    const partnerPositions: Position[] = BODIES
      .filter((b) => hasTime || b.name !== "Moon")
      .map((b) => {
        const lon = normDeg(longitudeOf(b.body, partnerMoment));
        return {
          planet: b.name,
          longitude: Math.round(lon * 100) / 100,
          sign: SIGNS[Math.floor(lon / 30)],
          degree: Math.round((lon % 30) * 100) / 100,
        };
      });

    // Cross aspects — partner planets against caller's natal planets.
    const natalPlanets = (natal.natal_json.planets || []) as Array<{ planet: string; longitude: number }>;
    const crossAspects: CrossAspect[] = [];
    for (const pp of partnerPositions) {
      for (const np of natalPlanets) {
        if (typeof np.longitude !== "number") continue;
        let diff = Math.abs(pp.longitude - normDeg(np.longitude));
        if (diff > 180) diff = 360 - diff;
        for (const asp of ASPECTS) {
          const orb = Math.abs(diff - asp.angle);
          if (orb <= asp.maxOrb) {
            crossAspects.push({
              partnerPlanet: pp.planet,
              natalPlanet: np.planet,
              type: asp.type,
              orb: Math.round(orb * 100) / 100,
            });
            break;
          }
        }
      }
    }

    // Sort by significance: tighter orb + luminaries first.
    const weight = (p: string): number =>
      p === "Sun" || p === "Moon" ? 3 : p === "Venus" || p === "Mars" ? 2 : 1;
    crossAspects.sort((a, b) => {
      const weightScore = weight(b.partnerPlanet) + weight(b.natalPlanet) - weight(a.partnerPlanet) - weight(a.natalPlanet);
      if (weightScore !== 0) return weightScore;
      return a.orb - b.orb;
    });

    return {
      partnerName: body.partnerName ?? null,
      partnerBirthUtc: partnerMoment.toISOString(),
      hasTime,
      partnerPositions,
      crossAspects: crossAspects.slice(0, 20),
    };
  },
}));
