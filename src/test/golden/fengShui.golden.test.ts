import { describe, it, expect } from 'vitest';
import { computeKua } from '../../data/fengShuiKua';
import { getAnnualReading, getAnnualReadingAt, CENTRE_PALACE_NOTE } from '../../data/fengShuiAnnual';

/**
 * GOLDEN TESTS — Feng Shui (Eight Mansions Kua + Annual Flying Stars).
 *
 * Every expected value below is hand-derived from the PUBLISHED Eight
 * Mansions / Xuan Kong flying-star formula, NOT snapshotted from the
 * function under test.
 *
 * ----------------------------------------------------------------------
 * PUBLISHED KUA (命卦) FORMULA — the canonical "last two digits" method
 * used by Lillian Too, Joey Yap, and standard Eight Mansions almanacs:
 *
 *   digitSum(year) = add the last TWO digits of the birth year, then
 *   keep reducing to a single digit (digital root of the 2-digit tail).
 *
 *   Born BEFORE 2000:
 *     Male   kua = 10 - digitSum   (if result is 5 -> substitute 2)
 *     Female kua =  5 + digitSum   (reduce to 1..9; if 5 -> substitute 8)
 *
 *   Born 2000 OR LATER:
 *     Male   kua =  9 - digitSum   (if 5 -> 2)
 *     Female kua =  6 + digitSum   (reduce to 1..9; if 5 -> 8)
 *
 * NOTE ON THE PROMPT'S WORKED EXAMPLE: the prompt sketched "male 1980:
 * 1+9+8+0=18 -> 9 -> 10-9 = 1". That uses all FOUR digits of the year.
 * The traditional published method (and this app's source, fengShuiKua.ts
 * line 160 `effectiveYear % 100`) sums only the LAST TWO digits. For 1980
 * that is 8+0 = 8, giving male kua = 10 - 8 = 2. The published Eight
 * Mansions tables (Lillian Too, Joey Yap) list 1980 male = Kua 2, which
 * confirms the last-two-digit method is the correct traditional one. All
 * derivations below therefore use the last-two-digit method.
 *
 * Group membership (published Eight Mansions): East group = {1,3,4,9},
 * West group = {2,6,7,8}.
 * ----------------------------------------------------------------------
 */

