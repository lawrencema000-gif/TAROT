/**
 * Shared AI provider helper — OpenAI primary, Gemini fallback.
 *
 * Why: Gemini 2.5 Flash has been intermittently returning 503 "model
 * overloaded" errors in 2026. Every edge function that called Gemini
 * directly inherited this fragility. Concentrating the provider chain
 * here means every AI surface (companion chat, quick readings, dream
 * interpreter, mood letter, journal coach, and Bazi) gets the same
 * resilience: 3-attempt retries with exponential-ish backoff, model
 * fallback within each provider, then provider failover.
 *
 * Two entry points:
 *   - callAIText({ system, history }) → string                 (chat)
 *   - callAIJson<T>({ system, userPrompt }) → T (parsed JSON) (single-shot)
 *
 * Both throw AppError on terminal failure so the calling handler returns a
 * clean 502 to the client. Soft-failures (e.g. retryable 503) are absorbed
 * by the retry loop.
 */

import { AppError } from "./handler.ts";

const OPENAI_MODELS = ["gpt-4o-mini", "gpt-4o"];
const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash-exp", "gemini-1.5-flash"];

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface CallText {
  /** System prompt — injected as `system` (OpenAI) or prepended to first user turn (Gemini). */
  system: string;
  /** Chat history in chronological order. The last message must be from the user. */
  history: ChatMessage[];
  /** 0..1, defaults 0.8 */
  temperature?: number;
  /** defaults 600 */
  maxOutputTokens?: number;
}

interface CallJson {
  system: string;
  userPrompt: string;
  /** defaults 0.7 */
  temperature?: number;
  /** defaults 800 */
  maxOutputTokens?: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Retry only on transient — 429 rate limit, 0 (network), 500/502/503/504.
const RETRYABLE = new Set([0, 429, 500, 502, 503, 504]);

interface CallResult {
  ok: true;
  text: string;
}
interface CallFailure {
  ok: false;
  status: number;
  body: string;
}

// ─── OpenAI ──────────────────────────────────────────────────────────────
async function openAIChat(
  model: string,
  apiKey: string,
  system: string,
  history: ChatMessage[],
  temperature: number,
  maxTokens: number,
  jsonMode: boolean,
): Promise<CallResult | CallFailure> {
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          ...history.map((m) => ({ role: m.role, content: m.content })),
        ],
        temperature,
        max_completion_tokens: maxTokens,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (!res.ok) {
      return { ok: false, status: res.status, body: (await res.text()).slice(0, 300) };
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text || typeof text !== "string") {
      return { ok: false, status: 0, body: "openai: empty response" };
    }
    return { ok: true, text: text.trim() };
  } catch (e) {
    return { ok: false, status: 0, body: `openai network: ${String(e).slice(0, 200)}` };
  }
}

// ─── Gemini ──────────────────────────────────────────────────────────────
async function geminiChat(
  model: string,
  apiKey: string,
  system: string,
  history: ChatMessage[],
  temperature: number,
  maxTokens: number,
  jsonMode: boolean,
): Promise<CallResult | CallFailure> {
  // Gemini doesn't have a separate system role in v1beta; either use
  // systemInstruction (preferred) or prepend to the first user turn.
  const contents = history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          topP: 0.95,
          ...(jsonMode ? { responseMimeType: "application/json" } : {}),
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
      return { ok: false, status: res.status, body: (await res.text()).slice(0, 300) };
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text || typeof text !== "string") {
      return { ok: false, status: 0, body: "gemini: empty response" };
    }
    return { ok: true, text: text.trim() };
  } catch (e) {
    return { ok: false, status: 0, body: `gemini network: ${String(e).slice(0, 200)}` };
  }
}

// ─── Provider chain runner ───────────────────────────────────────────────
async function runChain(
  system: string,
  history: ChatMessage[],
  temperature: number,
  maxTokens: number,
  jsonMode: boolean,
): Promise<string> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY") || "";
  const geminiKey = Deno.env.get("GEMINI_API_KEY") || "";
  if (!openaiKey && !geminiKey) {
    throw new AppError(
      "AI_NOT_CONFIGURED",
      "No AI provider configured (OPENAI_API_KEY or GEMINI_API_KEY)",
      503,
    );
  }

  let lastErr = "no attempt yet";

  if (openaiKey) {
    for (const model of OPENAI_MODELS) {
      for (let attempt = 0; attempt < 3; attempt++) {
        const r = await openAIChat(model, openaiKey, system, history, temperature, maxTokens, jsonMode);
        if (r.ok) return r.text;
        lastErr = `openai ${model} ${r.status}: ${r.body}`;
        if (!RETRYABLE.has(r.status)) break;
        await sleep(1500 * (attempt + 1));
      }
    }
  }

  if (geminiKey) {
    for (const model of GEMINI_MODELS) {
      for (let attempt = 0; attempt < 3; attempt++) {
        const r = await geminiChat(model, geminiKey, system, history, temperature, maxTokens, jsonMode);
        if (r.ok) return r.text;
        lastErr = `gemini ${model} ${r.status}: ${r.body}`;
        if (!RETRYABLE.has(r.status)) break;
        await sleep(1500 * (attempt + 1));
      }
    }
  }

  throw new AppError("AI_FAILED", `All AI providers failed. Last: ${lastErr}`, 502);
}

/**
 * Multi-turn chat — returns plain text. Use for conversational surfaces
 * where the model produces a freeform reply.
 */
export async function callAIText(opts: CallText): Promise<string> {
  return runChain(
    opts.system,
    opts.history,
    opts.temperature ?? 0.8,
    opts.maxOutputTokens ?? 600,
    /* jsonMode */ false,
  );
}

/**
 * Single-shot prompt expecting a JSON object response. Returns the parsed
 * object. Validates JSON parse here so callers only need to type-narrow.
 */
export async function callAIJson<T>(opts: CallJson): Promise<T> {
  const text = await runChain(
    opts.system,
    [{ role: "user", content: opts.userPrompt }],
    opts.temperature ?? 0.7,
    opts.maxOutputTokens ?? 800,
    /* jsonMode */ true,
  );
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    throw new AppError(
      "AI_INVALID_JSON",
      `AI response was not valid JSON: ${String(e).slice(0, 100)}`,
      502,
    );
  }
}

/**
 * Embedding helper — Gemini-only since OpenAI embeddings have a different
 * dim (1536 vs 768) and the pgvector schema is fixed at 768. Returns null
 * on any error so callers can fall back to no-memory mode.
 */
export async function embedText(text: string): Promise<number[] | null> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return null;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/text-embedding-004",
        content: { parts: [{ text: text.slice(0, 8000) }] },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const values = data?.embedding?.values;
    return Array.isArray(values) && values.length === 768 ? (values as number[]) : null;
  } catch {
    return null;
  }
}
