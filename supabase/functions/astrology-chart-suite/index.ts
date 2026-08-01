/**
 * astrology-chart-suite — one endpoint for the extended chart family:
 *
 *   lunar-return | tertiary | solar-arc | firdaria | composite | davison |
 *   sky-now | progressed-composite
 *
 * All pure ephemeris compute on the golden-tested natal core (no LLM, free).
 * Personal types read the caller's profile; two-person types accept either a
 * saved person id or explicit second-birth data, so both People-compare and
 * the ad-hoc partner flow can use them.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { AppError, handler } from "../_shared/handler.ts";
import { computeNatalChart, type NatalChart, type NatalInput } from "../_shared/natal.ts";
import {
  lunarReturnChart, tertiaryMoment, solarArcChart, crossAspects,
  computeFirdaria, compositeChart, davisonChart, type FirdariaResult,
} from "../_shared/charts-extended.ts";
import { z } from "npm:zod@3.24.1";

const RequestSchema = z.object({
  type: z.enum([
    "lunar-return", "tertiary", "solar-arc", "firdaria",
    "composite", "davison", "progressed-composite", "sky-now",
  ]),
  /** two-person types: a saved person to compare with */
  personId: z.string().uuid().optional(),
  /** sky-now: optional observer location so houses/ASC can be computed */
  lat: z.number().optional(),
  lon: z.number().optional(),
  /** lunar-return: month anchor (defaults now) */
  around: z.string().optional(),
});
type Req = z.infer<typeof RequestSchema>;

interface Resp {
  type: string;
  chart?: NatalChart;
  moment?: string;
  arc?: number;
  crossAspects?: ReturnType<typeof crossAspects>;
  firdaria?: FirdariaResult;
}

// deno-lint-ignore no-explicit-any
async function loadOwnNatal(ctx: any) {
  const { data: profile } = await ctx.userSupabase
    .from("profiles")
    .select("birth_date, birth_time, birth_tz, birth_utc, birth_lat, birth_lon, timezone")
    .eq("id", ctx.userId)
    .maybeSingle();
  if (!profile?.birth_date) throw new AppError("BIRTH_DATE_MISSING", "Add your birth date first", 404);
  const input: NatalInput = {
    birthDate: profile.birth_date as string,
    birthTime: (profile.birth_time as string) ?? null,
    birthUtc: (profile.birth_utc as string) ?? null,
    lat: (profile.birth_lat as number) ?? null,
    lon: (profile.birth_lon as number) ?? null,
    timezone: ((profile.birth_tz as string) || (profile.timezone as string)) ?? null,
  };
  const chart = computeNatalChart(input);
  const birthUtc = input.birthUtc ? new Date(input.birthUtc) : new Date(`${input.birthDate}T12:00:00Z`);
  return { input, chart, birthUtc };
}

Deno.serve(handler<Req, Resp>({
  fn: "astrology-chart-suite",
  auth: "required",
  methods: ["POST"],
  rateLimit: { max: 30, windowMs: 60_000 },
  requestSchema: RequestSchema,
  run: async (ctx, body) => {
    const now = new Date();

    if (body.type === "sky-now") {
      const chart = computeNatalChart({
        birthDate: now.toISOString().slice(0, 10),
        birthUtc: now.toISOString(),
        lat: body.lat ?? null, lon: body.lon ?? null, timezone: "UTC",
      });
      return { type: body.type, chart, moment: now.toISOString() };
    }

    const own = await loadOwnNatal(ctx);

    switch (body.type) {
      case "lunar-return": {
        const around = body.around ? new Date(body.around) : now;
        const { chart, returnMoment } = lunarReturnChart(own.input, own.chart, around);
        return { type: body.type, chart, moment: returnMoment, crossAspects: crossAspects(chart.planets, own.chart.planets, 3) };
      }
      case "tertiary": {
        const moment = tertiaryMoment(own.birthUtc, now);
        const chart = computeNatalChart({
          birthDate: moment.toISOString().slice(0, 10),
          birthUtc: moment.toISOString(),
          lat: own.input.lat, lon: own.input.lon, timezone: "UTC",
        });
        return { type: body.type, chart, moment: moment.toISOString(), crossAspects: crossAspects(chart.planets, own.chart.planets, 2) };
      }
      case "solar-arc": {
        const { chart, arc } = solarArcChart(own.chart, own.birthUtc, now);
        return { type: body.type, chart, arc, crossAspects: crossAspects(chart.planets, own.chart.planets, 2) };
      }
      case "firdaria": {
        return { type: body.type, firdaria: computeFirdaria(own.chart, own.birthUtc, now) };
      }
      case "composite":
      case "davison":
      case "progressed-composite": {
        if (!body.personId) throw new AppError("PERSON_REQUIRED", "personId required for two-person charts", 400);
        const supa = ctx.userSupabase!;
        const { data: person } = await supa
          .from("people")
          .select("name, birth_date, birth_time, birth_tz, birth_utc, birth_lat, birth_lon")
          .eq("id", body.personId)
          .maybeSingle();
        if (!person?.birth_date) throw new AppError("NOT_FOUND", "Person not found", 404);
        const otherInput: NatalInput = {
          birthDate: person.birth_date, birthTime: person.birth_time,
          birthUtc: person.birth_utc, lat: person.birth_lat, lon: person.birth_lon,
          timezone: person.birth_tz,
        };
        const other = computeNatalChart(otherInput);
        const otherUtc = otherInput.birthUtc ? new Date(otherInput.birthUtc) : new Date(`${otherInput.birthDate}T12:00:00Z`);

        if (body.type === "composite") {
          return { type: body.type, chart: compositeChart(own.chart, other) };
        }
        if (body.type === "davison") {
          const { chart, moment } = davisonChart(own.birthUtc, otherUtc, own.input.lat ?? null, own.input.lon ?? null, person.birth_lat, person.birth_lon);
          return { type: body.type, chart, moment };
        }
        // progressed-composite: composite of the two secondary-progressed charts
        const YEAR = 365.2425 * 86400000;
        const progOf = (utc: Date, input: NatalInput) => {
          const age = (now.getTime() - utc.getTime()) / YEAR;
          const m = new Date(utc.getTime() + age * 86400000);
          return computeNatalChart({ birthDate: m.toISOString().slice(0, 10), birthUtc: m.toISOString(), lat: input.lat, lon: input.lon, timezone: "UTC" });
        };
        return { type: body.type, chart: compositeChart(progOf(own.birthUtc, own.input), progOf(otherUtc, otherInput)) };
      }
      default:
        throw new AppError("UNKNOWN_TYPE", "Unsupported chart type", 400);
    }
  },
}));
