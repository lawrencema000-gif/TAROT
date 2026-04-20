/**
 * Locale lookup for premium feature labels. The canonical English strings
 * live in services/premium.ts (PREMIUM_FEATURES); this module pulls the
 * locale-appropriate name/description from app.json at render time.
 *
 * Usage in UI:
 *   const { name, description } = localizedFeature(PREMIUM_FEATURES[feature]);
 */
import i18n from './config';
import type { FeatureDefinition, PremiumFeature } from '../services/premium';

interface LocalizedFeature {
  id: PremiumFeature;
  name: string;
  description: string;
  freeLimit?: number;
}

export function localizedFeature(def: FeatureDefinition): LocalizedFeature {
  const name = i18n.t(`premium.features.${def.id}.name`, {
    ns: 'app',
    defaultValue: def.name,
  });
  const description = i18n.t(`premium.features.${def.id}.description`, {
    ns: 'app',
    defaultValue: def.description,
  });
  return {
    id: def.id,
    name,
    description,
    freeLimit: def.freeLimit,
  };
}

export function localizedFeatureName(id: PremiumFeature): string {
  return i18n.t(`premium.features.${id}.name`, {
    ns: 'app',
    defaultValue: id,
  });
}
