import type { CartoLesson, CartoSpread, PlayingCard, PlayingCardCombination } from '../types/cartomancy';
import { getPlayingCard, getPlayingCardBySlug } from '../data/cartomancy/deck';
import { SAME_RANK_COMBINATIONS } from '../data/cartomancy/tables.en';
import type { CombinationHit } from '../data/cartomancy/combinations';
import i18n, { CARTO_CORPUS_NS, getLocale, type SupportedLocale } from './config';

/**
 * The translated cartomancy corpus, overlaid on the English data.
 *
 * `src/i18n/locales/<lng>/cartomancy.json` carries the 54 cards, the nine
 * spreads and the twelve lessons in ja/ko/zh (shape: scratchpad
 * p7-cartomancy-corpus-en.json). i18next loads it as the `cartomancy`
 * namespace alongside the UI bundles, so by the time `getLocale()` says
 * 'ja' the bundle is in the store and these synchronous helpers find it —
 * the same arrangement as `localizeCard.ts` for the tarot corpus. A missing
 * bundle, or a card the translation does not carry yet, falls back to the
 * English field by field. English needs no corpus.
 *
 * Slugs and ids are never localized; only the prose overlays.
 */

interface LocalizedCardFields {
  name?: string;
  keywords?: string[];
  meaningUpright?: string;
  meaningReversed?: string;
  loveMeaning?: string;
  careerMeaning?: string;
  adviceMeaning?: string;
  timing?: string;
  asPerson?: string;
  reflectionPrompt?: string;
  quickMeaning?: string;
  /** Meanings in the card's own order; `with` stays the English slug. */
  combinations?: string[];
}

interface LocalizedSpreadFields {
  name?: string;
  shortDescription?: string;
  longDescription?: string;
  bestFor?: string[];
  whenToUse?: string;
  history?: string;
  readingMethod?: string;
  positions?: { name?: string; meaning?: string }[];
  exampleQuestions?: string[];
  faqs?: { q?: string; a?: string }[];
  rowLabels?: string[];
  colLabels?: string[];
  verdictLabels?: Record<string, string>;
}

interface LocalizedLessonFields {
  title?: string;
  eyebrow?: string;
  lede?: string;
  points?: string[];
  body?: string[];
  practice?: string;
}

interface CartoBundle {
  cards?: Record<string, LocalizedCardFields>;
  spreads?: Record<string, LocalizedSpreadFields>;
  lessons?: Record<string, LocalizedLessonFields>;
  suits?: Record<string, { name?: string }>;
  /** In SAME_RANK_COMBINATIONS order. */
  sameRankCombinations?: { rank?: string; count?: number; meaning?: string }[];
  /** Keyed by the rule's `id`, which is never localized. */
  neighborRules?: { id?: string; meaning?: string }[];
}

function corpusFor(locale: SupportedLocale): CartoBundle | null {
  if (locale === 'en') return null;
  const bundle = i18n.getResourceBundle(locale, CARTO_CORPUS_NS) as CartoBundle | undefined;
  return bundle && (bundle.cards || bundle.spreads || bundle.lessons) ? bundle : null;
}

const sameLength = <T>(tr: T[] | undefined, en: T[]): tr is T[] => Array.isArray(tr) && tr.length === en.length;

function overlayCard(card: PlayingCard, bundle: CartoBundle): PlayingCard {
  const tr = bundle.cards?.[String(card.id)];
  if (!tr) return card;
  const trCombos = tr.combinations;
  const combinations: PlayingCardCombination[] =
    Array.isArray(trCombos) && trCombos.length === card.combinations.length
      ? card.combinations.map((c, i) => ({ with: c.with, meaning: trCombos[i] ?? c.meaning }))
      : card.combinations;
  return {
    ...card,
    name: tr.name ?? card.name,
    keywords: sameLength(tr.keywords, card.keywords) ? tr.keywords : card.keywords,
    meaningUpright: tr.meaningUpright ?? card.meaningUpright,
    meaningReversed: tr.meaningReversed ?? card.meaningReversed,
    loveMeaning: tr.loveMeaning ?? card.loveMeaning,
    careerMeaning: tr.careerMeaning ?? card.careerMeaning,
    adviceMeaning: tr.adviceMeaning ?? card.adviceMeaning,
    timing: tr.timing ?? card.timing,
    asPerson: tr.asPerson ?? card.asPerson,
    reflectionPrompt: tr.reflectionPrompt ?? card.reflectionPrompt,
    quickMeaning: tr.quickMeaning ?? card.quickMeaning,
    combinations,
  };
}

