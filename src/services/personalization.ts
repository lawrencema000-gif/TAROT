import type { Goal, TonePreference, ZodiacSign, PersonalizationContext, PersonalizedContent } from '../types';
import { supabase } from '../lib/supabase';

const goalToSpreadMap: Record<Goal, string> = {
  love: 'relationship',
  career: 'career',
  confidence: 'single',
  healing: 'shadow',
  focus: 'three-card',
  purpose: 'celtic-cross',
  stress: 'single',
};

const goalToSectionPriority: Record<Goal, string[]> = {
  love: ['love', 'compatibility', 'tarot'],
  career: ['career', 'tarot', 'horoscope'],
  confidence: ['horoscope', 'tarot', 'journal'],
  healing: ['journal', 'tarot', 'horoscope'],
  focus: ['tarot', 'horoscope', 'journal'],
  purpose: ['tarot', 'horoscope', 'compatibility'],
  stress: ['journal', 'horoscope', 'tarot'],
};

const toneTemplates: Record<TonePreference, { greeting: string; encouragement: string; style: string }> = {
  gentle: {
    greeting: 'Welcome back, dear one',
    encouragement: 'You\'re doing beautifully. Take your time.',
    style: 'nurturing',
  },
  direct: {
    greeting: 'Ready to dive in?',
    encouragement: 'Let\'s get to it. You\'ve got this.',
    style: 'action-oriented',
  },
  playful: {
    greeting: 'Hey there, cosmic explorer!',
    encouragement: 'Time for some magic! Let\'s see what the stars have in store.',
    style: 'whimsical',
  },
};

export interface UserPreferences {
  userId: string;
  frequentJournalTags: string[];
  recentlySavedThemes: string[];
  lastActiveGoals: Goal[];
  preferredSpread: string;
  favoriteCardIds: number[];
  engagementPatterns: {
    mostActiveDay: number;
    mostActiveHour: number;
    preferredReadingTime: 'morning' | 'afternoon' | 'evening' | 'night';
  };
}

