// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import * as Astronomy from 'astronomy-engine';
import { astrologyEntries } from '../../data/astrologyLearn';
import { glossaryEntries } from '../../data/glossaryLearn';

/**
 * GOLDEN test (WP-P3-01) for the astrology facts the public learn pages state.
 *
 * Every expected value comes from an outside authority, not from the copy:
 * - Signs: element and modality in zodiac order, Wikipedia "Astrological sign".
 * - Pluto: astronomy-engine geocentric apparent ecliptic longitude of date,
 *   `Ecliptic(GeoVector('Pluto', t, true)).elon` (the chain astro-geocentric.test.ts
 *   uses). Ages agree within 0.1 year with Meeus and JPL Standish elements.
 * - Conjunction: Wikipedia "Astrological aspect" (an angle of about 0-10° along the
 *   ecliptic, no same-sign or same-degree condition).
 * - MC / IC: the MC is where the ecliptic crosses the meridian; it is a house cusp
 *   only in quadrant house systems such as Placidus.
 */

type Element = 'Fire' | 'Earth' | 'Air' | 'Water';
type Modality = 'Cardinal' | 'Fixed' | 'Mutable';

const SIGNS: Array<[string, Modality, Element]> = [
  ['aries', 'Cardinal', 'Fire'],
  ['taurus', 'Fixed', 'Earth'],
  ['gemini', 'Mutable', 'Air'],
  ['cancer', 'Cardinal', 'Water'],
  ['leo', 'Fixed', 'Fire'],
  ['virgo', 'Mutable', 'Earth'],
  ['libra', 'Cardinal', 'Air'],
  ['scorpio', 'Fixed', 'Water'],
  ['sagittarius', 'Mutable', 'Fire'],
  ['capricorn', 'Cardinal', 'Earth'],
  ['aquarius', 'Fixed', 'Air'],
  ['pisces', 'Mutable', 'Water'],
];

const LOCALES = ['ja', 'ko', 'zh'] as const;
type Lng = (typeof LOCALES)[number];

function overlay(lng: Lng, ns: 'learn-astrology' | 'learn-glossary'): Record<string, Record<string, unknown>> {
  const p = resolve(__dirname, `../../i18n/locales/${lng}/${ns}.json`);
  return JSON.parse(readFileSync(p, 'utf-8'));
}

function astro(slug: string) {
  const e = astrologyEntries.find((x) => x.slug === slug);
  if (!e) throw new Error(`no astrology entry ${slug}`);
  return e;
}

function gloss(slug: string) {
  const e = glossaryEntries.find((x) => x.slug === slug);
  if (!e) throw new Error(`no glossary entry ${slug}`);
  return e;
}

const str = (v: unknown) => JSON.stringify(v);

describe('a square joins one modality', () => {
  it('the 12 sign entries carry the reference element and modality', () => {
    const signs = astrologyEntries.filter((e) => e.category === 'sign');
    expect(signs.map((s) => s.slug)).toEqual(SIGNS.map((s) => s[0]));
    for (const [slug, modality, element] of SIGNS) {
      const e = astro(slug);
      expect(e.modality, slug).toBe(modality);
      expect(e.element, slug).toBe(element);
    }
  });

  it('squares share modality (12 of 12), trines share element, quincunxes share neither', () => {
    for (let i = 0; i < 12; i++) {
      const [, m, el] = SIGNS[i];
      const sq = SIGNS[(i + 3) % 12];
      expect(sq[1]).toBe(m);
      expect(sq[2]).not.toBe(el);
      const tr = SIGNS[(i + 4) % 12];
      expect(tr[2]).toBe(el);
      const qx = SIGNS[(i + 5) % 12];
      expect(qx[1]).not.toBe(m);
      expect(qx[2]).not.toBe(el);
    }
  });
});