describe('computeKua — hand-derived from published Eight Mansions formula', () => {
  // CASE 1 — Male 1980 (pre-2000, male)
  // last2 = 80 -> 8+0 = 8 -> digitSum 8
  // male = 10 - 8 = 2  -> Kua 2 (Kun, Earth, West group)
  // Cross-check: published almanac lists 1980 male = Kua 2.
  it('male 1980 -> Kua 2 (West)', () => {
    const k = computeKua(1980, 'male');
    expect(k).not.toBeNull();
    expect(k!.kua).toBe(2);
    expect(k!.group).toBe('West');
  });

  // CASE 2 — Female 1980 (pre-2000, female) — kua-5 SUBSTITUTION for female
  // last2 = 80 -> digitSum 8
  // female = 5 + 8 = 13 -> reduce 1..9: ((13-1)%9)+1 = (12%9)+1 = 3+1 = 4
  // Wait: 5 + digitSum with digital-root reduction. 13 -> 1+3 = 4 -> Kua 4.
  // Kua 4 (Xun, Wood, East group). No 5-substitution here.
  // (The prompt's "female 1980 -> 5+9=14 -> 5 -> 8" again used 4-digit sum;
  //  with the correct 2-digit sum digitSum=8, female = 13 -> 4.)
  it('female 1980 -> Kua 4 (East)', () => {
    const k = computeKua(1980, 'female');
    expect(k).not.toBeNull();
    expect(k!.kua).toBe(4);
    expect(k!.group).toBe('East');
  });

  // CASE 3 — Male 1968 (pre-2000) — kua-5 SUBSTITUTION for MALE (5 -> 2)
  // last2 = 68 -> 6+8 = 14 -> 1+4 = 5 -> digitSum 5
  // male = 10 - 5 = 5 -> male 5 substitutes to 2 -> Kua 2 (West)
  it('male 1968 -> Kua 2 via male 5->2 substitution (West)', () => {
    const k = computeKua(1968, 'male');
    expect(k).not.toBeNull();
    expect(k!.kua).toBe(2);
    expect(k!.group).toBe('West');
  });

  // CASE 4 — Female 1949 (pre-2000) — kua-5 SUBSTITUTION for FEMALE (5 -> 8)
  // last2 = 49 -> 4+9 = 13 -> 1+3 = 4 -> digitSum 4
  // female = 5 + 4 = 9 ... that is 9, not 5. Pick another year for female 5.
  // -> use 1959 instead (see CASE 4b). Keep 1949 as a plain female case:
  // female 1949 = 9 -> Kua 9 (Li, Fire, East group).
  it('female 1949 -> Kua 9 (East)', () => {
    const k = computeKua(1949, 'female');
    expect(k).not.toBeNull();
    expect(k!.kua).toBe(9);
    expect(k!.group).toBe('East');
  });

  // CASE 4b — Female 1959 (pre-2000) — produces female kua 5 -> 8 substitution
  // last2 = 59 -> 5+9 = 14 -> 1+4 = 5 -> digitSum 5
  // female = 5 + 5 = 10 -> reduce 1..9: ((10-1)%9)+1 = (9%9)+1 = 0+1 = 1
  // Hmm that gives 1, not 5. The female 5-substitution triggers when
  // 5 + digitSum reduces to exactly 5. We need 5 + digitSum ≡ 5 (mod 9),
  // i.e. digitSum ≡ 0 (mod 9) -> digitSum = 9. So pick a year whose last
  // two digits have digital root 9. 1980's tail digitSum is 8; 1989 tail
  // = 8+9 = 17 -> 8 (no). 1971 tail = 7+1 = 8 (no). 1944 tail = 4+4 = 8.
  // Year 1989: 8+9=17->8. Need digital root 9: last2 in {09,18,27,...,90,99}.
  // 1990 tail = 9+0 = 9 -> digitSum 9 -> female = 5+9 = 14 -> 1+4 = 5
  //   -> female 5 substitutes to 8 -> Kua 8 (Gen, Earth, West group).
  // BUT 1990 < 2000 so pre-2000 female formula applies. Use 1990.
  it('female 1990 -> Kua 8 via female 5->8 substitution (West)', () => {
    // last2 = 90 -> 9+0 = 9 -> digitSum 9
    // female = 5 + 9 = 14 -> digital root 1+4 = 5 -> substitute 8
    const k = computeKua(1990, 'female');
    expect(k).not.toBeNull();
    expect(k!.kua).toBe(8);
    expect(k!.group).toBe('West');
  });

  // CASE 5 — Male 1990 (pre-2000) — plain male case for contrast with 4b
  // last2 = 90 -> 9+0 = 9 -> digitSum 9
  // male = 10 - 9 = 1 -> Kua 1 (Kan, Water, East group)
  it('male 1990 -> Kua 1 (East)', () => {
    const k = computeKua(1990, 'male');
    expect(k).not.toBeNull();
    expect(k!.kua).toBe(1);
    expect(k!.group).toBe('East');
  });

  // CASE 6 — Female 1972 (pre-2000) — plain female, no substitution
  // last2 = 72 -> 7+2 = 9 -> digitSum 9
  // female = 5 + 9 = 14 -> 1+4 = 5 -> female 5 substitutes to 8 -> Kua 8
  // (this is actually ANOTHER 5->8 case; useful redundancy.)
  it('female 1972 -> Kua 8 via female 5->8 substitution (West)', () => {
    const k = computeKua(1972, 'female');
    expect(k).not.toBeNull();
    expect(k!.kua).toBe(8);
    expect(k!.group).toBe('West');
  });

  // CASE 7 — POST-2000 male, using the source's modern formula (9 - digitSum)
  // Male 2001: last2 = 01 -> 0+1 = 1 -> digitSum 1
  // modern male = 9 - 1 = 8 -> Kua 8 (Gen, Earth, West group)
  // Published modern almanac: boy born 2001 = Kua 8. Confirms.
  it('male 2001 (post-2000) -> Kua 8 (West)', () => {
    const k = computeKua(2001, 'male');
    expect(k).not.toBeNull();
    expect(k!.kua).toBe(8);
    expect(k!.group).toBe('West');
  });

  // CASE 8 — POST-2000 female, using the source's modern formula (6 + digitSum)
  // Female 2001: last2 = 01 -> digitSum 1
  // modern female = 6 + 1 = 7 -> Kua 7 (Dui, Metal, West group)
  it('female 2001 (post-2000) -> Kua 7 (West)', () => {
    const k = computeKua(2001, 'female');
    expect(k).not.toBeNull();
    expect(k!.kua).toBe(7);
    expect(k!.group).toBe('West');
  });

  // CASE 9 — POST-2000 male producing the modern 5->2 substitution.
  // We need 9 - digitSum = 5 -> digitSum = 4. last2 with digital root 4:
  // 2004 tail = 0+4 = 4 -> digitSum 4 -> modern male = 9 - 4 = 5 -> 2.
  // -> Kua 2 (Kun, Earth, West group).
  it('male 2004 (post-2000) -> Kua 2 via male 5->2 substitution (West)', () => {
    const k = computeKua(2004, 'male');
    expect(k).not.toBeNull();
    expect(k!.kua).toBe(2);
    expect(k!.group).toBe('West');
  });

  // CASE 10 — Solar-year boundary (立春 ~ Feb 4). Someone born 2000-01-15
  // belongs to the PREVIOUS solar year (1999) per the source's birthDate
  // adjustment. So this should use the PRE-2000 male formula on year 1999.
  // 1999: last2 = 99 -> 9+9 = 18 -> 1+8 = 9 -> digitSum 9
  // pre-2000 male = 10 - 9 = 1 -> Kua 1 (East).
  // Without the birthDate (treating as plain 2000) it would be modern:
  // 2000 last2 = 00 -> 0 -> ... but digitSum 0 is a degenerate input; the
  // boundary case is the meaningful assertion here.
  it('male born 2000-01-15 uses prior solar year (1999) -> Kua 1 (East)', () => {
    const k = computeKua(2000, 'male', '2000-01-15');
    expect(k).not.toBeNull();
    expect(k!.kua).toBe(1);
    expect(k!.group).toBe('East');
  });

  // Range guard: out-of-range years return null (source line 147).
  it('returns null for out-of-range birth year', () => {
    expect(computeKua(1800, 'male')).toBeNull();
    expect(computeKua(2200, 'female')).toBeNull();
  });
});

