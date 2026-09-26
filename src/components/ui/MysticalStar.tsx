import { memo, useId } from 'react';

/**
 * Ornate 8-point ritual star — the hand-drawn replacement for the generic
 * lucide `<Sparkles>` in hero positions: four cardinal petals, four shorter
 * diagonal rays, a beaded halo, inscribed circles with radial ticks.
 *
 * Three things were wrong with it for as long as it existed, and they are
 * why it read as generated wherever it appeared thirty-eight times:
 *
 *  - Its gradient ids were fixed strings, so every star on a page resolved
 *    its fill against the FIRST star's currentColor. A white star beside a
 *    gold one came out gold. They are unique per instance now (`useId`).
 *  - The four "intercardinal petal" paths were collinear — zero-area
 *    shapes that drew nothing but a hairline — while a second set of
 *    triangles underneath did the actual work. The dead set is gone.
 *  - A white highlight disc covered the whole glyph even with the halo
 *    off, the "glassy sheen" that no engraving has. Gone.
 *
 * `spinning` stays as an opt-in for a hero glyph; nothing here pulses.
 */

export interface MysticalStarProps {
  size?: number;
  className?: string;
  /** Underlying colour of the strokes/fills. Inherits `currentColor` unless a hex is passed. */
  color?: string;
  /** Draw the outer halo ring + beads. */
  halo?: boolean;
  /** A very slow rotation. For a hero glyph only. */
  spinning?: boolean;
  /**
   * Accessible name. WITHOUT it the star is aria-hidden, which is the right
   * default: it is nearly always decorative, sitting beside a heading that
   * already says what the thing is. Pass a label only when the glyph
   * carries meaning no adjacent text does.
   */
  label?: string;
}

const CARDINAL = [
  'M 64 8 L 68 50 L 64 58 L 60 50 Z',
  'M 64 120 L 68 78 L 64 70 L 60 78 Z',
  'M 120 64 L 78 68 L 70 64 L 78 60 Z',
  'M 8 64 L 50 68 L 58 64 L 50 60 Z',
].join(' ');

const DIAGONAL = [45, 135, 225, 315]
  .map((deg) => {
    const rad = (deg * Math.PI) / 180;
    const tip = [64 + Math.cos(rad) * 42, 64 + Math.sin(rad) * 42];
    const l = [64 + Math.cos(((deg + 6) * Math.PI) / 180) * 12, 64 + Math.sin(((deg + 6) * Math.PI) / 180) * 12];
    const r = [64 + Math.cos(((deg - 6) * Math.PI) / 180) * 12, 64 + Math.sin(((deg - 6) * Math.PI) / 180) * 12];
    return `M ${tip[0].toFixed(2)} ${tip[1].toFixed(2)} L ${l[0].toFixed(2)} ${l[1].toFixed(2)} L ${r[0].toFixed(2)} ${r[1].toFixed(2)} Z`;
  })
  .join(' ');

const TICKS = Array.from({ length: 12 })
  .map((_, i) => {
    const a = (i * 30 * Math.PI) / 180;
    return `M ${(64 + Math.cos(a) * 11).toFixed(2)} ${(64 + Math.sin(a) * 11).toFixed(2)} L ${(64 + Math.cos(a) * 15).toFixed(2)} ${(64 + Math.sin(a) * 15).toFixed(2)}`;
  })
  .join(' ');

const BEADS = Array.from({ length: 8 }).map((_, i) => {
  const a = (i * 45 * Math.PI) / 180;
  return [64 + Math.cos(a) * 52, 64 + Math.sin(a) * 52] as const;
});

export const MysticalStar = memo(function MysticalStar({
  size = 64,
  className,
  color,
  halo = true,
  spinning = false,
  label,
}: MysticalStarProps) {
  const id = useId();
  const petal = `${id}-petal`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      className={`${className ?? ''} ${spinning ? 'animate-spin-slow' : ''}`}
      style={color ? { color } : undefined}
      {...(label
        ? { role: 'img', 'aria-label': label }
        : { 'aria-hidden': true, focusable: false })}
    >
      <defs>
        <radialGradient id={petal} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="70%" stopColor="currentColor" stopOpacity="0.85" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.4" />
        </radialGradient>
      </defs>

      {halo && (
        <>
          <circle cx="64" cy="64" r="58" fill="none" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.35" strokeDasharray="0.5 3.5" />
          {BEADS.map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="1.2" fill="currentColor" opacity="0.8" />
          ))}
        </>
      )}

      <path d={CARDINAL} fill={`url(#${petal})`} stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.9" strokeLinejoin="round" />
      <path d={DIAGONAL} fill="currentColor" fillOpacity="0.55" stroke="currentColor" strokeOpacity="0.6" strokeWidth="0.4" strokeLinejoin="round" opacity="0.75" />

      <circle cx="64" cy="64" r="16" fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="0.7" />
      <circle cx="64" cy="64" r="10" fill="none" stroke="currentColor" strokeOpacity="0.7" strokeWidth="0.6" />
      <path d={TICKS} stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" opacity="0.65" />
      <circle cx="64" cy="64" r="3" fill="currentColor" />
      <circle cx="64" cy="64" r="5" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="0.5" />
    </svg>
  );
});
