export type PremiumFeature =
  | 'unlimited_saves'
  | 'celtic_cross'
  | 'three_card'
  | 'compatibility_full'
  | 'deep_interpretations'
  | 'guided_prompts'
  | 'journal_insights'
  | 'personalization'
  | 'birth_chart';

export interface FeatureDefinition {
  id: PremiumFeature;
  name: string;
  description: string;
  freeLimit?: number;
}

export const PREMIUM_FEATURES: Record<PremiumFeature, FeatureDefinition> = {
  unlimited_saves: {
    id: 'unlimited_saves',
    name: 'Unlimited Saves',
    description: 'Save as many readings and insights as you want',
    freeLimit: 10,
  },
  celtic_cross: {
    id: 'celtic_cross',
    name: 'Celtic Cross Spread',
    description: 'The ultimate 10-card spread for deep insight',
  },
  three_card: {
    id: 'three_card',
    name: 'Three Card Spread',
    description: 'Past, present, future readings',
  },
  compatibility_full: {
    id: 'compatibility_full',
    name: 'Full Compatibility',
    description: 'Complete partner compatibility analysis',
  },
  deep_interpretations: {
    id: 'deep_interpretations',
    name: 'Deep Interpretations',
    description: 'Extended meanings and personalized guidance',
  },
  guided_prompts: {
    id: 'guided_prompts',
    name: 'Guided Prompts',
    description: 'AI-crafted reflection prompts based on your readings',
  },
  journal_insights: {
    id: 'journal_insights',
    name: 'Journal Insights',
    description: 'Advanced mood tracking and pattern analysis',
  },
  personalization: {
    id: 'personalization',
    name: 'Personalization Engine',
    description: 'Content tailored to your tone and goals',
  },
  birth_chart: {
    id: 'birth_chart',
    name: 'Birth Chart Analysis',
    description: 'Complete astrological birth chart breakdown',
  },
};

export const FREE_TIER = {
  saves: 10,
  spreads: ['single'] as const,
  quizBasicResults: true,
  dailyHoroscope: true,
  dailyTarot: true,
};

export const PREMIUM_TIER = {
  saves: Infinity,
  spreads: ['single', 'three-card', 'celtic-cross'] as const,
  quizFullResults: true,
  allHoroscopes: true,
  unlimitedTarot: true,
  compatibility: true,
  deepInterpretations: true,
  guidedPrompts: true,
  journalInsights: true,
  personalization: true,
  birthChart: true,
};

export function canAccessFeature(isPremium: boolean, feature: PremiumFeature): boolean {
  if (isPremium) return true;

  const freeFeatures: PremiumFeature[] = [];
  return freeFeatures.includes(feature);
}

export function canAccessSpread(isPremium: boolean, spreadType: string): boolean {
  if (isPremium) return true;
  return FREE_TIER.spreads.includes(spreadType as typeof FREE_TIER.spreads[number]);
}

export function canSaveMore(isPremium: boolean, currentSaveCount: number): boolean {
  if (isPremium) return true;
  return currentSaveCount < FREE_TIER.saves;
}

export function getRemainingFreeSaves(isPremium: boolean, currentSaveCount: number): number {
  if (isPremium) return Infinity;
  return Math.max(0, FREE_TIER.saves - currentSaveCount);
}

export function getFeatureBlockedMessage(feature: PremiumFeature): string {
  const def = PREMIUM_FEATURES[feature];
  return `${def.name} is a Premium feature. Upgrade to unlock ${def.description.toLowerCase()}.`;
}
