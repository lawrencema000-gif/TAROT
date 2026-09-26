import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Bookmark, BookmarkCheck, Share2, HelpCircle, RotateCcw } from 'lucide-react';
import { Tag } from '../ui';
import type { TarotCard } from '../../types';
import { useProgressiveImage } from '../../hooks/useProgressiveImage';
import { useT } from '../../i18n/useT';
import { flipHaptics } from '../../utils/haptics';

/*
 * Kept deliberately in step with the flip in
 * `readings/tarot/TarotRevealView.tsx` — the same gesture in two places
 * must feel like the same gesture. 520ms with a long ease-out tail: a
 * moment the user is watching on purpose, so it may run past the
 * UI-feedback budget, but 700ms (what this was) reads as sluggish.
 *
 * A reversed card turns INTO its reversal — a half-turn on Z rides along
 * with the flip — and the upright/reversed toggle turns the same plane
 * afterwards, so a change of meaning is a turn, not a repaint. Both
 * functions are always written so the states interpolate one by one.
 *
 * The global reduced-motion block in index.css pins transition-duration
 * with `!important`, which outranks these inline values, so the card
 * simply arrives face-up; the JS-timed haptic is gated in flipHaptics.
 */
const FLIP_MS = 520;
const FLIP_EASE = 'cubic-bezier(0.22, 0.68, 0.24, 1)';
const DEFAULT_BACK = '/card-backs/default.svg';

/** Inline rather than a utility class: the 3D chain is load-bearing here,
 *  and a card that loses `backface-visibility` shows both faces at once. */
const BACKFACE: CSSProperties = {
  backfaceVisibility: 'hidden',
  WebkitBackfaceVisibility: 'hidden',
};

const AT_REST = 'rotateY(0deg) rotateZ(0deg)';
const turned = (reversed: boolean) => `rotateY(180deg) rotateZ(${reversed ? 180 : 0}deg)`;

interface TarotFlipCardProps {
  card: TarotCard;
  reversed: boolean;
  saved: boolean;
  onSave: () => void;
  onShare: () => void;
  onMeaning: () => void;
  cardBackUrl?: string;
}

