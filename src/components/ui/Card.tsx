import { HTMLAttributes, forwardRef } from 'react';

// `ornate` and `glow` are legacy names kept in the union only so the pages
// that still spell them typecheck while they are migrated; both render as
// `accent`. The integrator removes them from the union once no call site
// remains (BirthChart, the three report pages, the dev showcase).
export type CardVariant = 'default' | 'accent' | 'elevated' | 'ornate' | 'ritual' | 'glow';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * default   surface-1 on a hairline. The card.
   * accent    surface-1 on a gold hairline. The one card on a screen that is
   *           the point of the screen — a featured reading, the current plan.
   *           (`glow` and `ornate` are old names for this and still work;
   *           the glow never glowed and the manuscript flourishes were the
   *           symmetric-sparkle tell the audits named, so both resolve here.)
   * elevated  surface-2. One step up the fill ladder for a card that sits on
   *           another card, or a sheet's own panel. No shadow — see below.
   * ritual    the tappable feature card (`.card-ritual` in index.css).
   */
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
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
const variantStyles: Record<Exclude<CardVariant, 'glow' | 'ornate'>, string> = {
  default: 'bg-mystic-850 border-mystic-700',
  accent: 'bg-mystic-850 border-gold/25',
  elevated: 'bg-mystic-800 border-mystic-700/80',
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
      className = '',
      children,
      ...props
    },
    ref,
  ) => {
    const variant = variantProp === 'glow' || variantProp === 'ornate' ? 'accent' : variantProp;
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
    // No blur: every fill here is opaque, so a blur had nothing to blur and
    // cost a compositing layer per card for it.
    return (
      <div
        ref={ref}
        className={`
          rounded-card ${variant !== 'ritual' ? 'border' : ''}
          ${variantStyles[variant]}
          ${paddingStyles[padding]}
          ${interactiveClass}
          ${className}
        `}
        {...props}
      >
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
