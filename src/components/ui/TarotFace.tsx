import { memo, type ImgHTMLAttributes } from 'react';
import { useT } from '../../i18n/useT';
import { Tag } from './Chip';
import { SUIT_GLYPHS, type SuitKey } from '../icons/SuitGlyphs';
import { getBundledCardPath, getBundledFullPath, getBundledThumbPath } from '../../config/bundledImages';
import { localizeCard } from '../../i18n/localizeCard';
import type { TarotCard } from '../../types';

/**
 * TarotFace — one tarot card, face up, as the product draws it.
 *
 * The 78 bundled faces are 400×600 bitmaps with a baked English nameplate
 * in their bottom band. Measured across all 78 (scratchpad p7-B1a-plate.py):
 * the plate text starts at row 458 at the earliest (two-of-pentacles) and
 * the inner frame's bottom rule sits between rows 453 and 473. So the
 * image is shown from the top only, down to row ~452, and the name is
 * drawn by the app on a flat plate beneath it: localized, in the display
 * serif, with the Major Arcana's roman numeral on a small tab at the head —
 * the plate-and-numeral convention of a designed deck.
 *
 * Geometry (every size is 2:3):
 *   image box    84% of the height, overflow hidden
 *   image        111.6% wide, object-cover object-top — scaled up a sixth,
 *                so that 1.26 widths of height show the top 452 of 600 rows
 *                (1.26 / (1.116 × 1.5) × 600 = 451.6) and the matte loses
 *                5.8% on each side, well inside its 16% margin
 *   plate        16% of the height, flat mystic-900, one gold/25 rule on top
 *
 * One hairline (gold/30), no scrim, no glow, no nested borders.
 *
 * `reversed` turns the IMAGE only; the plate stays upright and a
 * "Reversed" Tag sits under the card (`reversedTag={false}` when the
 * caller names the orientation itself). Inside a flipping plane (the reveal,
 * the Home card) the plane carries the reversal as part of the turn, so
 * those callers render TarotFace upright and let the turn invert it.
 *
 * Sizes: thumb 114 (library grid) · sm 64 (small slots; `detail` becomes
 * `quiet`: rank + suit glyph, or the numeral) · md 125 · lg 160 · xl 224
 * (card detail) · fill (the parent's width — reveal grids, flip cards).
 * The share image stays bitmap (shareCard.ts draws its own plate).
 */

export type TarotFaceSize = 'thumb' | 'sm' | 'md' | 'lg' | 'xl' | 'fill';

export interface TarotFaceProps {
  /** Any card-shaped object with an id and a name; `arcana` / `suit` refine the plate. */
  card: Pick<TarotCard, 'id' | 'name'> & Partial<Pick<TarotCard, 'arcana' | 'suit' | 'imageUrl'>>;
  size?: TarotFaceSize;
  reversed?: boolean;
  /** Render the "Reversed" Tag under a reversed card. Default true. */
  reversedTag?: boolean;
  /**
   * `full` — the localized name on the plate. `quiet` — the rank and suit
   * glyph (or the numeral) for tiles too small to carry a name. Defaults to
   * `quiet` at `sm`, `full` otherwise.
   */
  detail?: 'full' | 'quiet';
  /** Override the bitmap (a progressive loader's current src). */
  src?: string | null;
  /** Corner radius role. `inset` (8) for tiles and grids, `card` (16) for a hero. */
  radius?: 'inset' | 'card';
  loading?: ImgHTMLAttributes<HTMLImageElement>['loading'];
  /** Accessible name. Defaults to the localized card name; pass '' for a purely decorative face. */
  alt?: string;
  className?: string;
}

const WIDTH: Record<TarotFaceSize, string> = {
  thumb: 'w-[114px]',
  sm: 'w-16',
  md: 'w-[125px]',
  lg: 'w-40',
  xl: 'w-56',
  fill: 'w-full',
};

/** Plate type by size — never below the caption role. */
const PLATE_TYPE: Record<TarotFaceSize, string> = {
  thumb: 'text-caption',
  sm: 'text-caption',
  md: 'text-caption',
  lg: 'text-meta',
  xl: 'text-ui',
  fill: 'text-caption',
};

const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];
const RANK_SHORT = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'P', 'Kn', 'Q', 'K'];

const isMajorId = (id: number) => id >= 0 && id <= 21;
const isMinorId = (id: number) => id >= 22 && id <= 77;

/** Minor rank 1..14 from the id alone, so a DB row without `number` still gets one. */
function minorRank(id: number): number {
  return ((id - 22) % 14) + 1;
}

function suitOf(card: TarotFaceProps['card']): SuitKey {
  if (card.suit && card.suit in SUIT_GLYPHS) return card.suit as SuitKey;
  if (!isMinorId(card.id)) return 'major';
  return (['wands', 'cups', 'swords', 'pentacles'] as const)[Math.floor((card.id - 22) / 14)];
}

