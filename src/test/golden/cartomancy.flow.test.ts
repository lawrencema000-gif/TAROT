import { describe, it, expect } from 'vitest';
import {
  cartoAchievementEvents,
  cartoCardOfTheDay,
  cartoDeckIds,
  cartoPositionLabel,
  cartoPositionsForAI,
  cartoSpreadFeature,
  cartoSpreadOrDefault,
  cartoSummary,
  cartoVerdict,
  combinationLines,
  dealCards,
  DEFAULT_CARTO_SETTINGS,
  firstParagraph,
  firstSentences,
  loadCartoSettings,
  loadLessonsDone,
  REVERSED_CHANCE,
  saveCartoSettings,
  setLessonDone,
  shuffleIds,
  splitAiReading,
  toSavedCards,
  verdictLine,
  verdictTone,
} from '../../components/cartomancy/cartoFlow';
import { tileFor } from '../../components/cartomancy/CartomancyLayout';
import { decodeReading, encodeReading, sharedDeck } from '../../services/shareableReadings';
import { CARTO_SPREADS, getCartoSpread, getPlayingCardBySlug, PLAYING_DECK, PLAYING_CARDS_ALL, RED_JOKER_ID, WISH_CARD_ID } from '../../data/cartomancy';
import type { PlayingCard } from '../../types/cartomancy';
import type { CombinationHit } from '../../data/cartomancy';

/**
 * The reading flow's decisions, held: how the deck is composed from the
 * settings, when a card may land reversed, what each position is called,
 * which gate a spread sits behind, what the verdict pill and the AI line
 * say, which badges a finished table reports, and what a share token
 * carries for the playing deck.
 */

const c = (slug: string): PlayingCard => {
  const card = getPlayingCardBySlug(slug);
  if (!card) throw new Error(`no card ${slug}`);
  return card;
};
const cards = (...slugs: string[]) => slugs.map(c);
const spread = (slug: string) => {
  const s = getCartoSpread(slug);
  if (!s) throw new Error(`no spread ${slug}`);
  return s;
};

describe('deck composition', () => {
  it('shuffles 52 cards by default and 54 with the Jokers', () => {
    expect(cartoDeckIds({ jokers: false, significator: null })).toHaveLength(52);
    expect(cartoDeckIds({ jokers: true, significator: null })).toHaveLength(54);
    expect(cartoDeckIds({ jokers: false, significator: null })).not.toContain(RED_JOKER_ID);
    expect(cartoDeckIds({ jokers: true, significator: null })).toContain(RED_JOKER_ID);
  });

  it('sets the significator aside: it is never in the deck that is drawn from', () => {
    const ids = cartoDeckIds({ jokers: false, significator: 'king-of-hearts' });
    expect(ids).toHaveLength(51);
    expect(ids).not.toContain(c('king-of-hearts').id);
  });

  it('shuffles every id exactly once', () => {
    const ids = cartoDeckIds({ jokers: true, significator: null });
    let n = 0;
    const rng = () => ((n += 0.37) % 1);
    const shuffled = shuffleIds(ids, rng);
    expect([...shuffled].sort((a, b) => a - b)).toEqual([...ids].sort((a, b) => a - b));
    expect(shuffled).not.toEqual(ids);
  });
});

describe('reversals', () => {
  const three = cards('ace-of-hearts', 'two-of-clubs', 'nine-of-spades');

  it('are never dealt while the setting is off, whatever the dice say', () => {
    const dealt = dealCards(three, false, () => 0);
    expect(dealt.every((d) => !d.reversed)).toBe(true);
    expect(dealt.every((d) => !d.revealed)).toBe(true);
  });

  it(`land at the ${REVERSED_CHANCE} chance when the setting is on`, () => {
    const rolls = [0.1, 0.9, 0.34];
    let i = 0;
    const dealt = dealCards(three, true, () => rolls[i++]);
    expect(dealt.map((d) => d.reversed)).toEqual([true, false, true]);
  });
});

