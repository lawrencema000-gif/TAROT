import type { CSSProperties, ReactNode } from 'react';
import { Info } from 'lucide-react';

/*
 * The flip, for a drawn face.
 *
 * The constants and the mechanics are TarotRevealView's (readings/tarot/
 * TarotRevealView.tsx:38-76): two faces on one `preserve-3d` plane rotated
 * on Y over 520 ms with a long ease-out tail; only transform and opacity
 * move; reduced motion is handled by the global block in index.css. The
 * difference is the face: a tarot tile shows a bitmap, this one shows
 * whatever node it is given — a `PlayingCardFace`, which draws its own
 * reversal (the title tab turns back and reads at the top), so the plane
 * turns on Y only and lands on a face that is already the right way up.
 */

export const FLIP_MS = 520;
export const FLIP_EASE = 'cubic-bezier(0.22, 0.68, 0.24, 1)';
/** Multi-card reveals land in sequence rather than as one slab. */
export const FLIP_STAGGER_MS = 120;
/** A beat after the last card has landed before the reading arrives. */
export const FLIP_SETTLE_MS = 120;
export const DEFAULT_BACK = '/card-backs/default.svg';

const BACKFACE: CSSProperties = {
  backfaceVisibility: 'hidden',
  WebkitBackfaceVisibility: 'hidden',
};

export interface FlipTileProps {
  revealed: boolean;
  /** Stagger for this reveal event, in ms. */
  delayMs: number;
  backSrc: string;
  /** The face, pre-turned and hidden until the flip: a PlayingCardFace with its own `reversed`. */
  face: ReactNode;
  radius?: 'rounded-card' | 'rounded-inset';
  'aria-label': string;
  onClick: () => void;
  /** Width and aspect come from the caller: `w-40`, `w-full`, or an absolute box. */
  className?: string;
  style?: CSSProperties;
  /** The "there is more here" mark that arrives as the card settles. Off for small tiles. */
  infoBadge?: boolean;
  /**
   * Where the mark sits. A reversed face carries its name tab at the top,
   * where a top-right mark would cover the name: it goes bottom-left there.
   */
  badgeCorner?: 'top-right' | 'bottom-left';
  /** A numbered badge at the top-left corner, for tiles too small to carry a label. */
  number?: number;
}

export function FlipTile({
  revealed,
  delayMs,
  backSrc,
  face,
  radius = 'rounded-inset',
  'aria-label': ariaLabel,
  onClick,
  className = '',
  style,
  infoBadge = false,
  badgeCorner = 'top-right',
  number,
}: FlipTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`relative aspect-[2/3] ${radius} select-none touch-manipulation [-webkit-tap-highlight-color:transparent] transition-transform duration-base ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 ${
        revealed ? '' : 'motion-safe:hover:scale-[1.03] motion-safe:active:scale-95'
      } ${className}`.trim()}
      style={{ perspective: '1000px', ...style }}
    >
      <div
        className="relative w-full h-full"
        style={{
          transformStyle: 'preserve-3d',
          transform: revealed ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transition: `transform ${FLIP_MS}ms ${FLIP_EASE}`,
          transitionDelay: `${delayMs}ms`,
        }}
      >
        {/* Back — the Arcana back the reader drew this card by. */}
        <div className={`absolute inset-0 ${radius} overflow-hidden bg-mystic-850 border border-gold/25`} style={BACKFACE}>
          <img src={backSrc} alt="" decoding="async" draggable={false} className="w-full h-full object-cover pointer-events-none select-none" />
        </div>
        {/* Face — mounted from the start, pre-turned 180° and hidden by
            backface-visibility, so the flip lands on a drawn face, not a
            fetch. The SVG paints its own surface and frame; the parent sets
            the frame's ink (text-gold). */}
        <div
          className={`absolute inset-0 ${radius} overflow-hidden bg-mystic-850 text-gold [&>svg]:w-full [&>svg]:h-full [&>svg]:block`}
          style={{ ...BACKFACE, transform: 'rotateY(180deg)' }}
          aria-hidden={!revealed}
        >
          {face}
        </div>
      </div>
      {number !== undefined && (
        <span
          className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-gold text-mystic-950 text-caption font-semibold tabular-nums flex items-center justify-center pointer-events-none"
          aria-hidden
        >
          {number}
        </span>
      )}
      {infoBadge && (
        <div
          className={`absolute ${badgeCorner === 'bottom-left' ? 'bottom-1.5 left-1.5' : 'top-1.5 right-1.5'} w-6 h-6 bg-mystic-900/80 rounded-full flex items-center justify-center pointer-events-none transition-opacity duration-base ease-out`}
          style={{ opacity: revealed ? 1 : 0, transitionDelay: `${delayMs + FLIP_MS - 140}ms` }}
          aria-hidden
        >
          <Info className="w-3.5 h-3.5 text-gold" />
        </div>
      )}
    </button>
  );
}
