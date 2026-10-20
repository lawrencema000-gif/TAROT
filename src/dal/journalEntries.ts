import { supabase } from '../lib/supabase';
import { captureException } from '../utils/telemetry';
import type { Result } from './dailyRituals';

// Raw DB-shape row — keeps snake_case since callers currently destructure db fields.
// Phase 2 will add a mapped camelCase type via zod.
export interface JournalEntryRow {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  mood: string | null;
  mood_tags: string[] | null;
  tags: string[] | null;
  prompt: string | null;
  date: string;
  linked_reading_id: string | null;
  is_locked: boolean | null;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface JournalEntryInput {
  userId: string;
  title: string;
  content: string;
  mood: string | null;
  moodTags: string[];
  tags: string[];
  prompt: string | null;
  date: string;
  linkedReadingId: string | null;
  isLocked: boolean;
}

function toDbShape(input: JournalEntryInput): Record<string, unknown> {
  return {
    user_id: input.userId,
    title: input.title,
    content: input.content,
    mood: input.mood,
    mood_tags: input.moodTags,
    tags: input.tags,
    prompt: input.prompt,
    date: input.date,
    linked_reading_id: input.linkedReadingId,
    is_locked: input.isLocked,
  };
}

export async function listForUser(
  userId: string,
  options: { limit: number; offset?: number } = { limit: 30 },
): Promise<Result<JournalEntryRow[]>> {
  const { limit, offset = 0 } = options;
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    captureException('dal.journalEntries.listForUser', error, { userId });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: (data as JournalEntryRow[]) ?? [] };
}

/**
 * One of the member's entries, by id; null when there is none (deleted
 * since). The header search finds entries older than the page the journal
 * holds, and opens them by id. Bound to the member as updateById is, on top
 * of RLS.
 */
export async function getById(id: string, userId: string): Promise<Result<JournalEntryRow | null>> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    captureException('dal.journalEntries.getById', error, { id, userId });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: (data as JournalEntryRow | null) ?? null };
}

/**
 * Every entry dated within [from, to] (inclusive YYYY-MM-DD). The journal's
 * week strip reads this for the week on screen: the paged list only holds
 * the newest 20, so an older week showed no dots and tapping a written day
 * opened a blank editor that saved a duplicate (P7 #54).
 */
export async function listInRange(userId: string, from: string, to: string): Promise<Result<JournalEntryRow[]>> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: false });

  if (error) {
    captureException('dal.journalEntries.listInRange', error, { userId });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: (data as JournalEntryRow[]) ?? [] };
}

/** Lean rows for the Insights tab: every entry, only the fields the stats read. */
export async function listForInsights(userId: string): Promise<Result<JournalEntryRow[]>> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('id, user_id, date, mood, tags, content, created_at, updated_at')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) {
    captureException('dal.journalEntries.listForInsights', error, { userId });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: (data as JournalEntryRow[]) ?? [] };
}

export async function listAllForUser(userId: string): Promise<Result<JournalEntryRow[]>> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    captureException('dal.journalEntries.listAllForUser', error, { userId });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: (data as JournalEntryRow[]) ?? [] };
}

export async function insert(input: JournalEntryInput): Promise<Result<void>> {
  const { error } = await supabase.from('journal_entries').insert(toDbShape(input));
  if (error) {
    captureException('dal.journalEntries.insert', error, { userId: input.userId });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: undefined };
}

export async function updateById(
  id: string,
  input: JournalEntryInput,
): Promise<Result<void>> {
  // Belt-and-suspenders: RLS already restricts writes to the owner,
  // but we additionally bind the update to the input.userId so that
  // an accidental RLS regression (policy set to `true`, table
  // restored without policies, etc.) can't let a malicious caller
  // overwrite someone else's row by knowing or guessing its UUID.
  const { error } = await supabase
    .from('journal_entries')
    .update(toDbShape(input))
    .eq('id', id)
    .eq('user_id', input.userId);
  if (error) {
    captureException('dal.journalEntries.updateById', error, { id, userId: input.userId });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: undefined };
}

export async function deleteById(id: string, userId: string): Promise<Result<void>> {
  // Same ownership guard as updateById above — defence-in-depth.
  const { error } = await supabase
    .from('journal_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) {
    captureException('dal.journalEntries.deleteById', error, { id, userId });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: undefined };
}
