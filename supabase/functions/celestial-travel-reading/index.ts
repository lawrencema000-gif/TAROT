import { AppError, handler } from "../_shared/handler.ts";
import { aiGate, aiCacheStore, aiCacheKey } from "../_shared/ai-gate.ts";
import { callAIJson } from "../_shared/ai-providers.ts";
import { z } from "npm:zod@3.24.1";

/**
 * Celestial Travel Reading — the AI personalisation layer for the
 * Celestial Map.
 *
 * Input: a tapped lat/lon, the city name (best-effort from client), the
 * active planetary lines passing within 700km, the user's life-area
 * intent (love / career / travel / healing / home / growth / all), and
 * optional userContext (zodiac, mbti, locale).
 *
 * Output: a structured reading tailored to that place — a one-line
 * verdict, 2-4 sentence main reading, line-by-line nuance, watch-outs,
 * and a concrete "first three days here" practice.
 *
 * Gated: premium users hit this for free; non-premium pay 250 Moonstones
 * (debited client-side via useMoonstoneSpend before the call). The
 * function itself does NOT debit; it only enforces auth + rate limit.
 *
 * Rate limit: 8/min per user (rolling). The static interpretation
 * dictionary still serves the un-gated tap experience, so the AI call
 * is reserved for the deeper personalised pass.
 */

const ANGLES = ["AC", "DC", "MC", "IC"] as const;

const RequestSchema = z.object({
  /**
   * Reading mode. "travel" is the original tap-anywhere-on-the-map
   * reading. "best-place" is the headline "Find Your Place" reveal:
   * longer, richer, returns the why-this-place-fits-you narrative
   * for the single top-ranked city the client scored locally.
   */
  mode: z.enum(["travel", "best-place"]).default("travel"),
  city: z.object({
    name: z.string().min(1).max(120),
    country: z.string().min(1).max(120),
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
  }),
  intent: z.enum(["love", "career", "travel", "healing", "home", "growth", "all"]),
  lines: z.array(z.object({
    planet: z.enum([
      "Sun", "Moon", "Mercury", "Venus", "Mars",
      "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto",
    ]),
    angle: z.enum(ANGLES),
    distanceKm: z.number().min(0).max(2000),
  })).min(0).max(40),
  birth: z.object({
    /** UTC ISO timestamp of birth instant. The function does not recompute
     *  lines — it trusts the client's hits — so it does not need a full
     *  natal chart, just a coarse age + season for tonal alignment. */
    utc: z.string(),
  }),
  userContext: z.object({
    zodiacSign: z.string().optional(),
    mbtiType: z.string().optional(),
    locale: z.string().optional(),
  }).optional(),
});

type Req = z.infer<typeof RequestSchema>;

interface LineNote {
  planet: string;
  angle: string;
  note: string;
}

interface Resp {
  /** One-line verdict — "Strong career line, mixed for love" kind of thing. */
  verdict: string;
  /** 2-4 sentence main reading (travel mode) OR longer narrative (best-place mode). */
  body: string;
  /** Per-line nuance — at most 4, sorted by closest distance. */
  lineNotes: LineNote[];
  /** What to watch out for — one sentence. */
  cautionsNote: string;
  /** Concrete practice ritual — 2-3 sentences. */
  practice: string;
  /** Only present in "best-place" mode — a short poetic closing line. */
  closingBlessing?: string;
}

const CACHE_MODEL_TAG = "openai-gpt-5-or-gemini-2.5-flash";

function localeName(code: string): string {
  const normalized = code.toLowerCase().split("-")[0];
  return ({ ja: "Japanese", ko: "Korean", zh: "Chinese" } as Record<string, string>)[normalized] || "English";
}

