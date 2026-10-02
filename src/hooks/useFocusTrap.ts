import { useEffect, useRef, useSyncExternalStore, type RefObject } from 'react';

/*
 * Keep keyboard focus inside a dialog while it is open.
 *
 * Every modal surface in the app — the Sheet, the trial reminder — put a
 * scrim over the page and took the pointer away from it, and then left the
 * keyboard free to Tab straight through the scrim into the controls behind.
 * A screen-reader user opening Settings could land on the bottom nav and
 * never know a sheet was open. This hook closes that gap:
 *
 *   - Tab and Shift+Tab cycle through the focusable descendants of `ref`,
 *     wrapping at either end. An element the browser will not focus (one
 *     inside display:none) is skipped by trying the next, so the trap
 *     never needs layout to know what is visible.
 *   - On activation, focus moves into the panel: to `initialFocus` when
 *     given, else to the first focusable descendant, else to the container
 *     itself (give it tabIndex -1 for that fallback to take).
 *   - On deactivation, focus returns to whatever had it when the trap was
 *     armed, as long as the user has not meanwhile put it somewhere else on
 *     the page.
 *
 * Traps stack. A paywall opened over Settings arms a second trap; only the
 * one on top answers the keyboard, and when it disarms the one beneath is
 * on duty again — with its original opener intact, because its own `active`
 * never flipped. `isTop` is exposed so the same ordering can decide who
 * answers Escape: the dialog the user sees, not every dialog that is open.
 *
 * What it does not do: mark the rest of the page `inert`. The trial
 * reminder is rendered beside the route tree and appears on a timer over
 * whatever is open, so a Sheet that made its ancestors' siblings inert
 * would make that reminder undismissable. The trap alone is the safe half.
 */

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

/** Traps on duty, bottom to top. Only the last one answers the keyboard. */
const stack: symbol[] = [];
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const notify = () => listeners.forEach((listener) => listener());
const topIs = (id: symbol) => stack.length > 0 && stack[stack.length - 1] === id;

function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.tabIndex >= 0 && !el.closest('[aria-hidden="true"]') && !el.closest('[hidden]'),
  );
}

/** Focus `el` and say whether it took: an element the browser cannot show does not. */
function tryFocus(el: HTMLElement | null | undefined): boolean {
  if (!el || !el.isConnected) return false;
  el.focus({ preventScroll: true });
  return document.activeElement === el;
}

export interface FocusTrapOptions {
  /**
   * Where focus lands when the trap arms. Default: the first focusable
   * descendant, else the container itself.
   */
  initialFocus?: RefObject<HTMLElement>;
}

export function useFocusTrap(
  ref: RefObject<HTMLElement>,
  active: boolean,
  options: FocusTrapOptions = {},
): { isTop: boolean } {
  const id = useRef<symbol | null>(null);
  if (id.current === null) id.current = Symbol('focus-trap');
  const { initialFocus } = options;

  const isTop = useSyncExternalStore(
    subscribe,
    () => active && topIs(id.current as symbol),
    () => false,
  );

  useEffect(() => {
    if (!active) return;
    const me = id.current as symbol;
    const root = ref.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    stack.push(me);
    notify();

    // Move focus in — unless it is already inside, which means this is a
    // re-arm after a dialog above closed and handed focus back.
    if (root && !root.contains(document.activeElement)) {
      if (!tryFocus(initialFocus?.current) && !focusables(root).some(tryFocus)) tryFocus(root);
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !topIs(me)) return;
      const panel = ref.current;
      if (!panel) return;
      e.preventDefault();

      const list = focusables(panel);
      const n = list.length;
      if (n === 0) {
        tryFocus(panel);
        return;
      }
      const current = document.activeElement;
      // -1: focus is outside the panel, or on the panel itself. Tab then
      // enters at the first control, Shift+Tab at the last.
      const at = current instanceof HTMLElement ? list.indexOf(current) : -1;
      const step = e.shiftKey ? -1 : 1;
      const start = at === -1 ? (e.shiftKey ? n - 1 : 0) : at + step;
      for (let k = 0; k < n; k++) {
        const idx = (((start + k * step) % n) + n) % n;
        if (tryFocus(list[idx])) return;
      }
      tryFocus(panel);
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const i = stack.lastIndexOf(me);
      if (i >= 0) stack.splice(i, 1);
      notify();

      // Hand focus back only if it is still ours (in the panel) or nowhere
      // (the panel was unmounted and the browser dropped it on <body>).
      const current = document.activeElement;
      const ours = !current || current === document.body || (root !== null && root.contains(current));
      if (ours && opener && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, [active, ref, initialFocus]);

  return { isTop };
}
