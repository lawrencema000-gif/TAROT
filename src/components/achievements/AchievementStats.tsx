import { Trophy, Flame, Sparkles, BookOpen, Brain } from 'lucide-react';
import { useT } from '../../i18n/useT';

interface AchievementStatsProps {
  totalXP: number;
  streak: number;
  totalReadings: number;
  totalJournalEntries: number;
  quizzesCompleted: number;
}

export function AchievementStats({
  totalXP,
  streak,
  totalReadings,
  totalJournalEntries,
  quizzesCompleted,
}: AchievementStatsProps) {
  const { t } = useT('app');
  const stats = [
    {
      icon: Sparkles,
      label: t('achievements.stats.totalXP', { defaultValue: 'Total XP' }),
      value: totalXP.toLocaleString(),
      color: 'text-gold',
      bgColor: 'bg-gold/10',
    },
    {
      icon: Flame,
      label: t('achievements.stats.streak', { defaultValue: 'Streak' }),
      value: t('achievements.stats.streakDays', { count: streak, defaultValue: `${streak} days` }),
      color: 'text-orange-400',
      bgColor: 'bg-orange-400/10',
    },
    {
      icon: Trophy,
      label: t('achievements.stats.readings', { defaultValue: 'Readings' }),
      value: totalReadings.toString(),
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
    },
    {
      icon: BookOpen,
      label: t('achievements.stats.journal', { defaultValue: 'Journal' }),
      value: totalJournalEntries.toString(),
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-400/10',
    },
    {
      icon: Brain,
      label: t('achievements.stats.quizzes', { defaultValue: 'Quizzes' }),
      value: quizzesCompleted.toString(),
      color: 'text-fuchsia-400',
      bgColor: 'bg-fuchsia-400/10',
    },
  ];

  return (
    <div className="grid grid-cols-5 gap-2">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className={`
              flex flex-col items-center gap-1 p-2 rounded-xl
              ${stat.bgColor} border border-white/5
            `}
          >
            <Icon className={`w-4 h-4 ${stat.color}`} />
            <span className="text-xs font-semibold text-white">
              {stat.value}
            </span>
            <span className="text-[9px] text-mystic-500">
              {stat.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
