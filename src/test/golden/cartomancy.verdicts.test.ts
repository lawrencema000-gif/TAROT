import { describe, it, expect } from 'vitest';
import { getPlayingCardBySlug, PLAYING_DECK } from '../../data/cartomancy/deck';
import { getCartoSpread } from '../../data/cartomancy/spreads';
import {
  adjacencyFor,
  findCombinations,
  flankingPairs,
  wishVerdict,
  yesNoVerdict,
  WISH_LAYOUT,
  YES_NO_VERDICT,
} from '../../data/cartomancy/combinations';
import type { PlayingCard } from '../../types/cartomancy';

/**
 * The reader functions apply the tables, not a hunch.
 *
 * Yes or No counts red against black on the three- and five-card scales
 * the spread data carries; the Wish looks for the Nine of Hearts and for a
 * Spade touching it across the 3×3's eight neighbours; findCombinations
 * reports same-rank sets, the neighbour rules and each card's pairings.
 * Fixtures are named cards, laid in reading order (row-major for grids).
 */

const c = (slug: string): PlayingCard => {
  const card = getPlayingCardBySlug(slug);
  if (!card) throw new Error(`no card ${slug}`);
  return card;
};
const cards = (...slugs: string[]) => slugs.map(c);
const row3 = getCartoSpread('carto-three-timeline')!.layout;

describe('adjacency', () => {
  it('in a row, cards touch their neighbours only', () => {
    expect(adjacencyFor(row3, 3)).toEqual([[0, 1], [1, 2]]);
    expect(adjacencyFor(undefined, 5)).toEqual([[0, 1], [1, 2], [2, 3], [3, 4]]);
  });

  it('in the 3×3, the centre touches all eight and a corner touches three', () => {
    const pairs = adjacencyFor(WISH_LAYOUT, 9);
    const touching = (i: number) => pairs.filter(([a, b]) => a === i || b === i).map(([a, b]) => (a === i ? b : a)).sort((x, y) => x - y);
    expect(touching(4)).toEqual([0, 1, 2, 3, 5, 6, 7, 8]);
    expect(touching(0)).toEqual([1, 3, 4]);
    expect(touching(8)).toEqual([4, 5, 7]);
    expect(pairs).toHaveLength(20);
  });

  it('in Two Hearts, the bond card spans both pillars and touches the row above', () => {
    const pillars = getCartoSpread('carto-relationship')!.layout;
    const pairs = adjacencyFor(pillars, 7);
    expect(pairs).toContainEqual([4, 6]);
    expect(pairs).toContainEqual([5, 6]);
    expect(pairs).not.toContainEqual([0, 6]);
  });

  it('finds the cards that flank a position on opposite sides', () => {
    expect(flankingPairs(row3, 3, 1)).toEqual([[0, 2]]);
    expect(flankingPairs(row3, 3, 0)).toEqual([]);
    expect(flankingPairs(WISH_LAYOUT, 9, 4)).toEqual([[3, 5], [1, 7]]);
    expect(flankingPairs(WISH_LAYOUT, 9, 0)).toEqual([]);
  });
});

