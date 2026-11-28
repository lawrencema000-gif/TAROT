/**
 * The tarot facts the summary reads (WP-NF-02 A2, A7): each card's element,
 * essence, affirmation, reflection question and own reinforcing and opposing
 * notes, and the table-wide methods tarot itself teaches: elemental
 * dignities, the cards' own notes, repeated numbers and court cards.
 *
 * Everything is read by card id from the bundled deck and the enrichment
 * table, with the `enrichment` content overlay in ja, ko and zh (NF-D3).
 */
import { getEnrichment, type TarotEnrichment } from '../../data/tarotEnrichment';
import { ct, peekContentOverlay } from '../../i18n/contentOverlay';
import type { SupportedLocale } from '../../i18n/config';
import { essenceOf, localizedDeckCard, type Essence } from './essence';
import { phrase, summaryDeckCard } from './loadPhrases';
import type { PhraseKey } from './phrases.en';
import type { RefCard } from './format';

export type Element = TarotEnrichment['element'];
export type Suit = 'wands' | 'cups' | 'swords' | 'pentacles';
export const SUITS: readonly Suit[] = ['wands', 'cups', 'swords', 'pentacles'];

export interface TarotFacts extends RefCard {
  id: number;
  /** The English name, as the enrichment notes name cards. */
  enName: string;
  suit: Suit | null;
  /** 1–14 for the Minor Arcana (11 Page … 14 King); null for a Major. */
  number: number | null;
  elementKey: Element;
  essence: Essence;
  /** The card's own voice (its upright affirmation), in the reading's language. */
  affirmation: string;
  /** The first question of the card's reflection prompt. */
  question: string;
  reinforcing: string[];
  reinforcingReason: string;
  opposing: string[];
  opposingReason: string;
}

/** The first question of a reflection prompt (en ?, ja/zh ？). */
export function firstQuestion(prompt: string): string {
  const m = prompt.trim().match(/^.*?[?？]/s);
  return (m ? m[0] : prompt).trim();
}

/** The facts of card `id` in `locale`, or null for an id the deck does not hold. */
export function tarotFacts(id: number, reversed: boolean, locale: SupportedLocale): TarotFacts | null {
  const en = summaryDeckCard(id);
  const card = localizedDeckCard(id, locale);
  const e = en ? getEnrichment(en.name) : null;
  if (!en || !card || !e) return null;
  const overlay = peekContentOverlay('enrichment', locale);
  return {
    id,
    name: card.name,
    enName: en.name,
    major: en.arcana === 'major',
    reversed,
    suit: (en.suit as Suit | undefined) ?? null,
    number: en.arcana === 'major' ? null : en.number ?? null,
    elementKey: e.element,
    element: phrase(locale, `element.${e.element}` as PhraseKey),
    essence: essenceOf(id, reversed, locale),
    affirmation: ct(overlay, `${id}.affirmation`, e.affirmation),
    question: firstQuestion(card.reflectionPrompt ?? ''),
    reinforcing: e.reinforcingCards,
    reinforcingReason: ct(overlay, `${id}.reinforcingReason`, e.reinforcingReason),
    opposing: e.opposingCards,
    opposingReason: ct(overlay, `${id}.opposingReason`, e.opposingReason),
  };
}

// ── Elemental dignities ────────────────────────────────────────────────

export type Dignity = 'same' | 'opposed' | null;

/** Same element strengthens; Fire with Water, or Air with Earth, pull against each other; Spirit and the rest are silent. */
export function dignityOf(a: Element, b: Element): Dignity {
  if (a === 'Spirit' || b === 'Spirit') return null;
  if (a === b) return 'same';
  const pair = `${a}|${b}`;
  if (pair === 'Fire|Water' || pair === 'Water|Fire' || pair === 'Air|Earth' || pair === 'Earth|Air') return 'opposed';
  return null;
}

export interface DignityHit {
  i: number;
  j: number;
  kind: 'same' | 'opposed';
}

