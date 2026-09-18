import { useRef, type ComponentType, type KeyboardEvent, type ReactNode } from 'react';
import { Lock } from 'lucide-react';

/**
 * Tabs: one row of choices, one of them current, an underline saying which.
 *
 * Every tab strip in the product was hand-rolled, and every one of them was
 * a row of pills — the active tab got a gold-tinted, gold-bordered lozenge
 * and the rest were bare text. A pill is a chip's shape: it says "filter",
 * "tag", "toggle me on". A tab is a section of the page, and the shape that
 * says "you are here, the rest is over there" is an underline on a hairline.
 * Underline tabs also do not compete with the Chip primitive, which IS a
 * pill, so the two controls stop looking like one control with two moods.
 *
 * Keyboard: roving tabindex, arrows move focus, Home/End jump, and selection
 * is manual (Enter/Space, or a click) — automatic activation would fire a
 * page's "this tab is premium" paywall just by arrowing past it.
 *
 * No sliding indicator. It needs layout measurement on every change and a
 * transform animation on a bar that most people never watch; a bar that is
 * simply under the current tab is honest and costs nothing.
 */

export interface TabItem<T extends string = string> {
  id: T;
  label: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  /**
   * Rendered with a lock in place of its icon and in a quieter ink. Still
   * selectable: the page decides what a locked tab does (usually a paywall).
   */
  locked?: boolean;
  disabled?: boolean;
  /** Trailing count or dot, rendered after the label. */
  badge?: ReactNode;
}

export interface TabsProps<T extends string = string> {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Accessible name for the list. Required: an unnamed tab list is announced as nothing. */
  'aria-label': string;
  /**
   * Each tab takes an equal share of the row (default). Off, tabs size to
   * their labels and the row scrolls horizontally — for six or more tabs.
   */
  fill?: boolean;
  size?: 'sm' | 'md';
  /** Prefix for tab and panel ids so `TabPanel` can point back at its tab. */
  idPrefix?: string;
  className?: string;
}

const SIZE = {
  sm: { tab: 'text-meta py-2 px-2.5 gap-1.5', icon: 'w-3.5 h-3.5' },
  md: { tab: 'text-ui py-3 px-3 gap-2', icon: 'w-4 h-4' },
};

const TAB_BASE =
  'relative inline-flex items-center justify-center font-medium whitespace-nowrap ' +
  'select-none touch-manipulation [-webkit-tap-highlight-color:transparent] ' +
  'transition-[color] duration-fast ease-[cubic-bezier(0.22,0.8,0.25,1)] ' +
  // Inset so the ring is not clipped by the list's overflow or its border.
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold/50 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

// The underline sits on the list's hairline (-bottom-px) so the two read as
// one line with a gold segment, not a bar floating above a rule.
const TAB_ACTIVE =
  'text-mystic-100 after:content-[""] after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-gold';
const TAB_INACTIVE =
  'text-mystic-400 [@media(hover:hover)]:[&:hover:not(:disabled)]:text-mystic-200';
const TAB_LOCKED = 'text-mystic-500 [@media(hover:hover)]:[&:hover:not(:disabled)]:text-mystic-300';

export function Tabs<T extends string = string>({
  items,
  value,
  onChange,
  'aria-label': ariaLabel,
  fill = true,
  size = 'md',
  idPrefix = 'tabs',
  className = '',
}: TabsProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);
  const s = SIZE[size];

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];
    if (!keys.includes(e.key) || !listRef.current) return;
    const tabs = Array.from(
      listRef.current.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)'),
    );
    if (tabs.length === 0) return;
    const i = tabs.indexOf(document.activeElement as HTMLButtonElement);
    let next = i;
    if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else next = tabs.length - 1;
    e.preventDefault();
    tabs[next].focus();
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={`flex border-b border-mystic-700 ${fill ? '' : 'overflow-x-auto scrollbar-hide'} ${className}`.trim()}
    >
      {items.map((item) => {
        const active = item.id === value;
        const Icon = item.locked ? Lock : item.icon;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${item.id}`}
            aria-selected={active}
            aria-controls={`${idPrefix}-panel-${item.id}`}
            tabIndex={active ? 0 : -1}
            disabled={item.disabled}
            onClick={() => onChange(item.id)}
            className={`${TAB_BASE} ${s.tab} ${fill ? 'flex-1' : ''} ${
              active ? TAB_ACTIVE : item.locked ? TAB_LOCKED : TAB_INACTIVE
            }`}
          >
            {Icon && <Icon className={`${s.icon} shrink-0`} aria-hidden />}
            <span className="truncate">{item.label}</span>
            {item.badge}
          </button>
        );
      })}
    </div>
  );
}

export interface TabPanelProps<T extends string = string> {
  id: T;
  /** The `value` of the owning `Tabs`. */
  value: T;
  idPrefix?: string;
  className?: string;
  children: ReactNode;
}

/**
 * The content for one tab. Renders nothing when it is not the current tab,
 * which is what every page did by hand with `{tab === 'x' && …}` — the
 * inactive content is unmounted, not hidden, so it costs nothing and its
 * effects do not run.
 */
export function TabPanel<T extends string = string>({
  id,
  value,
  idPrefix = 'tabs',
  className = '',
  children,
}: TabPanelProps<T>) {
  if (id !== value) return null;
  return (
    <div
      role="tabpanel"
      id={`${idPrefix}-panel-${id}`}
      aria-labelledby={`${idPrefix}-tab-${id}`}
      className={className || undefined}
    >
      {children}
    </div>
  );
}
