/**
 * TarotSection shuffle animation — extracted from the monolithic
 * TarotSection.tsx as part of the `tarot-section-split` rollout.
 *
 * Pure presentation. The deck-card stack + CSS keyframe `shuffle-card`
 * are kept identical to the legacy inline version, so behavior is
 * bit-for-bit equivalent at the render level.
 */
import { Shuffle } from 'lucide-react';
import { Button } from '../../ui';
import { useT } from '../../../i18n/useT';

interface TarotShuffleViewProps {
  isShuffling: boolean;
  cardBackUrl: string | null | undefined;
  onBack: () => void;
  onShuffle: () => void;
}

export function TarotShuffleView({ isShuffling, cardBackUrl, onBack, onShuffle }: TarotShuffleViewProps) {
  const { t } = useT('app');

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="text-sm text-mystic-400 hover:text-mystic-300 transition-colors"
      >
        {t('readings.back')}
      </button>

      <div className="text-center space-y-6 py-12">
        <div className="relative flex justify-center items-center min-h-[160px]">
          <div className="relative">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute w-20 h-28 bg-gradient-to-br from-mystic-800 to-mystic-900 rounded-xl border-2 border-gold/30 shadow-glow overflow-hidden"
                style={{
                  left: '50%',
                  top: '50%',
                  transform: `translate(-50%, -50%) translateX(${i * 2}px) translateY(${i * -1}px) rotate(${i * 0.5}deg)`,
                  zIndex: i,
                  animation: isShuffling ? `shuffle-card ${0.6 + i * 0.05}s ease-in-out infinite` : 'none',
                }}
              >
                {cardBackUrl ? (
                  <img src={cardBackUrl} alt="Card Back" className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-gold/5 to-transparent rounded-xl" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="font-display text-xl text-mystic-100">
            {isShuffling ? t('readings.shuffleView.inProgress') : t('readings.shuffleView.clearMind')}
          </h2>
          <p className="text-mystic-400 text-sm">
            {isShuffling ? t('readings.shuffleView.spreading') : t('readings.shuffleView.focusQuestion')}
          </p>
        </div>

        {!isShuffling && (
          <Button
            variant="gold"
            onClick={onShuffle}
            className="min-h-[52px]"
          >
            <Shuffle className="w-4 h-4" />
            {t('readings.shuffleView.shuffleDeck')}
          </Button>
        )}
      </div>
    </div>
  );
}
