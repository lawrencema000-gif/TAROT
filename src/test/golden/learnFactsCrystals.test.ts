// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { crystalEntries, type CrystalEntry } from '../../data/crystalsLearn';

/**
 * The crystal library states true mineral facts, in every language.
 *
 * public-seo-06: /crystals/pyrite called pyrite "denser … than real gold"
 * (gold is about four times denser, and the page's own FAQ said lighter),
 * /crystals/clear-quartz called quartz "the most abundant mineral" in the
 * crust (feldspar is) and "pyroelectric" (class 32 is not), /crystals/angelite
 * let a fingernail scratch a Mohs 3.5 stone while its card said "Mohs 4",
 * and /crystals/opal dated the unlucky-opal superstition to medieval Europe
 * while its FAQ traced it to a nineteenth century novel.
 *
 * public-seo-33: the English copy dropped every apostrophe ("Tigers Eye",
 * "fools gold", "cats eye", "bishops rings").
 */

const LOCALES = ['ja', 'ko', 'zh'] as const;
type Locale = (typeof LOCALES)[number];

const overlays: Record<Locale, Record<string, unknown>> = Object.fromEntries(
  LOCALES.map((lng) => [
    lng,
    JSON.parse(readFileSync(join(process.cwd(), 'src/i18n/locales', lng, 'learn-crystals.json'), 'utf8')),
  ]),
) as Record<Locale, Record<string, unknown>>;

const bySlug = new Map(crystalEntries.map((e) => [e.slug, e]));

function entry(slug: string): CrystalEntry {
  const e = bySlug.get(slug);
  if (!e) throw new Error(`no crystal entry ${slug}`);
  return e;
}

/** Every string inside a value (strings, arrays, objects), in order. */
function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}

/** All prose of an English entry, excluding slugs and enum fields. */
const NON_PROSE = new Set(['slug', 'category', 'hardness', 'zodiac', 'chakras', 'element', 'pairsWith', 'relatedEntries']);

function englishProse(e: CrystalEntry): string[] {
  return Object.entries(e)
    .filter(([k]) => !NON_PROSE.has(k))
    .flatMap(([, v]) => strings(v));
}

function overlayText(lng: Locale, slug: string): string {
  const o = overlays[lng][slug];
  expect(o, `${lng} overlay for ${slug}`).toBeTruthy();
  return strings(o).join('\n');
}

function englishText(slug: string): string {
  return englishProse(entry(slug)).join('\n');
}

const MOHS = /Mohs(?: hardness)?(?: is| of)?(?: around| about| roughly)?\s*(\d+(?:\.\d+)?)(?:\s*(?:to|-|–)\s*(\d+(?:\.\d+)?))?/g;

