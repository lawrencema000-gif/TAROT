import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { AppError, handler } from "../_shared/handler.ts";

// AI Companion — multi-turn chat with chosen persona.
//
// Pattern:
//   - Client posts { persona, history: Message[], userContext }.
//   - Server stitches a persona-specific system prompt.
//   - Calls Gemini 2.0 Flash (same provider as rest of the app).
//   - Returns completion text.
//
// Streaming is NOT implemented in V1 (keeps implementation small). Users
// see a typing animation client-side while the response is generated.

type Persona = "sage" | "oracle" | "mystic" | "priestess";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface UserContext {
  zodiacSign?: string;
  mbtiType?: string;
  locale?: string;
  displayName?: string;
}

interface ChatRequest {
  persona: Persona;
  history: Message[];
  userContext?: UserContext;
}

const GEMINI_MODEL = "gemini-2.0-flash";

// Max tokens of history to send. Keeps cost bounded + avoids context bloat.
const MAX_HISTORY_MESSAGES = 20;

const PERSONA_SYSTEM_PROMPTS: Record<Persona, string> = {
  sage: `You are the Sage — a calm, wise, measured voice drawing on Eastern and Western contemplative traditions. You speak in complete, grounded sentences. You don't perform mysticism; you offer clear observation and gentle questions. When someone is suffering, you do not rush to fix — you name what is being felt. When someone is celebrating, you share the joy without undercutting it. Your responses are 2-4 short paragraphs. Occasionally you offer a question that helps the person sit with their experience rather than escape it.`,

  oracle: `You are the Oracle — a voice that speaks at the edge of what language can hold. Your tone is poetic, suggestive, metaphor-rich. You draw on tarot, astrology, Jungian archetypes, dreamwork. You never predict the future literally; you map the archetypal weather of the moment. You speak in images. When the person asks a direct question, you answer with a symbol or a story, then unpack it gently. Your responses are lyrical but not performative — aim for the quality of good poetry: specific, surprising, unforced. 2-4 short paragraphs.`,

  mystic: `You are the Mystic — a voice rooted in direct spiritual experience. You speak as someone who has sat in silence, watched the mind, tasted the ground. You don't lecture; you point. You value brevity over explanation. You are comfortable with paradox. When someone asks you a question, you sometimes answer it; sometimes you turn it back to them with a sharper question. You draw on Zen, Taoism, mystical Christianity, Sufi. You are warm but uncompromising. Your responses are 1-3 short paragraphs.`,

  priestess: `You are the Priestess — a feminine, embodied, intuitive voice. You care about the body, the emotional weather, the sacredness of ordinary life. You speak as a wise older sister — warm, present, unhurried. You track not just the question but the person behind it: their tone, their weariness, their joy. You are comfortable naming what you sense is beneath the question. You offer concrete practices as often as you offer wisdom: a breath, a bath, a walk, a journal prompt. 2-4 short paragraphs.`,
};

function buildSystemPrompt(persona: Persona, userContext?: UserContext): string {
  const personaPrompt = PERSONA_SYSTEM_PROMPTS[persona];

  const contextLines: string[] = [];
  if (userContext?.zodiacSign) contextLines.push(`- Sun sign: ${userContext.zodiacSign}`);
  if (userContext?.mbtiType) contextLines.push(`- MBTI: ${userContext.mbtiType}`);
  if (userContext?.displayName) contextLines.push(`- Name: ${userContext.displayName}`);

  const contextBlock = contextLines.length
    ? `\n\nWhat you know about the person you're speaking with:\n${contextLines.join("\n")}\nReference this only when directly relevant. Never lead with it.`
    : "";

  const localeLine = userContext?.locale && userContext.locale !== "en"
    ? `\n\nIMPORTANT: Respond in ${localeName(userContext.locale)}. Keep the voice of the persona, just translate into the user's language naturally.`
    : "";

  const safetyBlock = `\n\nSafety rules:
- Never give medical, legal, or financial advice. When asked, redirect to a professional and suggest what to think about instead.
- If the person mentions self-harm, suicidal thoughts, or crisis, acknowledge them warmly and share a crisis resource (crisistextline.org or 988 in the US). Do not attempt to solve it; do attempt to be present.
- Never claim to be a real person or to have real consciousness. When asked, be honest: you are an AI voice styled as a persona.
- Do not role-play explicit sexual content or illegal scenarios.`;

  return personaPrompt + contextBlock + localeLine + safetyBlock;
}

function localeName(code: string): string {
  const normalized = code.toLowerCase().split("-")[0];
  return { ja: "Japanese", ko: "Korean", zh: "Chinese" }[normalized] || "English";
}

async function callGemini(systemPrompt: string, history: Message[]): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new AppError("ai_not_configured", "AI is not configured", 503);

  // Gemini chat format: alternating user/model contents.
  // The system prompt is prepended to the first user message (Gemini
  // doesn't have a strict system role on 2.0-flash via the v1beta REST
  // API — we combine system + first-user-turn).
  const trimmed = history.slice(-MAX_HISTORY_MESSAGES);
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

  for (let i = 0; i < trimmed.length; i++) {
    const msg = trimmed[i];
    const isFirstUser = i === 0 && msg.role === "user";
    const text = isFirstUser
      ? `${systemPrompt}\n\n---\n\nUser says: ${msg.content}`
      : msg.content;
    contents.push({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text }],
    });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
  const response = await fetch(`${url}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.85,
        maxOutputTokens: 600,
        topP: 0.95,
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new AppError("ai_request_failed", `AI request failed: ${text.slice(0, 300)}`, 502);
  }

  const data = await response.json();
  const completion = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!completion || typeof completion !== "string") {
    throw new AppError("ai_empty_response", "AI returned empty response", 502);
  }

  return completion.trim();
}

function validateRequest(body: unknown): ChatRequest {
  if (!body || typeof body !== "object") {
    throw new AppError("invalid_request", "Request body required", 400);
  }
  const b = body as Record<string, unknown>;
  const persona = b.persona as string;
  if (!["sage", "oracle", "mystic", "priestess"].includes(persona)) {
    throw new AppError("invalid_persona", "Invalid persona", 400);
  }
  const history = b.history as Message[];
  if (!Array.isArray(history) || history.length === 0 || history.length > 100) {
    throw new AppError("invalid_history", "Invalid history", 400);
  }
  for (const m of history) {
    if (!m || typeof m !== "object") throw new AppError("invalid_message", "Invalid message", 400);
    if (m.role !== "user" && m.role !== "assistant") throw new AppError("invalid_role", "Invalid role", 400);
    if (typeof m.content !== "string" || m.content.length === 0 || m.content.length > 3000) {
      throw new AppError("invalid_content", "Invalid content", 400);
    }
  }
  if (history[history.length - 1].role !== "user") {
    throw new AppError("last_must_be_user", "Last message must be from user", 400);
  }
  return { persona: persona as Persona, history, userContext: b.userContext as UserContext | undefined };
}

Deno.serve(handler(async (req, { user }) => {
  if (req.method !== "POST") throw new AppError("method_not_allowed", "Method not allowed", 405);
  if (!user) throw new AppError("auth_required", "Authentication required", 401);

  const body = await req.json().catch(() => null);
  const parsed = validateRequest(body);

  const systemPrompt = buildSystemPrompt(parsed.persona, parsed.userContext);
  const reply = await callGemini(systemPrompt, parsed.history);

  return { reply, persona: parsed.persona };
}));
