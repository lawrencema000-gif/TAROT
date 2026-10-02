import type { TarotCard } from '../types';
import i18n, { getLocale, TAROT_CORPUS_NS, type SupportedLocale } from './config';

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

/**
 * The translated corpus for `locale`, read from the i18next store.
 *
 * The corpus is the `tarot` namespace of `src/i18n/locales/<lng>/tarot.json`.
 * It is not imported here: i18next fetches it as a lazy chunk together with
 * the UI bundles whenever the locale is (at init) or becomes (changeLanguage)
 * ja/ko/zh, and `languageChanged` fires only after every namespace has
 * landed — so by the time `getLocale()` says 'ja', the Japanese corpus is in
 * memory and these synchronous helpers find it. English needs no corpus.
 *
 * If a caller nevertheless runs before the corpus is in the store (or the
 * fetch failed and the app carried on in English), the card is returned as
 * is: English rather than a crash. react-i18next re-renders every `useT()`
 * consumer on `languageChanged`, which is when the corpus becomes readable.
 */
function corpusFor(locale: SupportedLocale): TarotBundle | null {
  if (locale === 'en') return null;
  const bundle = i18n.getResourceBundle(locale, TAROT_CORPUS_NS) as Partial<TarotBundle> | undefined;
  return bundle?.cards ? (bundle as TarotBundle) : null;
}

function overlay(card: TarotCard, bundle: TarotBundle): TarotCard {
  const tr = bundle.cards[String(card.id)];
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

/**
 * Return a copy of `card` with any translated fields overlaid from the
 * active locale bundle. Unknown cards or missing fields fall back to the
 * English source. Locale `en` is a no-op (returns the original card).
 */
export function localizeCard(card: TarotCard, locale: SupportedLocale = getLocale()): TarotCard {
  if (locale === 'en') return card;
  const bundle = corpusFor(locale);
  return bundle ? overlay(card, bundle) : card;
}

export function localizeCards(cards: TarotCard[], locale: SupportedLocale = getLocale()): TarotCard[] {
  if (locale === 'en') return cards;
  // One store lookup for the whole deck rather than one per card.
  const bundle = corpusFor(locale);
  if (!bundle) return cards;
  return cards.map(c => overlay(c, bundle));
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
