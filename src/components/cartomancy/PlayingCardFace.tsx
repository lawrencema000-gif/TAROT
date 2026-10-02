import type { SVGProps } from 'react';
import type { CourtRank, PlayingCard, PlayingRank, PlayingSuit } from '../../types/cartomancy';
import { FACE_H, FACE_W, pipSizeFor, pipsFor } from '../../data/cartomancy/pipLayout';
import { SUIT_GLYPH_BOX, SuitGlyphPaths, suitInkClass } from './SuitGlyph';
import { CourtEmblem, EMBLEM_BOX } from './CourtEmblem';
import { JOKER_INDEX_STAR, JokerEmblem } from './JokerEmblem';

/**
 * The face of a playing card, drawn.
 *
 * The same object as `CardBack` seen from the other side: the same 200×300
 * viewBox, the same double frame and corner marks, the same gold ink on the
 * card's own surface, so the flip turns one card over rather than swapping
 * two pictures. On the face: a rank-and-suit index in the top-left corner,
 * the pips on a fixed lattice with the lower half inverted, an emblem in a
 * medallion for the courts and the Jokers, and a small title tab at the
 * foot. At `quiet` (tiles of 64 px and under) the tab goes and the index is
 * repeated rotated in the bottom-right, as on any printed deck since the
 * 1880s, so a small tile reads either way up.
 *
 * Pure in `(card, detail, surface, reversed)`: no randomness, no state, so
 * two renders are byte-identical and the markup can be written to disk.
 *
 * Colour: the frame and the rank letters take `currentColor` (set
 * `text-gold` on the parent, or `text-gold/70` for a card at rest). Hearts
 * and Diamonds take the rose ink for their marks, Clubs and Spades the
 * gold; the Red Joker takes coral. No stock hues.
 *
 * `reversed` turns the whole face through 180° and turns the title tab
 * back, so a reversed card is the one whose name reads at the top.
 */

const CX = FACE_W / 2;
const CY = FACE_H / 2;

/** Frame geometry, copied from CardBack.tsx (which keeps its constants private) so the two sides match. */
const FRAME = { outer: { inset: 8, rx: 10, sw: 1.4 }, inner: { inset: 18, rx: 6, sw: 0.9 }, cornerR: 4, cornerAt: 26 } as const;

/** Medallion ring for the courts and Jokers: the back's ring, in the same place. */
const RING = { r: 52, dashedR: 46 } as const;

/** Corner index: a rank glyph over a small suit mark, top-left and (rotated) bottom-right. */
const INDEX = { x: 24, y: 30, textX: 9, baseline: 18, glyph: 14, glyphY: 22 } as const;

/** The title tab at the foot of the face. */
const TAB = { y: 256, h: 20, rx: 4, baseline: 270, fontSize: 10, letterSpacing: 1.4, padX: 7, minW: 72, maxW: 150 } as const;

const DISPLAY_FONT = "'Cormorant Garamond', 'Cormorant Fallback', 'Cormorant Fallback Android', Georgia, serif";
const UI_FONT = "Inter, 'Inter Fallback', 'Inter Fallback Android', system-ui, sans-serif";

export const RANK_INDEX_LABEL: Record<PlayingRank, string> = {
  ace: 'A',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '10': '10',
  jack: 'J',
  queen: 'Q',
  king: 'K',
};

const f = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, ''));

/**
 * Advance width of the tab's uppercase Inter 600 label at 10 units, from
 * Inter's cap widths (narrow I/J, wide M/W, the rest around 0.7 em) plus the
 * letter-spacing. The text is also given `textLength`, so a fallback font
 * with other metrics is spaced into the same box rather than spilling out.
 */
function tabTextWidth(label: string): number {
  let w = 0;
  for (const ch of label) {
    if (ch === ' ') w += 3;
    else if (ch === 'I' || ch === 'J') w += 3.4;
    else if (ch === 'M' || ch === 'W') w += 9.4;
    else if (ch === 'L' || ch === 'F' || ch === 'T' || ch === 'E') w += 6.3;
    else w += 7.3;
    w += TAB.letterSpacing;
  }
  return w - TAB.letterSpacing;
}

function isCourt(rank: PlayingCard['rank']): rank is CourtRank {
  return rank === 'jack' || rank === 'queen' || rank === 'king';
}