describe('positions and tiles', () => {
  it('names a position from the spread and numbers the overflow', () => {
    const s = spread('carto-three-timeline');
    expect(cartoPositionLabel(s, 0, (n) => `Position ${n}`)).toBe('What you carry from the past');
    expect(cartoPositionLabel(s, 7, (n) => `Position ${n}`)).toBe('Position 8');
    expect(cartoPositionLabel(null, 0, (n) => `Position ${n}`)).toBe('Position 1');
  });

  it('caps the labels sent to the AI at 21 of 40 characters', () => {
    const labels = Array.from({ length: 30 }, (_, i) => `${'x'.repeat(60)}${i}`);
    const out = cartoPositionsForAI(labels);
    expect(out).toHaveLength(21);
    expect(out.every((l) => l.length <= 40)).toBe(true);
  });

  it('lays Yes or No at md for three cards and at sm for the five-card variant', () => {
    const s = spread('carto-yes-no');
    expect(tileFor(s, 3)).toBe('md');
    expect(tileFor(s, 5)).toBe('sm');
    expect(tileFor(spread('carto-romany'), 21)).toBe('xs');
    expect(tileFor(spread('carto-horseshoe'), 7)).toBe('sm');
    expect(tileFor(spread('carto-single'), 1)).toBe('hero');
  });

  it('falls back to the one-card reading for an unknown slug', () => {
    expect(cartoSpreadOrDefault('carto-wish').slug).toBe('carto-wish');
    expect(cartoSpreadOrDefault('celtic-cross').slug).toBe('carto-single');
    expect(cartoSpreadOrDefault(null).slug).toBe('carto-single');
  });
});

describe('gating', () => {
  it('leaves the free spreads open and puts the big ones behind deep_interpretations', () => {
    const free = CARTO_SPREADS.filter((s) => s.free).map((s) => s.slug).sort();
    expect(free).toEqual(['carto-single', 'carto-three-action', 'carto-three-timeline', 'carto-yes-no']);
    for (const s of CARTO_SPREADS) {
      expect(cartoSpreadFeature(s)).toBe(s.free ? null : 'deep_interpretations');
    }
  });
});

describe('verdicts', () => {
  it('reads Yes or No from the colours and says so for the AI', () => {
    const v = cartoVerdict(spread('carto-yes-no'), cards('ace-of-hearts', 'two-of-diamonds', 'three-of-clubs'));
    expect(v?.kind).toBe('yes-no');
    if (v?.kind !== 'yes-no') throw new Error('expected yes-no');
    expect(v.outcome.result).toBe('leaning-yes');
    expect(verdictTone(v)).toBe('between');
    expect(verdictLine(v)).toBe('Leaning yes (2 of 3 red)');
  });

  it('adds the court qualifier to the AI line', () => {
    const v = cartoVerdict(spread('carto-yes-no'), cards('king-of-hearts', 'two-of-diamonds', 'three-of-hearts'));
    expect(verdictLine(v)).toContain('depends on a person or on time');
  });

  it('reads the Wish and tones it', () => {
    const table = cards('ace-of-clubs', 'two-of-clubs', 'three-of-clubs', 'four-of-clubs', 'nine-of-hearts', 'six-of-clubs', 'seven-of-clubs', 'eight-of-clubs', 'ten-of-clubs');
    const v = cartoVerdict(spread('carto-wish'), table);
    if (v?.kind !== 'wish') throw new Error('expected wish');
    expect(v.outcome.result).toBe('favored');
    expect(verdictTone(v)).toBe('yes');
    expect(verdictLine(v)).toBe('Favored');
  });

  it('has no verdict for a spread without rules, or an empty table', () => {
    expect(cartoVerdict(spread('carto-single'), cards('ace-of-hearts'))).toBeNull();
    expect(cartoVerdict(spread('carto-wish'), [])).toBeNull();
    expect(verdictLine(null)).toBeUndefined();
  });
});

describe('the summary', () => {
  it('takes the first paragraph of an AI reading, without markdown marks', () => {
    expect(firstParagraph('**Past: Ace**\nA start.\n\nMore.')).toBe('Past: Ace\nA start.');
    expect(firstParagraph('\n\n  lead  \n\nrest')).toBe('lead');
  });

  it('falls back to two sentences of the reading method', () => {
    const s = spread('carto-single');
    expect(firstSentences('One. Two. Three.', 2)).toBe('One. Two.');
    expect(cartoSummary(null, s)).toBe(firstSentences(s.readingMethod, 2));
    expect(cartoSummary('AI first.\n\nAI second.', s)).toBe('AI first.');
  });
});

