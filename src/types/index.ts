export type ZodiacSign =
  | 'aries' | 'taurus' | 'gemini' | 'cancer'
  | 'leo' | 'virgo' | 'libra' | 'scorpio'
  | 'sagittarius' | 'capricorn' | 'aquarius' | 'pisces';

export type Goal = 'love' | 'career' | 'confidence' | 'healing' | 'focus' | 'purpose' | 'stress' | 'clarity' | 'growth' | 'wellness' | 'creativity';

export type TonePreference = 'gentle' | 'direct' | 'playful';

export type ThemePreference = 'dark' | 'light' | 'auto' | 'midnight' | 'celestial';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  birthDate: string;
  birthTime?: string;
  birthPlace?: string;
  timezone: string;
  goals: Goal[];
  tonePreference: TonePreference;
  notificationTime: string;
  notificationsEnabled: boolean;
  onboardingComplete: boolean;
  isPremium: boolean;
  isGuest: boolean;
  streak: number;
  mbtiType?: string;
  loveLanguage?: string;
  enneagramType?: number;
  enneagramWing?: number;
  attachmentStyle?: string;
  bigFiveScores?: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  level: number;
  xp?: number;
  seekerRank?: string;
  totalReadings: number;
  totalJournalEntries: number;
  avatarSeed?: string;
  theme: ThemePreference;
  card_back_url?: string;
  background_url?: string;
  subscribedToNewsletter: boolean;
  createdAt: string;
}

export interface TarotCard {
  id: number;
  name: string;
  arcana: 'major' | 'minor';
  suit?: 'wands' | 'cups' | 'swords' | 'pentacles';
  number?: number;
  keywords: string[];
  meaningUpright: string;
  meaningReversed: string;
  description: string;
  loveMeaning?: string;
  careerMeaning?: string;
  reflectionPrompt?: string;
  imageUrl?: string;
}

export interface EnhancedHoroscope {
  sign: ZodiacSign;
  date: string;
  general: string;
  love: string;
  career: string;
  mood: string;
  energy: number;
  luckyNumber: number;
  luckyColor: string;
  actionStep: string;
  tags: string[];
}

export interface PersonalizationContext {
  goals: Goal[];
  frequentJournalTags: string[];
  recentlySavedThemes: string[];
  tonePreference: TonePreference;
  sign: ZodiacSign;
}

export interface PersonalizedContent {
  ritualCardOrder: ('horoscope' | 'tarot' | 'prompt')[];
  highlightedSections: string[];
  promptTemplateId: string;
  spreadSuggestion: string;
}

export interface TarotReading {
  id: string;
  userId: string;
  date: string;
  spreadType: 'single' | 'three-card' | 'celtic-cross';
  cards: { card: TarotCard; position: string; reversed: boolean }[];
  interpretation: string;
  saved: boolean;
}

export interface DailyHoroscope {
  id: string;
  userId: string;
  date: string;
  sign: ZodiacSign;
  general: string;
  love: string;
  career: string;
  energy: number;
  luckyNumber: number;
  luckyColor: string;
}

export interface QuizQuestion {
  id: string;
  text: string;
  options: { value: number; label: string }[];
  dimension?: string;
}

export interface QuizDefinition {
  id: string;
  type: 'mbti' | 'love-language' | 'big-five' | 'enneagram' | 'attachment';
  title: string;
  description: string;
  questions: QuizQuestion[];
}

export interface QuizResult {
  id: string;
  userId: string;
  quizId: string;
  quizType: string;
  result: string;
  scores: Record<string, number>;
  completedAt: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  date: string;
  content: string;
  moodTags: string[];
  linkedReadingId?: string;
  prompt?: string;
  createdAt: string;
  updatedAt: string;
}

export type Tab = 'home' | 'readings' | 'quizzes' | 'achievements' | 'journal' | 'profile' | 'admin';

export interface RitualCard {
  type: 'horoscope' | 'tarot' | 'prompt';
  title: string;
  content: string;
  action?: string;
}

export interface SavedHighlight {
  id: string;
  userId: string;
  highlightType: 'horoscope' | 'tarot' | 'prompt';
  date: string;
  content: Record<string, unknown>;
  createdAt: string;
}

export interface DailyRitual {
  id: string;
  userId: string;
  date: string;
  horoscopeViewed: boolean;
  tarotViewed: boolean;
  promptViewed: boolean;
  completed: boolean;
  createdAt: string;
}

export interface OnboardingData {
  goals: Goal[];
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  tonePreference: TonePreference;
  notificationsEnabled: boolean;
  notificationTime: string;
  email: string;
  password: string;
  subscribedToNewsletter: boolean;
}
