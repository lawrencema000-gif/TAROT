/**
 * GOLDEN reference tests for calendar / almanac pure functions.
 *
 * METHODOLOGY: every expected value below is derived INDEPENDENTLY of the
 * function under test — from the published tropical sun-sign date ranges,
 * from hand-computed synodic-age arithmetic against the canonical ephemeris
 * anchor, or from first-principles property reasoning. No expected value was
 * produced by running the function and pasting its output back.
 *
 * Targets:
 *   - src/utils/zodiac.ts        -> getZodiacSign('YYYY-MM-DD')
 *   - src/utils/moonPhase.ts     -> isFullMoon(date)
 *   - src/data/horoscopes.ts     -> generateEnhancedHoroscope(sign, date)
 */
import { describe, it, expect } from 'vitest';
import { getZodiacSign } from '../../utils/zodiac';
import { isFullMoon } from '../../utils/moonPhase';
import { generateEnhancedHoroscope } from '../../data/horoscopes';
import type { ZodiacSign } from '../../types';

// ---------------------------------------------------------------------------
// 1. ZODIAC CUSPS
//
// Reference source: the PUBLISHED tropical sun-sign date ranges. These are the
// same ranges shown in zodiacData[sign].dateRange (e.g. Aries "Mar 21 - Apr
// 19"), and are the standard Western astrology ranges. For each of the 12
// signs we assert BOTH boundary days: the first day the sign starts and the
// last day it is still in effect. That is 24 boundary-day assertions. The dates
// are written from the published range, NOT read back from the function.
//
//   Sign         | Published range        | start day  | end day
//   -------------+------------------------+------------+-----------
//   aries        | Mar 21 - Apr 19        | 03-21      | 04-19
//   taurus       | Apr 20 - May 20        | 04-20      | 05-20
//   gemini       | May 21 - Jun 20        | 05-21      | 06-20
//   cancer       | Jun 21 - Jul 22        | 06-21      | 07-22
//   leo          | Jul 23 - Aug 22        | 07-23      | 08-22
//   virgo        | Aug 23 - Sep 22        | 08-23      | 09-22
//   libra        | Sep 23 - Oct 22        | 09-23      | 10-22
//   scorpio      | Oct 23 - Nov 21        | 10-23      | 11-21
//   sagittarius  | Nov 22 - Dec 21        | 11-22      | 12-21
//   capricorn    | Dec 22 - Jan 19        | 12-22      | 01-19
//   aquarius     | Jan 20 - Feb 18        | 01-20      | 02-18
//   pisces       | Feb 19 - Mar 20        | 02-19      | 03-20
// ---------------------------------------------------------------------------
describe('getZodiacSign — published sun-sign cusp boundaries (24 boundary days)', () => {
  // [date, expected sign, which boundary]. Year 2000 chosen arbitrarily; the
  // function ignores the year entirely (month/day only), so any year works.
  const boundaries: Array<[string, ZodiacSign, 'start' | 'end']> = [
    ['2000-03-21', 'aries', 'start'],
    ['2000-04-19', 'aries', 'end'],
    ['2000-04-20', 'taurus', 'start'],
    ['2000-05-20', 'taurus', 'end'],
    ['2000-05-21', 'gemini', 'start'],
    ['2000-06-20', 'gemini', 'end'],
    ['2000-06-21', 'cancer', 'start'],
    ['2000-07-22', 'cancer', 'end'],
    ['2000-07-23', 'leo', 'start'],
    ['2000-08-22', 'leo', 'end'],
    ['2000-08-23', 'virgo', 'start'],
    ['2000-09-22', 'virgo', 'end'],
    ['2000-09-23', 'libra', 'start'],
    ['2000-10-22', 'libra', 'end'],
    ['2000-10-23', 'scorpio', 'start'],
    ['2000-11-21', 'scorpio', 'end'],
    ['2000-11-22', 'sagittarius', 'start'],
    ['2000-12-21', 'sagittarius', 'end'],
    ['2000-12-22', 'capricorn', 'start'],
    ['2000-01-19', 'capricorn', 'end'],
    ['2000-01-20', 'aquarius', 'start'],
    ['2000-02-18', 'aquarius', 'end'],
    ['2000-02-19', 'pisces', 'start'],
    ['2000-03-20', 'pisces', 'end'],
  ];

  it.each(boundaries)('%s -> %s (%s boundary)', (date, expected) => {
    expect(getZodiacSign(date)).toBe(expected);
  });

  // Known cusp birth: Dec 22 is the FIRST day of Capricorn per the published
  // range (Capricorn "Dec 22 - Jan 19"). Dec 21 would still be Sagittarius.
  // This is the classic "Sagittarius/Capricorn cusp" birthday, and the
  // published convention assigns Dec 22 to Capricorn.
  it('1990-12-22 -> capricorn (Sagittarius/Capricorn cusp resolves to Capricorn)', () => {
    expect(getZodiacSign('1990-12-22')).toBe('capricorn');
  });

  // Sanity: the day BEFORE the Capricorn cusp is still Sagittarius (published
  // Sagittarius range ends Dec 21).
  it('1990-12-21 -> sagittarius (last day of Sagittarius range)', () => {
    expect(getZodiacSign('1990-12-21')).toBe('sagittarius');
  });
});