const SYSTEM = `You are an astrocartography reader. The user has tapped a specific city on their personal celestial map. You will receive:
- The city + country.
- Which planetary lines are active within 700km (planet + angle + distance).
- Their stated INTENT for the reading (love / career / travel / healing / home / growth / all).
- Light personal context (zodiac sign, MBTI) — use sparingly for tone.

Astrocartography canon (Jim Lewis tradition):
- AC = rising/ascendant → personal identity, how you present here.
- DC = setting/descendant → partners, close one-to-ones, what mirrors you.
- MC = midheaven → public reputation, career, status.
- IC = imum coeli → private life, home, family, ancestral roots.
- Sun: identity, vitality, recognition.
- Moon: emotion, nurture, home-feeling.
- Mercury: communication, learning, trade.
- Venus: love, beauty, ease, art.
- Mars: drive, conflict, sexual heat, ambition.
- Jupiter: expansion, opportunity, luck, abundance, optimism.
- Saturn: structure, discipline, gravitas, slow build, sometimes loneliness.
- Uranus: disruption, breakthroughs, reinvention, instability.
- Neptune: dream, art, illusion, spirituality, dissolution.
- Pluto: transformation, intensity, power, depth, sometimes pain.

Your job:
1. VERDICT — one tight line summarising how this place would feel for the user, weighted by their intent. ~12 words.
2. BODY — 2-4 sentences integrating the active lines into a coherent narrative. Don't list line-by-line in the body; synthesise.
3. LINE NOTES — for the 3-4 most influential lines (closest first), one short sentence each: what specifically that line brings here.
4. CAUTIONS — one sentence on what to watch for. Honest, never alarmist.
5. PRACTICE — a concrete "first three days here" ritual the user could actually do. Should reflect the lines (e.g. for Sun MC: a public-facing intention; for Moon IC: an ancestral memory walk; for Venus DC: a one-meal-with-someone-new). 2-3 sentences.

Rules:
- Astrocartography is a signal map, NOT a prediction. Avoid binding language ("you will...", "this place will give you...").
- Soft-confident voice. Poetic precision, not florid mysticism.
- Honour the user's intent — if they chose "career", lead with career-relevant lines even if love lines are also active.
- If no lines are active (empty array), say so honestly. Don't fabricate.
- If many lines are active, prioritise — don't try to mention all of them.
- Output MUST be valid JSON matching the schema. No markdown, no preamble.

Schema:
{
  "verdict": string,
  "body": string,
  "lineNotes": [ { "planet": string, "angle": string, "note": string } ] (0-4),
  "cautionsNote": string,
  "practice": string
}`;

/**
 * Best-place reading system prompt — the headline "Find Your Place"
 * feature. Longer body (5-7 sentences), explicit case-making for why
 * this city tops the user's chart for the chosen intent, and a poetic
 * closing line.
 */
const BEST_PLACE_SYSTEM = `You are an astrocartography reader. The user just ran a "Find My Best Place" query on their personal celestial map. Our algorithm has ranked this city as their #1 match for their stated life-area intent. Your job is to write the case for it.

You will receive:
- The winning city + country.
- The user's INTENT (love / career / travel / healing / home / growth / all).
- The planetary lines active within 700km, sorted closest first.
- Light personal context (zodiac sign, MBTI) — use sparingly.

Astrocartography canon (Jim Lewis tradition):
- AC: identity, how you present, fresh start
- DC: partners, mirrors, one-to-ones
- MC: reputation, career, public visibility
- IC: home, foundations, ancestry, private life
- Sun: identity / recognition. Moon: emotion / home-feeling.
- Mercury: communication / trade. Venus: love / beauty / ease.
- Mars: drive / heat. Jupiter: expansion / luck.
- Saturn: structure / gravitas. Uranus: disruption / reinvention.
- Neptune: dream / art / spirituality. Pluto: transformation / depth.

Your job (this is the headline "destined place" reveal — write with quiet conviction):

1. VERDICT — one tight, declarative line declaring this city as their best fit for the chosen intent. ~14 words. Confident but not boastful.
2. BODY — 5-7 sentences explaining WHY this city tops their chart. Lead with the closest, strongest line. Name specific planet+angle combinations and translate them into plain language ("Jupiter on your career meridian passes 40km from here — the line of public recognition runs almost through the city centre"). Weave 2-3 lines together as a coherent narrative. Make it feel like the writer KNOWS this is the right place, not hedging.
3. LINE NOTES — for the 3-4 most influential lines (closest first), one short sentence each: what specifically that line brings.
4. CAUTIONS — one honest sentence on what to watch for. The map shows alignment, not guarantees.
5. PRACTICE — a richer "first month here" practice plan: 2-3 sentences naming a specific habit or place-based ritual the user can do once they arrive (or visit) to ground into the lines.
6. CLOSING BLESSING — a single poetic line. 8-14 words. Brand-true: mystical but grounded, gold not garish. Examples: "May your Saturn line teach you what stays." / "Walk slowly — the place is already meeting you halfway."

Rules:
- Voice: confident-but-soft. Treat this as a personal letter from a trusted advisor, not a press release.
- Astrocartography is a signal map, NOT a guarantee. Avoid binding language ("you will...", "this place will give you...").
- Specific over generic — name distances, planets, angles, neighbourhoods you can plausibly infer. Don't invent street names.
- If contributingLines is sparse (1-2 lines), still write the reading but lower the certainty in BODY accordingly.
- Output MUST be valid JSON matching the schema. No markdown, no preamble.

Schema:
{
  "verdict": string,
  "body": string,
  "lineNotes": [ { "planet": string, "angle": string, "note": string } ] (2-4),
  "cautionsNote": string,
  "practice": string,
  "closingBlessing": string
}`;

