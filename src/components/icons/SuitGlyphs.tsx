import { memo, type ComponentType, type ReactNode, type SVGProps } from 'react';

/**
 * Tarot suit glyphs — crown (Major Arcana), wand, cup, sword, pentacle.
 *
 * 20px, 1.5px stroke, round caps, `currentColor`: the same idiom as
 * NavIcons.tsx, so they sit in a Tabs row (the card library's suit tabs,
 * icon-only with an aria-label) and above a ResultSheet eyebrow as the
 * 28px result glyph (`className="w-7 h-7"`). Decorative by default; pass
 * `aria-label` and `role="img"` when the glyph is the only label.
 *
 * Keyed by the `suit` values in src/data/tarotDeck.ts (`wands` / `cups` /
 * `swords` / `pentacles`) plus `major` for the crown — see SUIT_GLYPHS.
 */

type IconProps = Omit<SVGProps<SVGSVGElement>, 'viewBox' | 'fill'>;

export type SuitKey = 'major' | 'wands' | 'cups' | 'swords' | 'pentacles';

function Frame({ className = '', children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 20 20"
      width={20}
      height={20}
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

/** Major Arcana — a five-point crown on a base. */
export const CrownGlyph = memo(function CrownGlyph(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M3.5 15.5 L2.75 7.25 L6.75 10.25 L10 4.75 L13.25 10.25 L17.25 7.25 L16.5 15.5 Z" />
      <path d="M3.5 15.5 H16.5" />
    </Frame>
  );
});

/** Wands — a rod with a budding tip and two leaves. */
export const WandGlyph = memo(function WandGlyph(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M4.5 15.5 L13.75 6.25" />
      <circle cx={15.1} cy={4.9} r={1.6} />
      <path d="M9.5 10.5 L11.6 10.3" />
      <path d="M9.5 10.5 L9.7 12.6" />
    </Frame>
  );
});

/** Cups — a chalice: bowl, stem, foot. */
export const CupGlyph = memo(function CupGlyph(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M5 4.5 H15 V7 A5 5 0 0 1 5 7 Z" />
      <path d="M10 12 V15.5" />
      <path d="M6.75 15.5 H13.25" />
    </Frame>
  );
});

/** Swords — blade, cross-guard, grip, pommel. */
export const SwordGlyph = memo(function SwordGlyph(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M10 2.75 V13.25" />
      <path d="M8.25 4.75 L10 2.75 L11.75 4.75" />
      <path d="M6.25 13.25 H13.75" />
      <path d="M10 13.25 V16.5" />
      <circle cx={10} cy={17.5} r={0.75} fill="currentColor" stroke="none" />
    </Frame>
  );
});

/** Pentacles — a pentagram in a ring. */
export const PentacleGlyph = memo(function PentacleGlyph(props: IconProps) {
  return (
    <Frame {...props}>
      <circle cx={10} cy={10} r={7.5} />
      <path d="M10 4.25 L13.38 14.65 L4.53 8.22 L15.47 8.22 L6.62 14.65 Z" strokeWidth={1.25} />
    </Frame>
  );
});

/** Suit → glyph, keyed by tarotDeck.ts `suit` plus `major`. */
export const SUIT_GLYPHS: Record<SuitKey, ComponentType<IconProps>> = {
  major: CrownGlyph,
  wands: WandGlyph,
  cups: CupGlyph,
  swords: SwordGlyph,
  pentacles: PentacleGlyph,
};

/** The glyph for a card: its suit, or the crown when it has none (Major Arcana). */
export function suitKeyFor(card: { arcana?: 'major' | 'minor'; suit?: SuitKey | string }): SuitKey {
  if (card.arcana === 'major' || !card.suit) return 'major';
  return (card.suit in SUIT_GLYPHS ? card.suit : 'major') as SuitKey;
}