export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
  const { data: journalData } = await supabase
    .from('journal_entries')
    .select('tags')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  const { data: savedData } = await supabase
    .from('saved_highlights')
    .select('highlight_type, content')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  const { data: profileData } = await supabase
    .from('profiles')
    .select('goals')
    .eq('id', userId)
    .maybeSingle();

  const tagCounts: Record<string, number> = {};
  journalData?.forEach(entry => {
    entry.tags?.forEach((tag: string) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  const frequentJournalTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);

  const recentlySavedThemes: string[] = [];
  savedData?.forEach(saved => {
    if (saved.highlight_type) {
      recentlySavedThemes.push(saved.highlight_type);
    }
  });

  return {
    userId,
    frequentJournalTags,
    recentlySavedThemes: [...new Set(recentlySavedThemes)].slice(0, 5),
    lastActiveGoals: (profileData?.goals as Goal[]) || [],
    preferredSpread: 'single',
    favoriteCardIds: [],
    engagementPatterns: {
      mostActiveDay: 0,
      mostActiveHour: 9,
      preferredReadingTime: 'morning',
    },
  };
}

export function generatePersonalizedContent(context: PersonalizationContext): PersonalizedContent {
  const { goals, frequentJournalTags, recentlySavedThemes } = context;

  let ritualCardOrder: ('horoscope' | 'tarot' | 'prompt')[] = ['horoscope', 'tarot', 'prompt'];
  let highlightedSections: string[] = [];
  let spreadSuggestion = 'single';

  if (goals.length > 0) {
    const primaryGoal = goals[0];

    spreadSuggestion = goalToSpreadMap[primaryGoal] || 'single';
    highlightedSections = goalToSectionPriority[primaryGoal] || [];

    if (primaryGoal === 'love' || primaryGoal === 'healing') {
      ritualCardOrder = ['tarot', 'horoscope', 'prompt'];
    } else if (primaryGoal === 'career' || primaryGoal === 'focus') {
      ritualCardOrder = ['horoscope', 'tarot', 'prompt'];
    } else if (primaryGoal === 'stress') {
      ritualCardOrder = ['prompt', 'horoscope', 'tarot'];
    }
  }

  if (frequentJournalTags.includes('love') || frequentJournalTags.includes('relationships')) {
    if (!highlightedSections.includes('love')) {
      highlightedSections.unshift('love');
    }
  }

  if (frequentJournalTags.includes('career') || frequentJournalTags.includes('work')) {
    if (!highlightedSections.includes('career')) {
      highlightedSections.unshift('career');
    }
  }

  if (recentlySavedThemes.includes('tarot')) {
    ritualCardOrder = ritualCardOrder.filter(c => c !== 'tarot');
    ritualCardOrder.unshift('tarot');
  }

  let promptTemplateId = 'general';
  if (goals.includes('love')) promptTemplateId = 'love';
  else if (goals.includes('career')) promptTemplateId = 'career';
  else if (goals.includes('healing')) promptTemplateId = 'healing';
  else if (goals.includes('confidence')) promptTemplateId = 'confidence';
  else if (goals.includes('stress')) promptTemplateId = 'stress';

  return {
    ritualCardOrder,
    highlightedSections: highlightedSections.slice(0, 3),
    promptTemplateId,
    spreadSuggestion,
  };
}

export function getToneContent(tone: TonePreference): { greeting: string; encouragement: string; style: string } {
  return toneTemplates[tone] || toneTemplates.gentle;
}

export function getPersonalizedGreeting(tone: TonePreference, displayName?: string): string {
  const templates = toneTemplates[tone];
  const name = displayName?.split(' ')[0] || '';

  if (tone === 'gentle') {
    return name ? `Welcome back, ${name}` : 'Welcome back, dear one';
  } else if (tone === 'direct') {
    return name ? `Hey ${name}, ready?` : 'Ready to dive in?';
  } else {
    return name ? `Hey ${name}!` : 'Hey there, cosmic explorer!';
  }
}

export function getSuggestedSpread(goals: Goal[], recentSpreads: string[]): string {
  if (goals.length === 0) return 'single';

  const primaryGoal = goals[0];
  const suggested = goalToSpreadMap[primaryGoal];

  const recentlyUsed = recentSpreads.slice(0, 3);
  if (recentlyUsed.includes(suggested)) {
    const alternatives = ['single', 'three-card', 'relationship', 'career', 'shadow'];
    const available = alternatives.filter(s => !recentlyUsed.includes(s));
    return available[0] || 'single';
  }

  return suggested;
}

export function getRelevantTags(sign: ZodiacSign, goals: Goal[]): string[] {
  const signThemes: Record<ZodiacSign, string[]> = {
    aries: ['action', 'leadership', 'courage'],
    taurus: ['stability', 'comfort', 'patience'],
    gemini: ['communication', 'curiosity', 'versatility'],
    cancer: ['nurturing', 'intuition', 'home'],
    leo: ['creativity', 'confidence', 'warmth'],
    virgo: ['analysis', 'service', 'health'],
    libra: ['balance', 'harmony', 'partnership'],
    scorpio: ['transformation', 'depth', 'passion'],
    sagittarius: ['adventure', 'philosophy', 'freedom'],
    capricorn: ['ambition', 'discipline', 'achievement'],
    aquarius: ['innovation', 'independence', 'vision'],
    pisces: ['intuition', 'creativity', 'compassion'],
  };

  const goalThemes: Record<Goal, string[]> = {
    love: ['relationships', 'connection', 'heart'],
    career: ['success', 'ambition', 'growth'],
    confidence: ['self-belief', 'courage', 'strength'],
    healing: ['peace', 'release', 'recovery'],
    focus: ['clarity', 'purpose', 'direction'],
    purpose: ['meaning', 'destiny', 'calling'],
    stress: ['calm', 'balance', 'release'],
  };

  const tags = [...signThemes[sign] || []];
  goals.forEach(goal => {
    tags.push(...(goalThemes[goal] || []));
  });

  return [...new Set(tags)].slice(0, 6);
}

export function calculateContentRelevance(
  contentTags: string[],
  userTags: string[],
  goals: Goal[]
): number {
  let score = 0;
  const goalTags = goals.flatMap(g => {
    switch (g) {
      case 'love': return ['love', 'relationships', 'heart', 'connection'];
      case 'career': return ['career', 'work', 'success', 'ambition'];
      case 'confidence': return ['confidence', 'strength', 'courage'];
      case 'healing': return ['healing', 'peace', 'release'];
      case 'focus': return ['focus', 'clarity', 'purpose'];
      case 'purpose': return ['purpose', 'meaning', 'destiny'];
      case 'stress': return ['stress', 'calm', 'balance'];
      default: return [];
    }
  });

  contentTags.forEach(tag => {
    if (userTags.includes(tag)) score += 2;
    if (goalTags.includes(tag)) score += 3;
  });

  return score;
}
