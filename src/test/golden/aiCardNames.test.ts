import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import i18n from '../../i18n/config';
import { getCartoSpread, getPlayingCardBySlug } from '../../data/cartomancy';
import { fullDeck } from '../../data/tarotDeck';
import { cartoCombinations, cartoCombinationsForAI } from '../../components/cartomancy/cartoFlow';
import { localizeCard } from '../../i18n/localizeCard';
import { combinationHitsToLines, playingCardToReadingCard, tarotCardToReadingCard } from '../../services/readingInterpretation';
import {
  cardHeadLine,
  cardNamesRule,
  cardPromptLines,
  fallbackReadingText,
  type ReadingTextCard,
} from '../../../supabase/functions/generate-reading/reading-text';
import type { PlayingCard } from '../../types/cartomancy';

/*
 * p10 d2-ja-01: the paid AI reading of a Japanese 3枚引き named its cards
 * "Five of Clubs", "Queen of Diamonds" and "Nine of Hearts" ("Five of Clubs
 * と Queen of Diamonds の並びは…", "- 過去から抱えているもの（Five of Clubs）"),
 * and another run wrote 「九のダイヤ」 for the table's ダイヤの9: the request
 * carried the English names only (cards[].name, and the combination lines),
 * and nothing told the model which names to use. The request now carries
 * each card's name as the table shows it, the combination lines as the
 * reader's list prints them, and the prompt heads each card with that name
 * and tells the model to write it exactly. Tarot readings likewise.
 */

const LOCALES = ['ja', 'ko', 'zh'] as const;
const read = (lng: string, ns: string) => JSON.parse(readFileSync(join(process.cwd(), 'src', 'i18n', 'locales', lng, `${ns}.json`), 'utf8'));
/** A card's name in a locale's corpus file, by id: what the table shows. */
const corpusName = (lng: string, ns: 'cartomancy' | 'tarot', id: number): string => read(lng, ns).cards[String(id)].name;

/** The QA table: クラブの5, ダイヤのクイーン, ハートの9. */
const TABLE = ['five-of-clubs', 'queen-of-diamonds', 'nine-of-hearts'].map((slug) => getPlayingCardBySlug(slug) as PlayingCard);
const EN_CARD_NAME = /\b(?:Ace|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Jack|Queen|King|Hearts|Clubs|Diamonds|Spades)\b/;

beforeAll(() => {
  for (const lng of LOCALES) {
    for (const ns of ['cartomancy', 'tarot', 'app']) i18n.addResourceBundle(lng, ns, read(lng, ns), true, true);
  }
});
afterAll(() => {
  for (const lng of LOCALES) {
    i18n.removeResourceBundle(lng, 'cartomancy');
    i18n.removeResourceBundle(lng, 'tarot');
  }
});

describe('d2-ja-01 — the request names each card as the table does', () => {
  it('ja: a playing card carries its English name and the table’s name', () => {
    expect(TABLE.map((c) => playingCardToReadingCard(c, false, 'ja')).map(({ name, localName }) => ({ name, localName }))).toEqual([
      { name: 'Five of Clubs', localName: 'クラブの5' },
      { name: 'Queen of Diamonds', localName: 'ダイヤのクイーン' },
      { name: 'Nine of Hearts', localName: 'ハートの9' },
    ]);
  });

  it.each(LOCALES)('%s: every playing card’s localName is its corpus name, never the English one', (lng) => {
    for (const card of TABLE) {
      const sent = playingCardToReadingCard(card, true, lng);
      expect(sent.name).toBe(card.name);
      expect(sent.localName).toBe(corpusName(lng, 'cartomancy', card.id));
      expect(sent.localName).not.toMatch(EN_CARD_NAME);
      // The meanings ride along as before.
      expect(sent.meaningUpright).toBe(card.meaningUpright);
      expect(sent.reversed).toBe(true);
    }
  });

  it('en: the table’s name is the English one', () => {
    for (const card of TABLE) expect(playingCardToReadingCard(card, false, 'en').localName).toBe(card.name);
  });

  it('ja: a tarot card carries its English name and the table’s name (generate-reading files the reading under the latter)', () => {
    const sent = [0, 1, 2].map((id) => tarotCardToReadingCard(localizeCard(fullDeck.find((c) => c.id === id)!, 'ja'), false, 'ja'));
    // The Japanese tarot table generate-reading-card-names.test.ts sends through the real function.
    expect(sent.map(({ name, localName }) => ({ name, localName }))).toEqual([
      { name: 'The Fool', localName: '愚者' },
      { name: 'The Magician', localName: '魔術師' },
      { name: 'The High Priestess', localName: '女教皇' },
    ]);
  });

  it.each(LOCALES)('%s: a tarot card (the localized deck on the table) carries the card table’s English name and its own', (lng) => {
    for (const id of [3, 10, 64]) {
      const english = fullDeck.find((c) => c.id === id)!;
      const sent = tarotCardToReadingCard(localizeCard(english, lng), false, lng);
      expect(sent.name).toBe(english.name);
      expect(sent.localName).toBe(corpusName(lng, 'tarot', id));
    }
    // The Wheel's English spelling is the card table's, not the image table's.
    expect(tarotCardToReadingCard(localizeCard(fullDeck[10], lng), false, lng).name).toBe('The Wheel of Fortune');
  });

  it('tarot: the names follow the reading’s language, even from a deck localized in another', () => {
    const empressJa = localizeCard(fullDeck[3], 'ja');
    expect(tarotCardToReadingCard(empressJa, false, 'en')).toMatchObject({ name: 'The Empress', localName: 'The Empress' });
    expect(tarotCardToReadingCard(empressJa, false, 'ko')).toMatchObject({ name: 'The Empress', localName: '여황제' });
  });

  it.each(LOCALES)('%s: the combination lines are the reader’s list — the table’s names, no English card names', (lng) => {
    const spread = getCartoSpread('carto-three-timeline')!;
    const lines = combinationHitsToLines(cartoCombinationsForAI(cartoCombinations(spread, TABLE)), 6, lng);
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line, line).not.toMatch(EN_CARD_NAME);
      expect(line.length).toBeLessThanOrEqual(200);
    }
    // The pairing the reading quoted in English ("Five of Clubs と Queen of Diamonds の並び").
    const five = corpusName(lng, 'cartomancy', 117);
    const queen = corpusName(lng, 'cartomancy', 137);
    expect(lines.some((l) => l.startsWith(`${five} · ${queen} — `))).toBe(true);
  });

  it('en: the combination lines keep their English phrases', () => {
    const spread = getCartoSpread('carto-three-timeline')!;
    const lines = combinationHitsToLines(cartoCombinationsForAI(cartoCombinations(spread, TABLE)), 6, 'en');
    expect(lines.some((l) => /Five of Clubs/.test(l) && /Queen of Diamonds/.test(l))).toBe(true);
    expect(lines.every((l) => !/[぀-ヿ一-鿿가-힣]/.test(l))).toBe(true);
  });
});

