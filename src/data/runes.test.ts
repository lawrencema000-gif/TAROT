import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RUNES, RUNE_IDS, RUNE_TEXT_FIELDS, runeId, runesCorpus } from './runes';
import { ctEntry, type ContentOverlay } from '../i18n/contentOverlay';

/**
 * The 'runes' content overlay: RunesPage reads `runes.<id>.<field>` through
 * ctEntry. Every path it reads must exist in the English corpus the
 * translators are given, and a shipped translation may only use those paths.
 */
const corpus = runesCorpus();

/** The corpus with every string marked, so a read that falls back to English shows. */
function marked(): ContentOverlay {
  const runes: Record<string, Record<string, string>> = {};
  for (const [id, entry] of Object.entries(corpus.runes)) {
    runes[id] = Object.fromEntries(Object.entries(entry).map(([k, v]) => [k, `«${v}»`]));
  }
  return { runes };
}

describe('runes overlay', () => {
  it('gives each of the 24 staves its own id, in Elder Futhark order', () => {
    expect(RUNES).toHaveLength(24);
    expect(RUNE_IDS).toHaveLength(24);
    expect(new Set(RUNES.map(runeId)).size).toBe(24);
    RUNES.forEach((rune, i) => {
      expect(rune.number).toBe(i + 1);
      expect(runeId(rune)).toBe(rune.name.toLowerCase());
    });
  });

  it('every field RunesPage shows resolves through the corpus', () => {
    const overlay = marked();
    for (const rune of RUNES) {
      const local = ctEntry(rune, overlay, `runes.${runeId(rune)}`, RUNE_TEXT_FIELDS);
      for (const field of RUNE_TEXT_FIELDS) {
        const en = rune[field];
        if (en === undefined) expect(local[field], `${rune.name}.${field}`).toBeUndefined();
        else expect(local[field], `${rune.name}.${field}`).toBe(`«${en}»`);
      }
      expect(local.glyph).toBe(rune.glyph);
    }
  });

  it('an empty overlay leaves every stave in English', () => {
    for (const rune of RUNES) expect(ctEntry(rune, {}, `runes.${runeId(rune)}`, RUNE_TEXT_FIELDS)).toEqual(rune);
  });

  it('carries only user-facing strings', () => {
    const all = Object.values(corpus.runes).flatMap((e) => Object.values(e));
    expect(all).toHaveLength(160);
    expect(all.filter((s) => !s.trim())).toEqual([]);
  });

  const paths = (v: unknown, prefix = ''): string[] =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.entries(v).flatMap(([k, x]) => paths(x, prefix ? `${prefix}.${k}` : k))
      : [prefix];
  const known = new Set(paths(corpus));
  for (const lng of ['ja', 'ko', 'zh']) {
    it(`${lng} content-runes.json keys are corpus paths`, () => {
      const file = join(process.cwd(), 'src/i18n/locales', lng, 'content-runes.json');
      const data = JSON.parse(readFileSync(file, 'utf8')) as unknown;
      expect(paths(data).filter((p) => p && !known.has(p))).toEqual([]);
    });
  }
});
