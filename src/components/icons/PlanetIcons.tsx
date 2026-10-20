import { memo, type ReactNode } from 'react';
import type { Planet } from '../../types/astrology';
import { useT } from '../../i18n/useT';
import { localizePlanetName } from '../../i18n/localizeNames';

/**
 * Hand-drawn planet/luminary SVG glyphs.
 *
 * Replaces flat Unicode symbols (☉ ☽ ☿ …) with detailed line-art
 * glyphs at 32x32 viewBox. Stroke matches ZodiacIcons so mixed
 * astrological UIs look cohesive.
 *
 * Accessible name: the planet in the reader's language. The default used
 * to be the English name, and PlanetGlyph added it again, so every caller
 * that passed no label — the birth chart, the forecast, the natal report,
 * the wheel's detail panel, the cosmic score — read "Saturn" aloud beside
 * a visible 土星 (p8 F92, as the zodiac glyphs did). It follows a language
 * change (the glyphs are memoised; the hook re-renders them). Pass
 * `aria-hidden` where the text beside the glyph already names the planet.
 */

export interface PlanetIconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
  /** Render with a coin-style circular frame around the glyph. */
  framed?: boolean;
  /** Overrides the default name (the planet in the UI's language). */
  'aria-label'?: string;
  /** Decorative: the adjacent text names the planet. No role, no name. */
  'aria-hidden'?: boolean;
}

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

/** One glyph component per planet: the shared svg shell, its label, its drawing. */
function planetGlyph(planet: Planet, drawing: ReactNode) {
  const Icon = memo(function PlanetIcon({
    size = 24,
    className,
    strokeWidth = 1.6,
    framed,
    'aria-label': ariaLabel,
    'aria-hidden': ariaHidden,
  }: PlanetIconProps) {
    // Subscribes to the language, so the default name follows a change.
    useT();
    const a11y = ariaHidden
      ? { 'aria-hidden': true as const, focusable: 'false' as const }
      : { role: 'img' as const, 'aria-label': ariaLabel ?? localizePlanetName(planet) };
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className ?? ''}
        strokeWidth={strokeWidth}
        {...a11y}
      >
        <Frame framed={framed} />
        {drawing}
      </svg>
    );
  });
  Icon.displayName = `${planet}Icon`;
  return Icon;
}

// ─── Sun ──── circle with dot ────────────────────────────
export const SunIcon = planetGlyph(
  'Sun',
  <>
    <circle cx="16" cy="16" r="7" />
    <circle cx="16" cy="16" r="1.4" fill="currentColor" stroke="none" />
  </>,
);

// ─── Moon ─── crescent ───────────────────────────────────
export const MoonIcon = planetGlyph(
  'Moon',
  <path d="M 22 8 C 17 8, 12 12, 12 16 C 12 20, 17 24, 22 24 C 17 22, 14 19, 14 16 C 14 13, 17 10, 22 8 Z" />,
);

// ─── Mercury ─ horned crown / circle / cross ─────────────
export const MercuryIcon = planetGlyph(
  'Mercury',
  <>
    <path d="M 11 6 C 11 9, 13 11, 16 11 C 19 11, 21 9, 21 6" />
    <circle cx="16" cy="15" r="4" />
    <path d="M 16 19 L 16 26" />
    <path d="M 13 23 L 19 23" />
  </>,
);

// ─── Venus ─── circle with cross below ───────────────────
export const VenusIcon = planetGlyph(
  'Venus',
  <>
    <circle cx="16" cy="13" r="5" />
    <path d="M 16 18 L 16 26" />
    <path d="M 13 23 L 19 23" />
  </>,
);

// ─── Mars ──── circle with arrow ─────────────────────────
export const MarsIcon = planetGlyph(
  'Mars',
  <>
    <circle cx="14" cy="19" r="5" />
    <path d="M 17.5 15.5 L 24 9" />
    <path d="M 24 9 L 18 9" />
    <path d="M 24 9 L 24 15" />
  </>,
);

// ─── Jupiter ─ stylized 4 / hieroglyphic ─────────────────
export const JupiterIcon = planetGlyph(
  'Jupiter',
  <>
    <path d="M 9 12 C 9 8, 12 6, 15 8 C 17 9.5, 17 13, 15 15 L 11 18" />
    <path d="M 9 21 L 23 21" />
    <path d="M 19 9 L 19 24" />
  </>,
);

// ─── Saturn ── stylized h with cross ─────────────────────
export const SaturnIcon = planetGlyph(
  'Saturn',
  <>
    <path d="M 10 7 L 10 21 C 10 23.5, 12 25, 14 25 C 17 25, 18 22, 16 20" />
    <path d="M 7 11 L 14 11" />
    <path d="M 18 12 C 18 9, 21 8, 23 10" />
  </>,
);

// ─── Uranus ── H with circle ─────────────────────────────
export const UranusIcon = planetGlyph(
  'Uranus',
  <>
    <path d="M 9 7 L 9 19" />
    <path d="M 23 7 L 23 19" />
    <path d="M 9 13 L 23 13" />
    <path d="M 16 13 L 16 21" />
    <circle cx="16" cy="24" r="2.2" />
  </>,
);

// ─── Neptune ─ trident ───────────────────────────────────
export const NeptuneIcon = planetGlyph(
  'Neptune',
  <>
    <path d="M 8 8 C 8 14, 10 18, 16 18 C 22 18, 24 14, 24 8" />
    <path d="M 16 10 L 16 25" />
    <path d="M 12 22 L 20 22" />
  </>,
);

// ─── Pluto ─── circle within bowl, cross below ───────────
export const PlutoIcon = planetGlyph(
  'Pluto',
  <>
    <path d="M 9 16 C 9 12, 12 8, 16 8 C 20 8, 23 12, 23 16" />
    <circle cx="16" cy="14" r="2.6" />
    <path d="M 16 18 L 16 26" />
    <path d="M 13 23 L 19 23" />
  </>,
);

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
 * Resolve-by-name convenience component. Named in the UI's language unless
 * an `aria-label` (or `aria-hidden`) is passed.
 *
 * <PlanetGlyph planet="Saturn" size={32} className="text-gold" framed />
 */
export function PlanetGlyph({
  planet,
  ...rest
}: PlanetIconProps & { planet: Planet }) {
  const Icon = PLANET_ICONS[planet];
  return <Icon {...rest} />;
}
