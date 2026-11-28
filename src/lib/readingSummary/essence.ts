/**
 * A card's essence for one orientation, by id and language (WP-NF-02 A4).
 *
 * Every bundled meaning opens with a list of themes ("New beginnings,
 * innocence, spontaneity, a free spirit."), and so do its translations. The
 * essence is that list's first two items, joined with the language's "and".
 * The card is read from the bundled deck by id through `localizeCard`, never
 * from the card object a screen holds (NF-D3), so the summary is the same
 * online, offline, in a saved reading and in a test.
 */
import { sentencesOf } from '../../components/readings/tarot/readingText';
import { localizeCard } from '../../i18n/localizeCard';
import type { SupportedLocale } from '../../i18n/config';
import type { TarotCard } from '../../types';
import { andPair, lowerFirst } from './format';
import { summaryDeckCard } from './loadPhrases';

export interface Essence {
  /** The theme items of the meaning's first sentence, in order (all of them). */
  items: string[];
  /** The first two items joined: "new beginnings and innocence". */
  text: string;
  /** The first item: "new beginnings". */
  first: string;
  /** The meaning's second sentence, as the card page prints it. */
  second: string;
}

const SPLIT: Record<SupportedLocale, RegExp> = {
  en: /,\s+/,
  ko: /,\s+/,
  ja: /[、，]/,
  zh: /[、，]/,
};

/*
 * A connective before the last item. zh 和 and 或 are dropped only as a word
 * of their own, not as the first character of 和谐 / 和平 (harmony, peace)
 * or 或许 (perhaps).
 */
const LEADING_CONNECTIVE: Record<SupportedLocale, RegExp> = {
  en: /^(?:and|or)\s+/i,
  ja: /^(?:そして|または|あるいは)\s*/,
  ko: /^(?:그리고|또는)\s+/,
  zh: /^(?:以及|或者|和(?![谐平睦好解])|或(?![许]))\s*/,
};

const FINAL_STOP = /[.!?。！？]+$/;

/** The localized bundled card, or null for an id the deck does not hold (or before the deck is loaded). */
export function localizedDeckCard(id: number, locale: SupportedLocale): TarotCard | null {
  const card = summaryDeckCard(id);
  return card ? localizeCard(card, locale) : null;
}

/** The theme items of a meaning's first sentence. */
export function themeItems(meaning: string, locale: SupportedLocale): string[] {
  const first = sentencesOf(meaning)[0] ?? '';
  const items = first
    .trim()
    .replace(FINAL_STOP, '')
    .split(SPLIT[locale])
    .map((x) => x.trim().replace(LEADING_CONNECTIVE[locale], '').trim())
    .filter(Boolean);
  return locale === 'en' ? items.map(lowerFirst) : items;
}

/**
 * The essence of card `id` in orientation `reversed`. A meaning whose first
 * sentence is not a list (ko/ja/zh The Hermit upright) falls back to the
 * card's first two keywords.
 */
export function essenceOf(id: number, reversed: boolean, locale: SupportedLocale): Essence {
  const card = localizedDeckCard(id, locale);
  if (!card) return { items: [], text: '', first: '', second: '' };
  const meaning = reversed ? card.meaningReversed : card.meaningUpright;
  let items = themeItems(meaning, locale);
  if (items.length < 2) {
    const kw = (card.keywords ?? []).map((k) => (locale === 'en' ? lowerFirst(k) : k));
    items = kw.length >= 2 ? kw.slice(0, 2) : [...items, ...kw].slice(0, 2);
  }
  const [a = '', b] = items;
  return {
    items,
    text: b ? andPair(locale, a, b) : a,
    first: a,
    second: sentencesOf(meaning)[1] ?? '',
  };
}