export interface PlayingCardFaceProps extends Omit<SVGProps<SVGSVGElement>, 'viewBox'> {
  card: PlayingCard;
  /**
   * `full` carries the title tab at the foot; `quiet`, for tiles of 64 px
   * and under, drops the tab and repeats the index rotated in the
   * bottom-right instead.
   */
  detail?: 'full' | 'quiet';
  /**
   * Where the face lies. `card`: the dark card surface, drawn in the gold
   * the parent sets (`text-gold`), rose for the red suits. `paper`: the
   * cream reading surface (Paper.tsx) — the face becomes an inset panel
   * (`--paper-2`) drawn in the ink tier (ink-gold, ink-rose, ink-coral),
   * because gold is 1.82:1 on paper. `none`: no fill; the parent paints.
   */
  surface?: 'card' | 'paper' | 'none';
  /** Turn the face through 180°; the title tab then reads at the top. */
  reversed?: boolean;
}

function CornerIndex({ card, paper }: { card: PlayingCard; paper: boolean }) {
  const ink = suitInkClass(card.suit, card.color, paper);
  return (
    <g data-index="1" transform={`translate(${INDEX.x} ${INDEX.y})`}>
      {card.rank === 'joker' || card.suit === 'joker' ? (
        <g className={ink} fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round">
          <path d={JOKER_INDEX_STAR} transform={`translate(${INDEX.textX - 8} ${INDEX.baseline - 15})`} />
        </g>
      ) : (
        <>
          <text
            x={INDEX.textX}
            y={INDEX.baseline}
            textAnchor="middle"
            fontFamily={DISPLAY_FONT}
            fontWeight={600}
            fontSize={22}
            fill="currentColor"
            stroke="none"
          >
            {RANK_INDEX_LABEL[card.rank]}
          </text>
          <g
            className={ink}
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinejoin="round"
            transform={`translate(${INDEX.textX - INDEX.glyph / 2} ${INDEX.glyphY}) scale(${f(INDEX.glyph / SUIT_GLYPH_BOX)})`}
          >
            <SuitGlyphPaths suit={card.suit} />
          </g>
        </>
      )}
    </g>
  );
}

function Pips({ suit, rank }: { suit: PlayingSuit; rank: PlayingRank }) {
  const pips = pipsFor(rank);
  if (!pips) return null;
  const size = pipSizeFor(rank);
  const scale = f(size / SUIT_GLYPH_BOX);
  const half = size / 2;
  return (
    <g fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round">
      {pips.map((p) => (
        <g
          key={`${p.x}-${p.y}`}
          data-pip="1"
          transform={
            p.inverted
              ? `translate(${p.x} ${p.y}) rotate(180) translate(${f(-half)} ${f(-half)}) scale(${scale})`
              : `translate(${f(p.x - half)} ${f(p.y - half)}) scale(${scale})`
          }
        >
          <SuitGlyphPaths suit={suit} />
        </g>
      ))}
    </g>
  );
}

/** The emblem is drawn at 1.2× its 64-unit box so it holds its own inside the ring at 64 px. */
const EMBLEM_SCALE = 1.2;

function Medallion({ card, ink }: { card: PlayingCard; ink: string }) {
  const half = (EMBLEM_BOX * EMBLEM_SCALE) / 2;
  const emblemAt = `translate(${f(CX - half)} ${f(CY - half)}) scale(${EMBLEM_SCALE})`;
  return (
    <g data-emblem={card.rank}>
      {/* the ring is the back's ring: frame ink, whatever the suit */}
      <g fill="none" stroke="currentColor">
        <circle cx={CX} cy={CY} r={RING.r} strokeWidth="1" opacity="0.8" />
        <circle cx={CX} cy={CY} r={RING.dashedR} strokeWidth="0.6" opacity="0.5" strokeDasharray="1.5 3" />
      </g>
      <g className={ink}>
        {card.suit !== 'joker' && (
          <g fill="currentColor" stroke="none" opacity="0.22" transform={`translate(${CX - 20} ${CY - 20}) scale(${f(40 / SUIT_GLYPH_BOX)})`}>
            <SuitGlyphPaths suit={card.suit} />
          </g>
        )}
        <g transform={emblemAt}>{card.suit === 'joker' ? <JokerEmblem /> : isCourt(card.rank) ? <CourtEmblem rank={card.rank} /> : null}</g>
      </g>
    </g>
  );
}