describe('achievements', () => {
  it('reports the reading and the spread, and the special cards when drawn', () => {
    const events = cartoAchievementEvents('carto-single', cards('ace-of-hearts'));
    expect(events).toEqual([
      { activityType: 'cartomancy_reading_complete' },
      { activityType: 'cartomancy_spread_types_used', value: 'carto-single' },
    ]);
    const special = cartoAchievementEvents('carto-romany', [c('nine-of-hearts'), c('red-joker')]);
    expect(special.map((e) => e.activityType)).toEqual([
      'cartomancy_reading_complete',
      'cartomancy_spread_types_used',
      'cartomancy_wish_card_drawn',
      'cartomancy_joker_drawn',
      'cartomancy_romany_complete',
    ]);
    expect(c('nine-of-hearts').id).toBe(WISH_CARD_ID);
  });
});

describe('card of the day and saved rows', () => {
  it('draws the same card for the same reader and day, from the 52', () => {
    const a = cartoCardOfTheDay('user-1', '2026-10-02');
    const b = cartoCardOfTheDay('user-1', '2026-10-02');
    expect(a.card.id).toBe(b.card.id);
    expect(PLAYING_DECK.some((card) => card.id === a.card.id)).toBe(true);
    expect(cartoCardOfTheDay('user-2', '2026-10-02').card.id === a.card.id && cartoCardOfTheDay('user-1', '2026-10-03').card.id === a.card.id).toBe(false);
  });

  it('marks saved cards as the playing deck', () => {
    const dealt = dealCards(cards('ace-of-hearts', 'king-of-spades'), false);
    const rows = toSavedCards(dealt, (i) => `P${i + 1}`);
    expect(rows).toEqual([
      { cardId: 100, cardName: 'Ace of Hearts', reversed: false, position: 'P1', deck: 'playing' },
      { cardId: 151, cardName: 'King of Spades', reversed: false, position: 'P2', deck: 'playing' },
    ]);
  });
});

describe('per-viewer storage', () => {
  const stub = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
  };

  it('round-trips the settings and tolerates garbage', () => {
    const store = stub();
    expect(loadCartoSettings(store)).toEqual(DEFAULT_CARTO_SETTINGS);
    saveCartoSettings({ jokers: true, reversals: true, significator: 'queen-of-hearts' }, store);
    expect(loadCartoSettings(store)).toEqual({ jokers: true, reversals: true, significator: 'queen-of-hearts' });
    store.setItem('arcana_carto_settings', '{not json');
    expect(loadCartoSettings(store)).toEqual(DEFAULT_CARTO_SETTINGS);
    expect(loadCartoSettings(null)).toEqual(DEFAULT_CARTO_SETTINGS);
  });

  it('ticks and unticks lessons', () => {
    const store = stub();
    expect(loadLessonsDone(store).size).toBe(0);
    setLessonDone('the-four-suits', true, store);
    expect(loadLessonsDone(store).has('the-four-suits')).toBe(true);
    setLessonDone('the-four-suits', false, store);
    expect(loadLessonsDone(store).has('the-four-suits')).toBe(false);
  });
});

describe('share tokens', () => {
  it('encodes the playing deck as v2 with k: p and decodes v1 and v2', () => {
    const token = encodeReading({ spreadSlug: 'carto-wish', cards: [{ id: 108, reversed: false }], kind: 'playing', question: 'I wish' });
    const decoded = decodeReading(token);
    expect(decoded).toMatchObject({ v: 2, s: 'carto-wish', k: 'p', q: 'I wish', c: [[108, 0]] });
    expect(sharedDeck(decoded!)).toBe('playing');

    const tarot = decodeReading(encodeReading({ spreadSlug: 'three-card', cards: [{ id: 0, reversed: true }] }));
    expect(tarot?.k).toBeUndefined();
    expect(sharedDeck(tarot!)).toBe('tarot');

    const v1 = window.btoa(JSON.stringify({ v: 1, s: 'carto-single', c: [[100, 0]] })).replace(/=+$/, '');
    const old = decodeReading(v1);
    expect(old?.v).toBe(1);
    expect(sharedDeck(old!)).toBe('playing');
    expect(decodeReading(window.btoa(JSON.stringify({ v: 3, s: 'x', c: [] })))).toBeNull();
  });

  it('every playing-card id a token can carry resolves to a card', () => {
    expect(PLAYING_CARDS_ALL.every((card) => card.id >= 100 && card.id <= 153)).toBe(true);
  });
});

