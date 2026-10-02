import type {
  CartoSpreadLayout,
  PlayingCard,
  PlayingColor,
  PlayingRank,
  PlayingSuit,
  WishResult,
  WishVerdict,
  WishVerdictRule,
  YesNoResult,
  YesNoVerdict,
} from '../../types/cartomancy';
import { isCourtCard, PLAYING_SUITS } from './deck';
import { getCartoSpread } from './spreads';
import { NEIGHBOR_RULES, SAME_RANK_COMBINATIONS } from './tables.en';

/**
 * Reading the table the way a card reader does.
 *
 * Three data-driven functions. `findCombinations` walks the same-rank and
 * neighbour tables in `tables.en.ts` and each card's own pairings;
 * `yesNoVerdict` and `wishVerdict` apply the verdict rules the Yes or No
 * and Wish spreads carry in `spreads.ts`. None of them hard-codes a
 * meaning: change the tables and the readings change with them.
 *
 * Adjacency comes from the spread's layout: cards in a row or an arc are
 * neighbours when they lie side by side; cards in a grid are neighbours
 * across the 8-neighbourhood (sides and corners), which is how the Wish
 * reads "a Spade touching the Nine of Hearts".
 */

// ---------------------------------------------------------------------------
// Adjacency
// ---------------------------------------------------------------------------

/** Unordered pairs `[a, b]` with `a < b`, as indices into the cards array. */
export type Adjacency = Array<[number, number]>;

interface Span {
  index: number;
  row: number;
  c0: number;
  c1: number;
}

function gridSpans(layout: CartoSpreadLayout, count: number): Span[] | null {
  if (layout.kind !== 'grid' && layout.kind !== 'pillars') return null;
  return layout.cells
    .filter((cell) => cell.index < count)
    .map((cell) => ({ index: cell.index, row: cell.row, c0: cell.col, c1: cell.col + (cell.span ?? 1) - 1 }));
}

const touching = (a: Span, b: Span) => Math.abs(a.row - b.row) <= 1 && a.c0 <= b.c1 + 1 && b.c0 <= a.c1 + 1;

/** Which cards lie next to which, for `count` cards laid in `layout`. */
export function adjacencyFor(layout: CartoSpreadLayout | undefined, count: number): Adjacency {
  const spans = layout ? gridSpans(layout, count) : null;
  const pairs: Adjacency = [];
  if (!spans) {
    // a row or an arc: side by side
    for (let i = 0; i + 1 < count; i++) pairs.push([i, i + 1]);
    return pairs;
  }
  for (let i = 0; i < spans.length; i++) {
    for (let j = i + 1; j < spans.length; j++) {
      if (touching(spans[i], spans[j])) {
        const a = Math.min(spans[i].index, spans[j].index);
        const b = Math.max(spans[i].index, spans[j].index);
        pairs.push([a, b]);
      }
    }
  }
  return pairs.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
}

/**
 * The pairs of cards that flank card `i` on opposite sides: left and right,
 * or above and below. In a row only left and right exist.
 */
export function flankingPairs(layout: CartoSpreadLayout | undefined, count: number, i: number): Array<[number, number]> {
  const spans = layout ? gridSpans(layout, count) : null;
  if (!spans) return i > 0 && i + 1 < count ? [[i - 1, i + 1]] : [];
  const me = spans.find((s) => s.index === i);
  if (!me) return [];
  const at = (row: number, col: number) => spans.find((s) => s.row === row && s.c0 <= col && col <= s.c1 && s.index !== i);
  const out: Array<[number, number]> = [];
  const left = at(me.row, me.c0 - 1);
  const right = at(me.row, me.c1 + 1);
  if (left && right) out.push([left.index, right.index]);
  const above = at(me.row - 1, me.c0);
  const below = at(me.row + 1, me.c0);
  if (above && below) out.push([above.index, below.index]);
  return out;
}

// ---------------------------------------------------------------------------
// Combinations
// ---------------------------------------------------------------------------

export type CombinationKind = 'same-rank' | 'neighbor' | 'pair' | 'majority';

