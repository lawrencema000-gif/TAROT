import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createElement, forwardRef, type ReactNode } from 'react';

/*
 * p9 QU2 R3 b: Home's "share the card of the day" named a reversed card as
 * `${name} (${reversed})`, a Latin space and parentheses built in code:
 * 「今日の私のカードはソードの8 (逆位置)。」. The name is the locale's
 * reversed-card form now (library.cardReversed), as the Library writes it:
 * ソードの8（逆位置）.
 */

const USER = { id: '00000000-0000-4000-8000-0000000000d2', email: 'qa@example.com' };
const PROFILE = { displayName: 'qa', birthDate: '1991-03-08', streak: 1, level: 1, seekerRank: 'Novice Seeker', isPremium: false };
const EIGHT_OF_SWORDS = 57;
let reversed = true;
const writeText = vi.fn(async (text: string) => { void text; });

vi.mock('../../lib/supabase', () => ({ supabase: {} }));
vi.mock('../../utils/telemetry', () => ({ captureException: () => {} }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: USER, profile: PROFILE, refreshProfile: async () => {} }) }));
vi.mock('../../context/UIContext', () => ({ useUI: () => ({ setActiveTab: () => {}, openOverlay: () => {} }) }));
vi.mock('../../context/RitualContext', () => ({ useRitual: () => ({ streak: 1, setStreak: () => {}, tarotRefreshTrigger: 0 }) }));
vi.mock('../../context/GamificationContext', () => ({ useGamification: () => ({ triggerLevelUp: () => {} }) }));
vi.mock('../../context/FeatureFlagContext', () => ({ useFeatureFlag: () => false }));
vi.mock('../../dal', () => ({
  dailyRituals: {
    // The card part is done: the card lies face up with its actions.
    getByDate: async () => ({ ok: true, data: { horoscopeViewed: true, tarotViewed: true, promptViewed: false, completed: false } }),
    countForUser: async () => ({ ok: true, data: 3 }),
    listRange: async () => ({ ok: true, data: [] }),
    upsert: async () => ({ ok: true, data: undefined }),
    syncStreak: async () => ({ ok: true, data: { streak: 2, previousStreak: 1, lastCompleted: '2026-10-17' } }),
  },
  savedHighlights: { listForUserDate: async () => ({ ok: true, data: [] }) },
}));
vi.mock('../../services/levelSystem', () => ({ awardXP: vi.fn(), checkAndAwardStreakMilestone: async () => null, STREAK_MILESTONES: [3, 7] }));
vi.mock('../../services/achievements', () => ({ checkAchievementProgress: async () => [] }));
vi.mock('../../services/offline', () => ({
  cacheDailyRitual: async () => {},
  getCachedDailyRitual: async () => null,
  cacheLastViewedCard: async () => {},
}));
// The deck in the reader's language, and the day's card fixed: the Eight of Swords.
vi.mock('../../services/tarotCards', async () => {
  const { fullDeck } = await import('../../data/tarotDeck');
  const { localizeCards } = await import('../../i18n/localizeCard');
  return { getAllTarotCards: async () => localizeCards(fullDeck) };
});
vi.mock('../../utils/cardDraw', () => ({
  drawSeededCards: (_n: number, _seed: string, cards: Array<{ id: number }>) => [{ card: cards.find((c) => c.id === EIGHT_OF_SWORDS), reversed }],
}));
vi.mock('../../hooks/useImagePreloader', () => ({ useImagePreloader: () => {} }));
vi.mock('../../hooks/useProgressiveImage', () => ({ useProgressiveImage: () => ({ src: '' }) }));
vi.mock('../../utils/haptics', () => ({ flipHaptics: () => () => {} }));
vi.mock('../../components/ritual/HoroscopeCard', () => ({ HoroscopeCard: () => null }));
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
  return { motion, AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>, useReducedMotion: () => true };
});

import i18n from '../../i18n/config';
import { HomePage } from '../HomePage';

/** Share the day's card from Home; the text it copied (no share sheet in jsdom). */
async function shareTheDaysCard(): Promise<string> {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </MemoryRouter>,
  );
  const name = i18n.t('app:home.ritualCards.shareCard', { name: i18n.getFixedT(null, 'tarot')('cards.57.name', { defaultValue: 'Eight of Swords' }) });
  fireEvent.click(await screen.findByRole('button', { name }));
  await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
  return writeText.mock.calls[0][0] as string;
}

beforeEach(() => {
  writeText.mockClear();
  reversed = true;
  vi.stubGlobal('navigator', { ...globalThis.navigator, share: undefined, clipboard: { writeText } });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
afterAll(async () => {
  await act(async () => { await i18n.changeLanguage('en'); });
});

describe('Home: the shared card of the day names a reversed card as the locale does (QU2 R3 b)', { timeout: 20_000 }, () => {
  it('ja: 「ソードの8（逆位置）」, full-width parentheses and no space', async () => {
    await act(async () => { await i18n.changeLanguage('ja'); });
    const text = await shareTheDaysCard();
    expect(text).toContain('今日の私のカードはソードの8（逆位置）。');
    expect(text).not.toContain('ソードの8 (');
  });

  it('zh and ko: their own forms', async () => {
    await act(async () => { await i18n.changeLanguage('zh'); });
    expect(await shareTheDaysCard()).toContain('宝剑八（逆位）');
    cleanup();
    writeText.mockClear();
    await act(async () => { await i18n.changeLanguage('ko'); });
    expect(await shareTheDaysCard()).toContain('오늘의 내 카드: 소드 8(역방향). ');
  });

  it('en: "Eight of Swords (Reversed)"; upright, the bare name', async () => {
    await act(async () => { await i18n.changeLanguage('en'); });
    expect(await shareTheDaysCard()).toContain('My card of the day: Eight of Swords (Reversed). ');
    cleanup();
    writeText.mockClear();
    reversed = false;
    expect(await shareTheDaysCard()).toContain('My card of the day: Eight of Swords. ');
  });
});
