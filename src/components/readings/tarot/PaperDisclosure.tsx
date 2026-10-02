import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * A row that opens, for the cream reading surface.
 *
 * The `Disclosure` primitive is dressed for the navy canvas (mystic-200
 * label, mystic-700 hairline), which is invisible on paper and cannot be
 * re-inked from outside. Until the primitive grows a `surface="paper"`
 * variant this is the same contract — a `<button aria-expanded
 * aria-controls>` over a `region` — in the ink roles: ink label, ink-muted
 * chevron, paper hairline. Used for "Read the full meaning" under a card's
 * short meaning on a ResultSheet, and in the saved-reading sheet.
 */
export function PaperDisclosure({
  label,
  defaultOpen = false,
  className = '',
  children,
}: {
  label: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
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
        onClick={() => setOpen((v) => !v)}
        className="w-full min-h-[48px] py-3 flex items-center justify-between gap-3 text-left text-ui font-medium text-ink select-none touch-manipulation [-webkit-tap-highlight-color:transparent] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-gold/50 rounded-inset"
      >
        <span>{label}</span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-ink-muted transition-transform duration-base ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      <div id={`${id}-panel`} role="region" aria-labelledby={`${id}-trigger`} hidden={!open} className="pb-4">
        {open && children}
      </div>
    </div>
  );
}
