import { describe, expect, it } from 'vitest';
import {
  meaningSections,
  orientedMeaning,
  sentencesOf,
  summarySentencesFrom,
  synthesisFor,
} from '../../components/readings/tarot/readingText';
import type { TarotCard } from '../../types';

/*
 * The reading result's text rules (Phase 7, B1a): the summary and the card
 * sections never print the same sentence twice, and a love / career meaning
 * written with both orientations in one string is cut at its labels.
 */

const LABELLED =
  'Intro sentence about the card.\n\nUPRIGHT LOVE MEANING: Upright love text. More upright.\n\nREVERSED LOVE MEANING: Reversed love text.';

function card(over: Partial<TarotCard>): TarotCard {
  return {
    id: 1,
    name: 'The Magician',
    arcana: 'major',
    keywords: ['will'],
    meaningUpright: 'The Magician is skill. Second upright sentence. Third upright sentence. Fourth.',
    meaningReversed: 'Reversed one. Reversed two.',
    description: '',
    imageUrl: '',
    ...over,
  } as TarotCard;
}

describe('focus meanings with both orientations in one string', () => {
  it('keeps the introduction and the part for the orientation, labels removed', () => {
    expect(orientedMeaning(LABELLED, false)).toBe('Intro sentence about the card.\n\nUpright love text. More upright.');
    expect(orientedMeaning(LABELLED, true)).toBe('Intro sentence about the card.\n\nReversed love text.');
  });

  it('leaves unlabelled text alone', () => {
    expect(orientedMeaning('Plain text. Two.', true)).toBe('Plain text. Two.');
  });

  it('cuts the sections for the card page', () => {
    expect(meaningSections(LABELLED)).toEqual({
      intro: 'Intro sentence about the card.',
      upright: 'Upright love text. More upright.',
      reversed: 'Reversed love text.',
    });
    expect(meaningSections('Only text.')).toEqual({ intro: 'Only text.' });
  });
});

describe('summary and sections do not repeat each other', () => {
  it('a lone card: the summary quotes two sentences and the section starts at the third', () => {
    const one = [{ card: card({}), reversed: false }];
    const summary = synthesisFor(one, null);
    const taken = summarySentencesFrom(0, 1);
    const section = sentencesOf(one[0].card.meaningUpright).slice(taken, taken + 2).join(' ');
    expect(summary).toBe('The Magician is skill. Second upright sentence.');
    expect(section).toBe('Third upright sentence. Fourth.');
  });

  it('a spread: one sentence per card for the first three, the name only when the sentence lacks it', () => {
    const three = [
      { card: card({}), reversed: false },
      { card: card({ id: 2, name: 'The High Priestess' }), reversed: true },
      { card: card({ id: 3, name: 'The Empress' }), reversed: false },
      { card: card({ id: 4, name: 'The Emperor' }), reversed: false },
    ];
    expect(synthesisFor(three, null)).toBe(
      'The Magician is skill. The High Priestess: Reversed one. The Empress: The Magician is skill.',
    );
    expect([0, 1, 2, 3].map((i) => summarySentencesFrom(i, 4))).toEqual([1, 1, 1, 0]);
  });
});
