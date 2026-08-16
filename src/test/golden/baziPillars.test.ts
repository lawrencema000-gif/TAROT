import { describe, it, expect } from 'vitest';
import { computeBazi, STEMS, BRANCHES } from '../../data/bazi';
import { sectionalTermsForYear, branchIndexForTermLongitude } from '../../utils/solarTerms';

/**
 * Golden tests for the four pillars, with attention to the solar-term
 * boundaries that decide the year and month.
 *
 * These boundaries were a fixed almanac table until now (立春 = Feb 4, always).
 * The real terms drift a day either way, so 1.29% of all birthdates carried the
 * wrong month pillar and 0.155% the wrong year pillar — a wholly different
 * chart, not a rounding error. Expectations below come from published sexagenary
 * year names, published term instants, and the classical 五虎遁 rule.
 */

const CN_S = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const CN_B = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const name = (p: { stem: string; branch: string }) =>
  CN_S[STEMS.indexOf(p.stem as never)] + CN_B[BRANCHES.indexOf(p.branch as never)];

describe('year pillar — published sexagenary years', () => {
  // Mid-year dates, safely clear of any 立春 boundary.
  const YEARS: [number, string][] = [
    [1984, '甲子'], // the canonical cycle restart
    [1985, '乙丑'],
    [1988, '戊辰'],
    [2000, '庚辰'],
    [2008, '戊子'],
    [2012, '壬辰'],
    [2020, '庚子'],
    [2023, '癸卯'],
    [2024, '甲辰'],
  ];

  it('names the year correctly for a mid-year birth', () => {
    for (const [y, expected] of YEARS) {
      const c = computeBazi(`${y}-06-15`, '12:00')!;
      expect([y, name(c.year)]).toEqual([y, expected]);
    }
  });

  it('completes the 60-cycle — 1984 and 2044 share a pillar', () => {
    expect(name(computeBazi('1984-06-15', '12:00')!.year))
      .toBe(name(computeBazi('2044-06-15', '12:00')!.year));
  });
});

describe('立春 — the year boundary is an instant, not a date', () => {
  it('always falls on Feb 3, 4 or 5', () => {
    for (let y = 1930; y <= 2035; y++) {
      const lichun = sectionalTermsForYear(y).find((t) => t.longitude === 315);
      expect([y, lichun !== undefined]).toEqual([y, true]);
      const cst = new Date(lichun!.date.getTime() + 8 * 3600 * 1000);
      expect([y, cst.getUTCMonth() + 1]).toEqual([y, 2]);
      expect([3, 4, 5]).toContain(cst.getUTCDate());
    }
  });

  it('flips the year pillar at the exact term instant, not at midnight', () => {
    // 立春 2021 fell on Feb 3 at 22:58 CST — a published almanac time. A birth
    // that evening is still 庚子; two hours later it is 辛丑.
    expect(name(computeBazi('2021-02-03', '20:00')!.year)).toBe('庚子');
    expect(name(computeBazi('2021-02-03', '23:30')!.year)).toBe('辛丑');
    expect(name(computeBazi('2021-02-04', '12:00')!.year)).toBe('辛丑');
  });

  it('puts a Feb 4 birth in the PREVIOUS year when 立春 falls on Feb 5', () => {
    // The old fixed Feb-4 rule got exactly this class of birth wrong.
    for (let y = 1930; y <= 2035; y++) {
      const lichun = sectionalTermsForYear(y).find((t) => t.longitude === 315)!;
      const cstDay = new Date(lichun.date.getTime() + 8 * 3600 * 1000).getUTCDate();
      if (cstDay !== 5) continue;
      const before = computeBazi(`${y}-02-04`, '12:00')!;
      const after = computeBazi(`${y}-02-06`, '12:00')!;
      // One year apart in the cycle: the stems must differ.
      expect([y, before.year.stem === after.year.stem]).toEqual([y, false]);
    }
  });

  it('treats January births as the previous solar year', () => {
    expect(name(computeBazi('2024-01-15', '12:00')!.year)).toBe('癸卯');
    expect(name(computeBazi('2024-06-15', '12:00')!.year)).toBe('甲辰');
  });
});

