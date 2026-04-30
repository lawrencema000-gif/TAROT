/**
 * AI "3-second reading" — user asks a question, gets an instant
 * personalized reading grounded in their birth chart + personality signals.
 *
 * Per INCREMENTAL-ROADMAP.md Sprint 8 sub-feature: small, safe, high-value.
 * Does NOT invoke a full chat transcript. Single-shot prompt with persona +
 * user signals. Optionally pulls top-1 memory from pgvector (from the
 * existing ai_conversation_memories table) if the question references
 * something we've seen before.
 *
 * Rate limit: 20/min to keep API cost in check. Client gates further by
 * tier (5 free / 50 Arcana+ / unlimited SVIP).
 */

import { handler } from "../_shared/handler.ts";
import { aiCacheGet, aiCacheStore, aiCacheKey } from "../_shared/ai-gate.ts";
import { callAIText, embedText } from "../_shared/ai-providers.ts";
import { z } from "npm:zod@3.24.1";

// Cache key version — bump when prompt/model semantics change.
const CACHE_MODEL_TAG = "openai-gpt-5-or-gemini-2.5-flash";

const RequestSchema = z.object({
  question: z.string().min(3).max(500),
  userContext: z.object({
    zodiacSign: z.string().optional(),
    moonSign: z.string().optional(),
    risingSign: z.string().optional(),
    mbtiType: z.string().optional(),
    locale: z.string().optional(),
    displayName: z.string().optional(),
  }).optional(),
});
type Req = z.infer<typeof RequestSchema>;

interface Resp {
  reading: string;
  card?: { name: string; meaning: string };
  memoryUsed: boolean;
}

// Mini tarot deck for the inline card pull — just enough to seed a reading.
// Full deck lives in the app; this subset is major arcana names + terse
// meanings curated for the "3-second" voice.
const MAJOR: { name: string; meaning: string }[] = [
  { name: "The Fool",              meaning: "A beginning. Step toward the unknown with a lightness that is its own protection." },
  { name: "The Magician",          meaning: "You already have the tools. The question is whether you focus them." },
  { name: "The High Priestess",    meaning: "Listen inward before outward. The answer is under the noise, not above it." },
  { name: "The Empress",           meaning: "A fertile, generative moment. Create — make something that nourishes." },
  { name: "The Emperor",           meaning: "Structure. Claim authority over your own life, gently and decisively." },
  { name: "The Hierophant",        meaning: "Tradition has something to teach you here. Receive before you revise." },
  { name: "The Lovers",            meaning: "A choice of values. Align the decision with what you actually care about." },
  { name: "The Chariot",           meaning: "Forward motion is possible — if you hold both reins. Discipline equals direction." },
  { name: "Strength",              meaning: "Soft power. The courage to be gentle with what is hurting, including in you." },
  { name: "The Hermit",            meaning: "Withdraw briefly. The clarity you need is in the silence." },
  { name: "Wheel of Fortune",      meaning: "Cycles turn. Respond to the new chapter, do not fight the old one's ending." },
  { name: "Justice",               meaning: "What has been unbalanced is being balanced. Consequences arrive honestly." },
  { name: "The Hanged Man",        meaning: "A reframe. Suspension is data; ask what perspective is being offered." },
  { name: "Death",                 meaning: "An ending that makes room. Grieve it, then let it go." },
  { name: "Temperance",            meaning: "Blend. The answer is neither extreme — it is the calibrated middle." },
  { name: "The Devil",             meaning: "A compulsion or attachment you can name. Naming it loosens its grip." },
  { name: "The Tower",             meaning: "Something cracks open. The destruction reveals what should not have been built." },
  { name: "The Star",              meaning: "After the rupture, the calm. Hope, slowly returning." },
  { name: "The Moon",              meaning: "Ambiguity. Do not force certainty yet; trust the night to reveal what it will." },
  { name: "The Sun",               meaning: "Clarity, joy, visibility. Let yourself be seen." },
  { name: "Judgement",             meaning: "A call. Answer it with full breath — it's been waiting for you." },
  { name: "The World",             meaning: "A cycle completes. Integrate what you learned before the next begins." },
];

