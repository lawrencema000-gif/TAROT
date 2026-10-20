import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes, Link } from 'react-router-dom';
import { createElement, forwardRef, type ReactNode } from 'react';

/*
 * p10 d1-en-04: the ritual's celebration ("Ritual complete" — the streak's
 * nights) appeared only when the card was the last part done. "Write" and
 * "Read" take the member off Home as they are tapped, and the completion
 * that followed set the celebration on a Home that was gone. It is owed now
 * and shown by the Home on screen: at once when Home completed the ritual,
 * else on the next Home that day — and once.
 */

const USER = { id: '00000000-0000-4000-8000-0000000000d6', email: 'qa@example.com' };
const PROFILE = { displayName: 'qa', birthDate: '1991-03-08', streak: 0, level: 1, seekerRank: 'Novice Seeker', isPremium: false };

type Row = { horoscopeViewed: boolean; tarotViewed: boolean; promptViewed: boolean; completed: boolean };
let serverRow: Row | null = null;
/** Held open by a test to keep the completion in flight; resolved by it. */
let profileReread: Promise<void> | null = null;
const refreshProfile = vi.fn(() => profileReread ?? Promise.resolve());
const upsert = vi.fn(async (row: Row) => {
  serverRow = { horoscopeViewed: row.horoscopeViewed, tarotViewed: row.tarotViewed, promptViewed: row.promptViewed, completed: row.completed };
  return { ok: true, data: undefined };
});

vi.mock('../../lib/supabase', () => ({ supabase: {} }));
vi.mock('../../utils/telemetry', () => ({ captureException: () => {} }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: USER, profile: PROFILE, refreshProfile }) }));
vi.mock('../../context/UIContext', () => ({ useUI: () => ({ setActiveTab: () => {}, openOverlay: () => {} }) }));
vi.mock('../../context/RitualContext', () => ({ useRitual: () => ({ streak: 1, setStreak: () => {}, tarotRefreshTrigger: 0 }) }));
vi.mock('../../context/GamificationContext', () => ({ useGamification: () => ({ triggerLevelUp: () => {} }) }));
vi.mock('../../context/FeatureFlagContext', () => ({ useFeatureFlag: () => false }));
vi.mock('../../dal', () => ({
  dailyRituals: {
    getByDate: async () => ({ ok: true, data: serverRow }),
    countForUser: async () => ({ ok: true, data: 1 }),
    listRange: async () => ({ ok: true, data: [] }),
    upsert: (row: Row) => upsert(row),
    syncStreak: async () => ({ ok: true, data: { streak: 1, previousStreak: 0, lastCompleted: null } }),
  },
  savedHighlights: { listForUserDate: async () => ({ ok: true, data: [] }) },
}));
vi.mock('../../services/levelSystem', () => ({
  awardXP: async () => ({ xp_earned: 50, level_up: false, new_level: 1, seeker_rank: 'Novice Seeker', total_xp: 50 }),
  checkAndAwardStreakMilestone: async () => null,
  STREAK_MILESTONES: [3, 7],
}));
vi.mock('../../services/achievements', () => ({ checkAchievementProgress: async () => [] }));
vi.mock('../../services/offline', () => ({
  cacheDailyRitual: async () => {},
  getCachedDailyRitual: async () => null,
  cacheLastViewedCard: async () => {},
}));
vi.mock('../../services/tarotCards', () => ({
  getAllTarotCards: async () => [
    { id: 17, name: 'The Star', arcana: 'major', keywords: ['hope'], meaningUpright: 'Hope returns.', meaningReversed: 'Hope delayed.', imageUrl: '' },
  ],
}));
vi.mock('../../hooks/useImagePreloader', () => ({ useImagePreloader: () => {} }));
vi.mock('../../hooks/useProgressiveImage', () => ({ useProgressiveImage: () => ({ src: '' }) }));
vi.mock('../../utils/haptics', () => ({ flipHaptics: () => () => {} }));
vi.mock('../../components/ritual/HoroscopeCard', () => ({
  HoroscopeCard: ({ onRead }: { onRead: () => void }) => <button type="button" onClick={onRead}>Read the horoscope</button>,
}));
vi.mock('../../components/ritual/DailyMissionCard', () => ({ DailyMissionCard: () => null }));
vi.mock('../../components/ritual/DailyCosmicScore', () => ({ DailyCosmicScore: () => null }));
vi.mock('../../components/ritual/DailyMansionCard', () => ({ DailyMansionCard: () => null }));
vi.mock('../../components/home/MoonstoneWidget', () => ({ MoonstoneWidget: () => null }));
vi.mock('../../components/home/MoonPhaseCard', () => ({ MoonPhaseCard: () => null }));
vi.mock('../../components/home/DailyWisdomCard', () => ({ DailyWisdomCard: () => null }));
// The celebration as a dialog named by why it opened.
vi.mock('../../components/celebration/StreakCelebration', () => ({
  StreakCelebration: ({ open, onClose, justCompleted }: { open: boolean; onClose: () => void; justCompleted?: boolean }) =>
    open ? (
      <div role="dialog" aria-label={justCompleted ? 'Ritual complete' : 'Your streak'}>
        <button type="button" onClick={onClose}>Close the celebration</button>
      </div>
    ) : null,
}));
vi.mock('../../components/celebration/StreakConstellation', () => ({ StreakConstellation: () => null }));
vi.mock('../../components/readings/TarotCardDetail', () => ({ TarotCardDetail: () => null }));
vi.mock('../../components/readings/tarot/pendingSpread', () => ({ takePendingSpread: () => null }));
vi.mock('framer-motion', () => {
  const strip = ({ initial, animate, exit, transition, whileTap, whileHover, layout, variants, ...rest }: Record<string, unknown>) => {
    void initial; void animate; void exit; void transition; void whileTap; void whileHover; void layout; void variants;
    return rest;
  };
  const motion = new Proxy({}, {
    get: (_t, tag: string) => forwardRef<HTMLElement, Record<string, unknown> & { children?: ReactNode }>(function M(props, ref) {
      return createElement(tag, { ...strip(props), ref }, props.children as ReactNode);
    }),
  });
  return { motion, AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>, useReducedMotion: () => true };
});

