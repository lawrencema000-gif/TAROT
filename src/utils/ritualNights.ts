import type { ConstellationNight } from '../components/celebration/StreakConstellation';

/**
 * The ritual record, read two ways: as the nights the constellation draws,
 * and as the streak those nights make.
 *
 * Every date here is a local calendar date as YYYY-MM-DD — the basis
 * daily_rituals.date is written on (see localDateStr). The arithmetic steps
 * ISO strings through Date.UTC, which is plain calendar counting: it never
 * sees the machine's timezone or a DST change, so "the day before
 * 2026-03-29" is 2026-03-28 everywhere.
 */

/** The ISO date `days` after `iso` (negative for before). */
function shiftIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/**
 * Build the nights for the last `days` days ending today, from ritual rows.
 * Days with no row are missed nights.
 */
export function nightsFromRituals(
  rows: Array<{ date: string; horoscopeViewed: boolean; tarotViewed: boolean; promptViewed: boolean; completed: boolean }>,
  todayIso: string,
  days = 14,
): ConstellationNight[] {
  const byDate = new Map(rows.map((r) => [r.date, r]));
  const out: ConstellationNight[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const iso = shiftIso(todayIso, -i);
    const row = byDate.get(iso);
    const parts = row ? ((row.horoscopeViewed ? 1 : 0) + (row.tarotViewed ? 1 : 0) + (row.promptViewed ? 1 : 0)) as 0 | 1 | 2 | 3 : 0;
    out.push({ date: iso, parts, completed: !!row?.completed });
  }
  return out;
}

export interface StreakFromNights {
  /** Consecutive days with a completed ritual, ending today or yesterday; 0 if broken or none. */
  streak: number;
  /** The last completed ritual on or before today, or null if there is none. */
  lastCompleted: string | null;
}

/**
 * The one definition of the streak, as the server computes it in
 * public.ritual_streak(p_today): the number of consecutive local calendar
 * days, ending today or yesterday, on which the ritual was completed. A
 * partial night (some of the three parts) does not count; a run that ended
 * before yesterday is broken and reads 0. Rows dated after today are
 * ignored. Both sides are pinned by src/test/golden/streak.test.ts.
 */
export function streakFromNights(
  rows: ReadonlyArray<{ date: string; completed: boolean }>,
  todayIso: string,
): StreakFromNights {
  const done = new Set<string>();
  let last: string | null = null;
  for (const r of rows) {
    if (!r.completed || r.date > todayIso) continue;
    done.add(r.date);
    if (last === null || r.date > last) last = r.date;
  }
  if (last === null) return { streak: 0, lastCompleted: null };
  if (last !== todayIso && last !== shiftIso(todayIso, -1)) return { streak: 0, lastCompleted: last };

  let streak = 0;
  for (let d = last; done.has(d); d = shiftIso(d, -1)) streak++;
  return { streak, lastCompleted: last };
}
