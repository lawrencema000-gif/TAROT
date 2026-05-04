import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  variant?: 'default' | 'glow';
}

export function Sheet({ open, onClose, title, children, variant = 'default' }: SheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      // Hide the bottom navbar while any Sheet is open. The Sheet renders
      // at z-50 (above the nav's z-40), but its anchored-to-bottom
      // content box doesn't reserve space for the navbar's height — so
      // action buttons at the bottom end up visually behind the navbar.
      // CSS in index.css listens for `body.sheet-open` and hides the
      // navbar entirely while a sheet is up.
      document.body.classList.add('sheet-open');
      // Focus the close button when sheet opens for keyboard/screen reader users
      setTimeout(() => closeRef.current?.focus(), 100);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
      document.body.classList.remove('sheet-open');
    };
  }, [open, onClose]);

  if (!open) return null;

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
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title || 'Sheet'}>
      <div
        className="absolute inset-0 bg-gradient-to-t from-mystic-950/95 via-mystic-950/80 to-mystic-900/55 backdrop-blur-md animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={sheetRef}
        className={`absolute bottom-0 left-0 right-0 rounded-t-3xl animate-slide-up max-h-[90dvh] overflow-hidden flex flex-col ${sheetStyles}`}
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
            <h2 className="heading-display-md text-mystic-100 truncate">{title}</h2>
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 p-2 rounded-full hairline-gold-soft text-mystic-300 hover:text-mystic-100 hover:border-gold/30 transition-colors"
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
