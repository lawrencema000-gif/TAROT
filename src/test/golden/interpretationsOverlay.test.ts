import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as lib from '../../data/interpretations';
import { withOverlay } from '../../data/interpretations/localize';
import { interpretationsCorpus, celestialCorpus } from '../../data/interpretations/corpus';
import { PLANETS, SIGNS, ASPECT_TYPES } from '../../data/interpretations/types';
import { CHART_TYPES, FIRDARIA_LORD_MEANINGS } from '../../data/chartSuiteContent';
import { INTERPRETATIONS as CELESTIAL_LINES } from '../../data/celestialInterpretations';
import { ct, type ContentOverlay } from '../../i18n/contentOverlay';

/**
 * The `interpretations` and `celestial` content overlays are keyed the way
 * the screens read them.
 *
 * The corpus the translators work from (data/interpretations/corpus.ts) is
 * run through the same accessors the natal report, People, Compare, the
 * chart library, the astro dice and the city panel use. With every corpus
 * string marked, every accessor must return the marked string — so every
 * path a screen reads exists in the corpus, and a translation keyed off it
 * is one the screens show. With the English corpus as the overlay, every
 * accessor must return exactly the English (the paths carry the same
 * entries, not neighbours).
 */

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

function mark(v: unknown): Json {
  if (typeof v === 'string') return `⟦${v}⟧`;
  if (Array.isArray(v)) return v.map(mark);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, mark(x)]));
  return v as Json;
}

const corpus = interpretationsCorpus() as unknown as ContentOverlay;
const marked = mark(corpus) as ContentOverlay;
const viaMarked = withOverlay(lib, marked);
const viaEnglish = withOverlay(lib, corpus);
const m = (s: string) => `⟦${s}⟧`;

describe('interpretations overlay paths', () => {
  it('planet in sign: all 120 read through the overlay', () => {
    for (const p of PLANETS) {
      for (const s of SIGNS) {
        const en = lib.planetInSignText(p, s)!;
        expect(en, `${p} ${s}`).toBeTruthy();
        expect(viaMarked.planetInSignText(p, s)).toBe(m(en));
        expect(viaEnglish.planetInSignText(p, s)).toBe(en);
      }
    }
  });

  it('planet in house: all 120 read through the overlay', () => {
    for (const p of PLANETS) {
      for (let h = 1; h <= 12; h++) {
        const en = lib.planetInHouseText(p, h)!;
        expect(en, `${p} ${h}`).toBeTruthy();
        expect(viaMarked.planetInHouseText(p, h)).toBe(m(en));
        expect(viaEnglish.planetInHouseText(p, h)).toBe(en);
      }
    }
  });

  it('houses: title, keywords and description', () => {
    for (let h = 1; h <= 12; h++) {
      const en = lib.houseMeaning(h)!;
      const tr = viaMarked.houseMeaning(h)!;
      expect(tr.title).toBe(m(en.title));
      expect(tr.description).toBe(m(en.description));
      expect(tr.keywords).toEqual(en.keywords.map(m));
      expect(viaEnglish.houseMeaning(h)).toEqual(en);
    }
  });

  it('aspects: every pair and every type, in either planet order', () => {
    for (const a of PLANETS) {
      for (const b of PLANETS) {
        if (a === b) continue;
        for (const type of ASPECT_TYPES) {
          const en = lib.aspectText(a, b, type);
          expect(viaEnglish.aspectText(a, b, type)).toBe(en);
          const tr = viaMarked.aspectText(a, b, type);
          // Both halves are marked: the pair dynamic and the aspect essence.
          expect(tr.match(/⟦/g)?.length, `${a} ${type} ${b}`).toBe(2);
        }
      }
    }
    for (const type of ASPECT_TYPES) expect(viaMarked.aspectEssence(type)).toBe(m(lib.aspectEssence(type)));
  });

  it('sign compatibility: all 144 ordered pairs', () => {
    for (const a of SIGNS) {
      for (const b of SIGNS) {
        const en = lib.signCompatText(a, b)!;
        const tr = viaMarked.signCompatText(a, b)!;
        expect(tr.love).toBe(m(en.love));
        expect(tr.friendship).toBe(m(en.friendship));
        expect(tr.work).toBe(m(en.work));
        expect(tr.score).toBe(en.score);
        expect(viaEnglish.signCompatText(a, b)).toEqual(en);
      }
    }
  });

  it('chart library: every type’s description and when-to-read, every Firdaria lord', () => {
    for (const c of CHART_TYPES) {
      expect(ct(marked, `chartTypes.${c.key}.description`, c.description)).toBe(m(c.description));
      expect(ct(marked, `chartTypes.${c.key}.whenToRead`, c.whenToRead)).toBe(m(c.whenToRead));
    }
    for (const [lord, text] of Object.entries(FIRDARIA_LORD_MEANINGS)) {
      // ChartSuitePage reads `firdaria.<lord without spaces>`.
      expect(ct(marked, `firdaria.${lord.replace(/\s+/g, '')}`, text)).toBe(m(text));
    }
  });

  it('carries no ids or numbers as translatable values', () => {
    const walk = (v: unknown, path: string) => {
      if (typeof v === 'number') throw new Error(`number at ${path}`);
      if (typeof v === 'string') expect(v.trim().length, path).toBeGreaterThan(3);
      else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}.${i}`));
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
    };
    walk(corpus, 'interpretations');
    walk(celestialCorpus(), 'celestial');
  });
});

describe('celestial overlay paths', () => {
  const cel = mark(celestialCorpus()) as ContentOverlay;
  it('every astrocartography line: headline and body', () => {
    let n = 0;
    for (const [planet, byAngle] of Object.entries(CELESTIAL_LINES)) {
      for (const [angle, it] of Object.entries(byAngle)) {
        // CityInsightPanel reads `lines.<Planet>.<Angle>.{headline,body}`.
        expect(ct(cel, `lines.${planet}.${angle}.headline`, it.headline)).toBe(m(it.headline));
        expect(ct(cel, `lines.${planet}.${angle}.body`, it.body)).toBe(m(it.body));
        n++;
      }
    }
    expect(n).toBe(40);
  });
});

describe('shipped overlay files', () => {
  // Once a locale's overlay has content, every key in it must be a path the
  // corpus has (a key the screens do not read is a translation nobody sees).
  const paths = (v: unknown, prefix = ''): string[] =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.entries(v).flatMap(([k, x]) => paths(x, prefix ? `${prefix}.${k}` : k))
      : [prefix];
  const known = {
    interpretations: new Set(paths(corpus)),
    celestial: new Set(paths(celestialCorpus())),
  };
  for (const lng of ['ja', 'ko', 'zh']) {
    for (const mod of ['interpretations', 'celestial'] as const) {
      it(`${lng} content-${mod}.json keys are corpus paths`, () => {
        const file = join(process.cwd(), 'src/i18n/locales', lng, `content-${mod}.json`);
        const data = JSON.parse(readFileSync(file, 'utf8')) as unknown;
        const stray = paths(data).filter((p) => p && !known[mod].has(p));
        expect(stray).toEqual([]);
      });
    }
  }
});