export interface CombinationHit {
  kind: CombinationKind;
  /** `same-rank:queen:3`, a `NEIGHBOR_RULES` id, `pair:<slug>:<slug>`, `suit-majority` or `color-majority`. */
  id: string;
  cardIds: number[];
  meaning: string;
  /** A short English line naming the hit, for the AI prompt and as a fallback label. */
  label: string;
  rank?: PlayingRank;
  count?: number;
  suit?: PlayingSuit;
  minoritySuit?: PlayingSuit;
  color?: PlayingColor;
}

const RANK_WORD: Record<PlayingRank, string> = {
  ace: 'Ace',
  '2': 'Two',
  '3': 'Three',
  '4': 'Four',
  '5': 'Five',
  '6': 'Six',
  '7': 'Seven',
  '8': 'Eight',
  '9': 'Nine',
  '10': 'Ten',
  jack: 'Jack',
  queen: 'Queen',
  king: 'King',
};
const COUNT_WORD = ['', '', 'Two', 'Three', 'Four'];
const SUIT_WORD: Record<PlayingSuit, string> = { hearts: 'Hearts', clubs: 'Clubs', diamonds: 'Diamonds', spades: 'Spades' };
const plural = (rank: PlayingRank) => (rank === '6' ? 'Sixes' : `${RANK_WORD[rank]}s`);

const isSuit = (card: PlayingCard, suit: PlayingSuit) => card.suit === suit;
const isRank = (card: PlayingCard, rank: PlayingRank) => card.rank === rank;

type NeighborHandler = (ctx: {
  cards: PlayingCard[];
  pairs: Adjacency;
  layout: CartoSpreadLayout | undefined;
  meaning: string;
  id: string;
}) => CombinationHit[];

const pairHits = (
  ctx: { cards: PlayingCard[]; pairs: Adjacency; meaning: string; id: string },
  test: (a: PlayingCard, b: PlayingCard) => boolean,
  label: (a: PlayingCard, b: PlayingCard) => string,
): CombinationHit[] => {
  const hits: CombinationHit[] = [];
  for (const [i, j] of ctx.pairs) {
    const a = ctx.cards[i];
    const b = ctx.cards[j];
    const ab = test(a, b);
    const ba = !ab && test(b, a);
    if (!ab && !ba) continue;
    const [first, second] = ab ? [a, b] : [b, a];
    hits.push({ kind: 'neighbor', id: ctx.id, cardIds: [first.id, second.id], meaning: ctx.meaning, label: label(first, second) });
  }
  return hits;
};

