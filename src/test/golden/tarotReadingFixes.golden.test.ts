import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  firstSentences,
  focusMeaningFor,
  focusSections,
  joinSentences,
  leadMeaningFor,
  splitLede,
  synthesisFor,
  uprightFocusFor,
  affirmationFor,
} from '../../components/readings/tarot/readingText';
import {
  canonicalCardName,
  cardIdFromName,
  cardIdFromSlug,
  cardMeaningPath,
  cardMeaningSlug,
} from '../../components/readings/tarot/cardSlug';
import { tarotPositionLabel, tarotSpreadTitle } from '../../components/readings/tarot/spreadLabels';
import { rememberPendingSpread, takePendingSpread } from '../../components/readings/tarot/pendingSpread';
import { combinationHitsToLines, MAX_AI_TAROT_CARDS } from '../../services/readingInterpretation';
import { fullDeck } from '../../data/tarotDeck';
import { majorEnrichment, minorEnrichment } from '../../data/tarotEnrichment';
import { allSpreads } from '../../data/tarotSpreads';
import { getPlayingCardBySlug } from '../../data/cartomancy/deck';
import { findCombinations } from '../../data/cartomancy/combinations';
import { getCartoSpread } from '../../data/cartomancy';
import i18n from '../../i18n/config';
import type { TarotCard } from '../../types';

/*
 * Phase 7 fix round, FX3: the tarot reading's correctness rules.
 *
 *  - A reversed card is never read with its upright love / career text
 *    (#16, #43). Production texts come in three shapes: labelled
 *    (UPRIGHT/REVERSED LOVE MEANING), upright-then-"When … reversed" with
 *    no label (45 + 45), and upright only (20 + 20, and every ja/ko/zh one).
 *  - Japanese and Chinese sentences run on without ASCII spaces (#152).
 *  - The AI summary drops the model's "Overview" heading (#132).
 *  - Card links and badges use the canonical English name / slug by id,
 *    never a localized display name (#19, #125, #129, #130).
 *  - Shared readings name legacy spreads and positions (#71, #126).
 *  - The AI receives folded combination lines (#60).
 */

const t = (key: string, opts?: Record<string, unknown>) => i18n.t(key, { ns: 'app', ...opts }) as string;

function card(over: Partial<TarotCard>): TarotCard {
  return {
    id: 6,
    name: 'The Lovers',
    arcana: 'major',
    keywords: ['choice'],
    meaningUpright: 'The Lovers upright is union. Second upright.',
    meaningReversed: 'The Lovers reversed is disharmony. Second reversed.',
    description: '',
    imageUrl: '',
    ...over,
  } as TarotCard;
}

// Excerpts in the production shapes (tarot_cards.love_meaning).
const TURN_PARAGRAPH =
  'In matters of love and relationships, The Lovers upright brings one of the most significant messages. It speaks of union.\n\n' +
  'For singles, The Lovers brings a profound message about meaningful love.\n\n' +
  'When The Lovers appears reversed in love matters, it often indicates challenges that are preventing union.\n\n' +
  'The reversed Lovers in love frequently indicates relationship difficulties.';
const TURN_INLINE =
  'In matters of love and relationships, the Three of Swords speaks to heartbreak. Healing requires first accepting that you have been hurt. ' +
  'When reversed in love matters, the Three of Swords often indicates healing from romantic heartbreak. The acute pain is passing.';
const TURN_NAMED = 'The High Priestess upright asks for trust. Listen inward.\n\nThe High Priestess reversed in love matters often indicates ignoring your intuition.';
const UPRIGHT_ONLY = 'New romantic adventures await. Be open to unexpected connections.';
const LABELLED =
  'Intro sentence about the card.\n\nUPRIGHT LOVE MEANING: Upright love text.\n\nREVERSED LOVE MEANING: Reversed love text.';
const ARIA_JA = '新しい恋の冒険が待っています。予期せぬ出会いに心を開いて。';

