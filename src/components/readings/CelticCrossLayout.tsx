import { useEffect, useRef, type CSSProperties } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Info } from 'lucide-react';
import { useT } from '../../i18n/useT';
import type { TarotCard } from '../../types';
import { getBundledCardPath, getBundledThumbPath } from '../../config/bundledImages';
import { flipHaptics } from '../../utils/haptics';

/*
 * The Celtic Cross, laid out as the reader would lay it: a cross of six —
 * the significator with the crossing card lying across it, what is above,
 * below, behind and ahead — and the staff of four beside it, read from the
 * bottom up. A grid rather than pixel positions, so the spread breathes
 * with the screen instead of living inside a fixed 220×320 box.
 *
 * Kept deliberately in step with `tarot/TarotRevealView.tsx`, which renders
 * THIS component for the Celtic Cross while drawing every other spread with
 * its own grid. Same flip, same numbers, same stagger, same haptic: a user
 * gets one gesture for every spread on the same screen.
 */
const FLIP_MS = 520;
const FLIP_EASE = 'cubic-bezier(0.22, 0.68, 0.24, 1)';
const FLIP_STAGGER_MS = 120;
const DEFAULT_BACK = '/card-backs/default.svg';
const BACKFACE: CSSProperties = {
  backfaceVisibility: 'hidden',
  WebkitBackfaceVisibility: 'hidden',
};
/* A reversed card turns into its reversal: a half-turn on Z rides along
   with the flip. Both functions are always present so the two states
   interpolate function by function rather than through a matrix. */
const AT_REST = 'rotateY(0deg) rotateZ(0deg)';
const turned = (reversed: boolean) => `rotateY(180deg) rotateZ(${reversed ? 180 : 0}deg)`;

interface DrawnCard { card: TarotCard; reversed: boolean; revealed: boolean }

interface CelticCrossLayoutProps {
  drawnCards: DrawnCard[];
  onRevealCard: (index: number) => void;
  onCardClick: (card: TarotCard, reversed: boolean) => void;
  getPositionLabel: (index: number) => string;
  cardBackUrl?: string;
}

/*
 * Ten slots of 56×84 on a phone: the 150×225 `thumb` variant covers that
 * at 2.7× for 135 KB decoded each, against 1.5 MB for the 512×768 face.
 * Tapping a revealed card opens the full-size art in the sheet.
 */
const faceFor = (card: TarotCard): string | undefined =>
  getBundledThumbPath(card.id) ?? getBundledCardPath(card.id) ?? card.imageUrl;