/**
 * ----------------------------------------------------------------------
 * ANNUAL FLYING STARS — Five Yellow (Wu Wang, star 5) position.
 *
 * Independent derivation from the published Xuan Kong annual flying-star
 * almanac. The annual CENTRE star decrements by 1 each year (mod 9, 0->9).
 * Published anchor: 2024 centre = 3.
 *   2023 centre = 4, 2024 = 3, 2025 = 2, 2026 = 1.
 *
 * The 9 palaces are filled by shifting the Lo Shu base square by
 * (centre - 5) mod 9, with 0 mapped to 9. Lo Shu base (centre 5):
 *     NW=6  N=1  NE=8
 *     W=7   C=5  E=3
 *     SW=2  S=9  SE=4
 *
 * Star 5 sits where (baseValue + (centre-5)) ≡ 5 (mod 9), i.e. where the
 * base value equals (5 - (centre-5)) mod 9 = (10 - centre) mod 9.
 *
 *  2023, centre 4: need base = (10-4)=6 -> base 6 is at NW. => 5 in NW.  ✓ (published: NW)
 *  2024, centre 3: need base = (10-3)=7 -> base 7 is at W.  => 5 in W.   ✓ (published: W)
 *  2025, centre 2: need base = (10-2)=8 -> base 8 is at NE. => 5 in NE.  ✓ (published: NE)
 *  2026, centre 1: need base = (10-1)=9 mod9 = 0 -> 9; base 9 is at S.   => 5 in S. ✓ (published: S)
 *
 * These four Five-Yellow positions (2023 NW, 2024 W, 2025 NE, 2026 S)
 * match the published annual flying-star almanac independently of the app.
 * ----------------------------------------------------------------------
 */

