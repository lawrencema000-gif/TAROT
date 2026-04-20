import { supabase } from '../lib/supabase';
import { captureException } from '../utils/telemetry';
import type { Result } from './dailyRituals';
import type { ZodiacSign } from '../types';

export interface DailyReadingCacheRow<T> {
  sign: ZodiacSign;
  content: T;
}

export async function getBySignAndDate<T>(
  sign: ZodiacSign,
  date: string,
): Promise<Result<T | null>> {
  const { data, error } = await supabase
    .from('daily_readings_cache')
    .select('content')
    .eq('sign', sign)
    .eq('date', date)
    .maybeSingle();

  if (error) {
    captureException('dal.dailyReadingsCache.getBySignAndDate', error, { sign, date });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: data ? (data.content as T) : null };
}

export async function listByDate<T>(
  date: string,
): Promise<Result<DailyReadingCacheRow<T>[]>> {
  const { data, error } = await supabase
    .from('daily_readings_cache')
    .select('sign, content')
    .eq('date', date);

  if (error) {
    captureException('dal.dailyReadingsCache.listByDate', error, { date });
    return { ok: false, error: error.message };
  }
  return {
    ok: true,
    data: (data ?? []).map(r => ({
      sign: (r as { sign: string }).sign as ZodiacSign,
      content: (r as { content: unknown }).content as T,
    })),
  };
}

export async function insertMany<T>(
  rows: { sign: string; date: string; content: T }[],
): Promise<Result<void>> {
  if (rows.length === 0) return { ok: true, data: undefined };
  const { error } = await supabase.from('daily_readings_cache').insert(rows);
  if (error) {
    captureException('dal.dailyReadingsCache.insertMany', error, { count: rows.length });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: undefined };
}

/**
 * Fire-and-forget variant used by read-through caches. Failures are logged
 * via captureException but the promise resolves void.
 */
export function insertManyDetached<T>(
  rows: { sign: string; date: string; content: T }[],
): void {
  if (rows.length === 0) return;
  supabase
    .from('daily_readings_cache')
    .insert(rows)
    .then(({ error }) => {
      if (error) {
        captureException('dal.dailyReadingsCache.insertManyDetached', error, {
          count: rows.length,
        });
      }
    });
}

export async function deleteOlderThan(date: string): Promise<Result<void>> {
  const { error } = await supabase
    .from('daily_readings_cache')
    .delete()
    .lt('date', date);
  if (error) {
    captureException('dal.dailyReadingsCache.deleteOlderThan', error, { date });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: undefined };
}