describe('yesNoVerdict', () => {
  it('reads two reds of three as leaning yes', () => {
    const out = yesNoVerdict(cards('two-of-hearts', 'three-of-diamonds', 'four-of-spades'));
    expect(out.result).toBe('leaning-yes');
    expect(out.reds).toBe(2);
    expect(out.blacks).toBe(1);
    expect(out.scale).toBe(3);
    expect(out.strengthened).toBeNull();
    expect(out.qualifier).toBeNull();
    expect(out.label).toBe('Leaning yes');
  });

  it('walks the three-card scale from no to yes', () => {
    expect(yesNoVerdict(cards('two-of-clubs', 'three-of-clubs', 'four-of-spades')).result).toBe('no');
    expect(yesNoVerdict(cards('two-of-hearts', 'three-of-clubs', 'four-of-spades')).result).toBe('leaning-no');
    expect(yesNoVerdict(cards('two-of-hearts', 'three-of-diamonds', 'four-of-hearts')).result).toBe('yes');
  });

  it('reads five cards on the five-card scale, with both endpoints', () => {
    const allRed = yesNoVerdict(cards('two-of-hearts', 'three-of-hearts', 'four-of-diamonds', 'five-of-diamonds', 'six-of-hearts'));
    expect(allRed.scale).toBe(5);
    expect(allRed.result).toBe('yes');
    const allBlack = yesNoVerdict(cards('two-of-clubs', 'three-of-clubs', 'four-of-spades', 'five-of-spades', 'six-of-clubs'));
    expect(allBlack.result).toBe('no');
    expect(yesNoVerdict(cards('two-of-hearts', 'three-of-clubs', 'four-of-spades', 'five-of-spades', 'six-of-clubs')).result).toBe('likely-no');
    expect(yesNoVerdict(cards('two-of-hearts', 'three-of-hearts', 'four-of-spades', 'five-of-spades', 'six-of-clubs')).result).toBe('leaning-no');
    expect(yesNoVerdict(cards('two-of-hearts', 'three-of-hearts', 'four-of-hearts', 'five-of-spades', 'six-of-clubs')).result).toBe('leaning-yes');
    expect(yesNoVerdict(cards('two-of-hearts', 'three-of-hearts', 'four-of-hearts', 'five-of-diamonds', 'six-of-clubs')).result).toBe('likely-yes');
  });

  it('adds the court-card qualifier when a court card is down', () => {
    const out = yesNoVerdict(cards('jack-of-clubs', 'three-of-diamonds', 'four-of-hearts'));
    expect(out.qualifier).toBe(YES_NO_VERDICT.courtQualifier);
    expect(out.qualifier).toBe('depends-on-person-or-time');
    expect(out.result).toBe('leaning-yes');
  });

  it('lets the Nine of Hearts deepen a yes and the Ace of Spades deepen a no, by one step', () => {
    const wish = yesNoVerdict(cards('nine-of-hearts', 'two-of-diamonds', 'four-of-spades'));
    expect(wish.base).toBe('leaning-yes');
    expect(wish.result).toBe('yes');
    expect(wish.strengthened).toBe('yes');

    const ace = yesNoVerdict(cards('ace-of-spades', 'four-of-spades', 'two-of-hearts'));
    expect(ace.base).toBe('leaning-no');
    expect(ace.result).toBe('no');
    expect(ace.strengthened).toBe('no');

    // on the five-card scale a step is a step, not a leap to the end
    const five = yesNoVerdict(cards('nine-of-hearts', 'two-of-hearts', 'three-of-hearts', 'four-of-spades', 'five-of-clubs'));
    expect(five.base).toBe('leaning-yes');
    expect(five.result).toBe('likely-yes');
  });

  it('never flips a verdict with a strengthener, and cancels when both are down', () => {
    const noFlip = yesNoVerdict(cards('nine-of-hearts', 'two-of-spades', 'four-of-spades'));
    expect(noFlip.result).toBe('leaning-no');
    expect(noFlip.strengthened).toBeNull();

    const both = yesNoVerdict(cards('nine-of-hearts', 'ace-of-spades', 'two-of-clubs'));
    expect(both.base).toBe('leaning-no');
    expect(both.result).toBe('leaning-no');
    expect(both.strengthened).toBeNull();
  });

  it('names the suit more than half the cards share', () => {
    expect(yesNoVerdict(cards('two-of-hearts', 'three-of-hearts', 'four-of-spades')).majoritySuit).toBe('hearts');
    expect(yesNoVerdict(cards('two-of-hearts', 'three-of-diamonds', 'four-of-spades')).majoritySuit).toBeNull();
  });
});

