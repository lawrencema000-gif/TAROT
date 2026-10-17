import { describe, it, expect } from 'vitest';
import { aggregateMirror, computeStreak, type MirrorReadingRow } from './mirror';
import { fullDeck } from '../data/tarotDeck';

// The shapes tarot_readings.cards actually holds (P7 #46): TarotSection saves
// { cardId, cardName, position, reversed }; cartomancy adds deck: 'playing'.
const tarotRow = (date: string, cards: Array<[number, string, boolean]>): MirrorReadingRow => ({
  date,
  spread_type: 'three-card',
  cards: cards.map(([cardId, cardName, reversed], i) => ({ cardId, cardName, reversed, position: `P${i}` })),
});

describe('aggregateMirror', () => {
  it('counts the cards current saved rows carry (cardName), not zero', () => {
    const s = aggregateMirror([
      tarotRow('2026-10-02', [[17, 'The Star', true], [37, 'Three of Cups', false], [36, 'Two of Cups', false]]),
      tarotRow('2026-10-01', [[17, 'The Star', false], [64, 'Seven of Swords', true]]),
    ], undefined, new Date(2026, 9, 2));
    expect(s.totalReadings).toBe(2);
    expect(s.totalCardsDrawn).toBe(5);
    expect(s.reversalPercent).toBe(40);
    expect(s.mostDrawnCard).toEqual({ name: 'The Star', count: 2 });
    expect(s.topCards.length).toBeGreaterThan(1);
    expect(s.suitBreakdown).toEqual({ Wands: 0, Cups: 2, Swords: 1, Pentacles: 0 });
    expect(s.mostDrawnSuit).toEqual({ suit: 'Cups', count: 2 });
    expect(s.arcanaBreakdown).toEqual({ major: 2, minor: 3 });
    expect(s.streakDays).toBe(2);
  });

  it('never counts playing cards as tarot (by spread type or deck tag)', () => {
    const s = aggregateMirror([
      { date: '2026-10-02', spread_type: 'carto-three-timeline', cards: [{ cardId: 8, cardName: 'Nine of Hearts', reversed: false }] },
      { date: '2026-10-02', spread_type: 'single', cards: [{ cardId: 8, cardName: 'Nine of Hearts', reversed: false, deck: 'playing' }] },
      tarotRow('2026-10-02', [[0, 'The Fool', false]]),
    ]);
    expect(s.totalReadings).toBe(1);
    expect(s.totalCardsDrawn).toBe(1);
    expect(s.arcanaBreakdown).toEqual({ major: 1, minor: 0 });
  });

  it('still reads the older shapes, and resolves id-only rows through the deck index', () => {
    const s = aggregateMirror(
      [{ date: '2026-09-30', cards: [{ name: 'Ace of Wands', reversed: true }, { card: { name: 'Knight of Wands' } }, { id: 1, reversed: false }] }],
      new Map([[1, 'The Magician']]),
    );
    expect(s.totalCardsDrawn).toBe(3);
    expect(s.suitBreakdown.Wands).toBe(2);
    expect(s.topCards.map((c) => c.name)).toContain('The Magician');
    expect(['ace', 'knight']).toContain(s.mostDrawnNumber?.value);
  });

  // Rows saved by the pre-Phase-7 client and the Android v1.2.0 app: the
  // card's id, and its name as the screen showed it (p8 F04, O#46).
  const deckNames = new Map(fullDeck.map((c) => [c.id, c.name]));
  const LEGACY: Record<'ja' | 'ko' | 'zh', Record<number, string>> = {
    ja: { 3: '女帝', 19: '太陽', 26: 'ワンドの5', 30: 'ワンドの9', 64: 'ペンタクルのエース', 77: 'ペンタクルのキング' },
    ko: { 3: '여황제', 19: '태양', 26: '완드 5', 30: '완드 9', 64: '펜타클 에이스', 77: '펜타클 왕' },
    zh: { 3: '女皇', 19: '太阳', 26: '权杖五', 30: '权杖九', 64: '星币一', 77: '星币国王' },
  };

  it.each(['ja', 'ko', 'zh'] as const)('reads a %s row saved with localized names by its card ids', (lng) => {
    const names = LEGACY[lng];
    const s = aggregateMirror(
      [tarotRow('2026-04-20', [[26, names[26], false], [19, names[19], true], [77, names[77], false]])],
      deckNames,
      new Date(2026, 3, 20),
    );
    expect(s.totalCardsDrawn).toBe(3);
    expect(s.arcanaBreakdown).toEqual({ major: 1, minor: 2 });
    expect(s.suitBreakdown).toEqual({ Wands: 1, Cups: 0, Swords: 0, Pentacles: 1 });
    expect(s.topCards.map((c) => c.name).sort()).toEqual(['Five of Wands', 'King of Pentacles', 'The Sun']);
    expect(['5', 'king']).toContain(s.mostDrawnNumber?.value);
  });

  it('counts one card once across old localized and new English rows', () => {
    const ja = LEGACY.ja;
    const s = aggregateMirror(
      [
        tarotRow('2026-10-07', [[3, 'The Empress', false], [14, 'Temperance', true], [30, 'Nine of Wands', false]]),
        tarotRow('2026-04-19', [[3, ja[3], false], [30, ja[30], false], [64, ja[64], false]]),
      ],
      deckNames,
      new Date(2026, 9, 7),
    );
    expect(s.topCards.slice(0, 2)).toEqual([
      { name: 'The Empress', count: 2 },
      { name: 'Nine of Wands', count: 2 },
    ]);
    expect(s.topCards.map((c) => c.name)).not.toContain(ja[3]);
    expect(s.suitBreakdown).toEqual({ Wands: 2, Cups: 0, Swords: 0, Pentacles: 1 });
    expect(s.arcanaBreakdown).toEqual({ major: 3, minor: 3 });
    expect(s.mostDrawnNumber).toEqual({ value: '9', count: 2 });
  });

  it('returns the empty shape when there is nothing tarot', () => {
    const s = aggregateMirror([]);
    expect(s.totalReadings).toBe(0);
    expect(s.suitBreakdown).toEqual({ Wands: 0, Cups: 0, Swords: 0, Pentacles: 0 });
  });
});

describe('computeStreak', () => {
  it('counts back over local dates from today, allowing a gap today', () => {
    const today = new Date(2026, 9, 3);
    expect(computeStreak(['2026-10-03', '2026-10-02', '2026-09-30'], today)).toBe(2);
    expect(computeStreak(['2026-10-02', '2026-10-01'], today)).toBe(2);
    expect(computeStreak(['2026-09-29'], today)).toBe(0);
  });
});