/** The bitmap for the size: 150 px for small slots, 400 px for tiles, 512 px for the hero. */
function bitmapFor(id: number, size: TarotFaceSize): string | null {
  if (size === 'sm') return getBundledThumbPath(id) ?? getBundledFullPath(id);
  if (size === 'xl') return getBundledCardPath(id) ?? getBundledFullPath(id);
  return getBundledFullPath(id) ?? getBundledCardPath(id);
}

/** "Queen of Pentacles" → ["Queen", "of", "Pentacles"]; other shapes stay whole. */
function splitName(name: string): { head: string; tail?: string } {
  const m = /^(.+?)\s+of\s+(.+)$/i.exec(name);
  return m ? { head: m[1], tail: m[2] } : { head: name };
}

export const TarotFace = memo(function TarotFace({
  card,
  size = 'md',
  reversed = false,
  reversedTag = true,
  detail,
  src,
  radius = 'inset',
  loading,
  alt,
  className = '',
}: TarotFaceProps) {
  const { t } = useT('app');
  const name = localizeCard(card as TarotCard).name;
  const major = card.arcana === 'major' || (card.arcana === undefined && isMajorId(card.id));
  const quiet = detail ? detail === 'quiet' : size === 'sm';
  const face = src === undefined ? bitmapFor(card.id, size) : src;
  const label = alt ?? name;
  const rounded = radius === 'card' ? 'rounded-card' : 'rounded-inset';
  const { head, tail } = splitName(name);
  const SuitGlyph = SUIT_GLYPHS[suitOf(card)];

  const plate = quiet ? (
    major ? (
      <span className="font-display font-semibold text-caption tracking-[0.08em] text-gold">{ROMAN[card.id] ?? ''}</span>
    ) : (
      <span className="inline-flex items-center gap-1 text-gold">
        <span className="font-body text-caption font-semibold tabular-nums">{RANK_SHORT[minorRank(card.id) - 1]}</span>
        <SuitGlyph className="w-3 h-3" />
      </span>
    )
  ) : (
    <span
      className={`block font-display font-semibold uppercase tracking-[0.1em] leading-[1.1] text-gold text-center ${PLATE_TYPE[size]} ${size === 'thumb' || size === 'sm' || size === 'fill' ? 'text-balance' : ''}`}
    >
      {tail ? (
        <>
          <span className="block">{head}</span>
          <span className="block">
            <span className="text-[0.8em] normal-case tracking-[0.06em]">of</span> {tail}
          </span>
        </>
      ) : (
        head
      )}
    </span>
  );

  return (
    <div className={`${size === 'fill' ? 'w-full' : 'inline-flex flex-col items-center'} ${className}`.trim()}>
      <div
        className={`relative ${WIDTH[size]} aspect-[2/3] ${rounded} overflow-hidden bg-mystic-850 border border-gold/30 select-none`}
        role={label ? 'img' : undefined}
        aria-label={label || undefined}
        aria-hidden={label ? undefined : true}
      >
        {/* The art: the top 452 rows, the baked plate cropped away. */}
        <div className={`absolute inset-x-0 top-0 h-[84%] overflow-hidden ${reversed ? 'rotate-180' : ''}`}>
          {face ? (
            <img
              src={face}
              alt=""
              width={400}
              height={600}
              loading={loading}
              decoding="async"
              draggable={false}
              className="block h-full w-[111.6%] max-w-none -ml-[5.8%] object-cover object-top pointer-events-none"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center p-2 text-center">
              <span className="text-caption text-mystic-300 line-clamp-3">{name}</span>
            </div>
          )}
        </div>

        {/* The plate: flat, one rule, the name in the display serif. */}
        <div className="absolute inset-x-0 bottom-0 h-[16%] bg-mystic-900 border-t border-gold/25 flex items-center justify-center px-1 overflow-hidden">
          {plate}
        </div>

        {/* The numeral tab at the head — the Major Arcana's convention. */}
        {major && !quiet && (
          <span
            className="absolute top-0 left-1/2 -translate-x-1/2 inline-flex h-4 min-w-[22px] items-center justify-center rounded-b-mark border border-t-0 border-gold/25 bg-mystic-900 px-1 font-display font-semibold text-caption leading-none tracking-[0.06em] text-gold"
            aria-hidden
          >
            {ROMAN[card.id] ?? ''}
          </span>
        )}
      </div>
      {reversed && reversedTag && (
        <Tag tone="neutral" size="sm" className="mt-2">
          {t('readings.revealView.reversed', { defaultValue: 'Reversed' })}
        </Tag>
      )}
    </div>
  );
});