describe('wishVerdict', () => {
  // 3×3, row-major: index 4 is the centre, 0 a corner
  const filler = ['two-of-clubs', 'three-of-diamonds', 'four-of-clubs', 'five-of-diamonds', 'six-of-clubs', 'seven-of-diamonds', 'eight-of-clubs', 'ten-of-diamonds'];
  const lay = (at: Record<number, string>) => Array.from({ length: 9 }, (_, i) => at[i] ?? filler.shift()!).map(c);

  it('favors a wish when the Nine of Hearts is down with no Spade touching it', () => {
    filler.length = 0;
    filler.push('two-of-clubs', 'three-of-diamonds', 'four-of-clubs', 'five-of-diamonds', 'six-of-clubs', 'seven-of-diamonds', 'eight-of-clubs', 'ten-of-diamonds');
    const out = wishVerdict(lay({ 4: 'nine-of-hearts' }));
    expect(out.result).toBe('favored');
    expect(out.label).toBe('Favored');
    expect(out.wishIndex).toBe(4);
    expect(out.adjacentSpadeIds).toEqual([]);
  });

  it('favors with a delay when a Spade touches the Nine, including on the diagonal', () => {
    const table = cards(
      'nine-of-hearts', 'two-of-clubs', 'three-of-diamonds',
      'four-of-clubs', 'five-of-spades', 'six-of-diamonds',
      'seven-of-clubs', 'eight-of-diamonds', 'ten-of-clubs',
    );
    const out = wishVerdict(table);
    expect(out.result).toBe('favored-with-delay');
    expect(out.label).toBe('Favored, with a delay');
    expect(out.adjacentSpadeIds).toEqual([c('five-of-spades').id]);
  });

  it('stays favored when the only Spade is out of reach', () => {
    const table = cards(
      'nine-of-hearts', 'two-of-clubs', 'three-of-diamonds',
      'four-of-clubs', 'five-of-diamonds', 'six-of-diamonds',
      'seven-of-clubs', 'eight-of-diamonds', 'five-of-spades',
    );
    const out = wishVerdict(table);
    expect(out.result).toBe('favored');
    expect(out.adjacentSpadeIds).toEqual([]);
  });

  it('says not now when the Nine is absent and a hard Spade is down', () => {
    const table = cards(
      'two-of-hearts', 'three-of-hearts', 'four-of-hearts',
      'five-of-hearts', 'nine-of-spades', 'six-of-diamonds',
      'seven-of-clubs', 'eight-of-diamonds', 'ten-of-clubs',
    );
    const out = wishVerdict(table);
    expect(out.result).toBe('not-now');
    expect(out.hardSpadeIds).toEqual([c('nine-of-spades').id]);
    expect(out.wishIndex).toBeNull();
    expect(wishVerdict(cards(...table.slice(0, 4).map((x) => x.slug), 'ace-of-spades', ...table.slice(5).map((x) => x.slug))).result).toBe('not-now');
  });

  it('keeps the wish alive when Hearts outnumber Spades, and asks to reshape it otherwise', () => {
    const alive = wishVerdict(cards(
      'two-of-hearts', 'three-of-hearts', 'four-of-spades',
      'five-of-hearts', 'six-of-clubs', 'six-of-diamonds',
      'seven-of-clubs', 'eight-of-diamonds', 'ten-of-clubs',
    ));
    expect(alive.result).toBe('alive');
    expect(alive.label).toBe('Alive, needs tending');
    expect(alive.hearts).toBe(3);
    expect(alive.spades).toBe(1);

    const reshape = wishVerdict(cards(
      'two-of-hearts', 'three-of-spades', 'four-of-spades',
      'five-of-spades', 'six-of-clubs', 'six-of-diamonds',
      'seven-of-clubs', 'eight-of-diamonds', 'ten-of-clubs',
    ));
    expect(reshape.result).toBe('reshape');
    expect(reshape.label).toBe('Reshape the wish');
    expect(reshape.spades).toBe(3);
  });
});

