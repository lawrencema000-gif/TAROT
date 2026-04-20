import { supabase } from '../lib/supabase';
import { captureException } from '../utils/telemetry';
import type { Result } from './dailyRituals';
import type { TarotReading } from '../types';

export interface TarotReadingRow {
  id: string;
  user_id: string;
  date: string;
  spread_type: string;
  focus_area?: string | null;
  cards: unknown;
  interpretation?: string | null;
  saved?: boolean | null;
  created_at: string;
  [key: string]: unknown;
}

export interface TarotReadingRecentSummary {
  id: string;
  date: string;
  spread_type: string;
  cards: unknown;
}

export interface TarotReadingInsert {
  userId: string;
  date: string;
  spreadType: string;
  focusArea?: string | null;
  cards: unknown;
  interpretation?: string | null;
  saved?: boolean;
}

export async function listSaved(
  userId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<Result<{ id: string; date: string; spread_type: string; focus_area: string | null; cards: unknown; created_at: string }[]>> {
  const { limit = 20, offset = 0 } = options;
  const { data, error } = await supabase
    .from('tarot_readings')
    .select('id, date, spread_type, focus_area, cards, created_at')
    .eq('user_id', userId)
    .eq('saved', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) {
    captureException('dal.tarotReadings.listSaved', error, { userId });
    return { ok: false, error: error.message };
  }
  return {
    ok: true,
    data: (data ?? []).map(r => {
      const row = r as Record<string, unknown>;
      return {
        id: row.id as string,
        date: row.date as string,
        spread_type: row.spread_type as string,
        focus_area: (row.focus_area as string | null) ?? null,
        cards: row.cards,
        created_at: row.created_at as string,
      };
    }),
  };
}

export async function deleteById(id: string): Promise<Result<void>> {
  const { error } = await supabase.from('tarot_readings').delete().eq('id', id);
  if (error) {
    captureException('dal.tarotReadings.deleteById', error, { id });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: undefined };
}

export async function listRecent(
  userId: string,
  limit = 10,
): Promise<Result<TarotReadingRecentSummary[]>> {
  const { data, error } = await supabase
    .from('tarot_readings')
    .select('id, date, spread_type, cards')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    captureException('dal.tarotReadings.listRecent', error, { userId });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: (data as TarotReadingRecentSummary[]) ?? [] };
}

export async function listAllForUser(userId: string): Promise<Result<TarotReadingRow[]>> {
  const { data, error } = await supabase
    .from('tarot_readings')
    .select('*')
    .eq('user_id', userId);
  if (error) {
    captureException('dal.tarotReadings.listAllForUser', error, { userId });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: (data as TarotReadingRow[]) ?? [] };
}

export async function listHistory(
  userId: string,
  limit = 30,
  offset = 0,
): Promise<Result<TarotReading[]>> {
  const { data, error } = await supabase
    .from('tarot_readings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) {
    captureException('dal.tarotReadings.listHistory', error, { userId });
    return { ok: false, error: error.message };
  }
  const mapped: TarotReading[] = (data ?? []).map(r => ({
    id: r.id as string,
    userId: r.user_id as string,
    date: r.date as string,
    spreadType: r.spread_type as TarotReading['spreadType'],
    cards: r.cards as TarotReading['cards'],
    interpretation: r.interpretation as string,
    saved: true,
  }));
  return { ok: true, data: mapped };
}

export async function insert(reading: TarotReadingInsert): Promise<Result<void>> {
  const row: Record<string, unknown> = {
    user_id: reading.userId,
    date: reading.date,
    spread_type: reading.spreadType,
    cards: reading.cards,
  };
  if (reading.focusArea !== undefined) row.focus_area = reading.focusArea;
  if (reading.interpretation !== undefined) row.interpretation = reading.interpretation;
  if (reading.saved !== undefined) row.saved = reading.saved;

  const { error } = await supabase.from('tarot_readings').insert(row);
  if (error) {
    captureException('dal.tarotReadings.insert', error, { userId: reading.userId });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: undefined };
}

export async function insertReturningId(
  reading: TarotReadingInsert,
): Promise<Result<{ id: string }>> {
  const row: Record<string, unknown> = {
    user_id: reading.userId,
    date: reading.date,
    spread_type: reading.spreadType,
    cards: reading.cards,
  };
  if (reading.focusArea !== undefined) row.focus_area = reading.focusArea;
  if (reading.interpretation !== undefined) row.interpretation = reading.interpretation;
  if (reading.saved !== undefined) row.saved = reading.saved;

  const { data, error } = await supabase
    .from('tarot_readings')
    .insert(row)
    .select('id')
    .single();
  if (error || !data) {
    captureException(
      'dal.tarotReadings.insertReturningId',
      error ?? new Error('no data'),
      { userId: reading.userId },
    );
    return { ok: false, error: error?.message ?? 'no data' };
  }
  return { ok: true, data: { id: data.id as string } };
}
