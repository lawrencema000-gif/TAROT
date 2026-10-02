import type { CartoSpread, PlayingCard } from '../../types/cartomancy';
import {
  BLACK_JOKER_ID,
  getCartoSpread,
  isWishVerdict,
  isYesNoVerdict,
  playingDeckFor,
  PLAYING_DECK,
  RED_JOKER_ID,
  WISH_CARD_ID,
  findCombinations,
  wishVerdict,
  yesNoVerdict,
  type CombinationHit,
  type WishOutcome,
  type YesNoOutcome,
} from '../../data/cartomancy';
import { spreadTypeToFeature, type PremiumFeature } from '../../services/premium';
import { drawSeededCards } from '../../utils/cardDraw';
import { appStorage } from '../../lib/appStorage';
import { localDateStr } from '../../utils/localDate';

/**
 * The cartomancy reading flow, as data and pure functions.
 *
 * Everything CartomancySection decides that is not React lives here so the
 * golden tests (src/test/golden/cartomancy.flow.test.ts) can hold it: how
 * the deck is composed from the settings, when a card may be reversed,
 * what a position is called, which premium feature a spread sits behind,
 * what the verdict pill says, which achievement events a finished table
 * fires, and the per-viewer settings and lesson ticks in localStorage.
 */

// ---------------------------------------------------------------------------
// Settings (per viewer; localStorage is a convenience, not a record)
// ---------------------------------------------------------------------------

export interface CartoSettings {
  /** Shuffle the two Jokers in. Off by default: the tradition mostly omits them. */
  jokers: boolean;
  /** Read reversals. Off by default: pip cards are symmetric and most traditions do not. */
  reversals: boolean;
  /** Slug of the card that stands for the reader, or null. It is set aside, never drawn. */
  significator: string | null;
}

export const CARTO_SETTINGS_KEY = 'arcana_carto_settings';

export const DEFAULT_CARTO_SETTINGS: CartoSettings = { jokers: false, reversals: false, significator: null };

/** The subset of Storage these helpers use; the browser's localStorage by default, a stub in tests. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function browserStore(): KeyValueStore | null {
  try {
    const store = typeof window !== 'undefined' ? window.localStorage : undefined;
    return store && typeof store.getItem === 'function' && typeof store.setItem === 'function' ? store : null;
  } catch {
    return null;
  }
}

export function loadCartoSettings(store: KeyValueStore | null = browserStore()): CartoSettings {
  try {
    const raw = store ? store.getItem(CARTO_SETTINGS_KEY) : null;
    if (!raw) return DEFAULT_CARTO_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<CartoSettings>;
    return {
      jokers: parsed.jokers === true,
      reversals: parsed.reversals === true,
      significator: typeof parsed.significator === 'string' ? parsed.significator : null,
    };
  } catch {
    return DEFAULT_CARTO_SETTINGS;
  }
}

export function saveCartoSettings(settings: CartoSettings, store: KeyValueStore | null = browserStore()): void {
  try {
    store?.setItem(CARTO_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // private mode: the setting lives for the session only
  }
}

// ---------------------------------------------------------------------------
// The deck on the table
// ---------------------------------------------------------------------------

/**
 * The ids a reading shuffles: 52, or 54 with the Jokers, less the
 * significator (a card set aside to stand for the reader is not in play).
 */
export function cartoDeckIds(settings: Pick<CartoSettings, 'jokers' | 'significator'>): number[] {
  const deck = playingDeckFor({ jokers: settings.jokers });
  return deck.filter((card) => card.slug !== settings.significator).map((card) => card.id);
}

