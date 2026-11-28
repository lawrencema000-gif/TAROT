/**
 * What the engine needs in memory before it runs synchronously (WP-NF-02 A10):
 *
 * - the bundled tarot deck (`fullDeck`, its own lazy chunk), which the engine
 *   reads by card id whatever card object the screen holds (NF-D3);
 * - in ja, ko and zh, the language's `summary.json` overlay (one literal
 *   `import()` each, so Vite emits `i18n-<lng>-summary-<hash>.js`), the
 *   `enrichment` content overlay (affirmations, reasons) and the tarot and
 *   playing-card corpora in the i18next store (names, meanings, questions).
 *
 * English templates are part of the engine's own module. A key an overlay
 * lacks falls back to English and is logged once in dev; the engine never
 * throws for it.
 */
import i18n, { CARTO_CORPUS_NS, TAROT_CORPUS_NS, type SupportedLocale } from '../../i18n/config';
import { loadContentOverlay, peekContentOverlay } from '../../i18n/contentOverlay';
import type { TarotCard } from '../../types';
import { PHRASES_EN, type PhraseKey } from './phrases.en';

type LazyLocale = Exclude<SupportedLocale, 'en'>;
export type PhraseOverlay = Partial<Record<string, string>>;

const OVERLAY_LOADERS: Record<LazyLocale, () => Promise<{ default: unknown }>> = {
  ja: () => import('../../i18n/locales/ja/summary.json'),
  ko: () => import('../../i18n/locales/ko/summary.json'),
  zh: () => import('../../i18n/locales/zh/summary.json'),
};

const overlays = new Map<SupportedLocale, PhraseOverlay>();
const overlayInflight = new Map<SupportedLocale, Promise<void>>();

let deckById: Map<number, TarotCard> | null = null;
let deckInflight: Promise<void> | null = null;

/** Hand the engine the bundled deck (a caller that already imported `fullDeck`, or a test). */
export function setSummaryDeck(deck: readonly TarotCard[]): void {
  deckById = new Map(deck.map((c) => [c.id, c]));
}

/** The bundled card for `id`, or null when the deck is not loaded yet or the id is unknown. */
export function summaryDeckCard(id: number): TarotCard | null {
  return deckById?.get(id) ?? null;
}

export function isSummaryDeckLoaded(): boolean {
  return deckById !== null;
}

/** Install a language's template overlay (the lazy loader below, or a test reading the file). */
export function setPhraseOverlay(locale: SupportedLocale, overlay: PhraseOverlay): void {
  if (locale !== 'en') overlays.set(locale, overlay);
}

function loadDeck(): Promise<void> {
  if (deckById) return Promise.resolve();
  if (!deckInflight) {
    deckInflight = import('../../data/tarotDeck')
      .then(({ fullDeck }) => setSummaryDeck(fullDeck))
      .catch((err: unknown) => {
        if (import.meta.env.DEV) console.warn('[readingSummary] the bundled deck failed to load', err);
      })
      .finally(() => {
        deckInflight = null;
      });
  }
  return deckInflight;
}

function loadOverlay(locale: SupportedLocale): Promise<void> {
  if (locale === 'en' || overlays.has(locale)) return Promise.resolve();
  let p = overlayInflight.get(locale);
  if (!p) {
    p = OVERLAY_LOADERS[locale]()
      .then((mod) => setPhraseOverlay(locale, ((mod.default ?? {}) as PhraseOverlay)))
      .catch((err: unknown) => {
        if (import.meta.env.DEV) console.warn(`[readingSummary] ${locale}/summary.json failed to load`, err);
      })
      .finally(() => overlayInflight.delete(locale));
    overlayInflight.set(locale, p);
  }
  return p;
}

function corporaReady(locale: SupportedLocale): boolean {
  return locale === 'en' || (i18n.hasResourceBundle(locale, TAROT_CORPUS_NS) && i18n.hasResourceBundle(locale, CARTO_CORPUS_NS));
}

/**
 * Load everything the engine reads for `locale`: the bundled deck, the
 * language's template overlay, the enrichment overlay and the card corpora.
 * Never rejects: what fails to load falls back to English.
 */
export async function preloadReadingSummary(locale: SupportedLocale): Promise<void> {
  const jobs: Array<Promise<unknown>> = [loadDeck(), loadOverlay(locale)];
  if (locale !== 'en') {
    jobs.push(loadContentOverlay('enrichment', locale));
    if (!corporaReady(locale)) jobs.push(Promise.resolve(i18n.loadLanguages(locale)).catch(() => undefined));
  }
  await Promise.all(jobs);
}

/** True once the deck and, outside English, the language's overlays and corpora are in memory. */
export function isReadingSummaryReady(locale: SupportedLocale): boolean {
  if (!deckById) return false;
  if (locale === 'en') return true;
  return overlays.has(locale) && peekContentOverlay('enrichment', locale) !== undefined && corporaReady(locale);
}

const warned = new Set<string>();

/** The template for `key` in `locale`: the overlay's, else the English. */
export function phrase(locale: SupportedLocale, key: PhraseKey): string {
  if (locale !== 'en') {
    const v = overlays.get(locale)?.[key];
    if (typeof v === 'string' && v.trim()) return v;
    const tag = `${locale}:${key}`;
    if (import.meta.env.DEV && !import.meta.env.VITEST && !warned.has(tag) && overlays.has(locale)) {
      warned.add(tag);
      console.warn(`[readingSummary] ${tag} is missing; using the English`);
    }
  }
  return PHRASES_EN[key];
}