export function CelticCrossLayout({
  drawnCards,
  onRevealCard,
  onCardClick,
  getPositionLabel,
  cardBackUrl,
}: CelticCrossLayoutProps) {
  const { t } = useT('app');
  const reduceMotion = !!useReducedMotion();
  const backSrc = cardBackUrl || DEFAULT_BACK;

  // Held so an unmount mid-flip cannot buzz a phone whose card is gone.
  const cancelHaptic = useRef<() => void>(() => {});
  useEffect(() => () => cancelHaptic.current(), []);
  const reveal = (index: number) => {
    cancelHaptic.current();
    cancelHaptic.current = flipHaptics(FLIP_MS, reduceMotion);
    onRevealCard(index);
  };

  /*
   * Stagger per reveal event, ranked in reveal order — the same rule the
   * reveal view applies, so its interpretation delay lines up with the
   * last card landing here. A lone tap flips at once; "reveal all"
   * cascades through the cross and up the staff.
   */
  const prevRevealed = useRef<boolean[]>([]);
  const flipDelays = useRef<number[]>([]);
  {
    const newly: number[] = [];
    drawnCards.forEach((d, i) => {
      if (!d.revealed) flipDelays.current[i] = 0;
      else if (!prevRevealed.current[i]) newly.push(i);
    });
    newly.forEach((idx, rank) => {
      flipDelays.current[idx] = newly.length > 1 ? rank * FLIP_STAGGER_MS : 0;
    });
    prevRevealed.current = drawnCards.map((d) => d.revealed);
  }

  const renderCard = (index: number) => {
    const drawn = drawnCards[index];
    if (!drawn) return null;
    const delay = flipDelays.current[index] ?? 0;
    const face = faceFor(drawn.card);
    const position = getPositionLabel(index);
    return (
      <button
        type="button"
        onClick={() => drawn.revealed ? onCardClick(drawn.card, drawn.reversed) : reveal(index)}
        aria-label={
          drawn.revealed
            ? t('readings.revealView.openCard', { name: drawn.card.name, defaultValue: 'Open {{name}}' })
            : t('readings.revealView.revealPosition', { position, defaultValue: 'Reveal {{position}}' })
        }
        className={`relative w-full h-full rounded-inset select-none touch-manipulation [-webkit-tap-highlight-color:transparent] transition-transform duration-base ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 ${
          drawn.revealed ? '' : 'motion-safe:hover:scale-[1.04] motion-safe:active:scale-95'
        }`}
        style={{ perspective: '1000px' }}
      >
        {/* Press feedback on the wrapper, the turn on the child: two
            transforms on one element fight, and the scale wins. */}
        <div
          className="relative w-full h-full"
          style={{
            transformStyle: 'preserve-3d',
            transform: drawn.revealed ? turned(drawn.reversed) : AT_REST,
            transition: `transform ${FLIP_MS}ms ${FLIP_EASE}`,
            transitionDelay: `${delay}ms`,
          }}
        >
          {/* Back — the Arcana back, the same object the reader drew. */}
          <div className="absolute inset-0 rounded-inset overflow-hidden bg-mystic-850" style={BACKFACE}>
            <img
              src={backSrc}
              alt=""
              decoding="async"
              className="w-full h-full object-cover pointer-events-none select-none"
              draggable={false}
            />
          </div>

          {/* Face — mounted from the start and pre-turned, so the image is
              already decoded when the turn begins. The art frames itself. */}
          <div
            className="absolute inset-0 rounded-inset overflow-hidden bg-mystic-850"
            style={{ ...BACKFACE, transform: 'rotateY(180deg)' }}
            aria-hidden={!drawn.revealed}
          >
            {face ? (
              <img
                src={face}
                alt={drawn.card.name}
                decoding="async"
                className="w-full h-full object-cover pointer-events-none select-none"
                draggable={false}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center p-1 text-center">
                <p className="text-caption text-mystic-300 line-clamp-3 leading-tight">{drawn.card.name}</p>
              </div>
            )}
          </div>
        </div>
        {/* The affordance arrives as the card settles, not with it. */}
        <div
          className="absolute top-0.5 right-0.5 w-4 h-4 bg-mystic-900/80 rounded-full flex items-center justify-center pointer-events-none transition-opacity duration-base ease-out"
          style={{ opacity: drawn.revealed ? 1 : 0, transitionDelay: `${delay + FLIP_MS - 140}ms` }}
          aria-hidden
        >
          <Info className="w-2.5 h-2.5 text-gold" />
        </div>
      </button>
    );
  };

  const label = (index: number) => (
    <p className="text-caption text-mystic-400 text-center leading-tight">
      {getPositionLabel(index)}
    </p>
  );

  /* One slot: a 2:3 card with its position named beneath. */
  const slot = (index: number) => (
    <div key={index} className="flex flex-col items-center gap-1 w-16">
      <div className="w-14 aspect-[2/3]">{renderCard(index)}</div>
      {label(index)}
    </div>
  );

  return (
    <div className="w-full">
      <div className="flex items-start justify-center gap-4">
        {/* The cross: above / left · centre · right / below. */}
        <div className="grid grid-cols-3 gap-2 items-start justify-items-center">
          <div aria-hidden />
          {slot(4)}
          <div aria-hidden />

          {slot(3)}
          {/* The significator with the crossing card lying across it. Both
              labels sit beneath, upright — a label turned 90° is not a label. */}
          <div className="flex flex-col items-center gap-1 w-16">
            <div className="relative w-14 aspect-[2/3]">
              <div className="absolute inset-0">{renderCard(0)}</div>
              <div className="absolute inset-0 z-10" style={{ transform: 'rotate(90deg)' }}>
                {renderCard(1)}
              </div>
            </div>
            {label(0)}
            {label(1)}
          </div>
          {slot(5)}

          <div aria-hidden />
          {slot(2)}
          <div aria-hidden />
        </div>

        {/*
          The staff is read BOTTOM-to-TOP:
            idx 6 (Your attitude)       → bottom of staff
            idx 7 (External influences) → ↑
            idx 8 (Hopes and fears)     → ↑
            idx 9 (Final outcome)       → top of staff
          `flex-col-reverse` renders the array bottom-up so visual order
          matches the position semantics.
        */}
        <div className="flex flex-col-reverse gap-2">
          {[6, 7, 8, 9].map((idx) => slot(idx))}
        </div>
      </div>

      <p className="text-caption text-mystic-500 text-center mt-5">
        {t('readings.celticCross.caption', { defaultValue: 'The cross and the staff' })}
      </p>
    </div>
  );
}
