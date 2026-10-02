import type { ReactNode } from 'react';
import type { CartoGridCell, CartoSpread, CartoTile } from '../../types/cartomancy';

/**
 * The table: where each card of a playing-card spread lies.
 *
 * Four shapes, one component. A `row` is one line of cards (the hero at
 * 160×240, three at ≈111×167, five at 60×90); a `grid` is rows and
 * columns with their captions (the 3×3 at md, the Romany 3×7 at 46×69);
 * `pillars` is Two Hearts' two columns of three with the bond card centred
 * under them; an `arc` is the Horseshoe, seven tiles on an absolute curve
 * inside a 358×236 box that scales with the column.
 *
 * The component owns geometry only. Each cell asks the caller for its
 * tile (`renderTile`), so the same layout shows face-down backs mid-flip,
 * drawn faces, or a shared reading's static faces. Tiles of 64 px and
 * under have no room for a name, so they carry a number and the layout
 * renders a legend list beneath the table — that is where "Reversed" is
 * said for a small tile, since a quiet face has no title tab to turn.
 *
 * Geometry at a 390 px viewport (16 px gutters → 358 px): md tiles are a
 * 3-column grid at max-w-sm; sm tiles are fixed 60 px; xs tiles come from
 * `grid-cols-7 gap-x-1.5` over 358 px = 46 px each; the arc's cells are
 * centres and rotations in the 358×236 box, placed as percentages.
 */

export interface CartomancyLegend {
  /** The position's name for row `index`. */
  label: (index: number) => string;
  /** What has been drawn there: the card's name, "Reversed", or nothing yet. */
  trailing?: (index: number) => ReactNode;
  /** Tap a legend row (a revealed card opens its detail). */
  onSelect?: (index: number) => void;
}

export interface CartomancyLayoutProps {
  spread: CartoSpread;
  /** Cards on the table — the spread's count, or the Yes or No five-card variant. */
  count: number;
  /** The tile for cell `index`: a FlipTile, a static face, or a placeholder. */
  renderTile: (index: number, opts: { tile: CartoTile; number?: number }) => ReactNode;
  /** Text under a hero or md tile (position name, reversed line). Not called for small tiles. */
  captionFor?: (index: number) => ReactNode;
  /** The list under a table of small tiles. Omit to render the table alone. */
  legend?: CartomancyLegend;
  className?: string;
}

/** Tile size for the cards on the table, honouring the Yes or No five-card variant. */
export function tileFor(spread: CartoSpread, count: number): CartoTile {
  const { layout } = spread;
  if (layout.kind === 'row' && layout.variant && count === layout.variant.cardCount) return layout.variant.tile;
  return layout.tile;
}

const CAPTION = 'text-caption text-mystic-400 leading-tight';

