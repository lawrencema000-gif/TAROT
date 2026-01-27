import { supabase } from '../lib/supabase';
import { toast } from '../components/ui';
import { checkAchievementProgress, type UnlockedAchievement } from './achievements';

export interface XPReward {
  xp_earned: number;
  total_xp: number;
  old_level: number;
  new_level: number;
  level_up: boolean;
  seeker_rank: string;
  unlocked_achievements?: UnlockedAchievement[];
}

export type ActivityType =
  | 'ritual_complete'
  | 'reading_saved'
  | 'reading_complete'
  | 'journal_entry'
  | 'quiz_complete'
  | 'horoscope_viewed'
  | 'streak_milestone_7'
  | 'streak_milestone_30'
  | 'streak_milestone_100'
  | 'streak_milestone_365';

const XP_REWARDS: Record<ActivityType, number> = {
  ritual_complete: 50,
  reading_saved: 10,
  reading_complete: 5,
  journal_entry: 15,
  quiz_complete: 25,
  horoscope_viewed: 5,
  streak_milestone_7: 100,
  streak_milestone_30: 500,
  streak_milestone_100: 2000,
  streak_milestone_365: 5000,
};

export async function awardXP(
  userId: string,
  activityType: ActivityType
): Promise<XPReward | null> {
  try {
    const xpAmount = XP_REWARDS[activityType];

    const { data, error } = await supabase.rpc('award_xp', {
      p_user_id: userId,
      p_activity_type: activityType,
      p_xp_amount: xpAmount,
    });

    if (error) {
      console.error('Error awarding XP:', error);
      return null;
    }

    const unlockedAchievements = await checkAchievementProgress(userId, activityType);

    return {
      ...(data as XPReward),
      unlocked_achievements: unlockedAchievements,
    };
  } catch (error) {
    console.error('Failed to award XP:', error);
    return null;
  }
}

export async function getLevelThresholds(): Promise<Map<number, number>> {
  try {
    const { data, error } = await supabase
      .from('level_thresholds')
      .select('level, xp_required')
      .order('level');

    if (error) {
      console.error('Error fetching level thresholds:', error);
      return new Map();
    }

    const thresholds = new Map<number, number>();
    data?.forEach((row) => {
      thresholds.set(row.level, row.xp_required);
    });

    return thresholds;
  } catch (error) {
    console.error('Failed to fetch level thresholds:', error);
    return new Map();
  }
}

export function getXPForNextLevel(currentLevel: number, thresholds: Map<number, number>): number {
  const nextLevel = currentLevel + 1;
  return thresholds.get(nextLevel) || 0;
}

export function getXPProgress(
  currentXP: number,
  currentLevel: number,
  thresholds: Map<number, number>
): { current: number; required: number; percentage: number } {
  const currentLevelXP = thresholds.get(currentLevel) || 0;
  const nextLevelXP = thresholds.get(currentLevel + 1) || currentLevelXP;

  const xpIntoLevel = currentXP - currentLevelXP;
  const xpRequiredForLevel = nextLevelXP - currentLevelXP;

  const percentage = xpRequiredForLevel > 0
    ? Math.min((xpIntoLevel / xpRequiredForLevel) * 100, 100)
    : 100;

  return {
    current: xpIntoLevel,
    required: xpRequiredForLevel,
    percentage,
  };
}

export async function checkAndAwardStreakMilestone(
  userId: string,
  newStreak: number
): Promise<XPReward | null> {
  const milestones: Array<{ streak: number; type: ActivityType }> = [
    { streak: 7, type: 'streak_milestone_7' },
    { streak: 30, type: 'streak_milestone_30' },
    { streak: 100, type: 'streak_milestone_100' },
    { streak: 365, type: 'streak_milestone_365' },
  ];

  await checkAchievementProgress(userId, 'streak_achieved', newStreak);

  for (const milestone of milestones) {
    if (newStreak === milestone.streak) {
      const result = await awardXP(userId, milestone.type);
      if (result) {
        toast(
          `${milestone.streak}-day streak milestone! +${result.xp_earned} XP`,
          'success'
        );
      }
      return result;
    }
  }

  return null;
}

export async function getRecentXPActivities(
  userId: string,
  limit: number = 10
): Promise<Array<{ activity_type: string; xp_earned: number; created_at: string }>> {
  try {
    const { data, error } = await supabase
      .from('xp_activities')
      .select('activity_type, xp_earned, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching XP activities:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch XP activities:', error);
    return [];
  }
}

export function formatActivityType(activityType: string): string {
  const labels: Record<string, string> = {
    ritual_complete: 'Daily Ritual Complete',
    reading_saved: 'Reading Saved',
    reading_complete: 'Tarot Reading',
    journal_entry: 'Journal Entry',
    quiz_complete: 'Quiz Complete',
    horoscope_viewed: 'Horoscope Viewed',
    streak_milestone_7: '7-Day Streak Milestone',
    streak_milestone_30: '30-Day Streak Milestone',
    streak_milestone_100: '100-Day Streak Milestone',
    streak_milestone_365: '365-Day Streak Milestone',
  };

  return labels[activityType] || activityType;
}
