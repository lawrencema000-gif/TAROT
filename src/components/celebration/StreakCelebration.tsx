import { useEffect, useState } from 'react';
import { Flame, Star, X } from 'lucide-react';
import { Button } from '../ui';
import { useT } from '../../i18n/useT';

interface StreakCelebrationProps {
  streak: number;
  open: boolean;
  onClose: () => void;
}

export function StreakCelebration({ streak, open, onClose }: StreakCelebrationProps) {
  const { t } = useT('app');
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (open) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!open) return null;

  const isMilestone = streak === 7 || streak === 30 || streak === 100 || streak === 365;
  const milestoneMessage = isMilestone
    ? streak === 7
      ? 'First Week Complete!'
      : streak === 30
      ? 'One Month Strong!'
      : streak === 100
      ? 'Century Streak!'
      : 'One Year Journey!'
    : null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-mystic-950/90 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${2 + Math.random()}s`,
              }}
            >
              <Star
                className={`w-4 h-4 ${
                  i % 3 === 0 ? 'text-gold' : i % 3 === 1 ? 'text-cosmic-rose' : 'text-cosmic-blue'
                }`}
                style={{ transform: `rotate(${Math.random() * 360}deg)` }}
              />
            </div>
          ))}
        </div>
      )}

      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="bg-mystic-900 rounded-3xl border border-mystic-700/50 w-full max-w-sm p-8 text-center animate-scale-in relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-mystic-800 transition-colors"
          >
            <X className="w-5 h-5 text-mystic-400" />
          </button>

          <div className="relative mb-6">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-gold/20 to-mystic-800 flex items-center justify-center animate-pulse-slow">
              <Flame className="w-12 h-12 text-gold" />
            </div>
            <div className="absolute -inset-2 rounded-full border-2 border-gold/20 animate-ping opacity-50" />
          </div>

          <div className="space-y-2 mb-6">
            {milestoneMessage ? (
              <>
                <h2 className="font-display text-3xl text-gold">{milestoneMessage}</h2>
                <p className="text-mystic-300">{t('celebration.streak.dedication')}</p>
              </>
            ) : (
              <>
                <p className="text-mystic-400">{t('celebration.streak.ritualComplete')}</p>
                <h2 className="font-display text-4xl text-gold">{streak} Day Streak</h2>
                <p className="text-mystic-300">{t('celebration.streak.keepFlowing')}</p>
              </>
            )}
          </div>

          <div className="flex justify-center gap-1 mb-6">
            {[...Array(Math.min(streak, 7))].map((_, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full bg-gold animate-scale-in"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
            {streak > 7 && (
              <span className="text-gold text-sm ml-2">+{streak - 7}</span>
            )}
          </div>

          <Button variant="gold" fullWidth onClick={onClose} className="min-h-[52px]">
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
