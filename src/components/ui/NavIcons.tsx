import { memo, type SVGProps } from 'react';

/**
 * Custom navigation glyphs that match the lucide-react icon API
 * (accept className, width/height via Tailwind w-N h-N classes, etc).
 * Designed to read clearly at 20px in the bottom nav, with stroke-only
 * outlines so they tint cleanly via `text-gold` / `text-mystic-*`.
 *
 *   TarotCardIcon       — a tall card with a 4-point sparkle inside.
 *                         Replaces the generic Sparkles icon for the
 *                         Readings tab so users know it leads to tarot.
 *   HoroscopeWheelIcon  — a circle divided by 12 spokes (zodiac houses)
 *                         with a small center dot. Replaces the generic
 *                         Star icon for the Horoscope tab — reads as
 *                         "natal chart wheel" at first glance.
 */

type IconProps = Omit<SVGProps<SVGSVGElement>, 'viewBox' | 'fill'>;

export const TarotCardIcon = memo(function TarotCardIcon({
  className = '',
  ...rest
}: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      {...rest}
    >
      {/* Card outline — tall portrait rectangle with rounded corners */}
      <rect x={6} y={3} width={12} height={18} rx={1.6} ry={1.6} />
      {/* Decorative inner border line — implies card frame */}
      <rect x={7.5} y={4.5} width={9} height={15} rx={0.8} ry={0.8} strokeOpacity={0.4} />
      {/* 4-point sparkle in upper portion of card */}
      <path d="M 12 8 C 12 10, 12 10, 14.5 11 C 12 12, 12 12, 12 14.5 C 12 12, 12 12, 9.5 11 C 12 10, 12 10, 12 8 Z" fill="currentColor" stroke="none" />
      {/* Subtle horizontal accent line below sparkle */}
      <line x1={9} y1={17} x2={15} y2={17} strokeOpacity={0.5} />
    </svg>
  );
});

export const HoroscopeWheelIcon = memo(function HoroscopeWheelIcon({
  className = '',
  ...rest
}: IconProps) {
  // 12 evenly-spaced spokes radiating from center to the inner ring.
  // Each spoke is 30° apart, like the 12 houses on a natal chart.
  const spokes = Array.from({ length: 12 }).map((_, i) => {
    const angle = (i * 30 - 90) * (Math.PI / 180); // start at top, go clockwise
    const r1 = 4;
    const r2 = 9.5;
    const x1 = 12 + r1 * Math.cos(angle);
    const y1 = 12 + r1 * Math.sin(angle);
    const x2 = 12 + r2 * Math.cos(angle);
    const y2 = 12 + r2 * Math.sin(angle);
    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} strokeOpacity={i % 3 === 0 ? 0.95 : 0.5} />;
  });
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      {...rest}
    >
      {/* Outer ring — the chart frame */}
      <circle cx={12} cy={12} r={10} />
      {/* Inner ring — separates spokes from center dot, like the
          inner sign-ring boundary on a natal wheel */}
      <circle cx={12} cy={12} r={4} strokeOpacity={0.55} />
      {/* 12 house spokes; cardinal angles (0/3/6/9 = top/right/bottom/
          left) get fuller opacity — visually echoes ASC/MC/DESC/IC */}
      {spokes}
      {/* Center sun — solid filled dot */}
      <circle cx={12} cy={12} r={1.4} fill="currentColor" stroke="none" />
    </svg>
  );
});
