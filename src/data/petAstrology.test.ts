import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PET_SIGNS, PET_SIGN_FIELDS, SPECIES_INFO, localizePetReading, petsCorpus, readPet } from './petAstrology';
import { ct, type ContentOverlay } from '../i18n/contentOverlay';
import type { Species } from '../dal/people';

/**
 * p8 F24: the 'pets' content overlay. PersonDetailPage reads
 * `signs.<sign>.<field>` and `species.<species>.lens` through
 * localizePetReading; before it, the reading stayed English inside the
 * translated chrome of ja/ko/zh ('The one who feels the weather in the room'
 * under 'コンパニオンアニマル · 子（ね）年 鼠').
 */
const corpus = petsCorpus();
const SIGNS = Object.keys(PET_SIGNS) as (keyof typeof PET_SIGNS)[];
const SPECIES = Object.keys(SPECIES_INFO) as Species[];

const paths = (v: unknown, prefix = ''): string[] =>
  v && typeof v === 'object' && !Array.isArray(v)
    ? Object.entries(v).flatMap(([k, x]) => paths(x, prefix ? `${prefix}.${k}` : k))
    : [prefix];
const valueAt = (o: unknown, path: string) => path.split('.').reduce<unknown>((cur, k) => (cur as Record<string, unknown>)?.[k], o);

/** The corpus with every string marked, so a read that falls back to English shows. */
function marked(): ContentOverlay {
  const mark = (v: unknown): unknown =>
    typeof v === 'string' ? `«${v}»` : Object.fromEntries(Object.entries(v as object).map(([k, x]) => [k, mark(x)]));
  return mark(corpus) as ContentOverlay;
}

describe('pets overlay', () => {
  it('the corpus is the 12 signs × 4 fields and the 9 species lenses, all non-empty', () => {
    expect(SIGNS).toHaveLength(12);
    expect(SPECIES).toHaveLength(9);
    const all = paths(corpus);
    expect(all).toHaveLength(12 * PET_SIGN_FIELDS.length + 9);
    expect(all.filter((p) => !String(valueAt(corpus, p)).trim())).toEqual([]);
  });

  it('every field the pet card shows resolves through the corpus', () => {
    const overlay = marked();
    const tr = (path: string, en: string) => ct(overlay, path, en);
    // One birth date per sign (the middle of each sign), for every species and none.
    const dates = ['2020-04-05', '2020-05-05', '2020-06-05', '2020-07-05', '2020-08-05', '2020-09-05',
      '2020-10-08', '2020-11-08', '2020-12-08', '2021-01-05', '2021-02-05', '2021-03-05'];
    const seen = new Set<string>();
    for (const d of dates) {
      for (const sp of [...SPECIES, null]) {
        const base = readPet(d, sp)!;
        const local = localizePetReading(base, tr);
        seen.add(base.sign);
        for (const f of PET_SIGN_FIELDS) expect(local.reading[f], `${base.sign}.${f}`).toBe(`«${base.reading[f]}»`);
        if (sp) expect(local.speciesLens, `${sp}.lens`).toBe(`«${SPECIES_INFO[sp].lens}»`);
        else expect(local.speciesLens).toBe(base.speciesLens);
        // Not prose: kept as they are.
        expect([local.sign, local.species, local.animal]).toEqual([base.sign, base.species, base.animal]);
      }
    }
    expect(seen.size).toBe(12);
  });

  it('an empty overlay (English) leaves the reading as it is', () => {
    const base = readPet('2020-04-05', 'cat')!;
    expect(localizePetReading(base, (path, en) => ct({}, path, en))).toEqual(base);
  });

  const known = paths(corpus).sort();
  for (const lng of ['ja', 'ko', 'zh']) {
    it(`${lng} content-pets.json translates every corpus path, and only those`, () => {
      const file = join(process.cwd(), 'src/i18n/locales', lng, 'content-pets.json');
      const data = JSON.parse(readFileSync(file, 'utf8')) as unknown;
      expect(paths(data).sort()).toEqual(known);
      for (const p of known) {
        const v = valueAt(data, p);
        expect(typeof v === 'string' && v.trim().length > 0, `${lng} ${p}`).toBe(true);
        expect(v, `${lng} ${p} is still English`).not.toBe(valueAt(corpus, p));
        // House rules: no "!" in any locale; CJK copy has no Latin words left in it.
        expect(String(v), `${lng} ${p}`).not.toMatch(/[!！]/);
        expect(String(v), `${lng} ${p}`).not.toMatch(/[A-Za-z]{3,}/);
      }
    });
  }
});
