/**
 * The months a Year Ahead report covers (p12 charts-06). One list drives the
 * paywall preview, the card title, the report's eyebrow and month headers,
 * and the server's content, so what is sold is what is computed.
 *
 * Month arithmetic is integer arithmetic on year * 12 + month. Never
 * Date#setUTCMonth on a date that has a day of month: from the 29th to the
 * 31st it overflows (2027-01-31 plus one month is 2027-03-03), and the old
 * loop (index.ts before this change) listed 2027-03 twice and 2027-02 never.
 *
 * No imports: Deno (the Edge Function) and the app (src/lib/yearAheadMonths.ts)
 * both load this file.
 */
export const MONTH_ISO = /^(\d{4})-(0[1-9]|1[0-2])$/;
export const YEAR_AHEAD_MONTHS = 12;

export function isMonthIso(s: unknown): s is string {
  return typeof s === "string" && MONTH_ISO.test(s);
}
function index(iso: string): number {
  const m = MONTH_ISO.exec(iso);
  if (!m) throw new RangeError(`not a YYYY-MM month: ${iso}`);
  return Number(m[1]) * 12 + Number(m[2]) - 1;
}
function fromIndex(k: number): string {
  return `${String(Math.floor(k / 12)).padStart(4, "0")}-${String((k % 12) + 1).padStart(2, "0")}`;
}
/** `iso` moved by `n` months (n may be negative). */
export function addMonths(iso: string, n: number): string {
  return fromIndex(index(iso) + n);
}
/** Months from `a` to `b`: 0 for the same month, 1 for the next. */
export function monthDistance(a: string, b: string): number {
  return index(b) - index(a);
}
/** `count` consecutive months starting with `from`. */
export function monthsFrom(from: string, count = YEAR_AHEAD_MONTHS): string[] {
  const k = index(from);
  return Array.from({ length: count }, (_, i) => fromIndex(k + i));
}
/** The UTC month of an instant. */
export function utcMonthIso(d: Date): string {
  return d.toISOString().slice(0, 7);
}
/**
 * The month a rolling report starts with: the reader's own month when the
 * request names one that is the current month somewhere (the UTC month or one
 * either side: a local date is never more than a day from the UTC date),
 * otherwise the UTC month. Pages from before this change send none.
 */
export function startMonthFor(requested: unknown, now: Date): string {
  const utc = utcMonthIso(now);
  return isMonthIso(requested) && Math.abs(monthDistance(utc, requested)) <= 1 ? requested : utc;
}
/** 12:00 UTC on the first day of `iso` (the walk samples each day at noon UTC, as before). */
export function firstNoonUtc(iso: string): Date {
  const k = index(iso);
  return new Date(Date.UTC(Math.floor(k / 12), k % 12, 1, 12));
}
/** 12:00 UTC on the last day of `iso`. */
export function lastNoonUtc(iso: string): Date {
  const k = index(iso);
  return new Date(Date.UTC(Math.floor(k / 12), (k % 12) + 1, 0, 12));
}
/**
 * The days a report walks, at noon UTC: from the first day of its first month
 * (or from the day of `notBefore`, when that is later) to the last day of its
 * last month. Nothing outside the listed months is computed.
 */
export function walkDays(months: readonly string[], notBefore?: Date): Date[] {
  let t = firstNoonUtc(months[0]).getTime();
  if (notBefore) {
    t = Math.max(
      t,
      Date.UTC(notBefore.getUTCFullYear(), notBefore.getUTCMonth(), notBefore.getUTCDate(), 12),
    );
  }
  const end = lastNoonUtc(months[months.length - 1]).getTime();
  const out: Date[] = [];
  for (; t <= end; t += 86_400_000) out.push(new Date(t));
  return out;
}
/** `d` plus `n` calendar months in UTC, the day clamped to the month's last day (Postgres `+ interval 'n months'` in UTC). */
export function plusMonthsUtc(d: Date, n: number): Date {
  const k = d.getUTCFullYear() * 12 + d.getUTCMonth() + n;
  const y = Math.floor(k / 12), m = k % 12;
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(
    Date.UTC(
      y, m, Math.min(d.getUTCDate(), last),
      d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds(),
    ),
  );
}
