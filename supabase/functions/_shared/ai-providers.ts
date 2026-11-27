/**
 * Shared AI provider helper — Claude first, then OpenAI, then Gemini.
 *
 * Since 2026-11-22 every text call asks Claude (the owner's own Anthropic
 * key, see ./anthropic.ts) first and falls through to the OpenAI → Gemini
 * chain below whenever Claude fails or the key runs out of credit. The
 * OpenAI and Gemini code paths are unchanged.
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
 *                            2026-12-11. OpenAI's deprecations page (read
 *                            2026-11-14) names gpt-5 → gpt-6.1-sol and
 *                            gpt-5-mini → gpt-6.1-terra; per 1M tokens in/out
 *                            gpt-5 $1.25/$10, gpt-6.1-sol $2/$10, gpt-6.1-terra
 *                            $1/$5 (gpt-5.6-sol $4/$20, gpt-5.6-terra $2/$12).
 *                            gpt-5 stays first until the sunset; from then the
 *                            OPENAI_POST_SUNSET_MODELS pair leads (owner
 *                            decision D38, see openAIModels()).
 *   gpt-5.6-terra, gpt-5.6-sol  listed; answered json-mode with
 *                            reasoning_effort "none" (they return 400 for
 *                            "minimal" — see reasoningEffortFor()). Not
 *                            deprecated.
 *   gpt-6.1-terra, gpt-6.1-sol  OpenAI's named replacements. GPT-6 migration
 *                            guide (read 2026-11-15): gpt-6.1-sol and
 *                            gpt-6-astra do not support reasoning effort
 *                            "none", so they get "low" (with more completion
 *                            headroom, completionBudgetFor()); gpt-6.1-terra,
 *                            gpt-6-sol and gpt-6-luna take "none". No
 *                            reasoning model is sent `temperature`. Key probe
 *                            for this project: WP-P5-07 step 6 (a temporary
 *                            ai-model-probe function, never committed; result
 *                            in SP/p5-07/probe-<date>.json).
 *   gpt-4o-mini              shuts down 2027-01-14 → gpt-6-luna
 *                            (daily-geo-mentions only, WP-P5-13).
 *   gemini-3.8-flash         listed, "New Stable", answered in 3.5 s;
 *   gemini-3.5-flash         listed, answered in 17 s;
 *   gemini-2.5-flash         listed (access-limited legacy, still answers).
 *   gemini-2.0-flash-exp, gemini-1.5-flash, text-embedding-004,
 *   imagen-3.0-generate-002  NOT in the live lists (retired) → removed.
 *   gpt-image-2, gpt-image-2.5-flare  listed; both returned a JPEG with
 *                            output_format + output_compression (gpt-image-1
 *                            shut down 2026-10-23). gpt-image-2 shuts down
 *                            2027-02-10 → gpt-image-2.6-flare or -sunburst
 *                            (text in $5 / image out $30 per 1M, like every
 *                            gpt-image-2.x). D38 images C: gpt-image-2.6-flare
 *                            first, once the key probe shows it returning a
 *                            JPEG; gpt-image-2.5-flare stays second.
 *   gemini-embedding-001     listed; returned exactly 768 floats with
 *                            outputDimensionality 768 (pgvector is vector(768)).
 */

import { AppError } from "./handler.ts";
import { callClaude, claudeKeyConfigured } from "./anthropic.ts";

// ─── Model ids ───────────────────────────────────────────────────────────

/** 2026-12-11T00:00Z — the day OpenAI shuts down gpt-5 and gpt-5-mini. */
export const OPENAI_GPT5_SUNSET_UTC = Date.UTC(2026, 11, 11);

/**
 * The OpenAI chain from the sunset on, first model first (owner decision D38).
 * Since 2026-11-22 OpenAI is the FALLBACK behind Claude (runChain), so this
 * pair only answers when Claude fails.
 *   B (planned since 2026-10-02): gpt-5.6-terra, gpt-5.6-sol.
 *   A (OpenAI's named replacements): gpt-6.1-terra, gpt-6.1-sol — D38's
 *     answer, applied only once the key probe passes for both.
 * The first id is also the third rung before the sunset, so a gpt-5 outage
 * degrades to the successor rather than to Gemini.
 */
export const OPENAI_POST_SUNSET_MODELS: readonly string[] = ["gpt-5.6-terra", "gpt-5.6-sol"];

/**
 * OpenAI chain, quality-first. gpt-5 primary, gpt-5-mini covers rate limits,
 * and the successor sits third so the Dec-11 shutdown degrades to "one fast
 * 404 then the successor" rather than to Gemini-only. After the sunset the
 * successors lead and nothing is wasted on dead ids.
 */