async function callAI(input: Req): Promise<Resp> {
  const locale = input.userContext?.locale ?? "en";
  const localeLine = locale !== "en"
    ? `\n\nIMPORTANT: Respond in ${localeName(locale)}. Keep the voice; just translate naturally.`
    : "";

  const linesList = input.lines.length === 0
    ? "(no active lines within 700 km of this point)"
    : input.lines
        .slice()
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .map((l) => `- ${l.planet} ${l.angle} (${Math.round(l.distanceKm)} km)`)
        .join("\n");

  const ctxLines: string[] = [];
  if (input.userContext?.zodiacSign) ctxLines.push(`- Sun sign: ${input.userContext.zodiacSign}`);
  if (input.userContext?.mbtiType) ctxLines.push(`- MBTI: ${input.userContext.mbtiType}`);
  const ctxBlock = ctxLines.length
    ? `\n\nPersonal context (use sparingly):\n${ctxLines.join("\n")}`
    : "";

  const placeLabel = input.mode === "best-place" ? "Winning city" : "Tapped place";
  const userPrompt = `${placeLabel}: ${input.city.name}, ${input.city.country} (${input.city.lat.toFixed(2)}°, ${input.city.lon.toFixed(2)}°)
Intent: ${input.intent}

Active lines within 700 km:
${linesList}${ctxBlock}

Reply with ONLY the JSON object matching the schema, nothing else.${localeLine}`;

  // best-place needs more headroom because the body is 5-7 sentences
  // plus the closing blessing.
  const isBestPlace = input.mode === "best-place";
  const parsed = await callAIJson<Resp>({
    system: isBestPlace ? BEST_PLACE_SYSTEM : SYSTEM,
    userPrompt,
    temperature: isBestPlace ? 0.78 : 0.7,
    maxOutputTokens: isBestPlace ? 1400 : 800,
  });

  if (
    !parsed.verdict ||
    !parsed.body ||
    !Array.isArray(parsed.lineNotes) ||
    !parsed.cautionsNote ||
    !parsed.practice
  ) {
    throw new AppError("AI_MALFORMED_RESPONSE", "AI response missing required fields", 502);
  }
  // best-place additionally requires closingBlessing.
  if (isBestPlace && !parsed.closingBlessing) {
    throw new AppError("AI_MALFORMED_RESPONSE", "Best-place reading missing closingBlessing", 502);
  }

  return parsed;
}

Deno.serve(handler<Req, Resp>({
  fn: "celestial-travel-reading",
  auth: "required",
  methods: ["POST"],
  rateLimit: { max: 8, windowMs: 60_000 },
  ai: true,
  spend: { actionKey: "celestial-travel-reading", cost: 250 },
  requestSchema: RequestSchema,
  run: async (ctx, body) => {
    // Cache key is built from city coords + intent + the planet+angle
    // set (rounded distance discarded, since the same city always has
    // the same lines within a 1km tolerance). Same place + same intent
    // for the same user-context shape returns the cached read — the
    // reading is fundamentally about the chart × the place, not about
    // the moment the user tapped.
    const linesKey = body.lines
      .map((l) => `${l.planet}-${l.angle}`)
      .sort()
      .join(",");
    const cityKey = `${body.city.lat.toFixed(2)},${body.city.lon.toFixed(2)}`;
    const ctxKey = [
      body.userContext?.locale ?? "en",
      body.userContext?.zodiacSign ?? "",
      body.userContext?.mbtiType ?? "",
    ].join("|");
    const key = await aiCacheKey(
      "celestial-travel-reading",
      CACHE_MODEL_TAG,
      `${body.mode}|${body.birth.utc}|${cityKey}|${body.intent}|${linesKey}`,
      ctxKey,
    );

    const gate = await aiGate<Resp>(ctx, { userId: ctx.userId, cacheKey: key });
    if (gate.allowed === false) throw new AppError(gate.reason, gate.message, gate.status);
    if (gate.cached) return gate.response;

    const fresh = await callAI(body);
    await aiCacheStore(ctx, { cacheKey: key, model: CACHE_MODEL_TAG, fnName: "celestial-travel-reading", response: fresh });
    return fresh;
  },
}));
