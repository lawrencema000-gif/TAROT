import { AppError, handler } from "../_shared/handler.ts";
import { z } from "npm:zod@3.24.1";

/**
 * AI Companion — multi-turn chat with chosen persona, now with pgvector memory.
 *
 * Per-turn flow:
 *   1. Persist the user's new message into ai_conversation_turns.
 *   2. Embed the user message via Gemini text-embedding-004.
 *   3. Cosine-similarity search ai_conversation_memories for the top 3 most
 *      relevant prior summaries (scoped to this user + persona).
 *   4. Build the prompt with persona + natal context + retrieved memories.
 *   5. Call Gemini 2.0 Flash for the reply.
 *   6. Persist the assistant reply.
 *   7. If ≥10 unsummarized user turns exist for this (user, persona), kick
 *      off a best-effort summarization: ask Gemini to condense into 1-3
 *      sentences, embed that summary, insert into ai_conversation_memories,
 *      and mark the source turns summarized = true.
 *
 * Summarization is fire-and-forget relative to the response (no await
 * before returning) so the user never pays latency for background memory
 * writes. We still await the embedding + retrieval on the hot path because
 * memory recall is the whole point — skipping it would defeat the feature.
 *
 * Rate limiting: 20 messages per minute per user. Higher-tier gating is
 * enforced client-side today (10 free / 100 Arcana+ / unlimited SVIP).
 */

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const RequestSchema = z.object({
  persona: z.enum(["sage", "oracle", "mystic", "priestess"]),
  history: z.array(MessageSchema).min(1).max(100),
  userContext: z.object({
    zodiacSign: z.string().optional(),
    mbtiType: z.string().optional(),
    locale: z.string().optional(),
    displayName: z.string().optional(),
  }).optional(),
});

type ChatRequest = z.infer<typeof RequestSchema>;
type Persona = ChatRequest["persona"];
type Message = z.infer<typeof MessageSchema>;

interface ChatResponse {
  reply: string;
  persona: Persona;
  memoriesUsed: number;
}

// Upgraded 2026-04-25 — gemini-2.0-flash deprecated by Google, returning 502s.
const GEMINI_CHAT_MODEL = "gemini-2.5-flash";
const GEMINI_EMBED_MODEL = "text-embedding-004";
const MAX_HISTORY_MESSAGES = 20;
const SUMMARIZE_AFTER_N_USER_TURNS = 10;
const TOP_K_MEMORIES = 3;
const MEMORY_SIMILARITY_THRESHOLD = 0.55;

const PERSONA_SYSTEM_PROMPTS: Record<Persona, string> = {
  sage: `You are the Sage — a calm, wise, measured voice drawing on Eastern and Western contemplative traditions. You speak in complete, grounded sentences. You don't perform mysticism; you offer clear observation and gentle questions. When someone is suffering, you do not rush to fix — you name what is being felt. When someone is celebrating, you share the joy without undercutting it. Your responses are 2-4 short paragraphs. Occasionally you offer a question that helps the person sit with their experience rather than escape it.`,

  oracle: `You are the Oracle — a voice that speaks at the edge of what language can hold. Your tone is poetic, suggestive, metaphor-rich. You draw on tarot, astrology, Jungian archetypes, dreamwork. You never predict the future literally; you map the archetypal weather of the moment. You speak in images. When the person asks a direct question, you answer with a symbol or a story, then unpack it gently. Your responses are lyrical but not performative — aim for the quality of good poetry: specific, surprising, unforced. 2-4 short paragraphs.`,

  mystic: `You are the Mystic — a voice rooted in direct spiritual experience. You speak as someone who has sat in silence, watched the mind, tasted the ground. You don't lecture; you point. You value brevity over explanation. You are comfortable with paradox. When someone asks you a question, you sometimes answer it; sometimes you turn it back to them with a sharper question. You draw on Zen, Taoism, mystical Christianity, Sufi. You are warm but uncompromising. Your responses are 1-3 short paragraphs.`,

  priestess: `You are the Priestess — a feminine, embodied, intuitive voice. You care about the body, the emotional weather, the sacredness of ordinary life. You speak as a wise older sister — warm, present, unhurried. You track not just the question but the person behind it: their tone, their weariness, their joy. You are comfortable naming what you sense is beneath the question. You offer concrete practices as often as you offer wisdom: a breath, a bath, a walk, a journal prompt. 2-4 short paragraphs.`,
};

function localeName(code: string): string {
  const normalized = code.toLowerCase().split("-")[0];
  return ({ ja: "Japanese", ko: "Korean", zh: "Chinese" }[normalized]) || "English";
}