import i18n from '../../i18n/config';
import { HomePage } from '../HomePage';
import '@testing-library/jest-dom/vitest';

/** A page Write or Read opens, with the way back to Home. */
function Away({ name }: { name: string }) {
  return (
    <div>
      <p>{name}</p>
      <Link to="/">Back to Home</Link>
    </div>
  );
}

function mount() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/journal" element={<Away name="journal" />} />
        <Route path="/readings" element={<Away name="readings" />} />
      </Routes>
    </MemoryRouter>,
  );
}

const celebration = () => screen.queryByRole('dialog', { name: 'Ritual complete' });

/** Off Home and back again (Write's page, then Home). */
async function leaveAndReturn() {
  fireEvent.click(await screen.findByRole('button', { name: /^Write$/ }));
  fireEvent.click(await screen.findByRole('link', { name: 'Back to Home' }));
  await screen.findByRole('button', { name: /^Write$/ });
}

beforeAll(async () => {
  await i18n.changeLanguage('en');
});
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  refreshProfile.mockClear();
  upsert.mockClear();
  profileReread = null;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('the ritual’s celebration, however the ritual is finished (p10 d1-en-04)', () => {
  it('Write as the last part: celebrated on the next Home, once', async () => {
    vi.setSystemTime(new Date(2026, 9, 20, 21, 0));
    serverRow = { horoscopeViewed: true, tarotViewed: true, promptViewed: false, completed: false };
    mount();
    fireEvent.click(await screen.findByRole('button', { name: /^Write$/ }));
    expect(await screen.findByText('journal')).toBeInTheDocument();
    // The completion runs out on the journal's page.
    await waitFor(() => expect(refreshProfile).toHaveBeenCalledTimes(1));
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ promptViewed: true, completed: true }));

    fireEvent.click(screen.getByRole('link', { name: 'Back to Home' }));
    expect(await screen.findByRole('dialog', { name: 'Ritual complete' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close the celebration' }));
    expect(celebration()).toBeNull();
    await leaveAndReturn();
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    expect(celebration()).toBeNull();
  });

  it('Read as the last part: the same', async () => {
    vi.setSystemTime(new Date(2026, 9, 21, 21, 0));
    serverRow = { horoscopeViewed: false, tarotViewed: true, promptViewed: true, completed: false };
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Read the horoscope' }));
    expect(await screen.findByText('readings')).toBeInTheDocument();
    await waitFor(() => expect(refreshProfile).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('link', { name: 'Back to Home' }));
    expect(await screen.findByRole('dialog', { name: 'Ritual complete' })).toBeInTheDocument();
  });

  it('back on Home before the completion has finished: celebrated when it finishes', async () => {
    vi.setSystemTime(new Date(2026, 9, 22, 21, 0));
    serverRow = { horoscopeViewed: true, tarotViewed: true, promptViewed: false, completed: false };
    let finish = () => {};
    profileReread = new Promise<void>((resolve) => { finish = resolve; });
    mount();
    fireEvent.click(await screen.findByRole('button', { name: /^Write$/ }));
    fireEvent.click(await screen.findByRole('link', { name: 'Back to Home' }));
    await screen.findByRole('button', { name: /^Write$/ });
    await waitFor(() => expect(refreshProfile).toHaveBeenCalledTimes(1));
    expect(celebration()).toBeNull();

    await act(async () => { finish(); });
    expect(await screen.findByRole('dialog', { name: 'Ritual complete' })).toBeInTheDocument();
  });

  it('the card as the last part: celebrated on this Home at once, and not again', async () => {
    vi.setSystemTime(new Date(2026, 9, 23, 21, 0));
    serverRow = { horoscopeViewed: true, tarotViewed: false, promptViewed: true, completed: false };
    mount();
    fireEvent.click(await screen.findByRole('button', { name: /face down/ }));
    expect(await screen.findByRole('dialog', { name: 'Ritual complete' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close the celebration' }));
    await leaveAndReturn();
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    expect(celebration()).toBeNull();
  });

  it('a completion owed on another day is not celebrated today', async () => {
    vi.setSystemTime(new Date(2026, 9, 24, 23, 59));
    serverRow = { horoscopeViewed: true, tarotViewed: true, promptViewed: false, completed: false };
    mount();
    fireEvent.click(await screen.findByRole('button', { name: /^Write$/ }));
    await waitFor(() => expect(refreshProfile).toHaveBeenCalledTimes(1));
    // Past midnight before Home is back: tomorrow's Home has nothing to celebrate.
    vi.setSystemTime(new Date(2026, 9, 25, 0, 5));
    serverRow = null;
    fireEvent.click(screen.getByRole('link', { name: 'Back to Home' }));
    await screen.findByRole('button', { name: 'Start today’s ritual' });
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    expect(celebration()).toBeNull();
  });
});
