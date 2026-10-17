import { supabase } from '../lib/supabase';

export type AchievementCategory = 'exploration' | 'mastery' | 'dedication' | 'milestones' | 'special';
export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon_name: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  xp_reward: number;
  unlock_condition: {
    activity_type: string;
    target: number;
    [key: string]: unknown;
  };
  is_premium_only: boolean;
  is_hidden: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  progress: number;
  target: number;
  unlocked_at: string | null;
  notified: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  achievement?: Achievement;
}

export interface AchievementWithProgress extends Achievement {
  progress: number;
  target: number;
  unlocked_at: string | null;
  notified: boolean;
}

export interface AchievementStats {
  total_achievements: number;
  unlocked_achievements: number;
  completion_percentage: number;
  total_xp_from_achievements: number;
  category_stats: Record<string, { total: number; unlocked: number }>;
  rarity_stats: Record<string, { total: number; unlocked: number }>;
}

export interface UnlockedAchievement {
  achievement_id: string;
  achievement_name: string;
  xp_reward: number;
  rarity: AchievementRarity;
  newly_unlocked: boolean;
}

export async function getAllAchievements(): Promise<Achievement[]> {
  try {
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .eq('is_active', true)
      .order('category')
      .order('sort_order');

    if (error) {
      console.error('Error fetching achievements:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch achievements:', error);
    return [];
  }
}

export async function getUserAchievements(userId: string): Promise<AchievementWithProgress[]> {
  try {
    const { data: achievements, error: achievementsError } = await supabase
      .from('achievements')
      .select('*')
      .eq('is_active', true)
      .order('category')
      .order('sort_order');

    if (achievementsError) {
      console.error('Error fetching achievements:', achievementsError);
      return [];
    }

    const { data: userProgress, error: progressError } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId);

    if (progressError) {
      console.error('Error fetching user achievements:', progressError);
      return [];
    }

    const progressMap = new Map<string, UserAchievement>();
    userProgress?.forEach(ua => {
      progressMap.set(ua.achievement_id, ua);
    });

    return (achievements || []).map(achievement => {
      const progress = progressMap.get(achievement.id);
      return {
        ...achievement,
        progress: progress?.progress || 0,
        target: progress?.target || achievement.unlock_condition?.target || 1,
        unlocked_at: progress?.unlocked_at || null,
        notified: progress?.notified || false,
      };
    });
  } catch (error) {
    console.error('Failed to fetch user achievements:', error);
    return [];
  }
}

export async function getAchievementsByCategory(
  userId: string,
  category: AchievementCategory
): Promise<AchievementWithProgress[]> {
  const achievements = await getUserAchievements(userId);
  return achievements.filter(a => a.category === category);
}

export async function getUnlockedAchievements(userId: string): Promise<AchievementWithProgress[]> {
  const achievements = await getUserAchievements(userId);
  return achievements.filter(a => a.unlocked_at !== null);
}

export async function getUnnotifiedAchievements(userId: string): Promise<AchievementWithProgress[]> {
  try {
    const { data, error } = await supabase
      .from('user_achievements')
      .select(`
        *,
        achievement:achievements(*)
      `)
      .eq('user_id', userId)
      .not('unlocked_at', 'is', null)
      .eq('notified', false);

    if (error) {
      console.error('Error fetching unnotified achievements:', error);
      return [];
    }

    return (data || []).map(ua => ({
      ...ua.achievement,
      progress: ua.progress,
      target: ua.target,
      unlocked_at: ua.unlocked_at,
      notified: ua.notified,
    }));
  } catch (error) {
    console.error('Failed to fetch unnotified achievements:', error);
    return [];
  }
}

export async function markAchievementNotified(
  userId: string,
  achievementId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('mark_achievement_notified', {
      p_user_id: userId,
      p_achievement_id: achievementId,
    });

    if (error) {
      console.error('Error marking achievement notified:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Failed to mark achievement notified:', error);
    return false;
  }
}

/**
 * Tell the server something happened. The call is only a trigger
 * (migration 20261003000018): the server re-derives every badge from its own
 * records — the XP ledger award_xp writes, the ritual rows, quiz_results, the
 * profile — so repeating a call changes nothing, `increment` is ignored, and
 * an unlock happens (and pays its XP) once.
 *
 * Facts only the device sees are kept as claims and need `value`:
 *  - reading facts — the spread id (spread_types_used), the card's canonical
 *    English name (specific_card_drawn), the playing-card spread slug, and the
 *    bare celtic_cross / cartomancy / new-year / witching-hour reports — count
 *    once matched to the reading's own reading_complete XP row, so report
 *    them for the reading awardXP(user, 'reading_complete') was called for;
 *  - morning_ritual / evening_ritual count once matched to the ritual's
 *    ritual_complete XP row;
 *  - views (cards_explored with the card id, zodiac_signs_viewed with the
 *    sign id, cartomancy_lesson_complete with the lesson slug) count once per
 *    distinct value, at a bounded number per UTC day.
 * Only badges unlocked by this call come back.
 */
