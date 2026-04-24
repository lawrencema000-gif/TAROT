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

import { AppError, handler } from "../_shared/handler.ts";
import { z } from "npm:zod@3.24.1";

// Upgraded 2026-04-25 — gemini-2.0-flash deprecated, returning 502s.
const MODEL = "gemini-2.5-flash";

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

async function callGemini(prompt: string): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new AppError("AI_NOT_CONFIGURED", "AI is not configured", 503);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 500,
        topP: 0.9,
        responseMimeType: "application/json",
      },
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
    throw new AppError("AI_REQUEST_FAILED", `AI failed: ${text.slice(0, 300)}`, 502);
  }
  const data = await res.json();
  const out = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!out || typeof out !== "string") throw new AppError("AI_EMPTY_RESPONSE", "Empty response", 502);
  return out.trim();
}

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
  requestSchema: RequestSchema,
  run: async (_ctx, body) => {
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

    const prompt = [
      SYSTEM,
      ctxLines.length ? `\nUser signals: ${ctxLines.join(", ")}` : "",
      localeLine,
      "",
      `Entry:\n---\n${entry}\n---`,
    ].filter(Boolean).join("\n");

    const raw = await callGemini(prompt);
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
    return parsed;
  },
}));
