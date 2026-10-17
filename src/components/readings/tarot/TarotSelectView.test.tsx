import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, cleanup, act, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import i18n, { getLocale } from '../../../i18n/config';
import { getSpreadBySlug } from '../../../data/tarotSpreads';
import { tarotPositionLabel } from './spreadLabels';
import { TarotSelectView } from './TarotSelectView';

/**
 * p9 Q03: the select screen's position names under the empty slots.
 *
 * FH-5 (p8 F84) widened each name to 76 px — the card's 64 px plus half of
 * each 12 px gap — so a six-character Japanese phrase fits and names break
 * between phrases. But 76 px was the whole column pitch: two neighbouring
 * boxes touched, centred lines could fill them, and the Celtic Cross read
 * "Challenge orSubconscious Recent past" (gaps of 0 and 2 px at 390 and
 * 360 px, measured in Chromium by the QA driver).
 *
 * The columns are now wider than the cards instead: the name gets the
 * column's width and never more, and the gutter between columns is kept.
 * jsdom lays nothing out, so this holds what decides the layout — the class
 * lists — and does the arithmetic on them with widths measured in Chromium
 * (12 px Inter, the caption size): "Subconscious" 80.0 px (QA: 193–273),
 * "Challenge or" 71.9 px (QA: 121–193); a six-character Japanese phrase
 * 72.0–72.1 px (FH-5: 「伸ばしている」 71.6, 「過ぎ去りつつ」 72.1). Every
 * label of every spread in en/ja/ko/zh was also laid out offline with the
 * shipped Inter metrics (GPOS kerning) and BudouX (scratchpad q03_layout2.py):
 * at 74 / 10 px the worst neighbour gap is en 8.0, ja 12.0, ko 15.5, zh
 * 12.0 px, and no ja or zh label has a run measuring between 74 and 76 px,
 * so every ja and zh name breaks exactly where the 76 px box broke it.
 */

const read = (lng: string, ns: string) => JSON.parse(readFileSync(join(process.cwd(), 'src', 'i18n', 'locales', lng, `${ns}.json`), 'utf8'));
const noop = () => {};

/** Tailwind spacing to px at the default reading size (16 px rem): `w-[4.625rem]`, `gap-x-2.5`, `w-16`. */
function px(cls: string): number {
  const arbitrary = /\[(\d+(?:\.\d+)?)rem\]$/.exec(cls);
  if (arbitrary) return Number(arbitrary[1]) * 16;
  const scale = /-(\d+(?:\.\d+)?)$/.exec(cls);
  if (scale) return Number(scale[1]) * 4;
  throw new Error(`not a spacing class: ${cls}`);
}
const classes = (el: Element) => el.className.split(/\s+/).filter(Boolean);
const one = (el: Element, re: RegExp) => {
  const found = classes(el).filter((c) => re.test(c));
  expect(found, `${re} on "${el.className}"`).toHaveLength(1);
  return found[0];
};
/** Horizontal margin on each side, in px: `-mx-1.5` → −6. */
const sideMargin = (el: Element) =>
  classes(el)
    .filter((c) => /^-?mx-/.test(c))
    .reduce((sum, c) => sum + (c.startsWith('-') ? -1 : 1) * px(c.replace(/^-/, '')), 0);

function mountSpread(slug: string) {
  const spread = getSpreadBySlug(slug)!;
  const t = i18n.getFixedT(getLocale(), 'app');
  const labels = spread.positions.map((_, i) => tarotPositionLabel(t as never, slug, i));
  render(
    <TarotSelectView
      deckCards={Array.from({ length: 78 }, (_, i) => i)}
      selectedIndices={[]}
      needsMore={labels.length}
      positionLabels={labels}
      cardBackUrl={null}
      onBack={noop}
      onCardSelect={noop}
      onReveal={noop}
    />,
  );
  const list = screen.getByRole('list');
  return { list, items: within(list).getAllByRole('listitem'), labels };
}