describe('findCombinations', () => {
  it('sees three Queens', () => {
    const hits = findCombinations(cards('queen-of-hearts', 'two-of-clubs', 'queen-of-diamonds', 'queen-of-spades'));
    const queens = hits.find((h) => h.kind === 'same-rank');
    expect(queens?.id).toBe('same-rank:queen:3');
    expect(queens?.cardIds.sort()).toEqual([c('queen-of-hearts').id, c('queen-of-diamonds').id, c('queen-of-spades').id].sort());
    expect(queens?.label).toBe('Three Queens');
    expect(queens?.meaning).toBe('Visits, gossip and company.');
  });

  it('falls back to the largest table entry below the count', () => {
    // the table lists Tens at four and three, not two
    const hits = findCombinations(cards('ten-of-hearts', 'ten-of-clubs', 'two-of-diamonds'));
    expect(hits.some((h) => h.kind === 'same-rank')).toBe(false);
    const nines = findCombinations(cards('nine-of-clubs', 'nine-of-diamonds', 'nine-of-spades', 'two-of-hearts'));
    expect(nines.find((h) => h.kind === 'same-rank')?.id).toBe('same-rank:9:3');
  });

  it('sees a court card between two cards of its own suit', () => {
    const hits = findCombinations(cards('two-of-clubs', 'jack-of-clubs', 'five-of-clubs'), row3);
    const centred = hits.find((h) => h.id === 'court-centered');
    expect(centred).toBeDefined();
    expect(centred?.cardIds).toEqual([c('two-of-clubs').id, c('jack-of-clubs').id, c('five-of-clubs').id]);
    expect(centred?.meaning).toBe('That person is central to the whole matter.');
    // not when a flank is another suit
    expect(findCombinations(cards('two-of-clubs', 'jack-of-clubs', 'five-of-hearts'), row3).some((h) => h.id === 'court-centered')).toBe(false);
  });

  it('sees a Club beside a Diamond, only when they touch', () => {
    const touching = findCombinations(cards('three-of-clubs', 'four-of-diamonds', 'five-of-hearts'), row3);
    const earned = touching.find((h) => h.id === 'earned-money');
    expect(earned?.cardIds).toEqual([c('three-of-clubs').id, c('four-of-diamonds').id]);
    expect(earned?.meaning).toBe('Money earned rather than received; effort turning into means.');
    const apart = findCombinations(cards('three-of-clubs', 'five-of-hearts', 'four-of-diamonds'), row3);
    expect(apart.some((h) => h.id === 'earned-money')).toBe(false);
  });

  it('sees the wish delayed, the ending touch, the softening heart and the seven', () => {
    const hits = findCombinations(cards('nine-of-hearts', 'ace-of-spades', 'seven-of-clubs'), row3);
    const ids = hits.map((h) => h.id);
    expect(ids).toContain('wish-delayed');
    expect(ids).toContain('wish-shape');
    expect(ids).toContain('ending-touch');
    expect(ids).toContain('heart-softens');
    expect(ids).toContain('seven-intensifies');
    expect(hits.find((h) => h.id === 'seven-intensifies')?.cardIds).toEqual([c('seven-of-clubs').id, c('ace-of-spades').id]);
  });

  it('sees a king and queen of one suit anywhere on the table', () => {
    const hits = findCombinations(cards('king-of-hearts', 'two-of-clubs', 'queen-of-hearts'), row3);
    const couple = hits.find((h) => h.id === 'royal-couple');
    expect(couple?.suit).toBe('hearts');
    expect(couple?.cardIds).toEqual([c('king-of-hearts').id, c('queen-of-hearts').id]);
  });

  it('reports a card’s own named pairing once per pair', () => {
    const hits = findCombinations(cards('ace-of-hearts', 'two-of-hearts', 'four-of-clubs'), row3);
    const pairs = hits.filter((h) => h.kind === 'pair');
    expect(pairs.map((h) => h.id)).toContain('pair:ace-of-hearts:two-of-hearts');
    expect(pairs.filter((h) => h.cardIds.includes(c('ace-of-hearts').id) && h.cardIds.includes(c('two-of-hearts').id))).toHaveLength(1);
    expect(pairs[0].meaning).toBe('A new attachment that quickly becomes mutual.');
  });

  it('reports suit and colour majorities last, and honours a limit', () => {
    const hits = findCombinations(cards('two-of-hearts', 'three-of-hearts', 'four-of-spades'), row3);
    const suit = hits.find((h) => h.id === 'suit-majority');
    expect(suit?.suit).toBe('hearts');
    expect(suit?.minoritySuit).toBe('clubs');
    const color = hits.find((h) => h.id === 'color-majority');
    expect(color?.color).toBe('red');
    expect(hits.indexOf(suit!)).toBeGreaterThan(hits.findIndex((h) => h.kind === 'neighbor'));
    expect(findCombinations(cards('two-of-hearts', 'three-of-hearts', 'four-of-spades'), row3, { limit: 1 })).toHaveLength(1);
  });

  it('finds nothing on one card and does not throw on the whole deck', () => {
    expect(findCombinations(cards('two-of-hearts'))).toEqual([]);
    expect(() => findCombinations(PLAYING_DECK)).not.toThrow();
  });
});
