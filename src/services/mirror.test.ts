import { describe, it, expect } from 'vitest';
import { aggregateMirror, computeStreak, type MirrorReadingRow } from './mirror';

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
