import { useEffect, useLayoutEffect, useRef } from 'react';

/*
 * Asking before the shell's ways out of a page.
 *
 * A reveal whose AI interpretation was bought and is not saved asks before
 * its own Back and "Start a new reading" let the reading go
 * (LeaveReadingSheet). A tab on the bottom bar and Android's hardware Back
 * left it without a word: they belong to the shell, which knows nothing of
 * the reading. The app runs on <BrowserRouter>, which has no useBlocker, so
 * the reading tells the shell itself: while it is mounted it holds a guard
 * here (useLeaveGuard), and the shell hands every step that would leave the
 * page to leaveOrAsk instead of taking it (BottomNav, androidBack in App).
 *
 * The browser's own Back button is not held: BrowserRouter cannot stop a
 * history pop, so on the web it leaves as it always did.
 */

/**
 * Answers true when it holds the step: it asks, and calls `leave` once the
 * member chooses to go (never, if they stay). False lets the step go at once.
 */
export type LeaveGuard = (leave: () => void) => boolean;

const guards = new Set<LeaveGuard>();

/** Take the step now, unless a page on screen holds it to ask first. */
export function leaveOrAsk(leave: () => void): void {
  for (const guard of guards) {
    if (guard(leave)) return;
  }
  leave();
}

/** Hold the shell's ways out with `guard` while the calling component is mounted. */
export function useLeaveGuard(guard: LeaveGuard): void {
  const latest = useRef(guard);
  // A layout effect: a tap the moment a render lands meets that render's
  // guard, never the one before it.
  useLayoutEffect(() => {
    latest.current = guard;
  });
  useEffect(() => {
    const held: LeaveGuard = (leave) => latest.current(leave);
    guards.add(held);
    return () => {
      guards.delete(held);
    };
  }, []);
}
