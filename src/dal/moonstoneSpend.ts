// Moonstone action-spend DAL — used by every AI reading (Dream, Partner,
// Human Design, Bazi deep, Feng Shui deep, Soulmate, AI Companion, Tarot AI).
//
// Server contract:
//   - Premium users: no debit, but logged for the rolling-24h soft cap (50).
//   - Free users: 50 ms debit per action; insufficient balance -> earn sheet.
//   - Idempotent on (user, action_key, idempotency_key) when key provided.

import { supabase } from '../lib/supabase';
import { captureException } from '../utils/telemetry';
import type { Result } from './dailyRituals';

export interface SpendOutcome {
  allowed: boolean;
  newBalance: number | null;
  premiumBypass: boolean;
  softCapReached: boolean;
  resetAt: string | null;
  dailyUsed: number;
}

export interface GateStatus {
  allowed: boolean;
  balance: number | null;
  premiumBypass: boolean;
  softCapReached: boolean;
  resetAt: string | null;
  dailyUsed: number;
}

export const ACTION_COST = 50;

export async function spendForAction(
  actionKey: string,
  cost: number = ACTION_COST,
  idempotencyKey?: string,
): Promise<Result<SpendOutcome>> {
  const { data, error } = await supabase.rpc('spend_moonstones_for_action', {
    p_action_key: actionKey,
    p_cost: cost,
    p_idempotency_key: idempotencyKey ?? null,
  });
  if (error) {
    captureException('dal.moonstoneSpend.spendForAction', error, { actionKey });
    return { ok: false, error: error.message };
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: false, error: 'No result from RPC' };
  return {
    ok: true,
    data: {
      allowed: row.allowed as boolean,
      newBalance: (row.new_balance as number | null) ?? null,
      premiumBypass: row.premium_bypass as boolean,
      softCapReached: row.soft_cap_reached as boolean,
      resetAt: (row.reset_at as string | null) ?? null,
      dailyUsed: (row.daily_used as number) ?? 0,
    },
  };
}

export async function refundAction(idempotencyKey: string): Promise<Result<{ refunded: boolean; newBalance: number }>> {
  const { data, error } = await supabase.rpc('refund_action_spend', {
    p_idempotency_key: idempotencyKey,
  });
  if (error) {
    captureException('dal.moonstoneSpend.refundAction', error, { idempotencyKey });
    return { ok: false, error: error.message };
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: false, error: 'No result from RPC' };
  return {
    ok: true,
    data: {
      refunded: row.refunded as boolean,
      newBalance: row.new_balance as number,
    },
  };
}

export async function getGateStatus(
  actionKey: string,
  cost: number = ACTION_COST,
): Promise<Result<GateStatus>> {
  const { data, error } = await supabase.rpc('action_gate_status', {
    p_action_key: actionKey,
    p_cost: cost,
  });
  if (error) {
    captureException('dal.moonstoneSpend.getGateStatus', error, { actionKey });
    return { ok: false, error: error.message };
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: false, error: 'No result from RPC' };
  return {
    ok: true,
    data: {
      allowed: row.allowed as boolean,
      balance: (row.balance as number | null) ?? null,
      premiumBypass: row.premium_bypass as boolean,
      softCapReached: row.soft_cap_reached as boolean,
      resetAt: (row.reset_at as string | null) ?? null,
      dailyUsed: (row.daily_used as number) ?? 0,
    },
  };
}
