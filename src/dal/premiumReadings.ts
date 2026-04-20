import { supabase } from '../lib/supabase';
import { captureException } from '../utils/telemetry';
import type { Result } from './dailyRituals';

export interface PremiumReadingCard {
  id: number;
  name: string;
  reversed: boolean;
}

export interface PremiumReadingRow {
  id: string;
  userId: string;
  readingType: string;
  context: Record<string, unknown>;
  content: string;
  cards: PremiumReadingCard[];
  createdAt: string;
}

export interface PremiumReadingInsert {
  userId: string;
  readingType: string;
  content: string;
  context: Record<string, unknown>;
  cards: PremiumReadingCard[];
}

function mapRow(r: Record<string, unknown>): PremiumReadingRow {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    readingType: r.reading_type as string,
    context: (r.context as Record<string, unknown>) ?? {},
    content: r.content as string,
    cards: (r.cards as PremiumReadingCard[]) ?? [],
    createdAt: r.created_at as string,
  };
}

export async function insert(
  reading: PremiumReadingInsert,
): Promise<Result<PremiumReadingRow>> {
  const { data, error } = await supabase
    .from('premium_readings')
    .insert({
      user_id: reading.userId,
      reading_type: reading.readingType,
      content: reading.content,
      context: reading.context,
      cards: reading.cards,
    })
    .select()
    .single();

  if (error || !data) {
    captureException(
      'dal.premiumReadings.insert',
      error ?? new Error('no data'),
      { userId: reading.userId, readingType: reading.readingType },
    );
    return { ok: false, error: error?.message ?? 'no data' };
  }
  return { ok: true, data: mapRow(data as Record<string, unknown>) };
}

export async function listRawForUser(
  userId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<Result<{ id: string; reading_type: string; content: string; context: Record<string, unknown>; cards: PremiumReadingCard[]; created_at: string }[]>> {
  const { limit = 20, offset = 0 } = options;
  const { data, error } = await supabase
    .from('premium_readings')
    .select('id, reading_type, content, context, cards, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) {
    captureException('dal.premiumReadings.listRawForUser', error, { userId });
    return { ok: false, error: error.message };
  }
  return {
    ok: true,
    data: (data ?? []).map(r => {
      const row = r as Record<string, unknown>;
      return {
        id: row.id as string,
        reading_type: row.reading_type as string,
        content: row.content as string,
        context: (row.context as Record<string, unknown>) ?? {},
        cards: (row.cards as PremiumReadingCard[]) ?? [],
        created_at: row.created_at as string,
      };
    }),
  };
}

export async function deleteByIdOnly(id: string): Promise<Result<void>> {
  const { error } = await supabase.from('premium_readings').delete().eq('id', id);
  if (error) {
    captureException('dal.premiumReadings.deleteByIdOnly', error, { id });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: undefined };
}

export async function listForUser(
  userId: string,
  limit = 20,
): Promise<Result<PremiumReadingRow[]>> {
  const { data, error } = await supabase
    .from('premium_readings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    captureException('dal.premiumReadings.listForUser', error, { userId });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: ((data ?? []) as Record<string, unknown>[]).map(mapRow) };
}

export async function getById(
  userId: string,
  readingId: string,
): Promise<Result<PremiumReadingRow | null>> {
  const { data, error } = await supabase
    .from('premium_readings')
    .select('*')
    .eq('id', readingId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    captureException('dal.premiumReadings.getById', error, { userId, readingId });
    return { ok: false, error: error.message };
  }
  return {
    ok: true,
    data: data ? mapRow(data as Record<string, unknown>) : null,
  };
}

export async function deleteById(
  userId: string,
  readingId: string,
): Promise<Result<void>> {
  const { error } = await supabase
    .from('premium_readings')
    .delete()
    .eq('id', readingId)
    .eq('user_id', userId);
  if (error) {
    captureException('dal.premiumReadings.deleteById', error, { userId, readingId });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: undefined };
}