/** One handler per rule the table names; a rule without a handler is prose only. */
const NEIGHBOR_HANDLERS: Record<string, NeighborHandler> = {
  'wish-delayed': (ctx) =>
    pairHits(ctx, (a, b) => a.slug === 'nine-of-hearts' && isSuit(b, 'spades'), (a, b) => `${a.name} beside the ${b.name}`),
  'wish-shape': (ctx) => {
    const wish = ctx.cards.find((c) => c.slug === 'nine-of-hearts');
    return wish ? [{ kind: 'neighbor', id: ctx.id, cardIds: [wish.id], meaning: ctx.meaning, label: `${wish.name} on the table` }] : [];
  },
  'ending-touch': (ctx) =>
    pairHits(ctx, (a, b) => a.slug === 'ace-of-spades' && b.slug !== 'ace-of-spades', (a, b) => `${a.name} touching the ${b.name}`),
  'heart-softens': (ctx) =>
    pairHits(ctx, (a, b) => isSuit(a, 'hearts') && isSuit(b, 'spades'), (a, b) => `${a.name} beside the ${b.name}`),
  'earned-money': (ctx) =>
    pairHits(ctx, (a, b) => isSuit(a, 'clubs') && isSuit(b, 'diamonds'), (a, b) => `${a.name} beside the ${b.name}`),
  'seven-intensifies': (ctx) =>
    pairHits(ctx, (a, b) => isRank(a, '7') && !isRank(b, '7'), (a, b) => `${a.name} intensifies the ${b.name}`),
  'court-centered': (ctx) => {
    const hits: CombinationHit[] = [];
    ctx.cards.forEach((card, i) => {
      if (!isCourtCard(card)) return;
      for (const [l, r] of flankingPairs(ctx.layout, ctx.cards.length, i)) {
        if (ctx.cards[l].suit === card.suit && ctx.cards[r].suit === card.suit) {
          hits.push({
            kind: 'neighbor',
            id: ctx.id,
            cardIds: [ctx.cards[l].id, card.id, ctx.cards[r].id],
            meaning: ctx.meaning,
            label: `${card.name} between two ${SUIT_WORD[card.suit]}`,
          });
        }
      }
    });
    return hits;
  },
  'royal-couple': (ctx) => {
    const hits: CombinationHit[] = [];
    for (const suit of PLAYING_SUITS) {
      const king = ctx.cards.find((c) => c.suit === suit && c.rank === 'king');
      const queen = ctx.cards.find((c) => c.suit === suit && c.rank === 'queen');
      if (king && queen) {
        hits.push({ kind: 'neighbor', id: ctx.id, cardIds: [king.id, queen.id], meaning: ctx.meaning, label: `${king.name} with the ${queen.name}`, suit });
      }
    }
    return hits;
  },
  'suit-majority': (ctx) => {
    const suited = ctx.cards.filter((c) => c.suit !== 'joker');
    if (suited.length < 3) return [];
    const counts = PLAYING_SUITS.map((suit) => suited.filter((c) => c.suit === suit).length);
    const top = Math.max(...counts);
    if (top * 2 <= suited.length) return [];
    const suit = PLAYING_SUITS[counts.indexOf(top)];
    const minoritySuit = PLAYING_SUITS[counts.indexOf(Math.min(...counts))];
    return [
      {
        kind: 'majority',
        id: ctx.id,
        cardIds: suited.filter((c) => c.suit === suit).map((c) => c.id),
        meaning: ctx.meaning,
        label: `${top} of ${suited.length} are ${SUIT_WORD[suit]}`,
        suit,
        minoritySuit,
        count: top,
      },
    ];
  },
  'color-majority': (ctx) => {
    if (ctx.cards.length < 3) return [];
    const reds = ctx.cards.filter((c) => c.color === 'red');
    const blacks = ctx.cards.filter((c) => c.color === 'black');
    const [color, group] = reds.length > blacks.length ? (['red', reds] as const) : (['black', blacks] as const);
    if (group.length * 2 <= ctx.cards.length) return [];
    return [
      {
        kind: 'majority',
        id: ctx.id,
        cardIds: group.map((c) => c.id),
        meaning: ctx.meaning,
        label: `${group.length} of ${ctx.cards.length} are ${color}`,
        color,
        count: group.length,
      },
    ];
  },
};

/**
 * Everything the tables say about this set of cards: same-rank sets first,
 * then the neighbour rules in table order, then each card's own named
 * pairings, then the suit and colour majorities. `limit` trims the list
 * (the AI prompt takes six).
 */
export function findCombinations(
  cards: PlayingCard[],
  layout?: CartoSpreadLayout,
  options: { limit?: number } = {},
): CombinationHit[] {
  const hits: CombinationHit[] = [];
  const pairs = adjacencyFor(layout, cards.length);

  // same-rank sets: the entry for the exact count, or the largest below it
  const byRank = new Map<PlayingRank, PlayingCard[]>();
  for (const card of cards) {
    if (card.suit === 'joker' || card.rank === 'joker') continue;
    const list = byRank.get(card.rank) ?? [];
    list.push(card);
    byRank.set(card.rank, list);
  }
  for (const [rank, group] of byRank) {
    if (group.length < 2) continue;
    const entry = SAME_RANK_COMBINATIONS.filter((e) => e.rank === rank && e.count <= group.length).sort((a, b) => b.count - a.count)[0];
    if (!entry) continue;
    hits.push({
      kind: 'same-rank',
      id: `same-rank:${rank}:${entry.count}`,
      cardIds: group.map((c) => c.id),
      meaning: entry.meaning,
      label: `${COUNT_WORD[Math.min(group.length, 4)]} ${plural(rank)}`,
      rank,
      count: group.length,
    });
  }

  // neighbour rules, in table order
  const majorities: CombinationHit[] = [];
  for (const rule of NEIGHBOR_RULES) {
    const handler = NEIGHBOR_HANDLERS[rule.id];
    if (!handler) continue;
    const found = handler({ cards, pairs, layout, meaning: rule.meaning, id: rule.id });
    for (const hit of found) (hit.kind === 'majority' ? majorities : hits).push(hit);
  }

  // each card's own pairings, once per unordered pair
  const seen = new Set<string>();
  for (const card of cards) {
    for (const combo of card.combinations) {
      const other = cards.find((c) => c.slug === combo.with && c.id !== card.id);
      if (!other) continue;
      const key = [card.id, other.id].sort((a, b) => a - b).join(':');
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push({
        kind: 'pair',
        id: `pair:${card.slug}:${other.slug}`,
        cardIds: [card.id, other.id],
        meaning: combo.meaning,
        label: `${card.name} with the ${other.name}`,
      });
    }
  }

  hits.push(...majorities);
  return options.limit ? hits.slice(0, options.limit) : hits;
}

