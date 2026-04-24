import { memo } from 'react';
import type { ZodiacSign } from '../../types/astrology';

/**
 * Hand-drawn zodiac SVG glyphs.
 *
 * Replaces the flat Unicode symbols (♈ ♉ …) with detailed line-art
 * glyphs at 32x32 viewBox. Uses `stroke="currentColor"` so color is
 * controlled via Tailwind `text-*` classes. Stroke weight tuned to
 * read well at sizes from 16px through 96px without getting chunky.
 *
 * Shapes follow the traditional astrological glyph forms (Jones, 1911)
 * with subtle dot terminals for a manuscript feel.
 */

export interface ZodiacIconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
  /** Render with a coin-style circular frame around the glyph. */
  framed?: boolean;
  'aria-label'?: string;
}

const baseProps = (size: number, className?: string, ariaLabel?: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 32 32',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className: className ?? '',
  role: 'img' as const,
  'aria-label': ariaLabel,
});

function Frame({ framed }: { framed?: boolean }) {
  if (!framed) return null;
  return (
    <circle
      cx="16"
      cy="16"
      r="14.25"
      strokeOpacity="0.35"
      strokeDasharray="0.5 3"
      strokeWidth="1"
    />
  );
}

// ─── Aries ───── ram's horns ─────────────────────────────
export const AriesIcon = memo(function AriesIcon({ size = 24, className, strokeWidth = 1.6, framed, 'aria-label': ariaLabel = 'Aries' }: ZodiacIconProps) {
  return (
    <svg {...baseProps(size, className, ariaLabel)} strokeWidth={strokeWidth}>
      <Frame framed={framed} />
      <path d="M 8 22 C 8 12, 10 8, 12 8 C 14.5 8, 16 10.5, 16 14 C 16 10.5, 17.5 8, 20 8 C 22 8, 24 12, 24 22" />
      <circle cx="16" cy="14" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  );
});

// ─── Taurus ───── bull head with horns ───────────────────
export const TaurusIcon = memo(function TaurusIcon({ size = 24, className, strokeWidth = 1.6, framed, 'aria-label': ariaLabel = 'Taurus' }: ZodiacIconProps) {
  return (
    <svg {...baseProps(size, className, ariaLabel)} strokeWidth={strokeWidth}>
      <Frame framed={framed} />
      <circle cx="16" cy="20" r="5.5" />
      <path d="M 7 12 C 8.5 7, 12 6, 16 9 C 20 6, 23.5 7, 25 12" />
    </svg>
  );
});

// ─── Gemini ──── roman numeral II with caps ──────────────
export const GeminiIcon = memo(function GeminiIcon({ size = 24, className, strokeWidth = 1.6, framed, 'aria-label': ariaLabel = 'Gemini' }: ZodiacIconProps) {
  return (
    <svg {...baseProps(size, className, ariaLabel)} strokeWidth={strokeWidth}>
      <Frame framed={framed} />
      <path d="M 9 7 L 23 7" />
      <path d="M 9 25 L 23 25" />
      <path d="M 12.5 7 L 12.5 25" />
      <path d="M 19.5 7 L 19.5 25" />
    </svg>
  );
});

// ─── Cancer ──── 69 with paired circles ──────────────────
export const CancerIcon = memo(function CancerIcon({ size = 24, className, strokeWidth = 1.6, framed, 'aria-label': ariaLabel = 'Cancer' }: ZodiacIconProps) {
  return (
    <svg {...baseProps(size, className, ariaLabel)} strokeWidth={strokeWidth}>
      <Frame framed={framed} />
      <path d="M 7 13 C 7 8, 14 8, 17 13" />
      <circle cx="10" cy="14.2" r="2.2" fill="currentColor" stroke="none" />
      <path d="M 25 19 C 25 24, 18 24, 15 19" />
      <circle cx="22" cy="17.8" r="2.2" fill="currentColor" stroke="none" />
    </svg>
  );
});

// ─── Leo ─────── lion's mane with tail loop ──────────────
export const LeoIcon = memo(function LeoIcon({ size = 24, className, strokeWidth = 1.6, framed, 'aria-label': ariaLabel = 'Leo' }: ZodiacIconProps) {
  return (
    <svg {...baseProps(size, className, ariaLabel)} strokeWidth={strokeWidth}>
      <Frame framed={framed} />
      <circle cx="13" cy="12" r="4.5" />
      <path d="M 13 16.5 C 13 22, 17 24, 21 22 C 24 20.5, 24 17, 22.5 15.5" />
    </svg>
  );
});

// ─── Virgo ───── M with loop ─────────────────────────────
export const VirgoIcon = memo(function VirgoIcon({ size = 24, className, strokeWidth = 1.6, framed, 'aria-label': ariaLabel = 'Virgo' }: ZodiacIconProps) {
  return (
    <svg {...baseProps(size, className, ariaLabel)} strokeWidth={strokeWidth}>
      <Frame framed={framed} />
      <path d="M 7 22 L 7 11 C 7 9, 8.5 8, 10 8 C 11.5 8, 13 9, 13 11 L 13 22" />
      <path d="M 13 11 C 13 9, 14.5 8, 16 8 C 17.5 8, 19 9, 19 11 L 19 22" />
      <path d="M 19 11 C 19 9, 20.5 8, 22 8 C 23.5 8, 25 9, 25 12 C 25 16, 22 19, 19 20" />
      <path d="M 21 17 C 24 17, 26 20, 24 23 C 22.5 25, 19 24, 19 22" />
    </svg>
  );
});

