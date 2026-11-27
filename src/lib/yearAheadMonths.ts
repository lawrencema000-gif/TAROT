/**
 * The Year Ahead month list in the app: the module astrology-year-ahead runs
 * (p12 charts-06), so the preview, the card and the report cannot name other
 * months than the server computes. Plus the Intl formatting the page needs.
 */
export {
  MONTH_ISO, YEAR_AHEAD_MONTHS, isMonthIso, addMonths, monthDistance, monthsFrom,
  utcMonthIso, plusMonthsUtc,
} from '../../supabase/functions/astrology-year-ahead/months';

/** The reader's month on this device's clock, 'YYYY-MM'. */
export function localMonthIso(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
const monthDate = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, 15, 12);
/** "Nov 2026" · 2026年11月 · 2026년 11월 · 2026年11月 */
export function formatMonthShort(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(monthDate(iso));
}
/** "November 2026" · 2026年11月 · 2026년 11월 · 2026年11月 */
export function formatMonthLong(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(monthDate(iso));
}
/** A day as the reader's language writes it, in the device's zone: "December 31, 2026" · 2026年12月31日 */
export function formatDayLong(d: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(d);
}
