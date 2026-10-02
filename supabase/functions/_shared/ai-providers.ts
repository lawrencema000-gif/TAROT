/**
 * Shared AI provider helper — OpenAI primary, Gemini fallback.
 *
 * Why: Gemini Flash has been intermittently returning 503 "model
 * overloaded" errors in 2026. Every edge function that called Gemini
 * directly inherited this fragility. Concentrating the provider chain
 * here means every AI surface (companion chat, quick readings, dream
 * interpreter, mood letter, journal coach, and Bazi) gets the same
 * resilience: 3-attempt retries with exponential-ish backoff, model
 * fallback within each provider, then provider failover.
 *
 * Entry points:
 *   - callAIText({ system, history }) → string                 (chat)
 *   - callAIJson<T>({ system, userPrompt }) → T (parsed JSON) (single-shot)
 *   - generateImage(prompt) → { b64, mime } | null             (images)
 *   - embedText(text) → number[768] | null                     (pgvector)
 *
 * The text calls throw AppError on terminal failure so the calling handler
 * returns a clean 502 to the client. Soft-failures (e.g. retryable 503) are
 * absorbed by the retry loop.
 *
 * MODEL IDS — single source of truth for the whole functions/ tree. Other
 * functions that run their own chain (bazi-interpret, generate-reading,
 * daily-seo-blog-generator, bazi-interpret-test) import the lists from here
 * instead of carrying copies.
 *
 * Verified against the live model lists on 2026-10-02 (GET /v1/models and
 * GET /v1beta/models with the project keys → scratchpad p7-B5-models.json)
 * and proven with one real call each (p7-B5-probes.jsonl):
 *   gpt-5, gpt-5-mini        listed and answering; OpenAI shuts both down on
 *                            2026-12-11 (deprecations page: gpt-5 → gpt-5.6-sol,
 *                            gpt-5-mini → gpt-5.6-terra). Kept as the primary
 *                            tier until then: $1.25/$10 per 1M vs terra $2/$12
 *                            and sol $4/$20 — the swap is a price decision for
 *                            the owner, so the successor is the third rung
 *                            today and becomes the primary automatically at
 *                            the sunset date (see openAIModels()).
 *   gpt-5.6-terra, gpt-5.6-sol  listed; answered json-mode with
 *                            reasoning_effort "none" (they return 400 for
 *                            "minimal" — see reasoningEffortFor()).
 *   gemini-3.8-flash         listed, "New Stable", answered in 3.5 s;
 *   gemini-3.5-flash         listed, answered in 17 s;
 *   gemini-2.5-flash         listed (access-limited legacy, still answers).
 *   gemini-2.0-flash-exp, gemini-1.5-flash, text-embedding-004,
 *   imagen-3.0-generate-002  NOT in the live lists (retired) → removed.
 *   gpt-image-2, gpt-image-2.5-flare  listed; both returned a JPEG with
 *                            output_format + output_compression (gpt-image-1
 *                            shuts down 2026-10-23).
 *   gemini-embedding-001     listed; returned exactly 768 floats with
 *                            outputDimensionality 768 (pgvector is vector(768)).
 */

import { AppError } from "./handler.ts";

// ─── Model ids ───────────────────────────────────────────────────────────

/** 2026-12-11T00:00Z — the day OpenAI shuts down gpt-5 and gpt-5-mini. */
export const OPENAI_GPT5_SUNSET_UTC = Date.UTC(2026, 11, 11);

/**
 * OpenAI chain, quality-first. gpt-5 primary, gpt-5-mini covers rate limits,
 * and the official successor sits third so the Dec-11 shutdown degrades to
 * "one fast 404 then the successor" rather than to Gemini-only. After the
 * sunset the successors lead and nothing is wasted on dead ids.
 */
export function openAIModels(now: number = Date.now()): string[] {
  return now >= OPENAI_GPT5_SUNSET_UTC
    ? ["gpt-5.6-terra", "gpt-5.6-sol"]
    : ["gpt-5", "gpt-5-mini", "gpt-5.6-terra"];
}

/** Snapshot at isolate start — fine for callers that just iterate once. */
export const OPENAI_MODELS: string[] = openAIModels();

/** Gemini chain: current stable Flash first, then the two older Flash ids that still answer. */
export const GEMINI_MODELS: string[] = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-2.5-flash"];

/** Image chain — OpenAI only; the Imagen fallback id was retired and no Imagen id is listed for this key. */
export const OPENAI_IMAGE_MODELS: string[] = ["gpt-image-2", "gpt-image-2.5-flare"];

