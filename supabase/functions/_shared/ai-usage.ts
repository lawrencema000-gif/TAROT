/**
 * AI usage ledger — fire-and-forget recording of external LLM call cost.
 *
 * Every external LLM call (Gemini today, future providers too) should write one
 * row to `public.ai_usage_ledger` so cost is observable per-user + per-day +
 * per-model. This module is the single place that knows how to:
 *
 *   • estimate cost from {model, promptTokens, completionTokens}
 *   • insert a ledger row without blocking or failing the caller
 *
 * SCALABILITY-PLAN.md Part 3 ("Cost guardrails") — every Gemini call writes to
 * ai_usage_ledger; a pg_cron job aggregates daily and fires a Sentry alert if
 * totals exceed budget.
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
import type { Logger } from "./log.ts";

/**
 * Cost per 1,000 tokens in cents, sourced from public Gemini pricing.
 * Keep this table in lock-step with https://ai.google.dev/pricing.
 *
 * Numbers are cents (not dollars), per 1K tokens:
 *   gemini-2.5-pro   → $0.00125 / 1K input,  $0.01000 / 1K output  → 0.125 / 1.00 cents
 *   gemini-2.5-flash → $0.000125 / 1K input, $0.00100 / 1K output  → 0.0125 / 0.10 cents
 *   gemini-2.0-flash → $0.0001 / 1K input,   $0.0004 / 1K output   → 0.01  / 0.04 cents
 *   gemini-1.5-flash → $0.000075 / 1K input, $0.0003 / 1K output   → 0.0075 / 0.03 cents
 *
 * An unknown model → cost 0 + a warning log. The ledger still records tokens
 * so we can reprice historically if pricing changes.
 */
export const COST_PER_1K_TOKENS: Record<string, { input: number; output: number }> = {
  "gemini-2.5-pro":   { input: 0.125,  output: 1.00 },
  "gemini-2.5-flash": { input: 0.0125, output: 0.10 },
  "gemini-2.0-flash": { input: 0.01,   output: 0.04 },
  "gemini-1.5-flash": { input: 0.0075, output: 0.03 },
};

/**
 * Returns the estimated cost in cents for a given call. Uses 4-decimal
 * precision to match the ledger column (`numeric(10,4)`).
 *
 * Unknown models return 0 without throwing — callers still record the row so
 * we at least have the token counts + model string for later reprice.
 */
export function estimateCost(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const rates = COST_PER_1K_TOKENS[model];
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
