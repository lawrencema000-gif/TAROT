import { AppError, handler } from "../_shared/handler.ts";
import { aiGate, aiCacheStore, aiCacheKey } from "../_shared/ai-gate.ts";
import { callAIJson } from "../_shared/ai-providers.ts";
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

interface Symbol {
  text: string;
  meaning: string;
  reflection: string;
}

interface Resp {
  coreTheme: string;
  emotionalTone: string;
  archetypes: string[];
  symbols: Symbol[];
  shadowPrompt: string;
  integrationSuggestion: string;
  compensatoryMove?: string;
}

// Tag used for cache key versioning. Provider chain in _shared/ai-providers.ts.
const CACHE_MODEL_TAG = "openai-gpt-4o-mini-or-gemini-2.5-flash";

function localeName(code: string): string {
  const normalized = code.toLowerCase().split("-")[0];
  return ({ ja: "Japanese", ko: "Korean", zh: "Chinese" } as Record<string, string>)[normalized] || "English";
}

const SYSTEM = `You are a Jungian dream interpreter. The user will describe a dream they had. Your job is NOT to predict the future or tell them what will happen. Your job is to:

1. Identify the CORE THEME — what the dream is pointing at psychologically. One tight paragraph (2-3 sentences).
2. Name the EMOTIONAL TONE in one evocative phrase (e.g. "longing wrapped in fear", "quiet grief settling", "manic upward energy").
3. List the primary ARCHETYPES at work — 2 to 4 Jungian / universal archetypes. Use SPECIFIC named archetypes from this canonical list when they fit, rather than generic descriptions:
   - The Shadow (rejected / unintegrated parts of self)
   - The Anima (inner feminine in a male psyche)
   - The Animus (inner masculine in a female psyche)
   - The Persona (the social mask)
   - The Self (the integrated whole, often as wise figure / mandala / sacred animal)
   - The Wise Old Man (Senex)
   - The Wise Old Woman (Crone)
   - The Great Mother (nurturing or devouring)
   - The Father / Patriarch
   - The Puer Aeternus (eternal youth, refusal to age)
   - The Puella Aeterna (eternal girl)
   - The Trickster
   - The Hero (and the call to adventure)
   - The Threshold Guardian
   - The Mentor
   - The Innocent / Divine Child
   - The Lover
   - The Seeker / Wanderer
   - The Magician
   - The Outlaw / Rebel

4. Pull out 2 to 5 key SYMBOLS the dreamer described verbatim. For each: (a) what the dream was, (b) its archetypal meaning in 1-2 sentences, (c) a single reflection question the dreamer can sit with.
5. Name a SHADOW PROMPT — one piercing question that invites the dreamer to look at what the dream is showing them that they might be avoiding in waking life.
6. Offer an INTEGRATION SUGGESTION — one concrete practice (journal, walk, conversation, ritual) they can do this week to metabolise the dream.
7. Identify the COMPENSATORY MOVE — Jung said dreams compensate for what consciousness lacks. Name in one sentence what the dreamer's waking attitude is missing that this dream is offering.

Rules:
- Do NOT predict events. Dreams don't predict; they process.
- Write with poetic precision, not florid mysticism. Each sentence should earn its place.
- Do NOT moralise or give advice. Offer questions and observations.
- If the dream contains references to self-harm or suicidal ideation, gently acknowledge and include in the integrationSuggestion a suggestion to reach out (988 in the US, or a trusted person/therapist).
- Output MUST be valid JSON matching the schema. No markdown, no preamble.

Schema:
{
  "coreTheme": string,
  "emotionalTone": string,
  "archetypes": string[] (2-4),
  "symbols": [ { "text": string, "meaning": string, "reflection": string } ] (2-5),
  "shadowPrompt": string,
  "integrationSuggestion": string,
  "compensatoryMove": string
}`;

async function callAI(dreamText: string, context: Req["userContext"]): Promise<Resp> {
  const localeLine = context?.locale && context.locale !== "en"
    ? `\n\nIMPORTANT: Respond in ${localeName(context.locale)}. Keep the Jungian voice; just translate naturally.`
    : "";

  const ctxLines: string[] = [];
  if (context?.zodiacSign) ctxLines.push(`- Sun sign: ${context.zodiacSign}`);
  if (context?.mbtiType) ctxLines.push(`- MBTI: ${context.mbtiType}`);
  const ctxBlock = ctxLines.length
    ? `\n\nContextual notes on the dreamer (use sparingly, do NOT lead with it):\n${ctxLines.join("\n")}`
    : "";

  const userPrompt = `${ctxBlock}\n\nDream:\n${dreamText}\n\nReply with ONLY the JSON object matching the schema, nothing else.${localeLine}`;

  const parsed = await callAIJson<Resp>({
    system: SYSTEM,
    userPrompt,
    temperature: 0.7,
    maxOutputTokens: 900,
  });

  // Minimal shape validation — if required fields are missing, reject so
  // the client falls back to its local dictionary rather than displaying
  // a broken reading.
  if (
    !parsed.coreTheme ||
    !parsed.emotionalTone ||
    !Array.isArray(parsed.archetypes) ||
    !Array.isArray(parsed.symbols) ||
    parsed.symbols.length === 0 ||
    !parsed.shadowPrompt ||
    !parsed.integrationSuggestion
  ) {
    throw new AppError("AI_MALFORMED_RESPONSE", "AI response missing required fields", 502);
  }

  return parsed;
}

Deno.serve(handler<Req, Resp>({
  fn: "ai-dream-interpret",
  auth: "optional",
  methods: ["POST"],
  rateLimit: { max: 10, windowMs: 60_000 },
  ai: true,
  requestSchema: RequestSchema,
  run: async (ctx, body) => {
    // Build a deterministic cache key from the inputs that affect the
    // response. Locale + dream text are the only shape-affecting bits;
    // zodiacSign / mbti are tonal so we hash them in too. Same dream from
    // the same archetype gets the same cached interpretation.
    const ctxKey = [
      body.userContext?.locale ?? "en",
      body.userContext?.zodiacSign ?? "",
      body.userContext?.mbtiType ?? "",
    ].join("|");
    const key = await aiCacheKey("ai-dream-interpret", CACHE_MODEL_TAG, body.dreamText.trim(), ctxKey);

    const gate = await aiGate<Resp>(ctx, { userId: ctx.userId, cacheKey: key });
    if (gate.allowed === false) throw new AppError(gate.reason, gate.message, gate.status);
    if (gate.cached) return gate.response;

    const fresh = await callAI(body.dreamText, body.userContext);
    await aiCacheStore(ctx, { cacheKey: key, model: CACHE_MODEL_TAG, fnName: "ai-dream-interpret", response: fresh });
    return fresh;
  },
}));
