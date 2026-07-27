import { useState, useEffect, useCallback, useRef } from 'react';
import { AchievementUnlockModal } from './AchievementUnlockModal';
import {
  getUnnotifiedAchievements,
  markAchievementNotified,
  ACHIEVEMENT_UNLOCKED_EVENT,
  type AchievementWithProgress,
} from '../../services/achievements';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';

/**
 * App-shell achievement celebration drainer.
 *
 * 48 achievements fire from ~15 surfaces (readings, quizzes, journal,
 * streaks…), but the unlock modal previously lived only inside
 * AchievementsPage — buried in the More menu — so mid-session unlocks
 * played to an empty room. This component mounts once in AppContent and:
 *
 *   1. drains the unnotified queue on sign-in (celebrates anything earned
 *      since the last visit), and
 *   2. listens for the ACHIEVEMENT_UNLOCKED_EVENT the service dispatches
 *      the moment any unlock lands, so the celebration is immediate on
 *      whatever screen the user is on.
 *
 * It stands down while the Achievements tab is active — that page keeps
 * its own richer drain (confetti + list refresh) and must not double-fire.
 */
export function GlobalAchievementCelebration() {
  const { user } = useAuth();
  const { activeTab } = useUI();
  const [current, setCurrent] = useState<AchievementWithProgress | null>(null);
  const queueRef = useRef<AchievementWithProgress[]>([]);
  const drainingRef = useRef(false);

  const onAchievementsPage = activeTab === 'achievements';

  const showNext = useCallback(() => {
    const next = queueRef.current.shift() ?? null;
    setCurrent(next);
    if (next && user?.id) markAchievementNotified(user.id, next.id);
  }, [user?.id]);

  const drain = useCallback(async () => {
    if (!user?.id || drainingRef.current || onAchievementsPage) return;
    drainingRef.current = true;
    try {
      const unnotified = await getUnnotifiedAchievements(user.id);
      if (unnotified.length) {
        queueRef.current.push(...unnotified.filter(
          (a) => !queueRef.current.some((q) => q.id === a.id) && current?.id !== a.id,
        ));
        if (!current) showNext();
      }
    } finally {
      drainingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, onAchievementsPage, current, showNext]);

  // Drain on sign-in (celebrate anything earned since last visit).
  useEffect(() => {
    if (user?.id) drain();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Instant celebration when the service announces a fresh unlock. Small
  // delay lets the DB row land before we query the unnotified list.
  useEffect(() => {
    const handler = () => { setTimeout(() => { drain(); }, 600); };
    window.addEventListener(ACHIEVEMENT_UNLOCKED_EVENT, handler);
    return () => window.removeEventListener(ACHIEVEMENT_UNLOCKED_EVENT, handler);
  }, [drain]);

  if (onAchievementsPage) return null;

  return (
    <AchievementUnlockModal
      achievement={current}
      onClose={showNext}
    />
  );
}
