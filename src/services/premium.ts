import { getSpreadBySlug } from '../data/tarotSpreads';

export type PremiumFeature =
  | 'unlimited_saves'
  | 'celtic_cross'
  | 'three_card'
  | 'compatibility_full'
  | 'deep_interpretations'
  | 'guided_prompts'
  | 'journal_insights'
  | 'personalization'
  | 'birth_chart'
  | 'extra_reading';

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
  extra_reading: {
    id: 'extra_reading',
    name: 'Extra Reading',
    description: 'One additional tarot reading beyond your daily limit',
    freeLimit: 3,
  },
};

export const FREE_TIER = {
  saves: 10,
  spreads: ['single'] as const,
  dailyReadings: 3,
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

/** Catalogue spreads of this many cards or fewer are free; the rest are `deep_interpretations`. */
export const FREE_CATALOGUE_CARD_LIMIT = 3;

/**
 * The premium feature a spread id sits behind, or null when it is free.
 *
 * Three families of id reach here: the six legacy ids (`single`,
 * `three-card`, …), the tarot catalogue's forty slugs
 * (src/data/tarotSpreads.ts — castable since Phase 7; free up to three
 * cards, `deep_interpretations` above, so an ad can unlock one reading),
 * and the cartomancy spreads (`carto-*`, src/data/cartomancy — the five big
 * ones are `deep_interpretations`, the one-, three-card and yes/no are
 * free). Custom spreads (`custom:<uuid>`) are free and never reach here.
 */
export function spreadTypeToFeature(spreadType: string): PremiumFeature | null {
  switch (spreadType) {
    case 'celtic-cross':
      return 'celtic_cross';
    case 'three-card':
      return 'three_card';
    case 'relationship':
    case 'career':
    case 'shadow':
    case 'carto-horseshoe':
    case 'carto-nine-square':
    case 'carto-romany':
    case 'carto-wish':
    case 'carto-relationship':
      return 'deep_interpretations';
    case 'single':
    case 'carto-single':
    case 'carto-three-timeline':
    case 'carto-three-action':
    case 'carto-yes-no':
      return null;
    default: {
      const catalogue = getSpreadBySlug(spreadType);
      if (catalogue && catalogue.cardCount > FREE_CATALOGUE_CARD_LIMIT) return 'deep_interpretations';
      return null;
    }
  }
}

export function isFeatureUnlockable(feature: PremiumFeature): boolean {
  const unlockableFeatures: PremiumFeature[] = [
    'celtic_cross',
    'three_card',
    'compatibility_full',
    'deep_interpretations',
    'guided_prompts',
    'journal_insights',
    'birth_chart',
    'extra_reading',
  ];
  return unlockableFeatures.includes(feature);
}
