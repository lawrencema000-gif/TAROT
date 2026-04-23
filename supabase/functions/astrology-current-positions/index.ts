/**
 * astrology-current-positions — returns the current longitudes of the ten
 * classic planets. Used by the client to render a transit overlay on the
 * natal chart wheel.
 *
 * Kept separate from astrology-daily / transit-calendar because it is a
 * lean lookup — no natal chart required, no DB hit. Cachable for ~1 hour
 * since outer planets move <1°/day.
 */

import * as Astronomy from "npm:astronomy-engine@2.1.19";
import { handler } from "../_shared/handler.ts";
import { z } from "npm:zod@3.24.1";

const RequestSchema = z.object({
  at: z.string().datetime().optional(),
});
type Req = z.infer<typeof RequestSchema>;

interface Position {
  planet: string;
  longitude: number;
  sign: string;
  degree: number;
}

interface Resp {
  at: string;
  positions: Position[];
}

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

function normDeg(d: number): number { return ((d % 360) + 360) % 360; }

function longitudeOf(body: Astronomy.Body | "Sun", date: Date): number {
  if (body === "Sun") return Astronomy.SunPosition(date).elon;
  return Astronomy.EclipticLongitude(body, date);
}

export default handler<Req, Resp>({
  fn: "astrology-current-positions",
  auth: "required",
  methods: ["POST"],
  rateLimit: { max: 60, windowMs: 60_000 },
  requestSchema: RequestSchema,
  run: async (_ctx, body) => {
    const atDate = body.at ? new Date(body.at) : new Date();
    const positions: Position[] = BODIES.map((b) => {
      const lon = normDeg(longitudeOf(b.body, atDate));
      const signIdx = Math.floor(lon / 30);
      return {
        planet: b.name,
        longitude: Math.round(lon * 100) / 100,
        sign: SIGNS[signIdx],
        degree: Math.round((lon % 30) * 100) / 100,
      };
    });
    return {
      at: atDate.toISOString(),
      positions,
    };
  },
});