/** A copy of `card` with the active locale's prose. `en` returns the card itself. */
export function localizePlayingCard(card: PlayingCard, locale: SupportedLocale = getLocale()): PlayingCard {
  if (locale === 'en') return card;
  const bundle = corpusFor(locale);
  return bundle ? overlayCard(card, bundle) : card;
}

export function localizePlayingCards(cards: PlayingCard[], locale: SupportedLocale = getLocale()): PlayingCard[] {
  if (locale === 'en') return cards;
  const bundle = corpusFor(locale);
  if (!bundle) return cards;
  return cards.map((c) => overlayCard(c, bundle));
}

/**
 * The display name for a saved card by its slug (or its English name, which
 * the library stores). Unknown names come back as given.
 */
export function localizePlayingCardName(slugOrName: string, locale: SupportedLocale = getLocale()): string {
  const card = getPlayingCardBySlug(slugOrName) ?? getPlayingCardBySlug(slugOrName.toLowerCase().replace(/\s+/g, '-'));
  if (!card) return slugOrName;
  return localizePlayingCard(card, locale).name;
}

function overlaySpread(spread: CartoSpread, bundle: CartoBundle): CartoSpread {
  const tr = bundle.spreads?.[spread.slug];
  if (!tr) return spread;
  const positions = sameLength(tr.positions, spread.positions)
    ? spread.positions.map((p, i) => ({ ...p, name: tr.positions?.[i]?.name ?? p.name, meaning: tr.positions?.[i]?.meaning ?? p.meaning }))
    : spread.positions;
  const faqs = spread.faqs && sameLength(tr.faqs, spread.faqs)
    ? spread.faqs.map((f, i) => ({ q: tr.faqs?.[i]?.q ?? f.q, a: tr.faqs?.[i]?.a ?? f.a }))
    : spread.faqs;
  const layout =
    spread.layout.kind === 'grid' || spread.layout.kind === 'pillars'
      ? {
          ...spread.layout,
          rowLabels: spread.layout.rowLabels && sameLength(tr.rowLabels, spread.layout.rowLabels) ? tr.rowLabels : spread.layout.rowLabels,
          colLabels: spread.layout.colLabels && sameLength(tr.colLabels, spread.layout.colLabels) ? tr.colLabels : spread.layout.colLabels,
        }
      : spread.layout;
  const verdict = spread.verdict;
  const localizedVerdict =
    verdict && tr.verdictLabels
      ? verdict.kind === 'wish'
        ? { ...verdict, rules: verdict.rules.map((r) => ({ ...r, label: tr.verdictLabels?.[r.result] ?? r.label })) }
        : verdict
      : verdict;
  return {
    ...spread,
    name: tr.name ?? spread.name,
    shortDescription: tr.shortDescription ?? spread.shortDescription,
    longDescription: tr.longDescription ?? spread.longDescription,
    bestFor: sameLength(tr.bestFor, spread.bestFor) ? tr.bestFor : spread.bestFor,
    whenToUse: tr.whenToUse ?? spread.whenToUse,
    history: tr.history ?? spread.history,
    readingMethod: tr.readingMethod ?? spread.readingMethod,
    positions,
    exampleQuestions: sameLength(tr.exampleQuestions, spread.exampleQuestions) ? tr.exampleQuestions : spread.exampleQuestions,
    faqs,
    layout,
    verdict: localizedVerdict,
  };
}

