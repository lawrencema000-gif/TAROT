import { memo } from 'react';

/**
 * Ornate 8-point ritual star — a proper hand-drawn SVG replacement for
 * the generic lucide `<Sparkles>` icon in hero positions.
 *
 * Uses a 128x128 viewBox with four-petal cardinal rays, shorter
 * intercardinal rays, a halo ring with 8 beads at intercardinal
 * positions, and a central dot + inscribed circle. The whole thing
 * is drawn with SVG paths so color/stroke are controlled via
 * Tailwind `text-*` / `stroke` props.
 *
 * Pairs well with `.text-gold-foil` for the animated gradient fill
 * treatment on the hero Today's Ritual card.
 */

export interface MysticalStarProps {
  size?: number;
  className?: string;
  /** Underlying color of the strokes/fills. Inherits `currentColor`
   *  unless a specific hex is passed. */
  color?: string;
  /** Whether to draw the outer halo ring + cardinal beads. */
  halo?: boolean;
  /** Animate a very slow rotation on mount. Good for a hero glyph. */
  spinning?: boolean;
}

export const MysticalStar = memo(function MysticalStar({
  size = 64,
  className,
  color,
  halo = true,
  spinning = false,
}: MysticalStarProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      className={`${className ?? ''} ${spinning ? 'animate-spin-slow' : ''}`}
      style={color ? { color } : undefined}
      role="img"
      aria-label="Ritual star"
    >
      <defs>
        {/* Gold gradient for the primary star petals */}
        <radialGradient id="mystical-star-petal" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="70%" stopColor="currentColor" stopOpacity="0.85" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.4" />
        </radialGradient>
        {/* Inner highlight gradient */}
        <linearGradient id="mystical-star-highlight" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {halo && (
        <>
          {/* Outer halo ring — thin dashed circle */}
          <circle
            cx="64" cy="64" r="58"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.6"
            strokeOpacity="0.35"
            strokeDasharray="0.5 3.5"
          />
          {/* 8 beads on an inscribed ring */}
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i * 45 * Math.PI) / 180;
            const cx = 64 + Math.cos(angle) * 52;
            const cy = 64 + Math.sin(angle) * 52;
            return (
              <circle
                key={`bead-${i}`}
                cx={cx} cy={cy} r="1.2"
                fill="currentColor"
                opacity="0.8"
              />
            );
          })}
        </>
      )}

      {/* Cardinal petals — four elongated diamond rays (N/E/S/W) */}
      <g>
        {/* North petal */}
        <path
          d="M 64 8 L 68 50 L 64 58 L 60 50 Z"
          fill="url(#mystical-star-petal)"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeOpacity="0.9"
          strokeLinejoin="round"
        />
        {/* South petal */}
        <path
          d="M 64 120 L 68 78 L 64 70 L 60 78 Z"
          fill="url(#mystical-star-petal)"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeOpacity="0.9"
          strokeLinejoin="round"
        />
        {/* East petal */}
        <path
          d="M 120 64 L 78 68 L 70 64 L 78 60 Z"
          fill="url(#mystical-star-petal)"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeOpacity="0.9"
          strokeLinejoin="round"
        />
        {/* West petal */}
        <path
          d="M 8 64 L 50 68 L 58 64 L 50 60 Z"
          fill="url(#mystical-star-petal)"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeOpacity="0.9"
          strokeLinejoin="round"
        />
      </g>

      {/* Intercardinal petals — shorter diagonal diamond rays (NE/SE/SW/NW) */}
      <g opacity="0.85">
        <path
          d="M 104 24 L 78 50 L 64 64 L 78 50 Z M 104 24 L 76 52 L 72 56 Z"
          fill="url(#mystical-star-petal)"
          stroke="currentColor"
          strokeWidth="0.6"
          strokeOpacity="0.7"
          strokeLinejoin="round"
        />
        <path
          d="M 104 104 L 78 78 L 72 72 L 76 76 Z M 104 104 L 76 76 L 72 72 L 78 78 Z"
          fill="url(#mystical-star-petal)"
          stroke="currentColor"
          strokeWidth="0.6"
          strokeOpacity="0.7"
          strokeLinejoin="round"
        />
        <path
          d="M 24 104 L 50 78 L 56 72 L 52 76 Z"
          fill="url(#mystical-star-petal)"
          stroke="currentColor"
          strokeWidth="0.6"
          strokeOpacity="0.7"
          strokeLinejoin="round"
        />
        <path
          d="M 24 24 L 50 50 L 56 56 L 52 52 Z"
          fill="url(#mystical-star-petal)"
          stroke="currentColor"
          strokeWidth="0.6"
          strokeOpacity="0.7"
          strokeLinejoin="round"
        />
      </g>

      {/* Clean intercardinal rays as tapered triangles (overlay for crispness) */}
      <g opacity="0.75">
        {[45, 135, 225, 315].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const tipX = 64 + Math.cos(rad) * 42;
          const tipY = 64 + Math.sin(rad) * 42;
          const leftRad = ((deg + 6) * Math.PI) / 180;
          const rightRad = ((deg - 6) * Math.PI) / 180;
          const leftX = 64 + Math.cos(leftRad) * 12;
          const leftY = 64 + Math.sin(leftRad) * 12;
          const rightX = 64 + Math.cos(rightRad) * 12;
          const rightY = 64 + Math.sin(rightRad) * 12;
          return (
            <path
              key={`diag-${deg}`}
              d={`M ${tipX} ${tipY} L ${leftX} ${leftY} L ${rightX} ${rightY} Z`}
              fill="currentColor"
              fillOpacity="0.55"
              stroke="currentColor"
              strokeOpacity="0.6"
              strokeWidth="0.4"
              strokeLinejoin="round"
            />
          );
        })}
      </g>

      {/* Inner inscribed circles */}
      <circle cx="64" cy="64" r="16" fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="0.7" />
      <circle cx="64" cy="64" r="10" fill="none" stroke="currentColor" strokeOpacity="0.7" strokeWidth="0.6" />

      {/* Inner small rays between circles — radial ticks */}
      <g opacity="0.65">
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 30 * Math.PI) / 180;
          const x1 = 64 + Math.cos(angle) * 11;
          const y1 = 64 + Math.sin(angle) * 11;
          const x2 = 64 + Math.cos(angle) * 15;
          const y2 = 64 + Math.sin(angle) * 15;
          return (
            <line
              key={`tick-${i}`}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="currentColor"
              strokeWidth="0.5"
              strokeLinecap="round"
            />
          );
        })}
      </g>

      {/* Central dot cluster */}
      <circle cx="64" cy="64" r="3" fill="currentColor" />
      <circle cx="64" cy="64" r="5" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="0.5" />

      {/* Top-corner highlight — sells the engraved feel */}
      <circle cx="64" cy="64" r="58" fill="url(#mystical-star-highlight)" />
    </svg>
  );
});
