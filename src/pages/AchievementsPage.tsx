import { useState, useEffect, useMemo } from 'react';
import { Trophy, Sparkles, ChevronRight, Crown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  AchievementCard,
  CategoryProgress,
  RankProgressBar,
  AchievementStats,
  AchievementUnlockModal,
} from '../components/achievements';
import type {
  AchievementWithProgress,
  AchievementCategory,
  AchievementStats as AchievementStatsType,
} from '../services/achievements';
import {
  getUserAchievements,
  getAchievementStats,
  markAchievementNotified,
  getUnnotifiedAchievements,
  getCategoryDisplayName,
} from '../services/achievements';
import { Skeleton } from '../components/ui';
import { quizResults } from '../dal';
import { useT } from '../i18n/useT';

type FilterCategory = 'all' | AchievementCategory;

const CATEGORIES: FilterCategory[] = ['all', 'exploration', 'mastery', 'dedication', 'milestones', 'special'];

export function AchievementsPage() {
  const { t } = useT('app');
  const { user, profile, refreshProfile } = useAuth();
  const [achievements, setAchievements] = useState<AchievementWithProgress[]>([]);
  const [stats, setStats] = useState<AchievementStatsType | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('all');
  const [loading, setLoading] = useState(true);
  const [celebrationAchievement, setCelebrationAchievement] = useState<AchievementWithProgress | null>(null);
  const [unnotifiedQueue, setUnnotifiedQueue] = useState<AchievementWithProgress[]>([]);
  const [quizzesCompleted, setQuizzesCompleted] = useState(0);

  useEffect(() => {
    if (user?.id) {
      refreshProfile();
      loadAchievements();
      loadQuizCount();
    }
  }, [user?.id]);

  useEffect(() => {
    if (unnotifiedQueue.length > 0 && !celebrationAchievement) {
      const next = unnotifiedQueue[0];
      setCelebrationAchievement(next);
      setUnnotifiedQueue(prev => prev.slice(1));

      if (user?.id) {
        markAchievementNotified(user.id, next.id);
      }
    }
  }, [unnotifiedQueue, celebrationAchievement, user?.id]);

  async function loadQuizCount() {
    if (!user?.id) return;
    const res = await quizResults.countForUser(user.id);
    if (res.ok) {
      setQuizzesCompleted(res.data);
    }
  }

  async function loadAchievements() {
    if (!user?.id) return;

    setLoading(true);
    try {
      const [achievementsData, statsData, unnotified] = await Promise.all([
        getUserAchievements(user.id),
        getAchievementStats(user.id),
        getUnnotifiedAchievements(user.id),
      ]);

      setAchievements(achievementsData);
      setStats(statsData);

      if (unnotified.length > 0) {
        setUnnotifiedQueue(unnotified);
      }
    } catch (error) {
      console.error(t('achievements.errorLoading'), error);
    } finally {
      setLoading(false);
    }
  }

  const filteredAchievements = useMemo(() => {
    const filtered = selectedCategory === 'all'
      ? achievements
      : achievements.filter(a => a.category === selectedCategory);

    return filtered.sort((a, b) => {
      if (a.unlocked_at && !b.unlocked_at) return -1;
      if (!a.unlocked_at && b.unlocked_at) return 1;

      if (!a.unlocked_at && !b.unlocked_at) {
        const aProgress = a.progress / a.target;
        const bProgress = b.progress / b.target;
        if (aProgress !== bProgress) return bProgress - aProgress;
      }

      return a.sort_order - b.sort_order;
    });
  }, [achievements, selectedCategory]);

  const recentUnlocks = useMemo(() => {
    return achievements
      .filter(a => a.unlocked_at)
      .sort((a, b) => new Date(b.unlocked_at!).getTime() - new Date(a.unlocked_at!).getTime())
      .slice(0, 3);
  }, [achievements]);

  const completionPercentage = stats?.completion_percentage || 0;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (completionPercentage / 100) * circumference;

  function handleCloseCelebration() {
    setCelebrationAchievement(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-mystic-900 via-mystic-800 to-mystic-900 p-4 pb-24">
        <div className="max-w-lg mx-auto space-y-6">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <div className="flex gap-2 overflow-x-auto">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-20 rounded-xl flex-shrink-0" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-mystic-900 via-mystic-800 to-mystic-900 pb-24">
      <div className="max-w-lg mx-auto">
        <div className="relative p-6 bg-gradient-to-br from-mystic-800/80 to-mystic-900/80 border-b border-mystic-700/30">
          <div className="flex items-center gap-6">
            <div className="relative">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="text-mystic-700/30"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="url(#goldGradient)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-1000 ease-out"
                />
                <defs>
                  <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#D4AF37" />
                    <stop offset="100%" stopColor="#F5D77B" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Trophy className="w-8 h-8 text-gold mb-1" />
                <span className="text-2xl font-bold text-white">
                  {Math.round(completionPercentage)}%
                </span>
              </div>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-5 h-5 text-gold" />
                <span className="text-sm font-semibold text-gold">
                  {profile?.seekerRank || t('achievements.novicesSeeker')}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mb-1">
                {stats?.unlocked_achievements || 0} of {stats?.total_achievements || 0}
              </h2>
              <p className="text-sm text-mystic-400">
                {t('achievements.achievementsUnlocked')}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <Sparkles className="w-4 h-4 text-gold" />
                <span className="text-sm text-mystic-300">
                  {t('achievements.xpEarned', { n: (stats?.total_xp_from_achievements ?? 0).toLocaleString() })}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-6">
          <div className="bg-mystic-800/30 rounded-2xl p-4 border border-mystic-700/30">
            <RankProgressBar
              currentRank={profile?.seekerRank || t('achievements.novicesSeeker')}
              currentXP={profile?.xp || 0}
            />
          </div>

          <AchievementStats
            totalXP={profile?.xp || 0}
            streak={profile?.streak || 0}
            totalReadings={profile?.totalReadings || 0}
            totalJournalEntries={profile?.totalJournalEntries || 0}
            quizzesCompleted={quizzesCompleted}
          />

          {recentUnlocks.length > 0 && (
            <div className="bg-gradient-to-r from-gold/10 to-amber-500/10 rounded-2xl p-4 border border-gold/20">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gold flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  {t('achievements.recentUnlocks')}
                </h3>
                <ChevronRight className="w-4 h-4 text-gold/60" />
              </div>
              <div className="flex gap-3">
                {recentUnlocks.map((achievement) => (
                  <div
                    key={achievement.id}
                    className="flex-1 flex flex-col items-center gap-1 p-2 rounded-xl bg-mystic-800/30"
                  >
                    <div className="w-10 h-10 rounded-lg bg-mystic-700/30 flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-gold" />
                    </div>
                    <span className="text-[10px] text-mystic-300 text-center line-clamp-1">
                      {achievement.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 mb-4 overflow-x-auto scrollbar-hide pb-2">
              {stats?.category_stats && (
                <>
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`
                      flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all
                      ${selectedCategory === 'all'
                        ? 'bg-gold text-mystic-900'
                        : 'bg-mystic-800/50 text-mystic-400 hover:bg-mystic-700/50'
                      }
                    `}
                  >
                    {t('achievements.all')} ({stats.unlocked_achievements}/{stats.total_achievements})
                  </button>
                  {(Object.entries(stats.category_stats) as [AchievementCategory, { total: number; unlocked: number }][]).map(
                    ([category, data]) => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`
                          flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all
                          ${selectedCategory === category
                            ? 'bg-gold text-mystic-900'
                            : 'bg-mystic-800/50 text-mystic-400 hover:bg-mystic-700/50'
                          }
                        `}
                      >
                        {t(`achievements.categories.${category}`, { defaultValue: getCategoryDisplayName(category) })} ({data.unlocked}/{data.total})
                      </button>
                    )
                  )}
                </>
              )}
            </div>

            <div className="hidden">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                {stats?.category_stats && CATEGORIES.slice(1).map((category) => {
                  const data = stats.category_stats[category as AchievementCategory];
                  if (!data) return null;

                  return (
                    <CategoryProgress
                      key={category}
                      category={category as AchievementCategory}
                      unlocked={data.unlocked}
                      total={data.total}
                      isSelected={selectedCategory === category}
                      onSelect={() => setSelectedCategory(category as FilterCategory)}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredAchievements.map((achievement) => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                isPremium={profile?.isPremium || false}
              />
            ))}
          </div>

          {filteredAchievements.length === 0 && (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 text-mystic-600 mx-auto mb-4" />
              <p className="text-mystic-400">{t('achievements.noInCategory')}</p>
            </div>
          )}
        </div>
      </div>

      <AchievementUnlockModal
        achievement={celebrationAchievement}
        onClose={handleCloseCelebration}
      />
    </div>
  );
}
