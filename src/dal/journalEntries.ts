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
  const { error } = await supabase
    .from('journal_entries')
    .update(toDbShape(input))
    .eq('id', id);
  if (error) {
    captureException('dal.journalEntries.updateById', error, { id, userId: input.userId });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: undefined };
}

export async function deleteById(id: string): Promise<Result<void>> {
  const { error } = await supabase.from('journal_entries').delete().eq('id', id);
  if (error) {
    captureException('dal.journalEntries.deleteById', error, { id });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: undefined };
}
