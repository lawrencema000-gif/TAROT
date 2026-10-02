import { Star, Moon, Crown, Sun, Eye } from 'lucide-react';
import { useT } from '../../i18n/useT';
import { getLocale } from '../../i18n/config';

interface RankProgressBarProps {
  currentRank: string;
  /** profiles.xp — the same figure the stat tiles and Profile show. */
  currentXP: number;
}

// `name` is the canonical English identifier stored in profiles.seeker_rank
// (and the achievements.ranks table); `key` is the i18n path for display.
const RANKS = [
  { name: 'Novice Seeker', key: 'novice', minXP: 0, icon: Star },
  { name: 'Apprentice Seeker', key: 'apprentice', minXP: 2930, icon: Moon },
  { name: 'Adept Seeker', key: 'adept', minXP: 10700, icon: Eye },
  { name: 'Master Seeker', key: 'master', minXP: 47350, icon: Crown },
  { name: 'Oracle Seeker', key: 'oracle', minXP: 182790, icon: Sun },
];

export function RankProgressBar({ currentRank, currentXP }: RankProgressBarProps) {
  const { t } = useT('app');
  const fmt = new Intl.NumberFormat(getLocale());
  const currentRankIndex = RANKS.findIndex(r => r.name === currentRank);
  const activeIndex = currentRankIndex >= 0 ? currentRankIndex : 0;

  const nextRank = RANKS[activeIndex + 1];
  const currentRankData = RANKS[activeIndex];

  const progressToNext = nextRank
    ? Math.max(
        0,
        Math.min(((currentXP - currentRankData.minXP) / (nextRank.minXP - currentRankData.minXP)) * 100, 100),
      )
    : 100;

  const overall = Math.round(((activeIndex + progressToNext / 100) / (RANKS.length - 1)) * 100);

  return (
    <div className="w-full">
      <ol className="flex items-start justify-between mb-3">
        {RANKS.map((rank, index) => {
          const Icon = rank.icon;
          const isActive = index <= activeIndex;
          const isCurrent = index === activeIndex;

          return (
            <li key={rank.name} className="flex flex-col items-center relative min-w-0" aria-current={isCurrent ? 'step' : undefined}>
              {/* Elevation by fill: the current rank is a gold tint with a gold
                  hairline, reached ranks a quiet tint, the rest the canvas step. */}
              <div
                className={`relative w-10 h-10 rounded-full flex items-center justify-center border transition-[background-color,border-color] duration-deliberate ${
                  isCurrent
                    ? 'bg-gold/15 border-gold'
                    : isActive
                      ? 'bg-mystic-800 border-gold/40'
                      : 'bg-mystic-850 border-mystic-700'
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${isCurrent ? 'text-gold' : isActive ? 'text-gold/70' : 'text-mystic-600'}`}
                  aria-hidden
                />
              </div>
              <span
                className={`mt-2 text-caption font-medium text-center max-w-[64px] leading-tight ${
                  isCurrent ? 'text-gold' : isActive ? 'text-mystic-400' : 'text-mystic-600'
                }`}
              >
                {t(`achievements.ranks.${rank.key}`).replace(/\s*(Seeker|探求者|탐구자|探索者)\s*$/u, '')}
              </span>
            </li>
          );
        })}
      </ol>

      {/* Segmented rank bar: the primitive's track (h-2 bg-mystic-800) with
          one tick per rank boundary, so it stays custom — but the fill moves
          the way every Progress fill moves: width only, on the deliberate
          duration. */}
      <div
        role="progressbar"
        aria-label={t(`achievements.ranks.${currentRankData.key}`)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={overall}
        className="relative h-2 bg-mystic-800 rounded-full overflow-hidden"
      >
        <div className="absolute inset-0 flex">
          {RANKS.slice(0, -1).map((_, index) => (
            <div
              key={index}
              className="flex-1 border-r border-mystic-700 last:border-r-0"
            />
          ))}
        </div>
        <div
          className="absolute left-0 top-0 h-full bg-gold rounded-full transition-[width] duration-deliberate ease-out"
          style={{ width: `${overall}%` }}
        />
      </div>

      {nextRank && (
        <p className="mt-2 text-center text-meta text-mystic-500 tabular-nums">
          {t('achievements.ranks.xpToNext', {
            xp: fmt.format(Math.max(0, nextRank.minXP - currentXP)),
            name: t(`achievements.ranks.${nextRank.key}`),
          })}
        </p>
      )}
    </div>
  );
}
