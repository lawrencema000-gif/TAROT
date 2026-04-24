/**
 * Year-ahead forecast — 12 months of major transits, grouped by month.
 *
 * Pay-per-report #2 from INCREMENTAL-ROADMAP.md Sprint 12. Only runs once
 * the user has unlocked it (report_unlocks row with key 'year-ahead').
 * Unlock is verified here as a defence-in-depth check; the client also
 * gates the route.
 *
 * Design:
 *   - Only looks at outer-planet transits (Jupiter, Saturn, Uranus, Neptune,
 *     Pluto) against the user's natal personal planets (Sun, Moon, Mercury,
 *     Venus, Mars, Ascendant if available). Fast-moving transits are not
 *     useful at a year-ahead horizon.
 *   - Walks the next 365 days day-by-day, records first entry into each
 *     (transitPlanet, natalPlanet, aspectType) combination, plus the
 *     estimated exit (when orb exceeds maxOrb again).
 *   - Each event gets an interpretation from a small lookup keyed on
 *     (transitPlanet, aspectType). Concrete enough to feel personal, soft
 *     enough to not over-promise.
 *   - Groups events by the month they begin, with a theme sentence per
 *     month derived from the dominant transit.
 *
 * Interpretations are curated text (no LLM call). Keeps per-report cost
 * at zero and makes output deterministic — users can share quotes.
 */

import * as Astronomy from "npm:astronomy-engine@2.1.19";
import { AppError, handler } from "../_shared/handler.ts";
import { z } from "npm:zod@3.24.1";

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;
type ZodiacSign = typeof SIGNS[number];

type TransitPlanet = "Jupiter" | "Saturn" | "Uranus" | "Neptune" | "Pluto";
type NatalPlanet = "Sun" | "Moon" | "Mercury" | "Venus" | "Mars" | "Ascendant" | "MC";
type AspectType = "conjunction" | "opposition" | "trine" | "square" | "sextile";

const TRANSIT_BODIES: { name: TransitPlanet; body: Astronomy.Body }[] = [
  { name: "Jupiter", body: Astronomy.Body.Jupiter },
  { name: "Saturn",  body: Astronomy.Body.Saturn },
  { name: "Uranus",  body: Astronomy.Body.Uranus },
  { name: "Neptune", body: Astronomy.Body.Neptune },
  { name: "Pluto",   body: Astronomy.Body.Pluto },
];

const ASPECTS: { type: AspectType; angle: number; maxOrb: number }[] = [
  { type: "conjunction", angle: 0,   maxOrb: 2.5 },
  { type: "opposition",  angle: 180, maxOrb: 2.5 },
  { type: "trine",       angle: 120, maxOrb: 2.0 },
  { type: "square",      angle: 90,  maxOrb: 2.0 },
  { type: "sextile",     angle: 60,  maxOrb: 1.5 },
];

const RequestSchema = z.object({});
type Request = z.infer<typeof RequestSchema>;

interface YearAheadEvent {
  startDate: string;  // ISO yyyy-mm-dd
  endDate: string;
  monthIso: string;   // yyyy-mm (for grouping)
  transitPlanet: TransitPlanet;
  natalPlanet: NatalPlanet;
  aspectType: AspectType;
  transitSign: ZodiacSign;
  interpretation: string;
  intensity: "soft" | "neutral" | "hard";
}

interface MonthBriefing {
  monthIso: string;
  monthLabel: string;
  events: YearAheadEvent[];
  theme: string;
}

interface YearAheadResponse {
  generatedAt: string;
  monthsCovered: number;
  months: MonthBriefing[];
  summary: string;
}

function normDeg(d: number): number {
  return ((d % 360) + 360) % 360;
}

function lonToSign(lon: number): ZodiacSign {
  return SIGNS[Math.floor(normDeg(lon) / 30)];
}

function planetLon(body: Astronomy.Body, date: Date): number {
  return Astronomy.EclipticLongitude(body, date);
}

