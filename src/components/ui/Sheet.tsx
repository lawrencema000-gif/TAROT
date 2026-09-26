import { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useT } from '../../i18n/useT';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Accessible name when there is no visible title (a city panel, a celebration). */
  label?: string;
  children: React.ReactNode;
  variant?: 'default' | 'glow';
}

/**
 * Enter and leave, rather than enter and vanish.
 *
 * The sheet used to be `if (!open) return null` — it slid up over 400ms and
 * then disappeared between two frames. Every dismissal in the app was a jump
 * cut, and a jump cut reads as a bug: the user cannot tell whether the sheet
 * closed or the app crashed the view.
 *
 * So the component now outlives `open`. `mounted` keeps it in the DOM through
 * the exit; `shown` is the flag the transition actually reads.
 *
 * Timings (literals pending the theme tokens — see the note in Button.tsx):
 *   enter 280ms on cubic-bezier(0.22,0.8,0.25,1) — decelerating, so the panel
 *         arrives and settles rather than stopping dead. Under the 300ms
 *         ceiling: a sheet is a response to a tap, not a set piece.
 *   exit  180ms on cubic-bezier(0.4,0,1,1) — accelerating, and shorter.
 *         Leaving should always be faster than arriving; a slow exit is the
 *         single most common way a UI feels sluggish, because the user has
 *         already decided and is waiting on the animation.
 *
 * Both properties are transform and opacity. `translate-y-full` is the panel's
 * own height, so it parks exactly offscreen at any content size without a
 * measurement.
 */
const EXIT_MS = 180;

// How many sheets currently hold the page. The body scroll lock and the
// `sheet-open` class (which hides the bottom nav) belong to the page, not to
// any one sheet: a paywall opened from inside Settings used to release both
// when it closed, leaving Settings scrolling the page behind it with the
// navbar showing through. Now the last sheet out turns the lights off.
let openSheets = 0;
function holdPage() {
  openSheets += 1;
  if (openSheets === 1) {
    document.body.style.overflow = 'hidden';
    document.body.classList.add('sheet-open');
  }
  return () => {
    openSheets = Math.max(0, openSheets - 1);
    if (openSheets === 0) {
      document.body.style.overflow = '';
      document.body.classList.remove('sheet-open');
    }
  };
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function Sheet({ open, onClose, title, label, children, variant = 'default' }: SheetProps) {
  const { t } = useT('common');
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // Per instance: two sheets on one screen (a paywall over Settings) used to
  // share the id "sheet-title", so the dialog's name could resolve to the
  // wrong heading.
  const titleId = useId();

  const [mounted, setMounted] = useState(open);
  // Always starts false, even when `open` is true on the very first render —
  // several call sites do `{isOpen && <Sheet open .../>}`, and those would
  // otherwise mount already-open and skip the entrance entirely.
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      // Two frames, not one. A single rAF after the insert can still land in
      // the same paint as the mount, and the browser then has no "before" to
      // interpolate from — the sheet appears already open.
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setShown(true));
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }

    setShown(false);
    // Reduced motion unmounts on the same tick. The CSS override would have
    // made the transition instant anyway, but the timer is JS and would have
    // left an invisible sheet holding the body scroll lock for 180ms.
    const timer = window.setTimeout(() => setMounted(false), prefersReducedMotion() ? 0 : EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    // Focus the close button when sheet opens for keyboard/screen reader users
    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 100);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      window.clearTimeout(focusTimer);
    };
  }, [open, onClose]);

  // Keyed on `mounted`, not `open`, so the navbar does not pop back into view
  // underneath a sheet that is still on its way out.
  //
  // Hide the bottom navbar while any Sheet is open. The Sheet renders at z-50
  // (above the nav's z-40), but its anchored-to-bottom content box doesn't
  // reserve space for the navbar's height — so action buttons at the bottom
  // end up visually behind the navbar. CSS in index.css listens for
  // `body.sheet-open` and hides the navbar entirely while a sheet is up.
  useEffect(() => {
    if (!mounted) return;
    return holdPage();
  }, [mounted]);

  if (!mounted) return null;

  // Surfaces. No shadow on either: the scrim is what separates a sheet from
  // the page, and the panel's own fill does the rest. The only difference
  // between the two is the weight of the gold hairline along the top edge.
  //   default — slate panel with a soft gold hairline
  //   glow    — same panel, a firmer gold hairline for premium / paywall sheets
  const sheetStyles = variant === 'glow'
    ? 'bg-gradient-to-b from-mystic-850 to-mystic-900 border-t border-gold/25'
    : 'bg-gradient-to-b from-mystic-850 to-mystic-900 border-t border-gold/10';

  return (
    <div
      className={`fixed inset-0 z-50 ${shown ? '' : 'pointer-events-none'}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : (label ?? t('sheet.panel'))}
    >
      {/* The scrim fades on the same clock as the panel, so the two read as
          one object arriving rather than a backdrop plus a card. */}
      <div
        className={`
          absolute inset-0 bg-gradient-to-t from-mystic-950/95 via-mystic-950/80 to-mystic-900/55 backdrop-blur-md
          transition-opacity
          ${shown
            ? 'opacity-100 duration-slow ease-[cubic-bezier(0.22,0.8,0.25,1)]'
            : 'opacity-0 duration-fast ease-[cubic-bezier(0.4,0,1,1)]'}
        `}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={sheetRef}
        className={`
          absolute bottom-0 left-0 right-0 rounded-t-sheet max-h-[90dvh] overflow-hidden flex flex-col
          transition-[transform,opacity]
          ${shown
            ? 'translate-y-0 opacity-100 duration-slow ease-[cubic-bezier(0.22,0.8,0.25,1)]'
            : 'translate-y-full opacity-0 duration-fast ease-[cubic-bezier(0.4,0,1,1)]'}
          ${sheetStyles}
        `}
      >
        {/* Drag handle — slimmer, longer pill in muted gold for default,
            brighter gold for glow variant. */}
        <div className="flex items-center justify-center pt-3 pb-2">
          <div
            className={`h-[3px] w-10 rounded-full ${variant === 'glow' ? 'bg-gold/55' : 'bg-mystic-500/70'}`}
            aria-hidden
          />
        </div>
        {title && (
          <div className="flex items-center justify-between gap-3 px-6 pb-4 border-b border-mystic-800/50">
            {/* Title uses the new heading-display-md scale for a more
                editorial, broadside feel — and stays serif for CJK
                fallback fonts via the @apply chain. */}
            <h2 id={titleId} className="heading-display-md text-mystic-100 truncate">{title}</h2>
            {/* This button receives focus on open, so it needs a ring it can
                actually show. It had none. */}
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label={t('actions.close')}
              className="
                shrink-0 w-11 h-11 -mr-2 flex items-center justify-center rounded-full hairline-gold-soft text-mystic-300
                transition-[transform,color,border-color] duration-fast ease-[cubic-bezier(0.22,0.8,0.25,1)]
                touch-manipulation [-webkit-tap-highlight-color:transparent]
                motion-safe:active:scale-[0.92] active:text-mystic-100
                [@media(hover:hover)]:[&:hover:not(:active)]:text-mystic-100 [@media(hover:hover)]:[&:hover:not(:active)]:border-gold/30
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50
                focus-visible:ring-offset-2 focus-visible:ring-offset-mystic-950
              "
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto flex-1 p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