// ─── Libra ──── scales ───────────────────────────────────
export const LibraIcon = memo(function LibraIcon({ size = 24, className, strokeWidth = 1.6, framed, 'aria-label': ariaLabel = 'Libra' }: ZodiacIconProps) {
  return (
    <svg {...baseProps(size, className, ariaLabel)} strokeWidth={strokeWidth}>
      <Frame framed={framed} />
      <path d="M 6 21 L 26 21" />
      <path d="M 8 17 L 24 17" />
      <path d="M 8 17 C 8 12, 11 9, 16 9 C 21 9, 24 12, 24 17" />
    </svg>
  );
});

// ─── Scorpio ─── M with arrow tail ───────────────────────
export const ScorpioIcon = memo(function ScorpioIcon({ size = 24, className, strokeWidth = 1.6, framed, 'aria-label': ariaLabel = 'Scorpio' }: ZodiacIconProps) {
  return (
    <svg {...baseProps(size, className, ariaLabel)} strokeWidth={strokeWidth}>
      <Frame framed={framed} />
      <path d="M 6 22 L 6 11 C 6 9, 7.5 8, 9 8 C 10.5 8, 12 9, 12 11 L 12 22" />
      <path d="M 12 11 C 12 9, 13.5 8, 15 8 C 16.5 8, 18 9, 18 11 L 18 22" />
      <path d="M 18 11 C 18 9, 19.5 8, 21 8 C 22.5 8, 24 9, 24 11 L 24 22" />
      <path d="M 24 22 L 27 25" />
      <path d="M 24 25 L 27 25 L 27 22" />
    </svg>
  );
});

// ─── Sagittarius ─ archer's arrow ────────────────────────
export const SagittariusIcon = memo(function SagittariusIcon({ size = 24, className, strokeWidth = 1.6, framed, 'aria-label': ariaLabel = 'Sagittarius' }: ZodiacIconProps) {
  return (
    <svg {...baseProps(size, className, ariaLabel)} strokeWidth={strokeWidth}>
      <Frame framed={framed} />
      <path d="M 7 25 L 25 7" />
      <path d="M 25 7 L 17 7" />
      <path d="M 25 7 L 25 15" />
      <path d="M 11 17 L 19 25" />
    </svg>
  );
});

// ─── Capricorn ── goat-fish ─────────────────────────────
export const CapricornIcon = memo(function CapricornIcon({ size = 24, className, strokeWidth = 1.6, framed, 'aria-label': ariaLabel = 'Capricorn' }: ZodiacIconProps) {
  return (
    <svg {...baseProps(size, className, ariaLabel)} strokeWidth={strokeWidth}>
      <Frame framed={framed} />
      <path d="M 6 10 L 10 22 L 14 10 L 18 22" />
      <path d="M 18 22 C 18 17, 24 17, 24 21 C 24 24, 20 25, 18 22" />
    </svg>
  );
});

// ─── Aquarius ─── water waves ────────────────────────────
export const AquariusIcon = memo(function AquariusIcon({ size = 24, className, strokeWidth = 1.6, framed, 'aria-label': ariaLabel = 'Aquarius' }: ZodiacIconProps) {
  return (
    <svg {...baseProps(size, className, ariaLabel)} strokeWidth={strokeWidth}>
      <Frame framed={framed} />
      <path d="M 6 12 L 10 9 L 14 12 L 18 9 L 22 12 L 26 9" />
      <path d="M 6 20 L 10 17 L 14 20 L 18 17 L 22 20 L 26 17" />
    </svg>
  );
});

// ─── Pisces ──── two fish joined ─────────────────────────
export const PiscesIcon = memo(function PiscesIcon({ size = 24, className, strokeWidth = 1.6, framed, 'aria-label': ariaLabel = 'Pisces' }: ZodiacIconProps) {
  return (
    <svg {...baseProps(size, className, ariaLabel)} strokeWidth={strokeWidth}>
      <Frame framed={framed} />
      <path d="M 9 7 C 5 12, 5 20, 9 25" />
      <path d="M 23 7 C 27 12, 27 20, 23 25" />
      <path d="M 8 16 L 24 16" />
    </svg>
  );
});

export const ZODIAC_ICONS: Record<ZodiacSign, React.ComponentType<ZodiacIconProps>> = {
  Aries: AriesIcon,
  Taurus: TaurusIcon,
  Gemini: GeminiIcon,
  Cancer: CancerIcon,
  Leo: LeoIcon,
  Virgo: VirgoIcon,
  Libra: LibraIcon,
  Scorpio: ScorpioIcon,
  Sagittarius: SagittariusIcon,
  Capricorn: CapricornIcon,
  Aquarius: AquariusIcon,
  Pisces: PiscesIcon,
};

/**
 * Resolve-by-name convenience component.
 *
 * <ZodiacGlyph sign="Leo" size={32} className="text-gold" framed />
 */
export function ZodiacGlyph({
  sign,
  ...rest
}: ZodiacIconProps & { sign: ZodiacSign }) {
  const Icon = ZODIAC_ICONS[sign];
  return <Icon {...rest} aria-label={rest['aria-label'] ?? sign} />;
}
