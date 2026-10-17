import { describe, it, expect, beforeAll } from 'vitest';
import i18n from '../../../i18n/config';
import { localizeCard } from '../../../i18n/localizeCard';
import { fullDeck } from '../../../data/tarotDeck';
import jaApp from '../../../i18n/locales/ja/app.json';
import koApp from '../../../i18n/locales/ko/app.json';
import zhApp from '../../../i18n/locales/zh/app.json';
import jaTarot from '../../../i18n/locales/ja/tarot.json';
import koTarot from '../../../i18n/locales/ko/tarot.json';
import zhTarot from '../../../i18n/locales/zh/tarot.json';
import { cardYesNo, yesNoVerdict } from './cardYesNo';

/*
 * p8 F15: the card page's Yes / No explanation named the English keywords
 * inside a Japanese, Korean or Chinese sentence ("このカードが持つEndingsと
 * Betrayalのエネルギー…"), and the Korean joined them with a literal "와/과".
 */

const LOCALES = { ja: [jaApp, jaTarot], ko: [koApp, koTarot], zh: [zhApp, zhTarot] } as const;

beforeAll(() => {
  for (const [lng, [app, tarot]] of Object.entries(LOCALES)) {
    i18n.addResourceBundle(lng, 'app', app, true, true);
    i18n.addResourceBundle(lng, 'tarot', tarot, true, true);
  }
});

/** The cards whose explanation names keywords (the rest have a fixed sentence). */
const keyworded = fullDeck.filter((c) => yesNoVerdict(c).keywordIndexes.length > 0);

describe('the Yes / No explanation is in the reader’s language (p8 F15)', () => {
  it('names the keywords of 18 cards', () => {
    expect(keyworded.length).toBe(18);
    expect(keyworded.map((c) => c.name)).toContain('Ten of Swords');
  });

  it.each(Object.keys(LOCALES) as Array<keyof typeof LOCALES>)('%s: every explanation, no English word and no particle choice', (lng) => {
    const t = i18n.getFixedT(lng, 'app') as unknown as (key: string, opts?: Record<string, unknown>) => string;
    for (const en of fullDeck) {
      const card = localizeCard(en, lng);
      const { explanation } = cardYesNo(en, card, t);
      expect(explanation, `${lng} ${en.name}`).not.toMatch(/[A-Za-z]{3,}/);
      expect(explanation, `${lng} ${en.name}`).not.toMatch(/와\/과|은\(는\)|이\(가\)|을\(를\)/);
      // The keyword sentence says "this card"; the others name it.
      if (yesNoVerdict(en).keywordIndexes.length === 0) expect(explanation, `${lng} ${en.name}`).toContain(card.name);
    }
  });

  it('names the localized keywords at the English ones’ places', () => {
    const tenOfSwords = fullDeck.find((c) => c.name === 'Ten of Swords')!;
    const ja = i18n.getFixedT('ja', 'app') as unknown as (key: string, opts?: Record<string, unknown>) => string;
    const ko = i18n.getFixedT('ko', 'app') as unknown as (key: string, opts?: Record<string, unknown>) => string;
    const card = (lng: 'ja' | 'ko') => localizeCard(tenOfSwords, lng);
    expect(cardYesNo(tenOfSwords, card('ja'), ja).explanation).toBe('このカードが持つ終わりと裏切りのエネルギーは、課題や遅れを示唆しています。');
    expect(cardYesNo(tenOfSwords, card('ko'), ko).explanation).toBe('이 카드의 끝, 배신 에너지는 어려움이나 지연을 시사해요.');
    // The verdict stays the English card's.
    expect(cardYesNo(tenOfSwords, card('ja'), ja).verdict).toBe('no');
  });

  it('falls back to the sentence without keywords when the localized card lacks them', () => {
    const tenOfSwords = fullDeck.find((c) => c.name === 'Ten of Swords')!;
    const ja = i18n.getFixedT('ja', 'app') as unknown as (key: string, opts?: Record<string, unknown>) => string;
    const out = cardYesNo(tenOfSwords, { name: 'ソードの10', keywords: [] }, ja);
    expect(out.explanation).toMatch(/^ソードの10は/);
    expect(out.explanation).not.toMatch(/[A-Za-z]{3,}/);
  });

  it('reads the Majors by id: The Wheel of Fortune is a Yes', () => {
    const wheel = fullDeck.find((c) => c.id === 10)!;
    expect(wheel.name).toBe('The Wheel of Fortune');
    expect(yesNoVerdict(wheel).verdict).toBe('yes');
    expect(yesNoVerdict(fullDeck.find((c) => c.id === 16)!).verdict).toBe('no');
  });
});