function fiveYellowDirection(year: number): string {
  const { readings } = getAnnualReading(year);
  const dirs = Object.keys(readings).filter((d) => readings[d as keyof typeof readings].star === 5);
  // Exactly one palace holds star 5.
  expect(dirs.length).toBe(1);
  return dirs[0];
}

describe('getAnnualReading — Five Yellow (Wu Wang, star 5) position vs published almanac', () => {
  it('2023 -> Five Yellow in NW (centre star 4)', () => {
    const { centerStar } = getAnnualReading(2023);
    expect(centerStar).toBe(4);
    expect(fiveYellowDirection(2023)).toBe('NW');
  });

  it('2024 -> Five Yellow in W (centre star 3)', () => {
    const { centerStar } = getAnnualReading(2024);
    expect(centerStar).toBe(3);
    expect(fiveYellowDirection(2024)).toBe('W');
  });

  it('2025 -> Five Yellow in NE (centre star 2)', () => {
    const { centerStar } = getAnnualReading(2025);
    expect(centerStar).toBe(2);
    expect(fiveYellowDirection(2025)).toBe('NE');
  });

  it('2026 -> Five Yellow in S (centre star 1)', () => {
    const { centerStar } = getAnnualReading(2026);
    expect(centerStar).toBe(1);
    expect(fiveYellowDirection(2026)).toBe('S');
  });
});

/*
 * WP-P2-14 (eastern-04 / eastern-09 / eastern-18). References: the 三元九運
 * year star from the 1864 上元 anchor (1864 = 1 White, decreasing yearly),
 * the digit-sum rule (11 − digit sum) and the Lo Shu flight
 * centre → NW → W → NE → S → N → SW → E → SE, computed by hand
 * (plan/scratch/p2w1014/fengshui_goldens.mjs). masterseanchan.com's 2026
 * chart agrees: centre 1, 5 Yellow in the South.
 */
const EIGHT = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
const layoutOf = (readings: ReturnType<typeof getAnnualReading>['readings']) =>
  EIGHT.map((d) => `${d}${readings[d].star}`).join(' ');
const cstDate = (d: Date | null) => (d ? new Date(d.getTime() + 8 * 3_600_000).toISOString().slice(0, 10) : null);

describe('getAnnualReading — whole solar years', () => {
  it('2027 -> centre 9, Five Yellow in N', () => {
    expect(getAnnualReading(2027).centerStar).toBe(9);
    expect(fiveYellowDirection(2027)).toBe('N');
  });

  it('2028 -> centre 8, Five Yellow in SW', () => {
    expect(getAnnualReading(2028).centerStar).toBe(8);
    expect(fiveYellowDirection(2028)).toBe('SW');
  });

  it('2031 -> centre 5, Five Yellow in the centre', () => {
    expect(getAnnualReading(2031).centerStar).toBe(5);
    expect(fiveYellowDirection(2031)).toBe('Center');
  });

  it('full layouts of 2026 and 2027', () => {
    const a = getAnnualReading(2026);
    expect(layoutOf(a.readings)).toBe('N6 NE4 E8 SE9 S5 SW7 W3 NW2');
    expect(a.readings.Center.star).toBe(1);
    const b = getAnnualReading(2027);
    expect(layoutOf(b.readings)).toBe('N5 NE3 E7 SE8 S4 SW6 W2 NW1');
    expect(b.readings.Center.star).toBe(9);
  });

  it('follows the 1864 上元 anchor (1864 = 1, decreasing yearly) for 1864–2100', () => {
    for (let y = 1864; y <= 2100; y++) {
      const expected = ((1 - (y - 1864)) % 9 + 9) % 9 || 9;
      expect(getAnnualReading(y).centerStar, String(y)).toBe(expected);
    }
  });
});

