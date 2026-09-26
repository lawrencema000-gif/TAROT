import { describe, it, expect } from 'vitest';
import { lonOf, lonToSvgAngle, polar, sectorPath, spreadAngles, drawDashArray, norm, angleDelta } from './wheelGeometry';

/**
 * The two correctness bugs the Phase 5 audit found in every wheel, pinned:
 * the rising sign's sector was drawn as a 330° band with its glyph on the
 * far side, and a missing longitude fell back to 0° Aries.
 */
describe('wheel geometry', () => {
  const CX = 180, CY = 180;

  it('puts the Ascendant at 9 o’clock, the Descendant at 3, the MC at 12', () => {
    const asc = 15;
    expect(lonToSvgAngle(asc, asc)).toBe(180);
    expect(lonToSvgAngle(asc + 180, asc)).toBe(0);
    const mc = polar(CX, CY, 100, lonToSvgAngle(asc + 270, asc));
    expect(mc.x).toBeCloseTo(CX, 6);
    expect(mc.y).toBeCloseTo(CY - 100, 6); // SVG y grows downward: this is the top
  });

  it('runs the houses counter-clockwise from the Ascendant (house I is lower left)', () => {
    const asc = 15;
    const houseOneMid = polar(CX, CY, 100, lonToSvgAngle(asc + 15, asc));
    expect(houseOneMid.x).toBeLessThan(CX);
    expect(houseOneMid.y).toBeGreaterThan(CY);
  });

  it('draws the sign containing the Ascendant as a 30° sector with its glyph at the ASC', () => {
    // ASC at 15° Aries: Aries spans SVG 165°..195°, straddling the 180° seam.
    const asc = 15;
    const start = lonToSvgAngle(0, asc);
    expect(start).toBe(195);
    const d = sectorPath(CX, CY, 126, 156, start, -30);
    // Large-arc flag must be 0 for a 30° sweep, on both arcs.
    const flags = [...d.matchAll(/A \d+ \d+ 0 (\d) (\d)/g)].map((m) => m[1]);
    expect(flags).toEqual(['0', '0']);
    const glyph = polar(CX, CY, 141, start - 15);
    expect(glyph.x).toBeCloseTo(CX - 141, 6); // 9 o'clock on the sign ring
    expect(glyph.y).toBeCloseTo(CY, 6);
    // Libra, opposite, sits at 3 o'clock — not on top of Aries.
    const libra = polar(CX, CY, 141, lonToSvgAngle(180, asc) - 15);
    expect(libra.x).toBeCloseTo(CX + 141, 6);
  });

  it('derives a missing longitude from sign and degree, never from 0° Aries', () => {
    expect(lonOf({ sign: 'Leo', degree: 10 })).toBe(130);
    expect(lonOf({ sign: 'Pisces', degree: 29.5 })).toBeCloseTo(359.5);
    expect(lonOf({ sign: 'Leo', degree: 10, longitude: 131.2 })).toBeCloseTo(131.2);
    expect(lonOf({ sign: 'Leo', degree: 10, longitude: null })).toBe(130);
  });

  it('spreads colliding coins apart across the 0/360 wrap, centred on the cluster', () => {
    const out = spreadAngles([358, 0, 2], 18);
    const sorted = [...out].sort((a, b) => a - b);
    const gaps = [
      norm(sorted[1] - sorted[0]),
      norm(sorted[2] - sorted[1]),
      norm(sorted[0] + 360 - sorted[2]),
    ];
    // The two neighbouring gaps open to the minimum; the third is the rest of the circle.
    expect(gaps.filter((g) => Math.abs(g - 18) < 1e-3)).toHaveLength(2);
    expect(Math.max(...gaps)).toBeCloseTo(324, 3);
    // The middle coin did not move: the stellium fanned out around its own centre.
    expect(Math.abs(angleDelta(out[1], 0))).toBeLessThan(1e-3);
    // Untouched coins stay where the data put them.
    expect(spreadAngles([10, 100, 200], 18)).toEqual([10, 100, 200]);
  });

  it('keeps a stellium of four in order and at the minimum spacing', () => {
    const out = spreadAngles([90, 91, 92, 93], 18);
    const sorted = [...out].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) expect(sorted[i] - sorted[i - 1]).toBeCloseTo(18, 3);
    // Centred on the original cluster (mean 91.5).
    expect((sorted[0] + sorted[3]) / 2).toBeCloseTo(91.5, 3);
    expect(out[0]).toBeLessThan(out[1]);
    expect(out[3]).toBeGreaterThan(out[2]);
  });

  it('builds a draw-in dasharray that preserves the dash pattern', () => {
    const solid = drawDashArray(100);
    expect(solid).toBe('100.00 100.00');
    const dashed = drawDashArray(100, [4, 3]).split(' ').map(Number);
    // Even count: the last entry is a gap the length of the line.
    expect(dashed.length % 2).toBe(0);
    expect(dashed[dashed.length - 1]).toBe(100);
    const pattern = dashed.slice(0, -1);
    expect(pattern.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 6);
  });
});