describe('d2-ja-01 — the prompt heads each card with the table’s name and tells the model to keep it', () => {
  const ja: ReadingTextCard[] = [
    { id: 117, name: 'Five of Clubs', localName: 'クラブの5', reversed: false, meaningUpright: 'Partnership.' },
    { id: 137, name: 'Queen of Diamonds', localName: 'ダイヤのクイーン', reversed: false, meaningUpright: 'Reputation.' },
    { id: 108, name: 'Nine of Hearts', localName: 'ハートの9', reversed: true, meaningUpright: 'The wish card.', meaningReversed: 'A wish postponed.' },
  ];

  it('ja: the head line is the table’s name; the English one is a reference line under it', () => {
    expect(cardHeadLine(ja[0], '過去から抱えているもの')).toBe('- 過去から抱えているもの: クラブの5 (Upright)');
    expect(cardHeadLine(ja[2], 'この先の傾き')).toBe('- この先の傾き: ハートの9 (Reversed)');
    expect(cardPromptLines(ja[0], 'career', 320)[0]).toBe('English name (only so you know the card; never write it): Five of Clubs');
  });

  it('ja: the rule names the table’s names and rules out English names and the model’s own', () => {
    const rule = cardNamesRule(ja);
    expect(rule).toContain('"クラブの5", "ダイヤのクイーン", "ハートの9"');
    expect(rule).toContain('character for character');
    expect(rule).toContain("Never write a card's English name");
    expect(rule).toContain('never translate a name yourself');
  });

  it('en: no reference line, and no clause about English names', () => {
    const en = ja.map((card) => ({ ...card, localName: card.name }));
    expect(cardHeadLine(en[0], 'Past')).toBe('- Past: Five of Clubs (Upright)');
    expect(cardPromptLines(en[0], 'career', 320).some((l) => l.startsWith('English name'))).toBe(false);
    const rule = cardNamesRule(en);
    expect(rule).toContain('"Five of Clubs", "Queen of Diamonds", "Nine of Hearts"');
    expect(rule).not.toContain('English name');
  });

  it('an older client (English names only): the prompt reads as before', () => {
    const old = ja.map((card) => ({ ...card, localName: undefined }));
    expect(cardHeadLine(old[0], 'Past')).toBe('- Past: Five of Clubs (Upright)');
    expect(cardNamesRule(old)).toBe('');
    expect(cardPromptLines(old[0], 'career', 320)[0]).not.toMatch(/^English name/);
  });

  it('the template reading names the cards as the table does too', () => {
    const text = fallbackReadingText({ cards: ja, positions: ['過去', '現在', '未来'], locale: 'ja', notCharged: true });
    expect(text).toContain('**過去: クラブの5**');
    expect(text).toContain('**未来: ハートの9 (逆位置)**');
    expect(text).not.toMatch(EN_CARD_NAME);
  });
});
