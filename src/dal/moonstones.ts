// Moonstones DAL — virtual currency.

import { supabase } from '../lib/supabase';
import { captureException } from '../utils/telemetry';
import type { Result } from './dailyRituals';

const BALANCE_EVENT = 'moonstone:balance';

function broadcast(newBalance: number): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(BALANCE_EVENT, { detail: newBalance }));
}

export type TransactionKind =
  | 'purchase' | 'daily-checkin' | 'referral' | 'streak' | 'quiz-complete'
  | 'gift' | 'gift-receive' | 'advisor-session' | 'pay-per-report'
  | 'rewarded-ad'
  | 'refund' | 'admin-grant' | 'admin-claw';

export interface MoonstoneTransaction {
  id: string;
  userId: string;
  amount: number;
  kind: TransactionKind;
  reference: string | null;
  note: string | null;
  createdAt: string;
}

function mapTx(row: Record<string, unknown>): MoonstoneTransaction {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    amount: row.amount as number,
    kind: row.kind as TransactionKind,
    reference: (row.reference as string) ?? null,
    note: (row.note as string) ?? null,
    createdAt: row.created_at as string,
  };
}

export async function getBalance(userId: string): Promise<Result<number>> {
  const { data, error } = await supabase
    .from('moonstone_balances')
    .select('balance')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    captureException('dal.moonstones.getBalance', error);
    return { ok: false, error: error.message };
  }
  return { ok: true, data: (data?.balance as number) ?? 0 };
}

export async function fetchHistory(userId: string, limit = 50): Promise<Result<MoonstoneTransaction[]>> {
  const { data, error } = await supabase
    .from('moonstone_transactions')
    .select('id, user_id, amount, kind, reference, note, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    captureException('dal.moonstones.fetchHistory', error);
    return { ok: false, error: error.message };
  }
  return { ok: true, data: (data ?? []).map((r) => mapTx(r as Record<string, unknown>)) };
}

export interface CheckinResult {
  amountAwarded: number;
  streakDay: number;
  isStreakContinuation: boolean;
  alreadyCheckedIn: boolean;
}

/**
 * The day a check-in belongs to: the UTC date, which is what the server's
 * CURRENT_DATE names (moonstone_daily_checkin keys its row by it). It is
 * not the reader's calendar day — the ritual beside the widget is keyed by
 * that — so the next check-in opens at UTC midnight, which is 09:00 in
 * Tokyo and 17:00 in Los Angeles. Say when (nextCheckinOpensAt), never
 * "tomorrow" (p8 F56).
 */
export function checkinDay(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** The instant the next check-in opens after `now`: the next UTC midnight. */
export function nextCheckinOpensAt(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}

export async function doDailyCheckin(): Promise<Result<CheckinResult>> {
  // Already checked in today (another tab, another device, a widget left
  // open since before the claim)? Say so without calling the RPC: before
  // 20261003000012 its repeat branch returned the amount credited earlier,
  // which read as a fresh "+100" (p7 #115). The date is UTC, as the
  // server's CURRENT_DATE is.
  const { data: authData } = await supabase.auth.getUser();
  const uid = authData.user?.id;
  if (uid) {
    const today = checkinDay();
    const { data: existing } = await supabase
      .from('moonstone_daily_checkins')
      .select('streak_day')
      .eq('user_id', uid)
      .eq('date', today)
      .maybeSingle();
    if (existing) {
      const streakDay = Number((existing as { streak_day?: number }).streak_day ?? 1);
      return {
        ok: true,
        data: { amountAwarded: 0, streakDay, isStreakContinuation: streakDay > 1, alreadyCheckedIn: true },
      };
    }
  }
  const { data, error } = await supabase.rpc('moonstone_daily_checkin');
  if (error) {
    captureException('dal.moonstones.doDailyCheckin', error);
    return { ok: false, error: error.message };
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: false, error: 'No result from RPC' };
  // amount_awarded === 0 is the signal the RPC uses for "already
  // checked in today" — it skips the credit and returns the existing
  // streak state. The previous derivation `streak_day > 1 && !is_streak_continuation`
  // actually identified a BROKEN streak (new streak after a gap),
  // which had the opposite UI semantics. Fixed here so the Claim
  // button can correctly suppress on same-day re-clicks.
  const amountAwarded = row.amount_awarded as number;
  const outcome = {
    amountAwarded,
    streakDay: row.streak_day as number,
    isStreakContinuation: row.is_streak_continuation as boolean,
    alreadyCheckedIn: amountAwarded === 0,
  };
  // Refetch + broadcast balance so the home widget updates without a re-mount.
  if (outcome.amountAwarded > 0 && uid) {
    const balRes = await getBalance(uid);
    if (balRes.ok) broadcast(balRes.data);
  }
  return { ok: true, data: outcome };
}

/**
 * Quiz Moonstones are credited by the server when the quiz_results row is
 * inserted (trigger quiz_results_credit_moonstones, migration
 * 20261003000005): 2 stones, once per (user, quiz_id), at most 10 quizzes a
 * day. The RPC this used to call accepted any quiz id from any client and
 * is service-role only now, so this is a no-op kept for call-site
 * compatibility — it can be deleted along with its callers.
 */
export async function awardQuizCompletion(_userId: string, _reference: string): Promise<Result<void>> {
  return { ok: true, data: undefined };
}

/** Check if user has already checked in today — used before showing the
 * "Claim" button. Idempotent: querying this is side-effect-free. */
export async function hasCheckedInToday(userId: string): Promise<Result<boolean>> {
  const today = checkinDay();
  const { data, error } = await supabase
    .from('moonstone_daily_checkins')
    .select('date')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();
  if (error) {
    captureException('dal.moonstones.hasCheckedInToday', error);
    return { ok: false, error: error.message };
  }
  return { ok: true, data: data !== null };
}