function Legend({ count, legend }: { count: number; legend: CartomancyLegend }) {
  return (
    <ol className="divide-y divide-mystic-800 border-y border-mystic-800">
      {Array.from({ length: count }, (_, i) => {
        const trailing = legend.trailing?.(i);
        const inner = (
          <>
            <span className="w-5 shrink-0 text-caption font-semibold tabular-nums text-gold" aria-hidden>
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 text-meta text-mystic-200">{legend.label(i)}</span>
            {trailing !== undefined && trailing !== null && (
              <span className="max-w-[45%] shrink-0 truncate text-right text-meta text-mystic-400">{trailing}</span>
            )}
          </>
        );
        const row = 'flex w-full items-center gap-3 py-2 min-h-[44px] text-left';
        return (
          <li key={i}>
            {legend.onSelect ? (
              <button
                type="button"
                onClick={() => legend.onSelect?.(i)}
                className={`${row} select-none touch-manipulation [-webkit-tap-highlight-color:transparent] transition-colors duration-fast [@media(hover:hover)]:[&:hover:not(:active)]:text-mystic-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold/50 rounded-inset`}
              >
                {inner}
              </button>
            ) : (
              <div className={row}>{inner}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function CartomancyLayout({ spread, count, renderTile, captionFor, legend, className = '' }: CartomancyLayoutProps) {
  const { layout } = spread;
  const tile = tileFor(spread, count);
  const small = tile === 'sm' || tile === 'xs';

  const captioned = (index: number, body: ReactNode, widthClass: string) => (
    <div key={index} className={`flex flex-col items-center gap-2 ${widthClass}`}>
      {body}
      {captionFor && <div className="text-center">{captionFor(index)}</div>}
    </div>
  );

  let table: ReactNode;

  if (layout.kind === 'row') {
    if (tile === 'hero') {
      table = <div className="flex justify-center">{captioned(0, renderTile(0, { tile }), 'w-40')}</div>;
    } else if (tile === 'sm') {
      table = (
        <div className="flex justify-center gap-2">
          {Array.from({ length: count }, (_, i) => (
            <div key={i} className="w-[60px]">
              {renderTile(i, { tile, number: i + 1 })}
            </div>
          ))}
        </div>
      );
    } else {
      table = (
        <div className="grid grid-cols-3 gap-x-3 gap-y-4 max-w-sm mx-auto">
          {Array.from({ length: count }, (_, i) => captioned(i, renderTile(i, { tile }), 'w-full'))}
        </div>
      );
    }
  } else if (layout.kind === 'arc') {
    const { box } = layout;
    const pct = (n: number, of: number) => `${((n / of) * 100).toFixed(3)}%`;
    const w = 60;
    const h = 90;
    table = (
      <div className="relative mx-auto w-full" style={{ maxWidth: box.w, aspectRatio: `${box.w} / ${box.h}` }}>
        {layout.cells.slice(0, count).map((cell) => (
          <div
            key={cell.index}
            className="absolute"
            style={{
              left: pct(cell.cx - w / 2, box.w),
              top: pct(cell.cy - h / 2, box.h),
              width: pct(w, box.w),
              transform: `rotate(${cell.rot}deg)`,
            }}
          >
            {renderTile(cell.index, { tile: 'sm', number: cell.index + 1 })}
          </div>
        ))}
      </div>
    );
  } else {
    // grid or pillars
    const rows = Array.from({ length: layout.rows }, (_, r) => layout.cells.filter((c) => c.row === r && c.index < count));
    const xs = tile === 'xs';
    const cols = layout.cols;
    const gridCols = cols === 7 ? 'grid-cols-7' : cols === 2 ? 'grid-cols-2' : 'grid-cols-3';
    const gap = xs ? 'gap-x-1.5' : 'gap-x-3';
    const width = layout.kind === 'pillars' ? 'max-w-[15.75rem] mx-auto' : xs ? '' : 'max-w-sm mx-auto';

    const cellNode = (cell: CartoGridCell) => {
      const spans = (cell.span ?? 1) > 1;
      const body = renderTile(cell.index, { tile, number: xs ? cell.index + 1 : undefined });
      if (xs) return <div key={cell.index}>{body}</div>;
      if (spans) {
        // the bond card: centred under the pillars at a pillar's width
        return (
          <div key={cell.index} className="col-span-2 flex justify-center">
            {captioned(cell.index, body, 'w-[calc(50%-0.375rem)]')}
          </div>
        );
      }
      return captioned(cell.index, body, 'w-full');
    };

    table = (
      <div className={`space-y-3 ${width}`.trim()}>
        {xs ? (
          <div className={`grid ${gridCols} ${gap} text-center`} aria-hidden>
            {Array.from({ length: cols }, (_, c) => (
              <span key={c} className="text-caption tabular-nums text-mystic-500">
                {c + 1}
              </span>
            ))}
          </div>
        ) : (
          layout.colLabels && (
            <div className={`grid ${gridCols} ${gap} text-center`}>
              {layout.colLabels.map((label, c) => (
                <span key={c} className={CAPTION}>
                  {label}
                </span>
              ))}
            </div>
          )
        )}
        {rows.map((cells, r) =>
          cells.length === 0 ? null : (
            <div key={r}>
              {layout.rowLabels?.[r] && <p className={`${CAPTION} mb-1.5`}>{layout.rowLabels[r]}</p>}
              <div className={`grid ${gridCols} ${gap} ${xs ? '' : 'gap-y-4'}`}>{cells.map(cellNode)}</div>
            </div>
          ),
        )}
        {xs && layout.colLabels && (
          <p className="text-caption text-mystic-400 leading-relaxed">
            {layout.colLabels.map((label, c) => (
              <span key={c} className="inline-block mr-3">
                <span className="tabular-nums text-gold">{c + 1}</span> {label}
              </span>
            ))}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-5 ${className}`.trim()}>
      {table}
      {small && legend && <Legend count={count} legend={legend} />}
    </div>
  );
}
