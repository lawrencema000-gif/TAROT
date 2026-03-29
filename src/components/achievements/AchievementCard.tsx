import { Lock, Crown, Sparkles } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import type { AchievementWithProgress, AchievementRarity } from '../../services/achievements';
import {
  getRarityColor,
  getRarityGlow,
  getRarityBorder,
  getRarityBackground,
} from '../../services/achievements';

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
  const rarityGlow = getRarityGlow(achievement.rarity);
  const rarityBorder = getRarityBorder(achievement.rarity);
  const rarityBg = getRarityBackground(achievement.rarity);

  return (
    <button
      onClick={onPress}
      className={`
        relative w-full p-4 rounded-2xl border transition-all duration-300
        ${isUnlocked
          ? `bg-gradient-to-br ${rarityBg} ${rarityBorder} shadow-lg ${rarityGlow}`
          : 'bg-mystic-800/40 border-mystic-700/30'
        }
        ${isPremiumLocked ? 'overflow-hidden' : ''}
        hover:scale-[1.02] active:scale-[0.98]
        text-left
      `}
    >
      {isPremiumLocked && (
        <div className="absolute inset-0 backdrop-blur-sm bg-mystic-900/60 z-10 flex flex-col items-center justify-center rounded-2xl">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/30">
            <Crown className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-medium text-amber-300">Premium</span>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <div className={`
          relative flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center
          transition-all duration-300
          ${isUnlocked
            ? `bg-gradient-to-br ${rarityBg} shadow-inner`
            : 'bg-mystic-700/30'
          }
        `}>
          {isLocked && !isPremiumLocked ? (
            <Lock className="w-6 h-6 text-mystic-500" />
          ) : (
            <Icon className={`
              w-7 h-7 transition-all duration-300
              ${isUnlocked ? rarityColor : 'text-mystic-500'}
              ${isUnlocked && achievement.rarity === 'legendary' ? 'animate-pulse' : ''}
            `} />
          )}

          {isUnlocked && (
            <div className="absolute -top-1 -right-1">
              <Sparkles className={`w-4 h-4 ${rarityColor}`} />
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
            <span className={`
              flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium
              ${isUnlocked
                ? `${rarityColor} bg-white/5`
                : 'text-mystic-500 bg-mystic-700/30'
              }
            `}>
              {getRarityLabel(achievement.rarity)}
            </span>
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
              <div className="h-1.5 bg-mystic-700/50 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    achievement.rarity === 'legendary' ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
                    achievement.rarity === 'epic' ? 'bg-gradient-to-r from-fuchsia-500 to-fuchsia-400' :
                    achievement.rarity === 'rare' ? 'bg-gradient-to-r from-blue-500 to-blue-400' :
                    'bg-gradient-to-r from-mystic-400 to-mystic-300'
                  }`}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
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