function pickCard(seed: string): typeof MAJOR[number] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return MAJOR[h % MAJOR.length];
}

const SYSTEM = `You are a calm, grounded oracle voice. You are NOT performing mysticism — you are offering a clear, specific reading that gives the person language for what they're navigating. Your response:
- 2 short paragraphs, max 120 words total
- Weave in the card, the person's sun/moon/rising signs if present, and their MBTI if relevant
- Never predict the future literally
- End with a single question that helps them sit with the situation
- If the question is about self-harm, crisis, medical, legal, or financial decisions: acknowledge warmly, redirect to a professional, share 988 / crisistextline.org if crisis`;

async function callAI(systemAndPrompt: string): Promise<string> {
  // The original prompt bundles SYSTEM + card + context + question into one
  // string. We split system out so OpenAI can use a proper `system` role.
  // The quick-reading prompt format is preserved by treating the whole
  // string as system context and asking for the freeform answer in the
  // user turn.
  return callAIText({
    system: SYSTEM,
    history: [{ role: "user", content: systemAndPrompt }],
    temperature: 0.8,
    maxOutputTokens: 400,
  });
}

Deno.serve(handler<Req, Resp>({
  fn: "ai-quick-reading",
  auth: "required",
  methods: ["POST"],
  rateLimit: { max: 20, windowMs: 60_000 },
  ai: true,
  requestSchema: RequestSchema,
  run: async (ctx, body) => {
    const { question, userContext } = body;
    const userId = ctx.userId!;

    const card = pickCard(`${userId}:${new Date().toISOString().slice(0, 10)}:${question}`);

    // Try to pull one relevant memory (across any persona) for continuity.
    let memory: string | null = null;
    const v = await embedText(question);
    if (v) {
      const { data: rows } = await ctx.supabase.rpc("ai_search_memories", {
        p_user_id: userId,
        p_persona: "oracle", // default lens for quick readings
        p_query: v,
        p_limit: 1,
      });
      if (Array.isArray(rows) && rows.length > 0) {
        const r = rows[0] as { summary?: string; similarity?: number };
        if (r.summary && (r.similarity ?? 0) >= 0.6) memory = r.summary;
      }
    }

    const contextLines: string[] = [];
    if (userContext?.zodiacSign)  contextLines.push(`Sun ${userContext.zodiacSign}`);
    if (userContext?.moonSign)    contextLines.push(`Moon ${userContext.moonSign}`);
    if (userContext?.risingSign)  contextLines.push(`Rising ${userContext.risingSign}`);
    if (userContext?.mbtiType)    contextLines.push(`MBTI ${userContext.mbtiType}`);

    const prompt = [
      `Card drawn: ${card.name} — ${card.meaning}`,
      contextLines.length ? `About the person: ${contextLines.join(", ")}` : "",
      memory ? `Something you remember about them: ${memory}` : "",
      userContext?.locale && userContext.locale !== "en"
        ? `Respond in ${({ ja: "Japanese", ko: "Korean", zh: "Chinese" } as Record<string, string>)[userContext.locale.slice(0, 2)] || "English"}.`
        : "",
      "",
      `Their question: "${question}"`,
    ].filter(Boolean).join("\n");

    // Cache by full prompt — identical prompt = identical response.
    // Same-question, same-day, same-user-context cases hit the cache and
    // skip the AI call. 7-day TTL is fine because the daily card draw
    // changes the prompt naturally on day boundaries.
    const cacheKey = await aiCacheKey("ai-quick-reading", CACHE_MODEL_TAG, prompt);
    const cached = await aiCacheGet<Resp>(ctx, cacheKey);
    if (cached) return cached;

    const reading = await callAI(prompt);
    const response: Resp = {
      reading,
      card: { name: card.name, meaning: card.meaning },
      memoryUsed: !!memory,
    };
    await aiCacheStore(ctx, {
      cacheKey,
      model: CACHE_MODEL_TAG,
      fnName: "ai-quick-reading",
      response,
    });
    return response;
  },
}));
