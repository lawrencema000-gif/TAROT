/**
 * Claude (Anthropic): the FIRST provider for every AI text call in the app.
 *
 * Owner instruction, 2026-11-22: "make ALL Ai generated content from my app
 * use this key first, if it runs out then switch to other models." The key
 * lives only in the Edge Function secret ANTHROPIC_API_KEY, never in the repo
 * or the client bundle.
 *
 * Every text chain asks Claude first:
 *   - callAIText / callAIJson in ai-providers.ts (companion chat, dream
 *     interpreter, journal coach, mood letter, person reading, quick reading,
 *     celestial travel reading, the blog's empty-queue topic drafter);
 *   - the chains that generate-reading, bazi-interpret, bazi-interpret-test
 *     and daily-seo-blog-generator run themselves.
 * When Claude fails for ANY reason (out of credit, spend cap, rate limit,
 * overload, timeout, refusal, truncation, empty or unusable reply), the call
 * falls through to the chain's existing OpenAI → Gemini providers, unchanged.
 *
 * When the KEY itself is unusable — out of credit (402 billing_error), the
 * monthly spend cap (429 enforced_spend_limit_reached), revoked or invalid
 * (401), not permitted (403) — Claude is skipped for CLAUDE_PAUSE_MS in this
 * isolate, so members don't wait for a failed round trip on every call while
 * the account is empty. A topped-up account is used again within that window.
 *
 * Not covered, because Claude has no such API: image generation (OpenAI
 * gpt-image; the soulmate portrait is an image plus a template caption, so
 * it has no text call) and embeddings (Gemini), both in ai-providers.ts. Two other
 * AI calls are measurements rather than generated content and stay as they
 * are: community-moderate (OpenAI's free moderation endpoint) and the GEO
 * probe daily-geo-mentions (it measures what ChatGPT and Gemini say).
 *
 * Model: claude-opus-5-5. Its thinking is always on and it rejects
 * `temperature`, so depth is set per call with output_config.effort ("low"
 * by default: these are interactive surfaces). Server-side refusal fallbacks
 * are on ("default"): a declined request is re-run on another Claude model
 * inside the same call before the chain moves on to OpenAI.
 */

import Anthropic from "npm:@anthropic-ai/sdk@1.12.0";

export const CLAUDE_MODEL = "claude-opus-5-5";
/** How long Claude is skipped after a billing, spend-cap or key error. */
export const CLAUDE_PAUSE_MS = 10 * 60_000;
const REFUSAL_FALLBACK_BETA = "server-side-fallback-2026-07-01";
/** Non-streaming requests stay under this so they never hit HTTP timeouts. */
const MAX_REQUEST_TOKENS = 16_000;

export type ClaudeEffort = "low" | "medium" | "high";

export interface ClaudeRequest {
  system: string;
  /** Chronological; the last message must be from the user. */
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  /**
   * The visible output the caller needs. The request budget is padded,
   * because this model's thinking tokens share max_tokens with the answer.
   */
  maxOutputTokens: number;
  /** Ask for a single JSON object; the caller still parses and validates it. */
  json?: boolean;
  effort?: ClaudeEffort;
  /**
   * Deadline for the WHOLE Claude attempt, SDK retry and back-off included
   * (default 45 s); the caller's chain still needs time to fall back.
   */
  timeoutMs?: number;
}

export type ClaudeResult =
  | { ok: true; text: string; model: string; inputTokens: number; outputTokens: number }
  | { ok: false; status: number; reason: string; paused: boolean };

let pausedUntil = 0;
let client: Anthropic | null = null;

/** Tests only: swap in a fake client (and clear any pause). Pass null to restore the real one. */
export function __setClaudeClientForTests(fake: Anthropic | null): void {
  client = fake;
  pausedUntil = 0;
}

export function claudeKeyConfigured(): boolean {
  return Boolean(Deno.env.get("ANTHROPIC_API_KEY"));
}

/** True when a key is set and Claude is not paused after a billing or key error. */
export function claudeAvailable(now: number = Date.now()): boolean {
  return claudeKeyConfigured() && now >= pausedUntil;
}

function getClient(): Anthropic {
  if (!client) {
    // One SDK retry for 408/409/429/5xx and connection errors; the chain's
    // other providers are the real safety net, so don't stack long retries.
    // callClaude's deadline bounds the retry and its back-off as well.
    client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY"), maxRetries: 1 });
  }
  return client;
}

