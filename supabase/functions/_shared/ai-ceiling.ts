/**
 * The AI killswitch + per-user daily ceiling, in one place.
 *
 * This logic used to live twice: once in `handler.ts` (for functions that
 * set `ai: true`) and once in `ai-gate.ts` (for functions that call
 * `aiGate()` themselves, e.g. dream and celestial). Two copies drift; this
 * module is the single implementation and both callers import it. It has
 * no dependency on handler.ts so there is no import cycle.
 *
 *   1. Killswitch — `feature_flags.ai-enabled = false` pauses every AI
 *      surface from the dashboard without a redeploy.
 *   2. Hard daily ceiling — `ai_check_and_record_usage` records one call
 *      and refuses past `ceiling` calls per UTC day. Anonymous callers are
 *      not counted (there is no user to count against) — which is why every
 *      model-calling function now requires auth.
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
import type { Logger } from "./log.ts";

export const AI_DEFAULT_CEILING = 200;
export const AI_KILLSWITCH_FLAG_KEY = "ai-enabled";

export interface AiAccessAllowed {
  allowed: true;
}

export interface AiAccessBlocked {
  allowed: false;
  reason: "AI_DISABLED" | "AI_DAILY_LIMIT";
  message: string;
  status: 503 | 429;
}

export type AiAccessResult = AiAccessAllowed | AiAccessBlocked;

export async function checkAiAccess(
  supabase: SupabaseClient,
  log: Logger,
  userId: string | null,
  ceiling: number = AI_DEFAULT_CEILING,
): Promise<AiAccessResult> {
  // 1. Killswitch.
  const { data: flag } = await supabase
    .from("feature_flags")
    .select("enabled")
    .eq("key", AI_KILLSWITCH_FLAG_KEY)
    .maybeSingle();
  if (flag && flag.enabled === false) {
    return {
      allowed: false,
      reason: "AI_DISABLED",
      message: "AI is temporarily paused. Try again in a few minutes.",
      status: 503,
    };
  }

  // 2. Hard daily ceiling — only when there is a user to count against.
  if (userId) {
    const { data: usageRow, error: usageErr } = await supabase.rpc(
      "ai_check_and_record_usage",
      { p_user_id: userId, p_ceiling: ceiling },
    );
    if (usageErr) {
      // Fail-open on usage-check errors — never block legitimate users
      // because the ceiling table is briefly unreachable.
      log.warn("ai_gate.usage_check_failed", { err: usageErr.message });
    } else {
      const row = Array.isArray(usageRow) ? usageRow[0] : usageRow;
      if (row && row.allowed === false) {
        return {
          allowed: false,
          reason: "AI_DAILY_LIMIT",
          message: `You've reached today's AI limit (${row.ceiling}/day). It resets at midnight UTC.`,
          status: 429,
        };
      }
    }
  }

  return { allowed: true };
}
