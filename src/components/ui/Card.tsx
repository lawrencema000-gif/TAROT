import { HTMLAttributes, forwardRef } from 'react';
import { FourCornerFlourishes } from './Ornament';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glow' | 'elevated' | 'ornate' | 'ritual';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
  /**
   * Decorate the card with four SVG corner flourishes. Default is
   * true for `variant="ornate"`, false otherwise. Set explicitly to
   * override.
   */
  flourished?: boolean;
}

// Elevation is a black drop-shadow, never a coloured bloom.
//
// Every variant used to carry a gold halo because the surfaces underneath it
// were invisible — a default card computed to 1.03:1 against the page, so the
// glow was the only thing separating card from background. Now that the mystic
// scale is a real lightness ladder (canvas→card is ΔL* 6.4), the halo has no
// job left, and 75 glowing cards was the single loudest dated signal in the
// product. A gold halo is now reserved for one element per screen: the primary
// call to action.
const variantStyles = {
  default: 'bg-mystic-850 border-mystic-700',
  glow: 'bg-mystic-850 border-gold/25',
  elevated: 'bg-mystic-800 border-mystic-700 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.7)]',
  // Ornate: two layered borders (outer gold gradient, inner hairline),
  // a subtle parchment-like tint, and an inner stroke ring produced by
  // an inset box-shadow. Paired with corner flourishes for the full
  // manuscript-page feel.
  ornate:
    'relative bg-gradient-to-br from-mystic-900/95 via-mystic-900/90 to-mystic-950/95 ' +
    'border-gold/40 ' +
    '[background-image:radial-gradient(ellipse_at_top,rgba(212,175,55,0.06),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(142,110,181,0.05),transparent_60%)] ' +
    'before:content-[""] before:absolute before:inset-[3px] before:rounded-[calc(1rem-3px)] ' +
    'before:border before:border-gold/20 before:pointer-events-none',
  // Ritual: redesign-2026 tappable feature-card style — warm gradient
  // panel with hairline gold border. Paired with the `.card-ritual`
  // utility from index.css (handles hover lift + active shrink). Self-
  // contained, no `before:` overlay, so it composes well with content
  // images placed at card edges.
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
      variant = 'default',
      padding = 'md',
      interactive,
      flourished,
      className = '',
      children,
      ...props
    },
    ref,
  ) => {
    const showFlourishes = flourished ?? variant === 'ornate';
    // The `ritual` variant has its own hover/active animation baked into
    // the .card-ritual utility (border lift + soft shadow swell). We only
    // add the cursor + tap feedback here; the visual transitions handled
    // by the variant CSS prevent layering conflicts.
    //
    // For every other variant the interactive state is now transform-first:
    //
    //   hover  a 2px lift, web only. It replaces `hover:shadow-glow`, which
    //          re-introduced on hover exactly the gold bloom this redesign
    //          took off cards, and which is a box-shadow — the most expensive
    //          thing you can put on a transition. A lift says "liftable"
    //          without repainting the card's shadow every frame.
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
            'transition-[transform,border-color,box-shadow,background-color,color] ' +
            'duration-base ease-[cubic-bezier(0.22,0.8,0.25,1)] ' +
            // `:not(:active)` so the lift drops when pressed. Without it the
            // hover rule wins on desktop — Tailwind emits arbitrary variants
            // after the built-in `active:` bucket. See the note in Button.tsx.
            '[@media(hover:hover)]:[&:hover:not(:active)]:border-gold/30 ' +
            '[@media(hover:hover)]:[&:hover:not(:active)]:-translate-y-0.5 ' +
            'motion-safe:active:scale-[0.98]'
        : '';
    return (
      <div
        ref={ref}
        className={`
          ${variant === 'ornate' ? 'relative' : ''}
          backdrop-blur-sm rounded-2xl ${variant !== 'ritual' ? 'border' : ''}
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
    <h3 ref={ref} className={`font-display text-xl font-semibold text-mystic-100 ${className}`} {...props}>
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
