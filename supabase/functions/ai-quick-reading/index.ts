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

import { AppError, handler } from "../_shared/handler.ts";
import { z } from "npm:zod@3.24.1";

const GEMINI_CHAT_MODEL = "gemini-2.0-flash";
const GEMINI_EMBED_MODEL = "text-embedding-004";

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

async function callGemini(prompt: string): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new AppError("AI_NOT_CONFIGURED", "AI is not configured", 503);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_CHAT_MODEL}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.8, maxOutputTokens: 400, topP: 0.95 },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
      ],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new AppError("AI_REQUEST_FAILED", `AI request failed: ${text.slice(0, 300)}`, 502);
  }
  const data = await res.json();
  const out = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!out || typeof out !== "string") throw new AppError("AI_EMPTY_RESPONSE", "AI returned empty response", 502);
  return out.trim();
}

async function embed(text: string): Promise<number[] | null> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return null;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBED_MODEL}:embedContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: `models/${GEMINI_EMBED_MODEL}`,
        content: { parts: [{ text: text.slice(0, 4000) }] },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const v = data?.embedding?.values;
    return Array.isArray(v) && v.length === 768 ? v : null;
  } catch {
    return null;
  }
}

export default handler<Req, Resp>({
  fn: "ai-quick-reading",
  auth: "required",
  methods: ["POST"],
  rateLimit: { max: 20, windowMs: 60_000 },
  requestSchema: RequestSchema,
  run: async (ctx, body) => {
    const { question, userContext } = body;
    const userId = ctx.userId!;

    const card = pickCard(`${userId}:${new Date().toISOString().slice(0, 10)}:${question}`);

    // Try to pull one relevant memory (across any persona) for continuity.
    let memory: string | null = null;
    const v = await embed(question);
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
      SYSTEM,
      "",
      `Card drawn: ${card.name} — ${card.meaning}`,
      contextLines.length ? `About the person: ${contextLines.join(", ")}` : "",
      memory ? `Something you remember about them: ${memory}` : "",
      userContext?.locale && userContext.locale !== "en"
        ? `Respond in ${({ ja: "Japanese", ko: "Korean", zh: "Chinese" } as Record<string, string>)[userContext.locale.slice(0, 2)] || "English"}.`
        : "",
      "",
      `Their question: "${question}"`,
    ].filter(Boolean).join("\n");

    const reading = await callGemini(prompt);

    return {
      reading,
      card: { name: card.name, meaning: card.meaning },
      memoryUsed: !!memory,
    };
  },
});
