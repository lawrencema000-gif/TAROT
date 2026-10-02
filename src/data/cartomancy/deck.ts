import type { CourtRank, PlayingCard, PlayingColor, PlayingRank, PlayingSuit } from '../../types/cartomancy';
import { PLAYING_CARDS_EN } from './cards.en';

/**
 * The playing deck: 52 cards, two optional Jokers, and the lookups.
 *
 * Ids are `100 + suitIndex * 13 + rankIndex` over the suit and rank orders
 * below, so a card's id, slug, suit and rank all derive from one another
 * and can never drift from the tarot deck's 0–77.
 */

export const PLAYING_SUITS: readonly PlayingSuit[] = ['hearts', 'clubs', 'diamonds', 'spades'];

export const PLAYING_RANKS: readonly PlayingRank[] = ['ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king'];

export const COURT_RANKS: readonly CourtRank[] = ['jack', 'queen', 'king'];

export const PLAYING_ID_BASE = 100;
export const RED_JOKER_ID = 152;
export const BLACK_JOKER_ID = 153;
/** The Nine of Hearts. */
export const WISH_CARD_ID = 108;
export const ACE_OF_SPADES_ID = 139;

export function playingCardId(suit: PlayingSuit, rank: PlayingRank): number {
  return PLAYING_ID_BASE + PLAYING_SUITS.indexOf(suit) * 13 + PLAYING_RANKS.indexOf(rank);
}

export function suitColor(suit: PlayingSuit): PlayingColor {
  return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
}

/** The 52 cards, hearts then clubs then diamonds then spades, ace to king. */
export const PLAYING_DECK: PlayingCard[] = PLAYING_CARDS_EN.filter((card) => card.suit !== 'joker').sort((a, b) => a.id - b.id);

/** The Red Joker (152) and the Black Joker (153). Off by default in a reading. */
export const PLAYING_JOKERS: PlayingCard[] = PLAYING_CARDS_EN.filter((card) => card.suit === 'joker').sort((a, b) => a.id - b.id);

/** All 54, for the card pages and the lookups. */
export const PLAYING_CARDS_ALL: PlayingCard[] = [...PLAYING_DECK, ...PLAYING_JOKERS];

const BY_ID = new Map(PLAYING_CARDS_ALL.map((card) => [card.id, card]));
const BY_SLUG = new Map(PLAYING_CARDS_ALL.map((card) => [card.slug, card]));

export function getPlayingCard(id: number): PlayingCard | undefined {
  return BY_ID.get(id);
}

export function getPlayingCardBySlug(slug: string): PlayingCard | undefined {
  return BY_SLUG.get(slug);
}

/** The deck a reading shuffles: 52, or 54 with the Jokers on. */
export function playingDeckFor(options: { jokers: boolean }): PlayingCard[] {
  return options.jokers ? PLAYING_CARDS_ALL : PLAYING_DECK;
}

export function cardsOfSuit(suit: PlayingSuit): PlayingCard[] {
  return PLAYING_DECK.filter((card) => card.suit === suit);
}

export function isJoker(card: PlayingCard): boolean {
  return card.suit === 'joker';
}

export function isCourtCard(card: PlayingCard): card is PlayingCard & { rank: CourtRank; suit: PlayingSuit } {
  return card.rank === 'jack' || card.rank === 'queen' || card.rank === 'king';
}

export function isPipCard(card: PlayingCard): boolean {
  return !isJoker(card) && !isCourtCard(card);
}

/** A playing-card id, as opposed to a tarot id (0–77). */
export function isPlayingCardId(id: number): boolean {
  return id >= PLAYING_ID_BASE && id <= BLACK_JOKER_ID;
}
