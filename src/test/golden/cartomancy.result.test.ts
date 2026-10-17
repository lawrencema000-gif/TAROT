import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import i18n from '../../i18n/config';
import type { SupportedLocale } from '../../i18n/config';
import {
  cartoCombinations,
  cartoCombinationsForAI,
  cartoMainMeaning,
  cartoSectionText,
  cartoSummarySentencesFrom,
  cartoSynthesis,
  cartoTableLabel,
  cartoVerdict,
  firstSentences,
  sentencesOf,
  type CartoFocus,
} from '../../components/cartomancy/cartoFlow';
import { runInParts, verdictLabel } from '../../components/cartomancy/CartomancyResultParts';
import { combinationHitsToLines } from '../../services/readingInterpretation';
import { localizeCartoSpread, localizePlayingCard } from '../../i18n/localizePlayingCard';
import { CARTO_SPREADS, PLAYING_DECK, getCartoSpread, getPlayingCardBySlug } from '../../data/cartomancy';
import type { PlayingCard } from '../../types/cartomancy';

/**
 * The playing-card result as the reveal and the Library's saved reading
 * print it (CartomancyResultParts), held in every locale:
 *
 *  - F17: a card's section continues where the summary stopped — no
 *    sentence is printed twice, and nothing is lost;
 *  - F18: a five-card Yes or No is numbered card by card, never three
 *    spread names and two stored labels;
 *  - F12: a verdict reads in the reader's language whichever spread it was
 *    computed from;
 *  - F86: a run-in head is punctuated as the locale sets it;
 *  - O#60: the AI request carries the suit and colour majorities the
 *    reader sees, on every table.
 */

const LOCALES = ['ja', 'ko', 'zh'] as const;
const read = (lng: string, ns: string) => JSON.parse(readFileSync(join(process.cwd(), 'src', 'i18n', 'locales', lng, `${ns}.json`), 'utf8'));

beforeAll(() => {
  for (const lng of LOCALES) {
    i18n.addResourceBundle(lng, 'cartomancy', read(lng, 'cartomancy'), true, true);
    i18n.addResourceBundle(lng, 'app', read(lng, 'app'), true, true);
  }
});
afterAll(() => {
  for (const lng of LOCALES) i18n.removeResourceBundle(lng, 'cartomancy');
});

