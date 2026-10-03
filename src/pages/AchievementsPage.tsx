import { useState, useEffect, useMemo, useCallback } from 'react';
import { Trophy, Crown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { localizeSeekerRank } from '../i18n/localizeRank';
import {
  AchievementCard,
  RankProgressBar,
  AchievementStats,
  AchievementUnlockModal,
} from '../components/achievements';
import { achievementIcon } from '../components/achievements/achievementIcons';
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
import { Skeleton, EmptyState, PageHeader, Page, ProgressRing, Chip, Card, Section, ListRow, ListRowGroup } from '../components/ui';
import { quizResults } from '../dal';
import { useT } from '../i18n/useT';
import { getLocale } from '../i18n/config';

type FilterCategory = 'all' | AchievementCategory;

/**
 * The i18n key for a definition. The `achievements` table has no slug
 * column, so the stable key is a kebab of its English `name` — the seed
 * (20260127070447) inserts by name and the admin never renames a row.
 * "Fools Journey" → `fools-journey`, "Level 50 Club" → `level-50-club`.
 * A definition without a key (B3's cartomancy set lands in another
 * migration) falls through to the DB text via defaultValue.
 */
export function achievementSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

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
  const fmt = useMemo(() => new Intl.NumberFormat(getLocale()), []);
  const dayFmt = useMemo(() => new Intl.DateTimeFormat(getLocale(), { month: 'short', day: 'numeric' }), []);

  /** The DB row with its name and description read through the locale. */
  const localize = useCallback(
    (a: AchievementWithProgress): AchievementWithProgress => {
      const slug = achievementSlug(a.name);
      return {
        ...a,
        name: t(`achievements.defs.${slug}.name`, { defaultValue: a.name }),
        description: t(`achievements.defs.${slug}.description`, { defaultValue: a.description }),
      };
    },
    [t],
  );

  useEffect(() => {
    if (user?.id) {
      refreshProfile();
      loadAchievements();
      loadQuizCount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      console.error('[Achievements] load failed:', error);
    } finally {
      setLoading(false);
    }
  }

  const localized = useMemo(() => achievements.map(localize), [achievements, localize]);

  const filteredAchievements = useMemo(() => {
    const filtered = selectedCategory === 'all'
      ? localized
      : localized.filter(a => a.category === selectedCategory);

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
  }, [localized, selectedCategory]);

  const recentUnlocks = useMemo(() => {
    return localized
      .filter(a => a.unlocked_at)
      .sort((a, b) => new Date(b.unlocked_at!).getTime() - new Date(a.unlocked_at!).getTime())
      .slice(0, 3);
  }, [localized]);

  const completionPercentage = stats?.completion_percentage || 0;

  function handleCloseCelebration() {
    setCelebrationAchievement(null);
  }

  if (loading) {
    return (
      <Page spacing="md">
        <PageHeader title={t('pageTitles.achievements.title')} />
        <Skeleton className="h-40 rounded-card" />
        <Skeleton className="h-24 rounded-card" />
        <div className="grid grid-cols-5 gap-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-control" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-card" />
          ))}
        </div>
      </Page>
    );
  }

  const categoryEntries = stats?.category_stats
    ? (Object.entries(stats.category_stats) as [AchievementCategory, { total: number; unlocked: number }][])
    : [];

  return (
    <Page spacing="md">
      <PageHeader title={t('pageTitles.achievements.title')} />

      <Card padding="lg">
        <div className="flex items-center gap-5">
          <ProgressRing
            value={completionPercentage}
            size={104}
            strokeWidth={6}
            tone="gold"
            label={t('achievements.achievementsUnlocked')}
          >
            <div className="flex flex-col items-center justify-center">
              <Trophy className="w-6 h-6 text-gold mb-1" aria-hidden />
              <span className="text-title font-semibold tabular-nums text-mystic-100">
                {Math.round(completionPercentage)}%
              </span>
            </div>
          </ProgressRing>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-4 h-4 text-gold shrink-0" aria-hidden />
              <span className="text-meta font-semibold text-gold truncate">
                {localizeSeekerRank(profile?.seekerRank)}
              </span>
            </div>
            <h2 className="text-display font-semibold tabular-nums text-mystic-100 leading-tight">
              {t('achievements.unlockedOf', {
                defaultValue: '{{n}} of {{total}}',
                n: fmt.format(stats?.unlocked_achievements || 0),
                total: fmt.format(stats?.total_achievements || 0),
              })}
            </h2>
            <p className="text-meta text-mystic-400">
              {t('achievements.achievementsUnlocked')}
            </p>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-mystic-700">
          <RankProgressBar
            currentRank={profile?.seekerRank || 'Novice Seeker'}
            currentXP={profile?.xp || 0}
          />
        </div>
      </Card>

      <AchievementStats
        totalXP={profile?.xp || 0}
        streak={profile?.streak || 0}
        totalReadings={profile?.totalReadings || 0}
        totalJournalEntries={profile?.totalJournalEntries || 0}
        quizzesCompleted={quizzesCompleted}
      />

      {recentUnlocks.length > 0 && (
        <Section headingLevel="h3" spacing="sm" title={t('achievements.recentUnlocks')}>
          <ListRowGroup>
            {recentUnlocks.map((achievement) => {
              const Icon = achievementIcon(achievement.icon_name);
              return (
                <ListRow
                  key={achievement.id}
                  icon={<Icon />}
                  tone="gold"
                  label={achievement.name}
                  meta={achievement.description}
                  value={
                    <span className="tabular-nums">
                      {dayFmt.format(new Date(achievement.unlocked_at!))}
                    </span>
                  }
                />
              );
            })}
          </ListRowGroup>
        </Section>
      )}

      <div>
        {/* The chip strip scrolls; the right edge fades so it reads as a
            strip and not as a row that happens to be cut (R6 A30). */}
        <div
          className="flex items-center gap-2 mb-4 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 [mask-image:linear-gradient(to_right,black_calc(100%-40px),transparent)] [-webkit-mask-image:linear-gradient(to_right,black_calc(100%-40px),transparent)]"
          role="group"
          aria-label={t('achievements.categoriesLabel', { defaultValue: 'Categories' })}
        >
          {stats && (
            <>
              <Chip
                selected={selectedCategory === 'all'}
                onSelect={() => setSelectedCategory('all')}
                size="sm"
              >
                <span className="whitespace-nowrap tabular-nums">
                  {t('achievements.all')} {stats.unlocked_achievements}/{stats.total_achievements}
                </span>
              </Chip>
              {categoryEntries.map(([category, data]) => (
                <Chip
                  key={category}
                  selected={selectedCategory === category}
                  onSelect={() => setSelectedCategory(category)}
                  size="sm"
                >
                  <span className="whitespace-nowrap tabular-nums">
                    {t(`achievements.categories.${category}`, { defaultValue: getCategoryDisplayName(category) })} {data.unlocked}/{data.total}
                  </span>
                </Chip>
              ))}
              <span className="shrink-0 w-6" aria-hidden />
            </>
          )}
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
          <EmptyState
            variant="inline"
            icon={<Trophy />}
            title={t('achievements.noInCategory')}
          />
        )}
      </div>

      <AchievementUnlockModal
        achievement={celebrationAchievement ? localize(celebrationAchievement) : null}
        onClose={handleCloseCelebration}
      />
    </Page>
  );
}
