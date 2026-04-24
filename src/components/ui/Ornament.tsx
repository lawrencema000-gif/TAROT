import { memo } from 'react';

/**
 * Ornamental SVG pieces used across the app — corner flourishes,
 * divider glyphs, and starbursts. Hand-drawn, stroke="currentColor"
 * so they inherit `text-*` classes for color.
 *
 * Motifs are drawn from 19th-century astrological manuscript
 * marginalia: dotted diamonds, rayed starbursts, ouroboros loops.
 * Used with the ornate Card variant and throughout premium screens
 * to lift the visual language out of generic dashboard-chrome.
 */

export interface OrnamentProps {
  size?: number;
  className?: string;
  /** Which corner the flourish points at. Rotates the SVG. */
  corner?: 'tl' | 'tr' | 'bl' | 'br';
  strokeWidth?: number;
}

const CORNER_ROTATION: Record<NonNullable<OrnamentProps['corner']>, number> = {
  tl: 0,
  tr: 90,
  br: 180,
  bl: 270,
};

/**
 * L-shaped corner flourish — small rayed star + curling arm.
 * Anchors to the top-left corner by default; rotate with `corner`.
 */
export const CornerFlourish = memo(function CornerFlourish({
  size = 28,
  className,
  corner = 'tl',
  strokeWidth = 1.2,
}: OrnamentProps) {
  const rot = CORNER_ROTATION[corner];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ transform: `rotate(${rot}deg)` }}
      aria-hidden
    >
      {/* Inner L-arm with curl */}
      <path d="M 4 14 C 4 8, 8 4, 14 4" />
      {/* Small terminal curl into the corner */}
      <path d="M 4 14 C 4 11, 2 10, 2 10" />
      <path d="M 14 4 C 11 4, 10 2, 10 2" />
      {/* Rayed star — five short rays + center dot */}
      <g transform="translate(16 16)">
        <line x1="0" y1="-5" x2="0" y2="-2.5" />
        <line x1="0" y1="5" x2="0" y2="2.5" />
        <line x1="-5" y1="0" x2="-2.5" y2="0" />
        <line x1="5" y1="0" x2="2.5" y2="0" />
        <line x1="-3.5" y1="-3.5" x2="-1.8" y2="-1.8" />
        <line x1="3.5" y1="3.5" x2="1.8" y2="1.8" />
        <line x1="-3.5" y1="3.5" x2="-1.8" y2="1.8" />
        <line x1="3.5" y1="-3.5" x2="1.8" y2="-1.8" />
        <circle cx="0" cy="0" r="0.9" fill="currentColor" stroke="none" />
      </g>
      {/* Terminal dots */}
      <circle cx="14" cy="4" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="4" cy="14" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
});

/**
 * Horizontal ornamental divider — diamond center flanked by tapered lines
 * and small radiating stars. Use between major sections inside an ornate
 * frame.
 */
export const OrnateDivider = memo(function OrnateDivider({
  className,
  width = 160,
  strokeWidth = 1,
}: { className?: string; width?: number; strokeWidth?: number }) {
  return (
    <svg
      width={width}
      height="16"
      viewBox="0 0 160 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      {/* Fading side lines */}
      <line x1="4" y1="8" x2="62" y2="8" strokeOpacity="0.9" />
      <line x1="98" y1="8" x2="156" y2="8" strokeOpacity="0.9" />
      {/* Center diamond */}
      <path d="M 80 3 L 87 8 L 80 13 L 73 8 Z" />
      <circle cx="80" cy="8" r="1.4" fill="currentColor" stroke="none" />
      {/* Flanking stars */}
      <g>
        <circle cx="62" cy="8" r="1" fill="currentColor" stroke="none" />
        <circle cx="98" cy="8" r="1" fill="currentColor" stroke="none" />
      </g>
      {/* Sun rays at the extreme tips */}
      <line x1="2" y1="8" x2="4" y2="8" strokeOpacity="0.3" />
      <line x1="156" y1="8" x2="158" y2="8" strokeOpacity="0.3" />
    </svg>
  );
});

/**
 * Eight-ray starburst — used as a drop-cap companion or section anchor.
 */
export const StarBurst = memo(function StarBurst({
  size = 24,
  className,
  strokeWidth = 1,
}: { size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <g transform="translate(12 12)">
        {/* Cardinal rays */}
        <line x1="0" y1="-10" x2="0" y2="-4" />
        <line x1="0" y1="10" x2="0" y2="4" />
        <line x1="-10" y1="0" x2="-4" y2="0" />
        <line x1="10" y1="0" x2="4" y2="0" />
        {/* Intercardinal rays (shorter) */}
        <line x1="-7" y1="-7" x2="-3" y2="-3" />
        <line x1="7" y1="7" x2="3" y2="3" />
        <line x1="-7" y1="7" x2="-3" y2="3" />
        <line x1="7" y1="-7" x2="3" y2="-3" />
        {/* Center */}
        <circle cx="0" cy="0" r="1.6" fill="currentColor" stroke="none" />
      </g>
    </svg>
  );
});

/**
 * Convenience: wraps children with four corner flourishes positioned
 * absolutely. The parent must be `position: relative`. Typically used
 * inside an ornate Card or by the OrnateFrame helper.
 */
export function FourCornerFlourishes({ className, size = 26 }: { className?: string; size?: number }) {
  return (
    <>
      <CornerFlourish corner="tl" size={size} className={`absolute top-1 left-1 pointer-events-none ${className ?? ''}`} />
      <CornerFlourish corner="tr" size={size} className={`absolute top-1 right-1 pointer-events-none ${className ?? ''}`} />
      <CornerFlourish corner="bl" size={size} className={`absolute bottom-1 left-1 pointer-events-none ${className ?? ''}`} />
      <CornerFlourish corner="br" size={size} className={`absolute bottom-1 right-1 pointer-events-none ${className ?? ''}`} />
    </>
  );
}
