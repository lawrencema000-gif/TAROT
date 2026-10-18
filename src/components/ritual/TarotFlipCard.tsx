import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Bookmark, BookmarkCheck, Share2, HelpCircle, RotateCcw } from 'lucide-react';
import { KeywordRow, Disclosure, TarotFace } from '../ui';
import type { TarotCard } from '../../types';
import { useProgressiveImage } from '../../hooks/useProgressiveImage';
import { useT } from '../../i18n/useT';
import { flipHaptics } from '../../utils/haptics';
import { cardBackSrc } from '../../utils/imageUrl';
import { firstSentences, hasMoreThan } from '../readings/tarot/readingText';

/*
 * Kept deliberately in step with the flip in
 * `readings/tarot/TarotRevealView.tsx` — the same gesture in two places
 * must feel like the same gesture. 520ms with a long ease-out tail: a
 * moment the user is watching on purpose, so it may run past the
 * UI-feedback budget, but 700ms (what this was) reads as sluggish.
 *
 * A reversed card is drawn reversed: its art is inverted on the face
 * (TarotFace `reversed`, which turns the art in place when the
 * upright/reversed toggle changes it, so a change of meaning is a turn,
 * not a repaint) while the plate stays upright and legible (§6.6). The
 * plane only turns on Y; both functions are always written so the states
 * interpolate one by one.
 *
 * The global reduced-motion block in index.css pins transition-duration
 * with `!important`, which outranks these inline values, so the card
 * simply arrives face-up; the JS-timed haptic is gated in flipHaptics.
 */
const FLIP_MS = 520;
const FLIP_EASE = 'cubic-bezier(0.22, 0.68, 0.24, 1)';

/** Inline rather than a utility class: the 3D chain is load-bearing here,
 *  and a card that loses `backface-visibility` shows both faces at once. */
const BACKFACE: CSSProperties = {
  backfaceVisibility: 'hidden',
  WebkitBackfaceVisibility: 'hidden',
};

const AT_REST = 'rotateY(0deg) rotateZ(0deg)';
const TURNED = 'rotateY(180deg) rotateZ(0deg)';

interface TarotFlipCardProps {
  card: TarotCard;
  reversed: boolean;
  saved: boolean;
  onSave: () => void;
  onShare: () => void;
  onMeaning: () => void;
  cardBackUrl?: string;
  /**
   * The card was turned over today already (the ritual's card part is
   * done): it lies face up, without the turn. It used to mount face down
   * on every visit, asking "Tap to reveal" a card the reader had read and
   * a ritual that said it was complete (p8 F53/F74).
   */
  revealed?: boolean;
  /** The reader turned the card over here: turning it is the ritual's card part. */
  onReveal?: () => void;
}

