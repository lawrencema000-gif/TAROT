import { AppError, handler } from "../_shared/handler.ts";
import { aiCacheGet, aiCacheStore, aiCacheKey } from "../_shared/ai-gate.ts";
import { AI_CHAIN_TAG, callAIJson } from "../_shared/ai-providers.ts";
import { localeInstruction } from "../_shared/locale.ts";
import { waiveForCrisis } from "../_shared/crisis-reply.ts";
import { SYSTEM, moodCrisis, moodCrisisLetter, readLetter, type ModelLetter, type MoodLetter } from "./reply.ts";
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
 *
 * Crisis (p9 QS R-5): notes about self-harm or suicide — read by the shared
 * multilingual detector before the model, or by the model, which answers
 * them with {"crisis": true} — get the app's letter in the member's
 * language with their own helplines (./reply.ts), never a US number from the
 * prompt. That letter is not charged (the charge is given back) and is not
 * cached.
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

type Resp = MoodLetter;

// Tag used for cache key versioning. Provider chain in _shared/ai-providers.ts.
// v3: the prompt no longer carries a US crisis line, and the key is the
// entries, not the prompt — a cached v2 letter (one the model wrote with 988
// in it, say) is not served again.
const CACHE_MODEL_TAG = `${AI_CHAIN_TAG}-mood-v3`;

// The system prompt (SYSTEM) and the crisis letter: ./reply.ts.

async function callAI(entries: Req["entries"], context: Req["userContext"]): Promise<ModelLetter> {
  // Shared per-locale instruction (_shared/locale.ts) closes the system
  // prompt; JSON keys stay English, values follow the user's language.
  const system = `${SYSTEM}\n\n${localeInstruction(context?.locale, { jsonKeys: true, keepVoice: true })}`;

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

  const userPrompt = `${nameLine}\n\nMood log (most recent last):\n${entryLines}\n\nReply with ONLY the JSON object.`;

  const parsed = await callAIJson<unknown>({
    system,
    userPrompt,
    temperature: 0.75,
    maxOutputTokens: 700,
  });

  const answer = readLetter(parsed);
  if (!answer) {
    throw new AppError("AI_MALFORMED_RESPONSE", "AI response missing required fields", 502);
  }
  return answer;
}

Deno.serve(handler<Req, Resp>({
  fn: "ai-mood-letter",
  // Required: the page always has a session, and an anonymous caller used
  // to run the full model free, outside the ceiling and the spend (R2 §5).
  auth: "required",
  methods: ["POST"],
  rateLimit: { max: 5, windowMs: 60_000 },
  ai: true,
  spend: { actionKey: "mood-letter", cost: 50 },
  requestSchema: RequestSchema,
  run: async (ctx, body) => {
    // Notes about self-harm or suicide (the shared multilingual detector):
    // the app's letter with the member's own helplines, before the cache
    // and the model, and not charged.
    if (moodCrisis(body.entries)) {
      await waiveForCrisis(ctx, "ai-mood-letter", "detector");
      return moodCrisisLetter(body.userContext?.locale);
    }

    // Cache by entries + context. Same recent entries = same letter.
    // Short-ish TTL (24h) since users typically log fresh entries daily.
    const entriesKey = JSON.stringify(body.entries);
    const ctxKey = JSON.stringify(body.userContext ?? {});
    const cacheKey = await aiCacheKey("ai-mood-letter", CACHE_MODEL_TAG, entriesKey, ctxKey);
    const cached = await aiCacheGet<Resp>(ctx, cacheKey);
    if (cached) return cached;

    const answer = await callAI(body.entries, body.userContext);
    // The model read a crisis the detector did not: the same letter,
    // uncharged and never cached.
    if (answer.kind === "crisis") {
      await waiveForCrisis(ctx, "ai-mood-letter", "model");
      return moodCrisisLetter(body.userContext?.locale);
    }
    const fresh = answer.letter;
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