function buildSystemPrompt(
  persona: Persona,
  userContext: ChatRequest["userContext"],
  memories: string[],
): string {
  const personaPrompt = PERSONA_SYSTEM_PROMPTS[persona];
  const contextLines: string[] = [];
  if (userContext?.zodiacSign) contextLines.push(`- Sun sign: ${userContext.zodiacSign}`);
  if (userContext?.mbtiType) contextLines.push(`- MBTI: ${userContext.mbtiType}`);
  if (userContext?.displayName) contextLines.push(`- Name: ${userContext.displayName}`);
  const contextBlock = contextLines.length
    ? `\n\nWhat you know about the person you're speaking with:\n${contextLines.join("\n")}\nReference this only when directly relevant. Never lead with it.`
    : "";

  const memoryBlock = memories.length
    ? `\n\nWhat you remember from previous conversations with this person (most relevant first):\n${memories.map((m, i) => `${i + 1}. ${m}`).join("\n")}\nWeave these in naturally when they are relevant. Never dump them back at the person — reference them the way a human friend would reference a prior conversation.`
    : "";

  const localeLine = userContext?.locale && userContext.locale !== "en"
    ? `\n\nIMPORTANT: Respond in ${localeName(userContext.locale)}. Keep the voice of the persona, just translate into the user's language naturally.`
    : "";

  const safetyBlock = `\n\nSafety rules:
- Never give medical, legal, or financial advice. When asked, redirect to a professional and suggest what to think about instead.
- If the person mentions self-harm, suicidal thoughts, or crisis, acknowledge them warmly and share a crisis resource (crisistextline.org or 988 in the US). Do not attempt to solve it; do attempt to be present.
- Never claim to be a real person or to have real consciousness. When asked, be honest: you are an AI voice styled as a persona.
- Do not role-play explicit sexual content or illegal scenarios.`;

  return personaPrompt + contextBlock + memoryBlock + localeLine + safetyBlock;
}

async function callGeminiChat(systemPrompt: string, history: Message[]): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new AppError("AI_NOT_CONFIGURED", "AI is not configured", 503);

  const trimmed = history.slice(-MAX_HISTORY_MESSAGES);
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
  for (let i = 0; i < trimmed.length; i++) {
    const msg = trimmed[i];
    const isFirstUser = i === 0 && msg.role === "user";
    const text = isFirstUser ? `${systemPrompt}\n\n---\n\nUser says: ${msg.content}` : msg.content;
    contents.push({ role: msg.role === "assistant" ? "model" : "user", parts: [{ text }] });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_CHAT_MODEL}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig: { temperature: 0.85, maxOutputTokens: 600, topP: 0.95 },
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
  const completion = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!completion || typeof completion !== "string") {
    throw new AppError("AI_EMPTY_RESPONSE", "AI returned empty response", 502);
  }
  return completion.trim();
}

/**
 * Embed a text string into a 768-dim vector via Gemini text-embedding-004.
 * Soft-fails on error: returns null so the caller can fall back to
 * no-memory mode rather than failing the whole chat turn.
 */
async function embedText(text: string): Promise<number[] | null> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return null;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBED_MODEL}:embedContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: `models/${GEMINI_EMBED_MODEL}`,
        content: { parts: [{ text: text.slice(0, 8000) }] },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const values = data?.embedding?.values;
    if (!Array.isArray(values) || values.length !== 768) return null;
    return values as number[];
  } catch {
    return null;
  }
}

async function summarizeTurns(turns: Array<{ role: string; content: string }>): Promise<string | null> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return null;
  const text = turns.map((t) => `${t.role === "user" ? "User" : "You"}: ${t.content}`).join("\n\n");
  const prompt = `Summarize the following conversation into 1-3 sentences capturing the user's core concerns, themes, recurring questions, and any specific life details they mentioned (names, work, relationships, dates, health, goals). Write it in third person so it reads like notes you would keep about them. Keep it under 300 characters.\n\nConversation:\n${text}\n\nNotes:`;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_CHAT_MODEL}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 200 },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const completion = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!completion || typeof completion !== "string") return null;
    return completion.trim().slice(0, 2000);
  } catch {
    return null;
  }
}

