import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import i18n from '../../i18n/config';
import { localizeCombinationHit } from '../../i18n/localizePlayingCard';
import { findCombinations, getCartoSpread, getPlayingCardBySlug, suitMajorityThreshold, type CombinationHit } from '../../data/cartomancy';
import { cartoCombinations } from '../../components/cartomancy/cartoFlow';
import type { PlayingCard } from '../../types/cartomancy';

/**
 * The suit and colour majorities: when the table names a suit as the
 * reading's subject (the spreads' own methods: "four or more of one suit",
 * "count the suits: the majority is the season's subject"), and how the
 * line is labelled in every locale.
 */

const c = (slug: string): PlayingCard => {
  const card = getPlayingCardBySlug(slug);
  if (!card) throw new Error(`no card ${slug}`);
  return card;
};
const of = (suit: string, ranks: string[]) => ranks.map((r) => c(`${r}-of-${suit}`));
const suitHit = (hits: CombinationHit[]) => hits.find((h) => h.id === 'suit-majority');

describe('the suit majority is a plurality', () => {
  it('needs a third of the table, never fewer than two', () => {
    expect(suitMajorityThreshold(3)).toBe(2);
    expect(suitMajorityThreshold(7)).toBe(3);
    expect(suitMajorityThreshold(9)).toBe(3);
    expect(suitMajorityThreshold(21)).toBe(7);
    expect(suitMajorityThreshold(9, 4)).toBe(4);
  });

  it('reads the Nine-Card Square’s “four or more of one suit” (4 Hearts, 2 Clubs, 2 Diamonds, 1 Spade)', () => {
    const square = getCartoSpread('carto-nine-square')!;
    expect(square.suitMajorityMin).toBe(4);
    const table = [...of('hearts', ['two', 'five', 'eight', 'king']), ...of('clubs', ['three', 'six']), ...of('diamonds', ['four', 'nine']), c('ace-of-spades')];
    const hit = suitHit(cartoCombinations(square, table));
    expect(hit?.suit).toBe('hearts');
    expect(hit?.count).toBe(4);
    expect(hit?.total).toBe(9);
    expect(hit?.minoritySuit).toBe('spades');
    // three of nine is not the subject on the square, though it would be on another nine-card table
    const three = [...of('hearts', ['two', 'five', 'eight']), ...of('clubs', ['three', 'six']), ...of('diamonds', ['four', 'nine']), ...of('spades', ['ace', 'king'])];
    expect(suitHit(cartoCombinations(square, three))).toBeUndefined();
  });

  it('names the season’s subject on a 21-card Romany table that is not more than half one suit', () => {
    const romany = getCartoSpread('carto-romany')!;
    const table = [
      ...of('hearts', ['ace', 'two', 'three', 'four', 'five', 'six', 'seven']),
      ...of('clubs', ['ace', 'two', 'three', 'four', 'five']),
      ...of('diamonds', ['ace', 'two', 'three', 'four', 'five']),
      ...of('spades', ['two', 'three', 'four', 'five']),
    ];
    expect(table).toHaveLength(21);
    const hit = suitHit(cartoCombinations(romany, table));
    expect(hit?.suit).toBe('hearts');
    expect(hit?.minoritySuit).toBe('spades');
    // six of twenty-one is not a third
    const flat = [...table.slice(1, 7), ...table.slice(7), c('six-of-spades')];
    expect(flat).toHaveLength(21);
    expect(suitHit(cartoCombinations(romany, flat))).toBeUndefined();
  });

  it('names no subject when two suits tie for the most', () => {
    const tie = [...of('hearts', ['two', 'three', 'four']), ...of('spades', ['two', 'three', 'four']), c('ace-of-clubs')];
    expect(suitHit(findCombinations(tie, getCartoSpread('carto-horseshoe')!.layout))).toBeUndefined();
  });

  it('still reads two of three as the subject on the three-card line', () => {
    const hit = suitHit(findCombinations([c('two-of-hearts'), c('nine-of-hearts'), c('four-of-spades')], getCartoSpread('carto-three-timeline')!.layout));
    expect(hit?.suit).toBe('hearts');
  });
});

describe('the majority line in every locale', () => {
  const horseshoe = getCartoSpread('carto-horseshoe')!;
  const table = [c('two-of-spades'), c('three-of-clubs'), c('four-of-spades'), c('five-of-hearts'), c('six-of-clubs'), c('seven-of-diamonds'), c('eight-of-spades')];
  const color = () => findCombinations(table, horseshoe.layout).find((h) => h.id === 'color-majority')!;

  it('keeps the English phrase in English', () => {
    const hit = color();
    expect(hit.label).toBe('5 of 7 are black');
    expect(hit.total).toBe(7);
    expect(localizeCombinationHit(hit, 'en').label).toBe('5 of 7 are black');
  });

  it('never prints the English phrase in ja, ko or zh: it is built from the locale’s template', () => {
    const ja = JSON.parse(readFileSync(join(process.cwd(), 'src', 'i18n', 'locales', 'ja', 'cartomancy.json'), 'utf8'));
    i18n.addResourceBundle('ja', 'cartomancy', ja, true, true);
    i18n.addResourceBundle(
      'ja',
      'app',
      { cartomancy: { result: { colorMajority: '{{total}}枚中{{n}}枚が{{color}}', suitMajority: '{{total}}枚中{{n}}枚が{{suit}}', colorNames: { red: '赤', black: '黒' } } } },
      true,
      false,
    );
    try {
      const line = localizeCombinationHit(color(), 'ja');
      expect(line.label).toBe('7枚中5枚が黒');
      expect(line.label).not.toMatch(/[A-Za-z]/);
      const suit = findCombinations([c('two-of-hearts'), c('nine-of-hearts'), c('four-of-spades')], getCartoSpread('carto-yes-no')!.layout).find((h) => h.id === 'suit-majority')!;
      expect(localizeCombinationHit(suit, 'ja').label).toBe(`3枚中2枚が${ja.suits.hearts.name}`);
    } finally {
      i18n.removeResourceBundle('ja', 'cartomancy');
    }
  });
});
