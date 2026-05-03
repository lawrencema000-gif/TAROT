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

/**
 * Four-point sparkle — a slim cross with concave sides, the shape of the
 * sparkle that sits between section dividers and hero ornaments in the
 * redesign mockups. Differs from `StarBurst` (eight rays) by reading as a
 * single luminous point rather than a radiating sun.
 *
 * Stroke="currentColor" so it inherits text color; pair with
 * `text-gold` / `text-gold-light` at the call site.
 */
export const SparkleFourPoint = memo(function SparkleFourPoint({
  size = 16,
  className,
  filled = true,
}: { size?: number; className?: string; filled?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {/* Concave four-point star: each "arm" is a wedge that tapers to the
          center. Center is implied (no fill mid-circle, just the four
          arms meeting). */}
      <path d="M 8 0 C 8 5, 8 5, 16 8 C 8 11, 8 11, 8 16 C 8 11, 8 11, 0 8 C 8 5, 8 5, 8 0 Z" />
    </svg>
  );
});

/**
 * Horizontal divider with a single sparkle in the middle, flanked by thin
 * fading gold lines. Lighter and quieter than `OrnateDivider` (which has
 * a diamond + flanking stars). Matches the mockup section breaks.
 *
 *   ──────────────  ✦  ──────────────
 *
 * Use between page sections; pair with EyebrowLabel for the full mockup
 * "TODAY'S RITUAL" treatment.
 */
export const SectionDivider = memo(function SectionDivider({
  className = '',
  width = 'w-full',
  sparkleSize = 14,
  tone = 'gold',
}: {
  className?: string;
  /** Tailwind width class. Default `w-full`. */
  width?: string;
  sparkleSize?: number;
  /** `gold` (default) or `mystic` for muted breaks. */
  tone?: 'gold' | 'mystic';
}) {
  const lineColor = tone === 'gold' ? 'via-gold/50' : 'via-mystic-600/60';
  const sparkleColor = tone === 'gold' ? 'text-gold' : 'text-mystic-400';
  return (
    <div className={`flex items-center justify-center gap-3 ${width} ${className}`} aria-hidden>
      <span className={`flex-1 h-px bg-gradient-to-r from-transparent ${lineColor} to-transparent`} />
      <SparkleFourPoint size={sparkleSize} className={sparkleColor} />
      <span className={`flex-1 h-px bg-gradient-to-r from-transparent ${lineColor} to-transparent`} />
    </div>
  );
});

/**
 * Eyebrow label — uppercase serif kicker text in gold, optionally flanked
 * by thin fading gold rules. Used above section headings to set tone:
 *
 *   ── DAILY STREAK ──
 *
 * Pair with HeroGreeting for hero blocks, or precede a SectionDivider for
 * a full antique-broadside masthead.
 */
export const EyebrowLabel = memo(function EyebrowLabel({
  children,
  rules = false,
  align = 'center',
  className = '',
}: {
  children: React.ReactNode;
  /** Add flanking thin gold rules on either side. Default false. */
  rules?: boolean;
  align?: 'left' | 'center' | 'right';
  className?: string;
}) {
  const alignment =
    align === 'left' ? 'justify-start' : align === 'right' ? 'justify-end' : 'justify-center';
  if (!rules) {
    return (
      <span className={`font-display-eyebrow ${className}`}>{children}</span>
    );
  }
  return (
    <div className={`flex items-center gap-3 ${alignment} ${className}`}>
      <span className="flex-1 max-w-[3rem] h-px bg-gradient-to-r from-transparent to-gold/50" aria-hidden />
      <span className="font-display-eyebrow whitespace-nowrap">{children}</span>
      <span className="flex-1 max-w-[3rem] h-px bg-gradient-to-r from-gold/50 to-transparent" aria-hidden />
    </div>
  );
});

/**
 * Hero greeting — oversized Cormorant serif for greetings ("Good evening")
 * and screen titles ("My Journey", "Astrology Insights"). Uses the
 * `.heading-display-xl` utility from index.css for the typographic
 * treatment (weight, tracking, leading).
 *
 * Renders an h1 by default; pass `as="h2"` (etc.) to override semantically.
 */
export function HeroGreeting({
  children,
  className = '',
  as: Tag = 'h1',
  tone = 'light',
}: {
  children: React.ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3';
  /** `light` (default mystic-100) or `gold` for the foil treatment. */
  tone?: 'light' | 'gold';
}) {
  const toneClass = tone === 'gold' ? 'text-gold' : 'text-mystic-100';
  return (
    <Tag className={`heading-display-xl ${toneClass} ${className}`}>
      {children}
    </Tag>
  );
}

/**
 * Hero subtitle — soft mystic-300 body copy designed to sit immediately
 * under a HeroGreeting. Centered by default, comfortable line-height.
 */
export function HeroSubtitle({
  children,
  className = '',
  align = 'center',
}: {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}) {
  const alignment =
    align === 'left' ? 'text-left' : align === 'right' ? 'text-right' : 'text-center';
  return (
    <p className={`text-mystic-300 leading-relaxed ${alignment} ${className}`}>
      {children}
    </p>
  );
}

/**
 * Smallest possible divider — a thin horizontal hairline in gold, fading
 * at both ends. Use where SectionDivider feels too loud (e.g. between
 * list rows or below a card title).
 */
export function HairlineRule({
  className = '',
  tone = 'gold',
}: {
  className?: string;
  tone?: 'gold' | 'mystic';
}) {
  const toneClass = tone === 'gold'
    ? 'via-gold/30'
    : 'via-mystic-700/60';
  return (
    <div
      className={`h-px w-full bg-gradient-to-r from-transparent ${toneClass} to-transparent ${className}`}
      aria-hidden
    />
  );
}