/** A small deterministic PRNG (mulberry32), so every run deals the same tables. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function deal(random: () => number, n: number): PlayingCard[] {
  const deck = [...PLAYING_DECK];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.slice(0, n);
}

const card = (slug: string) => getPlayingCardBySlug(slug)!;
const ALL: SupportedLocale[] = ['en', 'ja', 'ko', 'zh'];
const FOCI: CartoFocus[] = ['general', 'love', 'career'];

describe('a card’s section continues where the summary stopped (F17)', () => {
  /** Every sentence a table's sections print, against the summary above them. */
  function check(table: Array<{ card: PlayingCard; reversed: boolean }>, focus: CartoFocus, label: string) {
    const summary = cartoSynthesis(table, focus, (name, sentence) => `${name}: ${sentence}`);
    table.forEach(({ card: c, reversed }, i) => {
      const main = cartoMainMeaning(c, reversed, focus).text;
      const all = sentencesOf(main);
      const taken = cartoSummarySentencesFrom(i, table.length);
      const { short, more } = cartoSectionText(main, i, table.length);
      // nothing the summary quoted is printed again under the card
      for (const s of sentencesOf(short)) expect(summary.includes(s), `${label} #${i}: "${s}" is in the summary`).toBe(false);
      // and nothing is lost: what neither printed is behind "Read the full meaning"
      expect(more, `${label} #${i}`).toBe(all.length > taken + 2);
      // the summary quoted exactly the sentences the section skips
      if (i < 3 || table.length === 1) expect(summary.includes(firstSentences(main, taken)), `${label} #${i}`).toBe(true);
    });
  }

  it('one card: the summary is its first two sentences, the section the next two (every card, focus and locale)', () => {
    for (const lng of ALL) {
      for (const focus of FOCI) {
        for (const source of PLAYING_DECK) {
          const c = localizePlayingCard(source, lng);
          check([{ card: c, reversed: false }], focus, `${lng} ${focus} ${source.slug}`);
        }
      }
    }
  });

  it('three, five and nine cards: one sentence quoted for each of the first three, none after', () => {
    for (const lng of ALL) {
      const random = rng(lng.charCodeAt(0) * 31 + 7);
      for (const n of [3, 5, 9]) {
        for (let k = 0; k < 60; k++) {
          const focus = FOCI[k % FOCI.length];
          const table = deal(random, n).map((source) => ({ card: localizePlayingCard(source, lng), reversed: random() < 0.35 }));
          check(table, focus, `${lng} n${n} k${k} ${focus}`);
        }
      }
    }
  });

  it('the reported tables: the King of Diamonds alone, the Eight of Clubs in Love (ja), a five-card Yes or No', () => {
    const king = card('king-of-diamonds');
    const kingText = cartoMainMeaning(king, false, 'general').text;
    const kingSection = cartoSectionText(kingText, 0, 1);
    expect(kingSection.short).toBe(sentencesOf(kingText).slice(2, 4).join(' '));
    expect(kingSection.short.startsWith('The King of Diamonds is power through money and position')).toBe(false);

    const eight = localizePlayingCard(card('eight-of-clubs'), 'ja');
    const love = cartoMainMeaning(eight, false, 'love').text;
    const summary = cartoSynthesis([{ card: eight, reversed: false }], 'love');
    expect(cartoSectionText(love, 0, 1).short.includes(summary)).toBe(false);

    const five = ['four-of-diamonds', 'king-of-spades', 'two-of-hearts', 'seven-of-clubs', 'queen-of-hearts'].map((s) => ({ card: card(s), reversed: false }));
    const s0 = cartoSectionText(cartoMainMeaning(five[0].card, false, 'general').text, 0, 5).short;
    const s1 = cartoSectionText(cartoMainMeaning(five[1].card, false, 'general').text, 1, 5).short;
    expect(s0.startsWith('Four diamonds make a purse.')).toBe(false);
    expect(s1.startsWith('The King of Spades is authority')).toBe(false);
    // cards four and five were not quoted: their sections open with their first sentence
    const s3 = cartoSectionText(cartoMainMeaning(five[3].card, false, 'general').text, 3, 5).short;
    expect(s3.startsWith(firstSentences(five[3].card.meaningUpright, 1))).toBe(true);
  });
});

describe('a table’s positions (F18)', () => {
  const t = (lng: string) => i18n.getFixedT(lng, 'app');
  const numbered = (lng: string) => (n: number) => t(lng)('readings.selectView.cardN', { n });
  const generic = (lng: string) => (n: number) => t(lng)('readings.positions.generic', { index: n });

  it('numbers a five-card Yes or No card by card in every locale, and names a three-card one', () => {
    const yesNo = getCartoSpread('carto-yes-no')!;
    for (const lng of ALL) {
      const local = localizeCartoSpread(yesNo, lng);
      const five = [0, 1, 2, 3, 4].map((i) => cartoTableLabel(local, 5, i, numbered(lng), generic(lng)));
      expect(five, lng).toEqual([1, 2, 3, 4, 5].map((n) => numbered(lng)(n)));
      expect(new Set(five).size).toBe(5);
      const three = [0, 1, 2].map((i) => cartoTableLabel(local, 3, i, numbered(lng), generic(lng)));
      expect(three, lng).toEqual(local.positions.map((p) => p.name));
    }
    expect(numbered('ja')(4)).not.toMatch(/Card/);
    // a spread the data no longer has: "Position n"
    expect(cartoTableLabel(null, 2, 1, numbered('en'), generic('en'))).toBe('Position 2');
  });
});

