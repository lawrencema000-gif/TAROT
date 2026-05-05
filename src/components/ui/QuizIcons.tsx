import { memo, type SVGProps } from 'react';

/**
 * Custom quiz glyphs — one per quiz, designed around what the quiz
 * actually measures rather than reusing generic lucide icons. Each
 * icon is single-color (uses currentColor for stroke + fill) so it
 * tints cleanly via Tailwind text-* classes — pair with `text-gold`
 * or category-themed colors.
 *
 * Drawn at 24px viewBox, tested for clarity at 32-48px display sizes
 * (the sizes used on QuizzesPage cards).
 *
 *   MbtiQuadrantIcon       — 4 quadrants split in a square; the four
 *                            MBTI dimensions (E/I, N/S, T/F, J/P).
 *   MbtiQuickIcon          — same quadrants + a lightning bolt for
 *                            the 12-question quick variant.
 *   LoveLanguagesIcon      — heart with 5 radiating beams (the five
 *                            love languages: gifts, words, acts,
 *                            touch, time).
 *   MoodWaveIcon           — sine wave over a horizontal baseline;
 *                            the emotional weather pattern.
 *   AttachmentRingsIcon    — two interlocked circles, the secure bond
 *                            with a tiny heart at the intersection.
 *   BigFivePentagonIcon    — pentagon with inner radar shape; the
 *                            classic OCEAN scoring chart.
 *   FourElementsIcon       — alchemy triangles △ ▽ △̄ ▽̄ for fire,
 *                            water, air, earth in a 2x2 layout.
 *   EnneagramIcon          — the 9-pointed enneagram figure with
 *                            the classic internal connecting lines.
 *   ShadowMaskIcon         — theatrical mask split light/shadow.
 *   TarotCourtIcon         — crown above a card outline.
 */

type IconProps = Omit<SVGProps<SVGSVGElement>, 'viewBox' | 'fill'>;

const baseSvgProps = (className: string): SVGProps<SVGSVGElement> => ({
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className,
  'aria-hidden': true,
});

// ─── MBTI (full personality assessment) ────────────────────────────
export const MbtiQuadrantIcon = memo(function MbtiQuadrantIcon({ className = '', ...rest }: IconProps) {
  return (
    <svg {...baseSvgProps(className)} {...rest}>
      {/* Outer rounded square — the personality space */}
      <rect x={3} y={3} width={18} height={18} rx={2.5} ry={2.5} />
      {/* Vertical divider — separates two of the four MBTI axes */}
      <line x1={12} y1={3} x2={12} y2={21} strokeOpacity={0.55} />
      {/* Horizontal divider — separates the other two */}
      <line x1={3} y1={12} x2={21} y2={12} strokeOpacity={0.55} />
      {/* One quadrant subtly filled — implies the user's chosen type
          settles into one of the 16 cells */}
      <rect x={12.5} y={3.5} width={8} height={8} rx={1.5} fill="currentColor" stroke="none" opacity={0.18} />
    </svg>
  );
});

export const MbtiQuickIcon = memo(function MbtiQuickIcon({ className = '', ...rest }: IconProps) {
  return (
    <svg {...baseSvgProps(className)} {...rest}>
      {/* Same quadrant base — but smaller to make room for the bolt */}
      <rect x={3} y={3} width={18} height={18} rx={2.5} ry={2.5} />
      <line x1={12} y1={3} x2={12} y2={21} strokeOpacity={0.4} />
      <line x1={3} y1={12} x2={21} y2={12} strokeOpacity={0.4} />
      {/* Lightning bolt — speed/quickness, sits on top of the
          quadrant grid */}
      <path
        d="M 13 5 L 7 13 L 11 13 L 9 19 L 17 11 L 13 11 Z"
        fill="currentColor"
        strokeWidth={1}
        strokeLinejoin="round"
      />
    </svg>
  );
});

// ─── Love Languages ─────────────────────────────────────────────────
export const LoveLanguagesIcon = memo(function LoveLanguagesIcon({ className = '', ...rest }: IconProps) {
  return (
    <svg {...baseSvgProps(className)} {...rest}>
      {/* Five radiating beams — one per love language. They emerge
          from behind the heart, fading at the tips. */}
      <g strokeOpacity={0.55}>
        <line x1={12} y1={2} x2={12} y2={5} />
        <line x1={4.5} y1={5.5} x2={6.5} y2={7.5} />
        <line x1={19.5} y1={5.5} x2={17.5} y2={7.5} />
        <line x1={3} y1={11} x2={5.5} y2={11} />
        <line x1={21} y1={11} x2={18.5} y2={11} />
      </g>
      {/* Heart in the center — the source of the languages */}
      <path
        d="M 12 20 C 12 20, 4 14.5, 4 9.5 C 4 7, 6 5, 8.5 5 C 10 5, 11.3 5.7, 12 7 C 12.7 5.7, 14 5, 15.5 5 C 18 5, 20 7, 20 9.5 C 20 14.5, 12 20, 12 20 Z"
        fill="currentColor"
        strokeWidth={1.2}
      />
    </svg>
  );
});

