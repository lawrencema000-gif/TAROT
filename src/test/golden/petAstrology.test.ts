import { describe, it, expect } from 'vitest';
import {
  PET_SIGNS, SPECIES_INFO, ZODIAC_ANIMALS, zodiacAnimalFor, readPet, PET_DISCLAIMER,
} from '../../data/petAstrology';
import { getZodiacSign } from '../../utils/zodiac';
import type { Species } from '../../dal/people';
import type { ZodiacSign } from '../../types';

/**
 * Golden tests for pet astrology.
 *
 * Two things actually matter here. The Chinese year animal must turn at 立春
 * rather than 1 January — adoption dates cluster in exactly that window. And
 * the copy must not drift into health claims, which is the one way a feature
 * this light could do real harm.
 */

const ALL_SIGNS: ZodiacSign[] = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];
const ALL_SPECIES = Object.keys(SPECIES_INFO) as Species[];

describe('coverage', () => {
  it('has a reading for all twelve signs', () => {
    for (const s of ALL_SIGNS) {
      expect([s, !!PET_SIGNS[s]]).toEqual([s, true]);
      expect(PET_SIGNS[s].headline.length).toBeGreaterThan(10);
      expect(PET_SIGNS[s].temperament.length).toBeGreaterThan(80);
      expect(PET_SIGNS[s].needs.length).toBeGreaterThan(40);
      expect(PET_SIGNS[s].quirk.length).toBeGreaterThan(30);
    }
  });

  it('gives every sign a distinct headline', () => {
    expect(new Set(ALL_SIGNS.map((s) => PET_SIGNS[s].headline)).size).toBe(12);
  });

  it('has a lens for every species the form can produce', () => {
    for (const k of ALL_SPECIES) {
      expect([k, SPECIES_INFO[k].label.length > 1]).toEqual([k, true]);
      expect([k, SPECIES_INFO[k].lens.length > 40]).toEqual([k, true]);
    }
    expect(new Set(ALL_SPECIES.map((k) => SPECIES_INFO[k].lens)).size).toBe(ALL_SPECIES.length);
  });
});

describe('the Chinese year animal turns at 立春, not 1 January', () => {
  it('lists twelve animals in branch order from 子', () => {
    expect(ZODIAC_ANIMALS).toHaveLength(12);
    expect(ZODIAC_ANIMALS[0]).toEqual({ cn: '鼠', en: 'Rat' });
    expect(ZODIAC_ANIMALS[11]).toEqual({ cn: '豬', en: 'Pig' });
  });

  it('names known years correctly for a mid-year date', () => {
    // 1984 甲子 Rat, 2000 庚辰 Dragon, 2020 庚子 Rat, 2024 甲辰 Dragon.
    expect(zodiacAnimalFor('1984-06-15')!.en).toBe('Rat');
    expect(zodiacAnimalFor('2000-06-15')!.en).toBe('Dragon');
    expect(zodiacAnimalFor('2020-06-15')!.en).toBe('Rat');
    expect(zodiacAnimalFor('2024-06-15')!.en).toBe('Dragon');
  });

  it('puts a mid-January arrival in the PREVIOUS animal year', () => {
    // The distinction the calendar-year shortcut gets wrong, and the window
    // adoption dates actually cluster in.
    expect(zodiacAnimalFor('2024-01-15')!.en).toBe('Rabbit'); // still 癸卯
    expect(zodiacAnimalFor('2024-06-15')!.en).toBe('Dragon'); // 甲辰
  });

  it('flips across the 立春 boundary of 2021, which fell on Feb 3', () => {
    expect(zodiacAnimalFor('2021-02-01')!.en).toBe('Rat');   // 庚子
    expect(zodiacAnimalFor('2021-02-10')!.en).toBe('Ox');    // 辛丑
  });

  it('returns null for a malformed date', () => {
    expect(zodiacAnimalFor('not-a-date')).toBeNull();
    expect(zodiacAnimalFor('2024-6-15')).toBeNull();
  });
});

describe('readPet', () => {
  it('uses the same sun sign the rest of the app does', () => {
    for (const iso of ['1999-03-21', '2005-07-04', '2012-11-30', '2020-12-25']) {
      expect([iso, readPet(iso)!.sign]).toEqual([iso, getZodiacSign(iso)]);
    }
  });

  it('works with no species and simply drops that lens', () => {
    const r = readPet('2019-08-08')!;
    expect(r.species).toBeNull();
    expect(r.speciesLens).toBeNull();
    expect(r.reading.headline.length).toBeGreaterThan(0);
  });

  it('adds the species lens when one is given', () => {
    for (const k of ALL_SPECIES) {
      const r = readPet('2019-08-08', k)!;
      expect([k, r.species]).toEqual([k, k]);
      expect([k, r.speciesLens]).toEqual([k, SPECIES_INFO[k].lens]);
    }
  });

  it('returns a complete reading or null — never a partial one', () => {
    for (let y = 2000; y <= 2026; y += 2) {
      for (const md of ['01-20', '02-04', '06-15', '12-31']) {
        const r = readPet(`${y}-${md}`, 'cat');
        expect([y, md, r !== null]).toEqual([y, md, true]);
        expect(r!.reading.temperament.length).toBeGreaterThan(0);
        expect(r!.animal).not.toBeNull();
      }
    }
  });

  it('rejects malformed dates', () => {
    expect(readPet('nonsense')).toBeNull();
    expect(readPet('2019-8-8')).toBeNull();
    expect(readPet('')).toBeNull();
  });
});

describe('the copy stays out of the vet’s territory', () => {
  /**
   * The one way this feature could do harm is by sounding authoritative about
   * an animal's health. Nothing in the corpus may read as a medical, dietary or
   * diagnostic claim.
   */
  const BANNED = [
    'diagnos', 'symptom', 'disease', 'illness', 'medication', 'medicine',
    'treat the', 'cure', 'prescrib', 'dosage', 'supplement', 'nutrition',
    'should eat', 'feed them less', 'feed them more', 'vaccinat',
  ];

  const corpus = [
    ...Object.values(PET_SIGNS).flatMap((s) => [s.headline, s.temperament, s.needs, s.quirk]),
    ...Object.values(SPECIES_INFO).map((s) => s.lens),
  ];

  it('contains no medical or dietary claims', () => {
    for (const text of corpus) {
      for (const term of BANNED) {
        expect([term, text.toLowerCase().includes(term)]).toEqual([term, false]);
      }
    }
  });

  it('points at a vet in the disclaimer, and says it is not about health', () => {
    expect(PET_DISCLAIMER.toLowerCase()).toContain('vet');
    expect(PET_DISCLAIMER.toLowerCase()).toContain('not health');
  });

  it('frames the quirk as a quirk, never as a fault to correct', () => {
    for (const s of ALL_SIGNS) {
      const q = PET_SIGNS[s].quirk.toLowerCase();
      expect([s, q.includes('bad dog')]).toEqual([s, false]);
      expect([s, q.includes('misbehav')]).toEqual([s, false]);
      expect([s, q.includes('punish')]).toEqual([s, false]);
    }
  });
});
