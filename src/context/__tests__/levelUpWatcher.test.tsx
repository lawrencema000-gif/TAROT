import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import { useEffect } from 'react';

/*
 * WP-P1-24 (gap-1-09): every level crossing is celebrated once, wherever the
 * XP came from. The provider watches the refreshed profile's level; the
 * explicit triggerLevelUp calls (Home, Journal, Quizzes) and the watcher share
 * one "last level seen" per member, so a crossing is never celebrated twice
 * and no old level replays on a new device.
 */

type Profile = { level: number; seekerRank: string; xp?: number };
const auth: { user: { id: string } | null; profile: Profile | null } = { user: null, profile: null };

vi.mock('../AuthContext', () => ({ useAuth: () => auth }));

const store = new Map<string, string>();
let storageThrows = false;
vi.mock('../../lib/appStorage', () => ({
  appStorage: {
    get: vi.fn(async (k: string) => {
      if (storageThrows) throw new Error('storage down');
      return store.has(k) ? store.get(k)! : null;
    }),
    set: vi.fn(async (k: string, v: string) => {
      if (storageThrows) throw new Error('storage down');
      store.set(k, v);
    }),
    remove: vi.fn(async (k: string) => { store.delete(k); }),
    keys: vi.fn(async () => [...store.keys()]),
  },
}));

import { GamificationProvider, useGamification, type LevelUpEvent } from '../GamificationContext';

const events: LevelUpEvent[] = [];
let api: ReturnType<typeof useGamification> | null = null;

function Probe() {
  const g = useGamification();
  api = g;
  useEffect(() => {
    if (g.levelUpEvent) events.push(g.levelUpEvent);
  }, [g.levelUpEvent]);
  return null;
}

function tree() {
  return (
    <GamificationProvider>
      <Probe />
    </GamificationProvider>
  );
}

/** Let the provider's async storage reads and writes settle. */
async function settle() {
  for (let i = 0; i < 5; i++) {
    await act(async () => { await Promise.resolve(); });
  }
}

const U1 = '00000000-0000-4000-8000-0000000000a1';
const U2 = '00000000-0000-4000-8000-0000000000a2';

beforeEach(() => {
  store.clear();
  storageThrows = false;
  events.length = 0;
  api = null;
  auth.user = { id: U1 };
  auth.profile = { level: 3, seekerRank: 'Novice Seeker', xp: 900 };
});

afterEach(() => cleanup());

describe('level-up watcher', () => {
  it('seeds the first level it sees without celebrating, then celebrates each crossing once', async () => {
    const { rerender } = render(tree());
    await settle();
    expect(events).toHaveLength(0);
    expect(store.get(`arcana_level_seen:${U1}`)).toBe('3');

    // A tarot reading's XP refreshes the profile to level 4.
    auth.profile = { level: 4, seekerRank: 'Novice Seeker', xp: 1000 };
    rerender(tree());
    await settle();
    expect(events).toHaveLength(1);
    expect(events[0].newLevel).toBe(4);
    expect(events[0].xpEarned).toBe(100);
    expect(store.get(`arcana_level_seen:${U1}`)).toBe('4');

    // The page's own explicit call for the same crossing is ignored.
    await act(async () => {
      api!.triggerLevelUp({ newLevel: 4, seekerRank: 'Novice Seeker', xpEarned: 20 });
    });
    await settle();
    expect(events).toHaveLength(1);

    // A badge-only crossing: the profile goes 4 → 5 with no explicit call.
    auth.profile = { level: 5, seekerRank: 'Novice Seeker', xp: 1300 };
    rerender(tree());
    await settle();
    expect(events).toHaveLength(2);
    expect(events[1].newLevel).toBe(5);
  });

  it('an explicit triggerLevelUp seen first is not repeated by the watcher', async () => {
    const { rerender } = render(tree());
    await settle();
    await act(async () => {
      api!.triggerLevelUp({ newLevel: 4, seekerRank: 'Novice Seeker', xpEarned: 25 });
    });
    await settle();
    expect(events).toHaveLength(1);
    expect(events[0].xpEarned).toBe(25);

    auth.profile = { level: 4, seekerRank: 'Novice Seeker', xp: 1000 };
    rerender(tree());
    await settle();
    expect(events).toHaveLength(1);
    expect(store.get(`arcana_level_seen:${U1}`)).toBe('4');
  });

  it('does not replay a level already seen on this device after a reload', async () => {
    store.set(`arcana_level_seen:${U1}`, '3');
    auth.profile = { level: 3, seekerRank: 'Novice Seeker', xp: 900 };
    render(tree());
    await settle();
    expect(events).toHaveLength(0);
  });

  it('celebrates a crossing that happened while the app was closed on this device', async () => {
    store.set(`arcana_level_seen:${U1}`, '3');
    auth.profile = { level: 4, seekerRank: 'Novice Seeker', xp: 1000 };
    render(tree());
    await settle();
    expect(events).toHaveLength(1);
    expect(events[0].newLevel).toBe(4);
    expect(events[0].xpEarned).toBe(0);
  });

  it('keeps one key per member', async () => {
    const { rerender } = render(tree());
    await settle();
    auth.user = { id: U2 };
    auth.profile = { level: 7, seekerRank: 'Adept', xp: 4000 };
    rerender(tree());
    await settle();
    expect(events).toHaveLength(0);
    expect(store.get(`arcana_level_seen:${U1}`)).toBe('3');
    expect(store.get(`arcana_level_seen:${U2}`)).toBe('7');

    auth.profile = { level: 8, seekerRank: 'Adept', xp: 4600 };
    rerender(tree());
    await settle();
    expect(events).toHaveLength(1);
    expect(events[0].newLevel).toBe(8);
  });

  it('survives a throwing storage without crashing or celebrating', async () => {
    storageThrows = true;
    const { rerender } = render(tree());
    await settle();
    expect(events).toHaveLength(0);
    // Same level re-rendered: still nothing.
    auth.profile = { level: 3, seekerRank: 'Novice Seeker', xp: 950 };
    rerender(tree());
    await settle();
    expect(events).toHaveLength(0);
  });

  it('celebrates nothing for a signed-out visitor', async () => {
    auth.user = null;
    auth.profile = null;
    render(tree());
    await settle();
    await act(async () => {
      api!.triggerLevelUp({ newLevel: 2, seekerRank: 'Novice Seeker', xpEarned: 10 });
    });
    // Without a member the explicit call still shows (no key to dedupe by).
    expect(events).toHaveLength(1);
  });
});
