import { ZODIAC_SIGNS } from '../../types/astrology';

/**
 * Pure geometry for the chart wheel. No React, no colour — so the seam
 * handling and the collision spread can be reasoned about (and tested)
 * without rendering anything.
 *
 * Conventions
 *   - Ecliptic longitude: 0° Aries = 0, increasing counter-clockwise on the
 *     chart, as on every printed natal chart.
 *   - SVG angle: 0 = 3 o'clock, increasing clockwise (y points down).
 *   - The Ascendant sits at 9 o'clock (SVG 180°). Houses run counter-
 *     clockwise from it, so house I is the lower-left sector.
 */

export function norm(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * Ecliptic longitude of a placement. The data sometimes omits `longitude`;
 * it must then come from sign + degree, never from a silent 0° Aries.
 */
export function lonOf(p: { longitude?: number | null; sign: string; degree: number }): number {
  if (typeof p.longitude === 'number' && Number.isFinite(p.longitude)) return norm(p.longitude);
  const idx = ZODIAC_SIGNS.indexOf(p.sign as (typeof ZODIAC_SIGNS)[number]);
  return norm(Math.max(0, idx) * 30 + p.degree);
}

/** SVG angle for a longitude when `ascLon` is drawn at 9 o'clock. Null ASC: Aries at 9 o'clock. */
export function lonToSvgAngle(lon: number, ascLon: number | null): number {
  const rel = norm(lon - (ascLon ?? 0)); // degrees counter-clockwise from the ASC
  return norm(180 - rel);
}

export function polar(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/**
 * Annular sector from `startDeg` sweeping `sweepDeg` (signed: negative is
 * counter-clockwise on screen). Stating the sector as start + sweep rather
 * than start + end is what fixes the seam bug: a 30° sign that straddles
 * SVG 0°/360° used to be sorted into a 330° band with its glyph on the far
 * side of the wheel.
 */
export function sectorPath(cx: number, cy: number, rInner: number, rOuter: number, startDeg: number, sweepDeg: number): string {
  const endDeg = startDeg + sweepDeg;
  const o1 = polar(cx, cy, rOuter, startDeg);
  const o2 = polar(cx, cy, rOuter, endDeg);
  const i1 = polar(cx, cy, rInner, endDeg);
  const i2 = polar(cx, cy, rInner, startDeg);
  const large = Math.abs(sweepDeg) > 180 ? 1 : 0;
  const sweep = sweepDeg > 0 ? 1 : 0;
  const f = (n: number) => n.toFixed(2);
  return [
    `M ${f(o1.x)} ${f(o1.y)}`,
    `A ${rOuter} ${rOuter} 0 ${large} ${sweep} ${f(o2.x)} ${f(o2.y)}`,
    `L ${f(i1.x)} ${f(i1.y)}`,
    `A ${rInner} ${rInner} 0 ${large} ${1 - sweep} ${f(i2.x)} ${f(i2.y)}`,
    'Z',
  ].join(' ');
}

/**
 * Push angles apart until every neighbouring pair is at least `minSep`
 * degrees apart, on a circle (the 0/360 seam is a neighbour like any other).
 * Each conflicting pair moves symmetrically, so a stellium of three or more
 * fans out around its own centre instead of drifting one way. Returns the
 * adjusted angles in the input order.
 */
export function spreadAngles(angles: number[], minSep: number): number[] {
  const n = angles.length;
  if (n < 2) return angles.map(norm);
  const sep = Math.min(minSep, 360 / n);
  const order = angles.map((a, i) => ({ a: norm(a), i })).sort((x, y) => x.a - y.a);
  const pos = order.map((o) => o.a);
  // Each pass halves the worst deficit; 200 passes over ten coins is nothing.
  for (let iter = 0; iter < 200; iter++) {
    let moved = false;
    for (let k = 0; k < n; k++) {
      const j = (k + 1) % n;
      const gap = (j === 0 ? pos[j] + 360 : pos[j]) - pos[k];
      if (gap < sep - 1e-7) {
        const push = (sep - gap) / 2;
        pos[k] -= push;
        pos[j] += push;
        moved = true;
      }
    }
    if (!moved) break;
  }
  const out = new Array<number>(n);
  order.forEach((o, k) => { out[o.i] = norm(pos[k]); });
  return out;
}

/** Shortest signed angular distance from `a` to `b`, in (-180, 180]. */
export function angleDelta(a: number, b: number): number {
  const d = norm(b - a);
  return d > 180 ? d - 360 : d;
}

/**
 * A `stroke-dasharray` that draws a line in with `stroke-dashoffset` (length →
 * 0) while keeping its own dash pattern. The pattern is laid down to exactly
 * the line's length, followed by a gap the same length; at offset = length
 * only the gap is over the line, at offset = 0 only the pattern is. Solid
 * lines get the plain `len len` pair.
 */
export function drawDashArray(len: number, pattern?: number[]): string {
  const L = Math.max(0.01, len);
  const f = (v: number) => v.toFixed(2);
  if (!pattern || pattern.length === 0) return `${f(L)} ${f(L)}`;
  const pieces: number[] = [];
  let acc = 0;
  let i = 0;
  while (acc < L - 1e-6 && i < 10000) {
    const v = Math.min(pattern[i % pattern.length], L - acc);
    pieces.push(v);
    acc += v;
    i++;
  }
  // The trailing entry must be a gap (odd index), so end the pattern on a dash.
  if (pieces.length % 2 === 0) pieces.push(0);
  pieces.push(L);
  return pieces.map(f).join(' ');
}

export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
