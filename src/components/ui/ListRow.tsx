import type { AnchorHTMLAttributes, ButtonHTMLAttributes, HTMLAttributes, MouseEvent, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

/**
 * ListRow: one line of a list — an icon in a tile, a label, a second line
 * if it needs one, and something on the right.
 *
 * The Profile page and the Settings sheet had eight different row
 * treatments between them: three paddings, two icon sizes, four trailing
 * affordances (a 20px chevron, a 16px chevron, a check mark, nothing) and
 * two label tiers, for rows that all do the same thing — take you
 * somewhere or show you a value. The eye reads that as eight kinds of
 * thing. There is one kind of thing.
 *
 * The element follows the job: `href` renders an anchor, `onClick` a
 * button, neither a plain div (a static row like "Premium member").
 * Hover is web-only and yields to press, as everywhere else in the
 * primitives (see Button.tsx for why).
 */

export type ListRowTone = 'neutral' | 'gold' | 'violet' | 'blue' | 'rose' | 'teal' | 'coral';

const TILE: Record<ListRowTone, string> = {
  neutral: 'bg-mystic-800 text-mystic-300',
  gold: 'bg-gold/10 text-gold',
  violet: 'bg-cosmic-violet/15 text-cosmic-violet-ink',
  blue: 'bg-cosmic-blue/15 text-cosmic-blue-ink',
  rose: 'bg-cosmic-rose/15 text-cosmic-rose',
  teal: 'bg-teal/15 text-teal',
  coral: 'bg-coral/15 text-coral',
};

const SIZE = {
  md: { row: 'px-4 py-3 gap-3', tile: 'w-10 h-10 rounded-control [&>svg]:w-5 [&>svg]:h-5' },
  lg: { row: 'px-4 py-4 gap-4', tile: 'w-12 h-12 rounded-control [&>svg]:w-6 [&>svg]:h-6' },
};

export interface ListRowProps extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'onClick'> {
  /** Leading icon or glyph, rendered in a tinted tile. */
  icon?: ReactNode;
  tone?: ListRowTone;
  label: ReactNode;
  /** Second line under the label. Two lines at most. */
  meta?: ReactNode;
  /** Trailing text: the current setting, a count. */
  value?: ReactNode;
  /**
   * What sits at the right edge. Default: a chevron when the row acts
   * (`href` or `onClick`), nothing otherwise. Pass a node for a Switch, a
   * check mark, a badge.
   */
  trailing?: 'chevron' | 'none' | ReactNode;
  /** Sign out, delete account. Label and icon in coral; no chevron. */
  danger?: boolean;
  size?: 'md' | 'lg';
  href?: string;
  onClick?: (e: MouseEvent<HTMLElement>) => void;
  disabled?: boolean;
}

const INTERACTIVE =
  'cursor-pointer select-none touch-manipulation [-webkit-tap-highlight-color:transparent] ' +
  'transition-[background-color,transform] duration-fast ease-[cubic-bezier(0.22,0.8,0.25,1)] ' +
  '[@media(hover:hover)]:[&:hover:not(:active)]:bg-mystic-800/40 motion-safe:active:scale-[0.99] ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold/50 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';

export function ListRow({
  icon,
  tone = 'neutral',
  label,
  meta,
  value,
  trailing,
  danger = false,
  size = 'md',
  href,
  onClick,
  disabled,
  className = '',
  ...rest
}: ListRowProps) {
  const acts = Boolean(href || onClick);
  const s = SIZE[size];
  const showChevron = trailing === 'chevron' || (trailing === undefined && acts && !danger);
  const trailingNode = trailing === 'chevron' || trailing === 'none' ? null : trailing;

  const base = `w-full flex items-center text-left ${s.row} ${acts ? INTERACTIVE : ''} ${className}`.trim();

  const content = (
    <>
      {icon && (
        <span
          className={`shrink-0 inline-flex items-center justify-center ${s.tile} ${danger ? 'bg-coral/15 text-coral' : TILE[tone]}`}
          aria-hidden
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-ui font-medium ${danger ? 'text-coral' : 'text-mystic-100'}`}>{label}</span>
        {meta && <span className="block text-meta text-mystic-400 line-clamp-2">{meta}</span>}
      </span>
      {value !== undefined && value !== null && (
        <span className="shrink-0 text-meta text-mystic-400">{value}</span>
      )}
      {trailingNode}
      {showChevron && <ChevronRight className="w-5 h-5 shrink-0 text-mystic-500" aria-hidden />}
    </>
  );

  if (href) {
    return (
      <a href={href} className={base} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {content}
      </a>
    );
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={base}
        {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {content}
      </button>
    );
  }
  return (
    <div className={base} {...(rest as HTMLAttributes<HTMLDivElement>)}>
      {content}
    </div>
  );
}

/**
 * A stack of rows on one surface, hairlines between them. The surface is a
 * default Card; `overflow-hidden` so a row's hover fill clips to the
 * corners instead of poking out of them.
 */
export function ListRowGroup({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`overflow-hidden rounded-card border border-mystic-700 bg-mystic-850 divide-y divide-mystic-700 ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}
