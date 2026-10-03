import type { AchievementWithProgress, AchievementRarity } from '../../services/achievements';

type TFn = (key: string, opts?: Record<string, unknown>) => unknown;

/**
 * The i18n key for a definition. The `achievements` table has no slug
 * column, so the stable key is a kebab of its English `name` — the seed
 * (20260127070447) and the cartomancy set (20261003000008) insert by name
 * and the admin never renames a row. "Fools Journey" → `fools-journey`,
 * "The Joker’s Laugh" → `the-jokers-laugh`.
 */
export function achievementSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * The DB row with its name and description read through the locale — the
 * one mapping for every surface that shows a definition (the Achievements
 * page AND the app-wide unlock celebration, which used to pass the raw
 * English row).
 */
export function localizeAchievement(a: AchievementWithProgress, t: TFn): AchievementWithProgress {
  const slug = achievementSlug(a.name);
  return {
    ...a,
    name: t(`achievements.defs.${slug}.name`, { defaultValue: a.name }) as string,
    description: t(`achievements.defs.${slug}.description`, { defaultValue: a.description }) as string,
  };
}

const RARITY_EN: Record<AchievementRarity, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

export function rarityLabel(rarity: AchievementRarity, t: TFn): string {
  return t(`achievements.rarity.${rarity}`, { defaultValue: RARITY_EN[rarity] ?? rarity }) as string;
}