describe('focus meanings are read the right way up (#16, #43)', () => {
  it('cuts an unlabelled text at the paragraph that turns to the reversed card', () => {
    const s = focusSections(TURN_PARAGRAPH);
    expect(s.upright).toMatch(/^In matters of love/);
    expect(s.upright).not.toMatch(/reversed/i);
    expect(s.reversed).toMatch(/^When The Lovers appears reversed/);
  });

  it('cuts at a sentence when the turn is inside a paragraph, or opens on the card name', () => {
    const inline = focusSections(TURN_INLINE);
    expect(inline.upright).toBe('In matters of love and relationships, the Three of Swords speaks to heartbreak. Healing requires first accepting that you have been hurt.');
    expect(inline.reversed).toMatch(/^When reversed in love matters/);
    expect(focusSections(TURN_NAMED).reversed).toMatch(/^The High Priestess reversed in love/);
  });

  it('keeps labelled texts on their labels and leaves an upright-only text whole', () => {
    expect(focusSections(LABELLED)).toEqual({ intro: 'Intro sentence about the card.', upright: 'Upright love text.', reversed: 'Reversed love text.' });
    expect(focusSections(UPRIGHT_ONLY)).toEqual({ intro: UPRIGHT_ONLY });
    // "upright or reversed" in passing is not a turn.
    expect(focusSections('A card of fathers. For some, this card—upright or reversed—matters.')).toEqual({
      intro: 'A card of fathers. For some, this card—upright or reversed—matters.',
    });
  });

  it('a reversed card leads with its reversed text — never the upright focus text', () => {
    const lovers = card({ loveMeaning: TURN_PARAGRAPH });
    expect(focusMeaningFor(lovers, 'Love', true)).toMatch(/^When The Lovers appears reversed/);
    expect(focusMeaningFor(lovers, 'Love', false)).toMatch(/^In matters of love/);

    const uprightOnly = card({ loveMeaning: UPRIGHT_ONLY, careerMeaning: ARIA_JA });
    expect(focusMeaningFor(uprightOnly, 'Love', true)).toBeUndefined();
    expect(leadMeaningFor(uprightOnly, true, 'Love')).toBe(uprightOnly.meaningReversed);
    expect(uprightFocusFor(uprightOnly, 'Love', true)).toBe(UPRIGHT_ONLY);
    expect(uprightFocusFor(uprightOnly, 'Love', false)).toBeUndefined();
    // Money reads the career text, and a ja upright-only text is upright-only.
    expect(leadMeaningFor(uprightOnly, true, 'Money')).toBe(uprightOnly.meaningReversed);
    expect(leadMeaningFor(uprightOnly, false, 'Money')).toBe(ARIA_JA);
  });

  it('the summary of a reversed Lovers in a Love reading never says "upright"', () => {
    const lovers = card({ loveMeaning: TURN_PARAGRAPH });
    const one = synthesisFor([{ card: lovers, reversed: true }], 'Love');
    expect(one).not.toMatch(/upright/i);
    expect(one).toMatch(/reversed/);
    const three = synthesisFor(
      [
        { card: card({ id: 1, name: 'The Magician', loveMeaning: UPRIGHT_ONLY, meaningReversed: 'Trickery. More.' }), reversed: true },
        { card: lovers, reversed: true },
        { card: card({ id: 2, name: 'The High Priestess', loveMeaning: TURN_NAMED }), reversed: false },
      ],
      'Love',
    );
    expect(three).toBe(
      'The Magician: Trickery. When The Lovers appears reversed in love matters, it often indicates challenges that are preventing union. The High Priestess upright asks for trust.',
    );
  });
});

describe('CJK prose (#152)', () => {
  it('runs Japanese sentences on, keeps one space for Latin and Korean', () => {
    expect(joinSentences(['愛は続く。', '心を開いて。'])).toBe('愛は続く。心を開いて。');
    expect(joinSentences(['One.', 'Two.'])).toBe('One. Two.');
    expect(joinSentences(['사랑이 이어집니다.', '마음을 여세요.'])).toBe('사랑이 이어집니다. 마음을 여세요.');
    expect(firstSentences('一つ目。二つ目。三つ目。', 2)).toBe('一つ目。二つ目。');
  });

  it('leads a summary sentence with the locale’s own form', () => {
    const ja = [
      { card: card({ id: 9, name: 'カップの10', meaningUpright: '永続する愛。続き。' }), reversed: false },
      { card: card({ id: 10, name: 'ソードのペイジ', meaningUpright: '好奇心。続き。' }), reversed: false },
    ];
    expect(synthesisFor(ja, null, (name, s) => `${name}：${s}`)).toBe('カップの10：永続する愛。ソードのペイジ：好奇心。');
  });
});

describe('the AI summary drops the heading (#132)', () => {
  it('on its own line above the paragraph, as a block of its own, or numbered', () => {
    expect(splitLede('Overview\nTemperance upright asks you to find your steady center.\n\nThe cards.').lede).toBe(
      'Temperance upright asks you to find your steady center.',
    );
    expect(splitLede('## Overview\n\nThe reading opens.\n\nRest.')).toEqual({ lede: 'The reading opens.', rest: 'Rest.' });
    expect(splitLede('1) A short overview\n**The reading** opens here.').lede).toBe('The reading opens here.');
    expect(splitLede('No heading here. Just a paragraph.\n\nSecond.')).toEqual({ lede: 'No heading here. Just a paragraph.', rest: 'Second.' });
  });
});