export const GEMINI_EMBEDDING_MODEL = "gemini-embedding-001";
/** The pgvector column is vector(768); every embedder must be asked for exactly this. */
export const EMBEDDING_DIMENSIONS = 768;

/**
 * Cache tag for prompt caches. Bumped from "openai-gpt-5-or-gemini-2.5-flash"
 * on 2026-10-02 (locale instruction moved into system prompts, Gemini chain
 * refreshed) so no pre-change entry is served.
 */
export const AI_CHAIN_TAG = "openai-gpt5-family-or-gemini-3.8-flash-v2";

// ─── Reasoning-model handling ────────────────────────────────────────────
// Reasoning models (gpt-5 family, o-series) have different API constraints
// than chat-completion models (gpt-4o):
//   - They don't support `temperature` other than the default (1).
//   - Their reasoning tokens count against `max_completion_tokens` BEFORE
//     any visible output is produced. With a tight budget the model
//     "thinks" the budget away and returns truncated or empty content.
//   - They accept `reasoning_effort` to control the reasoning budget. For
//     our creative + JSON tasks the lowest setting is right — we don't need
//     chain-of-thought, we need the prose / structured output, and the
//     lowest setting keeps latency down.
export function isReasoningModel(model: string): boolean {
  return model.startsWith("gpt-5") || /^o[1-9]/.test(model);
}

/**
 * The lowest reasoning effort each family accepts. gpt-5 / gpt-5-mini /
 * gpt-5-nano (optionally date-suffixed) take "minimal"; gpt-5.1 and later,
 * including gpt-5.6-sol/terra/luna, reject "minimal" (400 unsupported_value,
 * proven 2026-10-02) and take "none".
 */
export function reasoningEffortFor(model: string): "minimal" | "none" {
  return /^gpt-5(-mini|-nano)?(-\d{4}-\d{2}-\d{2})?$/.test(model) ? "minimal" : "none";
}

/**
 * Pull the JSON object out of a model reply. JSON mode is requested on both
 * providers, but a model can still wrap the object in ```json fences or add
 * a sentence around it; a bare JSON.parse then throws AI_INVALID_JSON and
 * the user gets a 502 for a reading that was actually fine.
 */
