// Mood entries DAL — the daily mood log, one row per user per local date.
//
// The diary lived in localStorage only (R6 A14): lost on reinstall, absent
// from the account export, invisible to the AI letter on a second device.
// This module is the record; `data/moodDiary.ts` keeps the local cache and
// is the fallback when the table is unreachable (offline, or the migration
// not yet applied), so the page never loses a day either way.

import { supabase } from '../lib/supabase';
import { captureException } from '../utils/telemetry';
import type { Result } from './dailyRituals';
import { isMoodCategory, type MoodEntry } from '../data/moodDiary';

export interface MoodEntryRow {
  id: string;
  user_id: string;
  date: string;
  mood: string;
  intensity: number;
  note: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * True when the failure means "no record to reach" rather than "bad write":
 * the table is missing from PostgREST's schema cache (migration not applied
 * yet), the relation does not exist, or the request never left the device.
 * The page treats these as offline and keeps the local copy authoritative.
 */
export function isUnavailable(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('schema cache') ||
    m.includes('pgrst205') ||
    m.includes('does not exist') ||
    m.includes('failed to fetch') ||
    m.includes('networkerror') ||
    m.includes('network request failed') ||
    m.includes('load failed')
  );
}

function toEntry(row: MoodEntryRow): MoodEntry | null {
  if (!isMoodCategory(row.mood)) return null;
  const intensity = Math.min(5, Math.max(1, Math.round(row.intensity))) as 1 | 2 | 3 | 4 | 5;
  return {
    date: row.date,
    category: row.mood,
    intensity,
    note: row.note ?? undefined,
    savedAt: new Date(row.updated_at || row.created_at).getTime(),
  };
}

function toRow(userId: string, entry: Omit<MoodEntry, 'savedAt'>): Record<string, unknown> {
  return {
    user_id: userId,
    date: entry.date,
    mood: entry.category,
    intensity: entry.intensity,
    note: entry.note?.trim() ? entry.note.trim().slice(0, 200) : null,
  };
}

/** Every entry for the user, oldest first. The curve reads 30 days; the letter reads 14. */
export async function listForUser(userId: string): Promise<Result<MoodEntry[]>> {
  const { data, error } = await supabase
    .from('mood_entries')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: true });

  if (error) {
    if (!isUnavailable(error.message)) captureException('dal.moodEntries.listForUser', error, { userId });
    return { ok: false, error: error.message };
  }
  const entries: MoodEntry[] = [];
  for (const row of (data as MoodEntryRow[]) ?? []) {
    const e = toEntry(row);
    if (e) entries.push(e);
  }
  return { ok: true, data: entries };
}

/** Insert or replace the user's entry for that date (UNIQUE (user_id, date)). */
export async function upsert(userId: string, entry: Omit<MoodEntry, 'savedAt'>): Promise<Result<MoodEntry>> {
  const { data, error } = await supabase
    .from('mood_entries')
    .upsert(toRow(userId, entry), { onConflict: 'user_id,date' })
    .select()
    .single();

  if (error) {
    if (!isUnavailable(error.message)) captureException('dal.moodEntries.upsert', error, { userId, date: entry.date });
    return { ok: false, error: error.message };
  }
  const saved = toEntry(data as MoodEntryRow);
  if (!saved) return { ok: false, error: 'Row came back with an unknown mood' };
  return { ok: true, data: saved };
}

/**
 * Upload a batch — the one-time move of a device's localStorage history
 * into the account. Dates already on the server are replaced only when the
 * local copy is the one the user wrote (the caller passes device-only rows).
 */
export async function upsertMany(userId: string, entries: Omit<MoodEntry, 'savedAt'>[]): Promise<Result<number>> {
  if (entries.length === 0) return { ok: true, data: 0 };
  const { error } = await supabase
    .from('mood_entries')
    .upsert(entries.map((e) => toRow(userId, e)), { onConflict: 'user_id,date' });

  if (error) {
    if (!isUnavailable(error.message)) captureException('dal.moodEntries.upsertMany', error, { userId, n: entries.length });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: entries.length };
}
