import { describe, it, expect } from 'vitest';
import * as Astronomy from 'astronomy-engine';
import { toLunarDate, winterSolstice } from '../../utils/chineseLunar';

/**
 * GOLDEN tests for the Chinese lunisolar calendar.
 *
 * Zi Wei Dou Shu places every star from the lunar month and day, so an error
 * here corrupts every chart the system produces. Expected values are taken
 * from PUBLISHED calendar facts (Chinese New Year dates, known leap months)
 * and from the astronomical DEFINITIONS — never from running the converter
 * and recording what it said.
 */

const cst = (iso: string) => new Date(`${iso}T06:00:00+08:00`);

describe('Chinese New Year falls on lunar month 1, day 1', () => {
  // INDEPENDENT REFERENCE: widely published Chinese New Year dates.
  const CNY: [string, number][] = [
    ['1990-01-27', 1990],
    ['2020-01-25', 2020],
    ['2021-02-12', 2021],
    ['2022-02-01', 2022],
    ['2023-01-22', 2023],
    ['2024-02-10', 2024],
    ['2025-01-29', 2025],
    ['2026-02-17', 2026],
  ];

  for (const [greg, year] of CNY) {
    it(`${greg} → lunar ${year}-01-01`, () => {
      const l = toLunarDate(cst(greg));
      expect(l.month).toBe(1);
      expect(l.day).toBe(1);
      expect(l.isLeapMonth).toBe(false);
      expect(l.year).toBe(year);
    });
  }

  it('the day before Chinese New Year is the last day of month 12', () => {
    // Derivation: New Year's Eve (除夕) closes the previous lunar year, so it
    // must be in month 12 with a day number of 29 or 30 (lunar months are
    // never longer than 30 days).
    const eve = toLunarDate(cst('2024-02-09'));
    expect(eve.month).toBe(12);
    expect(eve.day).toBeGreaterThanOrEqual(29);
    expect(eve.day).toBeLessThanOrEqual(30);
  });
});

describe('leap months match the published calendar', () => {
  // INDEPENDENT REFERENCE: 2023 had 閏二月 (leap 2nd month); 2020 had 閏四月.
  it('2023-03-22 is the first day of leap month 2', () => {
    const l = toLunarDate(cst('2023-03-22'));
    expect(l.isLeapMonth).toBe(true);
    expect(l.month).toBe(2);
    expect(l.day).toBe(1);
  });

  it('2020-05-23 is the first day of leap month 4', () => {
    const l = toLunarDate(cst('2020-05-23'));
    expect(l.isLeapMonth).toBe(true);
    expect(l.month).toBe(4);
    expect(l.day).toBe(1);
  });

  it('a non-leap year has no leap month across its span', () => {
    // 2021 is not a leap lunar year — sampling every ~10 days across it must
    // never surface a leap month.
    let sawLeap = false;
    for (let d = 0; d < 360; d += 10) {
      const date = new Date(Date.UTC(2021, 1, 12) + d * 86400000);
      if (toLunarDate(date).isLeapMonth) { sawLeap = true; break; }
    }
    expect(sawLeap).toBe(false);
  });
});

describe('structural invariants', () => {
  it('month 11 always contains the winter solstice (the defining rule)', () => {
    for (const year of [1990, 2001, 2020, 2024]) {
      const ws = winterSolstice(year);
      const l = toLunarDate(ws);
      expect(l.month).toBe(11);
      expect(l.isLeapMonth).toBe(false);
    }
  });

  it('winter solstice is the Sun at 270° ecliptic longitude', () => {
    // The definition itself — verified against the ephemeris.
    const ws = winterSolstice(2024);
    const lon = Astronomy.SunPosition(ws).elon;
    const diff = Math.abs(((lon - 270 + 540) % 360) - 180);
    expect(diff).toBeLessThan(0.01);
  });

  it('lunar day is always 1-30 and month 1-12 over a two-year sweep', () => {
    for (let d = 0; d < 730; d += 7) {
      const date = new Date(Date.UTC(2023, 0, 1) + d * 86400000);
      const l = toLunarDate(date);
      expect(l.day).toBeGreaterThanOrEqual(1);
      expect(l.day).toBeLessThanOrEqual(30);
      expect(l.month).toBeGreaterThanOrEqual(1);
      expect(l.month).toBeLessThanOrEqual(12);
    }
  });

  it('consecutive days advance the lunar day by exactly 1 within a month', () => {
    // 2024-03-15 and 03-16 sit mid-month, so no rollover is involved.
    const a = toLunarDate(cst('2024-03-15'));
    const b = toLunarDate(cst('2024-03-16'));
    expect(b.month).toBe(a.month);
    expect(b.day).toBe(a.day + 1);
  });
});
