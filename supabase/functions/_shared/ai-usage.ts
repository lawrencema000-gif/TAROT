/**
 * AI usage ledger — fire-and-forget recording of external LLM call cost.
 *
 * Every external LLM call should write one row to `public.ai_usage_ledger`
 * so cost is observable per-user + per-day + per-model. This module is the
 * single place that knows how to:
 *
 *   • estimate cost from {model, promptTokens, completionTokens}
 *   • insert a ledger row without blocking or failing the caller
 *
 * SCALABILITY-PLAN.md Part 3 ("Cost guardrails") — every model call writes
 * to ai_usage_ledger; a pg_cron job aggregates daily and fires a Sentry
 * alert if totals exceed budget.
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
import type { Logger } from "./log.ts";

/**
 * Cost per 1,000 tokens in CENTS, from the public pricing pages fetched
 * 2026-10-02 (developers.openai.com/api/docs/pricing and
 * ai.google.dev/gemini-api/docs/pricing). USD per 1M tokens → cents per
 * 1K tokens is "divide by 10": $1.25/1M = 0.125¢/1K.
 *
 * Until this table had OpenAI rows, every production call (all of them run
 * on gpt-5) logged cost_cents = 0 with an `ai_ledger.unknown_model` warning
 * and the cost dashboard read zero for the real spend.
 *
 *   gpt-5             $1.25 / $10.00     gpt-5-mini        $0.25 / $2.00
 *   gpt-5.6-terra     $2.00 / $12.00     gpt-5.6-sol       $4.00 / $20.00
 *   gpt-4o-mini       $0.15 / $0.60      (daily-geo-mentions probe only)
 *   gemini-3.8-flash  $0.75 / $3.75 through 2026-12-31, then $1.50 / $7.50
 *   gemini-3.5-flash  $1.50 / $9.00      gemini-2.5-flash  $0.30 / $2.50
 *   gemini-2.5-pro    $1.25 / $10.00
 *   gpt-image-2, gpt-image-2.5-flare   text in $5.00 / image out $30.00
 *   (for image rows "input" is the text prompt, "output" the image tokens)
 *
 * Retired ids (gemini-2.0-flash, gemini-1.5-flash) are gone from the table:
 * nothing can call them any more, and historic rows keep their recorded
 * cost. An unknown model → cost 0 + a warning log; the ledger still records
 * tokens so we can reprice historically if pricing changes.
 */
export const COST_PER_1K_TOKENS: Record<string, { input: number; output: number }> = {
  // OpenAI text
  "gpt-5":            { input: 0.125,  output: 1.00 },
  "gpt-5-mini":       { input: 0.025,  output: 0.20 },
  "gpt-5.6-terra":    { input: 0.20,   output: 1.20 },
  "gpt-5.6-sol":      { input: 0.40,   output: 2.00 },
  "gpt-4o-mini":      { input: 0.015,  output: 0.06 },
  // OpenAI images (text-in / image-out tokens)
  "gpt-image-2":           { input: 0.50, output: 3.00 },
  "gpt-image-2.5-flare":   { input: 0.50, output: 3.00 },
  // Gemini text
  "gemini-3.8-flash": { input: 0.075,  output: 0.375 },
  "gemini-3.5-flash": { input: 0.15,   output: 0.90 },
  "gemini-2.5-flash": { input: 0.03,   output: 0.25 },
  "gemini-2.5-pro":   { input: 0.125,  output: 1.00 },
};

/**
 * Returns the estimated cost in cents for a given call. Uses 4-decimal
 * precision to match the ledger column (`numeric(10,4)`).
 *
 * Unknown models return 0 without throwing — callers still record the row so
 * we at least have the token counts + model string for later reprice. A
 * date-suffixed id ("gpt-5-2025-08-07") is priced as its base id.
 */
export function estimateCost(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const rates = COST_PER_1K_TOKENS[model]
    ?? COST_PER_1K_TOKENS[model.replace(/-\d{4}-\d{2}-\d{2}$/, "")];
  if (!rates) return 0;
  const input = (promptTokens / 1000) * rates.input;
  const output = (completionTokens / 1000) * rates.output;
  // Round to 4 decimal places to match numeric(10,4) storage.
  return Math.round((input + output) * 10_000) / 10_000;
}

export interface AiUsageRecord {
  userId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costCents: number;
  correlationId: string;
  functionName: string;
}

/**
 * Fire-and-forget insert into `ai_usage_ledger`. Never throws; never rejects.
 *
 * Ledger-write failures must not block the user's response, so callers should
 * NOT `await` the network round-trip. Pattern:
 *
 *     recordAiUsage(ctx.supabase, ctx.log, { ... }); // no await
 *
 * Internally we catch any insert error and log it as a warning; the promise
 * always resolves to `void`.
 */
export async function recordAiUsage(
  supabase: SupabaseClient,
  log: Logger,
  record: AiUsageRecord,
): Promise<void> {
  try {
    const { error } = await supabase.from("ai_usage_ledger").insert({
      user_id: record.userId,
      model: record.model,
      prompt_tokens: record.promptTokens,
      completion_tokens: record.completionTokens,
      total_tokens: record.totalTokens,
      cost_cents: record.costCents,
      correlation_id: record.correlationId,
      function_name: record.functionName,
    });
    if (error) {
      log.warn("ai_ledger.insert_failed", { err: error });
    }
  } catch (err) {
    log.warn("ai_ledger.insert_failed", { err });
  }
}
