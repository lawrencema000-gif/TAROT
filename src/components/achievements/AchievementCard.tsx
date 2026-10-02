import { Lock, Crown, Star } from 'lucide-react';
import type { AchievementWithProgress, AchievementRarity } from '../../services/achievements';
import { Badge, Progress, type Tone } from '../ui';
import { achievementIcon } from './achievementIcons';

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
const RARITY_BG: Record<AchievementRarity, string> = {
  common: 'from-mystic-700/30 to-mystic-800/30',
  rare: 'from-cosmic-blue/15 to-mystic-800/30',
  epic: 'from-cosmic-violet/15 to-mystic-800/30',
  legendary: 'from-gold/15 to-mystic-800/30',
};

interface AchievementCardProps {
  achievement: AchievementWithProgress;
  isPremium: boolean;
  onPress?: () => void;
}

function getRarityLabel(rarity: AchievementRarity): string {
  return rarity.charAt(0).toUpperCase() + rarity.slice(1);
}

export function AchievementCard({ achievement, isPremium, onPress }: AchievementCardProps) {
  const isUnlocked = achievement.unlocked_at !== null;
  const isLocked = !isUnlocked;
  const isPremiumLocked = achievement.is_premium_only && !isPremium && isLocked;
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
          ? `bg-gradient-to-br ${rarityBg} ${rarityBorder}`
          : 'bg-mystic-800/40 border-mystic-700/30'
        }
        ${isPremiumLocked ? 'overflow-hidden' : ''}
        hover:scale-[1.02] active:scale-[0.98]
        text-left
      `}
    >
      {isPremiumLocked && (
        <div className="absolute inset-0 bg-mystic-900 z-10 flex flex-col items-center justify-center rounded-card">
          <Badge tone="gold">
            <Crown className="w-3 h-3" aria-hidden />
            Premium
          </Badge>
        </div>
      )}

      <div className="flex gap-3">
        <div className={`
          relative flex-shrink-0 w-14 h-14 rounded-control flex items-center justify-center
          transition-all duration-slow
          ${isUnlocked
            ? `bg-gradient-to-br ${rarityBg}`
            : 'bg-mystic-700/30'
          }
        `}>
          {isLocked && !isPremiumLocked ? (
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
              font-semibold text-sm leading-tight
              ${isUnlocked ? 'text-white' : 'text-mystic-300'}
              ${isLocked && !isPremiumLocked && achievement.is_hidden ? 'blur-sm select-none' : ''}
            `}>
              {isLocked && achievement.is_hidden ? '???' : achievement.name}
            </h3>
            <Badge tone={isUnlocked ? rarityTone : 'neutral'} className="flex-shrink-0">
              {getRarityLabel(achievement.rarity)}
            </Badge>
          </div>

          <p className={`
            mt-1 text-meta line-clamp-2
            ${isUnlocked ? 'text-mystic-300' : 'text-mystic-500'}
            ${isLocked && !isPremiumLocked && achievement.is_hidden ? 'blur-sm select-none' : ''}
          `}>
            {isLocked && achievement.is_hidden
              ? 'Complete hidden tasks to unlock this achievement.'
              : achievement.description
            }
          </p>

          {!isUnlocked && !isPremiumLocked && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-meta text-mystic-500">
                  {achievement.progress} / {achievement.target}
                </span>
                <span className="text-meta text-mystic-500">
                  {Math.round(progressPercentage)}%
                </span>
              </div>
              <Progress
                value={progressPercentage}
                size="sm"
                tone={rarityTone}
                label={isLocked && achievement.is_hidden ? '???' : achievement.name}
              />
            </div>
          )}

          {isUnlocked && (
            <div className="mt-2 flex items-center gap-3">
              <span className={`text-meta font-medium ${rarityColor}`}>
                +{achievement.xp_reward} XP
              </span>
              <span className="text-meta text-mystic-500">
                {new Date(achievement.unlocked_at!).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
