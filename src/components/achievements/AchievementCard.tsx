import { Lock, Crown, Star } from 'lucide-react';
import type { AchievementWithProgress, AchievementRarity } from '../../services/achievements';
import { Badge, Progress, type Tone } from '../ui';
import { achievementIcon } from './achievementIcons';
import { rarityLabel } from './localizeAchievement';
import { formatUnlockDate } from './achievementFigures';
import { useT } from '../../i18n/useT';
import { getLocale } from '../../i18n/config';

// Rarity → the nearest primitive tone (blue = cosmic-blue, violet stands in
// for the fuchsia epics, legendary is gold).
const RARITY_TONE: Record<AchievementRarity, Tone> = {
  common: 'neutral',
  rare: 'blue',
  epic: 'violet',
  legendary: 'gold',
};

// The same four tones as token classes, for the parts of the card the
// primitives do not cover (icon ink, border, tint). The -ink variants are
// the AA text colours for the two cool tones on their own tints.
const RARITY_TEXT: Record<AchievementRarity, string> = {
  common: 'text-mystic-400',
  rare: 'text-cosmic-blue-ink',
  epic: 'text-cosmic-violet-ink',
  legendary: 'text-gold',
};
const RARITY_BORDER: Record<AchievementRarity, string> = {
  common: 'border-mystic-600',
  rare: 'border-cosmic-blue/25',
  epic: 'border-cosmic-violet/25',
  legendary: 'border-gold/25',
};
/** A flat tint of the rarity's hue — elevation by fill, no gradient. */
const RARITY_BG: Record<AchievementRarity, string> = {
  common: 'bg-mystic-800',
  rare: 'bg-cosmic-blue/10',
  epic: 'bg-cosmic-violet/10',
  legendary: 'bg-gold/10',
};

interface AchievementCardProps {
  achievement: AchievementWithProgress;
  isPremium: boolean;
  onPress?: () => void;
}

export function AchievementCard({ achievement, isPremium, onPress }: AchievementCardProps) {
  const { t } = useT('app');
  const locale = getLocale();
  const isUnlocked = achievement.unlocked_at !== null;
  const isLocked = !isUnlocked;
  const isPremiumLocked = achievement.is_premium_only && !isPremium && isLocked;
  const isHiddenLocked = isLocked && achievement.is_hidden;
  const progressPercentage = Math.min((achievement.progress / achievement.target) * 100, 100);
  const Icon = achievementIcon(achievement.icon_name);

  const rarityColor = RARITY_TEXT[achievement.rarity];
  const rarityBorder = RARITY_BORDER[achievement.rarity];
  const rarityBg = RARITY_BG[achievement.rarity];
  const rarityTone = RARITY_TONE[achievement.rarity];

  return (
    <button
      onClick={onPress}
      className={`
        relative w-full p-4 rounded-card border transition-all duration-slow
        ${isUnlocked
          ? `${rarityBg} ${rarityBorder}`
          : 'bg-mystic-800/40 border-mystic-700/30'
        }
        hover:scale-[1.02] active:scale-[0.98]
        text-left
      `}
    >
      <div className="flex gap-3">
        <div className={`
          relative flex-shrink-0 w-14 h-14 rounded-control flex items-center justify-center
          transition-all duration-slow
          ${isUnlocked
            ? rarityBg
            : 'bg-mystic-700/30'
          }
        `}>
          {/* A Premium badge shows its own icon, so a free member can see what
              it is; every other locked badge (and a hidden one) shows the
              lock. */}
          {isLocked && (!isPremiumLocked || isHiddenLocked) ? (
            <Lock className="w-6 h-6 text-mystic-500" />
          ) : (
            <Icon className={`
              w-7 h-7 transition-all duration-slow
              ${isUnlocked ? rarityColor : 'text-mystic-500'}
            `} />
          )}

          {isUnlocked && (
            <div className="absolute -top-1 -right-1">
              <Star className={`w-4 h-4 fill-current ${rarityColor}`} />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`
              text-ui font-semibold leading-tight
              ${isUnlocked ? 'text-mystic-100' : 'text-mystic-300'}
              ${isHiddenLocked ? 'blur-sm select-none' : ''}
            `}>
              {isHiddenLocked ? '???' : achievement.name}
            </h3>
            <Badge tone={isUnlocked ? rarityTone : 'neutral'} className="flex-shrink-0">
              {rarityLabel(achievement.rarity, t)}
            </Badge>
          </div>

          <p className={`
            mt-1 text-meta line-clamp-2
            ${isUnlocked ? 'text-mystic-300' : 'text-mystic-500'}
            ${isHiddenLocked ? 'blur-sm select-none' : ''}
          `}>
            {isHiddenLocked
              ? t('achievements.hiddenDescription', { defaultValue: 'Complete hidden tasks to unlock this achievement.' })
              : achievement.description
            }
          </p>

          {!isUnlocked && !isPremiumLocked && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-meta text-mystic-500 tabular-nums">
                  {achievement.progress} / {achievement.target}
                </span>
                <span className="text-meta text-mystic-500 tabular-nums">
                  {Math.round(progressPercentage)}%
                </span>
              </div>
              <Progress
                value={progressPercentage}
                size="sm"
                tone={rarityTone}
                label={isHiddenLocked ? '???' : achievement.name}
              />
            </div>
          )}

          {/* Premium-only and locked for a free member: the card reads like
              any other locked badge (name, description, rarity) and says
              what unlocks it where the progress bar goes. It used to be an
              opaque panel holding only the pill, a blank box in the grid
              (p8 F63). Monetisation is the violet tone (Badge). */}
          {isPremiumLocked && (
            <div className="mt-2">
              <Badge tone="violet">
                <Crown className="w-3 h-3" aria-hidden />
                {t('achievements.premiumBadge', { defaultValue: 'Premium' })}
              </Badge>
            </div>
          )}

          {isUnlocked && (
            <div className="mt-2 flex items-center gap-3">
              <span className={`text-meta font-medium tabular-nums ${rarityColor}`}>
                {t('achievements.xpReward', { defaultValue: '+{{n}} XP', n: achievement.xp_reward })}
              </span>
              <span className="text-meta text-mystic-500 tabular-nums">
                {formatUnlockDate(achievement.unlocked_at!, locale)}
              </span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
