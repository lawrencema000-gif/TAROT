import { Lock, Crown, Star } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import type { AchievementWithProgress, AchievementRarity } from '../../services/achievements';
import {
  getRarityColor,
  getRarityBorder,
  getRarityBackground,
} from '../../services/achievements';
import { Badge, Progress, type Tone } from '../ui';

// Rarity → the nearest primitive tone (blue = cosmic-blue, violet stands in
// for the fuchsia epics, legendary is gold).
const RARITY_TONE: Record<AchievementRarity, Tone> = {
  common: 'neutral',
  rare: 'blue',
  epic: 'violet',
  legendary: 'gold',
};

interface AchievementCardProps {
  achievement: AchievementWithProgress;
  isPremium: boolean;
  onPress?: () => void;
}

function getIcon(iconName: string): React.ElementType {
  const pascalCase = iconName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

  const icons = LucideIcons as unknown as Record<string, React.ElementType>;
  return icons[pascalCase] || LucideIcons.Award;
}

function getRarityLabel(rarity: AchievementRarity): string {
  return rarity.charAt(0).toUpperCase() + rarity.slice(1);
}

export function AchievementCard({ achievement, isPremium, onPress }: AchievementCardProps) {
  const isUnlocked = achievement.unlocked_at !== null;
  const isLocked = !isUnlocked;
  const isPremiumLocked = achievement.is_premium_only && !isPremium && isLocked;
  const progressPercentage = Math.min((achievement.progress / achievement.target) * 100, 100);
  const Icon = getIcon(achievement.icon_name);

  const rarityColor = getRarityColor(achievement.rarity);
  const rarityBorder = getRarityBorder(achievement.rarity);
  const rarityBg = getRarityBackground(achievement.rarity);
  const rarityTone = RARITY_TONE[achievement.rarity];

  return (
    <button
      onClick={onPress}
      className={`
        relative w-full p-4 rounded-2xl border transition-all duration-slow
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
        <div className="absolute inset-0 backdrop-blur-sm bg-mystic-900/60 z-10 flex flex-col items-center justify-center rounded-2xl">
          <Badge tone="gold">
            <Crown className="w-3 h-3" aria-hidden />
            Premium
          </Badge>
        </div>
      )}

      <div className="flex gap-3">
        <div className={`
          relative flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center
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
              ${isUnlocked && achievement.rarity === 'legendary' ? 'animate-pulse' : ''}
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
            mt-1 text-xs leading-relaxed line-clamp-2
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
                <span className="text-[10px] text-mystic-500">
                  {achievement.progress} / {achievement.target}
                </span>
                <span className="text-[10px] text-mystic-500">
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
              <span className={`text-xs font-medium ${rarityColor}`}>
                +{achievement.xp_reward} XP
              </span>
              <span className="text-[10px] text-mystic-500">
                {new Date(achievement.unlocked_at!).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