describe('crystal facts', () => {
  it('has the 30 stones', () => {
    expect(crystalEntries).toHaveLength(30);
  });

  it('hardness agrees with the prose', () => {
    const off: string[] = [];
    for (const e of crystalEntries) {
      const stated: number[] = [];
      for (const s of englishProse(e)) {
        for (const m of s.matchAll(MOHS)) {
          stated.push(Number(m[1]));
          if (m[2]) stated.push(Number(m[2]));
        }
      }
      if (stated.length === 0) continue;
      const lo = Math.min(...stated);
      const hi = Math.max(...stated);
      if (e.hardness < lo || e.hardness > hi) off.push(`${e.slug}: field ${e.hardness}, prose ${lo}–${hi}`);
    }
    expect(off).toEqual([]);
    expect(entry('angelite').hardness).toBe(3.5);
  });

  it('no fingernail scratches a stone harder than 2.5', () => {
    const bad: string[] = [];
    const rules: { lng: 'en' | Locale; split: RegExp; mention: RegExp; negation: RegExp }[] = [
      { lng: 'en', split: /(?<=[.!?])\s+/, mention: /fingernail/i, negation: /\bnot\b|cannot|n’t/ },
      { lng: 'ja', split: /(?<=。)/, mention: /爪/, negation: /ません|ない/ },
      { lng: 'ko', split: /(?<=[.!?])\s+/, mention: /손톱/, negation: /않/ },
      { lng: 'zh', split: /(?<=[。！？])/, mention: /指甲/, negation: /不/ },
    ];
    for (const e of crystalEntries) {
      if (e.hardness <= 2.5) continue;
      for (const r of rules) {
        const texts = r.lng === 'en' ? englishProse(e) : strings(overlays[r.lng][e.slug]);
        for (const t of texts) {
          for (const sentence of t.split(r.split)) {
            if (r.mention.test(sentence) && !r.negation.test(sentence)) bad.push(`${e.slug} [${r.lng}]: ${sentence}`);
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  describe('known-false claims are gone', () => {
    const FALSE: Record<string, Record<'en' | Locale, (RegExp | string)[]>> = {
      pyrite: {
        en: [/denser (?:and harder )?than (?:real )?gold/i, /denser than fakes/, /Spanish miners/, /long before flint/],
        ja: ['本物の金より密度が高', '偽物よりは密度が高', 'スペインの鉱夫', '火打ち石よりずっと前'],
        ko: ['실제 금보다 밀도가 높', '모조품보다는 밀도가 높', '스페인 광부', '부싯돌보다 훨씬 이전'],
        zh: ['比真金更致密', '比仿制品更致密', '西班牙矿工', '早在燧石之前'],
      },
      'clear-quartz': {
        en: [/\bthe most abundant mineral/, /piezoelectric and pyroelectric/],
        ja: ['地殻にもっとも豊富', '圧電性と焦電性'],
        ko: ['지각에서 가장 풍부한', '압전성과 초전성'],
        zh: ['地壳中含量最丰富', '压电性和热释电性'],
      },
      opal: {
        en: [/medieval Europe superstitions/i],
        ja: ['中世ヨーロッパでは一時'],
        ko: ['중세 유럽에서는 한때'],
        zh: ['迷信一度对欧泊不利'],
      },
    };
    for (const [slug, byLng] of Object.entries(FALSE)) {
      for (const [lng, patterns] of Object.entries(byLng) as ['en' | Locale, (RegExp | string)[]][]) {
        it(`${slug} [${lng}]`, () => {
          const text = lng === 'en' ? englishText(slug) : overlayText(lng, slug);
          for (const p of patterns) {
            if (typeof p === 'string') expect(text).not.toContain(p);
            else expect(text).not.toMatch(p);
          }
        });
      }
    }
  });

  describe('the true facts are stated', () => {
    it('pyrite gives the densities', () => {
      expect(entry('pyrite').longDescription).toContain('19.3');
      expect(entry('pyrite').longDescription).toContain('5 g/cm³');
    });
    it('clear quartz is second to feldspar and not pyroelectric', () => {
      expect(englishText('clear-quartz')).toContain('second most abundant');
      expect(englishText('clear-quartz')).toContain('not pyroelectric');
    });
    for (const lng of ['en', ...LOCALES] as const) {
      it(`opal names the novel [${lng}]`, () => {
        const text = lng === 'en' ? englishText('opal') : overlayText(lng, 'opal');
        expect(text).toContain('Anne of Geierstein');
        expect(text).toContain('1829');
      });
    }
  });
});

describe('English crystal copy keeps its apostrophes', () => {
  it('no apostrophe is dropped', () => {
    const hits: string[] = [];
    const re = /\b(?:tigers|cats|hawks|fools|bishops)\s+(?:eye|gold|rings)\b|\bearth crust\b/gi;
    for (const e of crystalEntries) {
      for (const m of JSON.stringify(e).matchAll(re)) hits.push(`${e.slug}: ${m[0]}`);
    }
    expect(hits).toEqual([]);
  });

  it('Tiger’s Eye keeps its slug', () => {
    expect(entry('tigers-eye').name).toBe('Tiger’s Eye');
    expect(entry('tigers-eye').slug).toBe('tigers-eye');
  });

  it('every pairsWith and relatedEntries slug resolves', () => {
    const missing: string[] = [];
    for (const e of crystalEntries) {
      for (const s of [...e.pairsWith, ...e.relatedEntries]) {
        if (!bySlug.has(s)) missing.push(`${e.slug} -> ${s}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
