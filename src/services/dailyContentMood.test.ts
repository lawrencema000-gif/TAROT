import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import i18n from '../i18n/config';
import { energyBand, generateDailyReading, type EnergyBand } from './dailyContent';
import type { ZodiacSign } from '../types';

/*
 * p10 d2-ja-12: the Readings tab's sun-sign horoscope scored the day
 * 「エネルギースコア 2/5」, said 「気分: あなたのエネルギーは内省的な1日を示して
 * います。」 and 「雰囲気: 内省」, and then 「今日のムード: 活気があって人を惹き
 * つける」: the mood was drawn from all fifteen, whatever the score. It is
 * drawn for the score now — the caller's, when the reading is shown beside
 * another generator's score, else its own.
 */

const SIGNS: ZodiacSign[] = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
const LOCALES = join(process.cwd(), 'src/i18n/locales');
const moodsIn = (lng: string): string[] =>
  JSON.parse(readFileSync(join(LOCALES, lng, 'app.json'), 'utf8')).dailyInsights.moodDescriptors;

/** What each mood says about the day's energy, read from the words themselves. */
const BAND_OF_EN: Record<string, EnergyBand> = {
  'Quietly powerful': 'low',
  'Tender and raw': 'low',
  'Contemplative and wise': 'low',
  'Emotionally honest': 'low',
  'Resilient and recovering': 'low',
  'Open and receptive': 'mid',
  'Grounded and resolute': 'mid',
  'Hopeful and forward-looking': 'mid',
  'Patient and steady': 'mid',
  'Restless but purposeful': 'high',
  'Playful and light': 'high',
  'Energized and magnetic': 'high',
  'Clear-headed and decisive': 'high',
  'Protective and fierce': 'high',
  'Creative and inspired': 'high',
};

/** A locale's mood → its band, through the English mood at the same place in the list. */
function bandsIn(lng: string): Map<string, EnergyBand> {
  const en = moodsIn('en');
  return new Map(moodsIn(lng).map((m, i) => [m, BAND_OF_EN[en[i]]]));
}

/** Every twelfth day of 2026. */
const DATES = Array.from({ length: 31 }, (_, i) => new Date(Date.UTC(2026, 0, 1) + i * 12 * 86400000).toISOString().slice(0, 10));

beforeAll(async () => {
  await i18n.changeLanguage('en');
});
afterAll(async () => {
  await i18n.changeLanguage('en');
});

// Thousands of readings, each read through i18next: slow under a loaded run.
describe('the daily reading’s mood agrees with its energy score (p10 d2-ja-12)', { timeout: 30_000 }, () => {
  it('every locale lists the same fifteen moods, in the order the bands index', () => {
    expect(Object.keys(BAND_OF_EN)).toHaveLength(15);
    expect(new Set(moodsIn('en'))).toEqual(new Set(Object.keys(BAND_OF_EN)));
    for (const lng of ['ja', 'ko', 'zh']) expect(moodsIn(lng), lng).toHaveLength(15);
  });

  it('a score given by the caller: the mood is one of that score’s band, and the reading carries the score', () => {
    const wrong: string[] = [];
    for (const sign of SIGNS) {
      for (const date of DATES) {
        for (const energy of [1, 2, 3, 4, 5]) {
          const r = generateDailyReading({ sign, date, energy });
          if (r.energy !== energy || BAND_OF_EN[r.mood] !== energyBand(energy)) wrong.push(`${sign} ${date} ${energy}/5: ${r.energy}/5 “${r.mood}”`);
        }
      }
    }
    expect(wrong).toEqual([]);
  });

  it('no score given: the mood agrees with the reading’s own', () => {
    const wrong = SIGNS.flatMap((sign) =>
      DATES.map((date) => generateDailyReading({ sign, date })).filter((r) => BAND_OF_EN[r.mood] !== energyBand(r.energy)),
    );
    expect(wrong.map((r) => `${r.sign} ${r.date} ${r.energy}/5 “${r.mood}”`)).toEqual([]);
  });

  it('every band gets more than one mood over the year (the draw still varies)', () => {
    for (const energy of [1, 3, 5]) {
      const seen = new Set(SIGNS.flatMap((sign) => DATES.map((date) => generateDailyReading({ sign, date, energy }).mood)));
      expect(seen.size, `${energy}/5`).toBeGreaterThan(2);
    }
  });

  it('the caller’s score moves nothing else: the lucky number, colour and action step stay the day’s', () => {
    for (const sign of SIGNS) {
      for (const date of DATES.slice(0, 12)) {
        const own = generateDailyReading({ sign, date });
        for (const energy of [1, 5]) {
          const given = generateDailyReading({ sign, date, energy });
          expect({ ...given, energy: own.energy, mood: own.mood }).toEqual(own);
        }
      }
    }
  });

  it('ja, the QA case: Pisces on 2026-10-20 at 2/5 reads as a low day, in Japanese', async () => {
    await i18n.changeLanguage('ja');
    try {
      const r = generateDailyReading({ sign: 'pisces', date: '2026-10-20', energy: 2 });
      expect(r.mood).not.toBe('活気があって人を惹きつける');
      expect(bandsIn('ja').get(r.mood)).toBe('low');
    } finally {
      await i18n.changeLanguage('en');
    }
  });

  it.each(['ja', 'ko', 'zh'])('%s: the mood is the locale’s and in the score’s band', async (lng) => {
    await i18n.changeLanguage(lng);
    try {
      const bands = bandsIn(lng);
      const wrong: string[] = [];
      for (const sign of SIGNS) {
        for (const date of DATES.slice(0, 10)) {
          for (const energy of [1, 2, 3, 4, 5]) {
            const { mood } = generateDailyReading({ sign, date, energy });
            if (bands.get(mood) !== energyBand(energy)) wrong.push(`${sign} ${date} ${energy}/5: ${mood}`);
          }
        }
      }
      expect(wrong).toEqual([]);
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});
