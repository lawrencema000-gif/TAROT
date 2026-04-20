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
