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

export async function checkAchievementProgress(
  userId: string,
  activityType: string,
  increment: number = 1
): Promise<UnlockedAchievement[]> {
  try {
    const { data, error } = await supabase.rpc('check_achievement_progress', {
      p_user_id: userId,
      p_activity_type: activityType,
      p_increment: increment,
    });

    if (error) {
      console.error('Error checking achievement progress:', error);
      return [];
    }

    return (data || []).filter((a: UnlockedAchievement) => a.newly_unlocked);
  } catch (error) {
    console.error('Failed to check achievement progress:', error);
    return [];
  }
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

    return (data || []).filter((a: UnlockedAchievement) => a.newly_unlocked);
  } catch (error) {
    console.error('Failed to check level milestones:', error);
    return [];
  }
}

export async function unlockAchievement(
  userId: string,
  achievementId: string
): Promise<{ success: boolean; xp_awarded: number; achievement_name: string; rarity: AchievementRarity } | null> {
  try {
    const { data, error } = await supabase.rpc('unlock_achievement', {
      p_user_id: userId,
      p_achievement_id: achievementId,
    });

    if (error) {
      console.error('Error unlocking achievement:', error);
      return null;
    }

    return data?.[0] || null;
  } catch (error) {
    console.error('Failed to unlock achievement:', error);
    return null;
  }
}

// Card-specific achievement tracking
const CARD_ACHIEVEMENTS: Record<string, { name: string; target: number }> = {
  'The Chariot': { name: 'Lucky Seven', target: 7 },
  'The Tower': { name: 'Tower Moment', target: 1 },
  'The Fool': { name: 'Fools Journey', target: 3 },
};

export async function checkSpecificCardAchievement(userId: string, cardName: string): Promise<void> {
  const mapping = CARD_ACHIEVEMENTS[cardName];
  if (!mapping) return;
  try {
    const { data: achievement } = await supabase
      .from('achievements')
      .select('id')
      .eq('name', mapping.name)
      .maybeSingle();

    if (!achievement) {
      // Fallback: try via activity_type
      await checkAchievementProgress(userId, 'specific_card_drawn');
      return;
    }

    const { data: userAch } = await supabase
      .from('user_achievements')
      .select('progress, unlocked_at')
      .eq('user_id', userId)
      .eq('achievement_id', achievement.id)
      .maybeSingle();

    if (userAch?.unlocked_at) return; // Already unlocked

    const newProgress = (userAch?.progress || 0) + 1;
    const nowUnlocked = newProgress >= mapping.target;

    if (userAch) {
      await supabase
        .from('user_achievements')
        .update({ progress: newProgress, unlocked_at: nowUnlocked ? new Date().toISOString() : null })
        .eq('user_id', userId)
        .eq('achievement_id', achievement.id);
    } else {
      await supabase
        .from('user_achievements')
        .insert({ user_id: userId, achievement_id: achievement.id, progress: newProgress, target: mapping.target, unlocked_at: nowUnlocked ? new Date().toISOString() : null });
    }
  } catch (e) {
    console.error('Failed to check specific card achievement:', e);
  }
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

export async function updateAchievementProgress(
  userId: string,
  achievementId: string,
  progress: number
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_achievements')
      .upsert({
        user_id: userId,
        achievement_id: achievementId,
        progress,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,achievement_id',
      });

    if (error) {
      console.error('Error updating achievement progress:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to update achievement progress:', error);
    return false;
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
    common: 'shadow-mystic-400/30',
    rare: 'shadow-blue-400/40',
    epic: 'shadow-fuchsia-400/50',
    legendary: 'shadow-amber-400/60',
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
