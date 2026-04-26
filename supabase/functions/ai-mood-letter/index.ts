import { AppError, handler } from "../_shared/handler.ts";
import { aiCacheGet, aiCacheStore, aiCacheKey } from "../_shared/ai-gate.ts";
import { z } from "npm:zod@3.24.1";

/**
 * AI Mood Letter — weekly compassionate read of the user's mood log.
 *
 * Takes the last 7-14 mood entries + notes and returns a 3-paragraph
 * letter addressed to the user: "This week I notice…", "Underneath
 * the pattern…", "As you move into the next week…". Tone is warm,
 * specific, grounded. Never prescriptive, never predictive.
 *
 * Opt-in from the client — the user taps "Generate this week's
 * letter" rather than it running automatically, since mood notes
 * can be sensitive.
 *
 * Rate limit: 5/min per user (these letters are called manually, not
 * on every mood log).
 */

const EntrySchema = z.object({
  date: z.string(),                 // YYYY-MM-DD
  category: z.enum(['calm', 'charged', 'drained', 'steady', 'anxious', 'joyful', 'heavy', 'curious']),
  intensity: z.number().int().min(1).max(5),
  note: z.string().max(400).optional(),
});

const RequestSchema = z.object({
  entries: z.array(EntrySchema).min(3).max(30),
  userContext: z.object({
    displayName: z.string().optional(),
    locale: z.string().optional(),
  }).optional(),
});

type Req = z.infer<typeof RequestSchema>;

interface Resp {
  letter: string;              // full letter (~3 short paragraphs)
  dominantTheme: string;       // 1-phrase theme label
  careSuggestion: string;      // 1 concrete self-care practice
}

const MODEL = "gemini-2.5-flash";

function localeName(code: string): string {
  const normalized = code.toLowerCase().split("-")[0];
  return ({ ja: "Japanese", ko: "Korean", zh: "Chinese" } as Record<string, string>)[normalized] || "English";
}

const SYSTEM = `You are a warm, grounded emotional companion — like a wise older sibling or a seasoned therapist friend. The user has logged their mood daily for the past week or two. Their log is below.

Write a short letter to them, in second person ("you"). Structure:

PARAGRAPH 1 — "This week I notice…": name the pattern you see honestly. Be specific to THEIR entries (reference specific days if useful, specific category shifts, specific notes they wrote). Don't over-dramatize — if it's been a steady week, say so.

PARAGRAPH 2 — "Underneath the pattern…": gently surface what might be moving beneath the surface. Tie it to what they wrote. Never diagnose. Never say "you are X". Say what you see and offer it back.

PARAGRAPH 3 — "As you move into the next week…": one concrete, tiny, do-able practice. Not a lifestyle overhaul. Something they could actually do this week. Then close with a single sentence of genuine care.

Rules:
- 2-4 sentences per paragraph. Total letter ≤ 500 words.
- If their notes mention self-harm or suicidal ideation, acknowledge warmly and direct to 988 / a trusted person. Do NOT try to counsel them on crisis.
- Never moralize. Never use "should".
- Don't be mystical or woo; this is emotional companionship, not divination.
- Output MUST be valid JSON: { "letter": string, "dominantTheme": string (1 short phrase), "careSuggestion": string (1 sentence) }`;

async function callGemini(entries: Req["entries"], context: Req["userContext"]): Promise<Resp> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new AppError("AI_NOT_CONFIGURED", "AI is not configured", 503);

  const localeLine = context?.locale && context.locale !== "en"
    ? `\n\nIMPORTANT: Respond in ${localeName(context.locale)}. Keep the warm/grounded voice.`
    : "";

  const nameLine = context?.displayName
    ? `\n\nThe person's name is ${context.displayName}. You don't need to use it; just know they're a real person.`
    : "";

  const entryLines = entries
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((e) => {
      const noteStr = e.note ? ` — "${e.note}"` : '';
      return `  ${e.date}: ${e.category} (intensity ${e.intensity}/5)${noteStr}`;
    })
    .join('\n');

  const prompt = `${SYSTEM}${localeLine}${nameLine}\n\n---\n\nMood log (most recent last):\n${entryLines}\n\n---\n\nReply with ONLY the JSON object.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.75,
        maxOutputTokens: 700,
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

  let parsed: Resp;
  try {
    parsed = JSON.parse(completion);
  } catch {
    throw new AppError("AI_INVALID_JSON", "AI response was not valid JSON", 502);
  }

  if (!parsed.letter || !parsed.dominantTheme || !parsed.careSuggestion) {
    throw new AppError("AI_MALFORMED_RESPONSE", "AI response missing required fields", 502);
  }

  return parsed;
}

Deno.serve(handler<Req, Resp>({
  fn: "ai-mood-letter",
  auth: "optional",
  methods: ["POST"],
  rateLimit: { max: 5, windowMs: 60_000 },
  ai: true,
  requestSchema: RequestSchema,
  run: async (ctx, body) => {
    // Cache by entries + context. Same recent entries = same letter.
    // Short-ish TTL (24h) since users typically log fresh entries daily.
    const entriesKey = JSON.stringify(body.entries);
    const ctxKey = JSON.stringify(body.userContext ?? {});
    const cacheKey = await aiCacheKey("ai-mood-letter", MODEL, entriesKey, ctxKey);
    const cached = await aiCacheGet<Resp>(ctx, cacheKey);
    if (cached) return cached;

    const fresh = await callGemini(body.entries, body.userContext);
    await aiCacheStore(ctx, {
      cacheKey,
      model: MODEL,
      fnName: "ai-mood-letter",
      response: fresh,
      ttlDays: 1,
    });
    return fresh;
  },
}));
