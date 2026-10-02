import { Trophy, Compass, X } from 'lucide-react';
import { Button, Sheet, SparkleFourPoint } from '../ui';
import { useT } from '../../i18n/useT';
import { localizeSeekerRank } from '../../i18n/localizeRank';

interface LevelUpCelebrationProps {
  open: boolean;
  onClose: () => void;
  newLevel: number;
  seekerRank: string;
  xpEarned: number;
}

export function LevelUpCelebration({
  open,
  onClose,
  newLevel,
  seekerRank,
  xpEarned,
}: LevelUpCelebrationProps) {
  const { t } = useT('app');

  return (
    <Sheet open={open} onClose={onClose} label={t('celebration.levelUp.title')}>
      <div className="relative">
        <button
          onClick={onClose}
          aria-label={t('common:actions.close', { defaultValue: 'Close' })}
          className="absolute top-0 right-0 min-h-[44px] min-w-[44px] flex items-center justify-center text-mystic-400 hover:text-mystic-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center py-6">
          <div className="relative inline-block mb-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gold via-gold-light to-gold-dark flex items-center justify-center animate-scale-in">
              <Trophy className="w-12 h-12 text-mystic-950" />
            </div>
          </div>

          <h2 className="font-display text-3xl text-gold mb-2">{t('celebration.levelUp.title')}</h2>
          <p className="text-mystic-300 mb-6">
            Congratulations! You've reached a new level on your spiritual journey.
          </p>

          <div className="bg-gradient-to-br from-gold/10 to-cosmic-blue/10 border border-gold/20 rounded-card p-6 mb-6">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="text-center">
                <div className="text-5xl font-semibold text-gold mb-1">{newLevel}</div>
                <div className="text-sm text-mystic-400">{t('celebration.levelUp.level')}</div>
              </div>
              <div className="h-12 w-px bg-mystic-700" />
              <div className="text-center">
                <div className="text-lg font-semibold text-mystic-100 mb-1">
                  {localizeSeekerRank(seekerRank)}
                </div>
                <div className="text-sm text-mystic-400">{t('celebration.levelUp.rank', { defaultValue: 'Rank' })}</div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-gold">
              <SparkleFourPoint size={14} className="text-gold" />
              <span>+{xpEarned} XP earned</span>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="bg-mystic-800/50 rounded-control p-4">
              <h3 className="font-medium text-mystic-100 mb-2">{t('celebration.levelUp.newAbilities')}</h3>
              <p className="text-sm text-mystic-400">
                Continue your journey to unlock deeper insights and features
              </p>
            </div>
          </div>

          <Button variant="gold" onClick={onClose} className="w-full">
            Continue Journey
            <Compass className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
