/**
 * Shared types for the TarotSection sub-view components.
 *
 * Kept in a separate file so the extracted views can share them without
 * importing the parent back.
 */
import type { TarotCard } from '../../../types';
import type { SpreadCategory, SpreadLayoutPosition } from '../../../data/tarotSpreads';

export type FocusArea = 'Love' | 'Career' | 'Self' | 'Money' | 'Health' | 'General';

export type TarotView = 'home' | 'focus' | 'shuffle' | 'select' | 'reveal' | 'browse';

export const FOCUS_AREAS: FocusArea[] = ['Love', 'Career', 'Self', 'Money', 'Health', 'General'];

export const FOCUS_AREA_I18N_KEY: Record<FocusArea, string> = {
  Love: 'readings.focusAreas.love',
  Career: 'readings.focusAreas.career',
  Self: 'readings.focusAreas.self',
  Money: 'readings.focusAreas.money',
  Health: 'readings.focusAreas.health',
  General: 'readings.focusAreas.general',
};

/** A card on the table: face down until `revealed`. */
export interface DrawnCard {
  card: TarotCard;
  reversed: boolean;
  revealed: boolean;
}

/**
 * One row of the spread picker: a catalogue spread resolved to the id the
 * reading flow casts (a legacy id where the catalogue entry is the same
 * spread — `single`, `three-card`, `relationship`, `celtic-cross` — else
 * the catalogue slug), with its localized name and one-liner, the free /
 * premium rule and the glyph layout.
 */
export interface PickerSpread {
  id: string;
  slug: string;
  name: string;
  description: string;
  count: number;
  free: boolean;
  category: SpreadCategory;
  layout: SpreadLayoutPosition[];
}
