import { supabase } from '../lib/supabase';
import type { TarotCard } from '../types';
import { getBundledCardPath } from '../config/bundledImages';
import { localizeCard, localizeCards } from '../i18n/localizeCard';

// Lazy-load the 915-line tarot deck only when needed as fallback
async function getFullDeck(): Promise<TarotCard[]> {
  const { fullDeck } = await import('../data/tarotDeck');
  return fullDeck;
}

export interface TarotCardDB {
  id: number;
  name: string;
  arcana: 'major' | 'minor';
  keywords: string[];
  meaning_upright: string;
  meaning_reversed: string;
  description: string;
  love_meaning: string;
  career_meaning: string;
  reflection_prompt: string;
  image_url: string;
  suit?: string;
  created_at?: string;
  updated_at?: string;
}

function dbToCard(dbCard: TarotCardDB): TarotCard {
  const validSuits = ['wands', 'cups', 'swords', 'pentacles'] as const;
  const suit = dbCard.suit && validSuits.includes(dbCard.suit as typeof validSuits[number])
    ? dbCard.suit as 'wands' | 'cups' | 'swords' | 'pentacles'
    : undefined;

  return {
    id: dbCard.id,
    name: dbCard.name,
    arcana: dbCard.arcana,
    keywords: dbCard.keywords,
    meaningUpright: dbCard.meaning_upright,
    meaningReversed: dbCard.meaning_reversed,
    description: dbCard.description,
    loveMeaning: dbCard.love_meaning || undefined,
    careerMeaning: dbCard.career_meaning || undefined,
    reflectionPrompt: dbCard.reflection_prompt || undefined,
    imageUrl: dbCard.image_url || undefined,
    suit,
  };
}

function cardToDb(card: TarotCard): Omit<TarotCardDB, 'created_at' | 'updated_at'> {
  return {
    id: card.id,
    name: card.name,
    arcana: card.arcana,
    keywords: card.keywords,
    meaning_upright: card.meaningUpright,
    meaning_reversed: card.meaningReversed,
    description: card.description,
    love_meaning: card.loveMeaning || '',
    career_meaning: card.careerMeaning || '',
    reflection_prompt: card.reflectionPrompt || '',
    image_url: card.imageUrl || '',
    suit: card.suit,
  };
}

export async function seedTarotCards(): Promise<void> {
  try {
    const { data: existingCards } = await supabase
      .from('tarot_cards')
      .select('id')
      .limit(1);

    if (existingCards && existingCards.length > 0) {
      console.log('Tarot cards already seeded');
      return;
    }

    const deck = await getFullDeck();
    console.log(`Seeding ${deck.length} tarot cards...`);

    const cardsToInsert = deck.map(card => {
      const bundledPath = getBundledCardPath(card.id, card.name, card.suit);

      return {
        ...cardToDb(card),
        image_url: bundledPath || '',
      };
    });

    const { error } = await supabase
      .from('tarot_cards')
      .insert(cardsToInsert);

    if (error) {
      console.error('Error seeding tarot cards:', error);
      return;
    }

    console.log(`Successfully seeded ${deck.length} tarot cards`);
  } catch (error) {
    console.error('Error seeding tarot cards:', error);
  }
}

export async function getAllTarotCards(): Promise<TarotCard[]> {
  try {
    const { data, error } = await supabase
      .from('tarot_cards')
      .select('*')
      .order('id');

    if (error) {
      console.error('Error fetching tarot cards:', error);
      return localizeCards(await getFullDeck());
    }

    if (!data || data.length === 0) {
      await seedTarotCards();
      return localizeCards(await getFullDeck());
    }

    return localizeCards(data.map(dbToCard));
  } catch (error) {
    console.error('Error fetching tarot cards:', error);
    return localizeCards(await getFullDeck());
  }
}

export async function getTarotCardById(id: number): Promise<TarotCard | null> {
  try {
    const { data, error } = await supabase
      .from('tarot_cards')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      const deck = await getFullDeck();
      const card = deck.find(c => c.id === id);
      return card ? localizeCard(card) : null;
    }

    return localizeCard(dbToCard(data));
  } catch (error) {
    console.error('Error fetching tarot card:', error);
    const deck = await getFullDeck();
    const card = deck.find(c => c.id === id);
    return card ? localizeCard(card) : null;
  }
}

export async function getTarotCardsByArcana(arcana: 'major' | 'minor'): Promise<TarotCard[]> {
  try {
    const { data, error } = await supabase
      .from('tarot_cards')
      .select('*')
      .eq('arcana', arcana)
      .order('id');

    if (error || !data || data.length === 0) {
      const deck = await getFullDeck();
      return localizeCards(deck.filter(card => card.arcana === arcana));
    }

    return localizeCards(data.map(dbToCard));
  } catch (error) {
    console.error('Error fetching tarot cards by arcana:', error);
    const deck = await getFullDeck();
    return localizeCards(deck.filter(card => card.arcana === arcana));
  }
}

export async function searchTarotCards(query: string): Promise<TarotCard[]> {
  const q = query.toLowerCase();
  const filterLocal = (deck: TarotCard[]) =>
    deck.filter(card =>
      card.name.toLowerCase().includes(q) ||
      card.keywords.some((k: string) => k.toLowerCase().includes(q))
    );

  try {
    const { data, error } = await supabase
      .from('tarot_cards')
      .select('*')
      .or(`name.ilike.%${query}%,keywords.cs.{${query}}`)
      .order('id');

    if (error || !data) {
      const deck = localizeCards(await getFullDeck());
      return filterLocal(deck);
    }

    const localized = localizeCards(data.map(dbToCard));
    const byId = new Map(localized.map(c => [c.id, c]));
    const rawMatch = filterLocal(localized);

    // Also match against localized-only text by scanning the full localized deck,
    // so Japanese/Korean/Chinese users can search in their own language.
    const full = localizeCards(await getFullDeck());
    const localMatches = filterLocal(full).filter(c => !byId.has(c.id));

    return [...rawMatch, ...localMatches];
  } catch (error) {
    console.error('Error searching tarot cards:', error);
    const deck = localizeCards(await getFullDeck());
    return filterLocal(deck);
  }
}
