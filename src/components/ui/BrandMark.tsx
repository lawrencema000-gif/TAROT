import { memo } from 'react';

/**
 * Brand identity components — the BrandMark (arched-window glyph) and
 * BrandWordmark ("ARCANA" in gold serif with sparkle interpunct), drawn
 * from the redesign 2026 ad campaign and intended for splash screens,
 * landing pages, sign-in / sign-up surfaces, share cards, and any
 * place that benefits from a more elaborate brand statement than the
 * inline `☽ Arcana` lockup currently used in the public-content
 * header chrome.
 *
 * SVG strokes use `currentColor` so a single `text-gold` (or any
 * `text-*`) on the parent themes the whole mark.
 */

export interface BrandMarkProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

/**
 * Arched window glyph — a tall pointed arch with a star nestled inside
 * and a horizon-line sun beneath it. Hand-drawn outlines; reads well
 * at sizes from 28px (header) up to ~120px (hero/splash).
 */
export const BrandMark = memo(function BrandMark({
  size = 48,
  className,
  strokeWidth = 1.2,
}: BrandMarkProps) {
  return (
    <svg
      width={size}
      height={size * 1.25}
      viewBox="0 0 64 80"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {/* Outer arched frame — Roman arch profile (round top, vertical sides) */}
      <path d="M 8 76 L 8 32 C 8 18, 18 8, 32 8 C 46 8, 56 18, 56 32 L 56 76 Z" />
      {/* Inner arched frame — 3px inset, hairline */}
      <path d="M 12 72 L 12 32 C 12 20, 20 12, 32 12 C 44 12, 52 20, 52 32 L 52 72" strokeOpacity="0.55" />
      {/* Eight-point star nestled in the upper arch */}
      <g transform="translate(32 28)">
        <line x1="0" y1="-9" x2="0" y2="-3.5" />
        <line x1="0" y1="9"  x2="0" y2="3.5" />
        <line x1="-9" y1="0" x2="-3.5" y2="0" />
        <line x1="9"  y1="0" x2="3.5" y2="0" />
        <line x1="-6.4" y1="-6.4" x2="-2.5" y2="-2.5" />
        <line x1="6.4"  y1="6.4"  x2="2.5"  y2="2.5" />
        <line x1="-6.4" y1="6.4"  x2="-2.5" y2="2.5" />
        <line x1="6.4"  y1="-6.4" x2="2.5"  y2="-2.5" />
        <circle cx="0" cy="0" r="1" fill="currentColor" stroke="none" />
      </g>
      {/* Horizon mountains beneath the star — two soft peaks */}
      <path d="M 16 56 L 24 48 L 30 53 L 38 44 L 48 56" strokeOpacity="0.7" />
      {/* Sun rays radiating up from the horizon */}
      <g transform="translate(32 56)" strokeOpacity="0.55">
        <line x1="0" y1="-2" x2="0" y2="-7" />
        <line x1="-6" y1="-2" x2="-9" y2="-5" />
        <line x1="6"  y1="-2" x2="9"  y2="-5" />
      </g>
      {/* Tiny stars flanking the central star */}
      <circle cx="18" cy="22" r="0.9" fill="currentColor" stroke="none" opacity="0.6" />
      <circle cx="46" cy="22" r="0.9" fill="currentColor" stroke="none" opacity="0.6" />
    </svg>
  );
});

export interface BrandWordmarkProps {
  /** Size of the wordmark in pixels (height). Default 36. */
  size?: number;
  className?: string;
  /** Render with a sparkle interpunct between letters (mockup-style). Default true. */
  sparkle?: boolean;
  /** Use the full gold-foil gradient treatment (.text-gold-foil). Default true. */
  foil?: boolean;
  as?: 'span' | 'h1' | 'h2';
}

/**
 * "ARCANA" wordmark — tall serif capitals in gold, optionally with a
 * sparkle interpunct centered between letter pairs (matches Ad 1 hero).
 * Wraps in an aria-label so screen readers still hear the brand name
 * cleanly even with the decorative sparkle in the middle.
 *
 * The wordmark uses Cormorant Garamond at letter-spacing 0.18em, which
 * gives it the same "antique broadside masthead" feel as the
 * `.font-display-eyebrow` utility but at full display scale. The
 * gold-foil gradient + animated background-position shift comes from
 * the existing `.text-gold-foil` class in index.css.
 */
export function BrandWordmark({
  size = 36,
  className = '',
  sparkle = true,
  foil = true,
  as: Tag = 'span',
}: BrandWordmarkProps) {
  const fontSize = `${size}px`;
  const colorClass = foil ? 'text-gold-foil' : 'text-gold';
  if (!sparkle) {
    return (
      <Tag
        className={`font-display font-medium tracking-[0.18em] ${colorClass} ${className}`}
        style={{ fontSize, lineHeight: 1, letterSpacing: '0.18em' }}
        aria-label="Arcana"
      >
        ARCANA
      </Tag>
    );
  }
  return (
    <Tag
      className={`inline-flex items-center font-display font-medium ${colorClass} ${className}`}
      style={{ fontSize, lineHeight: 1, letterSpacing: '0.16em' }}
      aria-label="Arcana"
    >
      <span aria-hidden>ARC</span>
      {/* Sparkle interpunct — explicit gold fill (NOT currentColor)
          because when foil=true the parent has color:transparent for
          the gradient effect, and currentColor would also be
          transparent → the sparkle would vanish, leaving an ugly gap
          between ARC and ANA. Explicit fill keeps it solid gold even
          inside foil text. */}
      <span aria-hidden className="inline-flex items-center px-[0.12em]">
        <svg
          width={size * 0.28}
          height={size * 0.28}
          viewBox="0 0 16 16"
          fill="#d4af37"
          aria-hidden
        >
          <path d="M 8 0 C 8 5, 8 5, 16 8 C 8 11, 8 11, 8 16 C 8 11, 8 11, 0 8 C 8 5, 8 5, 8 0 Z" />
        </svg>
      </span>
      <span aria-hidden>ANA</span>
    </Tag>
  );
}

/**
 * Brand lockup — BrandMark stacked above BrandWordmark, with optional
 * tagline. Used on Splash, Landing, AuthPage, OnboardingPage. Scales as
 * a single unit via the `size` prop (drives both mark and wordmark).
 */
export function BrandLockup({
  size = 48,
  tagline,
  className = '',
  align = 'center',
}: {
  size?: number;
  tagline?: string;
  className?: string;
  align?: 'left' | 'center';
}) {
  const alignment = align === 'center' ? 'items-center text-center' : 'items-start text-left';
  return (
    <div className={`flex flex-col gap-3 ${alignment} ${className}`}>
      <BrandMark size={size} className="text-gold" />
      <BrandWordmark size={size * 0.85} />
      {tagline && (
        <p className="font-display-eyebrow mt-1">{tagline}</p>
      )}
    </div>
  );
}
