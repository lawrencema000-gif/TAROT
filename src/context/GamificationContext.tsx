import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { appStorage } from '../lib/appStorage';

export interface LevelUpEvent {
  newLevel: number;
  seekerRank: string;
  xpEarned: number;
}

interface GamificationContextType {
  levelUpEvent: LevelUpEvent | null;
  triggerLevelUp: (event: LevelUpEvent) => void;
  dismissLevelUp: () => void;
  showRatePrompt: boolean;
  openRatePrompt: () => void;
  closeRatePrompt: () => void;
}

const GamificationContext = createContext<GamificationContextType | null>(null);

/** The last level this device has seen (and so celebrated) for a member. */
const levelSeenKey = (userId: string) => `arcana_level_seen:${userId}`;

interface SeenState {
  userId: string;
  /** The last level seen; null until the stored value has been read. */
  level: number | null;
  /** Explicit celebrations that arrived before the stored value was read. */
  pending: number;
  /** The profile's XP when its level was last looked at, for the XP delta. */
  xp: number | null;
}

async function readSeen(userId: string): Promise<number | null> {
  try {
    const raw = await appStorage.get(levelSeenKey(userId));
    const n = raw == null ? NaN : Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function writeSeen(userId: string, level: number) {
  try {
    void Promise.resolve(appStorage.set(levelSeenKey(userId), String(level))).catch(() => {});
  } catch {
    // Storage is best effort: the in-memory value still dedupes this session.
  }
}

export function GamificationProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const [levelUpEvent, setLevelUpEvent] = useState<LevelUpEvent | null>(null);
  const [showRatePrompt, setShowRatePrompt] = useState(false);

  // Level watcher (WP-P1-24): a level is celebrated once per member, whether
  // the page that awarded the XP calls triggerLevelUp or the refreshed
  // profile shows it (a tarot reading, cards, Community, streak or badge XP).
  // The first level a device sees for a member is stored without a
  // celebration, so no old level replays.
  const seenRef = useRef<SeenState | null>(null);
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const userId = user?.id ?? null;
  const profileLevel = profile?.level;

  /** Compare the latest profile with the seen level; celebrate a crossing. */
  const reconcile = useCallback((state: SeenState) => {
    const p = profileRef.current;
    if (!p || state.level == null || !p.level) return;
    const xp = typeof p.xp === 'number' ? p.xp : null;
    if (p.level > state.level) {
      const xpEarned = xp != null && state.xp != null && xp > state.xp ? xp - state.xp : 0;
      state.level = p.level;
      writeSeen(state.userId, p.level);
      setLevelUpEvent({ newLevel: p.level, seekerRank: p.seekerRank || 'Novice Seeker', xpEarned });
    }
    state.xp = xp;
  }, []);

  useEffect(() => {
    if (!userId || !profileLevel) return;
    let state = seenRef.current;
    if (!state || state.userId !== userId) {
      state = { userId, level: null, pending: 0, xp: null };
      seenRef.current = state;
      const loading = state;
      void readSeen(userId).then((stored) => {
        if (seenRef.current !== loading) return;
        const p = profileRef.current;
        if (stored == null) {
          // First sight on this device: seed with today's level, celebrate nothing.
          const seed = Math.max(p?.level ?? 0, loading.pending);
          loading.level = seed > 0 ? seed : null;
          loading.xp = typeof p?.xp === 'number' ? p.xp : null;
          if (loading.level != null) writeSeen(userId, loading.level);
          return;
        }
        loading.level = Math.max(stored, loading.pending);
        if (loading.level > stored) writeSeen(userId, loading.level);
        reconcile(loading);
      });
      return;
    }
    reconcile(state);
  }, [userId, profileLevel, reconcile]);

  const triggerLevelUp = useCallback((event: LevelUpEvent) => {
    const state = seenRef.current;
    if (!state || !userId || state.userId !== userId) {
      // No member to dedupe by: show it as asked.
      setLevelUpEvent(event);
      return;
    }
    if (state.level == null) {
      // The stored level is still being read; remember this one so the
      // watcher does not celebrate it again.
      if (event.newLevel <= state.pending) return;
      state.pending = event.newLevel;
      setLevelUpEvent(event);
      return;
    }
    if (event.newLevel <= state.level) return;
    state.level = event.newLevel;
    writeSeen(state.userId, event.newLevel);
    setLevelUpEvent(event);
  }, [userId]);

  const dismissLevelUp = useCallback(() => {
    setLevelUpEvent(null);
  }, []);

  const openRatePrompt = useCallback(() => {
    setShowRatePrompt(true);
  }, []);

  const closeRatePrompt = useCallback(() => {
    setShowRatePrompt(false);
  }, []);

  const value = useMemo(() => ({
    levelUpEvent, triggerLevelUp, dismissLevelUp,
    showRatePrompt, openRatePrompt, closeRatePrompt,
  }), [levelUpEvent, triggerLevelUp, dismissLevelUp, showRatePrompt, openRatePrompt, closeRatePrompt]);

  return (
    <GamificationContext.Provider value={value}>
      {children}
    </GamificationContext.Provider>
  );
}

export function useGamification() {
  const context = useContext(GamificationContext);
  if (!context) {
    throw new Error('useGamification must be used within GamificationProvider');
  }
  return context;
}
