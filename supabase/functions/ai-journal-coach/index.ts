/**
 * AI journal coach — takes a journal entry, returns 2-3 reflective prompts
 * tuned to the entry's content + the user's personality context.
 *
 * Not a therapy tool, not advice. The output is always questions the user
 * can sit with — never prescriptions. Safety routing on crisis keywords
 * is the same as the other AI surfaces.
 *
 * Rate limit: 30/min. Anonymous for privacy — we accept entry text but do
 * NOT persist the entry content anywhere; only the prompt response is
 * returned and discarded after the user reads it.
 */

import { handler } from "../_shared/handler.ts";
import { aiCacheGet, aiCacheStore, aiCacheKey } from "../_shared/ai-gate.ts";
import { callAIText } from "../_shared/ai-providers.ts";
import { z } from "npm:zod@3.24.1";

// Tag used for cache key versioning. Provider chain in _shared/ai-providers.ts.
const CACHE_MODEL_TAG = "openai-gpt-4o-mini-or-gemini-2.5-flash";

const RequestSchema = z.object({
  entry: z.string().min(10).max(6000),
  userContext: z.object({
    mbtiType: z.string().optional(),
    enneagramType: z.number().optional(),
    locale: z.string().optional(),
  }).optional(),
});
type Req = z.infer<typeof RequestSchema>;

interface Resp {
  prompts: string[];
  observation: string;
}

const CRISIS_REGEX = /\b(kill\s*(my|your)self|suicide|end\s*(my|it)\s*(life|all)|self\s*harm|better\s+off\s+dead|want\s+to\s+die)\b/i;

const SYSTEM = `You are a warm, experienced journaling coach. The user has just written an entry. Your job:
- NOT to give advice, fix anything, or interpret what you're reading.
- Respond with:
  1. One short observation (≤30 words) — what you notice underneath the entry.
  2. 2-3 reflective questions that help them go deeper. Not yes/no. Specific to what they wrote.
- Tone: grounded, kind, not saccharine. Never use emoji. Never start with "I hear you" or other filler.
- Return JSON with exactly this shape: {"observation": "...", "prompts": ["...", "..."]}

If the entry contains self-harm or suicidal ideation, return:
{"observation": "What you've written is serious, and you do not have to carry it alone.", "prompts": ["Would you be willing to reach out to 988 (US Suicide & Crisis Lifeline) or text HOME to 741741?", "Who is one person who loves you that you could call right now?"]}`;

function safeParseJson(s: string): { observation: string; prompts: string[] } | null {
  try {
    const o = JSON.parse(s);
    if (typeof o?.observation === "string" && Array.isArray(o?.prompts)) {
      return {
        observation: o.observation.slice(0, 400),
        prompts: (o.prompts as unknown[])
          .filter((p): p is string => typeof p === "string" && p.length > 0)
          .slice(0, 3)
          .map((p) => p.slice(0, 300)),
      };
    }
  } catch {
    // fall through
  }
  return null;
}

Deno.serve(handler<Req, Resp>({
  fn: "ai-journal-coach",
  auth: "required",
  methods: ["POST"],
  rateLimit: { max: 30, windowMs: 60_000 },
  ai: true,
  requestSchema: RequestSchema,
  run: async (ctx, body) => {
    const { entry, userContext } = body;

    // Crisis shortcut — don't even invoke the model.
    if (CRISIS_REGEX.test(entry)) {
      return {
        observation:
          "What you've written is serious, and you do not have to carry it alone.",
        prompts: [
          "Would you be willing to reach out to 988 (US Suicide & Crisis Lifeline) or text HOME to 741741 (Crisis Text Line, US/UK/CA/IE)?",
          "Who is one person who loves you that you could call or text right now?",
          "What is one small act of self-care you could do in the next hour?",
        ],
      };
    }

    const ctxLines: string[] = [];
    if (userContext?.mbtiType) ctxLines.push(`MBTI: ${userContext.mbtiType}`);
    if (userContext?.enneagramType) ctxLines.push(`Enneagram: ${userContext.enneagramType}`);
    const localeLine = userContext?.locale && userContext.locale !== "en"
      ? `Respond in ${({ ja: "Japanese", ko: "Korean", zh: "Chinese" } as Record<string, string>)[userContext.locale.slice(0, 2)] || "English"}. JSON keys must stay in English.`
      : "";

    const userPromptParts = [
      ctxLines.length ? `User signals: ${ctxLines.join(", ")}` : "",
      localeLine,
      `Entry:\n---\n${entry}\n---`,
    ].filter(Boolean).join("\n\n");

    // Cache by full prompt — same entry + same context = same coach reply.
    const cacheKey = await aiCacheKey("ai-journal-coach", CACHE_MODEL_TAG, userPromptParts);
    const cachedResponse = await aiCacheGet<{ observation: string; prompts: string[] }>(ctx, cacheKey);
    if (cachedResponse) return cachedResponse;

    // We use callAIText (not callAIJson) so that if the model returns a
    // freeform answer instead of strict JSON we can still soft-fall-back
    // below to {observation, prompts} via safeParseJson.
    const raw = await callAIText({
      system: SYSTEM,
      history: [{ role: "user", content: userPromptParts }],
      temperature: 0.6,
      maxOutputTokens: 500,
    });
    const parsed = safeParseJson(raw);
    if (!parsed) {
      // fall back: treat the whole thing as an observation
      return {
        observation: raw.slice(0, 400),
        prompts: [
          "What in this entry surprises you when you read it back?",
          "Where is the next edge of honesty in what you wrote?",
        ],
      };
    }
    // Store fresh result in cache for future identical-prompt requests.
    await aiCacheStore(ctx, {
      cacheKey,
      model: CACHE_MODEL_TAG,
      fnName: "ai-journal-coach",
      response: parsed,
    });
    return parsed;
  },
}));
