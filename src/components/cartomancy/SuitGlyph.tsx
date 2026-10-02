import type { SVGProps } from 'react';
import type { PlayingSuit } from '../../types/cartomancy';

/**
 * The four suit marks, drawn once as path data in a 32×32 box.
 *
 * Each suit is a single `d` string so the same shape serves three callers:
 * the `<SuitGlyph>` icon, the pips and indices of `PlayingCardFace` (via
 * `<SuitGlyphPaths>` inside an already-transformed `<g>`), and the canvas
 * share card, which draws them with `new Path2D(SUIT_PATHS[suit])`. The
 * club's three lobes are arcs inside the one path, so a nonzero fill
 * unions them and no inner seam shows.
 */

export const SUIT_GLYPH_BOX = 32;

const circle = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0 Z`;

export const SUIT_PATHS: Record<PlayingSuit, string> = {
  hearts: 'M16 28 C7.5 20.5 3 15.5 3 10 A6.5 6.5 0 0 1 16 8.5 A6.5 6.5 0 0 1 29 10 C29 15.5 24.5 20.5 16 28 Z',
  diamonds: 'M16 3 L27 16 L16 29 L5 16 Z',
  clubs: `${circle(16, 10.5, 6)}${circle(10.2, 19.5, 6)}${circle(21.8, 19.5, 6)}M13.6 21.5 L12.2 29 L19.8 29 L18.4 21.5 Z`,
  // the lobes are shallow arcs (r 7 over a 13-unit chord) so the stem shows beneath them
  spades: 'M16 3 C24 10 29 14 29 18.5 A7 7 0 0 1 16 21 A7 7 0 0 1 3 18.5 C3 14 8 10 16 3 Z M13.8 21 L12 29 L20 29 L18.2 21 Z',
};

/**
 * Red suits take the rose ink, black suits the gold, the Red Joker coral.
 * On paper (the cream reading surface) the same roles in the ink tier:
 * gold #d4af37 is 1.82:1 on paper and may never be drawn there.
 */
export function suitInkClass(suit: PlayingSuit | 'joker', color: 'red' | 'black', paper = false): string {
  if (suit === 'joker') return color === 'red' ? (paper ? 'text-ink-coral' : 'text-coral') : paper ? 'text-ink-gold' : 'text-gold';
  const red = suit === 'hearts' || suit === 'diamonds';
  if (paper) return red ? 'text-ink-rose' : 'text-ink-gold';
  return red ? 'text-cosmic-rose' : 'text-gold';
}

/**
 * The glyph's path for use inside a larger SVG. The caller positions and
 * scales it: `<g transform="translate(x y) scale(s)"><SuitGlyphPaths suit="hearts" /></g>`
 * where `s = side / SUIT_GLYPH_BOX`. Fill and stroke are inherited.
 */
export function SuitGlyphPaths({ suit }: { suit: PlayingSuit }) {
  return <path d={SUIT_PATHS[suit]} />;
}

export interface SuitGlyphProps extends Omit<SVGProps<SVGSVGElement>, 'viewBox'> {
  suit: PlayingSuit;
  /** Rendered side in CSS px. */
  size?: number;
}

/** A standalone suit mark, filled in `currentColor`. */
export function SuitGlyph({ suit, size = 16, className = '', ...props }: SuitGlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${SUIT_GLYPH_BOX} ${SUIT_GLYPH_BOX}`}
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      focusable="false"
      {...props}
    >
      <SuitGlyphPaths suit={suit} />
    </svg>
  );
}