export function TarotFlipCard({
  card,
  reversed,
  saved,
  onSave,
  onShare,
  onMeaning,
  cardBackUrl,
  revealed = false,
  onReveal,
}: TarotFlipCardProps) {
  const { t } = useT('app');
  const [isFlipped, setIsFlipped] = useState(revealed);
  // A turn made here — animated, announced, felt — as against a card that
  // arrived face up.
  const [turnedHere, setTurnedHere] = useState(false);
  const [showReversed, setShowReversed] = useState(reversed);

  // The day's ritual row can land after the card mounted (it was turned on
  // another device): lay it face up then too. Never face down again.
  useEffect(() => {
    if (revealed) setIsFlipped(true);
  }, [revealed]);

  const { src: cardImageUrl } = useProgressiveImage({
    cardId: card.id,
    cardName: card.name,
    remoteUrl: card.imageUrl,
    priority: isFlipped ? 'high' : 'normal',
  });

  // The face-down side is the Arcana back — the same card the reader
  // meets everywhere else in the product — or the back they chose, at
  // the card's 180 px (max-w-[180px]).
  const backSrc = cardBackSrc(cardBackUrl, 180);

  const reduceMotion = !!useReducedMotion();
  // Held so an unmount mid-flip cannot buzz a phone whose card is gone.
  const cancelHaptic = useRef<() => void>(() => {});
  useEffect(() => () => cancelHaptic.current(), []);

  const handleFlip = () => {
    if (isFlipped) return;
    // A tap as the card is pressed, a thump as it passes edge-on.
    cancelHaptic.current();
    cancelHaptic.current = flipHaptics(FLIP_MS, reduceMotion);
    setTurnedHere(true);
    setIsFlipped(true);
    onReveal?.();
  };

  const toggleReversed = () => {
    setShowReversed(prev => !prev);
  };

  // The locale's list separator, not a Latin ", " built here: 「愚者、正位置」 in
  // ja and zh, "The Fool, Upright" in en and ko (p9 QZ-7).
  const cardDescription = isFlipped
    ? `${card.name}${t('cardMeaning.listSeparator', { defaultValue: ', ' })}${showReversed ? t('home.ritualCards.reversed') : t('home.ritualCards.upright')}`
    : t('home.ritualCards.faceDownLabel', { defaultValue: 'Your card, face down. Tap to turn it over.' });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="min-w-0">
          <p className="font-display-eyebrow text-mystic-500">{t('home.ritualCards.yourCard')}</p>
          {/* The heading names what is on the table: the invitation before
              the turn, the card after it (R5 m-2). Lining figures: the
              serif's old-style 5 sat like a subscript in "ペンタクルの5" (F80). */}
          <h3 className="heading-display-md lining-nums text-mystic-100 truncate">
            {isFlipped ? card.name : t('home.ritualCards.tapToReveal')}
          </h3>
        </div>
        {isFlipped && (
          <button
            onClick={toggleReversed}
            aria-label={
              showReversed
                ? t('home.ritualCards.switchToUpright', { defaultValue: 'Show the upright meaning' })
                : t('home.ritualCards.switchToReversed', { defaultValue: 'Show the reversed meaning' })
            }
            aria-pressed={showReversed}
            className={`flex shrink-0 items-center gap-1.5 px-3 min-h-[44px] rounded-full text-meta transition-colors duration-fast ${
              showReversed
                ? 'bg-mystic-700 text-mystic-200'
                : 'bg-mystic-800/50 text-mystic-400 hover:bg-mystic-800'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden />
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
            transform: isFlipped ? TURNED : AT_REST,
            // Only the reader's own tap turns the card; one that was turned
            // earlier simply lies face up.
            transition: turnedHere ? `transform ${FLIP_MS}ms ${FLIP_EASE}` : 'none',
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
              is decoded before the hinge moves. A reversed card's art is
              inverted, its plate upright; the toggle above names the
              orientation. */}
          <div
            className="absolute inset-0"
            style={{ ...BACKFACE, transform: 'rotateY(180deg)' }}
            aria-hidden={!isFlipped}
          >
            <TarotFace card={card} size="fill" radius="card" src={cardImageUrl || undefined} reversed={showReversed} reversedTag={false} loading="eager" alt="" />
          </div>
        </div>
        {/* The orientation is named by the toggle above the card; the
            plate stays upright, so nothing sits over it. */}
      </div>

      {/* Screen reader announcement for card reveal — the reader's own turn
          only; a card that arrives face up is named by its label. */}
      <div className="sr-only" aria-live="assertive" role="status">
        {turnedHere &&
          t('home.ritualCards.revealedAnnounce', {
            defaultValue: 'Card revealed: {{name}}, {{orientation}}.',
            name: card.name,
            orientation: showReversed ? t('home.ritualCards.reversed') : t('home.ritualCards.upright'),
          })}
      </div>

      {isFlipped && (
        <div
          className={`space-y-4 ${turnedHere ? 'animate-fade-in' : ''}`}
          style={turnedHere ? { animationDuration: '280ms', animationDelay: `${FLIP_MS - 160}ms`, animationFillMode: 'both' } : undefined}
        >
          {/* Short by default (R5 M-12): the keywords, two sentences, and
              the rest behind a disclosure — the actions stay in view. */}
          {card.keywords?.length > 0 && <KeywordRow keywords={card.keywords.slice(0, 4)} />}

          <p className="reading-copy text-center">
            {firstSentences(showReversed ? card.meaningReversed : card.meaningUpright, 2)}
          </p>

          {hasMoreThan(showReversed ? card.meaningReversed : card.meaningUpright, 2) && (
            <Disclosure variant="row" label={t('readings.result.readFullMeaning', { defaultValue: 'Read the full meaning' })}>
              <p className="reading-copy">{showReversed ? card.meaningReversed : card.meaningUpright}</p>
            </Disclosure>
          )}

          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={(e) => { e.stopPropagation(); onSave(); }}
              aria-label={
                saved
                  ? t('home.ritualCards.unsaveCard', { defaultValue: 'Remove {{name}} from saved', name: card.name })
                  : t('home.ritualCards.saveCard', { defaultValue: 'Save {{name}}', name: card.name })
              }
              aria-pressed={saved}
              className={`flex items-center gap-1.5 px-4 min-h-[44px] rounded-full text-ui transition-[background-color,transform] duration-fast active:scale-95 ${
                saved
                  ? 'bg-gold/20 text-gold'
                  : 'bg-mystic-800 text-mystic-300 hover:bg-mystic-700'
              }`}
            >
              {saved ? <BookmarkCheck className="w-4 h-4" aria-hidden /> : <Bookmark className="w-4 h-4" aria-hidden />}
              {t('home.ritualCards.save')}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onShare(); }}
              aria-label={t('home.ritualCards.shareCard', { defaultValue: 'Share {{name}}', name: card.name })}
              className="flex items-center gap-1.5 px-4 min-h-[44px] rounded-full text-ui bg-mystic-800 text-mystic-300 hover:bg-mystic-700 transition-[background-color,transform] duration-fast active:scale-95"
            >
              <Share2 className="w-4 h-4" aria-hidden />
              {t('home.ritualCards.share')}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onMeaning(); }}
              aria-label={t('home.ritualCards.meaningOf', { defaultValue: 'Read the meaning of {{name}}', name: card.name })}
              className="flex items-center gap-1.5 px-4 min-h-[44px] rounded-full text-ui bg-mystic-800 text-mystic-300 hover:bg-mystic-700 transition-[background-color,transform] duration-fast active:scale-95"
            >
              <HelpCircle className="w-4 h-4" aria-hidden />
              {t('home.ritualCards.meaning')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
