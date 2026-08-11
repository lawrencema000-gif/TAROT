/**
 * Exact Chinese solar terms (節氣) from real ephemeris.
 *
 * A solar term is defined by the Sun's apparent ecliptic longitude reaching a
 * multiple of 15°. The twelve "sectional" terms (節) that bound BaZi months sit
 * every 30° starting at 315° (立春):
 *
 *   315° 立春  345° 驚蟄   15° 清明   45° 立夏   75° 芒種  105° 小暑
 *   135° 立秋  165° 白露  195° 寒露  225° 立冬  255° 大雪  285° 小寒
 *
 * We solve for them with astronomy-engine rather than a lookup table, because
 * the terms drift about a day across years and the BaZi luck-pillar start age
 * is derived from the DISTANCE in days between birth and the adjacent term —
 * a table that's a day out moves someone's whole 大运 timeline by four months.
 */

import * as Astronomy from 'astronomy-engine';

export interface SolarTerm {
  /** Chinese name, e.g. 立春 */
  name: string;
  /** Romanised name, e.g. Lichun */
  pinyin: string;
  /** Sun's apparent ecliptic longitude in degrees */
  longitude: number;
  /** Exact UTC instant the Sun reaches that longitude */
  date: Date;
}

/** The twelve sectional terms that open each BaZi month, in longitude order. */
export const SECTIONAL_TERMS: { name: string; pinyin: string; longitude: number }[] = [
  { name: '立春', pinyin: 'Lichun',   longitude: 315 },
  { name: '驚蟄', pinyin: 'Jingzhe',  longitude: 345 },
  { name: '清明', pinyin: 'Qingming', longitude: 15 },
  { name: '立夏', pinyin: 'Lixia',    longitude: 45 },
  { name: '芒種', pinyin: 'Mangzhong', longitude: 75 },
  { name: '小暑', pinyin: 'Xiaoshu',  longitude: 105 },
  { name: '立秋', pinyin: 'Liqiu',    longitude: 135 },
  { name: '白露', pinyin: 'Bailu',    longitude: 165 },
  { name: '寒露', pinyin: 'Hanlu',    longitude: 195 },
  { name: '立冬', pinyin: 'Lidong',   longitude: 225 },
  { name: '大雪', pinyin: 'Daxue',    longitude: 255 },
  { name: '小寒', pinyin: 'Xiaohan',  longitude: 285 },
];

/**
 * The exact instant the Sun next reaches `longitude` at or after `from`.
 * Returns null if astronomy-engine can't converge (far-future/past dates).
 */
export function nextSolarTermAt(longitude: number, from: Date): Date | null {
  try {
    const t = Astronomy.SearchSunLongitude(longitude, from, 400);
    return t ? t.date : null;
  } catch {
    return null;
  }
}

/**
 * The next sectional term strictly after `from`, and the most recent one at or
 * before `from`. Both are needed for luck pillars: forward-direction charts
 * count to the next term, reverse-direction charts count back from the previous.
 */
export function surroundingSectionalTerms(from: Date): { previous: SolarTerm | null; next: SolarTerm | null } {
  // Search a window generously wider than the ~15-day max gap to a term.
  const searchStart = new Date(from.getTime() - 40 * 86400000);

  const found: SolarTerm[] = [];
  for (const term of SECTIONAL_TERMS) {
    const d = nextSolarTermAt(term.longitude, searchStart);
    if (d) found.push({ ...term, date: d });
  }
  found.sort((a, b) => a.date.getTime() - b.date.getTime());

  let previous: SolarTerm | null = null;
  let next: SolarTerm | null = null;
  for (const term of found) {
    if (term.date.getTime() <= from.getTime()) previous = term;
    else if (!next) next = term;
  }
  return { previous, next };
}

/**
 * BaZi luck-pillar start age from the classical 3-days-to-1-year rule.
 *
 * Forward charts count the days from birth to the NEXT sectional term;
 * reverse charts count from the PREVIOUS term to birth. Three days of that
 * distance equal one year of life, so one day equals four months.
 *
 * Returns the age in years (fractional) plus the raw day count, or null if the
 * terms couldn't be resolved (callers should fall back rather than guess).
 */
export function luckStartAge(birth: Date, isForward: boolean): { years: number; days: number; term: SolarTerm } | null {
  const { previous, next } = surroundingSectionalTerms(birth);
  const term = isForward ? next : previous;
  if (!term) return null;

  const ms = isForward
    ? term.date.getTime() - birth.getTime()
    : birth.getTime() - term.date.getTime();
  const days = ms / 86400000;
  if (days < 0) return null;

  return { years: days / 3, days, term };
}
