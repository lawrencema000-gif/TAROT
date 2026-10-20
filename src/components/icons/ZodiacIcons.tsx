import { memo, type ReactNode } from 'react';
import type { ZodiacSign } from '../../types/astrology';
import { useT } from '../../i18n/useT';
import { localizeSignName } from '../../i18n/localizeNames';

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
 *
 * Accessible name: the sign in the reader's language. The default used to
 * be the English name, so every caller that passed no label — the
 * onboarding reveal, the chart lists, the forecast, the learn pages — read
 * "Aries" aloud beside a visible 牡羊座 (p8 F92). It follows a language
 * change (the glyphs are memoised; the hook re-renders them). Pass
 * `aria-hidden` where the text beside the glyph already names the sign.
 */

export interface ZodiacIconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
  /** Render with a coin-style circular frame around the glyph. */
  framed?: boolean;
  /** Overrides the default name (the sign in the UI's language). */
  'aria-label'?: string;
  /** Decorative: the adjacent text names the sign. No role, no name. */
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

/** One glyph component per sign: the shared svg shell, its label, its drawing. */
function zodiacGlyph(sign: ZodiacSign, drawing: ReactNode) {
  const Icon = memo(function ZodiacIcon({
    size = 24,
    className,
    strokeWidth = 1.6,
    framed,
    'aria-label': ariaLabel,
    'aria-hidden': ariaHidden,
  }: ZodiacIconProps) {
    // Subscribes to the language, so the default name follows a change.
    useT();
    const a11y = ariaHidden
      ? { 'aria-hidden': true as const, focusable: 'false' as const }
      : { role: 'img' as const, 'aria-label': ariaLabel ?? localizeSignName(sign) };
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
  Icon.displayName = `${sign}Icon`;
  return Icon;
}

// ─── Aries ───── ram's horns ─────────────────────────────
export const AriesIcon = zodiacGlyph(
  'Aries',
  <>
    <path d="M 8 22 C 8 12, 10 8, 12 8 C 14.5 8, 16 10.5, 16 14 C 16 10.5, 17.5 8, 20 8 C 22 8, 24 12, 24 22" />
    <circle cx="16" cy="14" r="0.7" fill="currentColor" stroke="none" />
  </>,
);

// ─── Taurus ───── bull head with horns ───────────────────
// ♉'s horns are a cup resting on the head, rising to tips that turn
// outward. They used to arch down over the head (p10 d2-ja-11 check).
export const TaurusIcon = zodiacGlyph(
  'Taurus',
  <>
    <circle cx="16" cy="20" r="5.5" />
    <path d="M 7 8 C 10 8, 11.5 14.5, 16 14.5 C 20.5 14.5, 22 8, 25 8" />
  </>,
);

// ─── Gemini ──── roman numeral II with caps ──────────────
export const GeminiIcon = zodiacGlyph(
  'Gemini',
  <>
    <path d="M 9 7 L 23 7" />
    <path d="M 9 25 L 23 25" />
    <path d="M 12.5 7 L 12.5 25" />
    <path d="M 19.5 7 L 19.5 25" />
  </>,
);

// ─── Cancer ──── 69 with paired circles ──────────────────
export const CancerIcon = zodiacGlyph(
  'Cancer',
  <>
    <path d="M 7 13 C 7 8, 14 8, 17 13" />
    <circle cx="10" cy="14.2" r="2.2" fill="currentColor" stroke="none" />
    <path d="M 25 19 C 25 24, 18 24, 15 19" />
    <circle cx="22" cy="17.8" r="2.2" fill="currentColor" stroke="none" />
  </>,
);

// ─── Leo ─────── lion's mane with tail loop ──────────────
// ♌: the small circle sits low on the left, and the stroke rises from it,
// arches over and comes down to a tail that flicks outward. It used to be
// drawn upside down, the circle on top (p10 d2-ja-11 check).
export const LeoIcon = zodiacGlyph(
  'Leo',
  <>
    <circle cx="11" cy="19.5" r="3.5" />
    <path d="M 14 17.5 C 12.5 13, 12.5 7.5, 17 7.5 C 21.5 7.5, 22.5 11.5, 20.5 16 C 19 19.5, 19 24, 22.5 24 C 24 24, 25 23, 25.5 21.5" />
  </>,
);

// ─── Virgo ───── M with loop ─────────────────────────────
export const VirgoIcon = zodiacGlyph(
  'Virgo',
  <>
    <path d="M 7 22 L 7 11 C 7 9, 8.5 8, 10 8 C 11.5 8, 13 9, 13 11 L 13 22" />
    <path d="M 13 11 C 13 9, 14.5 8, 16 8 C 17.5 8, 19 9, 19 11 L 19 22" />
    <path d="M 19 11 C 19 9, 20.5 8, 22 8 C 23.5 8, 25 9, 25 12 C 25 16, 22 19, 19 20" />
    <path d="M 21 17 C 24 17, 26 20, 24 23 C 22.5 25, 19 24, 19 22" />
  </>,
);

// ─── Libra ──── scales ───────────────────────────────────
export const LibraIcon = zodiacGlyph(
  'Libra',
  <>
    <path d="M 6 21 L 26 21" />
    <path d="M 8 17 L 24 17" />
    <path d="M 8 17 C 8 12, 11 9, 16 9 C 21 9, 24 12, 24 17" />
  </>,
);

// ─── Scorpio ─── M with arrow tail ───────────────────────
export const ScorpioIcon = zodiacGlyph(
  'Scorpio',
  <>
    <path d="M 6 22 L 6 11 C 6 9, 7.5 8, 9 8 C 10.5 8, 12 9, 12 11 L 12 22" />
    <path d="M 12 11 C 12 9, 13.5 8, 15 8 C 16.5 8, 18 9, 18 11 L 18 22" />
    <path d="M 18 11 C 18 9, 19.5 8, 21 8 C 22.5 8, 24 9, 24 11 L 24 22" />
    <path d="M 24 22 L 27 25" />
    <path d="M 24 25 L 27 25 L 27 22" />
  </>,
);

// ─── Sagittarius ─ archer's arrow ────────────────────────
export const SagittariusIcon = zodiacGlyph(
  'Sagittarius',
  <>
    <path d="M 7 25 L 25 7" />
    <path d="M 25 7 L 17 7" />
    <path d="M 25 7 L 25 15" />
    <path d="M 11 17 L 19 25" />
  </>,
);

// ─── Capricorn ── goat-fish ─────────────────────────────
export const CapricornIcon = zodiacGlyph(
  'Capricorn',
  <>
    <path d="M 6 10 L 10 22 L 14 10 L 18 22" />
    <path d="M 18 22 C 18 17, 24 17, 24 21 C 24 24, 20 25, 18 22" />
  </>,
);

// ─── Aquarius ─── water waves ────────────────────────────
export const AquariusIcon = zodiacGlyph(
  'Aquarius',
  <>
    <path d="M 6 12 L 10 9 L 14 12 L 18 9 L 22 12 L 26 9" />
    <path d="M 6 20 L 10 17 L 14 20 L 18 17 L 22 20 L 26 17" />
  </>,
);

// ─── Pisces ──── two fish joined ─────────────────────────
// ♓ is ")–(": two crescents back to back, each bowing toward the other,
// the bar through both. The arcs used to bow outward, "(–)" (p10 d2-ja-11).
export const PiscesIcon = zodiacGlyph(
  'Pisces',
  <>
    <path d="M 10 7 C 14.5 12, 14.5 20, 10 25" />
    <path d="M 22 7 C 17.5 12, 17.5 20, 22 25" />
    <path d="M 8 16 L 24 16" />
  </>,
);

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
 * Resolve-by-name convenience component. Named in the UI's language unless
 * an `aria-label` (or `aria-hidden`) is passed.
 *
 * <ZodiacGlyph sign="Leo" size={32} className="text-gold" framed />
 */
export function ZodiacGlyph({
  sign,
  ...rest
}: ZodiacIconProps & { sign: ZodiacSign }) {
  const Icon = ZODIAC_ICONS[sign];
  return <Icon {...rest} />;
}
