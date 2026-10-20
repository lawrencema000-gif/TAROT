/**
 * Whole calendar days between two instants in the viewer's time zone:
 * 23:00 yesterday to 08:00 today is 1 ("yesterday"), not 0. Counted on
 * local midnights, so a daylight-saving day of 23 or 25 hours still counts
 * as one.
 */
export function calendarDaysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86_400_000);
}

/** "today" / "yesterday" / "3 days ago" in the viewer's language; a short date beyond a week. */
export function relativeDay(dateStr: string, locale: string, now: Date = new Date()): string {
  const date = new Date(dateStr);
  // A clock a little ahead of the server never reads as "tomorrow".
  const days = Math.max(0, calendarDaysBetween(date, now));
  try {
    if (days < 7) return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-days, 'day');
    return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  } catch {
    return date.toLocaleDateString();
  }
}
