/**
 * Rewarded-ad credit limits, as the client needs to see them.
 *
 * The limits themselves live in moonstone_credit_for_ad_srv
 * (20261003000005): 50 Moonstones per ad, at most 6 credits per UTC day, at
 * least 20 s apart. These constants mirror it so ad-config can tell the
 * client how many credits are left today — the client stops offering an ad
 * that would earn nothing (p7 #33) — and ad-reward can say when to come
 * back. The database stays the authority; a drift here only mis-states the
 * count, it cannot mint.
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";

export const AD_CREDIT_AMOUNT = 50;
export const AD_DAILY_CAP = 6;
export const AD_MIN_GAP_MS = 20_000;

export interface RewardedAdStatus {
  /** Credits already made today (UTC). */
  creditsToday: number;
  /** Credits still possible today: 0 means "come back tomorrow". */
  creditsRemaining: number;
  /** Next UTC midnight (ISO) — when the daily cap resets. */
  resetAt: string;
  /** Earliest moment the next credit is accepted (ISO); now or later. */
  nextAvailableAt: string;
}

export function nextUtcMidnight(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}

/** Today's rewarded-ad credits for one user, read as the service role. Null if the ledger is unreadable. */
export async function rewardedAdStatus(supabase: SupabaseClient, userId: string, now = new Date()): Promise<RewardedAdStatus | null> {
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const [{ count, error }, last] = await Promise.all([
    supabase
      .from("moonstone_transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("kind", "rewarded-ad")
      .gte("created_at", midnight.toISOString()),
    supabase
      .from("moonstone_transactions")
      .select("created_at")
      .eq("user_id", userId)
      .eq("kind", "rewarded-ad")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (error || last.error) return null;
  const creditsToday = count ?? 0;
  const lastAt = last.data?.created_at ? Date.parse(last.data.created_at as string) : 0;
  const next = Math.max(now.getTime(), lastAt + AD_MIN_GAP_MS);
  return {
    creditsToday,
    creditsRemaining: Math.max(0, AD_DAILY_CAP - creditsToday),
    resetAt: nextUtcMidnight(now).toISOString(),
    nextAvailableAt: new Date(next).toISOString(),
  };
}
