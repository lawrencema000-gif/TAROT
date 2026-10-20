import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ZodiacGlyphPaths } from '../glyphPaths';
import { ZODIAC_ICONS } from '../ZodiacIcons';
import { ZODIAC_SIGNS } from '../../../types/astrology';

/*
 * ♓ is ")–(": two crescents back to back, each bowing toward the other,
 * joined by a bar. The drawn glyph bowed its arcs outward, "(–)", on the
 * natal wheel, the landing page and (through ZodiacIcons, which carries the
 * same drawings) every other zodiac glyph in the app (p10 d2-ja-11).
 */

type Point = { x: number; y: number };

/** The arcs of a drawing: every `M x y C …` path, as its four control points. */
function arcs(svg: SVGSVGElement): Array<[Point, Point, Point, Point]> {
  return [...svg.querySelectorAll('path')]
    .map((p) => p.getAttribute('d') ?? '')
    .filter((d) => d.includes('C'))
    .map((d) => {
      const n = d.replace(/[MC,]/g, ' ').trim().split(/\s+/).map(Number);
      return [
        { x: n[0], y: n[1] },
        { x: n[2], y: n[3] },
        { x: n[4], y: n[5] },
        { x: n[6], y: n[7] },
      ];
    });
}

/** Where a cubic Bézier is halfway along. */
const middle = ([a, b, c, d]: [Point, Point, Point, Point]): Point => ({
  x: (a.x + 3 * b.x + 3 * c.x + d.x) / 8,
  y: (a.y + 3 * b.y + 3 * c.y + d.y) / 8,
});

function drawing(sign: (typeof ZODIAC_SIGNS)[number]): SVGSVGElement {
  const { container } = render(
    <svg viewBox="0 0 32 32">
      <ZodiacGlyphPaths sign={sign} />
    </svg>,
  );
  return container.querySelector('svg')!;
}

describe('the Pisces glyph', () => {
  it('bows both arcs inward, ")–(" like ♓, with the bar through both', () => {
    const svg = drawing('Pisces');
    const [left, right] = arcs(svg).sort((a, b) => a[0].x - b[0].x);
    expect(left).toBeDefined();
    expect(right).toBeDefined();
    // Each arc's middle sits nearer the centre line than its ends.
    expect(middle(left).x).toBeGreaterThan(left[0].x);
    expect(middle(left).x).toBeGreaterThan(left[3].x);
    expect(middle(right).x).toBeLessThan(right[0].x);
    expect(middle(right).x).toBeLessThan(right[3].x);
    // Back to back: the middles are closer together than the ends.
    expect(middle(right).x - middle(left).x).toBeLessThan(right[0].x - left[0].x);
    // The bar crosses both arcs at their middles.
    const bar = [...svg.querySelectorAll('path')].map((p) => p.getAttribute('d') ?? '').find((d) => !d.includes('C'))!;
    const [x1, y1, x2] = bar.replace(/[ML]/g, ' ').trim().split(/\s+/).map(Number);
    expect(y1).toBeCloseTo(middle(left).y, 5);
    expect(Math.min(x1, x2)).toBeLessThan(middle(left).x);
    expect(Math.max(x1, x2)).toBeGreaterThan(middle(right).x);
  });
});

describe('the two copies of the zodiac drawings', () => {
  // ZodiacIcons.tsx (the app's <ZodiacGlyph>) and glyphPaths.tsx (the natal
  // wheel, the landing page) each carry all twelve drawings. They must agree:
  // the inside-out Pisces was in both.
  it('draws every sign the same in ZodiacIcons as in glyphPaths', () => {
    for (const sign of ZODIAC_SIGNS) {
      const Icon = ZODIAC_ICONS[sign];
      const { container } = render(<Icon aria-hidden />);
      expect({ sign, drawing: container.querySelector('svg')!.innerHTML }).toEqual({ sign, drawing: drawing(sign).innerHTML });
    }
  });
});
