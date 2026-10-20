import { memo } from 'react';

export type AspectKind = 'conjunction' | 'trine' | 'sextile' | 'square' | 'opposition';

interface AspectGlyphProps {
  aspect: AspectKind;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

/**
 * The five major aspects, drawn.
 *
 * ☌ △ ⚹ □ ☍ are text in the Miscellaneous Symbols block; Android paints
 * several of them as colour emoji and the rest in whatever fallback font
 * carries them, at a weight that matches nothing on the page. These are the
 * same signs as line art on the 24-unit grid the planet icons use, in
 * currentColor, so a synastry row reads as one set of marks.
 */
export const AspectGlyph = memo(function AspectGlyph({ aspect, size = 16, className, strokeWidth = 1.6 }: AspectGlyphProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
    focusable: false,
  };
  switch (aspect) {
    case 'conjunction':
      // A circle with a tail leading up and right.
      return (
        <svg {...common}>
          <circle cx="9" cy="15" r="5" />
          <path d="M12.6 11.4 L19 5" />
        </svg>
      );
    case 'opposition':
      // Two circles joined by a diagonal.
      return (
        <svg {...common}>
          <circle cx="7" cy="17" r="4" />
          <circle cx="17" cy="7" r="4" />
          <path d="M9.8 14.2 L14.2 9.8" />
        </svg>
      );
    case 'trine':
      return (
        <svg {...common}>
          <path d="M12 4 L20 19 H4 Z" />
        </svg>
      );
    case 'square':
      return (
        <svg {...common}>
          <rect x="5" y="5" width="14" height="14" />
        </svg>
      );
    case 'sextile':
      // Six rays from the centre.
      return (
        <svg {...common}>
          <path d="M12 4 V20" />
          <path d="M5.1 8 L18.9 16" />
          <path d="M18.9 8 L5.1 16" />
        </svg>
      );
    default:
      return null;
  }
});
