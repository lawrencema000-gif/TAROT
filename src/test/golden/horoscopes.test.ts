import { describe, it, expect } from 'vitest';
import { generateDailyHoroscope } from '../../data/horoscopes';
import type { ZodiacSign } from '../../types';

/**
 * Golden tests for the daily horoscope.
 *
 * This is the screen a returning user reads every morning, and until now it was
 * provably machine-made: five shared pools served all twelve signs, and the
 * seed folded the sign in at a magnitude that moved the first draw by about
 * 2.7% of the RNG range — so the signs formed a monotone ramp instead of twelve
 * independent streams, and adjacent signs kept landing on the same line.
 *
 * These tests pin the two properties that make it stop reading as generated:
 * different signs genuinely get different readings on the same day, and the
 * same sign gets the same reading all day.
 */

const SIGNS: ZodiacSign[] = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];

const DATES = ['2026-01-05', '2026-04-14', '2026-08-17', '2026-12-25'];

describe('the sign actually changes the reading', () => {
  it('gives no two signs the same general line on the same day', () => {
    for (const date of DATES) {
      const byLine = new Map<string, ZodiacSign>();
      for (const sign of SIGNS) {
        const line = generateDailyHoroscope(sign, date).general;
        const clash = byLine.get(line);
        expect([date, sign, clash ?? null]).toEqual([date, sign, null]);
        byLine.set(line, sign);
      }
    }
  });

  it('varies every field across signs, not just the general one', () => {
    for (const date of DATES) {
      for (const field of ['love', 'career'] as const) {
        const seen = new Set(
          SIGNS.map((s) => (generateDailyHoroscope(s, date) as Record<string, unknown>)[field] as string),
        );
        // Pools are smaller than 12 per sign, so some overlap is expected —
        // but a monotone ramp would collapse this to a handful.
        expect([date, field, seen.size]).toEqual([date, field, expect.any(Number)]);
        expect(seen.size).toBeGreaterThanOrEqual(6);
      }
    }
  });

  it('does not walk the pool in lockstep as the sign index increases', () => {
    // The old seed produced a ramp: consecutive signs drew consecutive entries.
    // Collect the general line for all 12 signs and confirm the sequence is not
    // a rotation of one ordering.
    const lines = SIGNS.map((s) => generateDailyHoroscope(s, '2026-08-17').general);
    const nextDay = SIGNS.map((s) => generateDailyHoroscope(s, '2026-08-18').general);
    // If selection were a pure ramp, shifting the day would shift every sign by
    // the same amount and the two arrays would be rotations of one another.
    const isRotation = lines.some((_, off) =>
      lines.every((l, i) => l === nextDay[(i + off) % lines.length]));
    expect(isRotation).toBe(false);
  });
});

describe('determinism', () => {
  it('gives the same reading for the same sign and date, every call', () => {
    for (const sign of SIGNS) {
      const a = generateDailyHoroscope(sign, '2026-08-17');
      const b = generateDailyHoroscope(sign, '2026-08-17');
      expect([sign, a]).toEqual([sign, b]);
    }
  });

  it('changes the reading from one day to the next', () => {
    for (const sign of SIGNS) {
      const today = generateDailyHoroscope(sign, '2026-08-17').general;
      const tomorrow = generateDailyHoroscope(sign, '2026-08-18').general;
      expect([sign, today === tomorrow]).toEqual([sign, false]);
    }
  });

  it('survives a year of dates without throwing or emitting a blank', () => {
    for (let d = 0; d < 365; d += 7) {
      const date = new Date(Date.UTC(2026, 0, 1 + d)).toISOString().slice(0, 10);
      for (const sign of SIGNS) {
        const r = generateDailyHoroscope(sign, date);
        // The public shape is general/love/career plus energy, luckyNumber and
        // luckyColor. mood and actionSteps exist in the data but are not
        // surfaced by this function.
        for (const field of ['general', 'love', 'career'] as const) {
          const v = (r as Record<string, unknown>)[field];
          expect([date, sign, field, typeof v === 'string' && (v as string).length > 10])
            .toEqual([date, sign, field, true]);
        }
      }
    }
  });
});

describe('the prose is not the old generated voice', () => {
  const BANNED = [
    'the universe', 'cosmic energ', 'your journey', 'embrace the',
    'step into your power', 'dive deep', 'the stars align',
  ];

  it('contains none of the banned filler in any English reading', () => {
    for (const date of DATES) {
      for (const sign of SIGNS) {
        const r = generateDailyHoroscope(sign, date);
        const all = [r.general, r.love, r.career].join(' ').toLowerCase();
        for (const term of BANNED) {
          expect([sign, term, all.includes(term)]).toEqual([sign, term, false]);
        }
      }
    }
  });

  it('varies sentence length rather than emitting one shape', () => {
    // A pool where every line is the same length is still generated, just
    // differently. Check the spread across each sign's general pool.
    for (const sign of SIGNS) {
      const lengths = new Set<number>();
      for (let d = 0; d < 40; d++) {
        const date = new Date(Date.UTC(2026, 0, 1 + d)).toISOString().slice(0, 10);
        lengths.add(generateDailyHoroscope(sign, date).general.length);
      }
      expect([sign, lengths.size]).toEqual([sign, expect.any(Number)]);
      expect(lengths.size).toBeGreaterThanOrEqual(4);
    }
  });
});
