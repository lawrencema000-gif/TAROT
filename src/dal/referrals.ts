// Referrals DAL — invite codes and redemption.

import { supabase } from '../lib/supabase';
import { captureException } from '../utils/telemetry';
import type { Result } from './dailyRituals';

export interface Redemption {
  inviteeId: string;
  referrerId: string;
  code: string;
  rewardAmount: number;
  createdAt: string;
}

/** Get-or-issue the caller's personal referral code. Idempotent. */
export async function getOrIssueCode(): Promise<Result<string>> {
  const { data, error } = await supabase.rpc('referral_get_or_issue');
  if (error) {
    captureException('dal.referrals.getOrIssueCode', error);
    return { ok: false, error: error.message };
  }
  const row = Array.isArray(data) ? data[0] : data;
  const code = (row?.code as string) ?? null;
  if (!code) return { ok: false, error: 'No code returned' };
  return { ok: true, data: code };
}

/**
 * Redeem a referral code. Rejected if:
 *   - code not found
 *   - code belongs to the caller (self-redeem)
 *   - caller account older than 30 days
 *   - caller already redeemed a code
 * Server returns { reward_amount, referrer_name }.
 */
export async function redeemCode(code: string): Promise<
  Result<{ rewardAmount: number; referrerName: string }>
> {
  const normalized = code.trim().toUpperCase();
  const { data, error } = await supabase.rpc('referral_redeem', { p_code: normalized });
  if (error) {
    // PG RAISE EXCEPTIONs bubble up as error.message. Map known cases.
    const msg = error.message.toLowerCase();
    if (msg.includes('already redeemed')) return { ok: false, error: 'already-redeemed' };
    if (msg.includes('unknown referral code')) return { ok: false, error: 'not-found' };
    if (msg.includes('own code')) return { ok: false, error: 'self-redeem' };
    if (msg.includes('too old')) return { ok: false, error: 'account-too-old' };
    captureException('dal.referrals.redeemCode', error, { code: normalized });
    return { ok: false, error: error.message };
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: false, error: 'No result from RPC' };
  return {
    ok: true,
    data: {
      rewardAmount: row.reward_amount as number,
      referrerName: (row.referrer_name as string) ?? '',
    },
  };
}

/** List the caller's redemptions (i.e. people they invited). */
export async function fetchInvites(): Promise<Result<Redemption[]>> {
  const { data, error } = await supabase
    .from('referral_redemptions')
    .select('invitee_id, referrer_id, code, reward_amount, created_at')
    .order('created_at', { ascending: false });
  if (error) {
    captureException('dal.referrals.fetchInvites', error);
    return { ok: false, error: error.message };
  }
  return {
    ok: true,
    data: (data ?? []).map((r) => ({
      inviteeId: r.invitee_id as string,
      referrerId: r.referrer_id as string,
      code: r.code as string,
      rewardAmount: r.reward_amount as number,
      createdAt: r.created_at as string,
    })),
  };
}
