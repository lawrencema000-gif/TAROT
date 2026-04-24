import { memo } from 'react';
import type { Planet } from '../../types/astrology';

/**
 * Hand-drawn planet/luminary SVG glyphs.
 *
 * Replaces flat Unicode symbols (☉ ☽ ☿ …) with detailed line-art
 * glyphs at 32x32 viewBox. Stroke matches ZodiacIcons so mixed
 * astrological UIs look cohesive.
 */

export interface PlanetIconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
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

// ─── Sun ──── circle with dot ────────────────────────────
export const SunIcon = memo(function SunIcon({ size = 24, className, strokeWidth = 1.6, framed, 'aria-label': ariaLabel = 'Sun' }: PlanetIconProps) {
  return (
    <svg {...baseProps(size, className, ariaLabel)} strokeWidth={strokeWidth}>
      <Frame framed={framed} />
      <circle cx="16" cy="16" r="7" />
      <circle cx="16" cy="16" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
});

// ─── Moon ─── crescent ───────────────────────────────────
export const MoonIcon = memo(function MoonIcon({ size = 24, className, strokeWidth = 1.6, framed, 'aria-label': ariaLabel = 'Moon' }: PlanetIconProps) {
  return (
    <svg {...baseProps(size, className, ariaLabel)} strokeWidth={strokeWidth}>
      <Frame framed={framed} />
      <path d="M 22 8 C 17 8, 12 12, 12 16 C 12 20, 17 24, 22 24 C 17 22, 14 19, 14 16 C 14 13, 17 10, 22 8 Z" />
    </svg>
  );
});

// ─── Mercury ─ horned crown / circle / cross ─────────────
export const MercuryIcon = memo(function MercuryIcon({ size = 24, className, strokeWidth = 1.6, framed, 'aria-label': ariaLabel = 'Mercury' }: PlanetIconProps) {
  return (
    <svg {...baseProps(size, className, ariaLabel)} strokeWidth={strokeWidth}>
      <Frame framed={framed} />
      <path d="M 11 6 C 11 9, 13 11, 16 11 C 19 11, 21 9, 21 6" />
      <circle cx="16" cy="15" r="4" />
      <path d="M 16 19 L 16 26" />
      <path d="M 13 23 L 19 23" />
    </svg>
  );
});

// ─── Venus ─── circle with cross below ───────────────────
export const VenusIcon = memo(function VenusIcon({ size = 24, className, strokeWidth = 1.6, framed, 'aria-label': ariaLabel = 'Venus' }: PlanetIconProps) {
  return (
    <svg {...baseProps(size, className, ariaLabel)} strokeWidth={strokeWidth}>
      <Frame framed={framed} />
      <circle cx="16" cy="13" r="5" />
      <path d="M 16 18 L 16 26" />
      <path d="M 13 23 L 19 23" />
    </svg>
  );
});

// ─── Mars ──── circle with arrow ─────────────────────────
export const MarsIcon = memo(function MarsIcon({ size = 24, className, strokeWidth = 1.6, framed, 'aria-label': ariaLabel = 'Mars' }: PlanetIconProps) {
  return (
    <svg {...baseProps(size, className, ariaLabel)} strokeWidth={strokeWidth}>
      <Frame framed={framed} />
      <circle cx="14" cy="19" r="5" />
      <path d="M 17.5 15.5 L 24 9" />
      <path d="M 24 9 L 18 9" />
      <path d="M 24 9 L 24 15" />
    </svg>
  );
});

// ─── Jupiter ─ stylized 4 / hieroglyphic ─────────────────
export const JupiterIcon = memo(function JupiterIcon({ size = 24, className, strokeWidth = 1.6, framed, 'aria-label': ariaLabel = 'Jupiter' }: PlanetIconProps) {
  return (
    <svg {...baseProps(size, className, ariaLabel)} strokeWidth={strokeWidth}>
      <Frame framed={framed} />
      <path d="M 9 12 C 9 8, 12 6, 15 8 C 17 9.5, 17 13, 15 15 L 11 18" />
      <path d="M 9 21 L 23 21" />
      <path d="M 19 9 L 19 24" />
    </svg>
  );
});

// ─── Saturn ── stylized h with cross ─────────────────────
export const SaturnIcon = memo(function SaturnIcon({ size = 24, className, strokeWidth = 1.6, framed, 'aria-label': ariaLabel = 'Saturn' }: PlanetIconProps) {
  return (
    <svg {...baseProps(size, className, ariaLabel)} strokeWidth={strokeWidth}>
      <Frame framed={framed} />
      <path d="M 10 7 L 10 21 C 10 23.5, 12 25, 14 25 C 17 25, 18 22, 16 20" />
      <path d="M 7 11 L 14 11" />
      <path d="M 18 12 C 18 9, 21 8, 23 10" />
    </svg>
  );
});

// ─── Uranus ── H with circle ─────────────────────────────
export const UranusIcon = memo(function UranusIcon({ size = 24, className, strokeWidth = 1.6, framed, 'aria-label': ariaLabel = 'Uranus' }: PlanetIconProps) {
  return (
    <svg {...baseProps(size, className, ariaLabel)} strokeWidth={strokeWidth}>
      <Frame framed={framed} />
      <path d="M 9 7 L 9 19" />
      <path d="M 23 7 L 23 19" />
      <path d="M 9 13 L 23 13" />
      <path d="M 16 13 L 16 21" />
      <circle cx="16" cy="24" r="2.2" />
    </svg>
  );
});

// ─── Neptune ─ trident ───────────────────────────────────
export const NeptuneIcon = memo(function NeptuneIcon({ size = 24, className, strokeWidth = 1.6, framed, 'aria-label': ariaLabel = 'Neptune' }: PlanetIconProps) {
  return (
    <svg {...baseProps(size, className, ariaLabel)} strokeWidth={strokeWidth}>
      <Frame framed={framed} />
      <path d="M 8 8 C 8 14, 10 18, 16 18 C 22 18, 24 14, 24 8" />
      <path d="M 16 10 L 16 25" />
      <path d="M 12 22 L 20 22" />
    </svg>
  );
});

// ─── Pluto ─── circle within bowl, cross below ───────────
export const PlutoIcon = memo(function PlutoIcon({ size = 24, className, strokeWidth = 1.6, framed, 'aria-label': ariaLabel = 'Pluto' }: PlanetIconProps) {
  return (
    <svg {...baseProps(size, className, ariaLabel)} strokeWidth={strokeWidth}>
      <Frame framed={framed} />
      <path d="M 9 16 C 9 12, 12 8, 16 8 C 20 8, 23 12, 23 16" />
      <circle cx="16" cy="14" r="2.6" />
      <path d="M 16 18 L 16 26" />
      <path d="M 13 23 L 19 23" />
    </svg>
  );
});

export const PLANET_ICONS: Record<Planet, React.ComponentType<PlanetIconProps>> = {
  Sun: SunIcon,
  Moon: MoonIcon,
  Mercury: MercuryIcon,
  Venus: VenusIcon,
  Mars: MarsIcon,
  Jupiter: JupiterIcon,
  Saturn: SaturnIcon,
  Uranus: UranusIcon,
  Neptune: NeptuneIcon,
  Pluto: PlutoIcon,
};

/**
 * Resolve-by-name convenience.
 *
 * <PlanetGlyph planet="Saturn" size={32} className="text-gold" framed />
 */
export function PlanetGlyph({
  planet,
  ...rest
}: PlanetIconProps & { planet: Planet }) {
  const Icon = PLANET_ICONS[planet];
  return <Icon {...rest} aria-label={rest['aria-label'] ?? planet} />;
}