describe('the combination list', () => {
  const card = (slug: string) => getPlayingCardBySlug(slug)!;
  const ace = card('ace-of-spades');
  const others = [card('eight-of-spades'), card('seven-of-diamonds'), card('two-of-diamonds')];
  const touching: CombinationHit[] = others.map((o) => ({
    kind: 'neighbor',
    id: 'ace-of-spades-touching',
    cardIds: [ace.id, o.id],
    meaning: 'That card’s matter is ending.',
    label: `${ace.name} touching the ${o.name}`,
  }));
  const pair: CombinationHit = { kind: 'same-rank', id: 'same-rank:7:2', cardIds: [others[1].id, card('seven-of-hearts').id], meaning: 'A disagreement.', label: 'Two Sevens' };
  const nameOf = (id: number) => PLAYING_CARDS_ALL.find((c) => c.id === id)!.name;
  const own = (hit: CombinationHit) => ({ label: hit.label, meaning: hit.meaning });

  it('folds one rule firing for one card against several into a single line', () => {
    const lines = combinationLines([pair, ...touching], own, nameOf, 'en');
    expect(lines).toHaveLength(2);
    expect(lines[0].label).toBe('Two Sevens');
    expect(lines[1].label).toBe('Ace of Spades touching the Eight of Spades, the Seven of Diamonds and the Two of Diamonds');
    expect(lines[1].meaning).toBe('That card’s matter is ending.');
    expect(new Set(lines.map((l) => l.key)).size).toBe(lines.length);
  });

  it('reads one rule once when it fires for several anchors', () => {
    const queen = card('queen-of-spades');
    const softens = (anchor: PlayingCard): CombinationHit => ({ kind: 'neighbor', id: 'heart-softens-spade', cardIds: [anchor.id, queen.id], meaning: 'Softened by care.', label: `${anchor.name} beside the ${queen.name}` });
    const lines = combinationLines([softens(card('eight-of-hearts')), pair, softens(card('nine-of-hearts'))], own, nameOf, 'en');
    expect(lines.map((l) => l.label)).toEqual(['Eight of Hearts beside the Queen of Spades; Nine of Hearts beside the Queen of Spades', 'Two Sevens']);
  });

  it('leaves a single hit alone and joins translated names with a dot', () => {
    expect(combinationLines([touching[0]], own, nameOf, 'en')[0].label).toBe('Ace of Spades touching the Eight of Spades');
    const ja = combinationLines(touching, (hit) => ({ label: hit.cardIds.map(nameOf).join(' · '), meaning: 'JA' }), nameOf, 'ja');
    expect(ja).toHaveLength(1);
    expect(ja[0].label).toBe('Ace of Spades · Eight of Spades · Seven of Diamonds · Two of Diamonds');
  });
});

describe('the AI reading, as the result prints it', () => {
  const ai = [
    '1) Overview',
    'You are dealing with progress that feels heavier than it should.',
    '',
    '2) The situation — Seven of Clubs',
    'You have been working hard.',
    '',
    '**Practical actions**',
    '- Build a one-pager.',
    '- Choose timing.',
    '',
    'Closing',
    'Yes, raise it.',
  ].join('\n');

  it('takes the overview body as the summary, without its heading', () => {
    const { lede, sections } = splitAiReading(ai);
    expect(lede).toBe('You are dealing with progress that feels heavier than it should.');
    expect(sections.map((s) => s.heading)).toEqual(['The situation — Seven of Clubs', 'Practical actions', 'Closing']);
    expect(sections[1].body).toBe('- Build a one-pager.\n- Choose timing.');
    expect(cartoSummary(ai, getCartoSpread('carto-three-action')!)).toBe(lede);
  });

  it('keeps a plain paragraph whole and never mistakes a sentence for a heading', () => {
    expect(splitAiReading('First paragraph.\n\nSecond one.')).toEqual({ lede: 'First paragraph.', sections: [{ body: 'Second one.' }] });
    const { lede } = splitAiReading('This is a sentence.\nAnd another.');
    expect(lede).toBe('This is a sentence.\nAnd another.');
    expect(splitAiReading('')).toEqual({ lede: '', sections: [] });
  });
});
