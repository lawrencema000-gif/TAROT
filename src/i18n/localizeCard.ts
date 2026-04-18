import type { TarotCard } from '../types';
import { getLocale, type SupportedLocale } from './config';
import jaTarot from './locales/ja/tarot.json';
import koTarot from './locales/ko/tarot.json';
import zhTarot from './locales/zh/tarot.json';

/**
 * Shape of the localized card fields. All optional — missing fields fall
 * back to the English source from `tarotDeck.ts`.
 */
interface LocalizedCardFields {
  name?: string;
  keywords?: string[];
  meaningUpright?: string;
  meaningReversed?: string;
  description?: string;
  loveMeaning?: string;
  careerMeaning?: string;
  reflectionPrompt?: string;
}

interface TarotBundle {
  cards: Record<string, LocalizedCardFields>;
}

const BUNDLES: Partial<Record<SupportedLocale, TarotBundle>> = {
  ja: jaTarot as TarotBundle,
  ko: koTarot as TarotBundle,
  zh: zhTarot as TarotBundle,
};

/**
 * Return a copy of `card` with any translated fields overlaid from the
 * active locale bundle. Unknown cards or missing fields fall back to the
 * English source. Locale `en` is a no-op (returns the original card).
 */
export function localizeCard(card: TarotCard, locale: SupportedLocale = getLocale()): TarotCard {
  if (locale === 'en') return card;

  const bundle = BUNDLES[locale];
  if (!bundle) return card;

  const tr = bundle.cards?.[String(card.id)];
  if (!tr) return card;

  return {
    ...card,
    name: tr.name ?? card.name,
    keywords: tr.keywords ?? card.keywords,
    meaningUpright: tr.meaningUpright ?? card.meaningUpright,
    meaningReversed: tr.meaningReversed ?? card.meaningReversed,
    description: tr.description ?? card.description,
    loveMeaning: tr.loveMeaning ?? card.loveMeaning,
    careerMeaning: tr.careerMeaning ?? card.careerMeaning,
    reflectionPrompt: tr.reflectionPrompt ?? card.reflectionPrompt,
  };
}

export function localizeCards(cards: TarotCard[], locale: SupportedLocale = getLocale()): TarotCard[] {
  if (locale === 'en') return cards;
  return cards.map(c => localizeCard(c, locale));
}
