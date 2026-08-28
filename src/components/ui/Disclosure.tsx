import { HTMLAttributes, ReactNode, forwardRef, useCallback, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * A row that opens.
 *
 * Ten screens built this by hand and each one built it slightly wrong.
 * The header was a `<button>` on Feng Shui but a `<div onClick>` on two
 * others, so keyboard users could not reach it. None of them set
 * `aria-expanded`, so a screen reader announced an ordinary button and
 * nothing about the content appearing below. Half swapped ChevronUp for
 * ChevronDown while the other half rotated one chevron, which is the
 * same picture with twice the imports.
 *
 * Beyond the accessibility repair, the point of having this is that
 * collapsing is the cheapest fix for a long screen. A page with eleven
 * things to say does not need eleven cards; it needs the one thing that
 * matters open and the other ten reachable.
 *
 * Uncontrolled by default. Pass `open` and `onOpenChange` when the page
 * needs the accordion behaviour where opening one row closes the rest.
 */

export interface DisclosureProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onToggle' | 'title'> {
  /** The always-visible label on the left. */
  label: ReactNode;
  /** Secondary text under the label. */
  description?: ReactNode;
  /** Small trailing text before the chevron. A count, a date, a verdict word. */
  meta?: ReactNode;
  /** Glyph before the label. Sized to 18px. */
  icon?: ReactNode;
  /** Controlled open state. Provide `onOpenChange` alongside it. */
  open?: boolean;
  /** Initial state when uncontrolled. Default false. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * `row` sits inside an existing container and separates with a hairline.
   * `panel` brings its own surface. Default `panel`.
   */
  variant?: 'row' | 'panel';
  /** Hold off rendering children until the first open. Default false. */
  lazy?: boolean;
  disabled?: boolean;
  contentClassName?: string;
}

const variantStyles: Record<NonNullable<DisclosureProps['variant']>, string> = {
  panel: 'rounded-2xl border border-mystic-700 bg-mystic-850',
  row: 'border-b border-mystic-700 last:border-0',
};

const triggerPadding: Record<NonNullable<DisclosureProps['variant']>, string> = {
  panel: 'px-4',
  row: 'px-0',
};

const contentPadding: Record<NonNullable<DisclosureProps['variant']>, string> = {
  panel: 'px-4 pb-4',
  row: 'pb-4',
};

export const Disclosure = forwardRef<HTMLDivElement, DisclosureProps>(
  (
    {
      label,
      description,
      meta,
      icon,
      open,
      defaultOpen = false,
      onOpenChange,
      variant = 'panel',
      lazy = false,
      disabled = false,
      className = '',
      contentClassName = '',
      children,
      ...props
    },
    ref,
  ) => {
    const reactId = useId();
    const panelId = `disclosure-panel-${reactId}`;
    const triggerId = `disclosure-trigger-${reactId}`;

    const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
    const isOpen = open ?? uncontrolledOpen;

    // Once opened, children stay mounted. A `lazy` disclosure that
    // re-mounted on every toggle would throw away scroll position and any
    // state its content holds, which costs more than it saves.
    const hasOpened = useRef(isOpen);
    if (isOpen) hasOpened.current = true;

    const toggle = useCallback(() => {
      const next = !isOpen;
      if (open === undefined) setUncontrolledOpen(next);
      onOpenChange?.(next);
    }, [isOpen, open, onOpenChange]);

    return (
      <div ref={ref} className={`${variantStyles[variant]} ${className}`} {...props}>
        <button
          type="button"
          id={triggerId}
          onClick={toggle}
          disabled={disabled}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className={`
            w-full min-h-[48px] py-3 flex items-center gap-3 text-left rounded-2xl
            transition-colors
            hover:text-mystic-100
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50
            focus-visible:ring-offset-2 focus-visible:ring-offset-mystic-950
            disabled:opacity-50 disabled:cursor-not-allowed
            ${triggerPadding[variant]}
          `}
        >
          {icon && (
            <span
              className="shrink-0 text-gold [&>svg]:w-[18px] [&>svg]:h-[18px]"
              aria-hidden
            >
              {icon}
            </span>
          )}
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-medium text-mystic-200">{label}</span>
            {description && (
              <span className="block text-xs text-mystic-400 mt-0.5">{description}</span>
            )}
          </span>
          {meta && <span className="shrink-0 text-xs text-mystic-400">{meta}</span>}
          <ChevronDown
            className={`w-4 h-4 shrink-0 text-mystic-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>

        <div
          id={panelId}
          role="region"
          aria-labelledby={triggerId}
          hidden={!isOpen}
          className={`${contentPadding[variant]} ${contentClassName}`}
        >
          {(!lazy || hasOpened.current) && children}
        </div>
      </div>
    );
  },
);

Disclosure.displayName = 'Disclosure';
