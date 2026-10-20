import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createElement, forwardRef, type ReactNode } from 'react';

/*
 * p10 d1-en-01, d3-ko-05: a language changed in Settings changed Home's
 * chrome, but the day's card (its name, keywords and meaning) and the
 * prompt kept the language they were first read in until a reload:
 * 「What lesson has life been teaching you lately?」 on the Japanese Home,
 * 'YOUR CARD ワンドの3' on the English one, a Korean prompt on the Chinese
 * Home. Both follow the language on screen now, at once.
 */

const USER = { id: '00000000-0000-4000-8000-0000000000d5', email: 'qa@example.com' };
const PROFILE = { displayName: 'qa', birthDate: '1991-03-08', streak: 1, level: 1, seekerRank: 'Novice Seeker', isPremium: false };

vi.mock('../../lib/supabase', () => ({ supabase: {} }));
vi.mock('../../utils/telemetry', () => ({ captureException: () => {} }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: USER, profile: PROFILE, refreshProfile: async () => {} }) }));
vi.mock('../../context/UIContext', () => ({ useUI: () => ({ setActiveTab: () => {}, openOverlay: () => {} }) }));
vi.mock('../../context/RitualContext', () => ({ useRitual: () => ({ streak: 1, setStreak: () => {}, tarotRefreshTrigger: 0 }) }));
vi.mock('../../context/GamificationContext', () => ({ useGamification: () => ({ triggerLevelUp: () => {} }) }));
vi.mock('../../context/FeatureFlagContext', () => ({ useFeatureFlag: () => false }));
vi.mock('../../dal', () => ({
  dailyRituals: {
    // The card is turned and the prompt waits: the card lies face up, the prompt is on screen.
    getByDate: async () => ({ ok: true, data: { horoscopeViewed: true, tarotViewed: true, promptViewed: false, completed: false } }),
    countForUser: async () => ({ ok: true, data: 3 }),
    listRange: async () => ({ ok: true, data: [] }),
    upsert: async () => ({ ok: true, data: undefined }),
    syncStreak: async () => ({ ok: true, data: { streak: 2, previousStreak: 1, lastCompleted: '2026-10-20' } }),
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
// The deck as the service returns it: localized, at the moment it is read,
// into the language on screen.
vi.mock('../../services/tarotCards', async () => {
  const { fullDeck } = await import('../../data/tarotDeck');
  const { localizeCards } = await import('../../i18n/localizeCard');
  return { getAllTarotCards: async () => localizeCards(fullDeck) };
});
// The day's card fixed, by id, whatever language the deck is in: the Three
// of Wands, upright (its id is set below; tarotDeck re-exports this module,
// so the factory cannot import the deck itself).
const dayCard = vi.hoisted(() => ({ id: -1 }));
vi.mock('../../utils/cardDraw', () => ({
  drawSeededCards: (_n: number, _seed: string, cards: Array<{ id: number }>) => [{ card: cards.find((c) => c.id === dayCard.id), reversed: false }],
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
import { fullDeck } from '../../data/tarotDeck';
import { localizeCard } from '../../i18n/localizeCard';
import { getDailyPrompt } from '../../data/dailyPrompts';
import { firstSentences } from '../../components/readings/tarot/readingText';
import { HomePage } from '../HomePage';
import '@testing-library/jest-dom/vitest';

const TODAY = '2026-10-20';
const THREE_OF_WANDS = fullDeck.find((c) => c.name === 'Three of Wands')!;
dayCard.id = THREE_OF_WANDS.id;

function mountHome() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** The language changes under a Home that stays on screen, as the Settings sheet changes it. */
async function switchTo(lng: 'en' | 'ja' | 'ko' | 'zh') {
  await act(async () => { await i18n.changeLanguage(lng); });
}

/** The day's card and prompt, as Home must show them in the language on screen now. */
async function expectDayIn(lng: 'en' | 'ja' | 'ko' | 'zh') {
  const card = localizeCard(THREE_OF_WANDS, lng);
  expect(await screen.findByRole('heading', { name: card.name })).toBeInTheDocument();
  for (const k of card.keywords.slice(0, 4)) expect(screen.getByText(k)).toBeInTheDocument();
  expect(screen.getByText(firstSentences(card.meaningUpright, 2))).toBeInTheDocument();
  const prompt = getDailyPrompt(TODAY);
  expect(screen.getByText(i18n.t('app:home.ritualCards.promptQuoted', { prompt, defaultValue: '“{{prompt}}”' }))).toBeInTheDocument();
  return { name: card.name, prompt };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 20, 12, 0));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
afterAll(async () => {
  await switchTo('en');
});

describe('Home follows a language change at once (p10 d1-en-01, d3-ko-05)', { timeout: 20_000 }, () => {
  it('en → ja → en: the card’s name, keywords and meaning, and the prompt', async () => {
    await switchTo('en');
    mountHome();
    const en = await expectDayIn('en');
    expect(en.name).toBe('Three of Wands');

    await switchTo('ja');
    const ja = await expectDayIn('ja');
    expect(ja.name).not.toBe(en.name);
    expect(ja.prompt).not.toBe(en.prompt);
    expect(screen.queryByRole('heading', { name: en.name })).toBeNull();
    expect(screen.queryByText(en.prompt, { exact: false })).toBeNull();

    // And back: no Japanese left on the English Home.
    await switchTo('en');
    await expectDayIn('en');
    expect(screen.queryByRole('heading', { name: ja.name })).toBeNull();
    expect(screen.queryByText(ja.prompt, { exact: false })).toBeNull();
  });

  it('ko → zh → ko', async () => {
    await switchTo('ko');
    mountHome();
    const ko = await expectDayIn('ko');

    await switchTo('zh');
    const zh = await expectDayIn('zh');
    expect(zh.name).not.toBe(ko.name);
    expect(screen.queryByText(ko.prompt, { exact: false })).toBeNull();

    await switchTo('ko');
    await expectDayIn('ko');
    expect(screen.queryByText(zh.prompt, { exact: false })).toBeNull();
  });
});
