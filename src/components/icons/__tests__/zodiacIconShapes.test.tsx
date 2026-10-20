import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ZODIAC_ICONS } from '../ZodiacIcons';
import type { ZodiacSign } from '../../../types/astrology';

/*
 * The glyphs members see (Home's energy card, the horoscope, the charts)
 * follow the Unicode signs. Three were drawn the wrong way round (p10
 * d2-ja-11 and the check of the other signs that followed): Pisces bowed
 * its arcs outward, "(–)"; Taurus arched its horns down over the head; and
 * Leo stood upside down, its circle on top.
 */

type Point = { x: number; y: number };

/** Every point along a path's `d` (M, L and C), each curve sampled. */
function trace(d: string): Point[] {
  const tokens = d.match(/[MLC]|-?\d*\.?\d+/g) ?? [];
  const points: Point[] = [];
  let command = '';
  for (let i = 0; i < tokens.length; ) {
    if (/^[MLC]$/.test(tokens[i])) {
      command = tokens[i++];
      continue;
    }
    const n = (k: number) => Number(tokens[i + k]);
    if (command === 'C') {
      const a = points[points.length - 1];
      const [b, c, e] = [{ x: n(0), y: n(1) }, { x: n(2), y: n(3) }, { x: n(4), y: n(5) }];
      for (let s = 1; s <= 16; s++) {
        const t = s / 16;
        const u = 1 - t;
        points.push({
          x: u ** 3 * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t ** 3 * e.x,
          y: u ** 3 * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t ** 3 * e.y,
        });
      }
      i += 6;
    } else {
      points.push({ x: n(0), y: n(1) });
      i += 2;
    }
  }
  return points;
}

/** The drawing of one sign, as the app renders it: its strokes and circles. */
function drawing(sign: ZodiacSign) {
  const Icon = ZODIAC_ICONS[sign];
  const svg = render(<Icon aria-hidden />).container.querySelector('svg')!;
  return {
    strokes: [...svg.querySelectorAll('path')].map((p) => trace(p.getAttribute('d') ?? '')),
    circles: [...svg.querySelectorAll('circle')].map((c) => ({
      x: Number(c.getAttribute('cx')),
      y: Number(c.getAttribute('cy')),
      r: Number(c.getAttribute('r')),
    })),
  };
}

const highest = (points: Point[]) => points.reduce((a, b) => (b.y < a.y ? b : a));
const lowest = (points: Point[]) => points.reduce((a, b) => (b.y > a.y ? b : a));
const middle = (points: Point[]) => points[Math.floor(points.length / 2)];

describe('zodiac glyphs follow their Unicode signs', () => {
  it('Pisces bows both arcs inward, ")–(" like ♓', () => {
    const arcs = drawing('Pisces').strokes.filter((s) => s.length > 2);
    const [left, right] = arcs.sort((a, b) => a[0].x - b[0].x);
    expect(arcs).toHaveLength(2);
    // Each arc's middle sits nearer the centre line than its ends.
    expect(middle(left).x).toBeGreaterThan(Math.max(left[0].x, left[left.length - 1].x));
    expect(middle(right).x).toBeLessThan(Math.min(right[0].x, right[right.length - 1].x));
  });

  it('Taurus wears its horns as a cup on the head, tips up and turned outward like ♉', () => {
    const { strokes, circles } = drawing('Taurus');
    const [horns] = strokes;
    const [head] = circles;
    const [tipL, tipR] = [horns[0], horns[horns.length - 1]];
    const bottom = lowest(horns);
    // The tips stand above the bottom of the cup.
    expect(tipL.y).toBeLessThan(bottom.y - 4);
    expect(tipR.y).toBeLessThan(bottom.y - 4);
    // The cup rests on the top of the head, centred over it.
    expect(bottom.y).toBeCloseTo(head.y - head.r, 1);
    expect(bottom.x).toBeCloseTo(head.x, 1);
    // The tips reach out past the sides of the head.
    expect(tipL.x).toBeLessThan(head.x - head.r);
    expect(tipR.x).toBeGreaterThan(head.x + head.r);
  });

  it('Leo has its circle low on the left, under an arch that ends in an outward tail, like ♌', () => {
    const { strokes, circles } = drawing('Leo');
    const [stroke] = strokes;
    const [circle] = circles;
    const [start, end] = [stroke[0], stroke[stroke.length - 1]];
    const top = highest(stroke);
    // The stroke springs from the circle…
    expect(Math.hypot(start.x - circle.x, start.y - circle.y)).toBeCloseTo(circle.r, 0);
    // …rises above it to the arch, which is right of the circle…
    expect(top.y).toBeLessThan(circle.y - circle.r - 4);
    expect(top.x).toBeGreaterThan(circle.x);
    // …and comes down on the right to a tail that turns up and out at the end.
    expect(end.x).toBeGreaterThan(top.x);
    expect(end.y).toBeGreaterThan(circle.y - circle.r);
    expect(end.x).toBe(Math.max(...stroke.map((p) => p.x)));
    expect(lowest(stroke).y).toBeGreaterThan(end.y);
  });
});