/** A copy of `spread` with the active locale's prose and labels. */
export function localizeCartoSpread(spread: CartoSpread, locale: SupportedLocale = getLocale()): CartoSpread {
  if (locale === 'en') return spread;
  const bundle = corpusFor(locale);
  return bundle ? overlaySpread(spread, bundle) : spread;
}

/** The Yes or No labels in the active locale, keyed by result; English when there is no corpus. */
export function localizedYesNoLabel(slug: string, result: string, english: string, locale: SupportedLocale = getLocale()): string {
  if (locale === 'en') return english;
  const bundle = corpusFor(locale);
  return bundle?.spreads?.[slug]?.verdictLabels?.[result] ?? english;
}

function overlayLesson(lesson: CartoLesson, bundle: CartoBundle): CartoLesson {
  const tr = bundle.lessons?.[lesson.slug];
  if (!tr) return lesson;
  return {
    ...lesson,
    title: tr.title ?? lesson.title,
    eyebrow: tr.eyebrow ?? lesson.eyebrow,
    lede: tr.lede ?? lesson.lede,
    points: sameLength(tr.points, lesson.points) ? tr.points : lesson.points,
    body: sameLength(tr.body, lesson.body) ? tr.body : lesson.body,
    practice: tr.practice ?? lesson.practice,
  };
}

/** A copy of `lesson` with the active locale's prose. */
export function localizeCartoLesson(lesson: CartoLesson, locale: SupportedLocale = getLocale()): CartoLesson {
  if (locale === 'en') return lesson;
  const bundle = corpusFor(locale);
  return bundle ? overlayLesson(lesson, bundle) : lesson;
}

/**
 * A combination the tables found, as the active locale reads it: the
 * meaning from the translated tables (same-rank sets by rank and count,
 * neighbour rules by id, a card's own pairings by position in its list),
 * and a label built from the localized card names — the English labels
 * ("Three Queens", "Nine of Clubs with the Ace of Diamonds") are phrases,
 * not data, so a translation names the cards instead. English, or a
 * corpus that does not carry the line yet, returns the hit's own text.
 */
export function localizeCombinationHit(hit: CombinationHit, locale: SupportedLocale = getLocale()): { label: string; meaning: string } {
  if (locale === 'en') return { label: hit.label, meaning: hit.meaning };
  const bundle = corpusFor(locale);
  if (!bundle) return { label: hit.label, meaning: hit.meaning };

  let meaning: string | undefined;
  if (hit.kind === 'same-rank') {
    const [, rank, count] = hit.id.split(':');
    const at = SAME_RANK_COMBINATIONS.findIndex((e) => e.rank === rank && String(e.count) === count);
    meaning = at >= 0 ? bundle.sameRankCombinations?.[at]?.meaning : undefined;
  } else if (hit.kind === 'pair') {
    const [, a, b] = hit.id.split(':');
    const card = a ? getPlayingCardBySlug(a) : undefined;
    const at = card ? card.combinations.findIndex((c) => c.with === b) : -1;
    const tr = card ? bundle.cards?.[String(card.id)]?.combinations : undefined;
    meaning = card && at >= 0 && Array.isArray(tr) && tr.length === card.combinations.length ? tr[at] : undefined;
  } else {
    meaning = bundle.neighborRules?.find((r) => r.id === hit.id)?.meaning;
  }

  const names = hit.cardIds
    .map((id) => getPlayingCard(id))
    .filter((c): c is PlayingCard => !!c)
    .map((c) => overlayCard(c, bundle).name);
  let label = hit.label;
  if (hit.kind === 'majority') {
    const suitName = hit.suit ? bundle.suits?.[hit.suit]?.name : undefined;
    label = suitName ? `${suitName} ×${hit.count ?? names.length}` : names.length <= 3 ? names.join(' · ') : hit.label;
  } else if (names.length > 0) {
    label = names.join(' · ');
  }
  return { label, meaning: meaning ?? hit.meaning };
}
