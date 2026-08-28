import { HTMLAttributes, ReactNode, forwardRef } from 'react';

/**
 * What a screen looks like before there is anything on it.
 *
 * 22 pages wrote their own version and most of them wrote one grey
 * sentence, centred, in `text-mystic-500`. "No wishes yet." reads like
 * something failed to load. It is in fact the first thing a new user
 * sees on that screen, and it was doing none of the work a first screen
 * should do: name what goes here, and offer the one action that fills
 * it.
 *
 * Shape is glyph, line, optional second line, optional action. The
 * surface is deliberately quiet (`mystic-850` with a hairline) so an
 * empty list still looks like part of the design rather than a hole in
 * it. No coral, no warning iconography: nothing is wrong.
 *
 * For a genuine failure use a toast or an error surface, not this.
 */

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Lucide icon or any glyph. Rendered in a soft gold disc. */
  icon?: ReactNode;
  /** One line naming what is missing. Keep it concrete. */
  title: ReactNode;
  /** Optional second line: what to do, or why the list is empty. */
  description?: ReactNode;
  /** The action that fills the space. Usually a single `Button`. */
  action?: ReactNode;
  /**
   * `panel` brings its own surface, for a whole empty screen.
   * `inline` drops the surface, for an empty region inside a card.
   * Default `panel`.
   */
  variant?: 'panel' | 'inline';
  size?: 'sm' | 'md';
}

const variantStyles: Record<NonNullable<EmptyStateProps['variant']>, string> = {
  panel: 'rounded-2xl border border-mystic-700 bg-mystic-850',
  inline: '',
};

const sizeStyles: Record<NonNullable<EmptyStateProps['size']>, string> = {
  sm: 'px-5 py-8 gap-2.5',
  md: 'px-6 py-12 gap-3',
};

const discStyles: Record<NonNullable<EmptyStateProps['size']>, string> = {
  sm: 'w-11 h-11 [&>svg]:w-5 [&>svg]:h-5',
  md: 'w-14 h-14 [&>svg]:w-6 [&>svg]:h-6',
};

export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      icon,
      title,
      description,
      action,
      variant = 'panel',
      size = 'md',
      className = '',
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={`
          flex flex-col items-center text-center
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        {icon && (
          <span
            className={`
              shrink-0 rounded-full flex items-center justify-center
              bg-gold/10 border border-gold/25 text-gold
              ${discStyles[size]}
            `}
            aria-hidden
          >
            {icon}
          </span>
        )}
        <p className={`text-mystic-200 ${size === 'md' ? 'heading-display-md' : 'text-sm font-medium'}`}>
          {title}
        </p>
        {description && (
          <p className="text-sm text-mystic-400 leading-relaxed max-w-sm">{description}</p>
        )}
        {action && <div className="pt-2">{action}</div>}
      </div>
    );
  },
);

EmptyState.displayName = 'EmptyState';
