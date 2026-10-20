import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { loadLessonsDone, setLessonDone } from './cartoFlow';

/**
 * The playing-card lessons the signed-in account has ticked, and a setter.
 *
 * Read for the account, not the device (cartoFlow.loadLessonsDone), and read
 * again when the account changes: the session resolves after the first
 * render, and another reader can sign in on the same phone while the hub,
 * the guide or a lesson is open. The hub, the guide and a lesson page share
 * this so each says the same "n of 12".
 */
export function useLessonsDone(): { done: Set<string>; setDone: (slug: string, done: boolean) => void } {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [state, setState] = useState(() => ({ userId, done: loadLessonsDone(userId) }));

  useEffect(() => {
    setState((prev) => (prev.userId === userId ? prev : { userId, done: loadLessonsDone(userId) }));
  }, [userId]);

  const setDone = useCallback(
    (slug: string, done: boolean) => setState({ userId, done: setLessonDone(slug, done, userId) }),
    [userId],
  );

  // Until the effect lands, never show one account's ticks under another.
  return { done: state.userId === userId ? state.done : loadLessonsDone(userId), setDone };
}
