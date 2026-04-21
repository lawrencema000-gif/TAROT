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

let deckIndexCache: Map<string, TarotCard> | null = null;
let deckIndexPromise: Promise<Map<string, TarotCard>> | null = null;
async function getDeckIndex(): Promise<Map<string, TarotCard>> {
  if (deckIndexCache) return deckIndexCache;
  if (!deckIndexPromise) {
    deckIndexPromise = import('../data/tarotDeck').then(({ fullDeck }) => {
      deckIndexCache = new Map(fullDeck.map((c) => [c.name, c]));
      return deckIndexCache;
    });
  }
  return deckIndexPromise;
}

/** Prefetch the deck index so subsequent localizeCardNameSync calls hit
 *  the cache on first render. Safe to call from a useEffect. */
export function prefetchCardNameIndex(): void {
  void getDeckIndex();
}

/**
 * Resolve a card name saved to the DB (canonical English) to the
 * locale-appropriate display name. Async because the tarot deck is
 * lazy-loaded via dynamic import. For synchronous contexts, use
 * localizeCardNameSync which returns the English name unchanged if the
 * deck has not been loaded yet (UI will update on the next render).
 */
export async function localizeCardName(englishName: string, locale: SupportedLocale = getLocale()): Promise<string> {
  if (locale === 'en') return englishName;
  const idx = await getDeckIndex();
  const match = idx.get(englishName);
  if (!match) return englishName;
  return localizeCard(match, locale).name;
}

/** Sync version: returns the English name immediately if the deck is not
 *  yet in memory. Components that render saved card names repeatedly will
 *  usually have the deck already cached by the first render. */
export function localizeCardNameSync(englishName: string, locale: SupportedLocale = getLocale()): string {
  if (locale === 'en') return englishName;
  if (!deckIndexCache) {
    // Fire-and-forget prefetch so subsequent renders hit the cache
    void getDeckIndex();
    return englishName;
  }
  const match = deckIndexCache.get(englishName);
  if (!match) return englishName;
  return localizeCard(match, locale).name;
}
