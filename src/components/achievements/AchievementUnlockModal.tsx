import { useEffect, useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import type { AchievementWithProgress, AchievementRarity } from '../../services/achievements';
import { getRarityColor } from '../../services/achievements';

interface AchievementUnlockModalProps {
  achievement: AchievementWithProgress | null;
  onClose: () => void;
}

function getIcon(iconName: string): React.ElementType {
  const pascalCase = iconName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

  const icons: Record<string, React.ElementType> = LucideIcons;
  return icons[pascalCase] || LucideIcons.Award;
}

function getRarityGradient(rarity: AchievementRarity): string {
  const gradients: Record<AchievementRarity, string> = {
    common: 'from-mystic-400 via-mystic-300 to-mystic-400',
    rare: 'from-blue-400 via-blue-300 to-blue-400',
    epic: 'from-fuchsia-400 via-fuchsia-300 to-fuchsia-400',
    legendary: 'from-amber-400 via-yellow-300 to-amber-400',
  };
  return gradients[rarity];
}

function getRarityGlow(rarity: AchievementRarity): string {
  const glows: Record<AchievementRarity, string> = {
    common: 'shadow-mystic-400/50',
    rare: 'shadow-blue-400/50',
    epic: 'shadow-fuchsia-400/50',
    legendary: 'shadow-amber-400/60',
  };
  return glows[rarity];
}

export function AchievementUnlockModal({ achievement, onClose }: AchievementUnlockModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [xpCount, setXpCount] = useState(0);

  useEffect(() => {
    if (achievement) {
      setIsVisible(true);
      setTimeout(() => setShowContent(true), 100);

      const targetXP = achievement.xp_reward;
      const duration = 1000;
      const steps = 30;
      const increment = targetXP / steps;
      let current = 0;
      const timer = setInterval(() => {
        current += increment;
        if (current >= targetXP) {
          setXpCount(targetXP);
          clearInterval(timer);
        } else {
          setXpCount(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    } else {
      setShowContent(false);
      setTimeout(() => setIsVisible(false), 300);
    }
  }, [achievement]);

  if (!isVisible || !achievement) return null;

  const Icon = getIcon(achievement.icon_name);
  const rarityColor = getRarityColor(achievement.rarity);
  const rarityGradient = getRarityGradient(achievement.rarity);
  const rarityGlow = getRarityGlow(achievement.rarity);

  return (
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center p-4
        transition-all duration-300
        ${showContent ? 'bg-black/80 backdrop-blur-sm' : 'bg-transparent'}
      `}
      onClick={onClose}
    >
      <div
        className={`
          relative max-w-sm w-full bg-gradient-to-b from-mystic-800 to-mystic-900
          rounded-3xl border border-mystic-700/50 p-8
          transition-all duration-500
          ${showContent ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}
        `}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-mystic-700/50 text-mystic-400
            hover:bg-mystic-600/50 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="relative mb-6">
            {achievement.rarity === 'legendary' && (
              <div className="absolute inset-0 animate-spin-slow">
                {[...Array(8)].map((_, i) => (
                  <Sparkles
                    key={i}
                    className="absolute w-4 h-4 text-amber-400/60"
                    style={{
                      top: '50%',
                      left: '50%',
                      transform: `rotate(${i * 45}deg) translateY(-40px) translateX(-50%)`,
                    }}
                  />
                ))}
              </div>
            )}

            <div
              className={`
                relative w-24 h-24 rounded-2xl flex items-center justify-center
                bg-gradient-to-br from-mystic-700/50 to-mystic-800/50
                border-2 shadow-2xl
                ${rarityGlow}
                ${achievement.rarity === 'legendary'
                  ? 'border-amber-500/50 animate-pulse'
                  : achievement.rarity === 'epic'
                    ? 'border-fuchsia-500/50'
                    : achievement.rarity === 'rare'
                      ? 'border-blue-500/50'
                      : 'border-mystic-500/50'
                }
              `}
            >
              <Icon className={`w-12 h-12 ${rarityColor}`} />
            </div>

            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
              <span
                className={`
                  px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                  bg-gradient-to-r ${rarityGradient} text-mystic-900
                `}
              >
                {achievement.rarity}
              </span>
            </div>
          </div>

          <p className="text-xs text-mystic-400 uppercase tracking-widest mb-2">
            Achievement Unlocked!
          </p>

          <h2 className="text-2xl font-bold text-white mb-3">
            {achievement.name}
          </h2>

          <p className="text-mystic-400 text-sm mb-6 max-w-[280px]">
            {achievement.description}
          </p>

          <div
            className={`
              flex items-center gap-2 px-5 py-3 rounded-xl
              bg-gradient-to-r ${rarityGradient.replace(/400/g, '900').replace(/300/g, '800')}
              border border-white/10
            `}
          >
            <Sparkles className={`w-5 h-5 ${rarityColor}`} />
            <span className={`text-2xl font-bold ${rarityColor}`}>
              +{xpCount}
            </span>
            <span className="text-mystic-400 font-medium">XP</span>
          </div>

          <button
            onClick={onClose}
            className={`
              mt-6 w-full py-3 rounded-xl font-semibold
              bg-gradient-to-r ${rarityGradient} text-mystic-900
              hover:opacity-90 active:scale-[0.98] transition-all
            `}
          >
            Awesome!
          </button>
        </div>
      </div>
    </div>
  );
}