/**
 * The layout the classes describe, in px: the column, the gap between
 * columns, and the box each name is set in (the column, less or plus its
 * horizontal margins), whose neighbours sit `pitch` apart.
 */
function geometry(list: HTMLElement, items: HTMLElement[]) {
  const column = px(one(items[0], /^w-/));
  for (const item of items) expect(px(one(item, /^w-/))).toBe(column);
  const gap = px(one(list, /^gap-(?:x-)?\d/));
  const nameBox = column - 2 * sideMargin(items[0].lastElementChild!);
  const pitch = column + gap;
  return { column, gap, nameBox, pitch, nameGutter: pitch - nameBox, rowOf4: 4 * column + 3 * gap };
}

beforeAll(async () => {
  for (const ns of ['app', 'common']) i18n.addResourceBundle('ja', ns, read('ja', ns), true, true);
  await i18n.changeLanguage('en');
});
afterEach(() => cleanup());
afterAll(async () => {
  await i18n.changeLanguage('en');
});

describe('the select screen’s position names keep a gutter and their phrases (p9 Q03)', () => {
  it.each(['celtic-cross', 'career-path', 'relationship-cross', 'shadow-work'])('%s (en): each name fills its column and no more; four columns fit 360 px with an 8 px gutter at worst', (slug) => {
    const { list, items, labels } = mountSpread(slug);
    expect(items).toHaveLength(labels.length);
    expect(classes(list)).toEqual(expect.arrayContaining(['flex', 'flex-wrap', 'justify-center']));
    const g = geometry(list, items);
    for (const [i, item] of items.entries()) {
      const name = item.lastElementChild as HTMLElement;
      expect(name.textContent).toBe(labels[i]);
      expect(classes(name)).toEqual(expect.arrayContaining(['keep-phrases', 'text-center']));
      // The card stays 64 px, centred in its column.
      expect(classes(item)).toEqual(expect.arrayContaining(['flex', 'flex-col', 'items-center']));
      expect(classes(item.firstElementChild!)).toContain('w-16');
    }
    // Four per row on a 360 px screen (328 px inside the 16 px gutters) and on 390 (358).
    expect(g.rowOf4).toBeLessThanOrEqual(360 - 32);
    expect(5 * g.column + 4 * g.gap).toBeGreaterThan(390 - 32);
    // A name is never wider than the pitch less a real gutter (HEAD: a 76 px box on a 76 px pitch, 0).
    expect(g.nameGutter).toBeGreaterThanOrEqual(8);
    // The worst en pair (Celtic Cross row 1): "Challenge or" beside "Subconscious",
    // a word wider than any box, which spills out centred. HEAD: 0.03 px apart.
    expect(g.pitch - (71.94 + 80.0) / 2).toBeGreaterThanOrEqual(8);
  });

  it.each(['celtic-cross', 'career-path', 'relationship-cross', 'job-decision', 'crossroads'])('%s (ja): a six-character phrase fits a column, a seventh character never did', async (slug) => {
    await act(async () => { await i18n.changeLanguage('ja'); });
    try {
      const { list, items, labels } = mountSpread(slug);
      expect(labels.every((l) => /[\u3040-\u30ff\u4e00-\u9fff]/.test(l))).toBe(true);
      const g = geometry(list, items);
      for (const item of items) expect(classes(item.lastElementChild!)).toContain('keep-phrases');
      // 「伸ばしている」 / 「過ぎ去りつつ」: 72.0–72.1 px at 12 px — inside the name's box (F84 holds).
      expect(g.nameBox).toBeGreaterThan(72.1 + 1);
      // Seven full-width characters (84 px) never fitted the old 76 px box either:
      // no ja line changes, only the gutter beside it (12 px at worst, 84 − 72; HEAD 4).
      expect(g.nameBox).toBeLessThan(7 * 12);
      expect(g.pitch - 72).toBeGreaterThanOrEqual(12);
      expect(g.nameGutter).toBeGreaterThanOrEqual(8);
    } finally {
      await act(async () => { await i18n.changeLanguage('en'); });
    }
  });
});