describe('square copy', () => {
  it('en: same modality, not incompatible modalities', () => {
    const a = astro('square').longDescription;
    const g = gloss('square').longDefinition;
    expect(a).not.toMatch(/incompatible (?:signs and )?modalit/i);
    expect(g).not.toMatch(/incompatible (?:signs and )?modalit/i);
    expect(a).toContain('same modality');
    expect(g).toContain('share a modality');
  });

  const cases: Record<Lng, { bad: string; good: RegExp }> = {
    ja: { bad: '相容れない', good: /モダリティ(?:が|は)同じ/ },
    ko: { bad: '서로 맞지 않는', good: /(?:모달리티\(modality\)는|특질은) 같/ },
    zh: { bad: '不相容', good: /模式相同/ },
  };
  for (const lng of LOCALES) {
    it(`${lng}: same modality`, () => {
      const a = str(overlay(lng, 'learn-astrology').square.longDescription);
      const g = str(overlay(lng, 'learn-glossary').square.longDefinition);
      expect(a).not.toContain(cases[lng].bad);
      expect(g).not.toContain(cases[lng].bad);
      expect(a + g).toMatch(cases[lng].good);
    });
  }
});

// ---- Pluto -------------------------------------------------------------------

const DAY = 86_400_000;
const YEAR = 365.25 * DAY;

function plutoLon(t: number): number {
  return Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body.Pluto, new Date(t), true)).elon;
}

/** Signed difference in (-180, 180]. */
function norm(d: number): number {
  let x = ((d % 360) + 360) % 360;
  if (x > 180) x -= 360;
  return x;
}

/** Age in years at the first exact transit of natal + offset, or null within 140 years. */
function firstHit(birthYear: number, offset: number): number | null {
  const birth = Date.UTC(birthYear, 6, 1, 12);
  const target = plutoLon(birth) + offset;
  const f = (t: number) => norm(plutoLon(t) - target);
  const start = birth + (offset === 90 ? 25 : 60) * YEAR;
  const end = birth + 140 * YEAR;
  const step = 10 * DAY;
  let t0 = start;
  let f0 = f(t0);
  for (let t1 = t0 + step; t1 <= end; t1 += step) {
    const f1 = f(t1);
    if (f0 < 0 && f1 >= 0 && f1 - f0 < 10) {
      let lo = t0;
      let hi = t1;
      for (let k = 0; k < 30; k++) {
        const mid = (lo + hi) / 2;
        if (f(mid) < 0) lo = mid;
        else hi = mid;
      }
      return (hi - birth) / YEAR;
    }
    t0 = t1;
    f0 = f1;
  }
  return null;
}

describe('Pluto’s personal arc', () => {
  it(
    'astronomy-engine gives the reference square and opposition ages',
    () => {
      const sq: Array<[number, number]> = [
        [1950, 39.5],
        [1970, 35.5],
        [1990, 41.8],
        [1995, 45.8],
        [2005, 54.9],
      ];
      for (const [y, age] of sq) {
        const got = firstHit(y, 90);
        expect(got, `square ${y}`).not.toBeNull();
        expect(Math.abs((got as number) - age), `square ${y}: ${got}`).toBeLessThanOrEqual(0.2);
      }
      const opp: Array<[number, number | null]> = [
        [1950, 82.8],
        [1970, 91.8],
        [1990, 120.9],
        [2005, null],
      ];
      for (const [y, age] of opp) {
        const got = firstHit(y, 180);
        if (age === null) expect(got, `opposition ${y}`).toBeNull();
        else expect(Math.abs((got as number) - age), `opposition ${y}: ${got}`).toBeLessThanOrEqual(0.2);
      }
    },
    60_000,
  );

  it(
    'the copy’s claims hold: square 35-42 for 1950-1990 births, opposition after ~83',
    () => {
      for (let y = 1950; y <= 1990; y += 5) {
        const got = firstHit(y, 90) as number;
        expect(got, `square ${y}`).toBeGreaterThanOrEqual(35);
        expect(got, `square ${y}`).toBeLessThanOrEqual(42.5);
      }
      for (let y = 1940; y <= 2000; y += 10) {
        const got = firstHit(y, 180);
        if (got !== null) expect(got, `opposition ${y}`).toBeGreaterThanOrEqual(82.5);
      }
    },
    60_000,
  );

  it('en copy names the square, 248 years, and no young opposition', () => {
    const s = astro('pluto').inSpirituality;
    expect(s).not.toMatch(/opposition[^.]{0,30}\b[1-7]\d\b/i);
    expect(s).not.toContain('returns are rare');
    expect(s).toContain('248 years');
    expect(s).toContain('Pluto square');
  });

  const cases: Record<Lng, { bad: string; good: string[] }> = {
    ja: { bad: '衝（40', good: ['248年', 'スクエア'] },
    ko: { bad: '대립(40', good: ['248년', '직각'] },
    zh: { bad: '对分相（大约40', good: ['248年', '四分相'] },
  };
  for (const lng of LOCALES) {
    it(`${lng} copy`, () => {
      const s = String(overlay(lng, 'learn-astrology').pluto.inSpirituality);
      expect(s).not.toContain(cases[lng].bad);
      for (const g of cases[lng].good) expect(s).toContain(g);
    });
  }
});

