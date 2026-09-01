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
 *
 * Motion pass 2026-08: the deck now deals itself out on arrival and
 * riffles while shuffling. Both keyframe sets live in this file rather
 * than index.css — they are used by exactly one component, and a
 * globally-defined keyframe with a single inline consumer is invisible
 * to any grep for class names, which is how the previous one ended up
 * on a dead-code list while it was still driving the deck.
 *
 * Reduced motion is handled by the global block in index.css, which
 * pins animation-duration/-delay and iteration-count with `!important`
 * — beating these inline declarations. The deal ends at `both` fill and
 * the riffle's last keyframe is the resting transform, so under reduced
 * motion the deck simply *is* there, fanned and still.
 */
import type { CSSProperties } from 'react';
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

/*
 * `arcana-deal` collapses each card back onto the centre of the stack and
 * lets it travel out to its place in the fan — the offsets come in as
 * custom properties so one keyframe serves all ten cards.
 *
 * `arcana-riffle` is a loop, deliberately: it runs only while the deck is
 * actually being shuffled, so it is a progress indicator, not decoration.
 * It stops when the state does. Transform only — no shadow, no filter.
 */
const DECK_KEYFRAMES = `
@keyframes arcana-deal {
  from {
    opacity: 0;
    transform: translate3d(var(--deal-x, 0px), var(--deal-y, 0px), 0) rotate(var(--deal-r, 0deg)) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
  }
}
@keyframes arcana-riffle {
  0%   { transform: translate3d(0, 0, 0) rotate(0deg); }
  28%  { transform: translate3d(-13px, -17px, 0) rotate(-7deg); }
  56%  { transform: translate3d(9px, -9px, 0) rotate(5deg); }
  80%  { transform: translate3d(-3px, -3px, 0) rotate(-2deg); }
  100% { transform: translate3d(0, 0, 0) rotate(0deg); }
}
`;

export function TarotShuffleView({ isShuffling, cardBackUrl, onBack, onShuffle }: TarotShuffleViewProps) {
  const { t } = useT('app');
  const backSrc = cardBackUrl || '/card-backs/default.svg';

  return (
    <div className="space-y-6">
      <style>{DECK_KEYFRAMES}</style>
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
            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-gold/10 blur-3xl transition-opacity duration-deliberate ${
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
                    // Cards nearest the top of the stack lead the riffle;
                    // the small per-card duration spread stops ten cards
                    // moving as one rigid block.
                    animation: isShuffling
                      ? `arcana-riffle ${0.58 + i * 0.02}s ease-in-out ${i * 0.045}s infinite`
                      : `arcana-deal 320ms cubic-bezier(0.16, 1, 0.3, 1) ${i * 26}ms both`,
                    '--deal-x': `${-offsetX}px`,
                    '--deal-y': `${-offsetY}px`,
                    '--deal-r': `${-baseRotate}deg`,
                  } as CSSProperties}
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
            size="lg"
          >
            <Shuffle className="w-4 h-4" />
            {t('readings.shuffleView.shuffleDeck')}
          </Button>
        )}
      </div>
    </div>
  );
}
