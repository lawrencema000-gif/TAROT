/**
 * The day a stored value names, as a Date to format.
 *
 * Readings carry two kinds of date. The `date` columns (tarot_readings,
 * saved_highlights) and the date-only `d` of an old share link hold a
 * calendar day, 'YYYY-MM-DD': the reader's own day. `new Date()` reads that
 * string as UTC midnight, which is the evening before anywhere west of UTC,
 * so every saved reading in the Americas was listed a day early (p8 F47).
 * Timestamps (`created_at`, a share link's ISO `d`) name an instant, which
 * is shown in the reader's time zone.
 */
import { parseLocalDate } from '../../../utils/localDate';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** 'YYYY-MM-DD' as that local calendar day; anything else as the instant it names. */
export function calendarDay(value: string): Date {
  return DATE_ONLY.test(value) ? parseLocalDate(value) : new Date(value);
}
