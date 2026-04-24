import { AppError, handler } from "../_shared/handler.ts";
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
}

const MODEL = "gemini-2.5-flash";

function localeName(code: string): string {
  const normalized = code.toLowerCase().split("-")[0];
  return ({ ja: "Japanese", ko: "Korean", zh: "Chinese" } as Record<string, string>)[normalized] || "English";
}

const SYSTEM = `You are a Jungian dream interpreter. The user will describe a dream they had. Your job is NOT to predict the future or tell them what will happen. Your job is to:

1. Identify the CORE THEME — what the dream is pointing at psychologically. One tight paragraph (2-3 sentences).
2. Name the EMOTIONAL TONE in one evocative phrase (e.g. "longing wrapped in fear", "quiet grief settling", "manic upward energy").
3. List the primary ARCHETYPES at work — 2 to 4 Jungian / universal archetypes (The Shadow, The Animus, The Wise Old Woman, The Threshold Guardian, The Puer Aeternus, The Great Mother, etc).
4. Pull out 2 to 5 key SYMBOLS the dreamer described verbatim. For each: (a) what the dream was, (b) its archetypal meaning in 1-2 sentences, (c) a single reflection question the dreamer can sit with.
5. Name a SHADOW PROMPT — one piercing question that invites the dreamer to look at what the dream is showing them that they might be avoiding in waking life.
6. Offer an INTEGRATION SUGGESTION — one concrete practice (journal, walk, conversation, ritual) they can do this week to metabolise the dream.

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
  "integrationSuggestion": string
}`;

async function callGemini(dreamText: string, context: Req["userContext"]): Promise<Resp> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new AppError("AI_NOT_CONFIGURED", "AI is not configured", 503);

  const localeLine = context?.locale && context.locale !== "en"
    ? `\n\nIMPORTANT: Respond in ${localeName(context.locale)}. Keep the Jungian voice; just translate naturally.`
    : "";

  const ctxLines: string[] = [];
  if (context?.zodiacSign) ctxLines.push(`- Sun sign: ${context.zodiacSign}`);
  if (context?.mbtiType) ctxLines.push(`- MBTI: ${context.mbtiType}`);
  const ctxBlock = ctxLines.length
    ? `\n\nContextual notes on the dreamer (use sparingly, do NOT lead with it):\n${ctxLines.join("\n")}`
    : "";

  const prompt = `${SYSTEM}${localeLine}${ctxBlock}\n\n---\n\nDream:\n${dreamText}\n\n---\n\nReply with ONLY the JSON object, nothing else.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 900,
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
    throw new AppError("AI_REQUEST_FAILED", `AI request failed: ${text.slice(0, 300)}`, 502);
  }
  const data = await res.json();
  const completion = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!completion) throw new AppError("AI_EMPTY_RESPONSE", "AI returned empty response", 502);

  // Gemini returns JSON as a string because of responseMimeType=json.
  let parsed: Resp;
  try {
    parsed = JSON.parse(completion);
  } catch {
    throw new AppError("AI_INVALID_JSON", "AI response was not valid JSON", 502);
  }

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
  requestSchema: RequestSchema,
  run: async (_ctx, body) => {
    return callGemini(body.dreamText, body.userContext);
  },
}));
