/**
 * astrology-person-chart — compute (and cache) a full natal chart for a saved
 * "person" or for ad-hoc birth data. Pure geocentric compute via _shared/natal
 * (the same proven math as astrology-compute-natal). No LLM, no Moonstone spend
 * — free. When a personId is given, the chart is cached on people.chart and
 * reused until birth data changes (the DB trigger nulls the cache on edit) or
 * CHART_VERSION bumps.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { AppError, handler } from "../_shared/handler.ts";
import { computeNatalChart, CHART_VERSION, type NatalChart } from "../_shared/natal.ts";
import { z } from "npm:zod@3.24.1";

const RequestSchema = z.union([
  z.object({ personId: z.string().uuid() }),
  z.object({
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    birthTime: z.string().nullable().optional(),
    birthUtc: z.string().nullable().optional(),
    timezone: z.string().nullable().optional(),
    lat: z.number().nullable().optional(),
    lon: z.number().nullable().optional(),
  }),
]);
type Req = z.infer<typeof RequestSchema>;

interface Resp {
  chart: NatalChart;
  cached: boolean;
  person?: { id: string; name: string; relationship: string };
}

Deno.serve(handler<Req, Resp>({
  fn: "astrology-person-chart",
  auth: "required",
  methods: ["POST"],
  rateLimit: { max: 30, windowMs: 60_000 },
  requestSchema: RequestSchema,
  run: async (ctx, body) => {
    // ── Ad-hoc birth data (no saved person) ──
    if (!("personId" in body)) {
      const chart = computeNatalChart({
        birthDate: body.birthDate,
        birthTime: body.birthTime ?? null,
        birthUtc: body.birthUtc ?? null,
        lat: body.lat ?? null,
        lon: body.lon ?? null,
        timezone: body.timezone ?? null,
      });
      return { chart, cached: false };
    }

    // ── Saved person: load (RLS-scoped), return cache or compute+cache ──
    const supa = ctx.userSupabase!;
    const { data: person, error } = await supa
      .from("people")
      .select("id, name, relationship, birth_date, birth_time, birth_tz, birth_utc, birth_lat, birth_lon, chart, chart_version")
      .eq("id", body.personId)
      .maybeSingle();
    if (error) throw new AppError("DB_ERROR", "Could not load person", 500);
    if (!person) throw new AppError("NOT_FOUND", "Person not found", 404);

    const meta = { id: person.id, name: person.name, relationship: person.relationship };

    if (person.chart && person.chart_version === CHART_VERSION) {
      return { chart: person.chart as NatalChart, cached: true, person: meta };
    }

    const chart = computeNatalChart({
      birthDate: person.birth_date,
      birthTime: person.birth_time,
      birthUtc: person.birth_utc,
      lat: person.birth_lat,
      lon: person.birth_lon,
      timezone: person.birth_tz,
    });

    // Cache (best-effort; RLS allows the owner to update their own row).
    await supa.from("people")
      .update({ chart, chart_version: CHART_VERSION })
      .eq("id", person.id);

    return { chart, cached: false, person: meta };
  },
}));