/** The dignities over the given index pairs: opposed first, then same, three at most. */
export function dignities(cards: TarotFacts[], pairs: Array<[number, number]>): DignityHit[] {
  const hits: DignityHit[] = [];
  for (const [i, j] of pairs) {
    const kind = dignityOf(cards[i].elementKey, cards[j].elementKey);
    if (kind) hits.push({ i, j, kind });
  }
  const opposed = hits.filter((h) => h.kind === 'opposed');
  const same = hits.filter((h) => h.kind === 'same');
  return [...opposed, ...same].slice(0, 3);
}

// ── The cards' own notes ───────────────────────────────────────────────

const sameName = (a: string, b: string) => a.toLowerCase().replace(/^the /, '') === b.toLowerCase().replace(/^the /, '');

export interface NoteHit {
  /** The card whose notes name the other. */
  owner: number;
  other: number;
}

/**
 * The first pair, in position order, where one upright card's reinforcing
 * (or opposing) notes name another upright card. A reversed card's notes
 * are not used: the notes read the upright card.
 */
export function ownNotes(cards: TarotFacts[]): { reinforcing: NoteHit | null; opposing: NoteHit | null } {
  let reinforcing: NoteHit | null = null;
  let opposing: NoteHit | null = null;
  for (let i = 0; i < cards.length; i++) {
    for (let j = 0; j < cards.length; j++) {
      if (i === j || cards[i].reversed || cards[j].reversed) continue;
      if (!reinforcing && cards[i].reinforcing.some((nm) => sameName(nm, cards[j].enName))) reinforcing = { owner: i, other: j };
      if (!opposing && cards[i].opposing.some((nm) => sameName(nm, cards[j].enName))) opposing = { owner: i, other: j };
    }
  }
  return { reinforcing, opposing };
}

// ── Numbers and courts ─────────────────────────────────────────────────

/** Ranks held by two or more Minor Arcana cards, in rank order, each with its cards' indexes. */
export function repeatedNumbers(cards: TarotFacts[]): Array<{ number: number; indexes: number[] }> {
  const byNum = new Map<number, number[]>();
  cards.forEach((c, i) => {
    if (c.major || c.number === null) return;
    const list = byNum.get(c.number) ?? [];
    list.push(i);
    byNum.set(c.number, list);
  });
  return [...byNum.entries()]
    .filter(([, ix]) => ix.length >= 2)
    .sort((a, b) => a[0] - b[0])
    .map(([number, indexes]) => ({ number, indexes }));
}

/** The court cards' indexes (Pages, Knights, Queens and Kings). */
export function courtIndexes(cards: TarotFacts[]): number[] {
  return cards.flatMap((c, i) => (!c.major && c.number !== null && c.number >= 11 ? [i] : []));
}

// ── Table-wide counts ──────────────────────────────────────────────────

/** The suit that leads: one suit with the most cards and at least max(2, a third of the table). */
export function leadingSuit(cards: TarotFacts[]): { suit: Suit; count: number } | null {
  const counts = new Map<Suit, number>();
  for (const c of cards) if (c.suit) counts.set(c.suit, (counts.get(c.suit) ?? 0) + 1);
  if (counts.size === 0) return null;
  const top = Math.max(...counts.values());
  const leaders = [...counts.keys()].filter((s) => counts.get(s) === top);
  if (leaders.length !== 1 || top < Math.max(2, Math.ceil(cards.length / 3))) return null;
  return { suit: leaders[0], count: top };
}

/** An element in more than half the cards with a Major among them, and those Majors. */
export function elementRun(cards: TarotFacts[]): { element: Element; count: number; majors: number[] } | null {
  const counts = new Map<Element, number>();
  for (const c of cards) counts.set(c.elementKey, (counts.get(c.elementKey) ?? 0) + 1);
  for (const [element, count] of counts) {
    if (count * 2 <= cards.length) continue;
    const majors = cards.flatMap((c, i) => (c.major && c.elementKey === element ? [i] : []));
    return majors.length ? { element, count, majors } : null;
  }
  return null;
}

/** Suits with no card on the table, in suit order. */
export function missingSuits(cards: TarotFacts[]): Suit[] {
  return SUITS.filter((s) => !cards.some((c) => c.suit === s));
}