function orbForAspect(tLon: number, nLon: number, angle: number): number {
  let diff = Math.abs(normDeg(tLon) - normDeg(nLon));
  if (diff > 180) diff = 360 - diff;
  return Math.abs(diff - angle);
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function monthIso(d: Date): string {
  return d.toISOString().slice(0, 7);
}

function monthLabel(iso: string): string {
  const [y, m] = iso.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(m) - 1]} ${y}`;
}

// ---------------------------------------------------------------
// Interpretations — keyed (transitPlanet, aspectType). These are
// intentionally soft astrology, not prophecy. Each line holds two
// variables: {{natalPlanet}} and {{sign}} — substituted per-event.
// ---------------------------------------------------------------

type InterpretationKey = `${TransitPlanet}:${AspectType}`;

const INTERPRETATIONS: Record<InterpretationKey, { text: string; intensity: "soft" | "neutral" | "hard" }> = {
  // Jupiter — expansion, opportunity, excess
  "Jupiter:conjunction": { text: "A year of expansion in the area your {{natalPlanet}} rules. Opportunities appear — say yes more than you usually would, but watch for overextension.", intensity: "soft" },
  "Jupiter:opposition":  { text: "Others act as mirrors for your {{natalPlanet}}. You grow through the people who challenge or contrast you. Don’t take the feedback personally; metabolize it.", intensity: "neutral" },
  "Jupiter:trine":       { text: "Flow where {{natalPlanet}} lives — doors open with less effort. Use the grace; don’t squander it by coasting.", intensity: "soft" },
  "Jupiter:square":      { text: "Growing pains around {{natalPlanet}}. The opportunity is real but the stretch is uncomfortable. Over-promising is the risk.", intensity: "neutral" },
  "Jupiter:sextile":     { text: "A gentle tailwind for {{natalPlanet}}. Takes initiative on your part — the opportunity is offered, not imposed.", intensity: "soft" },
  // Saturn — discipline, structure, time
  "Saturn:conjunction":  { text: "Saturn sits on your {{natalPlanet}}. Everything that is loose becomes structural — or falls away. This is a build year for the area {{natalPlanet}} governs.", intensity: "hard" },
  "Saturn:opposition":   { text: "A commitment or constraint around {{natalPlanet}} comes to a head. Someone or something in the external world forces a yes-or-no. Pick deliberately.", intensity: "hard" },
  "Saturn:trine":        { text: "A long, patient period of building around {{natalPlanet}}. The gains compound quietly — not dramatic, but durable.", intensity: "neutral" },
  "Saturn:square":       { text: "The classic Saturn obstacle. What you’re building around {{natalPlanet}} encounters reality; what doesn’t survive shouldn’t have. Expect a correction.", intensity: "hard" },
  "Saturn:sextile":      { text: "Steady, productive work on {{natalPlanet}}. Not glamorous, but the kind of effort that compounds into expertise.", intensity: "neutral" },
  // Uranus — disruption, awakening
  "Uranus:conjunction":  { text: "Uranus on your {{natalPlanet}} reorganizes how you relate to this area. Expect the unexpected; resistance makes it sharper. Ride the wave of change.", intensity: "hard" },
  "Uranus:opposition":   { text: "A sudden shift shows up through someone else around {{natalPlanet}}. The relationship or context suddenly looks different.", intensity: "neutral" },
  "Uranus:trine":        { text: "Creative breakthroughs in the area of {{natalPlanet}}. New possibilities arrive naturally — jump when they show up.", intensity: "soft" },
  "Uranus:square":       { text: "Abrupt friction around {{natalPlanet}}. The old shape doesn’t fit anymore. Forcing it makes things break; letting go lets something new emerge.", intensity: "hard" },
  "Uranus:sextile":      { text: "A nudge toward innovation on {{natalPlanet}}. Small changes now compound over years.", intensity: "soft" },
  // Neptune — dissolution, transcendence, confusion
  "Neptune:conjunction": { text: "A veil over {{natalPlanet}}. Intuition expands; clarity may temporarily blur. Not a good year for hard decisions about this area; a great year for imagination.", intensity: "neutral" },
  "Neptune:opposition":  { text: "Fog shows up through others around {{natalPlanet}}. Be careful of projections — yours and theirs. Slow down before committing.", intensity: "neutral" },
  "Neptune:trine":       { text: "Creative, spiritual, or imaginative gifts around {{natalPlanet}}. Trust the soft signals — this isn’t the year for hard logic here.", intensity: "soft" },
  "Neptune:square":      { text: "Confusion or self-deception around {{natalPlanet}}. Check facts; get a second opinion. Don’t decide from a fog.", intensity: "hard" },
  "Neptune:sextile":     { text: "Gentle intuitive opening on {{natalPlanet}}. Pay attention to dreams and creative instincts.", intensity: "soft" },
  // Pluto — transformation, power
  "Pluto:conjunction":   { text: "Pluto on {{natalPlanet}} is a multi-year transformation of how you relate to this area. What dies now clears the way for something truer.", intensity: "hard" },
  "Pluto:opposition":    { text: "A power dynamic around {{natalPlanet}} surfaces through someone else. Notice what you’re being asked to own in yourself.", intensity: "hard" },
  "Pluto:trine":         { text: "A natural deepening around {{natalPlanet}}. Capacity that was dormant starts to show. Use it.", intensity: "neutral" },
  "Pluto:square":        { text: "A hard reshape of {{natalPlanet}}. Power struggles — internal or external — force you to drop what isn’t essential. Uncomfortable; ultimately liberating.", intensity: "hard" },
  "Pluto:sextile":       { text: "Subtle deepening on {{natalPlanet}}. Not dramatic, but the foundation shifts in lasting ways.", intensity: "neutral" },
};

function interpret(event: Omit<YearAheadEvent, "interpretation" | "intensity" | "monthIso" | "transitSign"> & { transitSign: ZodiacSign }): { text: string; intensity: "soft" | "neutral" | "hard" } {
  const key: InterpretationKey = `${event.transitPlanet}:${event.aspectType}`;
  const tpl = INTERPRETATIONS[key];
  const text = tpl.text
    .replace(/\{\{natalPlanet\}\}/g, event.natalPlanet)
    .replace(/\{\{sign\}\}/g, event.transitSign);
  return { text, intensity: tpl.intensity };
}

function themeForMonth(events: YearAheadEvent[]): string {
  if (events.length === 0) return "A quiet month, astrologically. Use it to rest or ground.";
  // Dominant theme comes from the event with the slowest transit planet
  // and the hardest intensity — that’s what’s most likely to shape the month.
  const weight: Record<TransitPlanet, number> = {
    Pluto: 5, Neptune: 4, Uranus: 3, Saturn: 3, Jupiter: 2,
  };
  const intensityWeight = { hard: 3, neutral: 2, soft: 1 };
  const sorted = [...events].sort(
    (a, b) => (weight[b.transitPlanet] * 10 + intensityWeight[b.intensity])
            - (weight[a.transitPlanet] * 10 + intensityWeight[a.intensity]),
  );
  const dom = sorted[0];
  const themes: Record<TransitPlanet, string> = {
    Jupiter: "a month of expansion and reach",
    Saturn:  "a month of structure and consolidation",
    Uranus:  "a month of disruption and sudden clarity",
    Neptune: "a month of softening and imagination",
    Pluto:   "a month of transformation and power",
  };
  return `${themes[dom.transitPlanet]}, especially around your ${dom.natalPlanet}.`;
}

Deno.serve(handler<Request, YearAheadResponse>({
  fn: "astrology-year-ahead",
  auth: "required",
  methods: ["POST"],
  rateLimit: { max: 6, windowMs: 60_000 },
  requestSchema: RequestSchema,
  run: async (ctx) => {
    // Unlock check — the client gates this too, but server-side we defend
    // against a curl-wielding user.
    const { data: unlock } = await ctx.supabase
      .from("report_unlocks")
      .select("id")
      .eq("user_id", ctx.userId!)
      .eq("report_key", "year-ahead")
      .maybeSingle();
    if (!unlock) {
      throw new AppError("REPORT_NOT_UNLOCKED", "Unlock the Year Ahead report first", 402);
    }

    const { data: chartRow } = await ctx.supabase
      .from("astrology_natal_charts")
      .select("natal_json")
      .eq("user_id", ctx.userId!)
      .maybeSingle();
    if (!chartRow?.natal_json) {
      throw new AppError("NATAL_CHART_MISSING", "Compute your natal chart first", 404);
    }

    const planets = (chartRow.natal_json.planets || []) as Array<{ planet: string; longitude: number }>;
    const ascLon = typeof chartRow.natal_json.ascendant === "number"
      ? chartRow.natal_json.ascendant
      : (chartRow.natal_json.angles?.ascendant?.longitude ?? null);
    const mcLon = typeof chartRow.natal_json.mc === "number"
      ? chartRow.natal_json.mc
      : (chartRow.natal_json.angles?.mc?.longitude ?? null);

    const natalTargets: { planet: NatalPlanet; lon: number }[] = planets
      .filter((p) => ["Sun", "Moon", "Mercury", "Venus", "Mars"].includes(p.planet))
      .map((p) => ({ planet: p.planet as NatalPlanet, lon: p.longitude }));
    if (ascLon !== null) natalTargets.push({ planet: "Ascendant", lon: ascLon });
    if (mcLon  !== null) natalTargets.push({ planet: "MC", lon: mcLon });

    // Walk 365 days, record first entry into each (transit, natal, aspect)
    // combination. Track exit date by continuing to walk until orb >maxOrb.
    type EventKey = string;
    const activeEvents = new Map<EventKey, YearAheadEvent>();
    const finalized: YearAheadEvent[] = [];
    const now = new Date();

    for (let d = 0; d <= 365; d++) {
      const date = new Date(now);
      date.setUTCDate(date.getUTCDate() + d);
      date.setUTCHours(12, 0, 0, 0);

      for (const tb of TRANSIT_BODIES) {
        const tLon = planetLon(tb.body, date);
        const tSign = lonToSign(tLon);
        for (const np of natalTargets) {
          for (const asp of ASPECTS) {
            const orb = orbForAspect(tLon, np.lon, asp.angle);
            const key = `${tb.name}-${np.planet}-${asp.type}`;
            if (orb <= asp.maxOrb) {
              if (!activeEvents.has(key)) {
                const base = {
                  startDate: isoDate(date),
                  endDate: isoDate(date),
                  monthIso: monthIso(date),
                  transitPlanet: tb.name,
                  natalPlanet: np.planet,
                  aspectType: asp.type,
                  transitSign: tSign,
                };
                const { text, intensity } = interpret(base);
                activeEvents.set(key, { ...base, interpretation: text, intensity });
              } else {
                // Still active — update endDate.
                const ev = activeEvents.get(key)!;
                ev.endDate = isoDate(date);
              }
            } else {
              // No longer in orb — finalize and free the key so the same
              // aspect can recur later in the year (retrogrades).
              if (activeEvents.has(key)) {
                finalized.push(activeEvents.get(key)!);
                activeEvents.delete(key);
              }
            }
          }
        }
      }
    }
    // Finalize anything still active at end of window.
    for (const ev of activeEvents.values()) finalized.push(ev);

    // Group by start month.
    const byMonth = new Map<string, YearAheadEvent[]>();
    for (const ev of finalized) {
      const bucket = byMonth.get(ev.monthIso) ?? [];
      bucket.push(ev);
      byMonth.set(ev.monthIso, bucket);
    }

    // Build 12 sorted monthly briefings including empty months.
    const months: MonthBriefing[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now);
      d.setUTCMonth(d.getUTCMonth() + i);
      const iso = monthIso(d);
      const evs = (byMonth.get(iso) ?? []).sort((a, b) => a.startDate.localeCompare(b.startDate));
      months.push({
        monthIso: iso,
        monthLabel: monthLabel(iso),
        events: evs.slice(0, 4), // cap per month so the report stays scannable
        theme: themeForMonth(evs),
      });
    }

    const hardCount = finalized.filter((e) => e.intensity === "hard").length;
    const softCount = finalized.filter((e) => e.intensity === "soft").length;
    const summary =
      hardCount > softCount
        ? "A year with real weight. Expect structural shifts; build slowly and choose your commitments carefully."
        : softCount > hardCount + 2
          ? "A year of opening and grace. Initiate more than you usually would — the cosmos cooperates."
          : "A balanced year. Expansion and consolidation in equal measure. Pace yourself; neither rush nor stall.";

    ctx.log.info("year_ahead.generated", {
      eventCount: finalized.length,
      hardCount,
      softCount,
    });

    return {
      generatedAt: new Date().toISOString(),
      monthsCovered: 12,
      months,
      summary,
    };
  },
}));
