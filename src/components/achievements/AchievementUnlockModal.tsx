import { useEffect, useState } from 'react';
import { X, Trophy } from 'lucide-react';
import type { AchievementWithProgress, AchievementRarity } from '../../services/achievements';
import { prefersReducedMotion } from '../../utils/motion';
import { useT } from '../../i18n/useT';
import { getLocale } from '../../i18n/config';
import { Badge, Button, EyebrowLabel, type Tone } from '../ui';
import { achievementIcon } from './achievementIcons';
import { rarityLabel } from './localizeAchievement';

const RARITY_TONE: Record<AchievementRarity, Tone> = {
  common: 'neutral',
  rare: 'blue',
  epic: 'violet',
  legendary: 'gold',
};

// Token classes for the parts the Badge does not cover. The -ink variants
// are the AA text colours for the two cool tones on their own tints.
const RARITY_TEXT: Record<AchievementRarity, string> = {
  common: 'text-mystic-300',
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
/** A flat tint of the rarity's hue behind the XP figure (elevation by fill, no gradient). */
const RARITY_TINT: Record<AchievementRarity, string> = {
  common: 'bg-mystic-800',
  rare: 'bg-cosmic-blue/10',
  epic: 'bg-cosmic-violet/10',
  legendary: 'bg-gold/10',
};

interface AchievementUnlockModalProps {
  /** Pass the row already localised (localizeAchievement) — this renders what it is given. */
  achievement: AchievementWithProgress | null;
  onClose: () => void;
}

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
  const fmt = new Intl.NumberFormat(getLocale());

  return (
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center p-4
        transition-colors duration-slow
        ${showContent ? 'bg-mystic-950/85' : 'bg-transparent'}
      `}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="achievement-unlock-title"
        className={`
          relative max-w-sm w-full bg-mystic-900
          rounded-sheet border border-mystic-700 p-8
          transition-[transform,opacity] duration-deliberate
          ${showContent ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}
        `}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label={t('common:actions.close', { defaultValue: 'Close' })}
          className="absolute top-3 right-3 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-mystic-800 text-mystic-400
            hover:bg-mystic-700 hover:text-mystic-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="relative mb-6">
            <div
              className={`
                relative w-24 h-24 rounded-card flex items-center justify-center
                bg-mystic-800 border-2 ${RARITY_BORDER[achievement.rarity]}
              `}
            >
              <Icon className={`w-12 h-12 ${rarityColor}`} />
            </div>

            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
              <Badge tone={RARITY_TONE[achievement.rarity]}>
                {rarityLabel(achievement.rarity, t)}
              </Badge>
            </div>
          </div>

          <EyebrowLabel className="mb-2">
            {t('achievements.unlockedEyebrow', { defaultValue: 'Achievement unlocked' })}
          </EyebrowLabel>

          <h2 id="achievement-unlock-title" className="heading-display-md heading-strong text-mystic-100 mb-3">
            {achievement.name}
          </h2>

          <p className="text-ui text-mystic-400 mb-6 max-w-[280px]">
            {achievement.description}
          </p>

          <div className={`flex items-center gap-2 px-5 py-3 rounded-control ${RARITY_TINT[achievement.rarity]}`}>
            <Trophy className={`w-5 h-5 ${rarityColor}`} aria-hidden />
            <span className={`font-sans text-title font-semibold tabular-nums ${rarityColor}`}>
              +{fmt.format(xpCount)}
            </span>
            <span className="text-ui text-mystic-400 font-medium">
              {t('achievements.xpUnit', { defaultValue: 'XP' })}
            </span>
          </div>

          <Button variant="gold" fullWidth className="mt-6" onClick={onClose}>
            {t('achievements.unlockContinue', { defaultValue: 'Continue' })}
          </Button>
        </div>
      </div>
    </div>
  );
}
