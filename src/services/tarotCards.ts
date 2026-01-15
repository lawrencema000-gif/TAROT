import { supabase } from '../lib/supabase';
import type { TarotCard } from '../types';
import { fullDeck } from '../data/tarotDeck';

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

export async function uploadImageToStorage(
  file: File | Blob,
  fileName: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from('tarot-images')
      .upload(fileName, file, {
        cacheControl: '31536000',
        upsert: true,
      });

    if (error) {
      console.error('Error uploading image:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('tarot-images')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    return null;
  }
}

export async function uploadImageFromUrl(
  imageUrl: string,
  fileName: string
): Promise<string | null> {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    return await uploadImageToStorage(blob, fileName);
  } catch (error) {
    console.error('Error fetching and uploading image:', error);
    return null;
  }
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

    console.log(`Seeding ${fullDeck.length} tarot cards...`);

    for (const card of fullDeck) {
      let storageUrl = card.imageUrl;

      if (card.imageUrl && card.imageUrl.startsWith('/')) {
        const fileName = card.imageUrl.substring(1);
        const fullUrl = `${window.location.origin}${card.imageUrl}`;

        const folder = card.arcana === 'major' ? 'major' : `minor/${card.suit || 'other'}`;
        const uploadedUrl = await uploadImageFromUrl(fullUrl, `${folder}/${fileName}`);

        if (uploadedUrl) {
          storageUrl = uploadedUrl;
        }
      }

      const dbCard = {
        ...cardToDb(card),
        image_url: storageUrl || '',
      };

      const { error } = await supabase
        .from('tarot_cards')
        .insert(dbCard);

      if (error) {
        console.error(`Error inserting card ${card.name}:`, error);
      }
    }

    console.log(`Successfully seeded ${fullDeck.length} tarot cards`);
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
      return fullDeck;
    }

    if (!data || data.length === 0) {
      await seedTarotCards();
      return fullDeck;
    }

    return data.map(dbToCard);
  } catch (error) {
    console.error('Error fetching tarot cards:', error);
    return fullDeck;
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
      const fallback = fullDeck.find(card => card.id === id);
      return fallback || null;
    }

    return dbToCard(data);
  } catch (error) {
    console.error('Error fetching tarot card:', error);
    const fallback = fullDeck.find(card => card.id === id);
    return fallback || null;
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
      return fullDeck.filter(card => card.arcana === arcana);
    }

    return data.map(dbToCard);
  } catch (error) {
    console.error('Error fetching tarot cards by arcana:', error);
    return fullDeck.filter(card => card.arcana === arcana);
  }
}

export async function searchTarotCards(query: string): Promise<TarotCard[]> {
  try {
    const { data, error } = await supabase
      .from('tarot_cards')
      .select('*')
      .or(`name.ilike.%${query}%,keywords.cs.{${query}}`)
      .order('id');

    if (error || !data) {
      return fullDeck.filter(card =>
        card.name.toLowerCase().includes(query.toLowerCase()) ||
        card.keywords.some(k => k.toLowerCase().includes(query.toLowerCase()))
      );
    }

    return data.map(dbToCard);
  } catch (error) {
    console.error('Error searching tarot cards:', error);
    return fullDeck.filter(card =>
      card.name.toLowerCase().includes(query.toLowerCase()) ||
      card.keywords.some(k => k.toLowerCase().includes(query.toLowerCase()))
    );
  }
}
