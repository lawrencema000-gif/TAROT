import { memo } from 'react';

/**
 * The Moon as it is tonight, drawn rather than typed.
 *
 * The card used to print a moon emoji at 48px, which on Android is a
 * yellow cartoon disc from the platform font — the one object on a page of
 * gold line art that came from somewhere else. This is the same
 * information as geometry: a faint disc, and the lit portion as a real
 * terminator. The terminator of a sphere seen from the side is a half
 * ellipse whose horizontal radius is r·|cos θ|, where θ is the phase
 * angle; it bulges toward the lit limb for a crescent and away for a
 * gibbous. `illumination` and `waxing` fix both.
 */

export interface MoonPhaseGlyphProps {
  /** Lit fraction of the disc, 0 (new) to 1 (full). */
  illumination: number;
  /** True while the Moon grows; the lit limb is on the right. */
  waxing: boolean;
  size?: number;
  className?: string;
  'aria-label'?: string;
}

export const MoonPhaseGlyph = memo(function MoonPhaseGlyph({
  illumination,
  waxing,
  size = 48,
  className,
  'aria-label': ariaLabel,
}: MoonPhaseGlyphProps) {
  const f = Math.max(0, Math.min(1, illumination));
  const c = 24;
  const r = 20;
  // illumination = (1 − cos θ) / 2  ⇒  cos θ = 1 − 2f
  const a = Math.abs(r * (1 - 2 * f));
  const crescent = f < 0.5;
  // Waxing: the lit limb is the right semicircle (top → bottom, sweep 1),
  // and the terminator returns bottom → top: via the right for a crescent
  // (sweep 0), via the left for a gibbous (sweep 1). Waning mirrors both.
  const limbSweep = waxing ? 1 : 0;
  const termSweep = waxing ? (crescent ? 0 : 1) : crescent ? 1 : 0;
  const lit =
    f <= 0.005
      ? ''
      : `M${c} ${c - r}A${r} ${r} 0 0 ${limbSweep} ${c} ${c + r}A${a.toFixed(3)} ${r} 0 0 ${termSweep} ${c} ${c - r}Z`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      {...(ariaLabel ? { role: 'img', 'aria-label': ariaLabel } : { 'aria-hidden': true, focusable: false })}
    >
      <circle cx={c} cy={c} r={r} fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.35" strokeWidth="0.8" />
      {lit && <path d={lit} fill="currentColor" fillOpacity="0.92" />}
      {/* Three maria, so the disc reads as a body and not a coin. */}
      <g fill="currentColor" fillOpacity="0.12">
        <circle cx="18" cy="19" r="3.2" />
        <circle cx="28" cy="27" r="2.2" />
        <circle cx="21" cy="31" r="1.6" />
      </g>
    </svg>
  );
});
