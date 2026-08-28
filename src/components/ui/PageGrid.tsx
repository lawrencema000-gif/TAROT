import { HTMLAttributes, ReactNode } from 'react';

export interface PageGridProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Secondary column. Rendered in an `<aside>` that sits beside the
   * content on desktop and below it on phones. Omit it and the grid
   * collapses to a single column at every width — no empty gutter.
   */
  aside?: ReactNode;
  /** Accessible name for the aside landmark, e.g. "Related cards". */
  asideLabel?: string;
  /** Extra classes on the `<aside>` itself. */
  asideClassName?: string;
  children: ReactNode;
}

// Two-column page shell for the content-heavy screens — a reading and its
// history, a card meaning and its neighbours, a journal entry and its
// prompts. Most of the app has one column of material and should keep it;
// this is for the pages that genuinely have a second thing to show.
//
// The rail is a fixed 320px rather than a fraction so it holds one card
// width no matter how wide the window gets, and the content column is
// `minmax(0,1fr)` so long words and wide tables shrink it instead of
// pushing the rail off screen.
const GRID_BASE = 'grid grid-cols-1 gap-8';
const GRID_WITH_ASIDE = 'lg:grid-cols-[minmax(0,1fr)_320px]';

// Sticky so the rail stays put while the main column scrolls. `self-start`
// is what makes that work — a grid item stretches to the row height by
// default, and a full-height box has nothing to stick to.
const ASIDE_BASE = 'min-w-0 lg:sticky lg:top-4 lg:self-start';

export function PageGrid({
  aside,
  asideLabel,
  asideClassName = '',
  children,
  className = '',
  ...props
}: PageGridProps) {
  const hasAside = aside !== undefined && aside !== null && aside !== false;

  return (
    <div
      className={`${GRID_BASE} ${hasAside ? GRID_WITH_ASIDE : ''} ${className}`.trim()}
      {...props}
    >
      <div className="min-w-0">{children}</div>
      {hasAside && (
        <aside className={`${ASIDE_BASE} ${asideClassName}`.trim()} aria-label={asideLabel}>
          {aside}
        </aside>
      )}
    </div>
  );
}
