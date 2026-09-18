import { HTMLAttributes, forwardRef } from 'react';
import { FourCornerFlourishes } from './Ornament';

export type CardVariant = 'default' | 'accent' | 'elevated' | 'ornate' | 'ritual' | 'glow';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * default   surface-1 on a hairline. The card.
   * accent    surface-1 on a gold hairline. The one card on a screen that is
   *           the point of the screen — a featured reading, the current plan.
   *           (`glow` is the old name for this and still works; it never
   *           glowed, it was a gold hairline all along.)
   * elevated  surface-2. One step up the fill ladder for a card that sits on
   *           another card, or a sheet's own panel. No shadow — see below.
   * ornate    manuscript page: double border, radial gold wash, flourishes.
   * ritual    the tappable feature card (`.card-ritual` in index.css).
   */
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
  /**
   * Decorate the card with four SVG corner flourishes. Default is
   * true for `variant="ornate"`, false otherwise. Set explicitly to
   * override.
   */
  flourished?: boolean;
}

// Elevation is fill, never shadow.
//
// The surface ramp is a real lightness ladder now — canvas 950 → sunken 900 →
// surface-1 850 → surface-2 800 — and a step up that ladder is what "closer to
// you" looks like on a dark ground. A drop shadow on a dark surface is a
// darker smear on an already-dark page: it costs a repaint on every hover and
// buys almost nothing you can see. So the only thing that separates a card
// from the page is its fill and its hairline, and the only thing that
// separates a raised card from a card is one more step of fill.
//
// Every variant used to carry a gold halo because the surfaces underneath it
// were invisible (a default card computed to 1.03:1 against the page). That
// halo is gone from cards, and it is gone from buttons too: a solid gold
// fill on a near-black screen is already the loudest thing there.
const variantStyles: Record<Exclude<CardVariant, 'glow'>, string> = {
  default: 'bg-mystic-850 border-mystic-700',
  accent: 'bg-mystic-850 border-gold/25',
  elevated: 'bg-mystic-800 border-mystic-700/80',
  // Ornate: two layered borders (outer gold gradient, inner hairline),
  // a subtle parchment-like tint, and an inner stroke ring. Paired with
  // corner flourishes for the full manuscript-page feel. The inner ring's
  // radius is derived from the card radius token so the two stay
  // concentric if the token ever moves.
  ornate:
    'relative bg-gradient-to-br from-mystic-900/95 via-mystic-900/90 to-mystic-950/95 ' +
    'border-gold/40 ' +
    '[background-image:radial-gradient(ellipse_at_top,rgba(212,175,55,0.06),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(142,110,181,0.05),transparent_60%)] ' +
    'before:content-[""] before:absolute before:inset-[3px] before:rounded-[calc(theme(borderRadius.card)-3px)] ' +
    'before:border before:border-gold/20 before:pointer-events-none',
  // Ritual: the tappable feature card — warm gradient panel with a hairline
  // gold border, hover lift and press in `.card-ritual` (index.css). Self-
  // contained, no `before:` overlay, so it composes with content images
  // placed at card edges.
  ritual: 'card-ritual border-0',
};

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-7',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant: variantProp = 'default',
      padding = 'md',
      interactive,
      flourished,
      className = '',
      children,
      ...props
    },
    ref,
  ) => {
    const variant = variantProp === 'glow' ? 'accent' : variantProp;
    const showFlourishes = flourished ?? variant === 'ornate';
    // The `ritual` variant has its own hover/active animation baked into
    // the .card-ritual utility. We only add the cursor + tap feedback here.
    //
    // For every other variant the interactive state is transform-first:
    //
    //   hover  a 2px lift, web only. A lift says "liftable" without
    //          repainting anything.
    //   press  0.98 and the lift drops back to zero, so pushing down reads as
    //          the inverse of hovering rather than a second, unrelated event.
    //
    // Both are compositor-only. `motion-safe:` on the press because the global
    // reduce-motion block only zeroes the duration; the scale itself has to be
    // gated or it snaps.
    const interactiveClass =
      interactive
        ? variant === 'ritual'
          ? 'cursor-pointer touch-manipulation [-webkit-tap-highlight-color:transparent]'
          : 'cursor-pointer touch-manipulation [-webkit-tap-highlight-color:transparent] ' +
            // Named properties rather than `transition-all`, but background and
            // colour stay in the list: call sites add their own `hover:bg-*` on
            // top of `interactive`, and those used to transition under `all`.
            'transition-[transform,border-color,background-color,color] ' +
            'duration-base ease-[cubic-bezier(0.22,0.8,0.25,1)] ' +
            // `:not(:active)` so the lift drops when pressed. Without it the
            // hover rule wins on desktop — Tailwind emits arbitrary variants
            // after the built-in `active:` bucket. See the note in Button.tsx.
            '[@media(hover:hover)]:[&:hover:not(:active)]:border-gold/30 ' +
            '[@media(hover:hover)]:[&:hover:not(:active)]:-translate-y-0.5 ' +
            'motion-safe:active:scale-[0.98]'
        : '';
    // No backdrop-blur: every fill here is opaque, so the blur had nothing to
    // blur and cost a compositing layer per card for it.
    return (
      <div
        ref={ref}
        className={`
          ${variant === 'ornate' ? 'relative' : ''}
          rounded-card ${variant !== 'ritual' ? 'border' : ''}
          ${variantStyles[variant]}
          ${paddingStyles[padding]}
          ${interactiveClass}
          ${className}
        `}
        {...props}
      >
        {showFlourishes && <FourCornerFlourishes className="text-gold/70" size={26} />}
        {children}
      </div>
    );
  },
);

Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = '', children, ...props }, ref) => (
    <div ref={ref} className={`mb-4 ${className}`} {...props}>
      {children}
    </div>
  ),
);

CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className = '', children, ...props }, ref) => (
    <h3 ref={ref} className={`heading-display-md text-mystic-100 ${className}`} {...props}>
      {children}
    </h3>
  ),
);

CardTitle.displayName = 'CardTitle';

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = '', children, ...props }, ref) => (
    <div ref={ref} className={className} {...props}>
      {children}
    </div>
  ),
);

CardContent.displayName = 'CardContent';