export function extractJsonObject(text: string): string {
  let s = text.trim();
  const fence = s.match(/^```(?:json|JSON)?\s*([\s\S]*?)\s*```$/);
  if (fence) s = fence[1].trim();
  if (s.startsWith("{") && s.endsWith("}")) return s;
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first >= 0 && last > first) return s.slice(first, last + 1);
  return s;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface CallText {
  /** System prompt — injected as `system` (OpenAI) or `systemInstruction` (Gemini). */
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
  const reasoning = isReasoningModel(model);
  // Reasoning models eat output budget for thinking tokens. Even at the
  // lowest effort we roughly double the headroom so the visible JSON /
  // prose output isn't truncated. 4o-class models don't need the padding.
  const completionBudget = reasoning ? Math.max(maxTokens * 2, 1500) : maxTokens;

  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: system },
      ...history.map((m) => ({ role: m.role, content: m.content })),
    ],
    max_completion_tokens: completionBudget,
    ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
  };
  if (reasoning) {
    body.reasoning_effort = reasoningEffortFor(model);
  } else {
    body.temperature = temperature;
  }

  // AbortController timeout — without it a hung OpenAI request never
  // resolves, so the Gemini fallback in runChain never engages on a
  // stall (only on an explicit non-200 or network throw). 30s is well
  // past p99 for our prompt sizes; anything slower should fail over.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
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
    const aborted = e instanceof DOMException && e.name === "AbortError";
    return { ok: false, status: 0, body: aborted ? "openai: timeout (30s)" : `openai network: ${String(e).slice(0, 200)}` };
  } finally {
    clearTimeout(timer);
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
  const contents = history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  // AbortController timeout — same rationale as openAIChat. A stalled
  // Gemini call (when it is the active provider) should fail out cleanly
  // rather than hanging the whole edge invocation.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    // Key goes in a header, never in the URL (URLs end up in logs).
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: {
          temperature,
          // Flash 2.5+ thinks before it answers and the thoughts share the
          // output budget; pad like the OpenAI reasoning path so a 400-token
          // reading isn't cut off by its own thinking.
          maxOutputTokens: Math.max(maxTokens * 2, 1024),
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
    // Thinking models may return a thought part before the answer part;
    // join every non-thought text part rather than reading parts[0].
    const parts: Array<{ text?: string; thought?: boolean }> = data?.candidates?.[0]?.content?.parts ?? [];
    const text = parts.filter((p) => !p.thought && typeof p.text === "string").map((p) => p.text).join("");
    if (!text || typeof text !== "string" || !text.trim()) {
      return { ok: false, status: 0, body: `gemini: empty response (finishReason=${data?.candidates?.[0]?.finishReason ?? "unknown"})` };
    }
    return { ok: true, text: text.trim() };
  } catch (e) {
    const aborted = e instanceof DOMException && e.name === "AbortError";
    return { ok: false, status: 0, body: aborted ? "gemini: timeout (30s)" : `gemini network: ${String(e).slice(0, 200)}` };
  } finally {
    clearTimeout(timer);
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
    for (const model of openAIModels()) {
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
 * object. Strips code fences / surrounding prose before parsing so a model
 * that decorates its JSON doesn't cost the user a 502.
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
    return JSON.parse(extractJsonObject(text)) as T;
  } catch (e) {
    throw new AppError(
      "AI_INVALID_JSON",
      `AI response was not valid JSON: ${String(e).slice(0, 100)}`,
      502,
    );
  }
}

/**
 * Image generation — OpenAI images, trying each id in OPENAI_IMAGE_MODELS.
 * Returns a base64 JPEG payload (no data: prefix) or null if no provider
 * is configured / all attempts fail, so callers can degrade gracefully.
 *
 * Callers MUST pass prompts that describe symbolic or illustrative artwork.
 * We never generate photorealistic likenesses of people: a realistic
 * "this is a real person" image invites misidentification of actual humans
 * and has no place in a reflection app. The negative styling below is a
 * second line of defence on top of caller prompts.
 *
 * The former Gemini Imagen fallback (imagen-3.0-generate-002) was retired by
 * Google and no Imagen id is available to this key, so the fallback is now a
 * second OpenAI image model rather than a second provider.
 */
export async function generateImage(
  prompt: string,
  opts: { size?: "1024x1024" | "1024x1536"; } = {},
): Promise<{ b64: string; mime: string } | null> {
  const size = opts.size ?? "1024x1024";
  const guarded =
    `${prompt}\n\nSTYLE REQUIREMENTS: stylized illustration / painted artwork only. ` +
    `Not a photograph, not photorealistic, not a real identifiable person, no text, no watermark.`;

  const openaiKey = Deno.env.get("OPENAI_API_KEY") || "";
  if (!openaiKey) return null;

  for (const model of OPENAI_IMAGE_MODELS) {
    try {
      const res = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
        // JPEG at quality 82 keeps the painterly look but ships ~300-600KB
        // instead of a ~4MB PNG — this payload goes to phones on mobile data.
        body: JSON.stringify({
          model, prompt: guarded, size, n: 1,
          output_format: "jpeg", output_compression: 82,
        }),
        signal: AbortSignal.timeout(90_000),
      });
      if (res.ok) {
        const data = await res.json();
        const b64 = data?.data?.[0]?.b64_json;
        if (typeof b64 === "string" && b64.length > 100) return { b64, mime: "image/jpeg" };
      }
      // Non-OK or empty payload: fall through to the next model id.
    } catch {
      // network / timeout: fall through to the next model id
    }
  }

  return null;
}

/**
 * Embedding helper — Gemini `gemini-embedding-001` asked for exactly 768
 * dimensions so the vectors fit the existing `vector(768)` pgvector columns
 * (the previous `text-embedding-004` was retired 2026-01-14, which is why
 * companion memory silently returned nothing for months). Returns null on
 * any error so callers can fall back to no-memory mode.
 *
 * `kind` tunes the embedding for its role: "query" for the live question,
 * "document" for a summary being stored. Vectors from the retired model are
 * in a different space and will not match new queries; old memory rows are
 * effectively cold until re-embedded.
 */
export async function embedText(
  text: string,
  kind: "query" | "document" = "query",
): Promise<number[] | null> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return null;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBEDDING_MODEL}:embedContent`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        model: `models/${GEMINI_EMBEDDING_MODEL}`,
        content: { parts: [{ text: text.slice(0, 8000) }] },
        taskType: kind === "document" ? "RETRIEVAL_DOCUMENT" : "RETRIEVAL_QUERY",
        outputDimensionality: EMBEDDING_DIMENSIONS,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const values = data?.embedding?.values;
    return Array.isArray(values) && values.length === EMBEDDING_DIMENSIONS ? (values as number[]) : null;
  } catch {
    return null;
  }
}
