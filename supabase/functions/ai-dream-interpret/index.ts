import { AppError, handler } from "../_shared/handler.ts";
import { aiCacheGet, aiCacheStore, aiCacheKey } from "../_shared/ai-gate.ts";
import { AI_CHAIN_TAG, callAIJson } from "../_shared/ai-providers.ts";
import { waiveForCrisis } from "../_shared/crisis-reply.ts";
import { buildSystem, dreamCrisis, dreamCrisisReading, readDream, type DreamReading, type ModelDream } from "./reply.ts";
import { z } from "npm:zod@3.24.1";

/**
 * AI Dream Interpreter.
 *
 * Replaces the client-side 30-symbol keyword dictionary as the primary
 * interpretation path. The local dictionary remains in place as an
 * offline fallback when this function is unreachable.
 *
 * Input: free-form dream text. Optional userContext (sign / MBTI /
 * locale) for tonal alignment.
 * Output: a rich structured reading — coreTheme paragraph, emotional
 * tone, 2-5 symbols with meanings + reflections, a shadow prompt, an
 * integration suggestion. Designed to feel like a thoughtful Jungian
 * read, not a psychic prediction.
 *
 * Rate limit: 10/min per user.
 *
 * Crisis (p9 QZ-1): a dream told with self-harm or suicide in it — read by
 * the shared multilingual detector before anything else, or by the model,
 * which answers it with {"crisis": true} — gets the app's reading in the
 * member's language with their own helplines (./reply.ts), never "988 in the
 * US" from the prompt. That reading is not charged (the charge is given back)
 * and is not cached.
 */

const RequestSchema = z.object({
  dreamText: z.string().min(20).max(4000),
  userContext: z.object({
    zodiacSign: z.string().optional(),
    mbtiType: z.string().optional(),
    locale: z.string().optional(),
  }).optional(),
});

type Req = z.infer<typeof RequestSchema>;

type Resp = DreamReading;

// Tag used for cache key versioning. Provider chain in _shared/ai-providers.ts.
// v3: the prompt no longer carries a US crisis line, and the key is the
// dream, not the prompt — a cached v2 reading (one the model wrote with 988
// in its integration practice, say) is not served again.
const CACHE_MODEL_TAG = `${AI_CHAIN_TAG}-dream-v3`;

// The system prompt (SYSTEM) and the crisis reading: ./reply.ts.

async function callAI(dreamText: string, context: Req["userContext"]): Promise<ModelDream> {
  const system = buildSystem(context?.locale);

  const ctxLines: string[] = [];
  if (context?.zodiacSign) ctxLines.push(`- Sun sign: ${context.zodiacSign}`);
  if (context?.mbtiType) ctxLines.push(`- MBTI: ${context.mbtiType}`);
  const ctxBlock = ctxLines.length
    ? `\n\nContextual notes on the dreamer (use sparingly, do NOT lead with it):\n${ctxLines.join("\n")}`
    : "";

  const userPrompt = `${ctxBlock}\n\nDream:\n${dreamText}\n\nReply with ONLY the JSON object matching the schema, nothing else.`;

  const parsed = await callAIJson<unknown>({
    system,
    userPrompt,
    temperature: 0.7,
    maxOutputTokens: 900,
  });

  // Minimal shape validation — if required fields are missing, reject so
  // the client falls back to its local dictionary rather than displaying
  // a broken reading.
  const answer = readDream(parsed);
  if (!answer) {
    throw new AppError("AI_MALFORMED_RESPONSE", "AI response missing required fields", 502);
  }
  return answer;
}

Deno.serve(handler<Req, Resp>({
  fn: "ai-dream-interpret",
  // Required: the page always has a session, and an anonymous caller used
  // to run the full model free, outside the ceiling and the spend (R2 §5).
  auth: "required",
  methods: ["POST"],
  rateLimit: { max: 10, windowMs: 60_000 },
  // The killswitch and the daily ceiling run here, once. (The function used
  // to call aiGate() as well, which ran them again and counted every dream
  // twice against the member's daily AI ceiling.)
  ai: true,
  spend: { actionKey: "dream-interpret", cost: 50 },
  requestSchema: RequestSchema,
  run: async (ctx, body) => {
    const locale = body.userContext?.locale;

    // A dream told with self-harm or suicide in it (the shared multilingual
    // detector): the app's reading with the member's own helplines, before
    // the cache and the model, and not charged.
    if (dreamCrisis(body.dreamText)) {
      await waiveForCrisis(ctx, "ai-dream-interpret", "detector");
      return dreamCrisisReading(locale);
    }

    // Build a deterministic cache key from the inputs that affect the
    // response. Locale + dream text are the only shape-affecting bits;
    // zodiacSign / mbti are tonal so we hash them in too. Same dream from
    // the same archetype gets the same cached interpretation.
    const ctxKey = [
      locale ?? "en",
      body.userContext?.zodiacSign ?? "",
      body.userContext?.mbtiType ?? "",
    ].join("|");
    const key = await aiCacheKey("ai-dream-interpret", CACHE_MODEL_TAG, body.dreamText.trim(), ctxKey);
    const cached = await aiCacheGet<Resp>(ctx, key);
    if (cached) return cached;

    const answer = await callAI(body.dreamText, body.userContext);
    // The model read a crisis the detector did not: the same reading,
    // uncharged and never cached.
    if (answer.kind === "crisis") {
      await waiveForCrisis(ctx, "ai-dream-interpret", "model");
      return dreamCrisisReading(locale);
    }
    const fresh = answer.dream;
    await aiCacheStore(ctx, { cacheKey: key, model: CACHE_MODEL_TAG, fnName: "ai-dream-interpret", response: fresh });
    return fresh;
  },
}));
