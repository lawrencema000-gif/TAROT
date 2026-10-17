import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ContentOverlay } from '../i18n/contentOverlay';
import { isAspectType, isPlanet } from '../lib/chart';
import { COMPOSITE_PAIRING_READINGS } from './humanDesignCases';
import {
  COMPOSITE_TITLES,
  MBTI_NOTE_TEXT,
  SYNASTRY_ASPECT_TEXT,
  SYNASTRY_GENERIC_TEXT,
  compatCorpus,
  compositeInsights,
  compositeReading,
  compositeTitle,
  fillTemplate,
  localizeInterpretation,
  mbtiNote,
  synastryTextKey,
  type CrossAspectText,
} from './compatReading';

/**
 * The 'compat' content overlay. Before it, the Partner compatibility result
 * read in English inside the translated chrome of ja/ko/zh: every aspect's
 * interpretation (what partner-synastry-adhoc sends), the composite readings
 * and the MBTI note.
 */
const corpus = compatCorpus();
const FN_SOURCE = readFileSync(join(process.cwd(), 'supabase/functions/partner-synastry-adhoc/index.ts'), 'utf8');

const paths = (v: unknown, prefix = ''): string[] =>
  v && typeof v === 'object'
    ? Object.entries(v).flatMap(([k, x]) => paths(x, prefix ? `${prefix}.${k}` : k))
    : [prefix];
const valueAt = (o: unknown, path: string) => path.split('.').reduce<unknown>((cur, k) => (cur as Record<string, unknown>)?.[k], o);
const placeholders = (s: string) => (s.match(/\{\{\w+\}\}/g) ?? []).sort().join(' ');

function marked(): ContentOverlay {
  const mark = (v: unknown): unknown =>
    typeof v === 'string' ? `«${v}»` : Object.fromEntries(Object.entries(v as object).map(([k, x]) => [k, mark(x)]));
  return mark(corpus) as ContentOverlay;
}

