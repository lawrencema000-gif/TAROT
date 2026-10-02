import { supabase } from '../lib/supabase';
import type { TarotCard, ZodiacSign, Goal } from '../types';
import type { PlayingCard } from '../types/cartomancy';
import type { CombinationHit } from '../data/cartomancy/combinations';
import { getLocale } from '../i18n/config';
import i18n from '../i18n/config';
import { tArray } from '../utils/tArray';

/** Which deck a reading's cards come from. The server defaults to 'tarot'. */
export type ReadingDeck = 'tarot' | 'playing';

export interface ReadingCard {
  id: number;
  name: string;
  reversed: boolean;
  keywords?: string[];
  meaningUpright?: string;
  meaningReversed?: string;
  loveMeaning?: string;
  careerMeaning?: string;
  /** Playing cards carry an advice line; the server uses it as the "general" focus meaning. */
  adviceMeaning?: string;
}

export interface ReadingRequest {
  cards: ReadingCard[];
  /** Passed through untouched; the server treats it as untrusted context. */
  question?: string;
  spreadType: string;
  zodiacSign?: ZodiacSign;
  goals?: Goal[];
  focusArea?: 'love' | 'career' | 'general';
  /** BCP-47 locale code (e.g. 'en', 'ja', 'ko', 'zh'). The server instructs the model to respond in this language. */
  locale?: string;
  /** Defaults to 'tarot'. Playing-card spreads must also send `positions`. */
  deck?: ReadingDeck;
  /** Localized position labels in card order — the server only knows the tarot spreads. ≤ 40 chars each. */
  positions?: string[];
  /** Rule-based combination hits as short lines (see `combinationHitsToLines`). The server uses at most six. */
  combinations?: string[];
  /** Rule-based verdict label for Yes/No and Wish spreads, e.g. "Favored, with a delay". */
  verdict?: string;
  /** Playing deck only. */
  jokers?: boolean;
  reversals?: boolean;
  /**
   * Client UUID. The server adopts it as the correlation id, which makes the
   * Moonstone debit idempotent: a retry after a dropped connection with the
   * same requestId is not charged twice and gets the same cached reading.
   * `generatePremiumReading` fills it in when absent.
   */
  requestId?: string;
}

export interface ReadingResponse {
  interpretation: string;
  usedLlm: boolean;
  cardCount: number;
  deck?: ReadingDeck;
  cached?: boolean;
}

function newRequestId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  // Very old WebViews: RFC-4122-shaped fallback so the server still accepts it.
  const hex = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `${hex(8)}-${hex(4)}-4${hex(3)}-a${hex(3)}-${hex(12)}`;
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

  // Inject the active UI locale and a request id into the request. Callers
  // can override either by passing them explicitly; every other field,
  // including `question`, is passed through as given.
  const requestWithLocale: ReadingRequest = {
    locale: getLocale(),
    requestId: newRequestId(),
    ...request,
  };

  const response = await fetch(`${supabaseUrl}/functions/v1/generate-reading`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': anonKey,
      'Content-Type': 'application/json',
      'X-Correlation-Id': requestWithLocale.requestId as string,
    },
    body: JSON.stringify(requestWithLocale),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Edge function error response:', errorText);

    try {
      const errorJson = JSON.parse(errorText);
      const message = typeof errorJson?.error === 'string'
        ? errorJson.error
        : errorJson?.error?.message;
      throw new Error(message || `Failed to generate reading: ${response.status}`);
    } catch (e) {
      if (e instanceof Error && !e.message.startsWith('Unexpected')) throw e;
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
    loveMeaning: card.loveMeaning,
    careerMeaning: card.careerMeaning,
  };
}

/**
 * Sibling of `tarotCardToReadingCard` for the playing deck. Ids stay in the
 * 100..153 range so a saved reading can never be confused with a tarot one;
 * `adviceMeaning` rides along as the "general" focus pick.
 */
export function playingCardToReadingCard(card: PlayingCard, reversed: boolean): ReadingCard {
  return {
    id: card.id,
    name: card.name,
    reversed,
    keywords: card.keywords,
    meaningUpright: card.meaningUpright,
    meaningReversed: card.meaningReversed ?? card.meaningUpright,
    loveMeaning: card.loveMeaning,
    careerMeaning: card.careerMeaning,
    adviceMeaning: card.adviceMeaning,
  };
}

/** `findCombinations()` hits → the short lines the server reads (≤ 6 are used). */
export function combinationHitsToLines(hits: CombinationHit[], limit = 6): string[] {
  return hits
    .slice(0, limit)
    .map((h) => (h.meaning ? `${h.label} — ${h.meaning}` : h.label))
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

const spreadPositions: Record<string, string[]> = {
  single: ['Your Card'],
  'three-card': ['Past', 'Present', 'Future'],
  relationship: [
    'You',
    'Them',
    'Strengths of the connection',
    'Challenges / friction',
    'Guidance / next step',
  ],
  career: [
    'Where you are now',
    'What drives you',
    'Obstacle / pressure point',
    'What to develop',
    'Action you can take',
    'Likely outcome',
  ],
  shadow: [
    'The mask you wear',
    'The shadow aspect',
    'Root cause',
    'Trigger',
    'Hidden gift',
    'Integration step',
    'Support / next step',
  ],
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
  focusArea?: 'love' | 'career' | 'general',
  /** Position labels for spreads the built-in table does not know (cartomancy). */
  positionLabels?: string[]
): string {
  const positions = positionLabels && positionLabels.length >= cards.length
    ? positionLabels
    : (spreadPositions[spreadType] || spreadPositions.single);
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

function spreadPositionsI18nKey(spreadType: string): string {
  if (spreadType === 'three-card') return 'threeCard';
  if (spreadType === 'celtic-cross') return 'celticCross';
  return spreadType;
}

export function getSpreadPositions(spreadType: string): string[] {
  const fallback = spreadPositions[spreadType] || spreadPositions.single;
  const key = spreadPositionsI18nKey(spreadType);
  const v = tArray((k, o) => i18n.t(k, o), `readings.spreadPositions.${key}`, fallback, { ns: 'app' });
  return v.length > 0 ? v : fallback;
}

export function getSpreadCardCount(spreadType: string): number {
  // Card count is structural and never changes per locale, so read from the
  // canonical English table.
  return (spreadPositions[spreadType] || spreadPositions.single).length;
}

export const availableSpreads = [
  { id: 'single', name: 'Single Card', description: 'Quick daily guidance', cardCount: 1 },
  { id: 'three-card', name: 'Three Card', description: 'Past, present, future', cardCount: 3 },
  { id: 'relationship', name: 'Relationship', description: 'Connection dynamics', cardCount: 5 },
  { id: 'career', name: 'Career', description: 'Professional guidance', cardCount: 6 },
  { id: 'shadow', name: 'Shadow Work', description: 'Inner exploration', cardCount: 7 },
  { id: 'celtic-cross', name: 'Celtic Cross', description: 'Comprehensive insight', cardCount: 10 },
];
