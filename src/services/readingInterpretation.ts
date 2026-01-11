import { supabase } from '../lib/supabase';
import type { TarotCard, ZodiacSign, Goal } from '../types';

export interface ReadingCard {
  id: number;
  name: string;
  reversed: boolean;
  keywords?: string[];
  meaningUpright?: string;
  meaningReversed?: string;
}

export interface ReadingRequest {
  cards: ReadingCard[];
  question?: string;
  spreadType: string;
  zodiacSign?: ZodiacSign;
  goals?: Goal[];
  focusArea?: 'love' | 'career' | 'general';
}

export interface ReadingResponse {
  interpretation: string;
  usedLlm: boolean;
  cardCount: number;
}

export async function generatePremiumReading(
  request: ReadingRequest
): Promise<ReadingResponse> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    throw new Error('Authentication required for premium readings');
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const response = await fetch(`${supabaseUrl}/functions/v1/generate-reading`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Edge function error response:', errorText);

    try {
      const errorJson = JSON.parse(errorText);
      throw new Error(errorJson.error || `Failed to generate reading: ${response.status}`);
    } catch (parseError) {
      throw new Error(`Failed to generate reading: ${response.status} - ${errorText}`);
    }
  }

  return response.json();
}

export function tarotCardToReadingCard(card: TarotCard, reversed: boolean): ReadingCard {
  return {
    id: card.id,
    name: card.name,
    reversed,
    keywords: card.keywords,
    meaningUpright: card.meaningUpright,
    meaningReversed: card.meaningReversed,
  };
}

const spreadPositions: Record<string, string[]> = {
  single: ['The essence of the situation'],
  'three-card': ['Past influences', 'Present situation', 'Future potential'],
  relationship: ['Your energy', 'Their energy', 'The connection between you'],
  career: ['Current position', 'Challenges to overcome', 'Path forward'],
  shadow: ['What you hide from yourself', 'The root cause', 'How to integrate'],
  'celtic-cross': [
    'Present situation',
    'Challenge or obstacle',
    'Subconscious influences',
    'Recent past',
    'Best possible outcome',
    'Near future',
    'Your attitude',
    'External influences',
    'Hopes and fears',
    'Final outcome',
  ],
};

export function generateLocalReading(
  cards: ReadingCard[],
  spreadType: string,
  focusArea?: 'love' | 'career' | 'general'
): string {
  const positions = spreadPositions[spreadType] || spreadPositions.single;
  const paragraphs: string[] = [];

  if (focusArea) {
    const focusIntro: Record<string, string> = {
      love: 'In matters of the heart, the cards reveal a meaningful message for you.',
      career: 'Regarding your professional path, the cards offer the following guidance.',
      general: 'The cards present insight into your current situation and path forward.',
    };
    paragraphs.push(focusIntro[focusArea] || focusIntro.general);
  }

  cards.forEach((card, index) => {
    const position = positions[index] || `Position ${index + 1}`;
    const meaning = card.reversed ? card.meaningReversed : card.meaningUpright;
    const orientation = card.reversed ? ' (Reversed)' : '';

    let paragraph = `**${position}: ${card.name}${orientation}**\n`;
    paragraph += meaning || 'This card invites you to trust your intuition.';

    paragraphs.push(paragraph);
  });

  const closingMessages = [
    'Trust the wisdom that emerges from within as you reflect on these cards.',
    'The guidance is clear - take inspired action when the moment feels right.',
    'Allow these insights to settle, knowing clarity will continue to unfold.',
    'The cards honor your journey and the growth you continue to experience.',
  ];

  const closingIndex = cards.reduce((sum, c) => sum + c.id, 0) % closingMessages.length;
  paragraphs.push(closingMessages[closingIndex]);

  return paragraphs.join('\n\n');
}

export function getSpreadPositions(spreadType: string): string[] {
  return spreadPositions[spreadType] || spreadPositions.single;
}

export function getSpreadCardCount(spreadType: string): number {
  return (spreadPositions[spreadType] || spreadPositions.single).length;
}

export const availableSpreads = [
  { id: 'single', name: 'Single Card', description: 'Quick daily guidance', cardCount: 1 },
  { id: 'three-card', name: 'Three Card', description: 'Past, present, future', cardCount: 3 },
  { id: 'relationship', name: 'Relationship', description: 'Connection dynamics', cardCount: 3 },
  { id: 'career', name: 'Career', description: 'Professional guidance', cardCount: 3 },
  { id: 'shadow', name: 'Shadow Work', description: 'Inner exploration', cardCount: 3 },
  { id: 'celtic-cross', name: 'Celtic Cross', description: 'Comprehensive insight', cardCount: 10 },
];
