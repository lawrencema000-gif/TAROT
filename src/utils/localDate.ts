/**
 * Local-calendar date helpers — for any feature that anchors state to
 * "the user's day" (mood log, daily missions, daily AI message limits,
 * the ritual and its streak, etc).
 *
 * Why this exists: `new Date().toISOString().slice(0, 10)` returns the
 * UTC date, not the user's local date. For users east of UTC midnight at
 * log time (or west of UTC noon-ish for very-late-night users), that
 * day-of-month is one off from what they'd call "today" — and per-day
 * counters / streaks reset at the wrong hour as a result.
 *
 * The daily ritual is keyed by the local date end to end: HomePage writes
 * `localDateStr()` into daily_rituals.date, the ritual cache compares on it,
 * and the server's ritual_streak(p_today) takes it as the argument (and
 * checks it is within a day of the UTC date). The daily, weekly and monthly
 * horoscopes are keyed by the local date too. useAstrology sends
 * `localDateStr()` and `localTimeZone()`, and the server
 * (`supabase/functions/_shared/readingDay.ts`) accepts the date when it lies
 * within a day of the UTC date. A caller that still has to
 * align with a server-side UTC `CURRENT_DATE` column — anything that is not
 * the ritual — should keep using toISOString so client and server agree.
 */

/** Format a Date as YYYY-MM-DD using LOCAL Y/M/D components. */
export function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * The device's IANA time zone — the zone localDateStr counts days in — or
 * null where Intl cannot say. Sent with the horoscope requests beside the
 * date, so the server can still tell the member's day if it refuses the date.
 */
export function localTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/**
 * The local calendar date `n` days before `from` (default now) as
 * YYYY-MM-DD; `n = 0` is today. Steps with setDate, which counts calendar
 * days, so a 23- or 25-hour DST day does not shift the answer the way
 * subtracting n × 24h would.
 */
export function localDaysAgo(n: number, from: Date = new Date()): string {
  const d = new Date(from.getTime());
  d.setDate(d.getDate() - n);
  return localDateStr(d);
}

/** Format yesterday in the user's local calendar as YYYY-MM-DD. */
export function localYesterdayStr(): string {
  return localDaysAgo(1);
}

/**
 * Parse a YYYY-MM-DD string as a LOCAL calendar date (not UTC midnight).
 * Use when reading local-stored date strings back into Date objects;
 * `new Date('2026-04-30')` parses as UTC midnight, which is wrong for
 * local-day grouping in most timezones.
 */
export function parseLocalDate(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  return new Date(y, m - 1, d);
}
