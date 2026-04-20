/**
 * Runtime accessors for the localized daily-insight templates + context
 * vocabulary. Each getter falls back to the hard-coded English arrays in
 * `data/zodiacContent.ts` so existing behavior is preserved if a translation
 * key is missing.
 *
 * Called from `services/dailyContent.ts`.
 */
import i18n from './config';

function arr(key: string, fallback: readonly string[]): string[] {
  const v = i18n.t(key, { ns: 'app', returnObjects: true, defaultValue: fallback });
  return Array.isArray(v) ? (v as string[]) : [...fallback];
}

function obj<T>(key: string, fallback: T): T {
  const v = i18n.t(key, { ns: 'app', returnObjects: true, defaultValue: fallback });
  return (v && typeof v === 'object') ? (v as T) : fallback;
}

interface PlanetEntry { theme: string; positive: string; focus: string; }
interface DayThemeEntry { theme: string; focus: string; energy: string; }
interface ElementEntry { energy: string; advice: string; challenge: string; }

export const dailyI18n = {
  general:          (f: readonly string[]) => arr('dailyInsights.general', f),
  love:             (f: readonly string[]) => arr('dailyInsights.love', f),
  career:           (f: readonly string[]) => arr('dailyInsights.career', f),
  wellness:         (f: readonly string[]) => arr('dailyInsights.wellness', f),
  reflection:       (f: readonly string[]) => arr('dailyInsights.reflection', f),
  shadow:           (f: readonly string[]) => arr('dailyInsights.shadow', f),
  caution:          (f: readonly string[]) => arr('dailyInsights.caution', f),
  ritual:           (f: readonly string[]) => arr('dailyInsights.ritual', f),
  moodDescriptors:  (f: readonly string[]) => arr('dailyInsights.moodDescriptors', f),
  actionSteps:      (f: readonly string[]) => arr('dailyInsights.actionSteps', f),
  focusAreas:       (f: readonly string[]) => arr('dailyInsights.focusAreas', f),
  loveActions:      (f: readonly string[]) => arr('dailyInsights.loveActions', f),
  workActivities:   (f: readonly string[]) => arr('dailyInsights.workActivities', f),
  selfCareActivities:(f: readonly string[]) => arr('dailyInsights.selfCareActivities', f),
  careerActions:    (f: readonly string[]) => arr('dailyInsights.careerActions', f),
  aspirations:      (f: readonly string[]) => arr('dailyInsights.aspirations', f),
  approaches:       (f: readonly string[]) => arr('dailyInsights.approaches', f),
  healingActivities:(f: readonly string[]) => arr('dailyInsights.healingActivities', f),
  nurturing:        (f: readonly string[]) => arr('dailyInsights.nurturing', f),
  healthFocuses:    (f: readonly string[]) => arr('dailyInsights.healthFocuses', f),
  colors:           (f: readonly string[]) => arr('dailyInsights.colors', f),
  planet(key: string, fallback: PlanetEntry): PlanetEntry {
    return obj<PlanetEntry>(`dailyInsights.planets.${key}`, fallback);
  },
  dayTheme(idx: number, fallback: DayThemeEntry): DayThemeEntry {
    const list = obj<DayThemeEntry[]>('dailyInsights.dayThemes', []);
    return list[idx] ?? fallback;
  },
  element(key: string, fallback: ElementEntry): ElementEntry {
    return obj<ElementEntry>(`dailyInsights.elements.${key}`, fallback);
  },
};
