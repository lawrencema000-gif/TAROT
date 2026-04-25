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

export async function doDailyCheckin(): Promise<Result<CheckinResult>> {
  const { data, error } = await supabase.rpc('moonstone_daily_checkin');
  if (error) {
    captureException('dal.moonstones.doDailyCheckin', error);
    return { ok: false, error: error.message };
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: false, error: 'No result from RPC' };
  const outcome = {
    amountAwarded: row.amount_awarded as number,
    streakDay: row.streak_day as number,
    isStreakContinuation: row.is_streak_continuation as boolean,
    alreadyCheckedIn: (row.streak_day as number) > 1 && !(row.is_streak_continuation as boolean),
  };
  // Refetch + broadcast balance so the home widget updates without a re-mount.
  if (outcome.amountAwarded > 0) {
    const { data: balData } = await supabase.auth.getUser();
    if (balData.user?.id) {
      const balRes = await getBalance(balData.user.id);
      if (balRes.ok) broadcast(balRes.data);
    }
  }
  return { ok: true, data: outcome };
}

/**
 * Credit Moonstones for quiz completion via server-side RPC.
 * The RPC dedupes on (user_id, quiz_id) so repeating the same quiz is
 * a no-op credit — not a repeat 2-Moonstone payout.
 * userId is ignored here since the RPC reads auth.uid() server-side;
 * kept in the signature for backward compatibility with call sites.
 */
export async function awardQuizCompletion(_userId: string, reference: string): Promise<Result<void>> {
  const { error } = await supabase.rpc('moonstone_award_quiz_completion', {
    p_quiz_id: reference,
    p_amount: 2,
  });
  if (error) {
    captureException('dal.moonstones.awardQuizCompletion', error, { reference });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: undefined };
}

/** Check if user has already checked in today — used before showing the
 * "Claim" button. Idempotent: querying this is side-effect-free. */
export async function hasCheckedInToday(userId: string): Promise<Result<boolean>> {
  const today = new Date().toISOString().slice(0, 10);
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
