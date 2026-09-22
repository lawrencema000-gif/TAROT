import { useEffect, useRef, useState, type ComponentType, type KeyboardEvent, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';

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
  /** Accessible name when the visible label is hidden at some width (icon-only tabs). */
  'aria-label'?: string;
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
  /**
   * The page renders its content in `TabPanel`s, so the current tab may
   * point at its panel with `aria-controls`. Off by default: most pages
   * switch content with a plain conditional, and a reference to an id that
   * is not in the document is worse than none — assistive tech offers a
   * jump that lands nowhere. Only the current tab ever carries the
   * reference, because `TabPanel` unmounts the others.
   */
  panels?: boolean;
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
  panels = false,
  className = '',
}: TabsProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);
  const s = SIZE[size];

  // A scrolling strip brings the current tab into view — a deep link into
  // the eighth of nine tabs would otherwise land on a strip showing the
  // first four. `nearest` so it does not yank the page vertically. Guarded:
  // jsdom and some old WebViews have no scrollIntoView.
  useEffect(() => {
    if (fill || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [value, fill]);

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

  const list = (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={`flex border-b border-mystic-700 ${fill ? className : 'w-max min-w-full'}`.trim()}
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
            aria-label={item['aria-label']}
            aria-controls={panels && active ? `${idPrefix}-panel-${item.id}` : undefined}
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

  if (fill) return list;
  return (
    <Scroller className={className} onKeyDown={undefined}>
      {list}
    </Scroller>
  );
}

/**
 * The scrolling strip. The list itself keeps its hairline and underline
 * inside the scroller's clip box — an `overflow-x-auto` on the list would
 * clip the underline's lower pixel, the one that sits on the hairline.
 *
 * A mouse has no natural way to scroll sideways, so on hover-capable
 * devices the wheel is translated to horizontal travel while the pointer
 * is over the strip (page scroll is untouched unless the strip can move),
 * and a chevron appears at whichever edge has more tabs behind it. Touch
 * devices get neither: a finger already knows how to swipe.
 */
function Scroller({ className = '', children }: { className?: string; children: ReactNode; onKeyDown?: undefined }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const max = el.scrollWidth - el.clientWidth;
      setEdges({ left: el.scrollLeft > 2, right: el.scrollLeft < max - 2 });
    };
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    // Native, non-passive: React's onWheel cannot preventDefault, and without
    // it the page scrolls too.
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      const next = Math.max(0, Math.min(max, el.scrollLeft + e.deltaY));
      if (next === el.scrollLeft) return;
      e.preventDefault();
      el.scrollLeft = next;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('scroll', measure);
      el.removeEventListener('wheel', onWheel);
      ro?.disconnect();
    };
  }, []);

  const nudge = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.6), behavior: 'smooth' });
  };

  const CHEVRON =
    'absolute top-0 bottom-px w-9 hidden [@media(hover:hover)]:flex items-center bg-gradient-to-r ' +
    'text-mystic-300 [@media(hover:hover)]:[&:hover]:text-mystic-100';

  return (
    <div className={`relative ${className}`.trim()}>
      <div ref={ref} className="overflow-x-auto scrollbar-hide">
        {children}
      </div>
      {edges.left && (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          onClick={() => nudge(-1)}
          className={`${CHEVRON} left-0 justify-start from-mystic-950 to-transparent`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}
      {edges.right && (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          onClick={() => nudge(1)}
          className={`${CHEVRON} right-0 justify-end from-transparent to-mystic-950`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
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
