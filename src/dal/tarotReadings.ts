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
  /** The question typed on the focus step (null when none was asked, or before the column existed). */
  question?: string | null;
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
  /** The reader's typed question. Sent only when non-empty after trimming. */
  question?: string | null;
}

/*
 * The `question` column arrives with migration 20261003000010. Until it is
 * live, PostgREST answers PGRST204 ("could not find the 'question' column")
 * to an insert that names it and 42703 ("column ... does not exist") to a
 * select that names it. Both paths retry once without the column and
 * remember the answer for the session, so the app saves and lists readings
 * on either side of the push, and stops asking once it knows.
 */
let questionColumn: 'unknown' | 'present' | 'absent' = 'unknown';

interface PgError { code?: string; message?: string }

/** True when the error is the database saying the `question` column is not there (yet). */
export function isMissingQuestionColumn(error: PgError | null | undefined): boolean {
  if (!error) return false;
  const code = error.code ?? '';
  if (code !== 'PGRST204' && code !== '42703') return false;
  return /question/i.test(error.message ?? '');
}

/** Test seam: forget what this session learned about the column. */
export function __resetQuestionColumnProbe(): void {
  questionColumn = 'unknown';
}

function trimmedQuestion(q: string | null | undefined): string | null {
  const v = (q ?? '').trim();
  return v ? v.slice(0, 500) : null;
}

function toRow(reading: TarotReadingInsert): Record<string, unknown> {
  const row: Record<string, unknown> = {
    user_id: reading.userId,
    date: reading.date,
    spread_type: reading.spreadType,
    cards: reading.cards,
  };
  if (reading.focusArea !== undefined) row.focus_area = reading.focusArea;
  if (reading.interpretation !== undefined) row.interpretation = reading.interpretation;
  if (reading.saved !== undefined) row.saved = reading.saved;
  const q = trimmedQuestion(reading.question);
  if (q && questionColumn !== 'absent') row.question = q;
  return row;
}

function withoutQuestion(row: Record<string, unknown>): Record<string, unknown> {
  const { question: _dropped, ...rest } = row;
  void _dropped;
  return rest;
}

export interface SavedReadingSummary {
  id: string;
  date: string;
  spread_type: string;
  focus_area: string | null;
  cards: unknown;
  interpretation: string | null;
  question: string | null;
  created_at: string;
}

const SAVED_COLUMNS = 'id, date, spread_type, focus_area, cards, interpretation, created_at';

export async function listSaved(
  userId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<Result<SavedReadingSummary[]>> {
  const { limit = 20, offset = 0 } = options;
  const run = (columns: string) =>
    supabase
      .from('tarot_readings')
      .select(columns)
      .eq('user_id', userId)
      .eq('saved', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

  let res = await run(questionColumn === 'absent' ? SAVED_COLUMNS : `${SAVED_COLUMNS}, question`);
  if (res.error && questionColumn !== 'absent' && isMissingQuestionColumn(res.error)) {
    questionColumn = 'absent';
    res = await run(SAVED_COLUMNS);
  } else if (!res.error && questionColumn === 'unknown') {
    questionColumn = 'present';
  }
  const { data, error } = res;
  if (error) {
    captureException('dal.tarotReadings.listSaved', error, { userId });
    return { ok: false, error: error.message };
  }
  return {
    ok: true,
    data: ((data ?? []) as unknown as Record<string, unknown>[]).map(row => ({
      id: row.id as string,
      date: row.date as string,
      spread_type: row.spread_type as string,
      focus_area: (row.focus_area as string | null) ?? null,
      cards: row.cards,
      interpretation: (row.interpretation as string | null) ?? null,
      question: (row.question as string | null | undefined) ?? null,
      created_at: row.created_at as string,
    })),
  };
}

export async function deleteById(id: string, userId: string): Promise<Result<void>> {
  // Belt-and-suspenders: RLS already restricts deletes to the owner.
  // Binding the delete to user_id too means an accidental RLS
  // regression can't let a malicious caller delete someone else's
  // reading by enumerating UUIDs.
  const { error } = await supabase
    .from('tarot_readings')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) {
    captureException('dal.tarotReadings.deleteById', error, { id, userId });
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
  const row = toRow(reading);
  let { error } = await supabase.from('tarot_readings').insert(row);
  if (error && 'question' in row && isMissingQuestionColumn(error)) {
    questionColumn = 'absent';
    ({ error } = await supabase.from('tarot_readings').insert(withoutQuestion(row)));
  } else if (!error && 'question' in row) {
    questionColumn = 'present';
  }
  if (error) {
    captureException('dal.tarotReadings.insert', error, { userId: reading.userId });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: undefined };
}

export async function insertReturningId(
  reading: TarotReadingInsert,
): Promise<Result<{ id: string }>> {
  const row = toRow(reading);
  const run = (r: Record<string, unknown>) =>
    supabase.from('tarot_readings').insert(r).select('id').single();
  let { data, error } = await run(row);
  if (error && 'question' in row && isMissingQuestionColumn(error)) {
    questionColumn = 'absent';
    ({ data, error } = await run(withoutQuestion(row)));
  } else if (!error && 'question' in row) {
    questionColumn = 'present';
  }
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