// ---------------------------------------------------------------------------
// Yes or No
// ---------------------------------------------------------------------------

export function isYesNoVerdict(v: WishVerdict | YesNoVerdict | undefined): v is YesNoVerdict {
  return v?.kind === 'yes-no';
}

export function isWishVerdict(v: WishVerdict | YesNoVerdict | undefined): v is WishVerdict {
  return v?.kind === 'wish';
}

const yesNoSpread = getCartoSpread('carto-yes-no');
const wishSpread = getCartoSpread('carto-wish');
if (!yesNoSpread || !isYesNoVerdict(yesNoSpread.verdict) || !wishSpread || !isWishVerdict(wishSpread.verdict)) {
  throw new Error('cartomancy: the Yes or No and Wish spreads must carry their verdict rules');
}

/** The rules the Yes or No spread ships with. */
export const YES_NO_VERDICT: YesNoVerdict = yesNoSpread.verdict;
/** The rules the Wish spread ships with. */
export const WISH_VERDICT: WishVerdict = wishSpread.verdict;
/** The 3×3 the Wish is laid in. */
export const WISH_LAYOUT: CartoSpreadLayout = wishSpread.layout;

/** From no to yes. */
export const YES_NO_ORDER: readonly YesNoResult[] = ['no', 'likely-no', 'leaning-no', 'leaning-yes', 'likely-yes', 'yes'];

const YES_NO_LABEL: Record<YesNoResult, string> = {
  yes: 'Yes',
  'likely-yes': 'Likely yes',
  'leaning-yes': 'Leaning yes',
  'leaning-no': 'Leaning no',
  'likely-no': 'Likely no',
  no: 'No',
};

export interface YesNoOutcome {
  result: YesNoResult;
  /** The count before the strengtheners moved it. */
  base: YesNoResult;
  reds: number;
  blacks: number;
  total: number;
  scale: 3 | 5;
  /** `yes` when the wish card deepened a yes, `no` when the Ace of Spades deepened a no. */
  strengthened: 'yes' | 'no' | null;
  /** The court-card qualifier, when a court card is on the table. */
  qualifier: string | null;
  /** The suit more than half the cards share, when there is one. */
  majoritySuit: PlayingSuit | null;
  label: string;
}

const isYesSide = (r: YesNoResult) => YES_NO_ORDER.indexOf(r) >= YES_NO_ORDER.length / 2;

/** One step further along the scale on the side the result is already on. */
function strengthen(result: YesNoResult, side: 'yes' | 'no', available: YesNoResult[]): YesNoResult {
  if ((side === 'yes') !== isYesSide(result)) return result;
  const ladder = YES_NO_ORDER.filter((r) => available.includes(r));
  const at = ladder.indexOf(result);
  const next = side === 'yes' ? at + 1 : at - 1;
  return ladder[Math.max(0, Math.min(ladder.length - 1, next))];
}

/**
 * Count red against black. Three cards read on `scale3`, five on `scale5`
 * (another count is mapped proportionally). A court card adds the
 * qualifier; the Nine of Hearts deepens a yes and the Ace of Spades a no,
 * each by one step, and they cancel when both are down.
 */
