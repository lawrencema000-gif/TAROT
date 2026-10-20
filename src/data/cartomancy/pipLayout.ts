import type { PipRank, PlayingRank } from '../../types/cartomancy';

/**
 * Where the pips sit on a 200×300 face.
 *
 * A lattice of three columns and seven rows, in the proportions of a
 * printed deck: every pip below the middle is drawn upside down, so the
 * card reads the same whichever way it comes out of the shuffle. Row
 * numbers are the face's own units (the viewBox of `PlayingCardFace`).
 */

export const FACE_W = 200;
export const FACE_H = 300;

/** Lattice columns: left, centre, right. */
export const PIP_X = { L: 62, C: 100, R: 138 } as const;

/** Lattice rows: r1 top … r7 bottom, plus the two half-rows the 7, 8 and 10 use. */
export const PIP_Y = {
  r1: 78,
  upperMid: 114,
  r3: 126,
  r4: 150,
  r5: 174,
  lowerMid: 186,
  r7: 222,
} as const;

/** Side of a pip glyph in face units; the Ace carries one large pip. */
export const PIP_SIZE = 22;
export const ACE_PIP_SIZE = 48;

export interface Pip {
  x: number;
  y: number;
  /** Below the middle of the face: drawn rotated 180° about its own centre. */
  inverted: boolean;
}

type Col = keyof typeof PIP_X;

const pip = (col: Col, y: number): Pip => ({ x: PIP_X[col], y, inverted: y > FACE_H / 2 });

const { r1, upperMid, r3, r4, r5, lowerMid, r7 } = PIP_Y;

const FOUR: Pip[] = [pip('L', r1), pip('R', r1), pip('L', r7), pip('R', r7)];
const SIX: Pip[] = [pip('L', r1), pip('R', r1), pip('L', r4), pip('R', r4), pip('L', r7), pip('R', r7)];
const EIGHT_SIDES: Pip[] = [
  pip('L', r1),
  pip('R', r1),
  pip('L', r3),
  pip('R', r3),
  pip('L', r5),
  pip('R', r5),
  pip('L', r7),
  pip('R', r7),
];

export const PIP_LAYOUT: Record<PipRank, Pip[]> = {
  ace: [pip('C', r4)],
  '2': [pip('C', r1), pip('C', r7)],
  '3': [pip('C', r1), pip('C', r4), pip('C', r7)],
  '4': FOUR,
  '5': [...FOUR, pip('C', r4)],
  '6': SIX,
  // The odd pip of the Seven sits in the upper half only, as on a printed
  // deck; it is the one pip in the whole lattice without a mirror.
  '7': [...SIX, pip('C', upperMid)],
  '8': [...SIX, pip('C', upperMid), pip('C', lowerMid)],
  '9': [...EIGHT_SIDES, pip('C', r4)],
  '10': [...EIGHT_SIDES, pip('C', upperMid), pip('C', lowerMid)],
};

export function isPipRank(rank: PlayingRank | 'joker'): rank is PipRank {
  return rank in PIP_LAYOUT;
}

/** The pips for a rank, or null for a court card or a joker. */
export function pipsFor(rank: PlayingRank | 'joker'): Pip[] | null {
  return isPipRank(rank) ? PIP_LAYOUT[rank] : null;
}

/** Glyph side for a rank's pips. */
export function pipSizeFor(rank: PlayingRank | 'joker'): number {
  return rank === 'ace' ? ACE_PIP_SIZE : PIP_SIZE;
}