function TitleTab({ label, reversed }: { label: string; reversed: boolean }) {
  const text = label.toUpperCase();
  const textW = tabTextWidth(text);
  const w = Math.min(TAB.maxW, Math.max(TAB.minW, Math.round(textW + TAB.padX * 2)));
  const x = CX - w / 2;
  const cy = TAB.y + TAB.h / 2;
  return (
    <g data-tab="1" aria-hidden transform={reversed ? `rotate(180 ${CX} ${cy})` : undefined}>
      <rect x={f(x)} y={TAB.y} width={w} height={TAB.h} rx={TAB.rx} fill="none" stroke="currentColor" strokeWidth="0.9" opacity="0.8" />
      <text
        x={CX}
        y={TAB.baseline}
        textAnchor="middle"
        fontFamily={UI_FONT}
        fontWeight={600}
        fontSize={TAB.fontSize}
        letterSpacing={TAB.letterSpacing}
        textLength={f(Math.min(textW, w - TAB.padX * 2))}
        lengthAdjust="spacing"
        fill="currentColor"
        stroke="none"
      >
        {text}
      </text>
    </g>
  );
}

export function PlayingCardFace({
  card,
  detail = 'full',
  surface = 'card',
  reversed = false,
  className = '',
  ...props
}: PlayingCardFaceProps) {
  const paper = surface === 'paper';
  const ink = suitInkClass(card.suit, card.color, paper);
  const title = card.suit === 'joker' ? 'Joker' : card.name;
  return (
    <svg
      viewBox={`0 0 ${FACE_W} ${FACE_H}`}
      className={className}
      aria-hidden
      focusable="false"
      data-card={card.slug}
      data-surface={surface}
      {...props}
    >
      {surface !== 'none' && (
        <rect x="0" y="0" width={FACE_W} height={FACE_H} rx="14" fill={paper ? 'rgb(var(--paper-2))' : 'rgb(var(--surface-card))'} />
      )}
      {/* on paper the frame ink is set here; on the card surface it is the parent's currentColor, as on the back */}
      <g className={paper ? 'text-ink-gold' : undefined} transform={reversed ? `rotate(180 ${CX} ${CY})` : undefined}>
        <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          {/* double frame with corner marks, as on the back */}
          <rect
            x={FRAME.outer.inset}
            y={FRAME.outer.inset}
            width={FACE_W - FRAME.outer.inset * 2}
            height={FACE_H - FRAME.outer.inset * 2}
            rx={FRAME.outer.rx}
            strokeWidth={FRAME.outer.sw}
          />
          <rect
            x={FRAME.inner.inset}
            y={FRAME.inner.inset}
            width={FACE_W - FRAME.inner.inset * 2}
            height={FACE_H - FRAME.inner.inset * 2}
            rx={FRAME.inner.rx}
            strokeWidth={FRAME.inner.sw}
            opacity="0.7"
          />
          <g strokeWidth="1.2">
            <circle cx={FRAME.cornerAt} cy={FRAME.cornerAt} r={FRAME.cornerR} />
            <circle cx={FACE_W - FRAME.cornerAt} cy={FRAME.cornerAt} r={FRAME.cornerR} />
            <circle cx={FRAME.cornerAt} cy={FACE_H - FRAME.cornerAt} r={FRAME.cornerR} />
            <circle cx={FACE_W - FRAME.cornerAt} cy={FACE_H - FRAME.cornerAt} r={FRAME.cornerR} />
          </g>
        </g>
        {/* the index: top-left, and at `quiet` the same turned through 180° for the
            bottom-right, so a small tile reads either way up. At `full` the title tab
            owns the foot of the face (the long names run to 150 units, under where
            a second index would sit), so the tab is the bottom index. */}
        <CornerIndex card={card} paper={paper} />
        {detail === 'quiet' && (
          <g transform={`rotate(180 ${CX} ${CY})`}>
            <CornerIndex card={card} paper={paper} />
          </g>
        )}
        {/* the field: pips, or a medallion for the courts and the Jokers */}
        {card.suit !== 'joker' && card.rank !== 'joker' && !isCourt(card.rank) ? (
          <g className={ink}>
            <Pips suit={card.suit} rank={card.rank} />
          </g>
        ) : (
          <Medallion card={card} ink={ink} />
        )}
        {detail === 'full' && <TitleTab label={title} reversed={reversed} />}
      </g>
    </svg>
  );
}