describe('getAnnualReadingAt — the chart turns at 立春', () => {
  it('20 January 2027 still shows the 2026 chart, valid until 立春 2027', () => {
    const a = getAnnualReadingAt(new Date('2027-01-20T01:00:00Z'));
    expect(a.year).toBe(2026);
    expect(a.centerStar).toBe(1);
    expect(a.readings.S.star).toBe(5);
    expect(layoutOf(a.readings)).toBe('N6 NE4 E8 SE9 S5 SW7 W3 NW2');
    expect(cstDate(a.validFrom)).toBe('2026-02-04');
    expect(cstDate(a.validUntil)).toBe('2027-02-04');
  });

  it('00:30 JST on 1 January 2027 is still 2026', () => {
    expect(getAnnualReadingAt(new Date('2026-12-31T15:30:00Z')).year).toBe(2026);
  });

  it('after 立春 2027 the 2027 chart is in force', () => {
    const a = getAnnualReadingAt(new Date('2027-02-05T00:00:00Z'));
    expect(a.year).toBe(2027);
    expect(a.centerStar).toBe(9);
    expect(a.readings.N.star).toBe(5);
  });

  it('nothing changes outside the window', () => {
    expect(getAnnualReadingAt(new Date('2026-11-15T03:00:00Z')).year).toBe(2026);
  });

  it('carries an English centre note', () => {
    expect(CENTRE_PALACE_NOTE).toMatch(/centre star/i);
  });
});

describe('Kua — the solar year from the birth instant', () => {
  // 立春 1980: 1980-02-04T16:09:30Z (00:09 Beijing on the 5th).
  // 1980: 8+0 = 8 -> male 10-8 = 2 (Kun, West); female 5+8 = 13 -> 4.
  // 1979: 7+9 = 16 -> 7 -> male 10-7 = 3 (Zhen, East); female 5+7 = 12 -> 3.
  it('1980-02-04 12:00 JST, male -> solar 1979 -> Kua 3, Zhen, East', () => {
    const k = computeKua(1980, 'male', new Date('1980-02-04T03:00:00Z'))!;
    expect(k.kua).toBe(3);
    expect(k.trigram).toBe('Zhen');
    expect(k.group).toBe('East');
  });

  it('the same instant, female -> Kua 3', () => {
    expect(computeKua(1980, 'female', new Date('1980-02-04T03:00:00Z'))!.kua).toBe(3);
  });

  it('01:00 JST on 5 Feb 1980, before 立春 -> male 3', () => {
    expect(computeKua(1980, 'male', new Date('1980-02-04T16:00:00Z'))!.kua).toBe(3);
  });

  it('01:30 JST on 5 Feb 1980, after 立春 -> male 2, Kun, West', () => {
    const k = computeKua(1980, 'male', new Date('1980-02-04T16:30:00Z'))!;
    expect(k.kua).toBe(2);
    expect(k.trigram).toBe('Kun');
    expect(k.group).toBe('West');
  });

  // 立春 2021: 2021-02-03T14:59Z. 2020: 2+0 = 2 -> modern male 9-2 = 7;
  // 2021: 2+1 = 3 -> 9-3 = 6.
  it('2021-02-03 06:00 PST, before 立春 -> male 7', () => {
    expect(computeKua(2021, 'male', new Date('2021-02-03T14:00:00Z'))!.kua).toBe(7);
  });

  it('2021-02-03 08:00 PST, after 立春 -> male 6 (the old date rule said 7)', () => {
    expect(computeKua(2021, 'male', new Date('2021-02-03T16:00:00Z'))!.kua).toBe(6);
  });

  it('a date only is read as noon CST: 1980-02-04 -> male 3 (13 h before 立春)', () => {
    expect(computeKua(1980, 'male', '1980-02-04')!.kua).toBe(3);
  });

  it('2000-01-15 still gives Kua 1', () => {
    expect(computeKua(2000, 'male', '2000-01-15')!.kua).toBe(1);
  });

  it('an instant far from the typed year is ignored', () => {
    expect(computeKua(1980, 'male', new Date('1990-06-01T00:00:00Z'))!.kua).toBe(2);
  });

  it('male Kua with no birth equals the year star (5 -> 2), 1930–2013', () => {
    for (let y = 1930; y <= 2013; y++) {
      const star = getAnnualReading(y).centerStar;
      expect(computeKua(y, 'male')!.kua, String(y)).toBe(star === 5 ? 2 : star);
    }
  });
});
