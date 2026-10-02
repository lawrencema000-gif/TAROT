import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * A disclosure row for the cream reading surface.
 *
 * The shared `Disclosure` is tuned for the navy canvas (mystic-200 label,
 * mystic-700 hairline, mystic-800 press), none of which reads on paper. This
 * is the same control — a 48 px trigger with aria-expanded, a region, a
 * chevron that turns on the same clock as the panel — in the ink tier:
 * ink-2 label, paper hairline, ink-gold chevron.
 */
export function PaperDisclosure({
  label,
  children,
  defaultOpen = false,
  className = '',
}: {
  label: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`border-t border-paper-hairline ${className}`.trim()}>
      <button
        type="button"
        id={`${id}-trigger`}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full min-h-[48px] items-center gap-3 py-3 text-left select-none touch-manipulation [-webkit-tap-highlight-color:transparent] transition-colors duration-fast [@media(hover:hover)]:[&:hover:not(:active)]:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-gold/50 rounded-inset"
      >
        <span className="flex-1 text-ui font-medium text-ink-2">{label}</span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-ink-gold transition-transform duration-base ease-[cubic-bezier(0.22,0.8,0.25,1)] ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      <div id={`${id}-panel`} role="region" aria-labelledby={`${id}-trigger`} hidden={!open} className="pb-4">
        {open && children}
      </div>
    </div>
  );
}
