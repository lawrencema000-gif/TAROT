// Mirror — aggregate stats over a user's tarot reading history.
//
// Inspired by Labyrinthos's "Mirror" feature. The user's readings (cards
// + reversed flags) are stored on tarot_readings.cards jsonb; we read
// the recent set and surface insights: most-drawn card, suit, number,
// percent reversals, streak, etc. Pure aggregation — no AI calls.
//
// Returned stats are computed client-side after a single SELECT so it
// stays cheap even on large reading histories. `aggregateMirror` is the
// pure part, unit-tested against the rows the app actually saves.

import { supabase } from '../lib/supabase';
import { localDateStr } from '../utils/localDate';

export type MirrorPeriod = 'week' | 'month' | 'all';

/** A court or pip rank, as a stable id the page localises ('ace', '7', 'knight'…). */
export type MirrorRank = 'ace' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'page' | 'knight' | 'queen' | 'king';

export interface MirrorStats {
  totalReadings: number;
  totalCardsDrawn: number;
  reversalPercent: number;
  /** `name` is the canonical English card name — the page localises it. */
  mostDrawnCard: { name: string; count: number } | null;
  mostDrawnSuit: { suit: string; count: number } | null;
  mostDrawnNumber: { value: MirrorRank; count: number } | null;
  topCards: Array<{ name: string; count: number }>; // top 5
  suitBreakdown: Record<string, number>;
  arcanaBreakdown: { major: number; minor: number };
  streakDays: number;
  firstReadingDate: string | null;
}

/**
 * Every card shape tarot_readings.cards has held. Today's rows are
 * `{ cardId, cardName, position, reversed }` (TarotSection) and, for
 * playing cards, the same plus `deck: 'playing'` (cartoFlow). Older rows
 * carried `name` or a nested `card`. The parser used to read only the old
 * two, so every current reading counted as zero cards (P7 #46).
 */
export interface SavedCardLike {
  cardId?: number;
  cardName?: string;
  name?: string;
  id?: number;
  reversed?: boolean;
  deck?: string;
  card?: { name?: string; suit?: string; arcana?: string; number?: number };
}

export interface MirrorReadingRow {
  date: string;
  spread_type?: string | null;
  cards: SavedCardLike[] | null;
}

const SUITS = ['Wands', 'Cups', 'Swords', 'Pentacles'] as const;

/** A playing-card (cartomancy) row: its Nine of Hearts is not a Minor Arcana card. */
function isPlayingCardRow(row: MirrorReadingRow): boolean {
  if (typeof row.spread_type === 'string' && row.spread_type.startsWith('carto-')) return true;
  const cards = Array.isArray(row.cards) ? row.cards : [];
  return cards.some((c) => c?.deck === 'playing');
}

function extractCardName(c: SavedCardLike, nameById?: ReadonlyMap<number, string>): string | null {
  if (!c || c.deck === 'playing') return null;
  if (typeof c.cardName === 'string' && c.cardName) return c.cardName;
  if (typeof c.name === 'string' && c.name) return c.name;
  if (typeof c.card?.name === 'string' && c.card.name) return c.card.name;
  const id = typeof c.cardId === 'number' ? c.cardId : typeof c.id === 'number' ? c.id : null;
  if (id !== null && nameById) return nameById.get(id) ?? null;
  return null;
}

function extractReversed(c: SavedCardLike): boolean {
  return Boolean(c?.reversed);
}

function suitFromName(name: string): string | null {
  for (const s of SUITS) {
    if (name.toLowerCase().includes(s.toLowerCase())) return s;
  }
  return null;
}

function rankFromName(name: string): MirrorRank | null {
  const lower = name.toLowerCase();
  const map: Record<string, MirrorRank> = {
    ace: 'ace', two: '2', three: '3', four: '4', five: '5',
    six: '6', seven: '7', eight: '8', nine: '9', ten: '10',
    page: 'page', knight: 'knight', queen: 'queen', king: 'king',
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
  return localDateStr(cutoff);
}

/** Consecutive local days with a reading, counting back from today (or yesterday). */
export function computeStreak(dates: string[], today: Date = new Date()): number {
  if (!dates.length) return 0;
  const set = new Set(dates);
  let streak = 0;
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  for (let i = 0; i < 3660; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() - i);
    const key = localDateStr(d);
    if (set.has(key)) streak++;
    else if (i > 0) break;
  }
  return streak;
}

const EMPTY_STATS: MirrorStats = {
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

/** The pure aggregation: tarot rows only, newest first. */
export function aggregateMirror(
  allRows: MirrorReadingRow[],
  nameById?: ReadonlyMap<number, string>,
  today: Date = new Date(),
): MirrorStats {
  const rows = allRows.filter((r) => !isPlayingCardRow(r));
  if (rows.length === 0) return { ...EMPTY_STATS, suitBreakdown: { ...EMPTY_STATS.suitBreakdown } };
  const cardCounts = new Map<string, number>();
  const suitCounts: Record<string, number> = { Wands: 0, Cups: 0, Swords: 0, Pentacles: 0 };
  const rankCounts = new Map<MirrorRank, number>();
  let totalCards = 0;
  let reversals = 0;
  let majorCount = 0;
  let minorCount = 0;
  const dates: string[] = [];

  for (const row of rows) {
    dates.push(row.date);
    const cards = Array.isArray(row.cards) ? row.cards : [];
    for (const c of cards) {
      const name = extractCardName(c, nameById);
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
        const rank = rankFromName(name);
        if (rank) rankCounts.set(rank, (rankCounts.get(rank) || 0) + 1);
      }
    }
  }

  const sortedCards = [...cardCounts.entries()].sort((a, b) => b[1] - a[1]);
  const topCards = sortedCards.slice(0, 5).map(([name, count]) => ({ name, count }));
  const mostDrawnCard = sortedCards[0] ? { name: sortedCards[0][0], count: sortedCards[0][1] } : null;

  const sortedSuits = Object.entries(suitCounts).sort((a, b) => b[1] - a[1]);
  const mostDrawnSuit = sortedSuits[0]?.[1] ? { suit: sortedSuits[0][0], count: sortedSuits[0][1] } : null;

  const sortedRanks = [...rankCounts.entries()].sort((a, b) => b[1] - a[1]);
  const mostDrawnNumber = sortedRanks[0] ? { value: sortedRanks[0][0], count: sortedRanks[0][1] } : null;

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
    streakDays: computeStreak(dates, today),
    firstReadingDate: rows[rows.length - 1]?.date ?? null,
  };
}

/** Canonical English names by card id, for rows that saved only an id. */
async function loadNameById(): Promise<Map<number, string>> {
  try {
    const { fullDeck } = await import('../data/tarotDeck');
    return new Map(fullDeck.map((c) => [c.id, c.name]));
  } catch {
    return new Map();
  }
}

export async function getMirrorStats(userId: string, period: MirrorPeriod = 'month'): Promise<MirrorStats> {
  const cutoff = periodCutoff(period);
  let query = supabase
    .from('tarot_readings')
    .select('date, spread_type, cards')
    .eq('user_id', userId)
    .order('date', { ascending: false });
  if (cutoff) query = query.gte('date', cutoff);

  const { data, error } = await query;
  if (error || !data) {
    return { ...EMPTY_STATS, suitBreakdown: { ...EMPTY_STATS.suitBreakdown } };
  }
  const rows = data as MirrorReadingRow[];
  const needsIds = rows.some((r) => (r.cards ?? []).some((c) => c && !c.cardName && !c.name && !c.card?.name));
  return aggregateMirror(rows, needsIds ? await loadNameById() : undefined);
}
