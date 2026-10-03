/**
 * What a tarot spread and its positions are called, by the spread's stable
 * id — one rule for the reveal, a saved reading and a shared link.
 *
 * Ids come in three families:
 *   - the six LEGACY ids (`single`, `three-card`, `celtic-cross`,
 *     `relationship`, `career`, `shadow`), named by readings.spreads.* and
 *     readings.spreadPositions.* in every locale;
 *   - CATALOGUE slugs (src/data/tarotSpreads.ts), named by
 *     spreads.catalog.<slug>.{name,positions.<i>} with the English data as
 *     the default;
 *   - `custom:<uuid>`, a spread the reader built: its names live in their
 *     account, so anyone else sees "Custom spread" and numbered positions.
 *
 * The shared page used to look positions up by catalogue slug only, so the
 * three most common readings (`single`, `three-card`, `relationship`)
 * showed "Position 1 / 2 / 3", and a custom spread's title was its uuid.
 */
import { getSpreadBySlug } from '../../../data/tarotSpreads';
import { getSpreadPositions } from '../../../services/readingInterpretation';

type T = (key: string, opts?: Record<string, unknown>) => string;

/** Legacy id → its key under readings.spreads.* */
export const LEGACY_SPREAD_KEY: Record<string, string> = {
  single: 'single',
  'three-card': 'threeCard',
  'celtic-cross': 'celticCross',
  relationship: 'relationship',
  career: 'careerSpread',
  shadow: 'shadow',
};

/** Catalogue slugs that are the same spread as a legacy id (TarotSection casts them as the legacy id). */
const CATALOGUE_ALIAS: Record<string, string> = {
  'one-card-daily': 'single',
  'three-card-past-present-future': 'three-card',
  'relationship-cross': 'relationship',
};

export function isCustomSpreadId(id: string): boolean {
  return id.startsWith('custom:');
}

/**
 * The spread's title. The daily draw is named as the hero names it — its
 * catalogue name carries a numeral ("1-card daily") set in a display serif.
 */
export function tarotSpreadTitle(t: T, spreadId: string): string {
  const id = CATALOGUE_ALIAS[spreadId] ?? spreadId;
  if (id === 'single') return t('readings.dailyDraw.title');
  const legacy = LEGACY_SPREAD_KEY[id];
  if (legacy) return t(`readings.spreads.${legacy}.name`);
  if (isCustomSpreadId(id)) return t('readings.customSpread', { defaultValue: 'Custom spread' });
  const catalogue = getSpreadBySlug(id);
  if (catalogue) return t(`spreads.catalog.${catalogue.slug}.name`, { defaultValue: catalogue.name });
  return t('readings.customSpread', { defaultValue: 'Custom spread' });
}

/** Position `index` (0-based) of the spread, localized; "Position n" when the spread has no name for it. */
export function tarotPositionLabel(t: T, spreadId: string, index: number): string {
  const id = CATALOGUE_ALIAS[spreadId] ?? spreadId;
  const generic = () => t('readings.positions.generic', { index: index + 1 });
  if (id === 'single') return t('readings.positions.yourCard');
  if (id === 'three-card') {
    const key = (['past', 'present', 'future'] as const)[index];
    return key ? t(`readings.positions.${key}`) : generic();
  }
  if (LEGACY_SPREAD_KEY[id]) return getSpreadPositions(id)[index] || generic();
  const catalogue = getSpreadBySlug(id);
  const position = catalogue?.positions[index];
  if (catalogue && position) {
    return t(`spreads.catalog.${catalogue.slug}.positions.${index}`, { defaultValue: position.name });
  }
  return generic();
}
