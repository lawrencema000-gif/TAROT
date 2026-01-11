import { supabase } from '../lib/supabase';
import { getAllTarotCards, getTarotCardById, getTarotCardsByArcana } from './tarotCards';
import type { TarotCard } from '../types';

export interface SearchResult {
  type: 'card' | 'reading' | 'journal' | 'saved';
  id: string;
  title: string;
  subtitle?: string;
  preview?: string;
  relevance: number;
  data: Record<string, unknown>;
}

let cachedDeck: TarotCard[] = [];

async function getDeck(): Promise<TarotCard[]> {
  if (cachedDeck.length === 0) {
    cachedDeck = await getAllTarotCards();
  }
  return cachedDeck;
}

export function clearDeckCache(): void {
  cachedDeck = [];
}

export async function searchCards(query: string): Promise<SearchResult[]> {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return [];

  const results: SearchResult[] = [];
  const deck = await getDeck();

  deck.forEach(card => {
    let relevance = 0;

    const nameLower = card.name.toLowerCase();
    if (nameLower === normalizedQuery) {
      relevance = 100;
    } else if (nameLower.startsWith(normalizedQuery)) {
      relevance = 80;
    } else if (nameLower.includes(normalizedQuery)) {
      relevance = 60;
    }

    if (card.keywords.some(k => k.toLowerCase().includes(normalizedQuery))) {
      relevance = Math.max(relevance, 50);
    }

    if (card.suit && card.suit.toLowerCase().includes(normalizedQuery)) {
      relevance = Math.max(relevance, 40);
    }

    if (card.arcana.toLowerCase().includes(normalizedQuery)) {
      relevance = Math.max(relevance, 30);
    }

    if (relevance > 0) {
      results.push({
        type: 'card',
        id: card.id.toString(),
        title: card.name,
        subtitle: card.arcana === 'major' ? 'Major Arcana' : `${card.suit} suit`,
        preview: card.keywords.slice(0, 3).join(', '),
        relevance,
        data: card as unknown as Record<string, unknown>,
      });
    }
  });

  return results.sort((a, b) => b.relevance - a.relevance);
}

export async function searchSavedItems(
  userId: string,
  query: string
): Promise<SearchResult[]> {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return [];

  const { data, error } = await supabase
    .from('saved_highlights')
    .select('*')
    .eq('user_id', userId);

  if (error || !data) return [];

  const results: SearchResult[] = [];

  data.forEach(item => {
    let relevance = 0;
    const content = item.content as Record<string, unknown>;
    const title = (content?.title as string) || '';
    const notes = (content?.notes as string) || '';
    const tags = (content?.tags as string[]) || [];

    if (title.toLowerCase().includes(normalizedQuery)) {
      relevance = 70;
    }

    if (notes.toLowerCase().includes(normalizedQuery)) {
      relevance = Math.max(relevance, 60);
    }

    if (tags.some(t => t.toLowerCase().includes(normalizedQuery))) {
      relevance = Math.max(relevance, 50);
    }

    if (relevance > 0) {
      results.push({
        type: 'saved',
        id: item.id,
        title: title || `Saved ${item.highlight_type}`,
        subtitle: item.highlight_type,
        preview: notes?.slice(0, 100) || undefined,
        relevance,
        data: content,
      });
    }
  });

  return results.sort((a, b) => b.relevance - a.relevance);
}

export async function searchJournalEntries(
  userId: string,
  query: string
): Promise<SearchResult[]> {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return [];

  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error || !data) return [];

  const results: SearchResult[] = [];

  data.forEach(entry => {
    let relevance = 0;
    const content = (entry.content as string) || '';
    const tags = (entry.tags as string[]) || [];
    const prompt = (entry.prompt as string) || '';

    if (content.toLowerCase().includes(normalizedQuery)) {
      relevance = 70;
    }

    if (prompt.toLowerCase().includes(normalizedQuery)) {
      relevance = Math.max(relevance, 60);
    }

    if (tags.some(t => t.toLowerCase().includes(normalizedQuery))) {
      relevance = Math.max(relevance, 50);
    }

    if (relevance > 0) {
      results.push({
        type: 'journal',
        id: entry.id,
        title: new Date(entry.date).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        }),
        subtitle: tags.slice(0, 3).join(', ') || 'Journal Entry',
        preview: content.slice(0, 120) + (content.length > 120 ? '...' : ''),
        relevance,
        data: entry as unknown as Record<string, unknown>,
      });
    }
  });

  return results.sort((a, b) => b.relevance - a.relevance);
}

export async function searchReadings(
  userId: string,
  query: string
): Promise<SearchResult[]> {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return [];

  const { data, error } = await supabase
    .from('tarot_readings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !data) return [];

  const results: SearchResult[] = [];

  data.forEach(reading => {
    let relevance = 0;
    const interpretation = (reading.interpretation as string) || '';
    const cards = (reading.cards as Array<{ card: TarotCard; position: string }>) || [];

    if (interpretation.toLowerCase().includes(normalizedQuery)) {
      relevance = 60;
    }

    const cardNames = cards.map(c => c.card?.name?.toLowerCase() || '');
    if (cardNames.some(name => name.includes(normalizedQuery))) {
      relevance = Math.max(relevance, 70);
    }

    const spreadType = (reading.spread_type as string) || '';
    if (spreadType.toLowerCase().includes(normalizedQuery)) {
      relevance = Math.max(relevance, 40);
    }

    if (relevance > 0) {
      results.push({
        type: 'reading',
        id: reading.id,
        title: `${spreadType.replace('-', ' ')} Reading`,
        subtitle: new Date(reading.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        preview: cardNames.map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(', '),
        relevance,
        data: reading as unknown as Record<string, unknown>,
      });
    }
  });

  return results.sort((a, b) => b.relevance - a.relevance);
}

export async function globalSearch(
  userId: string | null,
  query: string,
  options: { includeCards?: boolean; includeSaved?: boolean; includeJournal?: boolean; includeReadings?: boolean } = {}
): Promise<SearchResult[]> {
  const {
    includeCards = true,
    includeSaved = true,
    includeJournal = true,
    includeReadings = true,
  } = options;

  const results: SearchResult[] = [];

  if (includeCards) {
    const cardResults = await searchCards(query);
    results.push(...cardResults);
  }

  if (userId) {
    const promises: Promise<SearchResult[]>[] = [];

    if (includeSaved) {
      promises.push(searchSavedItems(userId, query));
    }
    if (includeJournal) {
      promises.push(searchJournalEntries(userId, query));
    }
    if (includeReadings) {
      promises.push(searchReadings(userId, query));
    }

    const asyncResults = await Promise.all(promises);
    asyncResults.forEach(r => results.push(...r));
  }

  return results.sort((a, b) => b.relevance - a.relevance).slice(0, 50);
}

export async function getCardByName(name: string): Promise<TarotCard | undefined> {
  const normalizedName = name.toLowerCase().trim();
  const deck = await getDeck();
  return deck.find(card => card.name.toLowerCase() === normalizedName);
}

export async function getCardById(id: number): Promise<TarotCard | null> {
  return await getTarotCardById(id);
}

export async function getCardsBySuit(suit: string): Promise<TarotCard[]> {
  const deck = await getDeck();
  return deck.filter(card => card.suit === suit);
}

export async function getMajorArcana(): Promise<TarotCard[]> {
  return await getTarotCardsByArcana('major');
}

export async function getMinorArcana(): Promise<TarotCard[]> {
  return await getTarotCardsByArcana('minor');
}
