/**
 * TarotSection shuffle animation — extracted from the monolithic
 * TarotSection.tsx as part of the `tarot-section-split` rollout.
 *
 * Redesign 2026-04-25: the shuffle deck is now properly centered on
 * the screen during animation. Previously the CSS `shuffle-card`
 * keyframes replaced the whole `transform` property, wiping out the
 * `translate(-50%, -50%)` centering and letting cards drift. Fixed
 * by splitting positioning onto an outer wrapper and animation onto
 * an inner card, so the animation's rotate/translate is layered on
 * top of the centering instead of replacing it.
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

const DECK_SIZE = 10;

export function TarotShuffleView({ isShuffling, cardBackUrl, onBack, onShuffle }: TarotShuffleViewProps) {
  const { t } = useT('app');
  const backSrc = cardBackUrl || '/card-backs/default.svg';

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="text-sm text-mystic-400 hover:text-mystic-300 transition-colors"
      >
        {t('readings.back')}
      </button>

      <div className="text-center space-y-6 py-12">
        {/* Fixed-size centering stage — deck lives at its center. */}
        <div className="relative mx-auto flex items-center justify-center"
             style={{ width: 220, height: 200 }}>
          {/* Soft golden aura behind the deck during shuffle */}
          <div
            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-gold/10 blur-3xl transition-opacity duration-500 ${
              isShuffling ? 'opacity-100 animate-pulse-slow' : 'opacity-60'
            }`}
          />

          {/* Centered deck. Outer wrapper positions each card; inner wrapper
              runs the animation so the centering transform isn't overwritten. */}
          {Array.from({ length: DECK_SIZE }).map((_, i) => {
            const offsetX = (i - DECK_SIZE / 2) * 2.2;
            const offsetY = -i * 0.6;
            const baseRotate = (i - DECK_SIZE / 2) * 1.2;
            return (
              <div
                key={i}
                className="absolute left-1/2 top-1/2"
                style={{
                  // Outer wrapper anchors each card at center + a small offset
                  // so the stack reads as a subtle fan. Inner div handles the
                  // shuffle motion.
                  transform: `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px) rotate(${baseRotate}deg)`,
                  zIndex: i,
                }}
              >
                <div
                  className="w-20 h-28 rounded-xl border-2 border-gold/30 shadow-glow overflow-hidden bg-mystic-900"
                  style={{
                    animation: isShuffling
                      ? `shuffle-card ${0.55 + i * 0.04}s ease-in-out infinite`
                      : 'none',
                    animationDelay: isShuffling ? `${i * 0.04}s` : undefined,
                  }}
                >
                  <img
                    src={backSrc}
                    alt=""
                    className="w-full h-full object-cover pointer-events-none select-none"
                    draggable={false}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-2">
          <h2 className="font-display-hero text-2xl text-gold-foil">
            {isShuffling ? t('readings.shuffleView.inProgress') : t('readings.shuffleView.clearMind')}
          </h2>
          <p className="text-mystic-300 text-sm">
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
