import i18n from 'i18next';
import { supabase } from '../lib/supabase';
// TODO(Phase 2): services should not import from components/. The streak
// milestone notification should be emitted via an event/callback the UI
// subscribes to, not by calling `toast()` directly. Tracked under
// SCALABILITY-PLAN.md Part 3 (no upward arrows).
// eslint-disable-next-line boundaries/element-types
import { toast } from '../components/ui';
import { checkAchievementProgress, checkLevelMilestones, type UnlockedAchievement } from './achievements';

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
  | 'streak_milestone_365'
  | 'community_post'
  | 'community_comment';

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
  community_post: 15,
  community_comment: 5,
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

    const result = data as XPReward;
    const unlockedAchievements = await checkAchievementProgress(userId, activityType);

    const milestoneAchievements = await checkLevelMilestones(
      userId,
      result.new_level,
      result.total_xp,
      result.seeker_rank
    );

    return {
      ...result,
      unlocked_achievements: [...unlockedAchievements, ...milestoneAchievements],
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

/** The milestone ladder moonstone_award_streak_milestone() pays, in order. */
export const STREAK_MILESTONES = [7, 14, 30, 60, 100, 365] as const;
export type StreakMilestone = (typeof STREAK_MILESTONES)[number];

/**
 * XP exists for four of the six rungs: xp_activities.activity_type is
 * CHECK-constrained to this list (migration 20260807150000), so 14 and 60
 * pay Moonstones only until a migration adds their types.
 */
const STREAK_MILESTONE_XP: Partial<Record<StreakMilestone, ActivityType>> = {
  7: 'streak_milestone_7',
  30: 'streak_milestone_30',
  100: 'streak_milestone_100',
  365: 'streak_milestone_365',
};

/**
 * Award one streak milestone the user has just crossed.
 *
 * The caller decides what was crossed from ritual_streak()'s
 * {previous_streak, streak} — for each rung m, previous < m && streak >= m —
 * so a rung passed on a day the count moved by more than one is not lost,
 * and 14 and 60 are claimed at last. XP where a type exists; Moonstones for
 * every rung, through an RPC that is idempotent per (user, day) and checks
 * the rung against profiles.streak, which ritual_streak() has just written.
 */
export async function checkAndAwardStreakMilestone(
  userId: string,
  milestone: StreakMilestone,
): Promise<XPReward | null> {
  // The Moonstone RPC is the ledger: it pays once per (user, rung) and tells
  // us whether this call was the first. XP has no such uniqueness, so it is
  // paid only on a first award — which also makes the call safe to repeat
  // for every rung at or below the streak, in any order, from any sync.
  let moonstonesAwarded = 0;
  let fresh = false;
  try {
    const { data: streakData, error } = await supabase.rpc('moonstone_award_streak_milestone', {
      p_streak_day: milestone,
    });
    if (error) return null;
    const row = Array.isArray(streakData) ? streakData[0] : streakData;
    if (row && !row.is_duplicate && (row.amount_awarded as number) > 0) {
      fresh = true;
      moonstonesAwarded = row.amount_awarded as number;
    }
  } catch {
    return null;
  }
  if (!fresh) return null;

  const xpType = STREAK_MILESTONE_XP[milestone];
  const result = xpType ? await awardXP(userId, xpType) : null;

  const xp = result?.xp_earned ?? 0;
  const label =
    xp > 0 && moonstonesAwarded > 0
      ? i18n.t('celebration.streak.milestoneToastMoonstones', {
          ns: 'app',
          defaultValue: '{{days}}-day streak. +{{xp}} XP · +{{moonstones}} Moonstones',
          days: milestone,
          xp,
          moonstones: moonstonesAwarded,
        })
      : xp > 0
        ? i18n.t('celebration.streak.milestoneToast', {
            ns: 'app',
            defaultValue: '{{days}}-day streak. +{{xp}} XP',
            days: milestone,
            xp,
          })
        : moonstonesAwarded > 0
          ? i18n.t('celebration.streak.milestoneToastMoonstonesOnly', {
              ns: 'app',
              defaultValue: '{{days}}-day streak. +{{moonstones}} Moonstones',
              days: milestone,
              moonstones: moonstonesAwarded,
            })
          : null;
  if (label) toast(label, 'success');

  return result;
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
