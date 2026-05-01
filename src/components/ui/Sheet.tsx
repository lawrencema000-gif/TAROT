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

  const sheetStyles = variant === 'glow'
    ? 'bg-gradient-to-b from-mystic-850 to-mystic-900 border-t border-gold/20 shadow-inner-glow'
    : 'bg-mystic-900 border-t border-mystic-700/50';

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title || 'Sheet'}>
      <div
        className="absolute inset-0 bg-gradient-to-t from-mystic-950/95 via-mystic-950/80 to-mystic-900/60 backdrop-blur-md animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={sheetRef}
        className={`absolute bottom-0 left-0 right-0 rounded-t-3xl animate-slide-up max-h-[90dvh] overflow-hidden flex flex-col ${sheetStyles}`}
      >
        <div className="flex items-center justify-center pt-3 pb-2">
          <div className={`w-12 h-1 rounded-full ${variant === 'glow' ? 'bg-gold/40' : 'bg-mystic-600'}`} />
        </div>
        {title && (
          <div className="flex items-center justify-between px-6 pb-4 border-b border-mystic-800/50">
            <h2 className="font-display text-xl font-semibold text-mystic-100">{title}</h2>
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label="Close"
              className="p-2 rounded-full hover:bg-mystic-800 transition-colors"
            >
              <X className="w-5 h-5 text-mystic-400" />
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