describe('cards are linked and reported by id (#19, #125, #129, #130)', () => {
  it('every card’s slug is its card-table name’s, as the sitemap spells it', () => {
    for (const c of fullDeck) {
      const slug = c.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      expect(cardMeaningSlug(c.id), c.name).toBe(slug);
      expect(canonicalCardName(c.id)).toBe(c.name);
      expect(cardIdFromSlug(slug)).toBe(c.id);
    }
    expect(cardMeaningPath(10)).toBe('/tarot-meanings/the-wheel-of-fortune');
  });

  it('the old spellings still find their card', () => {
    expect(cardIdFromSlug('wheel-of-fortune')).toBe(10);
    expect(cardIdFromName('Wheel of Fortune')).toBe(10);
    expect(cardIdFromName('Judgment')).toBe(20);
  });

  it('every card the enrichment names resolves to an id', () => {
    const all = [...Object.values(majorEnrichment), ...Object.values(minorEnrichment)];
    for (const e of all) {
      for (const n of [...e.reinforcingCards, ...e.opposingCards]) expect(cardIdFromName(n), n).toBeDefined();
    }
  });

  it('the badge names are the seed’s names', () => {
    expect([canonicalCardName(0), canonicalCardName(7), canonicalCardName(16)]).toEqual(['The Fool', 'The Chariot', 'The Tower']);
  });

  it('every card has an affirmation, read by id', () => {
    for (const c of fullDeck) expect(affirmationFor(c.id, null, 'en'), c.name).toBeTruthy();
    expect(affirmationFor(0, { '0': { affirmation: '準備ができる前に踏み出す。' } }, 'ja')).toBe('準備ができる前に踏み出す。');
    // No English line under a Japanese reading: nothing until the overlay has it.
    expect(affirmationFor(0, {}, 'ja')).toBeUndefined();
    expect(affirmationFor(0, null, 'ja')).toBeUndefined();
    expect(affirmationFor(0, null, 'en')).toBe('I step forward before I feel ready.');
  });
});

describe('spreads are named by their stable id (#71, #126)', () => {
  it('legacy ids get their own positions, the daily draw its title', () => {
    expect(['three-card', 'three-card-past-present-future'].map((s) => [0, 1, 2].map((i) => tarotPositionLabel(t, s, i)))).toEqual([
      ['Past', 'Present', 'Future'],
      ['Past', 'Present', 'Future'],
    ]);
    expect(tarotPositionLabel(t, 'single', 0)).toBe('Your card');
    expect(tarotPositionLabel(t, 'relationship', 1)).toBe('Them');
    expect(tarotSpreadTitle(t, 'single')).toBe('Daily draw');
    expect(tarotSpreadTitle(t, 'custom:1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed')).toBe('Custom spread');
  });

  it('every catalogue spread names every position', () => {
    for (const s of allSpreads) {
      for (let i = 0; i < s.cardCount; i++) {
        expect(tarotPositionLabel(t, s.slug, i), `${s.slug} ${i}`).not.toMatch(/^Position \d+$/);
      }
    }
  });
});

describe('the AI gets the folded combinations (#60)', () => {
  it('one line per neighbour rule, so the pairs and majorities still fit in six', () => {
    const slugs = [
      'nine-of-clubs', 'two-of-clubs', 'five-of-hearts',
      'ace-of-diamonds', 'ace-of-spades', 'jack-of-diamonds',
      'ace-of-hearts', 'four-of-clubs', 'seven-of-diamonds',
    ];
    const cards = slugs.map((s) => getPlayingCardBySlug(s)!);
    const spread = getCartoSpread('carto-wish') ?? getCartoSpread('carto-nine')!;
    const hits = findCombinations(cards, spread.layout, {});
    const raw = hits.slice(0, 6).map((h) => h.id);
    const lines = combinationHitsToLines(hits);
    expect(lines.length).toBeLessThanOrEqual(6);
    expect(lines).toMatchSnapshot();
    // Within the server's 200 characters, the meaning kept whole.
    for (const l of lines) {
      expect(l.length).toBeLessThanOrEqual(200);
      expect(l).toMatch(/ — \S/);
    }
    // No neighbour rule fills more than one line…
    const aceLines = lines.filter((l) => /Ace of Spades (touching|beside|next to|with)/i.test(l));
    expect(aceLines.length).toBeLessThanOrEqual(1);
    // …where the raw list repeated it.
    expect(new Set(raw).size).toBeLessThan(raw.length);
  });

  it('the reading flow’s card limit is the server’s', () => {
    expect(MAX_AI_TAROT_CARDS).toBe(10);
  });
});

describe('a spread chosen before signing up survives it (#134)', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    });
  });
  it('is taken once, and expires after a day', () => {
    rememberPendingSpread('horseshoe');
    expect(takePendingSpread()).toBe('horseshoe');
    expect(takePendingSpread()).toBeNull();
    rememberPendingSpread('horseshoe');
    expect(takePendingSpread(Date.now() + 25 * 60 * 60 * 1000)).toBeNull();
  });
});