// ---------------------------------------------------------------------------
// 2. MOON PHASE
//
// Anchor constants (from the source, used only for the DERIVATION, not as the
// answer): REFERENCE_NEW_MOON = 2000-01-06T18:14:00Z, SYNODIC_PERIOD =
// 29.53059 days. The PHYSICAL claim being tested is independent: at a new moon
// the moon is dark (NOT full); half a synodic period later (~14.7653 days) it
// is full.
//
// Hand-computed full-moon instant:
//   t_full = 2000-01-06T18:14:00Z + (29.53059 / 2) days
//          = 2000-01-06T18:14:00Z + 14.765295 days
//   0.765295 day * 24 h = 18.367 h = 18 h 22.0 min
//   => t_full ≈ 2000-01-21T12:36:01Z
//   synodic age at t_full = 14.765295 days = FULL_MOON_AGE_DAYS exactly,
//   so |age - 14.7653| = 0 < 1.5  => isFullMoon === true.
//
// Independent cross-check of the calendar date: the real astronomical full
// moon following the Jan 6 2000 new moon occurred on 2000-01-21 (a total
// lunar eclipse, ~04:40 UT), so a full moon on/around Jan 21 2000 is the
// physically correct expectation, validating the anchor model.
// ---------------------------------------------------------------------------
describe('isFullMoon — synodic-age derivation against the 2000-01-06 new-moon anchor', () => {
  it('is FULL at new-moon-anchor + half synodic period (~2000-01-21T12:36Z)', () => {
    // Hand-derived instant; age == 14.7653 days exactly => true.
    const fullMoon = new Date('2000-01-21T12:36:00Z');
    expect(isFullMoon(fullMoon)).toBe(true);
  });

  it('is FULL one synodic period later (~2000-02-20T01:00Z)', () => {
    // 2000-01-21T12:36Z + 29.53059 d ≈ 2000-02-20T01:08Z. Age wraps back to
    // ~14.7653 => still full. Derived by adding one full synodic cycle.
    const nextFull = new Date('2000-02-20T01:00:00Z');
    expect(isFullMoon(nextFull)).toBe(true);
  });

  it('is NOT full at the new-moon anchor itself (age 0 — dark moon)', () => {
    const newMoon = new Date('2000-01-06T18:14:00Z');
    expect(isFullMoon(newMoon)).toBe(false);
  });

  it('is NOT full at a first-quarter point (~age 7.4 days, ~2000-01-14T03:00Z)', () => {
    // Quarter moon ~ a quarter synodic period after new moon:
    // 2000-01-06T18:14Z + 7.383 d ≈ 2000-01-14T03:25Z. Age ≈ 7.38 days,
    // |7.38 - 14.7653| = 7.38 > 1.5 => not full. Half-lit, not full.
    const firstQuarter = new Date('2000-01-14T03:00:00Z');
    expect(isFullMoon(firstQuarter)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. HOROSCOPE SEED DISTINCTNESS (Sprint A fix property)
//
// This is a property / independence check, not a snapshot. The seed is
// seed = dateNum*13 + signIndex*101, and signIndex is the canonical 0-11
// position. The Sprint A fix folds the sign INDEX into the seed (the old code
// summed the first two char codes of the sign name, which collided for
// cancer/capricorn and taurus/libra). Independent expectation:
//   (a) For a single FIXED date, all 12 signs must yield DISTINCT outputs.
//   (b) For a FIXED sign, two different dates must yield different outputs.
// Neither assertion bakes in any specific template text — they only assert the
// independence property the fix guarantees.
// ---------------------------------------------------------------------------
describe('generateEnhancedHoroscope — seed distinctness (Sprint A collision fix)', () => {
  const ALL_SIGNS: ZodiacSign[] = [
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
  ];

  // Serialize the content-bearing fields (exclude `sign`/`date`, which are
  // echoed inputs and would trivially differ) so we test that the SEEDED
  // selections actually diverge across signs.
  function contentFingerprint(sign: ZodiacSign, date: string): string {
    const h = generateEnhancedHoroscope(sign, date);
    return JSON.stringify({
      general: h.general,
      love: h.love,
      career: h.career,
      mood: h.mood,
      energy: h.energy,
      luckyNumber: h.luckyNumber,
      luckyColor: h.luckyColor,
      actionStep: h.actionStep,
      tags: h.tags,
    });
  }

  it('produces 12 DISTINCT outputs for the 12 signs on a fixed date', () => {
    const date = '2024-03-15';
    const fingerprints = ALL_SIGNS.map((s) => contentFingerprint(s, date));
    const distinct = new Set(fingerprints);
    expect(distinct.size).toBe(12);
  });

  it('keeps the historically-colliding pair cancer/capricorn distinct', () => {
    const date = '2024-03-15';
    expect(contentFingerprint('cancer', date)).not.toBe(contentFingerprint('capricorn', date));
  });

  it('keeps the historically-colliding pair taurus/libra distinct', () => {
    const date = '2024-03-15';
    expect(contentFingerprint('taurus', date)).not.toBe(contentFingerprint('libra', date));
  });

  it('produces 12 distinct outputs on a second, unrelated fixed date too', () => {
    const date = '2025-11-02';
    const distinct = new Set(ALL_SIGNS.map((s) => contentFingerprint(s, date)));
    expect(distinct.size).toBe(12);
  });

  it('produces different output for the same sign on two different dates', () => {
    const a = contentFingerprint('leo', '2024-03-15');
    const b = contentFingerprint('leo', '2024-03-16');
    expect(a).not.toBe(b);
  });
});
