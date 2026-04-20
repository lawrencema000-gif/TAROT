import { Star, Sparkles, Crown, Sun, Eye } from 'lucide-react';
import { useT } from '../../i18n/useT';

interface RankProgressBarProps {
  currentRank: string;
  currentXP: number;
}

// `name` is the canonical English identifier stored in profiles.seeker_rank
// (and the achievements.ranks table); `key` is the i18n path for display.
const RANKS = [
  { name: 'Novice Seeker', key: 'novice', minXP: 0, icon: Star },
  { name: 'Apprentice Seeker', key: 'apprentice', minXP: 2930, icon: Sparkles },
  { name: 'Adept Seeker', key: 'adept', minXP: 10700, icon: Eye },
  { name: 'Master Seeker', key: 'master', minXP: 47350, icon: Crown },
  { name: 'Oracle Seeker', key: 'oracle', minXP: 182790, icon: Sun },
];

export function RankProgressBar({ currentRank, currentXP }: RankProgressBarProps) {
  const { t } = useT('app');
  const currentRankIndex = RANKS.findIndex(r => r.name === currentRank);
  const activeIndex = currentRankIndex >= 0 ? currentRankIndex : 0;

  const nextRank = RANKS[activeIndex + 1];
  const currentRankData = RANKS[activeIndex];

  const progressToNext = nextRank
    ? Math.min(
        ((currentXP - currentRankData.minXP) / (nextRank.minXP - currentRankData.minXP)) * 100,
        100
      )
    : 100;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        {RANKS.map((rank, index) => {
          const Icon = rank.icon;
          const isActive = index <= activeIndex;
          const isCurrent = index === activeIndex;

          return (
            <div key={rank.name} className="flex flex-col items-center relative">
              <div
                className={`
                  relative w-10 h-10 rounded-full flex items-center justify-center
                  transition-all duration-500
                  ${isCurrent
                    ? 'bg-gradient-to-br from-gold/30 to-amber-600/30 border-2 border-gold shadow-lg shadow-gold/30'
                    : isActive
                      ? 'bg-mystic-700/50 border border-gold/50'
                      : 'bg-mystic-800/50 border border-mystic-700/30'
                  }
                `}
              >
                <Icon
                  className={`
                    w-5 h-5 transition-all duration-500
                    ${isCurrent
                      ? 'text-gold drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]'
                      : isActive
                        ? 'text-gold/70'
                        : 'text-mystic-600'
                    }
                  `}
                />
                {isCurrent && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-gold animate-pulse" />
                )}
              </div>
              <span
                className={`
                  mt-2 text-[9px] font-medium text-center max-w-[60px] leading-tight
                  ${isCurrent ? 'text-gold' : isActive ? 'text-mystic-400' : 'text-mystic-600'}
                `}
              >
                {t(`achievements.ranks.${rank.key}`).replace(/\s*(Seeker|探求者|탐구자|探索者)\s*$/u, '')}
              </span>
            </div>
          );
        })}
      </div>

      <div className="relative h-2 bg-mystic-800/50 rounded-full overflow-hidden">
        <div className="absolute inset-0 flex">
          {RANKS.slice(0, -1).map((_, index) => (
            <div
              key={index}
              className="flex-1 border-r border-mystic-700/50 last:border-r-0"
            />
          ))}
        </div>
        <div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-gold/80 to-amber-500/80 rounded-full transition-all duration-700"
          style={{
            width: `${((activeIndex + progressToNext / 100) / (RANKS.length - 1)) * 100}%`,
          }}
        />
      </div>

      {nextRank && (
        <p className="mt-2 text-center text-xs text-mystic-500">
          {t('achievements.ranks.xpToNext', {
            xp: (nextRank.minXP - currentXP).toLocaleString(),
            name: t(`achievements.ranks.${nextRank.key}`),
          })}
        </p>
      )}
    </div>
  );
}