export function yesNoVerdict(cards: PlayingCard[], verdict: YesNoVerdict = YES_NO_VERDICT): YesNoOutcome {
  const total = cards.length;
  const reds = cards.filter((c) => c.color === 'red').length;
  const blacks = total - reds;
  const yesCount = verdict.redIsYes ? reds : blacks;
  const scale: 3 | 5 = total >= 4 ? 5 : 3;
  const table = scale === 5 ? verdict.scale5 : verdict.scale3;
  const index = total === scale ? yesCount : total === 0 ? 0 : Math.round((yesCount / total) * scale);
  const base = table[String(index)] ?? (index * 2 >= scale ? 'leaning-yes' : 'leaning-no');
  const available = Object.values(table);

  const slugs = new Set(cards.map((c) => c.slug));
  const yesUp = verdict.strengtheners.yes.some((s) => slugs.has(s));
  const noUp = verdict.strengtheners.no.some((s) => slugs.has(s));
  let result = base;
  let strengthened: 'yes' | 'no' | null = null;
  if (yesUp !== noUp) {
    const side = yesUp ? 'yes' : 'no';
    const moved = strengthen(base, side, available);
    if (moved !== base) {
      result = moved;
      strengthened = side;
    }
  }

  const suited = cards.filter((c) => c.suit !== 'joker');
  const counts = PLAYING_SUITS.map((suit) => suited.filter((c) => c.suit === suit).length);
  const top = Math.max(...counts, 0);
  const majoritySuit = suited.length && top * 2 > suited.length ? PLAYING_SUITS[counts.indexOf(top)] : null;

  return {
    result,
    base,
    reds,
    blacks,
    total,
    scale,
    strengthened,
    qualifier: cards.some(isCourtCard) ? verdict.courtQualifier : null,
    majoritySuit,
    label: YES_NO_LABEL[result],
  };
}

// ---------------------------------------------------------------------------
// The Wish
// ---------------------------------------------------------------------------

export interface WishOutcome {
  result: WishResult;
  label: string;
  /** Index of the Nine of Hearts in the cards array, or null when absent. */
  wishIndex: number | null;
  /** Spades touching the wish card (8-neighbourhood). */
  adjacentSpadeIds: number[];
  /** The hard Spades on the table (Ace and Nine). */
  hardSpadeIds: number[];
  hearts: number;
  spades: number;
}

const CONDITIONS: Array<keyof Pick<WishVerdictRule, 'wishCardPresent' | 'spadeAdjacent' | 'hardSpadePresent' | 'heartsOverSpades'>> = [
  'wishCardPresent',
  'spadeAdjacent',
  'hardSpadePresent',
  'heartsOverSpades',
];

/**
 * Is the Nine of Hearts on the table, and does a Spade touch it? The rules
 * in the spread data are tried in order; the first whose stated conditions
 * all hold is the verdict.
 */
export function wishVerdict(
  cards: PlayingCard[],
  verdict: WishVerdict = WISH_VERDICT,
  layout: CartoSpreadLayout = WISH_LAYOUT,
): WishOutcome {
  const wishIndex = cards.findIndex((c) => c.slug === verdict.wishCard);
  const pairs = adjacencyFor(layout, cards.length);
  const adjacentSpadeIds =
    wishIndex < 0
      ? []
      : pairs
          .filter(([a, b]) => a === wishIndex || b === wishIndex)
          .map(([a, b]) => cards[a === wishIndex ? b : a])
          .filter((c) => c.suit === 'spades')
          .map((c) => c.id);
  const hardSpadeIds = cards.filter((c) => verdict.hardSpades.includes(c.slug)).map((c) => c.id);
  const hearts = cards.filter((c) => c.suit === 'hearts').length;
  const spades = cards.filter((c) => c.suit === 'spades').length;

  const facts: Record<(typeof CONDITIONS)[number], boolean> = {
    wishCardPresent: wishIndex >= 0,
    spadeAdjacent: adjacentSpadeIds.length > 0,
    hardSpadePresent: hardSpadeIds.length > 0,
    heartsOverSpades: hearts > spades,
  };
  const rule =
    verdict.rules.find((r) => CONDITIONS.every((key) => r[key] === undefined || r[key] === facts[key])) ??
    verdict.rules[verdict.rules.length - 1];

  return {
    result: rule.result,
    label: rule.label,
    wishIndex: wishIndex >= 0 ? wishIndex : null,
    adjacentSpadeIds,
    hardSpadeIds,
    hearts,
    spades,
  };
}
