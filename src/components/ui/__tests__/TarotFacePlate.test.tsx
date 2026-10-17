import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import postcss from 'postcss';

import i18n from '../../../i18n/config';
import { TarotFace } from '../TarotFace';

/*
 * p9 Q36: the name plate of a card face ('fill' on the Library sheet and the
 * shared page, 'thumb' in lists) is balanced over two lines (text-balance),
 * and every Japanese character was a break opportunity: 「ペンタク/ルのキング」,
 * also ペンタクルのエース / ペイジ / ナイト. The plate now opts in to the
 * phrase-breaking rule (index.css, F84): auto-phrase in ja, keep-all in ko.
 *
 * jsdom applies no cascade, so the breaking is computed from index.css as
 * src/test/golden/cjkLineBreaks.test.ts computes it: the last matching
 * zero-specificity rule that declares the property, else the parent's value.
 */

const CSS = readFileSync(join(process.cwd(), 'src', 'index.css'), 'utf8');
const RULES: Array<{ selector: string; value: string }> = [];
postcss.parse(CSS).walkRules((rule) => {
  rule.each((node) => {
    if (node.type === 'decl' && node.prop === 'word-break') RULES.push({ selector: rule.selector, value: node.value });
  });
});
function wordBreak(el: Element): string {
  for (let e: Element | null = el; e; e = e.parentElement) {
    let value: string | undefined;
    for (const r of RULES) {
      try {
        if (e.matches(r.selector)) value = r.value;
      } catch {
        /* a selector jsdom cannot parse is not one of these */
      }
    }
    if (value !== undefined) return value;
  }
  return 'normal';
}

const read = (lng: string, ns: string) => JSON.parse(readFileSync(join(process.cwd(), 'src', 'i18n', 'locales', lng, `${ns}.json`), 'utf8'));
const KING_OF_PENTACLES = { id: 77, name: 'King of Pentacles', arcana: 'minor' as const, suit: 'pentacles' as const };

/** The plate: the strip at the foot of the face holding the name. */
const plateOf = (container: HTMLElement) => container.querySelector('.bottom-0 > span') as HTMLElement;

beforeAll(async () => {
  for (const lng of ['ja', 'ko', 'zh']) {
    for (const ns of ['app', 'common', 'tarot']) i18n.addResourceBundle(lng, ns, read(lng, ns), true, true);
  }
});
afterEach(() => {
  cleanup();
  document.documentElement.lang = 'en';
});
afterAll(async () => {
  await i18n.changeLanguage('en');
});

describe('p9 Q36 — a card’s name plate breaks between phrases', () => {
  it.each([
    ['ja', 'auto-phrase', 'ペンタクルのキング'],
    ['ko', 'keep-all', '펜타클 왕'],
    ['zh', 'auto-phrase', '星币国王'],
  ])('%s: the fill and thumb plates opt in to the phrase rule (%s)', async (lng, expected, name) => {
    await act(async () => { await i18n.changeLanguage(lng); });
    document.documentElement.lang = lng;
    for (const size of ['fill', 'thumb'] as const) {
      const { container, unmount } = render(<TarotFace card={KING_OF_PENTACLES} size={size} detail="full" />);
      const plate = plateOf(container);
      expect(plate.textContent).toBe(name);
      const c = plate.className.split(/\s+/);
      expect(c).toEqual(expect.arrayContaining(['keep-phrases', 'text-balance', 'lining-nums']));
      expect(wordBreak(plate)).toBe(expected);
      unmount();
    }
  });

  it('ja: the name the QA saw split 「ペンタク/ルのキング」', async () => {
    await act(async () => { await i18n.changeLanguage('ja'); });
    document.documentElement.lang = 'ja';
    const { container } = render(<TarotFace card={KING_OF_PENTACLES} size="fill" detail="full" />);
    expect(plateOf(container).textContent).toBe('ペンタクルのキング');
    expect(wordBreak(plateOf(container))).toBe('auto-phrase');
  });

  it('en: unchanged — the rule is for ja, ko and zh only', async () => {
    await act(async () => { await i18n.changeLanguage('en'); });
    document.documentElement.lang = 'en';
    const { container } = render(<TarotFace card={KING_OF_PENTACLES} size="fill" detail="full" />);
    // "King" over "of Pentacles", as before.
    expect(plateOf(container).textContent).toBe('Kingof Pentacles');
    expect(wordBreak(plateOf(container))).toBe('normal');
  });
});
