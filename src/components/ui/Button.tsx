import { ButtonHTMLAttributes, forwardRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'gold' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

/**
 * MOTION TOKENS — literal values, pending the theme tokens.
 *
 * The motion pass agreed a three-step scale; `tailwind.config.js` did not yet
 * carry `duration-fast|base|slow` or named easings when these primitives were
 * written, so the literals live here as arbitrary values:
 *
 *   fast  120ms — press and colour feedback (this file, Chip, Input)
 *   base  200ms — chevron + content reveal (Disclosure), toast entrance
 *   slow  280ms — sheet entrance (exit 180ms)
 *
 *   out   cubic-bezier(0.22, 0.8, 0.25, 1)  things arriving / settling.
 *         Already the house curve — `.card-ritual` and `.hover-lift` in
 *         index.css use it. Reused rather than invented.
 *   in    cubic-bezier(0.4, 0, 1, 1)        things leaving.
 *
 * When the tokens land, these arbitrary values swap 1:1 for the named ones.
 *
 * HOVER IS WEB-ONLY, AND YIELDS TO PRESS. Tailwind's `hover:` compiles to a
 * bare `:hover`, which on Android sticks to the last-tapped element until
 * something else is tapped — so a tapped button stays lit. The config flag that
 * fixes this globally, `hoverOnlyWhenSupported`, is not ours to set, so every
 * hover here is wrapped in `[@media(hover:hover)]:` by hand.
 *
 * The `:not(:active)` half is not belt-and-braces, it is required. Tailwind
 * sorts arbitrary variants into a bucket AFTER the built-in ones, so the
 * generated `@media(hover:hover)` block lands ~400 lines below the plain
 * `.active\:*` rules — equal specificity, later in the file, hover wins. On
 * desktop the press colour would simply never appear, because pressing a
 * button means you are also hovering it. Excluding `:active` from the hover
 * selector makes the two states mutually exclusive and the outcome
 * independent of source order.
 *
 * PRESS IS `motion-safe:`. The global reduce-motion block in index.css zeroes
 * transition-duration, which would leave the 0.97 scale snapping instantly
 * rather than not happening — so the scale itself is gated on
 * `prefers-reduced-motion: no-preference`, not just its duration.
 */
const EASE_OUT = 'ease-[cubic-bezier(0.22,0.8,0.25,1)]';

// Transform, colour and shadow only — never a layout property.
const TRANSITION =
  `transition-[transform,background-color,border-color,color,box-shadow,opacity] duration-fast ${EASE_OUT}`;

// Kills the grey Android tap flash, which fires on its own timing and fights
// the scale, and stops a long-press from selecting the label.
const TAP = 'select-none touch-manipulation [-webkit-tap-highlight-color:transparent]';

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-gold text-mystic-950 shadow-glow active:bg-gold-dark ' +
    '[@media(hover:hover)]:[&:hover:not(:active)]:bg-gold-light ' +
    '[@media(hover:hover)]:[&:hover:not(:active)]:shadow-glow-md',
  secondary:
    'bg-mystic-700 text-mystic-100 active:bg-mystic-800 ' +
    '[@media(hover:hover)]:[&:hover:not(:active)]:bg-mystic-600',
  ghost:
    'bg-transparent text-mystic-300 active:bg-mystic-800 active:text-mystic-100 ' +
    '[@media(hover:hover)]:[&:hover:not(:active)]:bg-mystic-800 ' +
    '[@media(hover:hover)]:[&:hover:not(:active)]:text-mystic-100',
  outline:
    'bg-transparent border border-gold/30 text-gold active:border-gold/70 active:bg-gold/10 ' +
    '[@media(hover:hover)]:[&:hover:not(:active)]:border-gold/60',
  // The gradient can't take a background-colour shift, so the press reads as a
  // dip in opacity — compositor-only, unlike a filter.
  gold:
    'bg-gradient-to-r from-gold-dark via-gold to-gold-light text-mystic-950 shadow-glow-md active:opacity-90 ' +
    '[@media(hover:hover)]:[&:hover:not(:active)]:shadow-glow-lg',
  destructive:
    'bg-coral text-white active:bg-coral-dark ' +
    '[@media(hover:hover)]:[&:hover:not(:active)]:bg-coral-light',
};

// Three heights, baked in.
//
// Call sites had been patching this with min-h-[Npx] in 143 places across seven
// distinct heights, which is what happens when the primitive does not commit to
// one. 48px is the floor for a comfortable touch target, so md — the default —
// is 48 and sm is 40 for genuinely secondary controls.
const sizes: Record<ButtonSize, string> = {
  sm: 'min-h-[40px] px-4 text-sm',
  md: 'min-h-[48px] px-5 text-base',
  lg: 'min-h-[56px] px-7 text-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, fullWidth, className = '', children, disabled, ...props }, ref) => {
    const isDisabled = disabled || loading;
    // Gated in JS rather than with a `disabled:scale-100` override, because
    // Tailwind's variant ordering puts `active` after `disabled` and the press
    // would win. A dead control must not answer a tap.
    const press = isDisabled ? '' : 'motion-safe:active:scale-[0.97]';

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center gap-2 font-medium rounded-xl
          ${TRANSITION} ${TAP}
          focus:outline-none focus:ring-2 focus:ring-gold/50 focus:ring-offset-2 focus:ring-offset-mystic-950
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variants[variant]}
          ${sizes[size]}
          ${press}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        {...props}
      >
        {loading && (
          // Linear, and the only linear thing in the primitives — a spinner is
          // the one case where constant angular speed is correct.
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
