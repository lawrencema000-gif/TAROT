import { ChevronRight } from 'lucide-react';
import { ReactNode, ButtonHTMLAttributes, forwardRef } from 'react';

/**
 * Layout primitives for the redesign-2026 home/landing layouts. Pulled
 * from the ad mockup hero screenshot:
 *
 *   FeaturePill   — small rounded card with a thin line icon and an
 *                   uppercase serif label, sized to fit a 3-up grid
 *                   (Astrology / Tarot / Journal).
 *   RitualRow     — full-width tappable horizontal pill with a colored
 *                   circular accent on the left, label + meta in the
 *                   middle, and a chevron on the right (the
 *                   "Daily Ritual · 7 day streak" row).
 *   AvailableNowLabel — gold uppercase footer label flanked by tiny
 *                   sparkle bullets, used for marketing-surface
 *                   trust strips.
 *
 * All three are pure presentation: no routing, no auth, no state.
 * Hooked up by the page that uses them.
 */

export interface FeaturePillProps {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  /** Optional href — renders as a link instead of a button. */
  href?: string;
  className?: string;
  ariaLabel?: string;
}

/**
 * Small ritual-feature pill. Used in a 3-up grid on the redesigned
 * Home screen — see Ad 1 (Astrology · Tarot · Journal row).
 *
 * The icon is rendered at 24×24 via a wrapping div; pass any
 * lucide-react icon (or other ReactNode) and we'll size it. Label
 * sits below in `.font-display-eyebrow` style — uppercase tracked
 * serif kicker.
 */
export function FeaturePill({
  icon,
  label,
  onClick,
  href,
  className = '',
  ariaLabel,
}: FeaturePillProps) {
  const inner = (
    <>
      <div className="text-gold w-7 h-7 flex items-center justify-center [&>svg]:w-7 [&>svg]:h-7">
        {icon}
      </div>
      <span className="font-display-eyebrow">{label}</span>
    </>
  );
  const baseClass =
    'flex flex-col items-center justify-center gap-2 py-4 px-3 ' +
    'hairline-gold-soft rounded-2xl bg-mystic-900/55 backdrop-blur-sm ' +
    'transition-all duration-300 ease-out ' +
    'hover:border-gold/35 hover:bg-mystic-900/75 hover:-translate-y-0.5 ' +
    'active:translate-y-0 active:scale-[0.98]';
  if (href) {
    return (
      <a
        href={href}
        aria-label={ariaLabel ?? label}
        className={`${baseClass} ${className}`}
      >
        {inner}
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      className={`${baseClass} ${className}`}
    >
      {inner}
    </button>
  );
}

/**
 * Group of FeaturePills laid out in a 3-up grid. Convenience wrapper
 * to keep the gap consistent across the app.
 */
export function FeaturePillGroup({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-3 gap-2.5 ${className}`}>{children}</div>
  );
}

export interface RitualRowProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Lucide icon (or any ReactNode) rendered in the colored circle. */
  icon: ReactNode;
  /** Primary label — bigger, brighter. */
  label: string;
  /** Smaller meta line under the label (e.g. "7 day streak"). */
  meta?: string;
  /**
   * Accent color for the circular icon backdrop. Defaults to gold.
   * Pass `purple` for the lavender lotus treatment from Ad 1's
   * "Daily Ritual" row.
   */
  accent?: 'gold' | 'purple' | 'teal' | 'coral';
  /** Hide the trailing chevron (useful when the row is non-interactive). */
  hideChevron?: boolean;
}

const accentClasses: Record<NonNullable<RitualRowProps['accent']>, string> = {
  gold:   'bg-gold/15 text-gold ring-1 ring-gold/30',
  purple: 'bg-[#8e6eb5]/20 text-[#c9a8e8] ring-1 ring-[#8e6eb5]/40',
  teal:   'bg-teal/15 text-teal ring-1 ring-teal/30',
  coral:  'bg-coral/15 text-coral ring-1 ring-coral/30',
};

/**
 * Full-width tappable horizontal pill. Used for the "Daily Ritual ·
 * 7 day streak" row at the bottom of the redesigned Home screen.
 * Supports both button and anchor semantics — pass `onClick` for
 * a button, or wrap in a Link / use `<a>` directly.
 *
 * The icon sits in a circular swatch on the left; label + meta stack
 * in the middle; a chevron sits on the right unless `hideChevron`.
 */
export const RitualRow = forwardRef<HTMLButtonElement, RitualRowProps>(
  function RitualRow(
    {
      icon,
      label,
      meta,
      accent = 'gold',
      hideChevron = false,
      className = '',
      ...buttonProps
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type="button"
        className={`
          w-full flex items-center gap-4 px-4 py-3.5
          hairline-gold-soft rounded-2xl bg-mystic-900/55 backdrop-blur-sm
          transition-all duration-300 ease-out
          hover:border-gold/35 hover:bg-mystic-900/75
          active:scale-[0.99]
          ${className}
        `}
        {...buttonProps}
      >
        <div
          className={`
            w-11 h-11 rounded-full flex items-center justify-center shrink-0
            [&>svg]:w-5 [&>svg]:h-5
            ${accentClasses[accent]}
          `}
          aria-hidden
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="font-display-eyebrow !text-mystic-200 !tracking-[0.16em]">
            {label}
          </div>
          {meta && (
            <div className="text-sm text-mystic-400 mt-0.5 truncate">{meta}</div>
          )}
        </div>
        {!hideChevron && (
          <ChevronRight className="w-5 h-5 text-mystic-500 shrink-0" aria-hidden />
        )}
      </button>
    );
  },
);

/**
 * Tiny gold uppercase trust label — pulled from the Ad 2 footer.
 *
 *   ✦  AVAILABLE NOW  ✦
 */
export function AvailableNowLabel({
  children = 'Available now',
  className = '',
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 font-display-eyebrow ${className}`}>
      <span aria-hidden className="inline-block w-1 h-1 rounded-full bg-gold/60" />
      <span>{children}</span>
      <span aria-hidden className="inline-block w-1 h-1 rounded-full bg-gold/60" />
    </span>
  );
}
