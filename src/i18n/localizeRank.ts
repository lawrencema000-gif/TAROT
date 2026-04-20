/**
 * Map the canonical English seeker rank stored in profiles.seeker_rank to its
 * locale-appropriate display name via achievements.ranks.* keys.
 */
import i18n from './config';

const CANONICAL_TO_KEY: Record<string, string> = {
  'Novice Seeker': 'novice',
  'Apprentice Seeker': 'apprentice',
  'Adept Seeker': 'adept',
  'Master Seeker': 'master',
  'Oracle Seeker': 'oracle',
};

export function localizeSeekerRank(englishRank: string | null | undefined): string {
  if (!englishRank) return i18n.t('achievements.ranks.novice', { ns: 'app' });
  const key = CANONICAL_TO_KEY[englishRank];
  if (!key) return englishRank;
  return i18n.t(`achievements.ranks.${key}`, { ns: 'app', defaultValue: englishRank });
}
