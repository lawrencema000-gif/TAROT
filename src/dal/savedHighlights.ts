import { supabase } from '../lib/supabase';
import { captureException } from '../utils/telemetry';
import type { Result } from './dailyRituals';

export type HighlightType = 'horoscope' | 'tarot' | 'prompt' | 'reading' | 'card' | 'spread';

export interface SavedHighlightRow {
  id: string;
  userId: string;
  highlightType: HighlightType;
  date: string;
  content: Record<string, unknown>;
  createdAt: string;
}

export interface SavedHighlightInsert {
  userId: string;
  date: string;
  highlightType: HighlightType;
  content: Record<string, unknown>;
}

function mapRow(row: Record<string, unknown>): SavedHighlightRow {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    highlightType: row.highlight_type as HighlightType,
    date: row.date as string,
    content: (row.content as Record<string, unknown>) ?? {},
    createdAt: row.created_at as string,
  };
}

export async function insert(highlight: SavedHighlightInsert): Promise<Result<void>> {
  const { error } = await supabase.from('saved_highlights').insert({
    user_id: highlight.userId,
    date: highlight.date,
    highlight_type: highlight.highlightType,
    content: highlight.content,
  });
  if (error) {
    captureException('dal.savedHighlights.insert', error, {
      userId: highlight.userId,
      highlightType: highlight.highlightType,
    });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: undefined };
}

export async function insertReturningId(
  highlight: SavedHighlightInsert,
): Promise<Result<{ id: string }>> {
  const { data, error } = await supabase
    .from('saved_highlights')
    .insert({
      user_id: highlight.userId,
      date: highlight.date,
      highlight_type: highlight.highlightType,
      content: highlight.content,
    })
    .select('id')
    .single();
  if (error || !data) {
    captureException('dal.savedHighlights.insertReturningId', error ?? new Error('no data'), {
      userId: highlight.userId,
      highlightType: highlight.highlightType,
    });
    return { ok: false, error: error?.message ?? 'no data' };
  }
  return { ok: true, data: { id: data.id as string } };
}

export async function deleteByTypeAndDate(
  userId: string,
  highlightType: HighlightType,
  date: string,
): Promise<Result<void>> {
  const { error } = await supabase
    .from('saved_highlights')
    .delete()
    .eq('user_id', userId)
    .eq('date', date)
    .eq('highlight_type', highlightType);
  if (error) {
    captureException('dal.savedHighlights.deleteByTypeAndDate', error, {
      userId,
      highlightType,
      date,
    });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: undefined };
}

export async function deleteByItem(
  userId: string,
  highlightType: HighlightType,
  itemId: string,
): Promise<Result<void>> {
  const { error } = await supabase
    .from('saved_highlights')
    .delete()
    .eq('user_id', userId)
    .eq('highlight_type', highlightType)
    .eq('content->>itemId', itemId);
  if (error) {
    captureException('dal.savedHighlights.deleteByItem', error, {
      userId,
      highlightType,
      itemId,
    });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: undefined };
}

export async function findByItem(
  userId: string,
  highlightType: HighlightType,
  itemId: string,
): Promise<Result<{ id: string } | null>> {
  const { data, error } = await supabase
    .from('saved_highlights')
    .select('id')
    .eq('user_id', userId)
    .eq('highlight_type', highlightType)
    .eq('content->>itemId', itemId)
    .maybeSingle();
  if (error) {
    captureException('dal.savedHighlights.findByItem', error, {
      userId,
      highlightType,
      itemId,
    });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: data ? { id: data.id as string } : null };
}

export async function listForUserDate(
  userId: string,
  date: string,
): Promise<Result<{ id: string; highlightType: HighlightType; content: Record<string, unknown>; createdAt: string }[]>> {
  const { data, error } = await supabase
    .from('saved_highlights')
    .select('id, highlight_type, content, created_at')
    .eq('user_id', userId)
    .eq('date', date);
  if (error) {
    captureException('dal.savedHighlights.listForUserDate', error, { userId, date });
    return { ok: false, error: error.message };
  }
  return {
    ok: true,
    data: (data ?? []).map(r => {
      const row = r as Record<string, unknown>;
      return {
        id: row.id as string,
        highlightType: row.highlight_type as HighlightType,
        content: (row.content as Record<string, unknown>) ?? {},
        createdAt: row.created_at as string,
      };
    }),
  };
}

export async function listRawForUser(
  userId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<Result<{ id: string; date: string; highlight_type: string; content: Record<string, unknown>; created_at: string }[]>> {
  const { limit = 20, offset = 0 } = options;
  const { data, error } = await supabase
    .from('saved_highlights')
    .select('id, date, highlight_type, content, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) {
    captureException('dal.savedHighlights.listRawForUser', error, { userId });
    return { ok: false, error: error.message };
  }
  return {
    ok: true,
    data: (data ?? []).map(r => {
      const row = r as Record<string, unknown>;
      return {
        id: row.id as string,
        date: row.date as string,
        highlight_type: row.highlight_type as string,
        content: (row.content as Record<string, unknown>) ?? {},
        created_at: row.created_at as string,
      };
    }),
  };
}

export async function deleteById(id: string): Promise<Result<void>> {
  const { error } = await supabase.from('saved_highlights').delete().eq('id', id);
  if (error) {
    captureException('dal.savedHighlights.deleteById', error, { id });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: undefined };
}

export async function listForUser(
  userId: string,
  options: { highlightType?: HighlightType; limit?: number; offset?: number } = {},
): Promise<Result<SavedHighlightRow[]>> {
  const { highlightType, limit = 50, offset = 0 } = options;
  let query = supabase
    .from('saved_highlights')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (highlightType) {
    query = query.eq('highlight_type', highlightType);
  }

  const { data, error } = await query;
  if (error) {
    captureException('dal.savedHighlights.listForUser', error, { userId, highlightType });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: (data ?? []).map(mapRow) };
}

export async function getContentById(
  userId: string,
  id: string,
): Promise<Result<Record<string, unknown> | null>> {
  const { data, error } = await supabase
    .from('saved_highlights')
    .select('content')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    captureException('dal.savedHighlights.getContentById', error, { userId, id });
    return { ok: false, error: error.message };
  }
  return {
    ok: true,
    data: data ? ((data.content as Record<string, unknown>) ?? {}) : null,
  };
}

export async function updateContentById(
  userId: string,
  id: string,
  content: Record<string, unknown>,
): Promise<Result<void>> {
  const { error } = await supabase
    .from('saved_highlights')
    .update({ content })
    .eq('id', id)
    .eq('user_id', userId);
  if (error) {
    captureException('dal.savedHighlights.updateContentById', error, { userId, id });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: undefined };
}

export async function upsertMany(
  rows: SavedHighlightInsert[],
  options: { onConflict?: string } = {},
): Promise<Result<void>> {
  if (rows.length === 0) return { ok: true, data: undefined };
  const dbRows = rows.map(r => ({
    user_id: r.userId,
    date: r.date,
    highlight_type: r.highlightType,
    content: r.content,
  }));
  const { error } = await supabase
    .from('saved_highlights')
    .upsert(dbRows, options.onConflict ? { onConflict: options.onConflict } : undefined)
    .select('id');
  if (error) {
    captureException('dal.savedHighlights.upsertMany', error, { count: rows.length });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: undefined };
}
