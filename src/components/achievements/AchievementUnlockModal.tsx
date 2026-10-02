import { useEffect, useState } from 'react';
import { X, Trophy } from 'lucide-react';
import type { AchievementWithProgress, AchievementRarity } from '../../services/achievements';
import { prefersReducedMotion } from '../../utils/motion';
import { useT } from '../../i18n/useT';
import { Badge, EyebrowLabel, type Tone } from '../ui';
import { achievementIcon } from './achievementIcons';

const RARITY_TONE: Record<AchievementRarity, Tone> = {
  common: 'neutral',
  rare: 'blue',
  epic: 'violet',
  legendary: 'gold',
};

// Token classes for the parts the Badge does not cover. The -ink variants
// are the AA text colours for the two cool tones on their own tints.
const RARITY_TEXT: Record<AchievementRarity, string> = {
  common: 'text-mystic-400',
  rare: 'text-cosmic-blue-ink',
  epic: 'text-cosmic-violet-ink',
  legendary: 'text-gold',
};
const RARITY_BORDER: Record<AchievementRarity, string> = {
  common: 'border-mystic-500/50',
  rare: 'border-cosmic-blue/50',
  epic: 'border-cosmic-violet/50',
  legendary: 'border-gold/50',
};

interface AchievementUnlockModalProps {
  achievement: AchievementWithProgress | null;
  onClose: () => void;
}

// The solid gradient fills the CTA; the tint is the same hue at 10–15%
// behind the XP figure.
const RARITY_GRADIENT: Record<AchievementRarity, string> = {
  common: 'from-mystic-400 via-mystic-300 to-mystic-400',
  rare: 'from-cosmic-blue via-cosmic-blue-ink to-cosmic-blue',
  epic: 'from-cosmic-violet via-cosmic-violetLight to-cosmic-violet',
  legendary: 'from-gold via-gold-light to-gold',
};
const RARITY_TINT: Record<AchievementRarity, string> = {
  common: 'from-mystic-900 via-mystic-800 to-mystic-900',
  rare: 'from-cosmic-blue/15 via-cosmic-blue/10 to-cosmic-blue/15',
  epic: 'from-cosmic-violet/15 via-cosmic-violet/10 to-cosmic-violet/15',
  legendary: 'from-gold/15 via-gold/10 to-gold/15',
};

export function AchievementUnlockModal({ achievement, onClose }: AchievementUnlockModalProps) {
  const { t } = useT('app');
  const [isVisible, setIsVisible] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [xpCount, setXpCount] = useState(0);

  useEffect(() => {
    if (achievement) {
      setIsVisible(true);
      setTimeout(() => setShowContent(true), 100);

      const targetXP = achievement.xp_reward;
      // Same reasoning as the landing figures: the XP total is the payload,
      // the count-up is decoration, and setInterval is out of reach of the
      // CSS block that freezes this modal's own scale/opacity around it.
      if (prefersReducedMotion()) { setXpCount(targetXP); return; }
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

  const Icon = achievementIcon(achievement.icon_name);
  const rarityColor = RARITY_TEXT[achievement.rarity];
  const rarityGradient = RARITY_GRADIENT[achievement.rarity];
  const rarityTint = RARITY_TINT[achievement.rarity];

  return (
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center p-4
        transition-all duration-slow
        ${showContent ? 'bg-black/80' : 'bg-transparent'}
      `}
      onClick={onClose}
    >
      <div
        className={`
          relative max-w-sm w-full bg-gradient-to-b from-mystic-800 to-mystic-900
          rounded-sheet border border-mystic-700/50 p-8
          transition-all duration-deliberate
          ${showContent ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}
        `}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label={t('common:actions.close', { defaultValue: 'Close' })}
          className="absolute top-3 right-3 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-mystic-700/50 text-mystic-400
            hover:bg-mystic-600/50 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="relative mb-6">
            <div
              className={`
                relative w-24 h-24 rounded-card flex items-center justify-center
                bg-gradient-to-br from-mystic-700/50 to-mystic-800/50
                border-2 ${RARITY_BORDER[achievement.rarity]}
              `}
            >
              <Icon className={`w-12 h-12 ${rarityColor}`} />
            </div>

            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
              <Badge tone={RARITY_TONE[achievement.rarity]}>
                {achievement.rarity}
              </Badge>
            </div>
          </div>

          <EyebrowLabel className="mb-2">
            Achievement Unlocked!
          </EyebrowLabel>

          <h2 className="text-2xl font-semibold text-white mb-3">
            {achievement.name}
          </h2>

          <p className="text-mystic-400 text-sm mb-6 max-w-[280px]">
            {achievement.description}
          </p>

          <div
            className={`
              flex items-center gap-2 px-5 py-3 rounded-control
              bg-gradient-to-r ${rarityTint}
              border border-white/10
            `}
          >
            <Trophy className={`w-5 h-5 ${rarityColor}`} />
            <span className={`text-2xl font-semibold ${rarityColor}`}>
              +{xpCount}
            </span>
            <span className="text-mystic-400 font-medium">XP</span>
          </div>

          <button
            onClick={onClose}
            className={`
              mt-6 w-full py-3 rounded-control font-semibold
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
