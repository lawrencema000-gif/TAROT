import { EmblemPathsGroup, fourPointStar, type EmblemPaths } from './CourtEmblem';

/**
 * The Joker's emblem: a jester's three-bell cap over a four-point sparkle,
 * in the same 64×64 box and line weight as the court emblems. Both Jokers
 * share the drawing; the Red Joker is told from the Black by its ink
 * (`text-coral` against `text-gold`) and by the index star.
 */

const circle = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0 Z`;

export const JOKER_EMBLEM_PATHS: EmblemPaths = {
  shapes: [
    // three lobes from the band: the side ones curl out and down, the middle one stands
    'M12 40 C4 38 -3 30 3 21 C11 23 18 32 24 40 Z',
    'M23 40 C25 27 29 15 32 5 C35 15 39 27 41 40 Z',
    'M52 40 C60 38 67 30 61 21 C53 23 46 32 40 40 Z',
    // the headband
    'M8 40 L56 40 L56 46 L8 46 Z',
    // the sparkle beneath
    fourPointStar(32, 56, 7),
    // bells at the tips
    circle(3, 21, 3),
    circle(32, 4.5, 3),
    circle(61, 21, 3),
  ],
  lines: [],
  dots: [],
};

/** The index mark that stands in for a rank letter on a Joker. */
export const JOKER_INDEX_STAR = fourPointStar(8, 8, 8);

export function JokerEmblem() {
  return (
    <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <EmblemPathsGroup paths={JOKER_EMBLEM_PATHS} />
    </g>
  );
}
