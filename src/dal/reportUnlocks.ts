// Pay-per-report unlocks DAL.

import { supabase } from '../lib/supabase';
import { captureException } from '../utils/telemetry';
import type { Result } from './dailyRituals';

export type ReportKey = 'career-archetype' | 'year-ahead' | 'natal-chart-pdf';

export interface ReportUnlock {
  reportKey: ReportKey;
  reference: string;
  costCurrency: 'moonstones' | 'usd';
  costAmount: number;
  purchasedAt: string;
}

export async function isUnlocked(
  reportKey: ReportKey,
  reference: string,
): Promise<Result<boolean>> {
  const { data, error } = await supabase
    .from('report_unlocks')
    .select('id')
    .eq('report_key', reportKey)
    .eq('reference', reference)
    .maybeSingle();
  if (error) {
    captureException('dal.reportUnlocks.isUnlocked', error);
    return { ok: false, error: error.message };
  }
  return { ok: true, data: data !== null };
}

export async function unlockWithMoonstones(
  reportKey: ReportKey,
  reference: string,
  cost: number,
): Promise<Result<{ unlocked: boolean; newBalance: number }>> {
  const { data, error } = await supabase.rpc('unlock_report_with_moonstones', {
    p_report_key: reportKey,
    p_reference: reference,
    p_cost: cost,
  });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('insufficient moonstones')) {
      return { ok: false, error: 'insufficient-balance' };
    }
    captureException('dal.reportUnlocks.unlockWithMoonstones', error);
    return { ok: false, error: error.message };
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: false, error: 'No result from RPC' };
  return {
    ok: true,
    data: {
      unlocked: row.unlocked as boolean,
      newBalance: row.new_balance as number,
    },
  };
}