describe('a verdict in the reader’s language (F12)', () => {
  it('reads the Wish’s result through the corpus, whichever spread the verdict came from', () => {
    const wish = getCartoSpread('carto-wish')!;
    const table = ['ace-of-clubs', 'two-of-clubs', 'three-of-diamonds', 'four-of-clubs', 'nine-of-hearts', 'six-of-diamonds', 'seven-of-clubs', 'eight-of-diamonds', 'ten-of-hearts'].map(card);
    const english = cartoVerdict(wish, table)!;
    expect(english.outcome.label).toBe('Favored');
    for (const lng of LOCALES) {
      const local = localizeCartoSpread(wish, lng);
      const expected = read(lng, 'cartomancy').spreads['carto-wish'].verdictLabels.favored;
      expect(verdictLabel(local, english, lng), lng).toBe(expected);
      expect(verdictLabel(local, cartoVerdict(local, table)!, lng), lng).toBe(expected);
    }
    expect(verdictLabel(wish, english, 'en')).toBe('Favored');
    const yesNo = getCartoSpread('carto-yes-no')!;
    const lean = cartoVerdict(yesNo, ['ace-of-hearts', 'two-of-diamonds', 'three-of-clubs'].map(card))!;
    expect(verdictLabel(yesNo, lean, 'ja')).toBe(read('ja', 'cartomancy').spreads['carto-yes-no'].verdictLabels['leaning-yes']);
  });
});

describe('a run-in head, punctuated as the locale sets it (F86)', () => {
  it('is "Head. Body" in English and a full-width colon in Japanese and Chinese', () => {
    expect(runInParts(i18n.getFixedT('en', 'app'))).toEqual({ before: '', between: '. ', after: '' });
    expect(runInParts(i18n.getFixedT('ja', 'app'))).toEqual({ before: '', between: '：', after: '' });
    expect(runInParts(i18n.getFixedT('ko', 'app'))).toEqual({ before: '', between: ': ', after: '' });
    expect(runInParts(i18n.getFixedT('zh', 'app'))).toEqual({ before: '', between: '：', after: '' });
    for (const lng of LOCALES) expect(runInParts(i18n.getFixedT(lng, 'app')).between, lng).not.toMatch(/^\.\s/);
  });
});

describe('the AI request carries the table-wide findings (O#60)', () => {
  /** Tables whose suit or colour majority is on screen but not in the six lines sent. */
  function missed(order: (hits: ReturnType<typeof cartoCombinations>) => ReturnType<typeof cartoCombinations>, slug: string, tables: number) {
    const spread = getCartoSpread(slug)!;
    const random = rng(slug.length * 977 + 13);
    let misses = 0;
    let majorities = 0;
    for (let k = 0; k < tables; k++) {
      const hits = cartoCombinations(spread, deal(random, spread.cardCount));
      const shown = hits.filter((h) => h.kind === 'majority');
      if (shown.length === 0) continue;
      majorities++;
      const sent = combinationHitsToLines(order(hits));
      if (shown.some((h) => !sent.some((line) => line.startsWith(h.label)))) misses++;
    }
    return { misses, majorities };
  }

  it('sends every majority the reader sees, on 2,000 tables of every spread', () => {
    for (const spread of CARTO_SPREADS) {
      const { misses, majorities } = missed(cartoCombinationsForAI, spread.slug, 2000);
      expect(misses, `${spread.slug} (${majorities} tables with a majority)`).toBe(0);
    }
    // the reader's order alone dropped them on every Romany table
    const before = missed((hits) => hits, 'carto-romany', 200);
    expect(before.majorities).toBeGreaterThan(0);
    expect(before.misses).toBe(before.majorities);
  });

  it('moves the majorities first and leaves the rest, and the reader’s list, in the reader’s order', () => {
    const spread = getCartoSpread('carto-romany')!;
    const hits = cartoCombinations(spread, deal(rng(5), 21));
    const copy = [...hits];
    const ordered = cartoCombinationsForAI(hits);
    expect(hits).toEqual(copy);
    expect(ordered).toHaveLength(hits.length);
    const majorities = hits.filter((h) => h.kind === 'majority');
    expect(ordered.slice(0, majorities.length)).toEqual(majorities);
    expect(ordered.slice(majorities.length)).toEqual(hits.filter((h) => h.kind !== 'majority'));
  });
});
