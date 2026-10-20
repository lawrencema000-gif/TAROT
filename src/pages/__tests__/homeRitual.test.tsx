import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { createElement, forwardRef, type ReactNode } from 'react';

/*
 * The day's ritual on Home, driven through the real page (p8):
 *  - F05: the ritual's badge reports and the profile re-read happen whenever
 *    the ritual completes — also when the XP award comes back capped (null);
 *  - F53/F74: the day's card lies face up once its part is done, and turning
 *    it over is the card part;
 *  - F54/F88: "Write" opens the journal's editor (compose: 'today').
 */

const USER = { id: '00000000-0000-4000-8000-0000000000d1', email: 'qa@example.com' };
const PROFILE = { displayName: 'arcana-qa-p7-handle-1', birthDate: '1991-03-08', streak: 1, level: 1, seekerRank: 'Novice Seeker', isPremium: false };

const refreshProfile = vi.fn(async () => {});
const awardXP = vi.fn();
const checkAchievementProgress = vi.fn(async () => []);
const upsert = vi.fn(async () => ({ ok: true, data: undefined }));
let serverRow: { horoscopeViewed: boolean; tarotViewed: boolean; promptViewed: boolean; completed: boolean } | null = null;

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
    countForUser: async () => ({ ok: true, data: 3 }),
    listRange: async () => ({ ok: true, data: [] }),
    upsert: (...a: unknown[]) => upsert(...(a as [])),
    syncStreak: async () => ({ ok: true, data: { streak: 2, previousStreak: 1, lastCompleted: '2026-10-17' } }),
  },
  savedHighlights: {
    listForUserDate: async () => ({ ok: true, data: [] }),
  },
}));
vi.mock('../../services/levelSystem', () => ({
  awardXP: (...a: unknown[]) => awardXP(...a),
  checkAndAwardStreakMilestone: async () => null,
  STREAK_MILESTONES: [3, 7],
}));
vi.mock('../../services/achievements', () => ({ checkAchievementProgress: (...a: unknown[]) => checkAchievementProgress(...(a as [])) }));
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
// The feed and the sheets are not under test.
vi.mock('../../components/ritual/HoroscopeCard', () => ({
  HoroscopeCard: ({ onRead }: { onRead: () => void }) => <button type="button" onClick={onRead}>Read the horoscope</button>,
}));
vi.mock('../../components/ritual/DailyMissionCard', () => ({ DailyMissionCard: () => null }));
vi.mock('../../components/ritual/DailyCosmicScore', () => ({ DailyCosmicScore: () => null }));
vi.mock('../../components/ritual/DailyMansionCard', () => ({ DailyMansionCard: () => null }));
vi.mock('../../components/home/MoonstoneWidget', () => ({ MoonstoneWidget: () => null }));
vi.mock('../../components/home/MoonPhaseCard', () => ({ MoonPhaseCard: () => null }));
vi.mock('../../components/home/DailyWisdomCard', () => ({ DailyWisdomCard: () => null }));
vi.mock('../../components/celebration/StreakCelebration', () => ({ StreakCelebration: () => null }));
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
  return {
    motion,
    AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
    useReducedMotion: () => true,
  };
});

import i18n from '../../i18n/config';
import { HomePage } from '../HomePage';
import '@testing-library/jest-dom/vitest';

/** Where Write leads, with the state it carried. */
function JournalProbe() {
  const location = useLocation();
  return <p data-testid="journal">{JSON.stringify(location.state)}</p>;
}

function mount() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/journal" element={<JournalProbe />} />
        <Route path="/readings" element={<p>readings</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

beforeEach(() => {
  // A Saturday, 07:45 on the device's own clock: Early Riser and Weekend Warrior.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 17, 7, 45));
  refreshProfile.mockClear();
  awardXP.mockReset();
  checkAchievementProgress.mockClear();
  upsert.mockClear();
  serverRow = null;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const reports = () => checkAchievementProgress.mock.calls.map((c) => (c as unknown[])[1]);

describe('the day’s ritual on Home', () => {
  it('a capped XP award still reports the ritual’s hour and weekday, and re-reads the profile (F05)', async () => {
    serverRow = { horoscopeViewed: true, tarotViewed: true, promptViewed: false, completed: false };
    awardXP.mockResolvedValue(null); // award_xp answered { capped: true, xp_earned: 0 }
    mount();
    fireEvent.click(await screen.findByRole('button', { name: /^Write$/ }));
    await waitFor(() => expect(refreshProfile).toHaveBeenCalled());
    expect(awardXP).toHaveBeenCalledWith(USER.id, 'ritual_complete');
    expect(reports()).toEqual(expect.arrayContaining(['morning_ritual', 'weekend_ritual']));
    expect(reports()).not.toContain('evening_ritual');
  });

  it('a paid award reports the same, once', async () => {
    serverRow = { horoscopeViewed: true, tarotViewed: true, promptViewed: false, completed: false };
    awardXP.mockResolvedValue({ xp_earned: 50, level_up: false, new_level: 1, seeker_rank: 'Novice Seeker', total_xp: 100 });
    mount();
    fireEvent.click(await screen.findByRole('button', { name: /^Write$/ }));
    await waitFor(() => expect(refreshProfile).toHaveBeenCalledTimes(1));
    expect(reports().filter((r) => r === 'morning_ritual')).toHaveLength(1);
    expect(reports().filter((r) => r === 'weekend_ritual')).toHaveLength(1);
  });

  it('Write opens the journal’s editor on today’s prompt (F54/F88)', async () => {
    // A part is done, so Home shows the ritual's cards.
    serverRow = { horoscopeViewed: true, tarotViewed: false, promptViewed: false, completed: false };
    mount();
    fireEvent.click(await screen.findByRole('button', { name: /^Write$/ }));
    expect(await screen.findByTestId('journal')).toHaveTextContent('{"compose":"today"}');
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ promptViewed: true, date: '2026-10-17' }));
  });

  it('the card lies face up once its part is done (F53/F74)', async () => {
    serverRow = { horoscopeViewed: true, tarotViewed: true, promptViewed: true, completed: true };
    mount();
    expect(await screen.findByRole('heading', { name: 'The Star' })).toBeInTheDocument();
    expect(screen.queryByText('Tap to reveal')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Save The Star$/ })).toBeInTheDocument();
  });

  it('turning the card over is the card part, counted once (F53)', async () => {
    serverRow = { horoscopeViewed: true, tarotViewed: false, promptViewed: false, completed: false };
    mount();
    const card = await screen.findByRole('button', { name: /face down/ });
    fireEvent.click(card);
    await waitFor(() => expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ tarotViewed: true, horoscopeViewed: true })));
    expect(await screen.findByRole('img', { name: '2 of 3 parts done' })).toBeInTheDocument();
    // Reading the meaning afterwards is the same part: no second write.
    fireEvent.click(screen.getByRole('button', { name: /Read the meaning of The Star/ }));
    await new Promise((r) => setTimeout(r, 50));
    expect(upsert).toHaveBeenCalledTimes(1);
  });
});