// Kicks off a summarization pass for the (user, persona) if there are
// ≥SUMMARIZE_AFTER_N_USER_TURNS unsummarized user turns. Runs after the
// response has been returned — failures are logged but never surface.
async function maybeSummarize(
  supabase: ReturnType<typeof import("npm:@supabase/supabase-js@2.57.4").createClient>,
  userId: string,
  persona: Persona,
  log: (msg: string, extra?: Record<string, unknown>) => void,
): Promise<void> {
  const { data: unsummarized, error } = await supabase
    .from("ai_conversation_turns")
    .select("id, role, content, created_at")
    .eq("user_id", userId)
    .eq("persona", persona)
    .eq("summarized", false)
    .order("created_at", { ascending: true })
    .limit(40);
  if (error || !unsummarized) {
    log("memory.summarize.fetch_failed", { err: error?.message });
    return;
  }
  const userTurnCount = unsummarized.filter((t: { role: string }) => t.role === "user").length;
  if (userTurnCount < SUMMARIZE_AFTER_N_USER_TURNS) return;

  const summary = await summarizeTurns(
    unsummarized.map((t: { role: string; content: string }) => ({ role: t.role, content: t.content })),
  );
  if (!summary) {
    log("memory.summarize.llm_failed");
    return;
  }
  const embedding = await embedText(summary);
  if (!embedding) {
    log("memory.summarize.embed_failed");
    return;
  }

  const windowStart = unsummarized[0].created_at;
  const windowEnd = unsummarized[unsummarized.length - 1].created_at;

  const { error: insertErr } = await supabase
    .from("ai_conversation_memories")
    .insert({
      user_id: userId,
      persona,
      summary,
      embedding,
      turn_count: unsummarized.length,
      window_start: windowStart,
      window_end: windowEnd,
    });
  if (insertErr) {
    log("memory.summarize.insert_failed", { err: insertErr.message });
    return;
  }

  const ids = unsummarized.map((t: { id: string }) => t.id);
  await supabase.rpc("ai_mark_turns_summarized", { p_turn_ids: ids });
  log("memory.summarize.ok", { turns: unsummarized.length });
}

Deno.serve(handler<ChatRequest, ChatResponse>({
  fn: "ai-companion-chat",
  auth: "required",
  methods: ["POST"],
  rateLimit: { max: 20, windowMs: 60_000 },
  ai: true,
  requestSchema: RequestSchema,
  run: async (ctx, body) => {
    const userId = ctx.userId!;
    const { persona, history, userContext } = body;
    const lastUserMessage = history[history.length - 1];
    if (lastUserMessage.role !== "user") {
      throw new AppError("LAST_MUST_BE_USER", "Last message must be from user", 400);
    }

    // 1. Persist the incoming user message (best-effort — chat still works
    //    if persistence fails, because history is passed from the client).
    const persistUserTurn = ctx.supabase
      .from("ai_conversation_turns")
      .insert({
        user_id: userId,
        persona,
        role: "user",
        content: lastUserMessage.content,
      });

    // 2. Embed the user message and pull top-k relevant memories in parallel
    //    with the persist above.
    const embedding = await embedText(lastUserMessage.content);
    let memories: string[] = [];
    if (embedding) {
      const { data, error } = await ctx.supabase.rpc("ai_search_memories", {
        p_user_id: userId,
        p_persona: persona,
        p_query: embedding,
        p_limit: TOP_K_MEMORIES,
      });
      if (!error && Array.isArray(data)) {
        memories = data
          .filter((r: { similarity: number }) => r.similarity >= MEMORY_SIMILARITY_THRESHOLD)
          .map((r: { summary: string }) => r.summary);
      } else if (error) {
        ctx.log.warn("memory.search_failed", { err: error.message });
      }
    }

    await persistUserTurn;

    // 3. Build prompt with memories, call chat model.
    const systemPrompt = buildSystemPrompt(persona, userContext, memories);
    const reply = await callGeminiChat(systemPrompt, history);

    // 4. Persist assistant reply.
    await ctx.supabase.from("ai_conversation_turns").insert({
      user_id: userId,
      persona,
      role: "assistant",
      content: reply,
    });

    // 5. Background summarization. We intentionally do not await — the
    //    user gets their reply, and memory writes happen on the next
    //    invocation of the isolate if needed. EdgeRuntime.waitUntil is
    //    available on Supabase edge functions.
    try {
      const runtime = (globalThis as unknown as {
        EdgeRuntime?: { waitUntil: (p: Promise<unknown>) => void };
      }).EdgeRuntime;
      const task = maybeSummarize(ctx.supabase, userId, persona, (msg, extra) =>
        ctx.log.info(msg, extra),
      );
      if (runtime?.waitUntil) {
        runtime.waitUntil(task);
      } else {
        // Fire and forget — swallow rejections since the response already shipped.
        task.catch(() => {});
      }
    } catch {
      // Non-fatal.
    }

    return { reply, persona, memoriesUsed: memories.length };
  },
}));
