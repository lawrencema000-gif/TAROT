import type { TarotSpread } from '../data/tarotSpreads';

/**
 * Cartomancy — reading an ordinary 52-card deck.
 *
 * These types are deliberately separate from `TarotCard`: the tarot type is
 * read by `localizeCard.ts` and `bundledImages.ts`, both of which assume
 * tarot ids 0–77 and tarot art. Playing cards carry ids 100–153 so a saved
 * reading, a share token or a deck lookup can never confuse the two decks.
 *
 * Ids: `100 + suitIndex * 13 + rankIndex` over suits hearts, clubs,
 * diamonds, spades and ranks ace..king; 152 is the Red Joker, 153 the Black.
 */

export type PlayingSuit = 'hearts' | 'clubs' | 'diamonds' | 'spades';

export type PlayingRank =
  | 'ace'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'jack'
  | 'queen'
  | 'king';

/** The ranks that carry a pip lattice rather than an emblem. */
export type PipRank = Exclude<PlayingRank, 'jack' | 'queen' | 'king'>;

export type CourtRank = 'jack' | 'queen' | 'king';

export type PlayingColor = 'red' | 'black';

export interface PlayingCardCombination {
  /** Slug of the other card. */
  with: string;
  meaning: string;
}

export interface PlayingCard {
  /** 100..153, see the module note. */
  id: number;
  /** `nine-of-hearts`, `red-joker`. The slug is the URL and is never localized. */
  slug: string;
  suit: PlayingSuit | 'joker';
  rank: PlayingRank | 'joker';
  /** 1..13; jokers 0. */
  rankValue: number;
  color: PlayingColor;
  name: string;
  /** Four keywords. */
  keywords: string[];
  meaningUpright: string;
  /** Present for all 54 in the corpus; optional because reversals are a setting. */
  meaningReversed?: string;
  loveMeaning: string;
  careerMeaning: string;
  adviceMeaning?: string;
  timing?: string;
  /** Courts and jokers: the person the card names. */
  asPerson?: string;
  reflectionPrompt: string;
  /** One line, feeds the quick reading. */
  quickMeaning: string;
  combinations: PlayingCardCombination[];
}

export interface DrawnPlayingCard {
  card: PlayingCard;
  reversed: boolean;
  revealed: boolean;
}

/** Tile sizes, all 2:3. hero 160×240 · md ≈111×167 · sm 60×90 · xs 46×69. */
export type CartoTile = 'hero' | 'md' | 'sm' | 'xs';

export interface CartoGridCell {
  index: number;
  row: number;
  col: number;
  /** Columns the cell spans (the seventh card of Two Hearts spans both pillars). */
  span?: number;
}

export interface CartoArcCell {
  index: number;
  cx: number;
  cy: number;
  /** Degrees. */
  rot: number;
}

export type CartoSpreadLayout =
  | {
      kind: 'row';
      tile: 'hero' | 'md' | 'sm';
      cells: CartoGridCell[];
      /** Yes or No may be laid with five cards instead of three. */
      variant?: { cardCount: number; tile: 'sm' };
    }
  | {
      kind: 'grid' | 'pillars';
      tile: 'md' | 'xs';
      rows: number;
      cols: number;
      rowLabels?: string[];
      colLabels?: string[];
      cells: CartoGridCell[];
    }
  | {
      kind: 'arc';
      tile: 'sm';
      box: { w: number; h: number };
      cells: CartoArcCell[];
    };

export type WishResult = 'favored' | 'favored-with-delay' | 'not-now' | 'alive' | 'reshape';

export interface WishVerdictRule {
  wishCardPresent: boolean;
  spadeAdjacent?: boolean;
  hardSpadePresent?: boolean;
  heartsOverSpades?: boolean;
  result: WishResult;
  label: string;
}

export interface WishVerdict {
  kind: 'wish';
  /** Slug of the wish card (the Nine of Hearts). */
  wishCard: string;
  /** Slugs whose presence, without the wish card, reads as "not now". */
  hardSpades: string[];
  /** Evaluated in order; the first rule whose conditions all hold wins. */
  rules: WishVerdictRule[];
}

export type YesNoResult = 'yes' | 'likely-yes' | 'leaning-yes' | 'leaning-no' | 'likely-no' | 'no';

export interface YesNoVerdict {
  kind: 'yes-no';
  redIsYes: boolean;
  /** Reds counted among three cards → result. */
  scale3: Record<string, YesNoResult>;
  /** Reds counted among five cards → result. */
  scale5: Record<string, YesNoResult>;
  /** Added when a court card is on the table. */
  courtQualifier: string;
  /** Slugs that strengthen a yes or a no when present. */
  strengtheners: { yes: string[]; no: string[] };
}

export interface CartoSpread extends TarotSpread {
  /** Free spreads need no premium feature; the rest sit behind `deep_interpretations`. */
  free: boolean;
  layout: CartoSpreadLayout;
  /** How a reader works through the cards once they are down. */
  readingMethod: string;
  verdict?: WishVerdict | YesNoVerdict;
}

export interface CartoLesson {
  slug: string;
  /** 1..12 */
  order: number;
  title: string;
  eyebrow: string;
  lede: string;
  /** 3–5 */
  points: string[];
  /** Three paragraphs. */
  body: string[];
  practice: string;
  /** Card slugs. */
  relatedCards: string[];
}

export interface PlayingSuitInfo {
  id: PlayingSuit;
  name: string;
  color: PlayingColor;
  domain: string;
  verb: string;
  season: string;
  speed: string;
  yesNo: string;
  legacyComplexion: string;
  keywords: string[];
}

export interface RankKey {
  rank: PlayingRank;
  value: number;
  key: string;
}

export interface SameRankCombination {
  rank: PlayingRank;
  /** How many of the rank must be on the table. */
  count: number;
  meaning: string;
}

export interface NeighborRule {
  id: string;
  when: string;
  meaning: string;
}

export interface CartoTiming {
  seasons: Record<PlayingSuit, string>;
  speeds: Record<PlayingSuit, string>;
  numberIsCount: boolean;
  courtCards: string;
  method: string;
}
