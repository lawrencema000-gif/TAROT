/**
 * The free tier's daily reading allowance, counted per account on the server
 * (p12 tarot-09, D08 A). claim_free_reading counts one reading for the
 * member's local day and refuses the fourth; when the server cannot be
 * reached the caller falls back to the device's count (services/offline).
 */
import { supabase } from '../lib/supabase';
import { captureException } from '../utils/telemetry';
import type { Result } from './dailyRituals';

export type FreeReadingClaim =
  | { status: 'allowed'; used: number; limit: number; premium: boolean }
  | { status: 'refused'; used: number; limit: number }
  /** Offline, timed out, or no usable answer: use the device's count. */
  | { status: 'unavailable' };

/** How long a deal waits for the server before it falls back to the device's count. */
export const CLAIM_TIMEOUT_MS = 4000;

/** Claim one free reading for `localDate` (YYYY-MM-DD, the device's day: localDateStr()). */
export async function claimFreeReading(localDate: string, timeoutMs = CLAIM_TIMEOUT_MS): Promise<FreeReadingClaim> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const { data, error } = await supabase.rpc('claim_free_reading', { p_local_date: localDate }).abortSignal(ctrl.signal);
    if (error) {
      // A database answer carries a code and is worth a report; a lost connection or the timeout is not.
      if (error.code) captureException('dal.freeReadings.claim', error);
      return { status: 'unavailable' };
    }
    const row = (Array.isArray(data) ? data[0] : data) as { allowed?: unknown; used_today?: unknown; daily_limit?: unknown; premium?: unknown } | null;
    if (!row || typeof row.allowed !== 'boolean') return { status: 'unavailable' };
    const used = Number(row.used_today) || 0;
    const limit = Number(row.daily_limit) || 3;
    return row.allowed ? { status: 'allowed', used, limit, premium: row.premium === true } : { status: 'refused', used, limit };
  } catch {
    return { status: 'unavailable' };
  } finally {
    clearTimeout(timer);
  }
}

/** Free readings this member has already claimed on `localDate`, from every device (0 when none). */
export async function usedToday(localDate: string, timeoutMs = CLAIM_TIMEOUT_MS): Promise<Result<number>> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const { data, error } = await supabase.from('free_reading_claims').select('used')
      .eq('reading_date', localDate).abortSignal(ctrl.signal).maybeSingle();
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: Number((data as { used?: number } | null)?.used ?? 0) || 0 };
  } catch (e) {
    return { ok: false, error: String(e) };
  } finally {
    clearTimeout(timer);
  }
}
