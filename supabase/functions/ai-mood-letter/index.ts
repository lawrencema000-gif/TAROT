import { AppError, handler } from "../_shared/handler.ts";
import { aiCacheGet, aiCacheStore, aiCacheKey } from "../_shared/ai-gate.ts";
import { callAIJson } from "../_shared/ai-providers.ts";
import { z } from "npm:zod@3.24.1";

/**
 * AI Mood Letter — weekly compassionate read of the user's mood log.
 *
 * Takes the last 7-14 mood entries + notes and returns a 3-paragraph
 * letter addressed to the user: "This week I notice…", "Underneath
 * the pattern…", "As you move into the next week…". Tone is warm,
 * specific, grounded. Never prescriptive, never predictive.
 *
 * Opt-in from the client — the user taps "Generate this week's
 * letter" rather than it running automatically, since mood notes
 * can be sensitive.
 *
 * Rate limit: 5/min per user (these letters are called manually, not
 * on every mood log).
 */

const EntrySchema = z.object({
  date: z.string(),                 // YYYY-MM-DD
  category: z.enum(['calm', 'charged', 'drained', 'steady', 'anxious', 'joyful', 'heavy', 'curious']),
  intensity: z.number().int().min(1).max(5),
  note: z.string().max(400).optional(),
});

const RequestSchema = z.object({
  entries: z.array(EntrySchema).min(3).max(30),
  userContext: z.object({
    displayName: z.string().optional(),
    locale: z.string().optional(),
  }).optional(),
});

type Req = z.infer<typeof RequestSchema>;

interface Resp {
  letter: string;              // full letter (~3 short paragraphs)
  dominantTheme: string;       // 1-phrase theme label
  careSuggestion: string;      // 1 concrete self-care practice
}

// Tag used for cache key versioning. Provider chain in _shared/ai-providers.ts.
const CACHE_MODEL_TAG = "openai-gpt-5-or-gemini-2.5-flash";

function localeName(code: string): string {
  const normalized = code.toLowerCase().split("-")[0];
  return ({ ja: "Japanese", ko: "Korean", zh: "Chinese" } as Record<string, string>)[normalized] || "English";
}

const SYSTEM = `You are a warm, grounded emotional companion — like a wise older sibling or a seasoned therapist friend. The user has logged their mood daily for the past week or two. Their log is below.

Write a short letter to them, in second person ("you"). Structure:

PARAGRAPH 1 — "This week I notice…": name the pattern you see honestly. Be specific to THEIR entries (reference specific days if useful, specific category shifts, specific notes they wrote). Don't over-dramatize — if it's been a steady week, say so.

PARAGRAPH 2 — "Underneath the pattern…": gently surface what might be moving beneath the surface. Tie it to what they wrote. Never diagnose. Never say "you are X". Say what you see and offer it back.

PARAGRAPH 3 — "As you move into the next week…": one concrete, tiny, do-able practice. Not a lifestyle overhaul. Something they could actually do this week. Then close with a single sentence of genuine care.

Rules:
- 2-4 sentences per paragraph. Total letter ≤ 500 words.
- If their notes mention self-harm or suicidal ideation, acknowledge warmly and direct to 988 / a trusted person. Do NOT try to counsel them on crisis.
- Never moralize. Never use "should".
- Don't be mystical or woo; this is emotional companionship, not divination.
- Output MUST be valid JSON: { "letter": string, "dominantTheme": string (1 short phrase), "careSuggestion": string (1 sentence) }`;

async function callAI(entries: Req["entries"], context: Req["userContext"]): Promise<Resp> {
  const localeLine = context?.locale && context.locale !== "en"
    ? `\n\nIMPORTANT: Respond in ${localeName(context.locale)}. Keep the warm/grounded voice.`
    : "";

  const nameLine = context?.displayName
    ? `\n\nThe person's name is ${context.displayName}. You don't need to use it; just know they're a real person.`
    : "";

  const entryLines = entries
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((e) => {
      const noteStr = e.note ? ` — "${e.note}"` : '';
      return `  ${e.date}: ${e.category} (intensity ${e.intensity}/5)${noteStr}`;
    })
    .join('\n');

  const userPrompt = `${nameLine}${localeLine}\n\nMood log (most recent last):\n${entryLines}\n\nReply with ONLY the JSON object.`;

  const parsed = await callAIJson<Resp>({
    system: SYSTEM,
    userPrompt,
    temperature: 0.75,
    maxOutputTokens: 700,
  });

  if (!parsed.letter || !parsed.dominantTheme || !parsed.careSuggestion) {
    throw new AppError("AI_MALFORMED_RESPONSE", "AI response missing required fields", 502);
  }

  return parsed;
}

Deno.serve(handler<Req, Resp>({
  fn: "ai-mood-letter",
  auth: "optional",
  methods: ["POST"],
  rateLimit: { max: 5, windowMs: 60_000 },
  ai: true,
  requestSchema: RequestSchema,
  run: async (ctx, body) => {
    // Cache by entries + context. Same recent entries = same letter.
    // Short-ish TTL (24h) since users typically log fresh entries daily.
    const entriesKey = JSON.stringify(body.entries);
    const ctxKey = JSON.stringify(body.userContext ?? {});
    const cacheKey = await aiCacheKey("ai-mood-letter", CACHE_MODEL_TAG, entriesKey, ctxKey);
    const cached = await aiCacheGet<Resp>(ctx, cacheKey);
    if (cached) return cached;

    const fresh = await callAI(body.entries, body.userContext);
    await aiCacheStore(ctx, {
      cacheKey,
      model: CACHE_MODEL_TAG,
      fnName: "ai-mood-letter",
      response: fresh,
      ttlDays: 1,
    });
    return fresh;
  },
}));
