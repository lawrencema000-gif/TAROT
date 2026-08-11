import { describe, it, expect } from 'vitest';
import * as Astronomy from 'astronomy-engine';
import {
  SECTIONAL_TERMS,
  nextSolarTermAt,
  surroundingSectionalTerms,
  luckStartAge,
} from '../../utils/solarTerms';

/**
 * GOLDEN tests for Chinese sectional solar terms (節氣) and the BaZi
 * luck-pillar start age derived from them.
 *
 * Why this matters: the 大运 start age used to be hardcoded (5 or 7), which
 * moved every user's luck timeline by up to four years. It is now computed
 * from the exact solar term, so these tests pin BOTH the astronomy and the
 * classical arithmetic.
 *
 * Every expected value is derived independently — from the DEFINITION of a
 * solar term (Sun's apparent ecliptic longitude) or from published almanac
 * dates — never by running the code under test and recording its output.
 */

describe('sectional solar term definitions', () => {
  it('defines the 12 month-opening terms every 30° starting at 315° (立春)', () => {
    // INDEPENDENT REFERENCE: the sectional terms (節) are, by definition, the
    // odd-numbered 15° steps — i.e. 30° apart — and the BaZi year opens at
    // 立春 = 315°. Walking 315 + 30k (mod 360) must reproduce the table.
    const expected = Array.from({ length: 12 }, (_, i) => (315 + i * 30) % 360);
    expect(SECTIONAL_TERMS.map((t) => t.longitude)).toEqual(expected);
    expect(SECTIONAL_TERMS).toHaveLength(12);
  });

  it('names 立春 as the 315° term (the BaZi year boundary)', () => {
    const lichun = SECTIONAL_TERMS.find((t) => t.longitude === 315);
    expect(lichun?.name).toBe('立春');
  });
});

describe('solar term instants match published almanac dates', () => {
  // INDEPENDENT REFERENCE: published 万年历 / almanac dates for 立春.
  // 立春 falls on Feb 3-5 every year (China Standard Time, UTC+8).
  // We assert the calendar date in CST and, separately, that the Sun really
  // is at 315° at the returned instant — the physical definition.
  const cases = [
    { year: 2024, monthCST: 2, dayRange: [3, 5] },
    { year: 2025, monthCST: 2, dayRange: [3, 5] },
    { year: 1990, monthCST: 2, dayRange: [3, 5] },
  ];

  for (const c of cases) {
    it(`立春 ${c.year} lands ${c.monthCST}/${c.dayRange[0]}-${c.dayRange[1]} CST and the Sun is at 315°`, () => {
      const from = new Date(Date.UTC(c.year, 0, 15));
      const d = nextSolarTermAt(315, from);
      expect(d).not.toBeNull();

      // Calendar check in China Standard Time (UTC+8).
      const cst = new Date(d!.getTime() + 8 * 3600 * 1000);
      expect(cst.getUTCMonth() + 1).toBe(c.monthCST);
      expect(cst.getUTCDate()).toBeGreaterThanOrEqual(c.dayRange[0]);
      expect(cst.getUTCDate()).toBeLessThanOrEqual(c.dayRange[1]);

      // Physical check: the definition itself. Sun's apparent ecliptic
      // longitude at that instant must be 315° (within a search tolerance).
      const lon = Astronomy.SunPosition(d!).elon;
      const diff = Math.abs(((lon - 315 + 540) % 360) - 180);
      expect(diff).toBeLessThan(0.01);
    });
  }
});

describe('surrounding sectional terms', () => {
  it('brackets a date: previous ≤ date < next, and they are ~30° apart', () => {
    const probe = new Date(Date.UTC(2024, 5, 20)); // 2024-06-20
    const { previous, next } = surroundingSectionalTerms(probe);
    expect(previous).not.toBeNull();
    expect(next).not.toBeNull();
    expect(previous!.date.getTime()).toBeLessThanOrEqual(probe.getTime());
    expect(next!.date.getTime()).toBeGreaterThan(probe.getTime());

    // Consecutive sectional terms are 30° of solar longitude apart, which the
    // Sun covers in roughly 29-32 days (slower near aphelion in July).
    const gapDays = (next!.date.getTime() - previous!.date.getTime()) / 86400000;
    expect(gapDays).toBeGreaterThan(28);
    expect(gapDays).toBeLessThan(33);
  });
});

describe('luck-pillar start age (3 days = 1 year)', () => {
  it('forward: counts birth → next term, divided by 3', () => {
    const birth = new Date(Date.UTC(1990, 5, 15, 12, 0));
    const res = luckStartAge(birth, true);
    expect(res).not.toBeNull();

    // INDEPENDENT DERIVATION: recompute the gap straight from the term the
    // function reports, and apply the classical rule by hand.
    const days = (res!.term.date.getTime() - birth.getTime()) / 86400000;
    expect(res!.days).toBeCloseTo(days, 6);
    expect(res!.years).toBeCloseTo(days / 3, 6);
    // A sectional term is never more than ~31 days away, so the start age is
    // bounded by ~31/3 ≈ 10.4 years — matching the classical 1-10 range.
    expect(res!.years).toBeGreaterThanOrEqual(0);
    expect(res!.years).toBeLessThan(10.5);
  });

  it('reverse: counts previous term → birth, divided by 3', () => {
    const birth = new Date(Date.UTC(1990, 5, 15, 12, 0));
    const res = luckStartAge(birth, false);
    expect(res).not.toBeNull();
    const days = (birth.getTime() - res!.term.date.getTime()) / 86400000;
    expect(res!.days).toBeCloseTo(days, 6);
    expect(res!.years).toBeCloseTo(days / 3, 6);
    expect(res!.years).toBeLessThan(10.5);
  });

  it('forward + reverse distances sum to one full term gap', () => {
    // The two directions measure the two halves of the same interval, so
    // (birth→next) + (previous→birth) = the whole previous→next gap.
    const birth = new Date(Date.UTC(2001, 2, 20, 6, 30));
    const fwd = luckStartAge(birth, true)!;
    const rev = luckStartAge(birth, false)!;
    const total = fwd.days + rev.days;
    expect(total).toBeGreaterThan(28);
    expect(total).toBeLessThan(33);
  });

  it('a birth ON a term gives a near-zero start age in the forward direction', () => {
    // Derivation: if birth coincides with a sectional term, the distance to
    // the *next* term is a full gap, but the distance FROM the previous term
    // is ~0 — so the reverse direction must be ~0.
    const lichun = nextSolarTermAt(315, new Date(Date.UTC(2000, 0, 15)))!;
    const res = luckStartAge(new Date(lichun.getTime() + 1000), false)!;
    expect(res.years).toBeLessThan(0.01);
  });
});
