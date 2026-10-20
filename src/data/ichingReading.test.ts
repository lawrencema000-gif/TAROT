import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ContentOverlay } from '../i18n/contentOverlay';
import { HEXAGRAMS } from './ichingHexagrams';
import { hexagramHeading, ichingCorpus, localizeHexagram } from './ichingReading';

/**
 * The 'iching' content overlay. Before it, a Japanese, Korean or Chinese
 * reader got the hexagram's name in their language and everything else in
 * English: tagline, Judgement, reading, strengths, cautions, journal prompt
 * and the changing hexagram's tagline. A locale that carries a hexagram's
 * name (iching.hexagrams.<n>.name) now has to carry its body too.
 */
const corpus = ichingCorpus();
const ROOT = process.cwd();

type Json = Record<string, unknown>;
const readJson = (...p: string[]): Json => JSON.parse(readFileSync(join(ROOT, ...p), 'utf8'));
const overlay = (lng: string) => readJson('src', 'i18n', 'locales', lng, 'content-iching.json');
const appNames = (lng: string): Record<string, string> => {
  const hx = ((readJson('src', 'i18n', 'locales', lng, 'app.json').iching as Json).hexagrams ?? {}) as Record<string, { name: string }>;
  return Object.fromEntries(Object.entries(hx).map(([n, v]) => [n, v.name]));
};

/** Every leaf path, arrays included (`hexagrams.1.strengths.0`). */
const paths = (v: unknown, prefix = ''): string[] =>
  v && typeof v === 'object'
    ? Object.entries(v).flatMap(([k, x]) => paths(x, prefix ? `${prefix}.${k}` : k))
    : [prefix];
const valueAt = (o: unknown, path: string) => path.split('.').reduce<unknown>((cur, k) => (cur as Record<string, unknown>)?.[k], o);

/** The corpus with every string marked, so a read that falls back to English shows. */
function marked(): ContentOverlay {
  const mark = (v: unknown): unknown =>
    typeof v === 'string' ? `«${v}»`
      : Array.isArray(v) ? v.map(mark)
        : Object.fromEntries(Object.entries(v as object).map(([k, x]) => [k, mark(x)]));
  return mark(corpus) as ContentOverlay;
}

const LOCALES = ['ja', 'ko', 'zh'] as const;
const FIELDS = ['heading', 'tagline', 'judgement', 'interpretation', 'strengths', 'cautions', 'journalPrompt'] as const;

describe('iching corpus', () => {
  it('is all 64 hexagrams, each with every field the result shows', () => {
    expect(Object.keys(corpus.hexagrams).sort((a, b) => +a - +b)).toEqual(Array.from({ length: 64 }, (_, i) => String(i + 1)));
    const leaves = Object.values(HEXAGRAMS).reduce((n, h) => n + 5 + h.strengths.length + h.cautions.length, 0);
    expect(paths(corpus)).toHaveLength(leaves);
    expect(paths(corpus).filter((p) => !String(valueAt(corpus, p)).trim())).toEqual([]);
  });

  it('every string the result shows resolves through the corpus', () => {
    const o = marked();
    for (const h of Object.values(HEXAGRAMS)) {
      expect(localizeHexagram(h, o), String(h.number)).toEqual({
        heading: `«${hexagramHeading(h)}»`,
        tagline: `«${h.tagline}»`,
        judgement: `«${h.judgement}»`,
        interpretation: `«${h.interpretation}»`,
        strengths: h.strengths.map((s) => `«${s}»`),
        cautions: h.cautions.map((s) => `«${s}»`),
        journalPrompt: `«${h.journalPrompt}»`,
      });
    }
  });

  it('English (no overlay) is the data file’s English, headed by the pinyin and the character', () => {
    const h = HEXAGRAMS[51];
    expect(localizeHexagram(h, null)).toEqual({
      heading: 'Zhèn · 震',
      tagline: h.tagline, judgement: h.judgement, interpretation: h.interpretation,
      strengths: h.strengths, cautions: h.cautions, journalPrompt: h.journalPrompt,
    });
  });

  it('a list that lost an item falls back to the English list rather than showing a short one', () => {
    const o = { hexagrams: { 51: { strengths: ['镇定'] } } };
    expect(localizeHexagram(HEXAGRAMS[51], o).strengths).toEqual(HEXAGRAMS[51].strengths);
  });
});

