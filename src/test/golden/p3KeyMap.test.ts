// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * WP-P3-00: the P3 key map.
 *
 * Every decision-free P3 package (WP-P3-03, -04, -06, -10, -12) reads its
 * strings from the keys below, added or changed once in all four locales so
 * those packages never edit app.json in parallel. This gate holds the map
 * to its rows and pins the values whose wording the map specifies
 * (tarot-15: the Japanese "Maybe" answer is 「状況次第」, not the bare
 * auxiliary かもしれません).
 */

const LOCALES = ['en', 'ja', 'ko', 'zh'] as const;
type Loc = (typeof LOCALES)[number];

type Json = { [k: string]: Json | string | number | boolean | null | Json[] };

function flat(o: Json | Json[], prefix = '', out: Record<string, string> = {}): Record<string, string> {
  const entries = Array.isArray(o) ? o.map((v, i) => [String(i), v] as const) : Object.entries(o);
  for (const [k, v] of entries) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') flat(v as Json, key, out);
    else if (typeof v === 'string') out[key] = v;
  }
  return out;
}

const APP: Record<Loc, Record<string, string>> = Object.fromEntries(
  LOCALES.map((loc) => [
    loc,
    flat(JSON.parse(readFileSync(join(process.cwd(), 'src', 'i18n', 'locales', loc, 'app.json'), 'utf8'))),
  ]),
) as Record<Loc, Record<string, string>>;

const P3_KEYS = [
  'cardMeaning.yesNo.answer.maybe',
  'cardMeaning.faqItems.meaningQ',
  'cardMeaning.faqItems.reversedQ',
  'cardMeaning.faqItems.yesNoQ',
  'cardMeaning.faqItems.astrologyQ',
  'cardMeaning.faqItems.combinationsQ',
  'tarot.element',
  'cardMeaning.courtRank',
  'readings.shareText',
  'learn.sections.lifePathExamples',
  'learn.numerology.working.method',
  'learn.numerology.working.example',
  'learn.numerology.working.kept',
  'learn.numerology.working.exampleWithEveryDigit',
  'cartomancy.verdict.strengthenedYes',
  'cartomancy.verdict.strengthenedNo',
  'cartomancy.verdict.suitReason',
  'cartomancy.verdict.line',
  'cartomancy.verdict.hearts_one',
  'cartomancy.verdict.hearts_other',
  'cartomancy.verdict.spades_one',
  'cartomancy.verdict.spades_other',
  'cartomancy.verdict.heartsSpades',
  'cartomancy.result.suitMinority',
  'spreadDetail.metaTitle',
  'pageTitles.compatInvite.title',
] as const;

const placeholders = (s: string) => [...s.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]).sort();

describe('P3 key map (WP-P3-00)', () => {
  it('holds the 26 rows of the map', () => {
    expect(P3_KEYS).toHaveLength(26);
    expect(new Set(P3_KEYS).size).toBe(26);
  });

  for (const loc of LOCALES) {
    it(`every key of the map is a non-empty string in ${loc}`, () => {
      const missing = P3_KEYS.filter((k) => typeof APP[loc][k] !== 'string' || APP[loc][k].trim() === '');
      expect(missing).toEqual([]);
    });
  }

  it('every key of the map carries the same placeholders in all four locales', () => {
    for (const k of P3_KEYS) {
      for (const loc of LOCALES) expect([loc, k, placeholders(APP[loc][k] ?? '')]).toEqual([loc, k, placeholders(APP.en[k] ?? '')]);
    }
  });

  it('Japanese "Maybe" is 状況次第, never the bare auxiliary かもしれません (tarot-15)', () => {
    expect(APP.ja['cardMeaning.yesNo.answer.maybe']).toBe('状況次第');
    const answers = Object.entries(APP.ja).filter(([k]) => k.startsWith('cardMeaning.yesNo.answer.'));
    expect(answers.length).toBeGreaterThan(0);
    for (const [k, v] of answers) expect([k, v.endsWith('かもしれません')]).toEqual([k, false]);
  });

  it('en, ko and zh "Maybe" are unchanged', () => {
    expect(APP.en['cardMeaning.yesNo.answer.maybe']).toBe('Maybe');
    expect(APP.ko['cardMeaning.yesNo.answer.maybe']).toBe('아마도');
    expect(APP.zh['cardMeaning.yesNo.answer.maybe']).toBe('也许');
  });

  it('the English FAQ questions take the name with its own article', () => {
    for (const q of ['meaningQ', 'reversedQ', 'yesNoQ', 'astrologyQ', 'combinationsQ']) {
      const v = APP.en[`cardMeaning.faqItems.${q}`];
      expect(v).toContain('{{name}}');
      expect(v.toLowerCase()).not.toContain('the {{name}}');
    }
    expect(APP.en['cardMeaning.faqItems.meaningQ']).toBe('What does {{name}} mean in tarot?');
  });

  it('Japanese uses one word for the element field', () => {
    expect(APP.ja['cardMeaning.element']).toBe('エレメント');
    expect(APP.ja['tarot.element']).toBe(APP.ja['cardMeaning.element']);
  });

  it('the English share text and spread title put the name where it reads right', () => {
    expect(APP.en['readings.shareText']).toBe('My tarot reading on Arcana: {{spread}}');
    expect(APP.en['spreadDetail.metaTitle']).toBe('{{name}} — Tarot Spread Position Meanings');
  });

  const SUIT_WORDS: Record<Loc, RegExp> = { en: /Hearts|Spades/, ja: /ハート|スペード/, ko: /하트|스페이드/, zh: /红心|黑桃/ };
  for (const loc of LOCALES) {
    it(`cartomancy hearts/spades counts are plural-aware in ${loc}`, () => {
      const hs = APP[loc]['cartomancy.verdict.heartsSpades'];
      expect(placeholders(hs)).toEqual(['hearts', 'spades']);
      expect(hs).not.toMatch(SUIT_WORDS[loc]);
      for (const k of ['hearts_one', 'hearts_other', 'spades_one', 'spades_other']) {
        expect(APP[loc][`cartomancy.verdict.${k}`]).toContain('{{count}}');
      }
    });

    it(`the life-path worked example has every part in ${loc}`, () => {
      const ex = APP[loc]['learn.numerology.working.example'];
      for (const p of ['{{date}}', '{{month}}', '{{day}}', '{{year}}', '{{total}}']) expect(ex).toContain(p);
    });
  }
});