/** Fisher–Yates, the same shuffle TarotSection uses. */
export function shuffleIds(ids: number[], rng: () => number = Math.random): number[] {
  const arr = [...ids];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** The chance a dealt card lands reversed, when reversals are on (TarotSection.tsx:506). */
export const REVERSED_CHANCE = 0.35;

export interface DealtCard {
  card: PlayingCard;
  reversed: boolean;
  revealed: boolean;
}

/**
 * Deal the picked cards face down. A card can only be reversed when the
 * setting is on; with it off every card is upright whatever the dice say.
 */
export function dealCards(cards: PlayingCard[], reversals: boolean, rng: () => number = Math.random): DealtCard[] {
  return cards.map((card) => ({
    card,
    reversed: reversals && rng() < REVERSED_CHANCE,
    revealed: false,
  }));
}

// ---------------------------------------------------------------------------
// Spreads
// ---------------------------------------------------------------------------

export const DEFAULT_CARTO_SPREAD = 'carto-single';

/** The name of position `index` in `spread`, or a numbered fallback. */
export function cartoPositionLabel(spread: CartoSpread | null, index: number, fallback: (n: number) => string): string {
  const position = spread?.positions[index];
  return position?.name ?? fallback(index + 1);
}

/**
 * The premium feature a spread sits behind, or null when it is free.
 * `spreadTypeToFeature` is the product's table (services/premium.ts); until
 * it carries the carto-* slugs, a non-free spread is `deep_interpretations`
 * — the same tier as the relationship, career and shadow spreads, so the
 * existing ad unlock and paywall work unchanged.
 * TODO(B1a): drop the fallback once premium.ts lists the carto-* cases.
 */
export function cartoSpreadFeature(spread: CartoSpread): PremiumFeature | null {
  const known = spreadTypeToFeature(spread.slug);
  if (known) return known;
  return spread.free ? null : 'deep_interpretations';
}

// ---------------------------------------------------------------------------
// Verdicts
// ---------------------------------------------------------------------------

export type CartoVerdict =
  | { kind: 'yes-no'; outcome: YesNoOutcome }
  | { kind: 'wish'; outcome: WishOutcome };

/** The rule-based verdict for a Wish or Yes or No table; null for any other spread. */
export function cartoVerdict(spread: CartoSpread, cards: PlayingCard[]): CartoVerdict | null {
  if (cards.length === 0 || !spread.verdict) return null;
  if (isYesNoVerdict(spread.verdict)) return { kind: 'yes-no', outcome: yesNoVerdict(cards, spread.verdict) };
  if (isWishVerdict(spread.verdict)) return { kind: 'wish', outcome: wishVerdict(cards, spread.verdict, spread.layout) };
  return null;
}

/** Whether a verdict leans toward a yes (teal), a no (coral) or sits between (gold). */
export function verdictTone(verdict: CartoVerdict): 'yes' | 'no' | 'between' {
  if (verdict.kind === 'yes-no') {
    const r = verdict.outcome.result;
    if (r === 'yes' || r === 'likely-yes') return 'yes';
    if (r === 'no' || r === 'likely-no') return 'no';
    return 'between';
  }
  const r = verdict.outcome.result;
  if (r === 'favored') return 'yes';
  if (r === 'not-now') return 'no';
  return 'between';
}

/**
 * The verdict as one English line for the AI prompt, so the model explains
 * the table's own answer rather than contradicting it:
 * "Leaning yes (2 of 3 red)" / "Favored, with a delay".
 */
export function verdictLine(verdict: CartoVerdict | null): string | undefined {
  if (!verdict) return undefined;
  if (verdict.kind === 'yes-no') {
    const o = verdict.outcome;
    const parts = [`${o.label} (${o.reds} of ${o.total} red)`];
    if (o.qualifier) parts.push('depends on a person or on time');
    return parts.join('; ');
  }
  return verdict.outcome.label;
}

/** Everything the tables say about the cards on this spread. */
export function cartoCombinations(spread: CartoSpread, cards: PlayingCard[]): CombinationHit[] {
  return findCombinations(cards, spread.layout);
}

// ---------------------------------------------------------------------------
// The summary paragraph
// ---------------------------------------------------------------------------

const MARKDOWN_MARKS = /[*_#`]+/g;

/** The first paragraph of an AI reading, stripped of markdown marks. */
export function firstParagraph(text: string): string {
  const para = text
    .split(/\n\s*\n/)
    .map((p) => p.replace(MARKDOWN_MARKS, '').trim())
    .find((p) => p.length > 0);
  return para ?? '';
}

/** The first `count` sentences of a text. */
export function firstSentences(text: string, count: number): string {
  const sentences = text.match(/[^.!?]+[.!?]+(?:\s|$)/g);
  if (!sentences) return text.trim();
  return sentences.slice(0, count).join('').trim();
}

/**
 * The reading summary: the AI's first paragraph when there is one, else the
 * opening of the spread's reading method (two sentences, so the lede has a
 * body rather than a single clause).
 */
export function cartoSummary(aiText: string | null, spread: CartoSpread): string {
  if (aiText) {
    const para = firstParagraph(aiText);
    if (para) return para;
  }
  return firstSentences(spread.readingMethod, 2);
}

// ---------------------------------------------------------------------------
// AI request
// ---------------------------------------------------------------------------

export type CartoFocus = 'love' | 'career' | 'general';

export const MAX_POSITION_LABEL = 40;
export const MAX_PLAYING_CARDS = 21;

/** The localized position labels as generate-reading accepts them: ≤ 21, ≤ 40 chars each. */
export function cartoPositionsForAI(labels: string[]): string[] {
  return labels.slice(0, MAX_PLAYING_CARDS).map((label) => label.slice(0, MAX_POSITION_LABEL));
}

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------

export interface AchievementEvent {
  activityType: string;
  value?: string;
}

/** The events a completed table reports (migration 20261003000008). */
export function cartoAchievementEvents(spreadSlug: string, cards: PlayingCard[]): AchievementEvent[] {
  const events: AchievementEvent[] = [
    { activityType: 'cartomancy_reading_complete' },
    { activityType: 'cartomancy_spread_types_used', value: spreadSlug },
  ];
  if (cards.some((c) => c.id === WISH_CARD_ID)) events.push({ activityType: 'cartomancy_wish_card_drawn' });
  if (cards.some((c) => c.id === RED_JOKER_ID || c.id === BLACK_JOKER_ID)) events.push({ activityType: 'cartomancy_joker_drawn' });
  if (spreadSlug === 'carto-romany') events.push({ activityType: 'cartomancy_romany_complete' });
  return events;
}

// ---------------------------------------------------------------------------
// Card of the day
// ---------------------------------------------------------------------------

/** One card from the 52 for this reader and this local day. Jokers never lead a day. */
export function cartoCardOfTheDay(userId: string | null | undefined, date: string = localDateStr()): { card: PlayingCard; reversed: boolean } {
  const seed = `${userId || 'anonymous'}:${date}:carto`;
  return drawSeededCards(1, seed, PLAYING_DECK)[0];
}

// ---------------------------------------------------------------------------
// Lessons (per viewer)
// ---------------------------------------------------------------------------

export const CARTO_LESSONS_KEY = 'arcana_carto_lessons';

export function loadLessonsDone(store: KeyValueStore | null = browserStore()): Set<string> {
  try {
    const raw = store ? store.getItem(CARTO_LESSONS_KEY) : null;
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : []);
  } catch {
    return new Set();
  }
}

export function setLessonDone(slug: string, done: boolean, store: KeyValueStore | null = browserStore()): Set<string> {
  const next = loadLessonsDone(store);
  if (done) next.add(slug);
  else next.delete(slug);
  try {
    store?.setItem(CARTO_LESSONS_KEY, JSON.stringify([...next]));
  } catch {
    // private mode
  }
  return next;
}

// ---------------------------------------------------------------------------
// The free tier's daily allowance — shared with tarot (TarotSection.tsx:48-83)
// ---------------------------------------------------------------------------

const DAILY_READINGS_KEY = 'arcana_daily_readings';
const DAILY_READINGS_DATE_KEY = 'arcana_daily_readings_date';

export async function getDailyReadingCount(): Promise<number> {
  try {
    const today = localDateStr();
    const storedDate = await appStorage.get(DAILY_READINGS_DATE_KEY);
    if (storedDate !== today) {
      await appStorage.set(DAILY_READINGS_DATE_KEY, today);
      await appStorage.set(DAILY_READINGS_KEY, '0');
      return 0;
    }
    return parseInt((await appStorage.get(DAILY_READINGS_KEY)) || '0', 10);
  } catch {
    return 0;
  }
}

export async function incrementDailyReadingCount(): Promise<void> {
  try {
    const today = localDateStr();
    await appStorage.set(DAILY_READINGS_DATE_KEY, today);
    const current = await getDailyReadingCount();
    await appStorage.set(DAILY_READINGS_KEY, (current + 1).toString());
  } catch {
    // silent
  }
}

// ---------------------------------------------------------------------------
// Saved readings
// ---------------------------------------------------------------------------

/** The row a saved playing-card reading stores in tarot_readings.cards. */
export interface SavedPlayingCard {
  cardId: number;
  cardName: string;
  reversed: boolean;
  position: string;
  /** Lets the library route the name through the playing deck, not the tarot index. */
  deck: 'playing';
}

export function toSavedCards(dealt: DealtCard[], labelFor: (index: number) => string): SavedPlayingCard[] {
  return dealt.map((d, i) => ({
    cardId: d.card.id,
    cardName: d.card.name,
    reversed: d.reversed,
    position: labelFor(i),
    deck: 'playing',
  }));
}

/** The spread for a slug, or the one-card reading when the slug is not a playing-card spread. */
export function cartoSpreadOrDefault(slug: string | null | undefined): CartoSpread {
  const spread = slug ? getCartoSpread(slug) : null;
  return spread ?? (getCartoSpread(DEFAULT_CARTO_SPREAD) as CartoSpread);
}
