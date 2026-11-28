import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import i18n from '../../../i18n/config';
import { fullDeck } from '../../../data/tarotDeck';
import { essenceOf, themeItems } from '../essence';
import { setSummaryDeck } from '../loadPhrases';

const OTHERS = ['ja', 'ko', 'zh'] as const;
const tarotJson = (lng: string) =>
  JSON.parse(readFileSync(join(process.cwd(), 'src', 'i18n', 'locales', lng, 'tarot.json'), 'utf8')) as {
    cards: Record<string, { meaningUpright: string; meaningReversed: string }>;
  };

beforeAll(() => {
  setSummaryDeck(fullDeck);
  for (const lng of OTHERS) i18n.addResourceBundle(lng, 'tarot', tarotJson(lng), true, true);
});

const meanings = (lng: 'en' | (typeof OTHERS)[number]) =>
  fullDeck.flatMap((c) => {
    if (lng === 'en') return [c.meaningUpright, c.meaningReversed];
    const tr = tarotJson(lng).cards[String(c.id)];
    return [tr.meaningUpright, tr.meaningReversed];
  });

describe('the essence', () => {
  it('reads two theme items from the 156 English meanings but The Hermit upright, which falls back to its keywords', () => {
    const all = meanings('en');
    expect(all).toHaveLength(156);
    // The Hermit upright opens with prose ("The Hermit represents the profound journey…").
    expect(all.filter((m) => themeItems(m, 'en').length < 2).map((m) => m.slice(0, 10))).toEqual(['The Hermit']);
    for (const c of fullDeck) for (const r of [false, true]) expect(essenceOf(c.id, r, 'en').items.length).toBeGreaterThanOrEqual(2);
    expect(essenceOf(9, false, 'en').text).toBe('introspection and solitude');
  });

  it('reads two items from the ja, ko and zh meanings, but for The Hermit upright, which falls back to its keywords', () => {
    for (const lng of OTHERS) {
      const short = meanings(lng).filter((m) => themeItems(m, lng).length < 2);
      // The Hermit upright opens with prose in all three ("隠者は孤独と瞑想を通じた…").
      expect(short.length, lng).toBeLessThanOrEqual(1);
      for (const c of fullDeck) {
        for (const reversed of [false, true]) {
          const e = essenceOf(c.id, reversed, lng);
          expect(e.items.length, `${lng} ${c.id} ${reversed}`).toBeGreaterThanOrEqual(2);
          expect(e.text.length, `${lng} ${c.id}`).toBeGreaterThan(0);
        }
      }
    }
    expect(essenceOf(9, false, 'ko').text).toBe('내성과 고독');
  });

  it('joins The Fool’s two themes with the locale’s “and”', () => {
    expect(essenceOf(0, false, 'en')).toMatchObject({
      text: 'new beginnings and innocence',
      first: 'new beginnings',
      second: 'The Fool represents unlimited potential and the start of a journey.',
    });
    expect(essenceOf(0, false, 'ko').text).toBe('새로운 시작과 순수함');
    expect(essenceOf(0, false, 'ja').text).toBe('新しい始まりと無邪気さ');
    expect(essenceOf(0, false, 'zh').text).toBe('新的开始与纯真');
  });

  it('drops a leading “and” and the final stop, and keeps “I” and acronyms capitalized', () => {
    expect(themeItems('Illusion, fear, anxiety, intuition, and the subconscious.', 'en')).toEqual([
      'illusion',
      'fear',
      'anxiety',
      'intuition',
      'the subconscious',
    ]);
    expect(themeItems('I am, AI work, and more.', 'en')).toEqual(['I am', 'AI work', 'more']);
    expect(themeItems('幻想、恐れ、そして潜在意識。', 'ja')).toEqual(['幻想', '恐れ', '潜在意識']);
    expect(themeItems('和谐、平衡、以及爱。', 'zh')).toEqual(['和谐', '平衡', '爱']);
    expect(themeItems('환상, 두려움, 그리고 잠재의식.', 'ko')).toEqual(['환상', '두려움', '잠재의식']);
  });

  it('quotes the King of Swords reversed and the Five of Pentacles upright as their own themes', () => {
    const kos = fullDeck.find((c) => c.name === 'King of Swords')!;
    const fop = fullDeck.find((c) => c.name === 'Five of Pentacles')!;
    expect(essenceOf(kos.id, true, 'en').text).toContain('abuse of intellectual power');
    expect(essenceOf(fop.id, false, 'en').text).toContain('financial hardship');
  });
});
