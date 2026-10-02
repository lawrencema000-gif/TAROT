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
  // One row per (user, date): daily_rituals_user_id_date_key. Without
  // onConflict PostgREST merged on the primary key, which is a fresh uuid on
  // every call, so every write after the day's first was a 409 (23505) and
  // only the first ritual part ever persisted.
  const { error } = await supabase.from('daily_rituals').upsert(
    {
      user_id: ritual.userId,
      date: ritual.date,
      horoscope_viewed: ritual.horoscopeViewed,
      tarot_viewed: ritual.tarotViewed,
      prompt_viewed: ritual.promptViewed,
      completed: ritual.completed,
    },
    { onConflict: 'user_id,date' },
  );
  if (error) {
    captureException('dal.dailyRituals.upsert', error, { userId: ritual.userId, date: ritual.date });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: undefined };
}

export interface StreakSync {
  /** Consecutive local days with a completed ritual, ending today or yesterday. */
  streak: number;
  /** profiles.streak as it stood before this call; milestones are awarded by crossing. */
  previousStreak: number;
  /** The last completed ritual (YYYY-MM-DD), or null if there is none. */
  lastCompleted: string | null;
}

/**
 * Recompute the streak from the rows and write it to the profile, server
 * side: public.ritual_streak(p_today) (migration 20260928000000). `todayLocal`
 * is the user's local calendar date (localDateStr) — the same basis the
 * ritual rows are keyed on; the server rejects a date more than a day from
 * UTC. Called on app open so a broken streak shows as broken, and after the
 * upsert that completes a ritual so the new number and the constellation
 * agree.
 */
export async function syncStreak(todayLocal: string): Promise<Result<StreakSync>> {
  // AuthContext awaits this inside fetchProfile, whose in-flight guard is
  // only released on the way out: a thrown fetch error (offline, aborted)
  // must come back as a Result, never as a rejection.
  let data: unknown;
  try {
    const res = await supabase.rpc('ritual_streak', { p_today: todayLocal });
    if (res.error) {
      captureException('dal.dailyRituals.syncStreak', res.error, { todayLocal });
      return { ok: false, error: res.error.message };
    }
    data = res.data;
  } catch (err) {
    captureException('dal.dailyRituals.syncStreak', err, { todayLocal });
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  const row = (Array.isArray(data) ? data[0] : data) as
    | { streak?: number | null; previous_streak?: number | null; last_completed?: string | null }
    | null
    | undefined;
  if (!row) {
    captureException('dal.dailyRituals.syncStreak', new Error('ritual_streak returned no row'), { todayLocal });
    return { ok: false, error: 'ritual_streak returned no row' };
  }
  return {
    ok: true,
    data: {
      streak: Number(row.streak ?? 0),
      previousStreak: Number(row.previous_streak ?? 0),
      lastCompleted: row.last_completed ? String(row.last_completed) : null,
    },
  };
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