export function TarotFlipCard({
  card,
  reversed,
  saved,
  onSave,
  onShare,
  onMeaning,
  cardBackUrl,
}: TarotFlipCardProps) {
  const { t } = useT('app');
  const [isFlipped, setIsFlipped] = useState(false);
  const [showReversed, setShowReversed] = useState(reversed);

  const { src: cardImageUrl, isLoading: isCardLoading, isPlaceholder } = useProgressiveImage({
    cardId: card.id,
    cardName: card.name,
    remoteUrl: card.imageUrl,
    priority: isFlipped ? 'high' : 'normal',
  });

  // The face-down side is the Arcana back — the same card the reader
  // meets everywhere else in the product — or the back they chose.
  const backSrc = cardBackUrl || DEFAULT_BACK;

  const reduceMotion = !!useReducedMotion();
  // Held so an unmount mid-flip cannot buzz a phone whose card is gone.
  const cancelHaptic = useRef<() => void>(() => {});
  useEffect(() => () => cancelHaptic.current(), []);

  const handleFlip = () => {
    if (isFlipped) return;
    // A tap as the card is pressed, a thump as it passes edge-on.
    cancelHaptic.current();
    cancelHaptic.current = flipHaptics(FLIP_MS, reduceMotion);
    setIsFlipped(true);
  };

  const toggleReversed = () => {
    setShowReversed(prev => !prev);
  };

  const cardDescription = isFlipped
    ? `${card.name}, ${showReversed ? 'reversed' : 'upright'}`
    : 'Tarot card face down. Tap to reveal';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="font-display-eyebrow text-mystic-500">{t('home.ritualCards.yourCard')}</p>
          <h3 className="heading-display-md text-mystic-100">{t('home.ritualCards.tapToReveal')}</h3>
        </div>
        {isFlipped && (
          <button
            onClick={toggleReversed}
            aria-label={`Switch to ${showReversed ? 'upright' : 'reversed'} orientation`}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-caption transition-colors duration-fast ${
              showReversed
                ? 'bg-mystic-700 text-mystic-200'
                : 'bg-mystic-800/50 text-mystic-400 hover:bg-mystic-800'
            }`}
          >
            <RotateCcw className="w-3 h-3" />
            {showReversed ? t('home.ritualCards.reversed') : t('home.ritualCards.upright')}
          </button>
        )}
      </div>

      {/* Perspective and press feedback on the wrapper, the turn on the
          child: two transforms on one element fight, and the scale wins. */}
      <div
        className={`relative w-full aspect-[2/3] max-w-[180px] mx-auto rounded-card select-none touch-manipulation [-webkit-tap-highlight-color:transparent] transition-transform duration-base ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 ${
          isFlipped ? '' : 'cursor-pointer motion-safe:active:scale-[0.97]'
        }`}
        style={{ perspective: '1000px' }}
        onClick={handleFlip}
        role="button"
        tabIndex={0}
        aria-label={cardDescription}
        aria-live="polite"
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleFlip(); } }}
      >
        <div
          className="relative w-full h-full"
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? turned(showReversed) : AT_REST,
            transition: `transform ${FLIP_MS}ms ${FLIP_EASE}`,
          }}
        >
          {/* Back — the Arcana back. It frames itself. */}
          <div className="absolute inset-0 rounded-card overflow-hidden bg-mystic-850" style={BACKFACE}>
            <img
              src={backSrc}
              alt=""
              decoding="async"
              draggable={false}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
            />
          </div>

          {/* Face — pre-turned 180° and mounted from the start, so the art
              is decoded before the hinge moves. The art carries its own
              matte, rule and name plate, so nothing is printed over it. */}
          <div
            className="absolute inset-0 rounded-card overflow-hidden bg-mystic-850"
            style={{ ...BACKFACE, transform: 'rotateY(180deg)' }}
            aria-hidden={!isFlipped}
          >
            {cardImageUrl ? (
              <img
                src={cardImageUrl}
                alt={card.name}
                decoding="async"
                draggable={false}
                className={`w-full h-full object-cover pointer-events-none select-none transition-opacity duration-slow ease-out ${
                  isCardLoading || isPlaceholder ? 'opacity-60' : 'opacity-100'
                }`}
              />
            ) : (
              <div className="h-full flex items-center justify-center p-4 text-center">
                <h4 className="heading-display-md text-gold">{card.name}</h4>
              </div>
            )}
          </div>
        </div>

        {/* Named as well as shown: an upside-down plate is not a label.
            Outside the turning plane so it stays upright and legible. */}
        <div
          className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none transition-opacity duration-base ease-out"
          style={{ opacity: isFlipped && showReversed ? 1 : 0, transitionDelay: isFlipped ? `${FLIP_MS - 140}ms` : '0ms' }}
          aria-hidden={!(isFlipped && showReversed)}
        >
          <Tag tone="neutral" size="sm">
            {t('home.ritualCards.reversed')}
          </Tag>
        </div>
      </div>

      {/* Screen reader announcement for card reveal */}
      <div className="sr-only" aria-live="assertive" role="status">
        {isFlipped && `Card revealed: ${card.name}, ${showReversed ? 'reversed' : 'upright'}. ${showReversed ? card.meaningReversed : card.meaningUpright}`}
      </div>

      {isFlipped && (
        <div
          className="space-y-4 animate-fade-in"
          style={{ animationDuration: '280ms', animationDelay: `${FLIP_MS - 160}ms`, animationFillMode: 'both' }}
        >
          <div className="text-center">
            <p className="text-ui text-mystic-300">
              {showReversed ? card.meaningReversed : card.meaningUpright}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {card.keywords.slice(0, 4).map((keyword, i) => (
              <Tag key={i} tone="neutral" size="md">
                {keyword}
              </Tag>
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={(e) => { e.stopPropagation(); onSave(); }}
              aria-label={saved ? `Unsave ${card.name}` : `Save ${card.name}`}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-ui transition-[background-color,transform] duration-fast active:scale-95 ${
                saved
                  ? 'bg-gold/20 text-gold'
                  : 'bg-mystic-800 text-mystic-300 hover:bg-mystic-700'
              }`}
            >
              {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              {t('home.ritualCards.save')}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onShare(); }}
              aria-label={`Share ${card.name}`}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-ui bg-mystic-800 text-mystic-300 hover:bg-mystic-700 transition-[background-color,transform] duration-fast active:scale-95"
            >
              <Share2 className="w-4 h-4" />
              {t('home.ritualCards.share')}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onMeaning(); }}
              aria-label={`View meaning of ${card.name}`}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-ui bg-mystic-800 text-mystic-300 hover:bg-mystic-700 transition-[background-color,transform] duration-fast active:scale-95"
            >
              <HelpCircle className="w-4 h-4" />
              {t('home.ritualCards.meaning')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
