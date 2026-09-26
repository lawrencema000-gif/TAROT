import { supabase } from '../lib/supabase';
import { captureException } from '../utils/telemetry';

export interface DailyRitual {
  horoscopeViewed: boolean;
  tarotViewed: boolean;
  promptViewed: boolean;
  completed: boolean;
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export async function getByDate(
  userId: string,
  date: string,
): Promise<Result<DailyRitual | null>> {
  const { data, error } = await supabase
    .from('daily_rituals')
    .select('horoscope_viewed, tarot_viewed, prompt_viewed, completed')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();

  if (error) {
    captureException('dal.dailyRituals.getByDate', error, { userId, date });
    return { ok: false, error: error.message };
  }
  if (!data) return { ok: true, data: null };
  return {
    ok: true,
    data: {
      horoscopeViewed: !!data.horoscope_viewed,
      tarotViewed: !!data.tarot_viewed,
      promptViewed: !!data.prompt_viewed,
      completed: !!data.completed,
    },
  };
}

export interface DailyRitualDay extends DailyRitual {
  /** ISO date (YYYY-MM-DD), as stored. */
  date: string;
}

/**
 * Every ritual row in a date range, oldest first. The streak constellation
 * draws from this: one star per night, lit by how much of the ritual was
 * done. The table has had this history since the first release; nothing
 * read it back until now.
 */
export async function listRange(
  userId: string,
  from: string,
  to: string,
): Promise<Result<DailyRitualDay[]>> {
  const { data, error } = await supabase
    .from('daily_rituals')
    .select('date, horoscope_viewed, tarot_viewed, prompt_viewed, completed')
    .eq('user_id', userId)
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true });

  if (error) {
    captureException('dal.dailyRituals.listRange', error, { userId, from, to });
    return { ok: false, error: error.message };
  }
  return {
    ok: true,
    data: (data ?? []).map((r) => ({
      date: String(r.date),
      horoscopeViewed: !!r.horoscope_viewed,
      tarotViewed: !!r.tarot_viewed,
      promptViewed: !!r.prompt_viewed,
      completed: !!r.completed,
    })),
  };
}

export interface DailyRitualUpsert {
  userId: string;
  date: string;
  horoscopeViewed: boolean;
  tarotViewed: boolean;
  promptViewed: boolean;
  completed: boolean;
}

export async function upsert(ritual: DailyRitualUpsert): Promise<Result<void>> {
  const { error } = await supabase.from('daily_rituals').upsert({
    user_id: ritual.userId,
    date: ritual.date,
    horoscope_viewed: ritual.horoscopeViewed,
    tarot_viewed: ritual.tarotViewed,
    prompt_viewed: ritual.promptViewed,
    completed: ritual.completed,
  });
  if (error) {
    captureException('dal.dailyRituals.upsert', error, { userId: ritual.userId, date: ritual.date });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: undefined };
}

export async function countForUser(userId: string): Promise<Result<number>> {
  const { count, error } = await supabase
    .from('daily_rituals')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (error) {
    captureException('dal.dailyRituals.countForUser', error, { userId });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: count ?? 0 };
}
