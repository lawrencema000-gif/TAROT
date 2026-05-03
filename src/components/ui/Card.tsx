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

const variantStyles = {
  default: 'bg-mystic-900/80 border-mystic-700/50',
  glow: 'bg-mystic-900/80 border-gold/20 shadow-glow',
  elevated: 'bg-mystic-850/90 border-mystic-600/30 shadow-xl',
  // Ornate: two layered borders (outer gold gradient, inner hairline),
  // a subtle parchment-like tint, and an inner stroke ring produced by
  // an inset box-shadow. Paired with corner flourishes for the full
  // manuscript-page feel.
  ornate:
    'relative bg-gradient-to-br from-mystic-900/95 via-mystic-900/90 to-mystic-950/95 ' +
    'border-gold/40 shadow-glow-md ' +
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
    const interactiveClass =
      interactive
        ? variant === 'ritual'
          ? 'cursor-pointer'
          : 'cursor-pointer transition-all duration-300 hover:border-gold/30 hover:shadow-glow active:scale-[0.98]'
        : '';
    return (
      <div
        ref={ref}
        className={`
          ${variant === 'ornate' ? 'relative' : ''}
          backdrop-blur-sm rounded-2xl border
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