/** The request budget: room for thinking plus the visible answer, capped for non-streaming calls. */
export function claudeMaxTokens(maxOutputTokens: number): number {
  return Math.min(MAX_REQUEST_TOKENS, Math.max(2048, maxOutputTokens * 3));
}

function logOutcome(fields: Record<string, unknown>): void {
  // One structured line per call: Supabase keeps edge-function console output,
  // which is how "did Claude serve this?" is checked in production.
  console.log(JSON.stringify({ msg: "ai.claude", ...fields }));
}

function failure(status: number, reason: string, paused = false): ClaudeResult {
  logOutcome({ ok: false, status, reason, paused });
  return { ok: false, status, reason, paused };
}

/** Classify an SDK error; pause Claude when the key itself is unusable. */
function fromError(e: unknown): ClaudeResult {
  // These extend APIError in this SDK, so they are checked first. The
  // deadline in callClaude surfaces as APIUserAbortError.
  if (e instanceof Anthropic.APIUserAbortError) return failure(0, "claude: timeout (deadline)");
  if (e instanceof Anthropic.APIConnectionTimeoutError) return failure(0, "claude: timeout");
  if (e instanceof Anthropic.APIConnectionError) return failure(0, "claude: network error");
  if (e instanceof Anthropic.APIError) {
    const status = e.status ?? 0;
    const keyUnusable =
      e instanceof Anthropic.AuthenticationError || // 401
      e instanceof Anthropic.PermissionDeniedError || // 403
      status === 402 ||
      e.type === "billing_error" ||
      e.errorCode === "enforced_spend_limit_reached"; // the monthly spend cap (a 429)
    if (keyUnusable) pausedUntil = Date.now() + CLAUDE_PAUSE_MS;
    const label = [e.type, e.errorCode].filter(Boolean).join("/");
    return failure(status, `claude ${status}${label ? " " + label : ""}`, keyUnusable);
  }
  return failure(0, `claude: ${String(e).slice(0, 160)}`);
}

/**
 * One Claude call. Never throws: every failure comes back as { ok: false }
 * so the caller's chain moves on to its next provider.
 */
export async function callClaude(req: ClaudeRequest): Promise<ClaudeResult> {
  if (!claudeKeyConfigured()) return { ok: false, status: 0, reason: "claude: ANTHROPIC_API_KEY not set", paused: false };
  if (Date.now() < pausedUntil) {
    return { ok: false, status: 0, reason: "claude: skipped after a billing or key error", paused: true };
  }

  const system = req.json
    ? `${req.system}\n\nReply with one JSON object only: no code fences and no text before or after it.`
    : req.system;

  // The SDK retries a timed-out attempt once, so a per-attempt timeout alone
  // could take twice as long. This deadline covers the attempt, the retry and
  // the back-off between them (the SDK's back-off sleep wakes on abort).
  const deadlineMs = req.timeoutMs ?? 45_000;
  const deadline = new AbortController();
  const timer = setTimeout(() => deadline.abort(), deadlineMs);

  try {
    const response = await getClient().beta.messages.create(
      {
        model: CLAUDE_MODEL,
        max_tokens: claudeMaxTokens(req.maxOutputTokens),
        system,
        messages: req.messages,
        output_config: { effort: req.effort ?? "low" },
        // Long, stable system prompts (personas, reading rules) are re-read
        // from the cache; short ones simply don't cache.
        cache_control: { type: "ephemeral" },
        betas: [REFUSAL_FALLBACK_BETA],
        fallbacks: "default",
      },
      { timeout: deadlineMs, signal: deadline.signal },
    );

    if (response.stop_reason === "refusal") {
      return failure(0, `claude: refused (${response.stop_details?.category ?? "uncategorised"})`);
    }
    if (response.stop_reason === "max_tokens") {
      // A cut-off reading is worse than the next provider's whole one.
      return failure(0, "claude: reply cut off at max_tokens");
    }
    const text = response.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("")
      .trim();
    if (!text) return failure(0, `claude: empty reply (stop_reason=${response.stop_reason})`);

    const usage = response.usage;
    const inputTokens =
      (usage.input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0);
    const outputTokens = usage.output_tokens ?? 0;
    logOutcome({ ok: true, model: response.model, input_tokens: inputTokens, output_tokens: outputTokens });
    return { ok: true, text, model: response.model, inputTokens, outputTokens };
  } catch (e) {
    return fromError(e);
  } finally {
    clearTimeout(timer);
  }
}
