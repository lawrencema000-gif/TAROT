import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { astrologyEntries } from '../../data/astrologyLearn';
import { numerologyEntries } from '../../data/numerologyLearn';
import { glossaryEntries } from '../../data/glossaryLearn';
import { crystalEntries } from '../../data/crystalsLearn';
import {
  ASTRO_PROSE_FIELDS,
  NUMEROLOGY_PROSE_FIELDS,
  GLOSSARY_PROSE_FIELDS,
  CRYSTAL_PROSE_FIELDS,
  type LearnModule,
} from '../../i18n/learnOverlay';

/**
 * The learn overlays say the same things as the English.
 *
 * `src/i18n/locales/<lng>/learn-<module>.json` carries the translated prose
 * of the learn library keyed by slug (see src/i18n/learnOverlay.ts). The
 * files ship empty (`{}`) until the translation round fills them, and an
 * empty file is skipped here. Once a file has content it must be complete:
 * every English slug has an overlay, nothing is keyed by a slug the English
 * does not have (a renamed entry would silently stop being translated), no
 * field is outside the prose set the localizer copies (a translated enum
 * would be ignored), list fields keep their length (a dropped FAQ or
 * strength is invisible per field), and no string is empty.
 */

const LOCALES = ['ja', 'ko', 'zh'] as const;
const ROOT = process.cwd();

const MODULES: Record<LearnModule, { slugs: string[]; fields: readonly string[]; lists: Record<string, Record<string, number>> }> = {
  astrology: {
    slugs: astrologyEntries.map((e) => e.slug),
    fields: ASTRO_PROSE_FIELDS,
    lists: Object.fromEntries(
      astrologyEntries.map((e) => [
        e.slug,
        { keywords: e.keywords.length, strengths: e.strengths.length, challenges: e.challenges.length, faqs: e.faqs.length, famousExamples: e.famousExamples?.length ?? 0 },
      ]),
    ),
  },
  numerology: {
    slugs: numerologyEntries.map((e) => e.slug),
    fields: NUMEROLOGY_PROSE_FIELDS,
    lists: Object.fromEntries(
      numerologyEntries.map((e) => [
        e.slug,
        { keywords: e.keywords.length, strengths: e.strengths.length, challenges: e.challenges.length, faqs: e.faqs.length, famousExamples: e.famousExamples.length },
      ]),
    ),
  },
  glossary: {
    slugs: glossaryEntries.map((e) => e.slug),
    fields: GLOSSARY_PROSE_FIELDS,
    lists: Object.fromEntries(glossaryEntries.map((e) => [e.slug, { alsoKnownAs: e.alsoKnownAs?.length ?? 0 }])),
  },
  crystals: {
    slugs: crystalEntries.map((e) => e.slug),
    fields: CRYSTAL_PROSE_FIELDS,
    lists: Object.fromEntries(
      crystalEntries.map((e) => [
        e.slug,
        { keywords: e.keywords.length, howToUse: e.howToUse.length, cleansingMethods: e.cleansingMethods.length, faqs: e.faqs.length },
      ]),
    ),
  },
};

type Json = Record<string, Record<string, unknown>>;

function load(locale: string, module: LearnModule): Json {
  return JSON.parse(readFileSync(join(ROOT, 'src', 'i18n', 'locales', locale, `learn-${module}.json`), 'utf8'));
}

function emptyStrings(value: unknown, path: string, out: string[]) {
  if (typeof value === 'string') {
    if (!value.trim()) out.push(path);
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => emptyStrings(v, `${path}[${i}]`, out));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) emptyStrings(v, `${path}.${k}`, out);
  }
}

describe('the learn overlays match the English library', () => {
  it('every overlay file parses to an object', () => {
    for (const locale of LOCALES) {
      for (const module of Object.keys(MODULES) as LearnModule[]) {
        const data = load(locale, module);
        expect(data && typeof data === 'object' && !Array.isArray(data), `${locale}/learn-${module}.json`).toBe(true);
      }
    }
  });

  for (const locale of LOCALES) {
    for (const module of Object.keys(MODULES) as LearnModule[]) {
      const file = `${locale}/learn-${module}.json`;
      const data = load(locale, module);
      const filled = Object.keys(data).length > 0;

      it.skipIf(!filled)(`${file}: every English slug has an overlay and nothing is stray`, () => {
        const { slugs } = MODULES[module];
        const have = new Set(Object.keys(data));
        const missing = slugs.filter((s) => !have.has(s));
        const stray = [...have].filter((s) => !slugs.includes(s));
        expect(missing).toEqual([]);
        expect(stray).toEqual([]);
      });

      it.skipIf(!filled)(`${file}: only prose fields, full lists, no empty strings`, () => {
        const { fields, lists } = MODULES[module];
        const badFields: string[] = [];
        const badLists: string[] = [];
        const empties: string[] = [];
        for (const [slug, entry] of Object.entries(data)) {
          for (const [field, value] of Object.entries(entry)) {
            if (!fields.includes(field)) badFields.push(`${slug}.${field}`);
            const want = lists[slug]?.[field];
            if (want !== undefined && Array.isArray(value) && value.length !== want) badLists.push(`${slug}.${field}: ${value.length} vs ${want}`);
            emptyStrings(value, `${slug}.${field}`, empties);
          }
        }
        expect(badFields).toEqual([]);
        expect(badLists).toEqual([]);
        expect(empties).toEqual([]);
      });
    }
  }
});
