/**
 * Shared types for the split TarotSection sub-view components.
 *
 * These mirror what TarotSection.tsx (the legacy monolith) defines inline.
 * Kept in a separate file so the extracted views can share them without
 * importing the monolith back, avoiding a circular dependency when the flag
 * rollout progresses.
 */

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
