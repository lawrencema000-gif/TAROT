import type { ConstellationNight } from '../components/celebration/StreakConstellation';

/**
 * Build the nights for the last `days` days ending today, from ritual rows.
 * Days with no row are missed nights. Dates are compared as ISO strings.
 */
export function nightsFromRituals(
  rows: Array<{ date: string; horoscopeViewed: boolean; tarotViewed: boolean; promptViewed: boolean; completed: boolean }>,
  todayIso: string,
  days = 14,
): ConstellationNight[] {
  const byDate = new Map(rows.map((r) => [r.date, r]));
  const out: ConstellationNight[] = [];
  const end = new Date(todayIso + 'T00:00:00Z');
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCDate(end.getUTCDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const row = byDate.get(iso);
    const parts = row ? ((row.horoscopeViewed ? 1 : 0) + (row.tarotViewed ? 1 : 0) + (row.promptViewed ? 1 : 0)) as 0 | 1 | 2 | 3 : 0;
    out.push({ date: iso, parts, completed: !!row?.completed });
  }
  return out;
}
