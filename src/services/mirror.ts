// Mirror — aggregate stats over a user's tarot reading history.
//
// Inspired by Labyrinthos's "Mirror" feature. The user's readings (cards
// + reversed flags) are stored on tarot_readings.cards jsonb; we read
// the recent set and surface insights: most-drawn card, suit, number,
// percent reversals, streak, etc. Pure aggregation — no AI calls.
//
// Returned stats are computed client-side after a single SELECT so it
// stays cheap even on large reading histories.

import { supabase } from '../lib/supabase';

export type MirrorPeriod = 'week' | 'month' | 'all';

export interface MirrorStats {
  totalReadings: number;
  totalCardsDrawn: number;
  reversalPercent: number;
  mostDrawnCard: { name: string; count: number } | null;
  mostDrawnSuit: { suit: string; count: number } | null;
  mostDrawnNumber: { value: string; count: number } | null;
  topCards: Array<{ name: string; count: number }>; // top 5
  suitBreakdown: Record<string, number>;
  arcanaBreakdown: { major: number; minor: number };
  streakDays: number;
  firstReadingDate: string | null;
}

interface ReadingRow {
  date: string;
  cards: Array<{ name?: string; reversed?: boolean; card?: { name?: string; suit?: string; arcana?: string; number?: number } }>;
}

const SUITS = ['Wands', 'Cups', 'Swords', 'Pentacles'] as const;

function extractCardName(c: ReadingRow['cards'][number]): string | null {
  if (typeof c?.name === 'string') return c.name;
  if (typeof c?.card?.name === 'string') return c.card.name;
  return null;
}

function extractReversed(c: ReadingRow['cards'][number]): boolean {
  return Boolean(c?.reversed);
}

function suitFromName(name: string): string | null {
  for (const s of SUITS) {
    if (name.toLowerCase().includes(s.toLowerCase())) return s;
  }
  return null;
}

function numberFromName(name: string): string | null {
  const lower = name.toLowerCase();
  const map: Record<string, string> = {
    ace: 'Ace', two: '2', three: '3', four: '4', five: '5',
    six: '6', seven: '7', eight: '8', nine: '9', ten: '10',
    page: 'Page', knight: 'Knight', queen: 'Queen', king: 'King',
  };
  for (const word of Object.keys(map)) {
    if (lower.startsWith(word + ' ')) return map[word];
  }
  return null;
}

function isMajor(name: string): boolean {
  return !suitFromName(name);
}

function periodCutoff(period: MirrorPeriod): string | null {
  if (period === 'all') return null;
  const days = period === 'week' ? 7 : 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff.toISOString().split('T')[0];
}

function computeStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const set = new Set(dates);
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; ; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    if (set.has(key)) streak++;
    else if (i > 0) break;
    else continue;
  }
  return streak;
}

export async function getMirrorStats(userId: string, period: MirrorPeriod = 'month'): Promise<MirrorStats> {
  const cutoff = periodCutoff(period);
  let query = supabase
    .from('tarot_readings')
    .select('date, cards')
    .eq('user_id', userId)
    .order('date', { ascending: false });
  if (cutoff) query = query.gte('date', cutoff);

  const { data, error } = await query;
  if (error || !data) {
    return {
      totalReadings: 0,
      totalCardsDrawn: 0,
      reversalPercent: 0,
      mostDrawnCard: null,
      mostDrawnSuit: null,
      mostDrawnNumber: null,
      topCards: [],
      suitBreakdown: { Wands: 0, Cups: 0, Swords: 0, Pentacles: 0 },
      arcanaBreakdown: { major: 0, minor: 0 },
      streakDays: 0,
      firstReadingDate: null,
    };
  }

  const rows = data as ReadingRow[];
  const cardCounts = new Map<string, number>();
  const suitCounts: Record<string, number> = { Wands: 0, Cups: 0, Swords: 0, Pentacles: 0 };
  const numberCounts = new Map<string, number>();
  let totalCards = 0;
  let reversals = 0;
  let majorCount = 0;
  let minorCount = 0;
  const dates: string[] = [];

  for (const row of rows) {
    dates.push(row.date);
    const cards = Array.isArray(row.cards) ? row.cards : [];
    for (const c of cards) {
      const name = extractCardName(c);
      if (!name) continue;
      totalCards++;
      cardCounts.set(name, (cardCounts.get(name) || 0) + 1);
      if (extractReversed(c)) reversals++;
      if (isMajor(name)) {
        majorCount++;
      } else {
        minorCount++;
        const suit = suitFromName(name);
        if (suit) suitCounts[suit] = (suitCounts[suit] || 0) + 1;
        const number = numberFromName(name);
        if (number) numberCounts.set(number, (numberCounts.get(number) || 0) + 1);
      }
    }
  }

  const sortedCards = [...cardCounts.entries()].sort((a, b) => b[1] - a[1]);
  const topCards = sortedCards.slice(0, 5).map(([name, count]) => ({ name, count }));
  const mostDrawnCard = sortedCards[0] ? { name: sortedCards[0][0], count: sortedCards[0][1] } : null;

  const sortedSuits = Object.entries(suitCounts).sort((a, b) => b[1] - a[1]);
  const mostDrawnSuit = sortedSuits[0]?.[1] ? { suit: sortedSuits[0][0], count: sortedSuits[0][1] } : null;

  const sortedNumbers = [...numberCounts.entries()].sort((a, b) => b[1] - a[1]);
  const mostDrawnNumber = sortedNumbers[0] ? { value: sortedNumbers[0][0], count: sortedNumbers[0][1] } : null;

  return {
    totalReadings: rows.length,
    totalCardsDrawn: totalCards,
    reversalPercent: totalCards ? Math.round((reversals / totalCards) * 100) : 0,
    mostDrawnCard,
    mostDrawnSuit,
    mostDrawnNumber,
    topCards,
    suitBreakdown: suitCounts,
    arcanaBreakdown: { major: majorCount, minor: minorCount },
    streakDays: computeStreak(dates),
    firstReadingDate: rows[rows.length - 1]?.date ?? null,
  };
}
