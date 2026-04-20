import { supabase } from '../lib/supabase';
import { captureException } from '../utils/telemetry';
import type { Result } from './dailyRituals';

export interface ContentInteractionInsert {
  userId: string;
  contentType?: string;
  contentId: string | null;
  interactionType: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

export interface ContentInteractionRow {
  id: string;
  user_id: string;
  content_type: string;
  content_id: string | null;
  interaction_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

function toDbRow(input: ContentInteractionInsert): Record<string, unknown> {
  const row: Record<string, unknown> = {
    user_id: input.userId,
    content_id: input.contentId,
    interaction_type: input.interactionType,
    metadata: input.metadata ?? {},
  };
  if (input.contentType !== undefined) row.content_type = input.contentType;
  if (input.createdAt) row.created_at = input.createdAt;
  return row;
}

export async function insert(input: ContentInteractionInsert): Promise<Result<void>> {
  const { error } = await supabase.from('content_interactions').insert(toDbRow(input));
  if (error) {
    captureException('dal.contentInteractions.insert', error, {
      userId: input.userId,
      contentType: input.contentType,
    });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: undefined };
}

export async function insertMany(
  inputs: ContentInteractionInsert[],
): Promise<Result<void>> {
  if (inputs.length === 0) return { ok: true, data: undefined };
  const { error } = await supabase
    .from('content_interactions')
    .insert(inputs.map(toDbRow));
  if (error) {
    captureException('dal.contentInteractions.insertMany', error, { count: inputs.length });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: undefined };
}

export async function listRecent(
  userId: string,
  options: {
    sinceIso: string;
    interactionType?: string;
    contentType?: string;
    range?: [number, number];
  },
): Promise<Result<ContentInteractionRow[]>> {
  const { sinceIso, interactionType, contentType, range = [0, 99] } = options;
  let query = supabase
    .from('content_interactions')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })
    .range(range[0], range[1]);

  if (interactionType) query = query.eq('interaction_type', interactionType);
  if (contentType) query = query.eq('content_type', contentType);

  const { data, error } = await query;
  if (error) {
    captureException('dal.contentInteractions.listRecent', error, {
      userId,
      interactionType,
      contentType,
    });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: (data as ContentInteractionRow[]) ?? [] };
}