// ─── Mood Check ─────────────────────────────────────────────────────
export const MoodWaveIcon = memo(function MoodWaveIcon({ className = '', ...rest }: IconProps) {
  return (
    <svg {...baseSvgProps(className)} {...rest}>
      {/* Horizontal baseline — neutral mood */}
      <line x1={3} y1={12} x2={21} y2={12} strokeOpacity={0.35} />
      {/* Sine wave — emotional rhythm crossing baseline */}
      <path
        d="M 3 12 Q 6 5, 9 12 T 15 12 T 21 12"
        strokeWidth={1.8}
      />
      {/* Two small circles — high and low mood markers */}
      <circle cx={6} cy={7.5} r={1.1} fill="currentColor" stroke="none" />
      <circle cx={18} cy={16.5} r={1.1} fill="currentColor" stroke="none" opacity={0.6} />
    </svg>
  );
});

// ─── Attachment Style ───────────────────────────────────────────────
export const AttachmentRingsIcon = memo(function AttachmentRingsIcon({ className = '', ...rest }: IconProps) {
  return (
    <svg {...baseSvgProps(className)} {...rest}>
      {/* Two interlocked rings — the secure bond between two people */}
      <circle cx={8.5} cy={12} r={5.5} />
      <circle cx={15.5} cy={12} r={5.5} />
      {/* Tiny heart at intersection — the emotional core of attachment */}
      <path
        d="M 12 11.5 C 11.5 10.5, 10.5 10.5, 10.5 11.5 C 10.5 12.5, 12 13.8, 12 13.8 C 12 13.8, 13.5 12.5, 13.5 11.5 C 13.5 10.5, 12.5 10.5, 12 11.5 Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
});

// ─── Big Five (OCEAN) ───────────────────────────────────────────────
export const BigFivePentagonIcon = memo(function BigFivePentagonIcon({ className = '', ...rest }: IconProps) {
  // Outer pentagon vertices (5-sided, point up)
  const cx = 12, cy = 12.5;
  const r = 8.5;
  const outerPts = Array.from({ length: 5 }).map((_, i) => {
    const a = (i * 72 - 90) * (Math.PI / 180);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
  const outerPath = outerPts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`).join(' ') + ' Z';

  // Inner radar shape — irregular pentagon at variable radii
  // (illustrates a real OCEAN profile rather than a perfect inner pentagon)
  const innerRadii = [0.65, 0.42, 0.78, 0.55, 0.38]; // hand-picked profile
  const innerPts = innerRadii.map((rr, i) => {
    const a = (i * 72 - 90) * (Math.PI / 180);
    return [cx + r * rr * Math.cos(a), cy + r * rr * Math.sin(a)];
  });
  const innerPath = innerPts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`).join(' ') + ' Z';

  return (
    <svg {...baseSvgProps(className)} {...rest}>
      {/* Outer pentagon — the trait dimensions */}
      <path d={outerPath} />
      {/* Spokes from center to each vertex */}
      {outerPts.map(([x, y], i) => (
        <line key={i} x1={cx} y1={cy} x2={x} y2={y} strokeOpacity={0.3} strokeWidth={0.8} />
      ))}
      {/* Inner radar — actual scored profile, filled */}
      <path d={innerPath} fill="currentColor" stroke="currentColor" strokeWidth={1} fillOpacity={0.22} />
    </svg>
  );
});

// ─── Four Elements ──────────────────────────────────────────────────
export const FourElementsIcon = memo(function FourElementsIcon({ className = '', ...rest }: IconProps) {
  return (
    <svg {...baseSvgProps(className)} {...rest} strokeWidth={1.4}>
      {/* Fire — upward triangle (top-left) */}
      <path d="M 4 9 L 7 4 L 10 9 Z" />
      {/* Air — upward triangle with horizontal bar (top-right) */}
      <path d="M 14 9 L 17 4 L 20 9 Z" />
      <line x1={15.2} y1={7.2} x2={18.8} y2={7.2} />
      {/* Water — downward triangle (bottom-left) */}
      <path d="M 4 15 L 10 15 L 7 20 Z" />
      {/* Earth — downward triangle with horizontal bar (bottom-right) */}
      <path d="M 14 15 L 20 15 L 17 20 Z" />
      <line x1={15.2} y1={16.8} x2={18.8} y2={16.8} />
    </svg>
  );
});

// ─── Enneagram ──────────────────────────────────────────────────────
export const EnneagramIcon = memo(function EnneagramIcon({ className = '', ...rest }: IconProps) {
  const cx = 12, cy = 12, r = 9;
  // 9 points evenly spaced around the circle, starting at top
  const pts = Array.from({ length: 9 }).map((_, i) => {
    const a = (i * 40 - 90) * (Math.PI / 180);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
  // Classic enneagram internal connections (not all-to-all):
  //   Triangle: 0 (point 9) → 3 → 6 → 0
  //   Hexad: 1 → 4 → 2 → 8 → 5 → 7 → 1
  const triangle = [0, 3, 6, 0];
  const hexad = [1, 4, 2, 8, 5, 7, 1];
  const linePath = (idxs: number[]) =>
    idxs.map((i, k) => `${k === 0 ? 'M' : 'L'} ${pts[i][0].toFixed(2)} ${pts[i][1].toFixed(2)}`).join(' ');
  return (
    <svg {...baseSvgProps(className)} {...rest} strokeWidth={1.1}>
      {/* Outer circle */}
      <circle cx={cx} cy={cy} r={r} strokeOpacity={0.5} />
      {/* Inner triangle (types 9-3-6) */}
      <path d={linePath(triangle)} strokeOpacity={0.85} />
      {/* Hexad lines (1-4-2-8-5-7) — the dynamic connections */}
      <path d={linePath(hexad)} strokeOpacity={0.55} />
      {/* 9 type points */}
      {pts.map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={i % 3 === 0 ? 1.2 : 0.85}
          fill="currentColor"
          stroke="none"
        />
      ))}
    </svg>
  );
});

// ─── Shadow Archetype ───────────────────────────────────────────────
export const ShadowMaskIcon = memo(function ShadowMaskIcon({ className = '', ...rest }: IconProps) {
  return (
    <svg {...baseSvgProps(className)} {...rest}>
      {/* Mask outline — oval face shape */}
      <path d="M 12 3 C 16.5 3, 19 6.5, 19 11 C 19 16.5, 15.5 21, 12 21 C 8.5 21, 5 16.5, 5 11 C 5 6.5, 7.5 3, 12 3 Z" />
      {/* Shadow half — left side filled, the "shadow" of the archetype */}
      <path
        d="M 12 3 C 7.5 3, 5 6.5, 5 11 C 5 16.5, 8.5 21, 12 21 Z"
        fill="currentColor"
        stroke="none"
        opacity={0.4}
      />
      {/* Two small eyes — the persona looking out */}
      <circle cx={9.5} cy={10} r={0.8} fill="currentColor" stroke="none" />
      <circle cx={14.5} cy={10} r={0.8} fill="currentColor" stroke="none" />
      {/* Subtle dividing line down the center — light/shadow split */}
      <line x1={12} y1={3} x2={12} y2={21} strokeOpacity={0.4} strokeDasharray="1.5 1.5" />
    </svg>
  );
});

// ─── Ayurveda Dosha ─────────────────────────────────────────────────
export const AyurvedaDoshaIcon = memo(function AyurvedaDoshaIcon({ className = '', ...rest }: IconProps) {
  return (
    <svg {...baseSvgProps(className)} {...rest}>
      {/* Three connecting petals — Vata (top, air/space), Pitta (lower
          right, fire/water), Kapha (lower left, earth/water). Echoes
          the classical "triguna" trinity central to Ayurvedic thought. */}
      {/* Vata — top petal */}
      <path d="M 12 3 C 9 6, 9 10, 12 12 C 15 10, 15 6, 12 3 Z" />
      {/* Pitta — bottom-right petal, rotated ~120° */}
      <path d="M 19.8 16.5 C 16.6 16, 13.5 13, 13.6 10 C 16.6 11, 19.7 13.5, 19.8 16.5 Z" />
      {/* Kapha — bottom-left petal, rotated ~240° */}
      <path d="M 4.2 16.5 C 4.3 13.5, 7.4 11, 10.4 10 C 10.5 13, 7.4 16, 4.2 16.5 Z" />
      {/* Center dot — the unified prakriti (constitution) */}
      <circle cx={12} cy={12.8} r={1.3} fill="currentColor" stroke="none" />
    </svg>
  );
});

// ─── Tarot Court ────────────────────────────────────────────────────
export const TarotCourtIcon = memo(function TarotCourtIcon({ className = '', ...rest }: IconProps) {
  return (
    <svg {...baseSvgProps(className)} {...rest}>
      {/* Crown — three points with a base band, sitting above the card */}
      <path d="M 7 6 L 9 3 L 12 5.5 L 15 3 L 17 6 L 17 7.5 L 7 7.5 Z" fill="currentColor" stroke="currentColor" strokeWidth={0.8} strokeLinejoin="round" />
      <line x1={7} y1={7.5} x2={17} y2={7.5} strokeWidth={0.8} />
      {/* Three small jewels on the crown points */}
      <circle cx={9} cy={3.6} r={0.55} fill="currentColor" stroke="none" />
      <circle cx={12} cy={5.8} r={0.55} fill="currentColor" stroke="none" />
      <circle cx={15} cy={3.6} r={0.55} fill="currentColor" stroke="none" />
      {/* Tarot card outline below the crown */}
      <rect x={7} y={9.5} width={10} height={12} rx={1} ry={1} />
      {/* Inner border — gives the card depth */}
      <rect x={8.2} y={10.7} width={7.6} height={9.6} rx={0.5} ry={0.5} strokeOpacity={0.4} />
      {/* Single sparkle inside the card — implies court-card art */}
      <path
        d="M 12 13.5 C 12 14.8, 12 14.8, 13.5 15.5 C 12 16.2, 12 16.2, 12 17.5 C 12 16.2, 12 16.2, 10.5 15.5 C 12 14.8, 12 14.8, 12 13.5 Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
});
