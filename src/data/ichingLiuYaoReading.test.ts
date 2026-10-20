import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ContentOverlay } from '../i18n/contentOverlay';
import { RELATIVE_INFO, type Palace, type Relative, type Spirit } from './liuYao';
import { LIUYAO_INTRO, MOVING_LINE_NOTE, PALACE_MEANINGS, RELATIVE_MEANINGS, SPIRIT_MEANINGS, WORLD_RESPONSE_NOTE } from './liuYaoContent';
import { liuYaoCorpus, liuYaoNotes, palaceText, relativeText, spiritText } from './ichingLiuYaoReading';

/**
 * The 'liuyao' content overlay. Before it, the 六爻 panel on the I Ching
 * result read in English on every screen — the introduction, the palace's
 * temperament, the six relatives and spirits, the 世/應 and moving-line notes.
 */
const corpus = liuYaoCorpus();

const paths = (v: unknown, prefix = ''): string[] =>
  v && typeof v === 'object'
    ? Object.entries(v).flatMap(([k, x]) => paths(x, prefix ? `${prefix}.${k}` : k))
    : [prefix];
const valueAt = (o: unknown, path: string) => path.split('.').reduce<unknown>((cur, k) => (cur as Record<string, unknown>)?.[k], o);

function marked(): ContentOverlay {
  const mark = (v: unknown): unknown =>
    typeof v === 'string' ? `«${v}»`
      : Array.isArray(v) ? v.map(mark)
        : Object.fromEntries(Object.entries(v as object).map(([k, x]) => [k, mark(x)]));
  return mark(corpus) as ContentOverlay;
}

const RELATIVES = Object.keys(RELATIVE_MEANINGS) as Relative[];
const SPIRITS = Object.keys(SPIRIT_MEANINGS) as Spirit[];
const PALACES = Object.keys(PALACE_MEANINGS) as Palace[];

describe('liuyao corpus', () => {
  it('is the introduction, five roles, six spirits, eight palaces and the two reading notes', () => {
    expect(paths(corpus)).toHaveLength(1 + 5 * 4 + 6 * 2 + 8 + 2);
    expect([...RELATIVES].sort()).toEqual(Object.keys(RELATIVE_INFO).sort());
    expect(paths(corpus).filter((p) => !String(valueAt(corpus, p)).trim())).toEqual([]);
  });

  it('every string the panel shows resolves through the corpus', () => {
    const o = marked();
    expect(liuYaoNotes(o)).toEqual({ intro: `«${LIUYAO_INTRO}»`, worldResponse: `«${WORLD_RESPONSE_NOTE}»`, movingLine: `«${MOVING_LINE_NOTE}»` });
    for (const r of RELATIVES) {
      const m = RELATIVE_MEANINGS[r];
      expect(relativeText(r, o), r).toEqual({ name: `«${RELATIVE_INFO[r].en}»`, title: `«${m.title}»`, text: `«${m.text}»`, asks: `«${m.asks}»` });
    }
    for (const s of SPIRITS) expect(spiritText(s, o), s).toEqual({ title: `«${SPIRIT_MEANINGS[s].title}»`, text: `«${SPIRIT_MEANINGS[s].text}»` });
    for (const p of PALACES) expect(palaceText(p, o), p).toBe(`«${PALACE_MEANINGS[p].text}»`);
  });

  it('English (no overlay) is liuYaoContent.ts and the engine’s role names', () => {
    expect(liuYaoNotes(null).intro).toBe(LIUYAO_INTRO);
    expect(relativeText('wealth', null)).toEqual({ name: 'Wealth', ...{ title: RELATIVE_MEANINGS.wealth.title, text: RELATIVE_MEANINGS.wealth.text, asks: RELATIVE_MEANINGS.wealth.asks } });
    expect(spiritText('whiteTiger', null).title).toBe('White Tiger — Metal, West');
    expect(palaceText('zhen', null)).toBe(PALACE_MEANINGS.zhen.text);
  });
});

describe('liuyao overlays', () => {
  const known = paths(corpus).sort();
  for (const lng of ['ja', 'ko', 'zh']) {
    it(`${lng} content-liuyao.json translates every corpus path, and only those`, () => {
      const data = JSON.parse(readFileSync(join(process.cwd(), 'src/i18n/locales', lng, 'content-liuyao.json'), 'utf8')) as unknown;
      expect(paths(data).sort()).toEqual(known);
      for (const p of known) {
        const v = valueAt(data, p);
        const en = String(valueAt(corpus, p));
        expect(typeof v === 'string' && v.trim().length > 0, `${lng} ${p}`).toBe(true);
        expect(v, `${lng} ${p} is still English`).not.toBe(en);
        expect(String(v), `${lng} ${p}`).not.toMatch(/[!！]/);
        expect(String(v), `${lng} ${p}`).not.toMatch(/[A-Za-z]{2,}/);
      }
    });
  }

  it('Korean names the roles in hangul (the panel prints them beside the hanja)', () => {
    const ko = JSON.parse(readFileSync(join(process.cwd(), 'src/i18n/locales/ko/content-liuyao.json'), 'utf8')) as unknown;
    expect(RELATIVES.map((r) => valueAt(ko, `relatives.${r}.name`))).toEqual(['부모', '형제', '자손', '처재', '관귀']);
  });
});
