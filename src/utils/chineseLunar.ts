/**
 * Chinese lunisolar calendar, computed from real ephemeris.
 *
 * Zi Wei Dou Shu places every star from the LUNAR month and day, so the whole
 * chart is only as good as this conversion. Rather than ship a lookup table
 * (which silently expires and is the classic source of "the app says my chart
 * is wrong"), we implement the actual rules of the modern Chinese calendar
 * with astronomy-engine:
 *
 *   1. A lunar month begins on the DAY (China Standard Time, UTC+8) that
 *      contains a new moon.
 *   2. Month 11 is, by definition, the month containing the winter solstice
 *      (冬至 — Sun at ecliptic longitude 270°).
 *   3. Between one month 11 and the next there are 12 or 13 lunar months.
 *      When there are 13, the year is a leap year and the leap month is the
 *      FIRST month that contains no 中氣 (major solar term — Sun at a multiple
 *      of 30°). A leap month repeats the preceding month's number.
 *
 * All calendar-day comparisons happen in China Standard Time, which is the
 * civil convention the calendar is defined against.
 */

import * as Astronomy from 'astronomy-engine';

const CST_OFFSET_MS = 8 * 3600 * 1000;
const DAY_MS = 86400000;

export interface LunarDate {
  /** Lunar year (the year whose month 1 the date belongs to). */
  year: number;
  /** Lunar month 1-12. A leap month carries the number it repeats. */
  month: number;
  /** True when this is the intercalary (閏) month. */
  isLeapMonth: boolean;
  /** Lunar day 1-30. */
  day: number;
  /** Gregorian date (UTC) on which this lunar month began. */
  monthStart: Date;
}

/** Days since epoch in China Standard Time — our unit for "calendar day". */
function cstDayNumber(d: Date): number {
  return Math.floor((d.getTime() + CST_OFFSET_MS) / DAY_MS);
}

/** Midnight CST of a given CST day number, expressed as a UTC instant. */
function cstDayToUtc(dayNum: number): Date {
  return new Date(dayNum * DAY_MS - CST_OFFSET_MS);
}

/** New moon instants from `start`, `count` of them, as CST day numbers. */
function newMoonDays(start: Date, count: number): number[] {
  const out: number[] = [];
  let search = new Date(start.getTime());
  for (let i = 0; i < count; i++) {
    const t = Astronomy.SearchMoonPhase(0, search, 40);
    if (!t) break;
    out.push(cstDayNumber(t.date));
    // Step past this new moon (synodic month ~29.53 d) before searching again.
    search = new Date(t.date.getTime() + 2 * DAY_MS);
  }
  return out;
}

/** The winter solstice (Sun at 270°) of a given Gregorian year. */
export function winterSolstice(year: number): Date {
  const t = Astronomy.SearchSunLongitude(270, new Date(Date.UTC(year, 11, 1)), 40);
  if (!t) throw new Error(`winter solstice not found for ${year}`);
  return t.date;
}

/**
 * Does the lunar month starting at CST day `startDay` (ending the day before
 * `nextStartDay`) contain a 中氣 (major solar term, Sun at a multiple of 30°)?
 */
function containsMajorTerm(startDay: number, nextStartDay: number): boolean {
  const from = cstDayToUtc(startDay);
  const to = cstDayToUtc(nextStartDay);
  // Major terms are 30° apart, so at most one or two fall in a ~29.5-day month.
  // Scan all 12 and test whether any lands inside the window.
  for (let k = 0; k < 12; k++) {
    const lon = (270 + k * 30) % 360;
    const t = Astronomy.SearchSunLongitude(lon, new Date(from.getTime() - DAY_MS), 45);
    if (!t) continue;
    const termDay = cstDayNumber(t.date);
    if (termDay >= startDay && termDay < nextStartDay) return true;
  }
  return false;
}

/** The CST day on which the lunar month containing `dayNum` begins. */
function monthStartForDay(dayNum: number): number {
  // Search back far enough to be before the containing new moon.
  const moons = newMoonDays(cstDayToUtc(dayNum - 45), 4);
  let start = moons[0];
  for (const m of moons) if (m <= dayNum) start = m;
  return start;
}

/**
 * Convert a Gregorian instant to its Chinese lunar date.
 *
 * Throws only if the ephemeris search fails (far outside its range); callers
 * should treat a throw as "cannot compute" rather than guessing.
 */
export function toLunarDate(date: Date): LunarDate {
  const day = cstDayNumber(date);
  const gYear = new Date(date.getTime() + CST_OFFSET_MS).getUTCFullYear();

  // Locate the two month-11s that bracket this date. Month 11 of year y is the
  // lunar month containing the winter solstice of year y.
  const month11Of = (y: number) => monthStartForDay(cstDayNumber(winterSolstice(y)));

  let suiStartYear = gYear - 1;
  let suiStart = month11Of(suiStartYear);
  let suiEnd = month11Of(gYear);
  if (day >= suiEnd) {
    suiStartYear = gYear;
    suiStart = suiEnd;
    suiEnd = month11Of(gYear + 1);
  }

  // All lunar-month starts in this 歲 (suì), inclusive of suiStart, exclusive
  // of suiEnd.
  const starts: number[] = [];
  {
    const moons = newMoonDays(cstDayToUtc(suiStart - 1), 15);
    for (const m of moons) {
      if (m >= suiStart && m < suiEnd) starts.push(m);
    }
  }
  starts.sort((a, b) => a - b);
  const monthCount = starts.length;

  // Leap determination: 13 months means one of them has no 中氣.
  let leapIndex = -1;
  if (monthCount === 13) {
    for (let i = 0; i < starts.length; i++) {
      const next = i + 1 < starts.length ? starts[i + 1] : suiEnd;
      if (!containsMajorTerm(starts[i], next)) { leapIndex = i; break; }
    }
  }

  // Number the months: index 0 is month 11, then 12, 1, 2 … A leap month
  // repeats the number of the month it follows.
  const numbers: { month: number; leap: boolean }[] = [];
  let current = 11;
  for (let i = 0; i < starts.length; i++) {
    if (i === leapIndex) {
      // Leap month repeats the previous month's number.
      const prev = numbers[i - 1]?.month ?? current;
      numbers.push({ month: prev, leap: true });
    } else {
      numbers.push({ month: current, leap: false });
      current = current === 12 ? 1 : current + 1;
    }
  }

  // Which month contains our day?
  let idx = 0;
  for (let i = 0; i < starts.length; i++) if (starts[i] <= day) idx = i;
  const info = numbers[idx];
  const monthStartDay = starts[idx];

  // The lunar YEAR increments at month 1. Months 11 and 12 of the suì belong
  // to the lunar year that started earlier.
  const lunarYear = info.month >= 11 ? suiStartYear : suiStartYear + 1;

  return {
    year: lunarYear,
    month: info.month,
    isLeapMonth: info.leap,
    day: day - monthStartDay + 1,
    monthStart: cstDayToUtc(monthStartDay),
  };
}

/** Convenience: lunar date from a YYYY-MM-DD (+ optional HH:MM) birth input. */
export function lunarFromBirth(birthDate: string, birthTime?: string): LunarDate | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const hhmm = birthTime && /^\d{1,2}:\d{2}/.test(birthTime) ? birthTime.slice(0, 5) : '12:00';
  // Birth data is local civil time; the calendar is defined in CST, and for
  // day-granularity purposes we treat the given wall time as CST.
  const utc = new Date(`${birthDate}T${hhmm}:00+08:00`);
  if (Number.isNaN(utc.getTime())) return null;
  try {
    return toLunarDate(utc);
  } catch {
    return null;
  }
}
