/**
 * AI journal coach — takes a journal entry, returns 2-3 reflective prompts
 * tuned to the entry's content + the user's personality context.
 *
 * Not a therapy tool, not advice. The output is always questions the user
 * can sit with — never prescriptions. An entry about self-harm or suicide
 * (the shared multilingual detector, or the model) gets the crisis reply of
 * reply.ts instead, in the member's language, with that language's
 * helplines, and `crisis: true` (p9 Q32).
 *
 * Rate limit: 30/min. Anonymous for privacy — we accept entry text but do
 * NOT persist the entry content anywhere; only the prompt response is
 * returned and discarded after the user reads it.
 */

import { handler } from "../_shared/handler.ts";
import { aiGate, aiCacheStore, aiCacheKey, throwIfBlocked } from "../_shared/ai-gate.ts";
import { AI_CHAIN_TAG, callAIText } from "../_shared/ai-providers.ts";
import { localeInstruction, normalizeAiLocale } from "../_shared/locale.ts";
import { SYSTEM, crisisShortcut, fallbackPrompts, journalCrisisReply, parseCoachReply, type CoachReply } from "./reply.ts";
import { z } from "npm:zod@3.24.1";

// Tag used for cache key versioning. Provider chain in _shared/ai-providers.ts.
// v3: the prompt no longer carries the US crisis lines, so a cached v2 reply
// (one the model wrote with 988 in it, say) is not served again.
const CACHE_MODEL_TAG = `${AI_CHAIN_TAG}-journal-v3`;

const RequestSchema = z.object({
  entry: z.string().min(10).max(6000),
  userContext: z.object({
    mbtiType: z.string().optional(),
    enneagramType: z.number().optional(),
    locale: z.string().optional(),
  }).optional(),
});
type Req = z.infer<typeof RequestSchema>;

type Resp = CoachReply;

Deno.serve(handler<Req, Resp>({
  fn: "ai-journal-coach",
  auth: "required",
  methods: ["POST"],
  rateLimit: { max: 30, windowMs: 60_000 },
  // No `ai: true`: the AI gate runs inside, after the crisis shortcut, so an
  // entry about self-harm gets the helplines even while AI is paused or the
  // member is over the daily ceiling (that reply calls no model).
  requestSchema: RequestSchema,
  run: async (ctx, body) => {
    const { entry, userContext } = body;
    const locale = normalizeAiLocale(userContext?.locale);

    // Crisis shortcut — don't even invoke the model. The shared detector
    // reads en/ja/ko/zh; the reply gives the member's own lines.
    const shortcut = crisisShortcut(entry, locale);
    if (shortcut) return shortcut;

    const ctxLines: string[] = [];
    if (userContext?.mbtiType) ctxLines.push(`MBTI: ${userContext.mbtiType}`);
    if (userContext?.enneagramType) ctxLines.push(`Enneagram: ${userContext.enneagramType}`);
    // Shared per-locale instruction (_shared/locale.ts); JSON keys stay English.
    const localeLine = localeInstruction(userContext?.locale, { jsonKeys: true });

    const userPromptParts = [
      ctxLines.length ? `User signals: ${ctxLines.join(", ")}` : "",
      localeLine,
      `Entry:\n---\n${entry}\n---`,
    ].filter(Boolean).join("\n\n");

    // Cache by full prompt — same entry + same context = same coach reply.
    // The AI gate (killswitch + daily ceiling, then the cache) — what
    // `ai: true` ran before `run`, now after the crisis shortcut.
    const cacheKey = await aiCacheKey("ai-journal-coach", CACHE_MODEL_TAG, userPromptParts);
    const gate = await aiGate<CoachReply>(ctx, { userId: ctx.userId, cacheKey });
    throwIfBlocked(gate);
    if (gate.cached) return gate.response;

    // We use callAIText (not callAIJson) so that if the model returns a
    // freeform answer instead of strict JSON we can still soft-fall-back
    // below to {observation, prompts} via parseCoachReply.
    const raw = await callAIText({
      system: SYSTEM,
      history: [{ role: "user", content: userPromptParts }],
      temperature: 0.6,
      maxOutputTokens: 500,
    });
    const parsed = parseCoachReply(raw);
    // The model read self-harm the detector did not: the same crisis reply
    // (not cached — it is rebuilt from the lines every time).
    if (parsed?.kind === "crisis") return journalCrisisReply(locale);
    if (!parsed) {
      // fall back: treat the whole thing as an observation
      return { observation: raw.slice(0, 400), prompts: fallbackPrompts(locale) };
    }
    // Store fresh result in cache for future identical-prompt requests.
    await aiCacheStore(ctx, {
      cacheKey,
      model: CACHE_MODEL_TAG,
      fnName: "ai-journal-coach",
      response: parsed.reply,
    });
    return parsed.reply;
  },
}));
