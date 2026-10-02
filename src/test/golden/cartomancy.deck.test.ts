import { describe, it, expect } from 'vitest';
import {
  PLAYING_DECK,
  PLAYING_JOKERS,
  PLAYING_CARDS_ALL,
  PLAYING_SUITS,
  PLAYING_RANKS,
  playingCardId,
  getPlayingCard,
  getPlayingCardBySlug,
  isCourtCard,
  isJoker,
  RED_JOKER_ID,
  BLACK_JOKER_ID,
  WISH_CARD_ID,
  ACE_OF_SPADES_ID,
} from '../../data/cartomancy/deck';
import { fullDeck } from '../../data/tarotDeck';

/**
 * The playing deck is a real deck.
 *
 * Fifty-two cards, thirteen to a suit, every rank once; ids that derive
 * from suit and rank so nothing can drift; prose that is long enough to be
 * worth reading and never shouts. The measure of "meaning words" is the one
 * the corpus was reviewed with (p7-cartomancy-merge.mjs): the eight meaning
 * fields together, 120 to 260 words.
 */

const MEANING_FIELDS = [
  'meaningUpright',
  'meaningReversed',
  'loveMeaning',
  'careerMeaning',
  'adviceMeaning',
  'timing',
  'asPerson',
  'reflectionPrompt',
] as const;

const words = (s: string | undefined) => (s ? s.trim().split(/\s+/).length : 0);

/** Every string anywhere in a card, keywords and combinations included. */
function strings(card: object): string[] {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(card);
  return out;
}

describe('the playing deck', () => {
  it('has 52 cards and 2 jokers', () => {
    expect(PLAYING_DECK).toHaveLength(52);
    expect(PLAYING_JOKERS).toHaveLength(2);
    expect(PLAYING_CARDS_ALL).toHaveLength(54);
  });

  it('has 13 cards in each suit, every rank exactly once', () => {
    for (const suit of PLAYING_SUITS) {
      const ranks = PLAYING_DECK.filter((c) => c.suit === suit).map((c) => c.rank);
      expect(ranks).toHaveLength(13);
      expect([...ranks].sort()).toEqual([...PLAYING_RANKS].sort());
    }
  });

  it('ids run 100..153, unique, and equal 100 + suitIndex*13 + rankIndex', () => {
    const ids = PLAYING_CARDS_ALL.map((c) => c.id);
    expect(new Set(ids).size).toBe(54);
    expect(Math.min(...ids)).toBe(100);
    expect(Math.max(...ids)).toBe(153);
    for (const card of PLAYING_DECK) {
      if (card.suit === 'joker' || card.rank === 'joker') throw new Error(`${card.slug} is a joker in the deck`);
      expect(card.id).toBe(playingCardId(card.suit, card.rank));
      expect(card.id).toBe(100 + PLAYING_SUITS.indexOf(card.suit) * 13 + PLAYING_RANKS.indexOf(card.rank));
      expect(card.rankValue).toBe(PLAYING_RANKS.indexOf(card.rank) + 1);
    }
    expect(PLAYING_JOKERS.map((c) => c.id)).toEqual([RED_JOKER_ID, BLACK_JOKER_ID]);
    expect(PLAYING_JOKERS.every((c) => c.rankValue === 0 && c.rank === 'joker' && c.suit === 'joker')).toBe(true);
    expect(getPlayingCard(WISH_CARD_ID)?.slug).toBe('nine-of-hearts');
    expect(getPlayingCard(ACE_OF_SPADES_ID)?.slug).toBe('ace-of-spades');
  });

  it('slugs are unique, lowercase and hyphenated, and round-trip through the lookups', () => {
    const slugs = PLAYING_CARDS_ALL.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(54);
    for (const card of PLAYING_CARDS_ALL) {
      expect(card.slug).toMatch(/^[a-z0-9-]+$/);
      expect(getPlayingCardBySlug(card.slug)).toBe(card);
      expect(getPlayingCard(card.id)).toBe(card);
    }
    expect(getPlayingCard(0)).toBeUndefined();
    expect(getPlayingCardBySlug('the-fool')).toBeUndefined();
  });

  it('colors follow the suits: hearts and diamonds red, clubs and spades black', () => {
    for (const card of PLAYING_DECK) {
      const red = card.suit === 'hearts' || card.suit === 'diamonds';
      expect(card.color).toBe(red ? 'red' : 'black');
    }
    expect(PLAYING_JOKERS.map((c) => c.color)).toEqual(['red', 'black']);
  });

  it('every court card and joker names a person', () => {
    const people = PLAYING_CARDS_ALL.filter((c) => isCourtCard(c) || isJoker(c));
    expect(people).toHaveLength(14);
    for (const card of people) expect(words(card.asPerson), card.slug).toBeGreaterThan(10);
  });

  it('every card carries four keywords and all eleven text fields', () => {
    for (const card of PLAYING_CARDS_ALL) {
      expect(card.keywords, card.slug).toHaveLength(4);
      expect(card.name.length, card.slug).toBeGreaterThan(0);
      expect(card.meaningUpright.length, card.slug).toBeGreaterThan(0);
      expect(card.meaningReversed?.length ?? 0, card.slug).toBeGreaterThan(0);
      expect(card.loveMeaning.length, card.slug).toBeGreaterThan(0);
      expect(card.careerMeaning.length, card.slug).toBeGreaterThan(0);
      expect(card.adviceMeaning?.length ?? 0, card.slug).toBeGreaterThan(0);
      expect(card.timing?.length ?? 0, card.slug).toBeGreaterThan(0);
      expect(card.reflectionPrompt.length, card.slug).toBeGreaterThan(0);
      expect(card.quickMeaning.length, card.slug).toBeGreaterThan(0);
      expect(card.combinations.length, card.slug).toBeGreaterThanOrEqual(3);
    }
  });

  it('every named combination resolves to a card in the 54', () => {
    for (const card of PLAYING_CARDS_ALL) {
      for (const combo of card.combinations) {
        expect(getPlayingCardBySlug(combo.with), `${card.slug} with ${combo.with}`).toBeDefined();
        expect(combo.with).not.toBe(card.slug);
        expect(combo.meaning.length).toBeGreaterThan(0);
      }
    }
  });

  it('reads at 120 to 260 words across the meaning fields', () => {
    for (const card of PLAYING_CARDS_ALL) {
      const total = MEANING_FIELDS.reduce((n, k) => n + words(card[k]), 0);
      expect(total, `${card.slug}: ${total} words`).toBeGreaterThanOrEqual(120);
      expect(total, `${card.slug}: ${total} words`).toBeLessThanOrEqual(260);
    }
  });

  it('never shouts: no exclamation mark in any string', () => {
    for (const card of PLAYING_CARDS_ALL) {
      for (const s of strings(card)) expect(s, card.slug).not.toContain('!');
    }
  });

  it('shares no id with the tarot deck', () => {
    const tarotIds = new Set(fullDeck.map((t) => t.id));
    expect(PLAYING_CARDS_ALL.every((c) => !tarotIds.has(c.id))).toBe(true);
    expect(Math.max(...tarotIds)).toBeLessThan(100);
  });
});
