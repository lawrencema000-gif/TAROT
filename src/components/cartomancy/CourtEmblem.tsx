import type { CourtRank } from '../../types/cartomancy';

/**
 * Court emblems — the Jack, Queen and King as objects, not portraits.
 *
 * A 64×64 box of line art in the CardBack idiom: hairline strokes in
 * `currentColor`, closed shapes tinted at 15%, drawn once as path data so
 * the canvas share card can replay them with `Path2D`. The caller puts the
 * box where it belongs (`translate(68 118)` centres it on a 200×300 face).
 *
 *   Jack  — a plume over a rolled scroll: the messenger, the young
 *   Queen — a three-point crown over a crescent: mature care and order
 *   King  — a five-point crown over a sceptre: authority
 */

export const EMBLEM_BOX = 64;

export interface EmblemPaths {
  /** Closed shapes: stroked and tinted. */
  shapes: string[];
  /** Open hairlines: stroked only. */
  lines: string[];
  /** Small solid dots `[cx, cy, r]`. */
  dots: Array<[number, number, number]>;
}

const f = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** The CardBack's four-point star, as path data. */
export function fourPointStar(cx: number, cy: number, r: number): string {
  const inner = r * 0.32;
  return `M${f(cx)} ${f(cy - r)}L${f(cx + inner)} ${f(cy - inner)}L${f(cx + r)} ${f(cy)}L${f(cx + inner)} ${f(cy + inner)}L${f(cx)} ${f(cy + r)}L${f(cx - inner)} ${f(cy + inner)}L${f(cx - r)} ${f(cy)}L${f(cx - inner)} ${f(cy - inner)}Z`;
}

const circle = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0 Z`;

export const COURT_EMBLEM_PATHS: Record<CourtRank, EmblemPaths> = {
  jack: {
    shapes: [
      // the plume, leaning right, its base resting on the scroll
      'M19 50 C22 32 36 14 58 7 C47 17 35 32 29 50 Z',
      // the two rolled ends of the scroll
      circle(13, 56, 5),
      circle(49, 56, 5),
    ],
    lines: [
      // midrib of the plume
      'M24 48 C28 34 40 20 55 10',
      // the sheet between the rolls
      'M13 51 L49 51',
      'M13 61 L49 61',
    ],
    dots: [],
  },
  queen: {
    shapes: [
      // three-point crown, set low
      'M10 56 L20 34 L31 48 L42 34 L52 56 Z',
      // the crescent moon rising to its upper right, horns to the right
      'M56 7 A10 10 0 1 0 56 27 A13 13 0 0 1 56 7 Z',
    ],
    lines: [
      // the band
      'M10 56 L52 56',
    ],
    dots: [
      [20, 34, 2],
      [42, 34, 2],
    ],
  },
  king: {
    shapes: [
      // five-point crown
      'M10 36 L10 18 L17 28 L22 14 L27 28 L32 10 L37 28 L42 14 L47 28 L54 18 L54 36 Z',
      // the sceptre's head
      fourPointStar(32, 45, 5),
    ],
    lines: [
      // the band
      'M10 36 L54 36',
      // the shaft
      'M32 50 L32 62',
    ],
    dots: [
      [10, 18, 2],
      [22, 14, 2],
      [32, 10, 2],
      [42, 14, 2],
      [54, 18, 2],
    ],
  },
};

/** Renders an `EmblemPaths` table. Stroke, fill and colour are inherited. */
export function EmblemPathsGroup({ paths }: { paths: EmblemPaths }) {
  return (
    <>
      {paths.shapes.map((d, i) => (
        <path key={`s${i}`} d={d} fill="currentColor" fillOpacity="0.15" />
      ))}
      {paths.lines.map((d, i) => (
        <path key={`l${i}`} d={d} />
      ))}
      {paths.dots.map(([cx, cy, r], i) => (
        <circle key={`d${i}`} cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />
      ))}
    </>
  );
}

/**
 * A court emblem in its 64×64 box. Place it with a `<g transform>`; the
 * stroke width is set here so the emblem reads the same beside the pips.
 */
export function CourtEmblem({ rank }: { rank: CourtRank }) {
  return (
    <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <EmblemPathsGroup paths={COURT_EMBLEM_PATHS[rank]} />
    </g>
  );
}
