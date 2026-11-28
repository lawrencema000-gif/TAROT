/**
 * The day a horoscope reading is for, and the cache row it is kept in.
 *
 * The member's day is the device's calendar date: Home, the ritual, the
 * journal and the Horoscope tabs all count days with localDateStr(). The
 * app sends it as `date`, with the device's IANA zone as `timezone`. The
 * date is trusted only when it is a real calendar date within one day of
 * the UTC date (every zone on Earth, UTC−12 to UTC+14, is); that is the rule
 * ritual_streak(p_today) applies. Otherwise the date in `timezone`, then in
 * the profile's stored zone (installed builds that send neither), then the
 * UTC date.
 *
 * Pure: no Deno or npm imports, so vitest imports it statically
 * (p12 WP-P2-06, home-astro-02).
 */
export type DaySource = "client-date" | "timezone" | "profile-timezone" | "utc";
export interface ReadingDay {
  /** YYYY-MM-DD */
  day: string;
  source: DaySource;
  /** The client's date when it was refused (at most 32 characters). */
  rejected?: string;
}

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A real calendar date (2026-02-30 is not). */
export function isCalendarDate(s: string): boolean {
  const m = YMD.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000);
}

/** The calendar date in `zone` at `now`; null for an unknown zone, or for 'UTC' (the profiles column's default says nothing). */
export function dateInZone(zone: unknown, now: Date): string | null {
  if (typeof zone !== "string" || !zone || zone === "UTC") return null;
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  } catch {
    return null;
  }
}

export function resolveReadingDay(body: { date?: unknown; timezone?: unknown }, now: Date, profileZone?: string | null): ReadingDay {
  const utc = now.toISOString().slice(0, 10);
  let rejected: string | undefined;
  if (typeof body.date === "string") {
    if (isCalendarDate(body.date) && Math.abs(daysBetween(body.date, utc)) <= 1) return { day: body.date, source: "client-date" };
    rejected = body.date.slice(0, 32);
  }
  const fromZone = dateInZone(body.timezone, now);
  if (fromZone) return { day: fromZone, source: "timezone", rejected };
  const fromProfile = dateInZone(profileZone, now);
  if (fromProfile) return { day: fromProfile, source: "profile-timezone", rejected };
  return { day: utc, source: "utc", rejected };
}

/** As resolveReadingDay; the profile's zone is read (one query) only when nothing better came with the request. */
export async function readingDayFor(body: { date?: unknown; timezone?: unknown }, now: Date, profileZone: () => Promise<string | null>): Promise<ReadingDay> {
  const first = resolveReadingDay(body, now);
  if (first.source !== "utc") return first;
  const zone = await profileZone().catch(() => null);
  return zone ? resolveReadingDay(body, now, zone) : first;
}

/** Monday of the week `day` is in (the weekly cache key). */
export function weekStartOf(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  const dow = t.getUTCDay();
  t.setUTCDate(t.getUTCDate() - (dow === 0 ? 6 : dow - 1));
  return t.toISOString().slice(0, 10);
}

/** The first of the month `day` is in (the monthly cache key). */
export function monthStartOf(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

/**
 * astrology_horoscope_cache.type: '<kind>[:<locale>][:r<revision>]', English
 * with no locale part. The table's CHECK (migration
 * *_astrology_cache_type_check.sql) admits exactly this shape for ja, ko and zh.
 */
export function cacheTypeFor(kind: "daily" | "weekly" | "monthly", locale: string, revision?: number): string {
  return (locale === "en" ? kind : `${kind}:${locale}`) + (revision ? `:r${revision}` : "");
}
