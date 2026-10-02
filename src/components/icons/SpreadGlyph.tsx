import { memo, type SVGProps } from 'react';

/** One card position on the spread's grid. `r: 90` lays the card across (the Celtic Cross crossing card). */
export interface SpreadGlyphPosition {
  x: number;
  y: number;
  r?: 0 | 90;
}

/** The six castable spreads, keyed by the ids in TarotSection's spreadConfigs. */
export type SpreadGlyphId = 'single' | 'three-card' | 'relationship' | 'career' | 'shadow' | 'celtic-cross';

/**
 * Position layouts for the castable spreads. `x` runs left to right, `y`
 * top to bottom, one cell per card. The library's forty spreads carry no
 * coordinates yet (SpreadPosition in tarotSpreads.ts) — when they do, they
 * use this shape.
 */
export const SPREAD_LAYOUTS: Record<SpreadGlyphId, SpreadGlyphPosition[]> = {
  single: [{ x: 1, y: 1 }],
  'three-card': [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
  relationship: [{ x: 0, y: 0 }, { x: 0, y: 2 }, { x: 1, y: 1 }, { x: 2, y: 0 }, { x: 2, y: 2 }],
  career: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
  shadow: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }],
  'celtic-cross': [
    { x: 1, y: 1 }, { x: 1, y: 1, r: 90 }, { x: 1, y: 0 }, { x: 1, y: 2 }, { x: 0, y: 1 }, { x: 2, y: 1 },
    { x: 3, y: 3 }, { x: 3, y: 2 }, { x: 3, y: 1 }, { x: 3, y: 0 },
  ],
};

const VIEW = 24;
/**
 * Grid pitch in viewBox units. The directive's 5×8 card on a 7-unit cell
 * overlaps the row below by a unit, and in the render six cards read as
 * three bars; so the card is 5×6.5 and rows sit on an 8-unit pitch
 * (columns stay on 7) — two units of air between columns, one and a half
 * between rows, and every layout up to 3×3 fits the 24-unit box unscaled.
 */
const CELL_X = 7;
const CELL_Y = 8;
const CARD_W = 5;
const CARD_H = 6.5;

export interface SpreadGlyphProps extends Omit<SVGProps<SVGSVGElement>, 'viewBox' | 'fill'> {
  /** The spread's positions, or one of SPREAD_LAYOUTS. */
  layout: SpreadGlyphPosition[];
  /** Rendered size in px. Default 24. */
  size?: number;
  /**
   * Wrap the glyph in its tile: `canvas` → `w-12 h-12 rounded-inset
   * bg-mystic-800 text-gold`; `paper` → `bg-paper-2 text-ink-gold`. Omit to
   * render the bare SVG and place it yourself.
   */
  tile?: 'canvas' | 'paper';
}

/**
 * SpreadGlyph — a spread's shape as little cards on a grid, the way the
 * reference app marks each spread row (shot-03) and each journal entry
 * (shot-04). Reads at 24px; `currentColor` so it tints with its tile.
 *
 * Use in the spread picker rows (TarotHomeView, SpreadsPage) and journal
 * rows, in the tile recipe above. Not as a page hero and never animated.
 * The grid is centred; a layout wider or taller than three cells (the
 * Celtic Cross is four by four) is scaled down to fit the 24-unit box.
 */
export const SpreadGlyph = memo(function SpreadGlyph({ layout, size = 24, tile, className = '', ...rest }: SpreadGlyphProps) {
  const cols = Math.max(...layout.map((p) => p.x)) + 1;
  const rows = Math.max(...layout.map((p) => p.y)) + 1;
  const span = Math.max(cols * CELL_X, rows * CELL_Y);
  const s = Math.min(1, VIEW / span);
  const offX = (VIEW - cols * CELL_X * s) / 2;
  const offY = (VIEW - rows * CELL_Y * s) / 2;
  const w = CARD_W * s;
  const h = CARD_H * s;
  const svg = (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      aria-hidden
      {...rest}
    >
      {layout.map((p, i) => {
        const cx = offX + (p.x + 0.5) * CELL_X * s;
        const cy = offY + (p.y + 0.5) * CELL_Y * s;
        return (
          <rect
            key={i}
            x={round(cx - w / 2)}
            y={round(cy - h / 2)}
            width={round(w)}
            height={round(h)}
            rx={round(1 * s)}
            opacity={0.75}
            transform={p.r === 90 ? `rotate(90 ${round(cx)} ${round(cy)})` : undefined}
          />
        );
      })}
    </svg>
  );
  if (!tile) return svg;
  const tileClass =
    tile === 'paper'
      ? 'bg-paper-2 text-ink-gold'
      : 'bg-mystic-800 text-gold';
  return (
    <span className={`inline-flex w-12 h-12 shrink-0 items-center justify-center rounded-inset ${tileClass}`} aria-hidden>
      {svg}
    </span>
  );
});

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