export async function checkAchievementProgress(
  userId: string,
  activityType: string,
  increment: number = 1,
  value?: string
): Promise<UnlockedAchievement[]> {
  try {
    const { data, error } = await supabase.rpc('check_achievement_progress', {
      p_user_id: userId,
      p_activity_type: activityType,
      p_increment: increment,
      p_value: value ?? null,
    });

    if (error) {
      console.error('Error checking achievement progress:', error);
      return [];
    }

    const unlocked = (data || []).filter((a: UnlockedAchievement) => a.newly_unlocked);
    if (unlocked.length) announceUnlock();
    return unlocked;
  } catch (error) {
    console.error('Failed to check achievement progress:', error);
    return [];
  }
}

/**
 * Broadcast that something newly unlocked so the app-shell celebration
 * drainer (GlobalAchievementCelebration) can fire the unlock modal from ANY
 * screen. Before this, celebrations only played inside AchievementsPage —
 * unlocks earned mid-session anywhere else showed nothing.
 */
export const ACHIEVEMENT_UNLOCKED_EVENT = 'achievement:unlocked';
function announceUnlock(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ACHIEVEMENT_UNLOCKED_EVENT));
}

export async function checkLevelMilestones(
  userId: string,
  newLevel: number,
  totalXp: number,
  seekerRank: string
): Promise<UnlockedAchievement[]> {
  try {
    const { data, error } = await supabase.rpc('check_level_milestones', {
      p_user_id: userId,
      p_new_level: newLevel,
      p_total_xp: totalXp,
      p_seeker_rank: seekerRank,
    });

    if (error) {
      console.error('Error checking level milestones:', error);
      return [];
    }

    const unlocked = (data || []).filter((a: UnlockedAchievement) => a.newly_unlocked);
    if (unlocked.length) announceUnlock();
    return unlocked;
  } catch (error) {
    console.error('Failed to check level milestones:', error);
    return [];
  }
}

/**
 * A drawn card is reported as a `specific_card_drawn` event with the card
 * name; the server counts it only against badges whose unlock_condition
 * names that card (The Chariot, The Tower, The Fool in the seed), once per
 * reading the XP ledger recorded (20261003000018). This used to write
 * user_achievements directly from the client — a write any user could point
 * at any badge — and that privilege is revoked (20261003000003).
 */
export async function checkSpecificCardAchievement(userId: string, cardName: string): Promise<void> {
  if (!cardName) return;
  await checkAchievementProgress(userId, 'specific_card_drawn', 1, cardName);
}

/*
 * Value reporters for the badges that count WHICH thing, not how many times.
 * Each sends the stable value the server compares against the seed
 * (20260127070447); a bare checkAchievementProgress call with no value cannot
 * advance these badges (20261003000018 ignores it).
 *
 * Counter activities (reading_complete, reading_saved, horoscope_viewed,
 * quiz_complete, journal_entry, ritual_complete, community_*) are counted
 * from the XP ledger: awardXP() in services/levelSystem.ts pays the activity
 * and then triggers the re-derivation. A second report of the same type no
 * longer counts twice (p7 #36), but it is a wasted round trip.
 */

/** The five quiz types the "Quiz Master" set lists — Quiz.type values in src/data. */
export const QUIZ_MASTER_TYPES = ['mbti', 'love-language', 'big-five', 'enneagram', 'attachment'] as const;
/** The three spreads the "Spread Explorer" set lists — tarot spread ids. */
export const SPREAD_EXPLORER_TYPES = ['single', 'three-card', 'celtic-cross'] as const;

/**
 * A quiz was completed: `quizType` is the quiz's `type` ('mbti',
 * 'love-language', 'big-five', 'enneagram', 'attachment' count toward Quiz
 * Master; any other type is ignored). Call once per completion, next to
 * awardXP(user, 'quiz_complete').
 */
export async function reportQuizTypeComplete(userId: string, quizType: string): Promise<UnlockedAchievement[]> {
  if (!(QUIZ_MASTER_TYPES as readonly string[]).includes(quizType)) return [];
  return checkAchievementProgress(userId, 'quiz_types_complete', 1, quizType);
}

/**
 * A tarot spread was laid: `spreadType` is the spread id ('single',
 * 'three-card', 'celtic-cross' count toward Spread Explorer).
 */
