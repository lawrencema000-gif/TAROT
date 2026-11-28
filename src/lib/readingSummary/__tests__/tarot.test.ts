import { describe, it, expect, beforeAll } from 'vitest';
import { fullDeck } from '../../../data/tarotDeck';
import { getEnrichment } from '../../../data/tarotEnrichment';
import { setSummaryDeck } from '../loadPhrases';
import { PHRASES_EN, type PhraseKey } from '../phrases.en';
import {
  courtIndexes,
  dignities,
  dignityOf,
  elementRun,
  leadingSuit,
  missingSuits,
  ownNotes,
  repeatedNumbers,
  tarotFacts,
  type TarotFacts,
} from '../tarot';

beforeAll(() => setSummaryDeck(fullDeck));

const facts = (cards: Array<[number, boolean]>): TarotFacts[] => cards.map(([id, r]) => tarotFacts(id, r, 'en')!);

/** F1: the Two of Cups, Five of Wands, The Moon, Three of Swords (r), The Star, Six of Cups, Knight of Wands (r), Queen of Cups, Five of Cups, Ten of Cups. */
let F1: TarotFacts[] = [];
const F1_CARDS: Array<[number, boolean]> = [
  [37, false], [26, false], [18, false], [52, true], [17, false], [41, false], [33, true], [48, false], [40, false], [45, false],
];
beforeAll(() => {
  F1 = facts(F1_CARDS);
});

describe('elemental dignities', () => {
  it('opposes Water and Fire, Air and Earth; strengthens one element; leaves Spirit silent', () => {
    expect(dignityOf('Water', 'Fire')).toBe('opposed');
    expect(dignityOf('Earth', 'Air')).toBe('opposed');
    expect(dignityOf('Water', 'Water')).toBe('same');
    expect(dignityOf('Fire', 'Air')).toBeNull();
    expect(dignityOf('Spirit', 'Spirit')).toBeNull();
    expect(dignityOf('Spirit', 'Fire')).toBeNull();
  });

  it('puts opposed pairs first, then same, three at most', () => {
    const pairs: Array<[number, number]> = [[0, 1], [0, 4], [5, 9], [6, 9], [8, 9]];
    expect(dignities(F1, pairs)).toEqual([
      { i: 0, j: 1, kind: 'opposed' },
      { i: 6, j: 9, kind: 'opposed' },
      { i: 5, j: 9, kind: 'same' },
    ]);
  });

  it('does not change a card’s element with its orientation', () => {
    expect(tarotFacts(33, true, 'en')!.elementKey).toBe(tarotFacts(33, false, 'en')!.elementKey);
  });
});

describe('the cards’ own notes', () => {
  it('reads reinforcing and opposing pairs among upright cards only', () => {
    const notes = ownNotes(F1);
    expect(notes.reinforcing).toEqual({ owner: 0, other: 9 });
    expect(notes.opposing).toEqual({ owner: 0, other: 8 });
    // The Two of Cups reversed: its notes no longer count, and nobody else's name it.
    const rev = facts([[37, true], [45, false], [40, false]]);
    expect(ownNotes(rev).reinforcing?.owner).not.toBe(0);
    for (const hit of [ownNotes(rev).reinforcing, ownNotes(rev).opposing]) {
      if (hit) {
        expect(rev[hit.owner].reversed).toBe(false);
        expect(rev[hit.other].reversed).toBe(false);
      }
    }
  });
});

describe('numbers and courts (F1)', () => {
  it('finds the two Fives and the two court cards', () => {
    expect(repeatedNumbers(F1)).toEqual([{ number: 5, indexes: [1, 8] }]);
    expect(courtIndexes(F1)).toEqual([6, 7]);
  });

  it('finds the leading suit, the element run and the missing suit', () => {
    expect(leadingSuit(F1)).toEqual({ suit: 'cups', count: 5 });
    expect(elementRun(F1)).toEqual({ element: 'Water', count: 6, majors: [2] });
    expect(missingSuits(F1)).toEqual(['pentacles']);
  });
});

/*
 * NF-D4: each number theme summarizes the number lines of that rank's four
 * `numerology` texts. Each theme's key word (a stem) appears in at least one
 * of them; where the theme says it in other words, the numerology's own word
 * is named beside it.
 */
const KEY_WORDS: Record<number, { theme: string; numerology: string }> = {
  1: { theme: 'seed', numerology: 'seed' },
  2: { theme: 'choice', numerology: 'choice' },
  3: { theme: 'others joining', numerology: 'communal' },
  4: { theme: 'stabil', numerology: 'stable' },
  5: { theme: 'friction', numerology: 'friction' },
  6: { theme: 'balance', numerology: 'balance' },
  7: { theme: 'patience', numerology: 'patient' },
  8: { theme: 'movement', numerology: 'movement' },
  9: { theme: 'nearly complete', numerology: 'peak' },
  10: { theme: 'complet', numerology: 'complet' },
  11: { theme: 'first steps', numerology: 'first' },
  12: { theme: 'movement', numerology: 'move' },
  13: { theme: 'held within', numerology: 'deep core' },
  14: { theme: 'mastery', numerology: 'master' },
};

describe('number themes (NF-D4)', () => {
  it('take each theme’s key word from that rank’s own numerology', () => {
    for (let n = 1; n <= 14; n++) {
      const theme = PHRASES_EN[`theme.${n}` as PhraseKey];
      expect(theme.toLowerCase(), `theme.${n}`).toContain(KEY_WORDS[n].theme);
      const texts = fullDeck.filter((c) => c.arcana === 'minor' && c.number === n).map((c) => getEnrichment(c.name)!.numerology.toLowerCase());
      expect(texts.length, `rank ${n}`).toBe(4);
      expect(texts.some((t) => t.includes(KEY_WORDS[n].numerology)), `rank ${n}: ${KEY_WORDS[n].numerology}`).toBe(true);
    }
  });
});