describe('iching overlays', () => {
  const known = paths(corpus).sort();

  for (const lng of LOCALES) {
    it(`${lng}: every hexagram that has a name has its body — content-iching.json translates every corpus path, and only those`, () => {
      const data = overlay(lng);
      // The gate the QA asked for: a name in app.json without a body in the overlay fails here.
      const named = Object.keys(appNames(lng));
      expect(named).toHaveLength(64);
      for (const n of named) {
        for (const f of FIELDS) expect(valueAt(data, `hexagrams.${n}.${f}`), `${lng} ${n}.${f}`).toBeTruthy();
      }
      expect(paths(data).sort()).toEqual(known);
      for (const p of known) {
        const v = valueAt(data, p);
        const en = String(valueAt(corpus, p));
        expect(typeof v === 'string' && v.trim().length > 0, `${lng} ${p}`).toBe(true);
        expect(v, `${lng} ${p} is still English`).not.toBe(en);
        // House rules: no "!" in any locale; no Latin words left in CJK copy.
        expect(String(v), `${lng} ${p}`).not.toMatch(/[!！]/);
        expect(String(v), `${lng} ${p}`).not.toMatch(/[A-Za-z]{2,}/);
      }
    });
  }

  // The full classical name over the tagline: upper trigram, lower trigram,
  // name (水雷屯); a doubled trigram reads name 为/為 image (震为雷), and
  // Korean prints its reading with the hanja (중뢰진(重雷震)).
  const IMAGE = {
    zh: { Heaven: '天', Earth: '地', Thunder: '雷', Water: '水', Mountain: '山', Wind: '风', Fire: '火', Lake: '泽' },
    ja: { Heaven: '天', Earth: '地', Thunder: '雷', Water: '水', Mountain: '山', Wind: '風', Fire: '火', Lake: '沢' },
    ko: { Heaven: '天', Earth: '地', Thunder: '雷', Water: '水', Mountain: '山', Wind: '風', Fire: '火', Lake: '澤' },
  } as const;
  type Trigram = keyof (typeof IMAGE)['zh'];

  for (const lng of ['zh', 'ja'] as const) {
    it(`${lng}: each heading is the hexagram’s full name, built from its trigrams and the name the title shows`, () => {
      const data = overlay(lng);
      const names = appNames(lng);
      const join = lng === 'zh' ? '为' : '為';
      for (const h of Object.values(HEXAGRAMS)) {
        const name = names[h.number].split(lng === 'zh' ? '·' : '・')[0];
        const up = IMAGE[lng][h.upperTrigram as Trigram];
        const low = IMAGE[lng][h.lowerTrigram as Trigram];
        const expected = h.upperTrigram === h.lowerTrigram ? `${name}${join}${up}` : `${up}${low}${name}`;
        expect(valueAt(data, `hexagrams.${h.number}.heading`), `${lng} ${h.number}`).toBe(expected);
      }
    });
  }

  it('ko: each heading is the Korean reading with the hanja of the same trigrams', () => {
    const data = overlay('ko');
    for (const h of Object.values(HEXAGRAMS)) {
      const heading = String(valueAt(data, `hexagrams.${h.number}.heading`));
      const up = IMAGE.ko[h.upperTrigram as Trigram];
      const low = IMAGE.ko[h.lowerTrigram as Trigram];
      const hanja = h.upperTrigram === h.lowerTrigram ? `(重${up}` : `(${up}${low}`;
      expect(heading, String(h.number)).toMatch(/^[가-힣]+\([^()]+\)$/);
      expect(heading.includes(hanja), `${h.number} ${heading}`).toBe(true);
    }
  });

  it('ja titles are written in the shinjitai the readings use', () => {
    const names = Object.values(appNames('ja')).join('');
    expect([...'隨觀剝恆壯晉歸豐濟'].filter((ch) => names.includes(ch))).toEqual([]);
  });
});
