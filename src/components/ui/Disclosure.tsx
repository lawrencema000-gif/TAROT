import { HTMLAttributes, ReactNode, forwardRef, useCallback, useEffect, useId, useRef, useState } from 'react';
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

/**
 * One motion, not two.
 *
 * The chevron rotated over 200ms while the content it was describing appeared
 * between two frames, so the row read as a state change followed by an
 * unrelated animation. Now the panel fades and rises 4px on exactly the same
 * duration and the same curve as the rotation, and the row closes the same way
 * in reverse — the arrow and the thing it points at move together.
 *
 * The height itself is not animated. Interpolating height (or the
 * grid-template-rows trick) means a layout pass every frame on a component
 * that can hold an entire feng shui section, which is the kind of thing that
 * costs frames on the mid-range Android this ships to. The space snaps; the
 * content is what you watch.
 *
 * Literals pending the theme tokens — see the note in Button.tsx.
 */
const REVEAL_MS = 200;
const REVEAL_MOTION =
  'transition-[opacity,transform] duration-base ease-[cubic-bezier(0.22,0.8,0.25,1)]';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

    // `mounted` holds the panel in the DOM through its fade-out; `revealed`
    // is what the transition reads.
    const [mounted, setMounted] = useState(isOpen);
    const [revealed, setRevealed] = useState(isOpen);

    useEffect(() => {
      if (isOpen) {
        setMounted(true);
        // Two frames: one to get the collapsed state painted, one to flip it,
        // otherwise the browser coalesces both into a single paint and there
        // is nothing to interpolate.
        let inner = 0;
        const outer = requestAnimationFrame(() => {
          inner = requestAnimationFrame(() => setRevealed(true));
        });
        return () => {
          cancelAnimationFrame(outer);
          cancelAnimationFrame(inner);
        };
      }

      setRevealed(false);
      // Under reduced motion the CSS override makes the fade instant, so the
      // JS timer would be the only thing left holding layout open. Zero it.
      const timer = window.setTimeout(
        () => setMounted(false),
        prefersReducedMotion() ? 0 : REVEAL_MS,
      );
      return () => window.clearTimeout(timer);
    }, [isOpen]);

    // Call sites hand-rolled `animate-fade-in` into `contentClassName` to make
    // up for this component not animating its own reveal (FengShuiPage does it
    // twice). Now that it does, that class is not merely redundant:
    // `.animate-fade-in` in index.css is `forwards`, so it pins opacity and
    // transform at their final values for the life of the element and the exit
    // transition below could never run — the panel would sit there solid for
    // 200ms and then vanish. Strip it and let the primitive own the reveal.
    const contentMotionClass = contentClassName
      .split(/\s+/)
      .filter((c) => c !== 'animate-fade-in')
      .join(' ');

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
            transition-colors duration-fast ease-[cubic-bezier(0.22,0.8,0.25,1)]
            select-none touch-manipulation [-webkit-tap-highlight-color:transparent]
            [@media(hover:hover)]:[&:hover:not(:active)]:text-mystic-100
            ${disabled ? '' : 'active:bg-mystic-800/60 active:text-mystic-100'}
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
              <span className="block text-meta text-mystic-400 mt-0.5">{description}</span>
            )}
          </span>
          {meta && <span className="shrink-0 text-xs text-mystic-400">{meta}</span>}
          <ChevronDown
            className={`w-4 h-4 shrink-0 text-mystic-500 transition-transform duration-base ease-[cubic-bezier(0.22,0.8,0.25,1)] ${isOpen ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>

        {/* `hidden` follows `mounted`, not `isOpen`: while the panel is fading
            out it is still on screen, and hiding visible content from assistive
            tech is worse than the 200ms of disagreement with aria-expanded. */}
        <div
          id={panelId}
          role="region"
          aria-labelledby={triggerId}
          hidden={!mounted}
          className={`
            ${REVEAL_MOTION}
            ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'}
            ${contentPadding[variant]} ${contentMotionClass}
          `}
        >
          {(!lazy || hasOpened.current) && children}
        </div>
      </div>
    );
  },
);

Disclosure.displayName = 'Disclosure';
