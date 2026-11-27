// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as server from '../../../supabase/functions/astrology-year-ahead/months';
import * as client from '../../lib/yearAheadMonths';

/*
 * p12 charts-06 (WP-P0-11 Part A). 'Year Ahead' sold the calendar year under
 * way while the report covered the next 12 months, and the server's month
 * list came from Date#setUTCMonth on today's date, which overflows from the
 * 29th to the 31st. One month list (supabase/functions/astrology-year-ahead/
 * months.ts) now drives the server and the page.
 *
 * Goldens computed independently (SP/plan/scratch/wp11_goldens*.mjs, and a
 * Python cross-check), not by this module.
 */

const {
  monthsFrom, monthDistance, addMonths, isMonthIso, utcMonthIso, startMonthFor,
  firstNoonUtc, lastNoonUtc, walkDays, plusMonthsUtc,
} = server;

/** The month list as index.ts built it before this change, verbatim. */
function oldLoop(now: Date): string[] {
  const out: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now);
    d.setUTCMonth(d.getUTCMonth() + i);
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
}

/** The 365 noon-UTC days from 2026-11-15. */
const DAYS = Array.from({ length: 365 }, (_, i) => new Date(Date.UTC(2026, 10, 15 + i, 12)));

describe('the old month loop skipped and repeated months (the defect)', () => {
  it('built on 2027-01-31 it listed 7 distinct months', () => {
    const got = oldLoop(new Date('2027-01-31T10:00:00Z'));
    expect(got).toEqual([
      '2027-01', '2027-03', '2027-03', '2027-05', '2027-05', '2027-07',
      '2027-07', '2027-08', '2027-10', '2027-10', '2027-12', '2027-12',
    ]);
    expect(new Set(got).size).toBe(7);
  });
  it('built on 2027-03-30 it missed 2028-02; on 2026-11-29 it missed 2027-02', () => {
    expect(oldLoop(new Date('2027-03-30T10:00:00Z')).slice(-2)).toEqual(['2028-01', '2028-03']);
    const nov29 = oldLoop(new Date('2026-11-29T10:00:00Z'));
    expect(new Set(nov29).size).toBe(11);
    expect(nov29).not.toContain('2027-02');
  });
  it('over the 365 days from 2026-11-15 it was wrong on exactly 21, first 2026-11-29, last 2027-10-31', () => {
    const wrong = DAYS.filter((d) => {
      const got = oldLoop(d);
      return got.join() !== monthsFrom(utcMonthIso(d)).join();
    }).map((d) => d.toISOString().slice(0, 10));
    expect(wrong).toHaveLength(21);
    expect(wrong[0]).toBe('2026-11-29');
    expect(wrong[wrong.length - 1]).toBe('2027-10-31');
  });
});

describe('monthsFrom: 12 consecutive, distinct months', () => {
  it('lists the months from the first', () => {
    expect(monthsFrom('2026-11')).toEqual([
      '2026-11', '2026-12', '2027-01', '2027-02', '2027-03', '2027-04',
      '2027-05', '2027-06', '2027-07', '2027-08', '2027-09', '2027-10',
    ]);
    expect(monthsFrom('2027-01')).toEqual(Array.from({ length: 12 }, (_, i) => `2027-${String(i + 1).padStart(2, '0')}`));
    expect(monthsFrom('2027-12', 3)).toEqual(['2027-12', '2028-01', '2028-02']);
  });
  it('for every start 2026-01 … 2030-12', () => {
    for (let y = 2026; y <= 2030; y++) {
      for (let m = 1; m <= 12; m++) {
        const from = `${y}-${String(m).padStart(2, '0')}`;
        const list = monthsFrom(from);
        expect(list).toHaveLength(12);
        expect(new Set(list).size).toBe(12);
        expect(list[0]).toBe(from);
        for (let i = 1; i < 12; i++) expect(monthDistance(list[i - 1], list[i])).toBe(1);
      }
    }
  });
  it('on every one of the 365 days, starting with that day’s month', () => {
    for (const d of DAYS) {
      const list = monthsFrom(utcMonthIso(d));
      expect(list[0]).toBe(d.toISOString().slice(0, 7));
      expect(new Set(list).size).toBe(12);
    }
  });
  it('addMonths, monthDistance and isMonthIso', () => {
    expect(addMonths('2026-11', 2)).toBe('2027-01');
    expect(addMonths('2027-01', -1)).toBe('2026-12');
    expect(monthDistance('2026-11', '2027-10')).toBe(11);
    expect(isMonthIso('2026-11')).toBe(true);
    expect(isMonthIso('2026-13')).toBe(false);
    expect(isMonthIso(202611)).toBe(false);
    expect(() => monthsFrom('2026-1')).toThrow(RangeError);
  });
});

describe('startMonthFor: the reader’s month, within one of the UTC month', () => {
  it('accepts the month either side of the UTC month', () => {
    expect(startMonthFor('2026-12', new Date('2026-11-30T20:00:00Z'))).toBe('2026-12'); // Tokyo
    expect(startMonthFor('2026-10', new Date('2026-11-01T05:00:00Z'))).toBe('2026-10'); // Honolulu
  });
  it('falls back to the UTC month', () => {
    const now = new Date('2026-11-14T12:00:00Z');
    expect(startMonthFor('2027-03', now)).toBe('2026-11');
    expect(startMonthFor(undefined, now)).toBe('2026-11');
    expect(startMonthFor('2026-13', now)).toBe('2026-11');
    expect(startMonthFor(202611, now)).toBe('2026-11');
  });
});

