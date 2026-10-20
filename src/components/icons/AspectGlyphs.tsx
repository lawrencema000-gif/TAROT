import { memo, type ComponentType, type ReactNode, type SVGProps } from 'react';

/**
 * Astrological aspect glyphs — conjunction, sextile, square, trine,
 * opposition, quincunx.
 *
 * The Unicode symbols (☌ ⚹ ☐ △ ☍ ⚻) sit in a block Android renders as
 * colour emoji at some weights and as a missing-glyph box at others, so the
 * learn pages draw them: 20px grid, 1.5px stroke, round caps, `currentColor`
 * — the SuitGlyphs / NavIcons idiom, so an aspect glyph sits beside a
 * ZodiacIcon or a PlanetIcon at the same visual weight. Decorative by
 * default; pass `aria-label` and `role="img"` when the glyph is the label.
 *
 * Keyed by the `slug` of the aspect entries in src/data/astrologyLearn.ts
 * (see ASPECT_GLYPHS).
 */

type IconProps = Omit<SVGProps<SVGSVGElement>, 'viewBox' | 'fill'> & { size?: number };

export type AspectGlyphKey = 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition' | 'quincunx';

function Frame({ className = '', size = 20, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 20 20"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={rest['aria-label'] ? undefined : true}
      {...rest}
    >
      {children}
    </svg>
  );
}

/** Conjunction — a circle with a stroke rising to the upper right. */
export const ConjunctionGlyph = memo(function ConjunctionGlyph(props: IconProps) {
  return (
    <Frame {...props}>
      <circle cx="7.5" cy="12.5" r="4" />
      <path d="M10.3 9.7 L16 4" />
    </Frame>
  );
});

/** Sextile — six rays from the centre. */
export const SextileGlyph = memo(function SextileGlyph(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M10 3.5 V16.5" />
      <path d="M4.37 6.75 L15.63 13.25" />
      <path d="M15.63 6.75 L4.37 13.25" />
    </Frame>
  );
});

/** Square — the ninety-degree box. */
export const SquareGlyph = memo(function SquareGlyph(props: IconProps) {
  return (
    <Frame {...props}>
      <rect x="4.5" y="4.5" width="11" height="11" rx="0.5" />
    </Frame>
  );
});

/** Trine — the equilateral triangle. */
export const TrineGlyph = memo(function TrineGlyph(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M10 3.75 L16.5 15.5 H3.5 Z" />
    </Frame>
  );
});

/** Opposition — two circles joined across the diagonal. */
export const OppositionGlyph = memo(function OppositionGlyph(props: IconProps) {
  return (
    <Frame {...props}>
      <circle cx="6" cy="14" r="3" />
      <circle cx="14" cy="6" r="3" />
      <path d="M8.1 11.9 L11.9 8.1" />
    </Frame>
  );
});

/** Quincunx — an inverted V standing on a base line. */
export const QuincunxGlyph = memo(function QuincunxGlyph(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M4 15.5 H16" />
      <path d="M6 15.5 L10 4.75 L14 15.5" />
    </Frame>
  );
});

export const ASPECT_GLYPHS: Record<AspectGlyphKey, ComponentType<IconProps>> = {
  conjunction: ConjunctionGlyph,
  sextile: SextileGlyph,
  square: SquareGlyph,
  trine: TrineGlyph,
  opposition: OppositionGlyph,
  quincunx: QuincunxGlyph,
};

export function isAspectGlyphKey(key: string): key is AspectGlyphKey {
  return key in ASPECT_GLYPHS;
}
