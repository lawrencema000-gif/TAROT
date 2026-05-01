/**
 * Local-calendar date helpers — for any feature that anchors state to
 * "the user's day" (mood log, daily missions, daily AI message limits,
 * streak counters, etc).
 *
 * Why this exists: `new Date().toISOString().slice(0, 10)` returns the
 * UTC date, not the user's local date. For users east of UTC midnight at
 * log time (or west of UTC noon-ish for very-late-night users), that
 * day-of-month is one off from what they'd call "today" — and per-day
 * counters / streaks reset at the wrong hour as a result.
 *
 * Callers that need to align with a server-side UTC `CURRENT_DATE`
 * column should NOT use this — they should keep using toISOString
 * so client and server agree. This helper is for *client-only* state
 * (localStorage keys, local UI groupings, mood-curve x-axis, etc).
 */

/** Format a Date as YYYY-MM-DD using LOCAL Y/M/D components. */
export function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Format yesterday in the user's local calendar as YYYY-MM-DD. */
export function localYesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return localDateStr(d);
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