export async function reportSpreadTypeUsed(userId: string, spreadType: string): Promise<UnlockedAchievement[]> {
  if (!(SPREAD_EXPLORER_TYPES as readonly string[]).includes(spreadType)) return [];
  return checkAchievementProgress(userId, 'spread_types_used', 1, spreadType);
}

/** Cards this session has already reported, so swiping back and forth costs one call per card. */
const exploredThisSession = new Set<string>();

/**
 * A tarot card's detail was viewed — opened from the library OR reached by
 * swiping in the detail view. `cardId` is the tarot card id (0–77); the
 * server counts DISTINCT ids toward Library Scholar (22) and Card Master (78).
 */
export async function reportCardExplored(userId: string, cardId: number): Promise<UnlockedAchievement[]> {
  if (!Number.isInteger(cardId) || cardId < 0 || cardId > 77) return [];
  const key = `${userId}:${cardId}`;
  if (exploredThisSession.has(key)) return [];
  exploredThisSession.add(key);
  const unlocked = await checkAchievementProgress(userId, 'cards_explored', 1, String(cardId));
  return unlocked;
}

/**
 * A zodiac sign's page or horoscope was viewed: `sign` is the English sign
 * id in lower case ('aries' … 'pisces'); the server counts distinct signs
 * toward the 12-sign badge.
 */
export async function reportZodiacSignViewed(userId: string, sign: string): Promise<UnlockedAchievement[]> {
  const id = sign.trim().toLowerCase();
  if (!/^(aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)$/.test(id)) return [];
  return checkAchievementProgress(userId, 'zodiac_signs_viewed', 1, id);
}

export async function getAchievementStats(userId: string): Promise<AchievementStats | null> {
  try {
    const { data, error } = await supabase.rpc('get_user_achievement_stats', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Error fetching achievement stats:', error);
      return null;
    }

    return data?.[0] || null;
  } catch (error) {
    console.error('Failed to fetch achievement stats:', error);
    return null;
  }
}

export async function initializeUserAchievements(userId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('initialize_user_achievements', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Error initializing user achievements:', error);
    }
  } catch (error) {
    console.error('Failed to initialize user achievements:', error);
  }
}

export async function generateShareCode(
  userId: string,
  achievementId: string
): Promise<string | null> {
  try {
    const { data: existing } = await supabase
      .from('achievement_shares')
      .select('share_code')
      .eq('user_id', userId)
      .eq('achievement_id', achievementId)
      .maybeSingle();

    if (existing?.share_code) {
      return existing.share_code;
    }

    const { data, error } = await supabase
      .from('achievement_shares')
      .insert({
        user_id: userId,
        achievement_id: achievementId,
      })
      .select('share_code')
      .single();

    if (error) {
      console.error('Error generating share code:', error);
      return null;
    }

    return data?.share_code || null;
  } catch (error) {
    console.error('Failed to generate share code:', error);
    return null;
  }
}

export function getCategoryDisplayName(category: AchievementCategory): string {
  const names: Record<AchievementCategory, string> = {
    exploration: 'Exploration',
    mastery: 'Mastery',
    dedication: 'Dedication',
    milestones: 'Milestones',
    special: 'Special',
  };
  return names[category];
}

export function getCategoryIcon(category: AchievementCategory): string {
  const icons: Record<AchievementCategory, string> = {
    exploration: 'compass',
    mastery: 'target',
    dedication: 'flame',
    milestones: 'flag',
    special: 'star',
  };
  return icons[category];
}

export function getRarityColor(rarity: AchievementRarity): string {
  const colors: Record<AchievementRarity, string> = {
    common: 'text-mystic-400',
    rare: 'text-blue-400',
    epic: 'text-fuchsia-400',
    legendary: 'text-amber-400',
  };
  return colors[rarity];
}

export function getRarityGlow(rarity: AchievementRarity): string {
  const glows: Record<AchievementRarity, string> = {
    common: 'border-mystic-400/30',
    rare: 'border-blue-400/40',
    epic: 'border-fuchsia-400/50',
    legendary: 'border-amber-400/60',
  };
  return glows[rarity];
}

export function getRarityBorder(rarity: AchievementRarity): string {
  const borders: Record<AchievementRarity, string> = {
    common: 'border-mystic-600',
    rare: 'border-blue-500/50',
    epic: 'border-fuchsia-500/50',
    legendary: 'border-amber-500/50',
  };
  return borders[rarity];
}

export function getRarityBackground(rarity: AchievementRarity): string {
  const backgrounds: Record<AchievementRarity, string> = {
    common: 'from-mystic-700/30 to-mystic-800/30',
    rare: 'from-blue-900/30 to-mystic-800/30',
    epic: 'from-fuchsia-900/30 to-mystic-800/30',
    legendary: 'from-amber-900/30 to-mystic-800/30',
  };
  return backgrounds[rarity];
}
