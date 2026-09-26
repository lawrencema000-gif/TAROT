/**
 * House themes, keyed for i18n. `HOUSE_THEMES` in types/astrology.ts is the
 * English data array other surfaces still read; the wheel and the birth-chart
 * sheets read these keys so the twelve labels can be translated (Phase 5d).
 */
export const HOUSE_THEME_DEFAULTS: string[] = [
  'Self and identity',
  'Values and possessions',
  'Communication and learning',
  'Home and family',
  'Creativity and romance',
  'Health and service',
  'Partnerships',
  'Transformation and shared resources',
  'Philosophy and travel',
  'Career and public image',
  'Community and aspirations',
  'Spirituality and the subconscious',
];

type Translate = (key: string, options?: Record<string, unknown>) => unknown;

/** Localised theme for house `n` (1–12). */
export function houseTheme(t: Translate, n: number): string {
  const fallback = HOUSE_THEME_DEFAULTS[n - 1] ?? '';
  return String(t(`chartWheel.houseThemes.${n}`, { defaultValue: fallback }));
}
