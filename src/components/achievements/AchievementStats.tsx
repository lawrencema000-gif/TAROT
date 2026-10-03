import { Trophy, Flame, Star, BookOpen, Brain } from 'lucide-react';
import { useT } from '../../i18n/useT';
import { getLocale } from '../../i18n/config';

interface AchievementStatsProps {
  /** profiles.xp — the one XP figure the app reports (R6 A8). */
  totalXP: number;
  streak: number;
  totalReadings: number;
  totalJournalEntries: number;
  quizzesCompleted: number;
}

/**
 * Five equal tiles on the card surface (solid fill, not a tint the
 * background photograph shows through), one figure each, one-line labels. The figures are
 * Inter with tabular numerals; the streak is a bare count (its label says
 * "Streak") so no tile wraps to two lines at 390 (R6 A30).
 */
export function AchievementStats({
  totalXP,
  streak,
  totalReadings,
  totalJournalEntries,
  quizzesCompleted,
}: AchievementStatsProps) {
  const { t } = useT('app');
  const fmt = new Intl.NumberFormat(getLocale());
  const stats = [
    {
      icon: Star,
      label: t('achievements.stats.totalXP', { defaultValue: 'Total XP' }),
      value: fmt.format(totalXP),
      color: 'text-gold',
    },
    {
      icon: Flame,
      label: t('achievements.stats.streak', { defaultValue: 'Streak' }),
      value: fmt.format(streak),
      color: 'text-coral',
    },
    {
      icon: Trophy,
      label: t('achievements.stats.readings', { defaultValue: 'Readings' }),
      value: fmt.format(totalReadings),
      color: 'text-cosmic-blue-ink',
    },
    {
      icon: BookOpen,
      label: t('achievements.stats.journal', { defaultValue: 'Journal' }),
      value: fmt.format(totalJournalEntries),
      color: 'text-teal',
    },
    {
      icon: Brain,
      label: t('achievements.stats.quizzes', { defaultValue: 'Quizzes' }),
      value: fmt.format(quizzesCompleted),
      color: 'text-cosmic-violet-ink',
    },
  ];

  return (
    <dl className="grid grid-cols-5 gap-2">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="min-w-0 flex flex-col items-center gap-1 px-1 py-2.5 rounded-control bg-mystic-850 border border-mystic-700"
          >
            <Icon className={`w-4 h-4 ${stat.color}`} aria-hidden />
            {/* dt before dd in the DOM (a dl group is term, then value); the
                figure is drawn above its label with flex order. */}
            <dt className="order-last text-caption text-mystic-500 whitespace-nowrap truncate max-w-full leading-tight">
              {stat.label}
            </dt>
            <dd className="text-ui font-semibold tabular-nums text-mystic-100 leading-tight">
              {stat.value}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