/** The function's generic texts, with its `${myPlanet}` / `${partnerPlanet}` as this module's placeholders. */
const fnGeneric = Object.fromEntries(
  [...FN_SOURCE.matchAll(/^\s*(harmonious|challenging|intense):\s*`([^`]*)`,?\s*$/gm)]
    .map(([, flavour, text]) => [flavour, text.replace('${myPlanet}', '{{mine}}').replace('${partnerPlanet}', '{{theirs}}')]),
);
/** The aspect the function would send for a pair, interpretation included (its interpretationFor). */
function fnAspect(myPlanet: string, partnerPlanet: string, type: string, flavour: string): CrossAspectText {
  const key = synastryTextKey(myPlanet, partnerPlanet, type);
  const interpretation = key
    ? SYNASTRY_ASPECT_TEXT[key]
    : fillTemplate(fnGeneric[flavour], { mine: myPlanet, theirs: partnerPlanet });
  return { myPlanet, partnerPlanet, type, flavour, interpretation };
}

describe('the function’s closed vocabulary, mirrored', () => {
  it('every interpretation is the function’s ASPECT_INTERPRETATIONS, key for key and word for word', () => {
    const start = FN_SOURCE.indexOf('const ASPECT_INTERPRETATIONS');
    const block = FN_SOURCE.slice(start, FN_SOURCE.indexOf('\n};', start));
    const rows = Object.fromEntries(
      [...block.matchAll(/^\s*"([A-Za-z]+-[A-Za-z]+-[a-z]+)":\s*"((?:[^"\\]|\\.)*)",?\s*$/gm)].map(([, k, v]) => [k, v]),
    );
    expect(Object.keys(rows)).toHaveLength(43);
    expect(SYNASTRY_ASPECT_TEXT).toEqual(rows);
  });

  it('the three generic texts are the function’s, word for word', () => {
    expect(SYNASTRY_GENERIC_TEXT).toEqual(fnGeneric);
  });

  it('its planets, aspect types and flavours are the ones the names and templates cover', () => {
    const planets = [...FN_SOURCE.matchAll(/\{\s*name:\s*"(\w+)",\s*body:/g)].map((m) => m[1]);
    expect(planets).toHaveLength(10);
    for (const p of planets) expect(isPlanet(p), p).toBe(true);
    const aspects = [...FN_SOURCE.matchAll(/type:\s*"(\w+)",\s*angle:\s*\d+,\s*maxOrb:\s*\d+,\s*flavour:\s*"(\w+)"/g)];
    expect(aspects).toHaveLength(5);
    for (const [, type, flavour] of aspects) {
      expect(isAspectType(type), type).toBe(true);
      expect(flavour in SYNASTRY_GENERIC_TEXT, flavour).toBe(true);
    }
  });

  it('a pair finds the function’s key in either order; a pair it has no text for finds none', () => {
    for (const key of Object.keys(SYNASTRY_ASPECT_TEXT)) {
      const [a, b, type] = key.split('-');
      expect(synastryTextKey(a, b, type)).toBe(key);
      expect(synastryTextKey(b, a, type)).toBe(key);
    }
    expect(synastryTextKey('Mercury', 'Jupiter', 'sextile')).toBeNull();
    expect(synastryTextKey('Sun', 'Sun', 'sextile')).toBeNull();
  });
});

describe('compat overlay', () => {
  it('the corpus is the 43 interpretations, 3 templates, 8 composite readings, 2 titles and the MBTI note', () => {
    const all = paths(corpus);
    expect(all).toHaveLength(43 + 3 + Object.keys(COMPOSITE_PAIRING_READINGS).length + 2 + Object.keys(MBTI_NOTE_TEXT).length);
    expect(all.filter((p) => !String(valueAt(corpus, p)).trim())).toEqual([]);
  });

  it('every interpretation the function can send resolves through the corpus', () => {
    const overlay = marked();
    for (const key of Object.keys(SYNASTRY_ASPECT_TEXT)) {
      const [a, b, type] = key.split('-');
      for (const [mine, theirs] of [[a, b], [b, a]]) {
        const aspect = fnAspect(mine, theirs, type, 'intense');
        expect(localizeInterpretation(aspect, overlay), key).toBe(`«${SYNASTRY_ASPECT_TEXT[key]}»`);
      }
    }
    for (const flavour of ['harmonious', 'challenging', 'intense']) {
      const aspect = fnAspect('Mercury', 'Jupiter', 'sextile', flavour);
      // The overlay's template, with the planets filled in (English names here: the locale is English).
      expect(localizeInterpretation(aspect, overlay)).toBe(`«${fillTemplate(SYNASTRY_GENERIC_TEXT[flavour as 'intense'], { mine: 'Mercury', theirs: 'Jupiter' })}»`);
    }
  });

  it('English (no overlay) is exactly what the function sent', () => {
    for (const aspect of [fnAspect('Venus', 'Sun', 'trine', 'harmonious'), fnAspect('Mercury', 'Jupiter', 'square', 'challenging')]) {
      expect(localizeInterpretation(aspect, null)).toBe(aspect.interpretation);
    }
    const odd = { myPlanet: 'Chiron', partnerPlanet: 'Sun', type: 'quincunx', flavour: 'mystic', interpretation: 'Something new.' };
    expect(localizeInterpretation(odd, marked())).toBe('Something new.');
  });

  it('the MBTI note reads as it did in English, for each relation of the two types', () => {
    expect(mbtiNote('INFJ', 'INFJ', null)).toBe('You share the same type (INFJ). Deep understanding, natural resonance — watch for a shared blind spot neither of you catches.');
    expect(mbtiNote('INTJ', 'ENFP', null)).toBe('You perceive the world similarly (both intuitive) but decide differently (T vs F). One of the classic strong-pairing patterns.');
    expect(mbtiNote('ISTJ', 'ESFP', null)).toBe('You perceive the world similarly (both sensing) but decide differently (T vs F). One of the classic strong-pairing patterns.');
    expect(mbtiNote('INFJ', 'ESFP', null)).toBe('You perceive very differently — one concrete (S), one abstract (N). High-potential pairing if you both stay curious about how the other sees the world.');
    expect(mbtiNote('INFJ', 'ENFP', null)).toBe('You share both perception and judgment functions. Similar worldview — also similar blind spots.');
    expect(mbtiNote('INTJ', 'ENFP', marked())).toBe('«You perceive the world similarly (both «intuitive») but decide differently (T vs F). One of the classic strong-pairing patterns.»');
  });

  it('composite observations: the same picks as before, each title and reading through the corpus', () => {
    const insights = compositeInsights([
      fnAspect('Sun', 'Sun', 'trine', 'harmonious'),
      fnAspect('Moon', 'Saturn', 'conjunction', 'intense'),
      fnAspect('Venus', 'Pluto', 'conjunction', 'intense'),
      fnAspect('Moon', 'Moon', 'square', 'challenging'),
    ]);
    expect(insights).toEqual([
      { key: 'Sun-Sun', planets: ['Sun', 'Sun'] },
      { key: 'Saturn-conjunct', planets: null },
      { key: 'Pluto-strong', planets: null },
      { key: 'Moon-Moon', planets: ['Moon', 'Moon'] },
    ]);
    const overlay = marked();
    expect(compositeTitle('Saturn-conjunct', overlay)).toBe(`«${COMPOSITE_TITLES['Saturn-conjunct']}»`);
    expect(compositeTitle('Saturn-conjunct', null)).toBe('Saturn binding');
    for (const k of Object.keys(COMPOSITE_PAIRING_READINGS)) expect(compositeReading(k, overlay)).toBe(`«${COMPOSITE_PAIRING_READINGS[k]}»`);
  });

  const known = paths(corpus).sort();
  for (const lng of ['ja', 'ko', 'zh']) {
    it(`${lng} content-compat.json translates every corpus path, and only those`, () => {
      const data = JSON.parse(readFileSync(join(process.cwd(), 'src/i18n/locales', lng, 'content-compat.json'), 'utf8')) as unknown;
      expect(paths(data).sort()).toEqual(known);
      for (const p of known) {
        const v = valueAt(data, p);
        const en = String(valueAt(corpus, p));
        expect(typeof v === 'string' && v.trim().length > 0, `${lng} ${p}`).toBe(true);
        expect(v, `${lng} ${p} is still English`).not.toBe(en);
        expect(String(v), `${lng} ${p}`).not.toMatch(/[!！]/);
        // Latin left is only the MBTI letters the English names too (S, N).
        expect(String(v).replace(/\{\{\w+\}\}/g, ''), `${lng} ${p}`).not.toMatch(/[A-Za-z]{2,}/);
        expect(placeholders(String(v)), `${lng} ${p}`).toBe(placeholders(en));
      }
    });
  }
});
