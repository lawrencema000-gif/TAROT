import { useEffect, useState } from 'react';
import { Trophy, Sparkles, X } from 'lucide-react';
import { Button, Sheet } from '../ui';

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
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (open) {
      setShowConfetti(true);
      const timeout = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timeout);
    }
  }, [open]);

  return (
    <Sheet open={open} onClose={onClose} title="">
      <div className="relative">
        <button
          onClick={onClose}
          className="absolute top-0 right-0 p-2 text-mystic-400 hover:text-mystic-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center py-6">
          <div className="relative inline-block mb-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gold via-gold-light to-gold-dark flex items-center justify-center animate-bounce-slow">
              <Trophy className="w-12 h-12 text-mystic-950" />
            </div>
            {showConfetti && (
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(12)].map((_, i) => (
                  <Sparkles
                    key={i}
                    className="absolute w-4 h-4 text-gold animate-float-away"
                    style={{
                      left: `${50 + Math.cos((i * Math.PI) / 6) * 50}%`,
                      top: `${50 + Math.sin((i * Math.PI) / 6) * 50}%`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <h2 className="font-display text-3xl text-gold mb-2">Level Up!</h2>
          <p className="text-mystic-300 mb-6">
            Congratulations! You've reached a new level on your spiritual journey.
          </p>

          <div className="bg-gradient-to-br from-gold/10 to-cosmic-blue/10 border border-gold/20 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="text-center">
                <div className="text-5xl font-bold text-gold mb-1">{newLevel}</div>
                <div className="text-sm text-mystic-400">Level</div>
              </div>
              <div className="h-12 w-px bg-mystic-700" />
              <div className="text-center">
                <div className="text-lg font-semibold text-mystic-100 mb-1">
                  {seekerRank}
                </div>
                <div className="text-sm text-mystic-400">Rank</div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-gold">
              <Sparkles className="w-4 h-4" />
              <span>+{xpEarned} XP earned</span>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="bg-mystic-800/50 rounded-xl p-4">
              <h3 className="font-medium text-mystic-100 mb-2">New Abilities Unlocked</h3>
              <p className="text-sm text-mystic-400">
                Continue your journey to unlock deeper insights and features
              </p>
            </div>
          </div>

          <Button variant="gold" onClick={onClose} className="w-full">
            Continue Journey
            <Sparkles className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes float-away {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -150%) scale(0.5);
          }
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }

        .animate-float-away {
          animation: float-away 1.5s ease-out forwards;
        }
      `}</style>
    </Sheet>
  );
}
