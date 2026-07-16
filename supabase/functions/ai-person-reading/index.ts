/**
 * ai-person-reading — a warm, chart-grounded AI reading for any saved person.
 * Computes (or reuses) the person's natal chart, distills the key placements
 * into a grounding brief, and asks the model for a personal interpretation.
 * Moonstone-gated server-side via the Sprint-D authoritative spend.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { AppError, handler } from "../_shared/handler.ts";
import { callAIText } from "../_shared/ai-providers.ts";
import { computeNatalChart, CHART_VERSION, type NatalChart } from "../_shared/natal.ts";
import { z } from "npm:zod@3.24.1";

const RequestSchema = z.object({
  personId: z.string().uuid(),
  focus: z.enum(["overview", "love", "career", "growth"]).optional(),
});
type Req = z.infer<typeof RequestSchema>;
interface Resp { reading: string; }

const SYSTEM =
  "You are Arcana's astrologer — warm, perceptive, and encouraging. You read " +
  "natal charts as a mirror for self-understanding, never as fixed fate. Speak " +
  "in second person about the individual described. Be specific to their actual " +
  "placements, weave 2-3 of them together into a coherent portrait, and end on " +
  "an empowering, forward-looking note. ~180-220 words. No headers, no lists, no " +
  "medical/financial/legal advice. This is for reflection and entertainment.";

function brief(chart: NatalChart, name: string, focus: string): string {
  const by = (n: string) => chart.planets.find((p) => p.planet === n);
  const lines: string[] = [];
  lines.push(`Name: ${name}. Focus: ${focus}.`);
  const parts = chart.planets.map((p) =>
    `${p.planet} in ${p.sign}${p.house ? ` (house ${p.house})` : ""}${p.retrograde ? " retrograde" : ""}`
  );
  lines.push(`Placements: ${parts.join("; ")}.`);
  if (chart.ascendantSign) lines.push(`Rising: ${chart.ascendantSign}.`);
  const big = [by("Sun"), by("Moon")].filter(Boolean);
  if (big.length) lines.push(`Core: Sun ${big[0]?.sign}, Moon ${by("Moon")?.sign}.`);
  const dom = Object.entries(chart.elements).sort((a, b) => b[1] - a[1])[0];
  if (dom) lines.push(`Dominant element: ${dom[0]}.`);
  const topAspects = chart.aspects.slice(0, 5).map((a) => `${a.planet1} ${a.type} ${a.planet2}`);
  if (topAspects.length) lines.push(`Key aspects: ${topAspects.join("; ")}.`);
  return lines.join("\n");
}

Deno.serve(handler<Req, Resp>({
  fn: "ai-person-reading",
  auth: "required",
  methods: ["POST"],
  rateLimit: { max: 15, windowMs: 60_000 },
  ai: true,
  spend: { actionKey: "person-reading", cost: 50 },
  requestSchema: RequestSchema,
  run: async (ctx, body) => {
    const supa = ctx.userSupabase!;
    const { data: person, error } = await supa
      .from("people")
      .select("id, name, birth_date, birth_time, birth_tz, birth_utc, birth_lat, birth_lon, chart, chart_version")
      .eq("id", body.personId)
      .maybeSingle();
    if (error) throw new AppError("DB_ERROR", "Could not load person", 500);
    if (!person) throw new AppError("NOT_FOUND", "Person not found", 404);

    const chart: NatalChart = (person.chart && person.chart_version === CHART_VERSION)
      ? person.chart
      : computeNatalChart({
          birthDate: person.birth_date,
          birthTime: person.birth_time,
          birthUtc: person.birth_utc,
          lat: person.birth_lat,
          lon: person.birth_lon,
          timezone: person.birth_tz,
        });

    const reading = await callAIText({
      system: SYSTEM,
      history: [{ role: "user", content: brief(chart, person.name, body.focus ?? "overview") }],
      temperature: 0.85,
      maxOutputTokens: 420,
    });

    return { reading: reading.trim() };
  },
}));