describe('the walk', () => {
  it('first and last noons', () => {
    expect(firstNoonUtc('2026-11').toISOString()).toBe('2026-11-01T12:00:00.000Z');
    expect(lastNoonUtc('2027-10').toISOString()).toBe('2027-10-31T12:00:00.000Z');
    expect(lastNoonUtc('2028-02').toISOString()).toBe('2028-02-29T12:00:00.000Z');
    expect(lastNoonUtc('2027-02').toISOString()).toBe('2027-02-28T12:00:00.000Z');
  });
  it('starts no later than the first month’s last noon (index.ts)', () => {
    const start = (months: string[], now: Date) =>
      walkDays(months, new Date(Math.min(now.getTime(), lastNoonUtc(months[0]).getTime())))[0].toISOString();
    // 20:00 on 31 October in Honolulu: October still gets a sample.
    expect(start(monthsFrom('2026-10'), new Date('2026-11-01T06:00:00Z'))).toBe('2026-10-31T12:00:00.000Z');
    expect(start(monthsFrom('2026-11'), new Date('2026-11-14T15:45:00Z'))).toBe('2026-11-14T12:00:00.000Z');
  });
  it('walks the listed months only', () => {
    const a = walkDays(monthsFrom('2026-11'), new Date('2026-11-14T15:45:00Z'));
    expect(a).toHaveLength(352);
    expect(a[0].toISOString()).toBe('2026-11-14T12:00:00.000Z');
    expect(a[a.length - 1].toISOString()).toBe('2027-10-31T12:00:00.000Z');
    const b = walkDays(monthsFrom('2026-12'), new Date('2026-11-30T20:00:00Z'));
    expect(b).toHaveLength(365);
    expect(b[0].toISOString()).toBe('2026-12-01T12:00:00.000Z');
    expect(walkDays(monthsFrom('2027-01'))).toHaveLength(365);
    const leap = walkDays(monthsFrom('2027-11'));
    expect(leap).toHaveLength(366);
    expect(leap.map((d) => d.toISOString().slice(0, 10))).toContain('2028-02-29');
  });
});

describe('plusMonthsUtc (Postgres + interval in UTC)', () => {
  it.each([
    ['2026-11-14T12:00:00Z', 12, '2027-11-14T12:00:00.000Z'],
    ['2026-10-17T08:00:00Z', 12, '2027-10-17T08:00:00.000Z'],
    ['2028-02-29T10:00:00Z', 12, '2029-02-28T10:00:00.000Z'],
    ['2026-01-31T09:00:00Z', 1, '2026-02-28T09:00:00.000Z'],
    ['2026-03-31T09:00:00Z', -1, '2026-02-28T09:00:00.000Z'],
  ])('%s + %i months = %s', (from, n, want) => {
    expect(plusMonthsUtc(new Date(from), n).toISOString()).toBe(want);
  });
});

describe('the app formats the months in the reader’s language', () => {
  it('short months', () => {
    expect(client.formatMonthShort('2026-11', 'en')).toBe('Nov 2026');
    expect(client.formatMonthShort('2026-11', 'ja')).toBe('2026年11月');
    expect(client.formatMonthShort('2026-11', 'ko')).toBe('2026년 11월');
    expect(client.formatMonthShort('2026-11', 'zh')).toBe('2026年11月');
  });
  it('long months over a report', () => {
    const en = monthsFrom('2026-11').map((m) => client.formatMonthLong(m, 'en'));
    expect(en[0]).toBe('November 2026');
    expect(en[11]).toBe('October 2027');
    const ja = monthsFrom('2026-11').map((m) => client.formatMonthLong(m, 'ja'));
    expect(ja.slice(0, 3)).toEqual(['2026年11月', '2026年12月', '2027年1月']);
    expect(ja[11]).toBe('2027年10月');
  });
  it('a day', () => {
    const d = new Date(2026, 11, 31);
    expect(client.formatDayLong(d, 'en')).toBe('December 31, 2026');
    expect(client.formatDayLong(d, 'ja')).toBe('2026年12月31日');
    expect(client.formatDayLong(d, 'ko')).toBe('2026년 12월 31일');
    expect(client.formatDayLong(d, 'zh')).toBe('2026年12月31日');
  });
  it('localMonthIso is the device’s month', () => {
    expect(client.localMonthIso(new Date(2026, 10, 14, 23, 30))).toBe('2026-11');
    expect(client.localMonthIso(new Date(2027, 0, 1, 0, 30))).toBe('2027-01');
  });
});

describe('the app uses the server’s code', () => {
  it('re-exports months.ts, no copy', () => {
    expect(client.monthsFrom).toBe(server.monthsFrom);
    expect(client.isMonthIso).toBe(server.isMonthIso);
    expect(client.addMonths).toBe(server.addMonths);
    expect(client.plusMonthsUtc).toBe(server.plusMonthsUtc);
  });
});

describe('astrology-year-ahead builds its months from months.ts (source guard)', () => {
  /** The source without // and /* *\/ comments (as aiGateOnce.test.ts). */
  const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const src = code(readFileSync(join(__dirname, '..', '..', '..', 'supabase', 'functions', 'astrology-year-ahead', 'index.ts'), 'utf8'));
  it('has no overflowing month arithmetic and no 366-day walk', () => {
    expect(src).not.toContain('setUTCMonth(');
    expect(src).not.toContain('d <= 365');
  });
  it('imports ./months.ts, walks its days and returns the range', () => {
    expect(src).toMatch(/from "\.\/months\.ts"/);
    expect(src).toContain('walkDays(');
    expect(src).toContain('range:');
  });
});