describe('a conjunction is an orb, not a sign', () => {
  it('28° Aries and 3° Taurus are 5° apart, inside the stated 8°', () => {
    const aries28 = 0 * 30 + 28;
    const taurus3 = 1 * 30 + 3;
    expect(Math.abs(norm(taurus3 - aries28))).toBe(5);
    expect(Math.abs(norm(taurus3 - aries28))).toBeLessThanOrEqual(8);
  });

  it('en copy', () => {
    const c = astro('conjunction');
    const g = gloss('conjunction');
    const bad = /of each other in the same sign|sit in the same degree|occupy the same point/i;
    for (const s of [c.longDescription, c.faqs[0].a, g.shortDefinition, g.longDefinition]) {
      expect(s).not.toMatch(bad);
    }
    expect(c.longDescription).toContain('28° Aries and 3° Taurus');
  });

  const cases: Record<Lng, string[]> = {
    ja: ['同じ星座の中で', '同じ度数に位置', '同じ位置にある'],
    ko: ['같은 별자리 안에서', '같은 도수에 자리', '같은 지점에'],
    zh: ['在同一星座中', '落在同一度数', '同一点'],
  };
  for (const lng of LOCALES) {
    it(`${lng} copy`, () => {
      const text =
        str(overlay(lng, 'learn-astrology').conjunction) + str(overlay(lng, 'learn-glossary').conjunction);
      for (const b of cases[lng]) expect(text).not.toContain(b);
    });
  }
});

describe('MC and IC are cusps only in quadrant systems', () => {
  it('en glossary', () => {
    const mc = gloss('midheaven');
    const ic = gloss('ic');
    expect(mc.shortDefinition).not.toContain('highest point of the ecliptic');
    expect(mc.shortDefinition).toContain('quadrant');
    expect(ic.shortDefinition).toContain('quadrant');
    expect(mc.alsoKnownAs?.[2]).toContain('(quadrant systems)');
    expect(ic.alsoKnownAs?.[2]).toContain('(quadrant systems)');
  });

  const cases: Record<Lng, { bad: string; good: string }> = {
    ja: { bad: '黄道の最も高い点', good: '象限式' },
    ko: { bad: '황도에서 가장 높은', good: '사분면' },
    zh: { bad: '黄道的最高点', good: '象限宫位制' },
  };
  for (const lng of LOCALES) {
    it(`${lng} glossary`, () => {
      const g = overlay(lng, 'learn-glossary');
      const mc = str(g.midheaven);
      const ic = str(g.ic);
      expect(mc).not.toContain(cases[lng].bad);
      expect(mc).toContain(cases[lng].good);
      expect(ic).toContain(cases[lng].good);
    });
  }
});