export function openAIModels(now: number = Date.now()): string[] {
  return now >= OPENAI_GPT5_SUNSET_UTC
    ? [...OPENAI_POST_SUNSET_MODELS]
    : ["gpt-5", "gpt-5-mini", OPENAI_POST_SUNSET_MODELS[0]];
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
 * refreshed), and again on 2026-11-22 when Claude became the first provider,
 * so members get Claude-written content instead of cached OpenAI replies.
 * Not changed for the 2026-12-11 model switch: no prompt changes, and a
 * cached reply stays valid. Bump it only when prompts change.
 */
export const AI_CHAIN_TAG = "claude-opus-5-5-first-then-openai-or-gemini-v3";

// ─── Reasoning-model handling ────────────────────────────────────────────
// Reasoning models (gpt-5 and gpt-6 families, o-series) have different API
// constraints than chat-completion models (gpt-4o):
//   - They don't support `temperature` other than the default (1).
//   - Their reasoning tokens count against `max_completion_tokens` BEFORE
//     any visible output is produced. With a tight budget the model
//     "thinks" the budget away and returns truncated or empty content.
//   - They accept `reasoning_effort` to control the reasoning budget. For
//     our creative + JSON tasks the lowest setting is right — we don't need
//     chain-of-thought, we need the prose / structured output, and the
//     lowest setting keeps latency down.
export function isReasoningModel(model: string): boolean {
  return /^gpt-[56]/.test(model) || /^o[1-9]/.test(model);
}

export type ReasoningEffort = "minimal" | "low" | "none";

/**
 * The lowest reasoning effort each model accepts:
 *   gpt-5 / gpt-5-mini / gpt-5-nano (date-suffixed or not)     "minimal"
 *   gpt-6.1-sol, gpt-6-astra (no "none": GPT-6 migration guide) "low"
 *   gpt-5.1 and later, gpt-5.6-*, gpt-6.1-terra, gpt-6-sol,
 *   gpt-6-luna                                                  "none"
 *   (gpt-5.6 rejects "minimal" with 400 unsupported_value, proven 2026-10-02)
 */
export function reasoningEffortFor(model: string): ReasoningEffort {
  const base = model.replace(/-\d{4}-\d{2}-\d{2}$/, "");
  if (/^gpt-5(-mini|-nano)?$/.test(base)) return "minimal";
  if (base === "gpt-6.1-sol" || base === "gpt-6-astra") return "low";
  return "none";
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

/**
 * Reasoning tokens come out of max_completion_tokens before any visible text.
 * Even at the lowest effort we roughly double the headroom so the visible
 * JSON / prose isn't truncated; a model that must think at "low" gets more.
 * 4o-class models don't need the padding.
 */
export function completionBudgetFor(model: string, maxTokens: number): number {
  if (!isReasoningModel(model)) return maxTokens;
  return reasoningEffortFor(model) === "low" ? Math.max(maxTokens * 3, 3000) : Math.max(maxTokens * 2, 1500);
}

/** The Chat Completions body runChain sends for `model` (the key probe sends the same). */
export function openAIRequestBody(
  model: string,
  system: string,
  history: ChatMessage[],
  temperature: number,
  maxTokens: number,
  jsonMode: boolean,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: system },
      ...history.map((m) => ({ role: m.role, content: m.content })),
    ],
    max_completion_tokens: completionBudgetFor(model, maxTokens),
    ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
  };
  if (isReasoningModel(model)) body.reasoning_effort = reasoningEffortFor(model);
  else body.temperature = temperature;
  return body;
}

async function openAIChat(
  model: string,
  apiKey: string,
  system: string,
  history: ChatMessage[],
  temperature: number,
  maxTokens: number,
  jsonMode: boolean,
): Promise<CallResult | CallFailure> {
  const body = openAIRequestBody(model, system, history, temperature, maxTokens, jsonMode);

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
  if (!claudeKeyConfigured() && !openaiKey && !geminiKey) {
    throw new AppError(
      "AI_NOT_CONFIGURED",
      "No AI provider configured (ANTHROPIC_API_KEY, OPENAI_API_KEY or GEMINI_API_KEY)",
      503,
    );
  }

  let lastErr = "no attempt yet";

  // Claude first, on the owner's key. Any failure (including the key running
  // out of credit) falls through to OpenAI, then Gemini. `temperature` is not
  // sent: this Claude model rejects it.
  const claude = await callClaude({ system, messages: history, maxOutputTokens: maxTokens, json: jsonMode });
  if (claude.ok) {
    if (!jsonMode) return claude.text;
    try {
      JSON.parse(extractJsonObject(claude.text));
      return claude.text;
    } catch {
      lastErr = `claude ${claude.model}: reply was not valid JSON`;
    }
  } else {
    lastErr = claude.reason;
  }

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
