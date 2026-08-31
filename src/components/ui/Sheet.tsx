import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
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

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function Sheet({ open, onClose, title, children, variant = 'default' }: SheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

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
    document.body.style.overflow = 'hidden';
    document.body.classList.add('sheet-open');
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('sheet-open');
    };
  }, [mounted]);

  if (!mounted) return null;

  // Refined surfaces for redesign-2026:
  //   default — slate panel with a hairline gold separator below the
  //             drag handle (subtle brand presence on every sheet)
  //   glow    — same as default but with a gold halo bordering the
  //             top edge for premium / paywall sheets
  const sheetStyles = variant === 'glow'
    ? 'bg-gradient-to-b from-mystic-850 to-mystic-900 ' +
      '[box-shadow:0_-12px_60px_-12px_rgba(212,175,55,0.18),inset_0_1px_0_rgba(212,175,55,0.22)]'
    : 'bg-gradient-to-b from-mystic-850 to-mystic-900 ' +
      '[box-shadow:0_-12px_40px_-16px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(212,175,55,0.10)]';

  return (
    <div
      className={`fixed inset-0 z-50 ${shown ? '' : 'pointer-events-none'}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'sheet-title' : undefined}
      aria-label={title ? undefined : 'Sheet'}
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
          absolute bottom-0 left-0 right-0 rounded-t-3xl max-h-[90dvh] overflow-hidden flex flex-col
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
            <h2 id="sheet-title" className="heading-display-md text-mystic-100 truncate">{title}</h2>
            {/* This button receives focus on open, so it needs a ring it can
                actually show. It had none. */}
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label="Close"
              className="
                shrink-0 p-2 rounded-full hairline-gold-soft text-mystic-300
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