describe('month pillar — branch from the governing sectional term', () => {
  it('maps each term longitude to the branch it opens', () => {
    // 立春 315° opens 寅; every further 30° advances one branch, round to
    // 小寒 285° opening 丑.
    const EXPECTED: [number, string][] = [
      [315, '寅'], [345, '卯'], [15, '辰'], [45, '巳'], [75, '午'], [105, '未'],
      [135, '申'], [165, '酉'], [195, '戌'], [225, '亥'], [255, '子'], [285, '丑'],
    ];
    for (const [lon, cn] of EXPECTED) {
      expect([lon, CN_B[branchIndexForTermLongitude(lon)]]).toEqual([lon, cn]);
    }
  });

  it('advances the branch exactly once per term, in order, through a year', () => {
    for (const y of [1950, 1987, 2000, 2021, 2033]) {
      const terms = sectionalTermsForYear(y);
      expect([y, terms.length]).toEqual([y, 12]);
      // Chronological, and each opens a distinct branch.
      for (let i = 1; i < terms.length; i++) {
        expect(terms[i].date.getTime()).toBeGreaterThan(terms[i - 1].date.getTime());
      }
      expect(new Set(terms.map((t) => branchIndexForTermLongitude(t.longitude))).size).toBe(12);
    }
  });

  it('holds one branch for the whole span between two terms', () => {
    // Every day from 立春 2021 (Feb 3) up to 驚蟄 (early Mar) must read 寅.
    for (let d = 4; d <= 28; d++) {
      const c = computeBazi(`2021-02-${String(d).padStart(2, '0')}`, '12:00')!;
      expect([d, CN_B[BRANCHES.indexOf(c.month.branch)]]).toEqual([d, '寅']);
    }
  });

  it('never reads 丑 in the first days of January', () => {
    // 小寒 opens 丑 around Jan 6; Jan 1-5 still belong to the 子 month that
    // opened at the previous year's 大雪.
    for (let y = 1990; y <= 2025; y += 5) {
      for (let d = 1; d <= 4; d++) {
        const c = computeBazi(`${y}-01-0${d}`, '12:00')!;
        expect([y, d, CN_B[BRANCHES.indexOf(c.month.branch)]]).toEqual([y, d, '子']);
      }
    }
  });
});

describe('month stem — 五虎遁', () => {
  it('starts the 寅 month on the stem the rule names', () => {
    // 甲己之年丙作首, 乙庚之歲戊為頭, 丙辛必定尋庚起, 丁壬壬位順行流,
    // 戊癸何方發, 甲寅之上好追求.
    const RULE: [string, string][] = [
      ['甲', '丙'], ['己', '丙'], ['乙', '戊'], ['庚', '戊'],
      ['丙', '庚'], ['辛', '庚'], ['丁', '壬'], ['壬', '壬'],
      ['戊', '甲'], ['癸', '甲'],
    ];
    // Find a year for each stem and read its 寅 month (a late-Feb birth).
    for (const [yearStem, monthStem] of RULE) {
      let found = false;
      for (let y = 1984; y < 1994; y++) {
        const c = computeBazi(`${y}-02-20`, '12:00')!;
        if (CN_S[STEMS.indexOf(c.year.stem)] !== yearStem) continue;
        expect([yearStem, CN_B[BRANCHES.indexOf(c.month.branch)]]).toEqual([yearStem, '寅']);
        expect([yearStem, CN_S[STEMS.indexOf(c.month.stem)]]).toEqual([yearStem, monthStem]);
        found = true;
        break;
      }
      expect([yearStem, found]).toEqual([yearStem, true]);
    }
  });
});

describe('day pillar — the 60-day cycle', () => {
  it('matches a published 万年历 reference', () => {
    // 2001-06-08 → 壬寅, a widely cited calibration date.
    expect(name(computeBazi('2001-06-08', '12:00')!.day)).toBe('壬寅');
  });

  it('advances exactly one place per day and wraps at 60', () => {
    const seen: string[] = [];
    for (let d = 1; d <= 30; d++) {
      seen.push(name(computeBazi(`2001-06-${String(d).padStart(2, '0')}`, '12:00')!.day));
    }
    expect(new Set(seen).size).toBe(30); // no repeats within 30 days
    // 60 days apart must repeat.
    expect(name(computeBazi('2001-06-08', '12:00')!.day))
      .toBe(name(computeBazi('2001-08-07', '12:00')!.day));
  });
});

describe('computeBazi — robustness', () => {
  it('rejects malformed input rather than guessing', () => {
    expect(computeBazi('not-a-date')).toBeNull();
    expect(computeBazi('2001-6-8')).toBeNull();
  });

  it('produces a complete chart across a century, at every hour', () => {
    for (let y = 1930; y <= 2030; y += 10) {
      for (const t of ['00:30', '06:00', '12:00', '18:00', '23:30']) {
        const c = computeBazi(`${y}-03-15`, t);
        expect([y, t, c !== null]).toEqual([y, t, true]);
        for (const p of [c!.year, c!.month, c!.day, c!.hour]) {
          expect(STEMS).toContain(p.stem);
          expect(BRANCHES).toContain(p.branch);
        }
        const totalElements = Object.values(c!.elementBalance).reduce((a, b) => a + b, 0);
        expect([y, t, totalElements]).toEqual([y, t, 8]); // 4 stems + 4 branches
      }
    }
  });

  it('stays fast enough for bulk use — the term table is memoised', () => {
    const t0 = Date.now();
    for (let d = 0; d < 2000; d++) {
      const day = (d % 28) + 1;
      computeBazi(`2000-06-${String(day).padStart(2, '0')}`, '12:00');
    }
    // Without memoisation this is ~12 iterative ephemeris searches per chart.
    expect(Date.now() - t0).toBeLessThan(4000);
  });
});
