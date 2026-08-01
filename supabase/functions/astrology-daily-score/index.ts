/**
 * astrology-daily-score — a personal 0-100 "cosmic weather" score computed
 * from today's REAL transits against the user's natal chart, with a fully
 * transparent "why" breakdown (the anti-anxiety answer to competitor scores
 * that give a scary number with no explanation).
 *
 * Pure ephemeris compute — free, no LLM. Deterministic for a given user+hour.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { AppError, handler } from "../_shared/handler.ts";
import { computeNatalChart, type NatalInput } from "../_shared/natal.ts";
import { crossAspects } from "../_shared/charts-extended.ts";
import { z } from "npm:zod@3.24.1";

const RequestSchema = z.object({}).optional();
type Req = z.infer<typeof RequestSchema>;

interface Influence {
  transiting: string;
  natal: string;
  type: string;
  orb: number;
  effect: number;    // signed contribution
  harmonious: boolean;
}
interface Resp {
  score: number;
  date: string;
  influences: Influence[];
  counts: { harmonious: number; challenging: number; neutral: number };
}

// Planet weights: luminaries + relationship planets move the needle most.
const T_WEIGHT: Record<string, number> = {
  Sun: 1.6, Moon: 1.5, Mercury: 1.0, Venus: 1.3, Mars: 1.2,
  Jupiter: 1.4, Saturn: 1.3, Uranus: 0.9, Neptune: 0.8, Pluto: 0.9,
};
const N_WEIGHT: Record<string, number> = {
  Sun: 1.5, Moon: 1.5, Mercury: 1.0, Venus: 1.2, Mars: 1.1,
  Jupiter: 1.0, Saturn: 1.0, Uranus: 0.8, Neptune: 0.8, Pluto: 0.9,
};

Deno.serve(handler<Req, Resp>({
  fn: "astrology-daily-score",
  auth: "required",
  methods: ["POST"],
  rateLimit: { max: 20, windowMs: 60_000 },
  run: async (ctx, _body) => {
    const { data: profile } = await ctx.userSupabase!
      .from("profiles")
      .select("birth_date, birth_time, birth_tz, birth_utc, birth_lat, birth_lon, timezone")
      .eq("id", ctx.userId!)
      .maybeSingle();
    if (!profile?.birth_date) throw new AppError("BIRTH_DATE_MISSING", "Add your birth date first", 404);

    const input: NatalInput = {
      birthDate: profile.birth_date,
      birthTime: profile.birth_time,
      birthUtc: profile.birth_utc,
      lat: profile.birth_lat,
      lon: profile.birth_lon,
      timezone: profile.birth_tz || profile.timezone,
    };
    const natal = computeNatalChart(input);

    // Anchor to the current UTC hour so repeated calls within the hour are
    // identical (client caches per local day anyway).
    const now = new Date();
    now.setUTCMinutes(0, 0, 0);
    const sky = computeNatalChart({
      birthDate: now.toISOString().slice(0, 10),
      birthUtc: now.toISOString(),
      lat: null, lon: null, timezone: "UTC",
    });

    const hits = crossAspects(sky.planets, natal.planets, 4);
    let score = 55; // neutral baseline, slightly warm
    const influences: Influence[] = [];
    let harmonious = 0, challenging = 0, neutral = 0;

    for (const a of hits) {
      const tw = T_WEIGHT[a.planet1] ?? 1;
      const nw = N_WEIGHT[a.planet2] ?? 1;
      const tightness = 1 - a.orb / 4; // 0..1
      let base = 0;
      let isHarm = false;
      if (a.type === "trine") { base = 4.5; isHarm = true; }
      else if (a.type === "sextile") { base = 3; isHarm = true; }
      else if (a.type === "conjunction") {
        // benefics warm, malefics press, others neutral-positive
        if (a.planet1 === "Venus" || a.planet1 === "Jupiter") { base = 4; isHarm = true; }
        else if (a.planet1 === "Saturn" || a.planet1 === "Mars" || a.planet1 === "Pluto") { base = -3; }
        else { base = 1.5; isHarm = true; }
      }
      else if (a.type === "square") base = -3.5;
      else if (a.type === "opposition") base = -3;

      const effect = Math.round(base * tw * nw * tightness * 10) / 10;
      if (effect > 0) harmonious++; else if (effect < 0) challenging++; else neutral++;
      score += effect;
      influences.push({
        transiting: a.planet1, natal: a.planet2, type: a.type,
        orb: a.orb, effect, harmonious: isHarm && effect > 0,
      });
    }

    score = Math.round(Math.max(5, Math.min(99, score)));
    influences.sort((x, y) => Math.abs(y.effect) - Math.abs(x.effect));

    return {
      score,
      date: now.toISOString().slice(0, 10),
      influences: influences.slice(0, 8),
      counts: { harmonious, challenging, neutral },
    };
  },
}));
