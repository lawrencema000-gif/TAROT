/**
 * The shuffle.
 *
 * It used to be a two-second timer with a wiggle on top: ten cards jittered
 * in place with a fixed order while the copy promised "spreading all 78
 * cards" and told you to focus on a question nobody had asked. The person
 * had no part in it.
 *
 * Now the deck deals itself out, riffles while it shuffles, and the person
 * ends it: tapping the deck cuts it, which is what a hand does at a table.
 * The riffle is still a progress indicator rather than decoration — it runs
 * only while the state says so — and the phone ticks softly under it, capped
 * so it never becomes a rattle. Left alone, the shuffle finishes on its own.
 *
 * Every card is the Arcana back at the deck's true proportion (2:3); the
 * stack is one object the reader can act on, not a picture of one.
 *
 * Reduced motion is handled by the global block in index.css, which pins
 * animation duration and iteration with `!important`: the deck simply *is*
 * there, fanned and still, and the riffle haptics are skipped.
 */
import { useEffect, type CSSProperties } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ChevronLeft, Shuffle } from 'lucide-react';
import { Button } from '../../ui';
import { useT } from '../../../i18n/useT';
import { riffleHaptics, thump } from '../../../utils/haptics';

interface TarotShuffleViewProps {
  isShuffling: boolean;
  cardBackUrl: string | null | undefined;
  onBack: () => void;
  onShuffle: () => void;
  /** The reader cuts the deck: end the shuffle now. */
  onCut: () => void;
}

const DECK_SIZE = 12;

const DECK_KEYFRAMES = `
@keyframes arcana-deal {
  from { opacity: 0; transform: translate3d(var(--deal-x, 0px), var(--deal-y, 0px), 0) rotate(var(--deal-r, 0deg)) scale(0.9); }
  to   { opacity: 1; transform: translate3d(0, 0, 0) rotate(0deg) scale(1); }
}
@keyframes arcana-riffle {
  0%   { transform: translate3d(0, 0, 0) rotate(0deg); }
  28%  { transform: translate3d(-14px, -18px, 0) rotate(-7deg); }
  56%  { transform: translate3d(10px, -10px, 0) rotate(5deg); }
  80%  { transform: translate3d(-3px, -3px, 0) rotate(-2deg); }
  100% { transform: translate3d(0, 0, 0) rotate(0deg); }
}
`;

export function TarotShuffleView({ isShuffling, cardBackUrl, onBack, onShuffle, onCut }: TarotShuffleViewProps) {
  const { t } = useT('app');
  const reduceMotion = !!useReducedMotion();
  const backSrc = cardBackUrl || '/card-backs/default.svg';

  useEffect(() => {
    if (!isShuffling || reduceMotion) return;
    return riffleHaptics();
  }, [isShuffling, reduceMotion]);

  const cut = () => {
    thump();
    onCut();
  };

  return (
    <div className="space-y-6">
      <style>{DECK_KEYFRAMES}</style>
      <button
        onClick={onBack}
        className="text-sm text-mystic-400 hover:text-mystic-300 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" aria-hidden />
        {t('readings.back')}
      </button>

      <div className="text-center space-y-6 py-10">
        {/* The deck. A button while shuffling — tap to cut — and a picture otherwise. */}
        <button
          type="button"
          onClick={isShuffling ? cut : undefined}
          disabled={!isShuffling}
          aria-label={isShuffling ? t('readings.shuffleView.cutDeck', { defaultValue: 'Cut the deck' }) : undefined}
          className={`relative mx-auto flex items-center justify-center select-none touch-manipulation [-webkit-tap-highlight-color:transparent] ${
            isShuffling ? 'cursor-pointer' : 'cursor-default'
          }`}
          style={{ width: 240, height: 220 }}
        >
          {/* One soft bloom behind the deck — the hero's light, static. */}
          <div
            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full bg-gold/10 blur-3xl transition-opacity duration-deliberate ${
              isShuffling ? 'opacity-100' : 'opacity-50'
            }`}
            aria-hidden
          />
          {Array.from({ length: DECK_SIZE }).map((_, i) => {
            const offsetX = (i - DECK_SIZE / 2) * 2.4;
            const offsetY = -i * 0.7;
            const baseRotate = (i - DECK_SIZE / 2) * 1.4;
            return (
              <div
                key={i}
                className="absolute left-1/2 top-1/2"
                style={{
                  transform: `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px) rotate(${baseRotate}deg)`,
                  zIndex: i,
                }}
                aria-hidden
              >
                <div
                  className="w-20 h-[120px] rounded-inset border border-gold/30 overflow-hidden bg-mystic-850"
                  style={{
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
                    decoding="async"
                    className="w-full h-full object-cover pointer-events-none select-none"
                    draggable={false}
                  />
                </div>
              </div>
            );
          })}
        </button>

        <div className="space-y-2">
          <h2 className="heading-display-lg text-mystic-100" aria-live="polite">
            {isShuffling
              ? t('readings.shuffleView.inProgress', { defaultValue: 'Shuffling the deck' })
              : t('readings.shuffleView.clearMind', { defaultValue: 'Clear your mind' })}
          </h2>
          <p className="text-ui text-mystic-400">
            {isShuffling
              ? t('readings.shuffleView.spreading', { defaultValue: 'Tap the deck to cut it when it feels right.' })
              : t('readings.shuffleView.focusQuestion', { defaultValue: 'Hold your focus, then shuffle.' })}
          </p>
        </div>

        {!isShuffling && (
          <Button variant="gold" onClick={onShuffle} size="lg">
            <Shuffle className="w-4 h-4" aria-hidden />
            {t('readings.shuffleView.shuffleDeck', { defaultValue: 'Shuffle the deck' })}
          </Button>
        )}
      </div>
    </div>
  );
}
