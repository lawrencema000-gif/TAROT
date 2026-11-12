import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { render, screen, act, waitFor, fireEvent, cleanup, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

/*
 * p9 QZ-4: the playing-card reveal threw a bought AI interpretation away on
 * one tap of "Start a new reading" or Back when the table was not saved — the
 * tarot reveal asks first since QU1 R-c (TarotLeaveConfirm.test.tsx), and
 * this is its sibling: the same LeaveReadingSheet, which says where the text
 * is (generate-reading files every interpretation it writes under the
 * Library's AI readings) or, for one it said it served from its cache
 * (cached: true), that it would go — and offers to save the table with it.
 *
 * A tab on the bottom bar and Android's hardware Back still left the table
 * without a word. They ask now (leaveGuard), and the answer takes their
 * step — the tab, the More menu's page, the back step — or drops it.
 */

const USER = { id: '00000000-0000-4000-8000-0000000000c9', email: 'qa@example.com' };
const insertReturningId = vi.fn();
const updateInterpretation = vi.fn();
const generatePremiumReading = vi.fn();

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: USER, profile: { isPremium: true, isAdFree: true, card_back_url: null, goals: [] }, refreshProfile: vi.fn() }),
}));
vi.mock('../../../context/GamificationContext', () => ({ useGamification: () => ({ openRatePrompt: vi.fn() }) }));
vi.mock('../../../dal', () => ({
  tarotReadings: {
    insertReturningId: (...a: unknown[]) => insertReturningId(...a),
    updateInterpretation: (...a: unknown[]) => updateInterpretation(...a),
  },
}));
vi.mock('../../../services/readingInterpretation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../services/readingInterpretation')>()),
  generatePremiumReading: (...a: unknown[]) => generatePremiumReading(...a),
}));
vi.mock('../../../services/offline', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../services/offline')>()),
  getDailyReadingCount: vi.fn().mockResolvedValue(0),
  incrementDailyReadingCount: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../services/ads', () => ({ adsService: { checkAndShowAd: vi.fn().mockResolvedValue(undefined) } }));
vi.mock('../../../services/levelSystem', () => ({ awardXP: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../../services/achievements', () => ({ checkAchievementProgress: vi.fn() }));
vi.mock('../../../services/rewardedAds', () => ({
  rewardedAdsService: { canWatchAd: vi.fn().mockResolvedValue(false), hasTemporaryAccess: vi.fn().mockResolvedValue(false), consumeTemporaryAccess: vi.fn() },
}));
vi.mock('../../../services/ratePrompt', () => ({
  ratePromptService: { incrementPositiveActions: vi.fn().mockResolvedValue(undefined), shouldShowPrompt: vi.fn().mockResolvedValue(false), recordPromptShown: vi.fn() },
}));
// A premium reader: the spend is allowed, and the earn sheet never opens.
vi.mock('../../../hooks/useMoonstoneSpend', () => ({
  useMoonstoneSpend: () => ({ tryConsume: vi.fn().mockResolvedValue(true), refund: vi.fn(), EarnSheet: null }),
}));
vi.mock('../../premium', () => ({ WatchAdSheet: () => null }));
vi.mock('../../../utils/platform', () => ({ isNative: () => false }));
// App.tsx (androidBack) loads with two things kept out, as in
// src/__tests__/androidBack.test.tsx: the shared zod schemas import
// `npm:zod` (Deno's), and the Supabase client wants its environment.
vi.mock('../../../schema', () => new Proxy({}, { get: (_t, k) => (k === 'then' ? undefined : { parse: (x: unknown) => x }), has: () => true }));
vi.mock('../../../lib/supabase', () => {
  const inert = (): unknown => new Proxy(function () {}, { get: (_t, k) => (k === 'then' ? undefined : inert()), apply: () => inert() });
  return { supabase: inert(), isSupabaseConfigured: true };
});

import i18n from '../../../i18n/config';
import { CartomancySection } from '../CartomancySection';
import { BottomNav } from '../../layout/BottomNav';
import { UIProvider, useUI } from '../../../context/UIContext';
import { androidBack, type AndroidBackShell } from '../../../App';

const tt = (key: string, opts?: Record<string, unknown>) => i18n.t(`app:${key}`, opts);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const AI_TEXT = '1) 概要\n道が開けつつあります。\n\n2) 結び\n落ち着いて進みましょう。';

/** Card n of the deck, however many cards the settings put in it. */
const cardOf = (n: number) => new RegExp(`^${escape(tt('readings.selectView.cardOf', { n, total: '__TOTAL__' })).replace('__TOTAL__', '\\d+')}$`);

/** The bottom bar as App wires it: UIContext's lit tab and its setActiveTab. */
function Bar() {
  const { activeTab, setActiveTab } = useUI();
  return <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />;
}

/** Where the app is. */
function Path() {
  return <output data-testid="path">{useLocation().pathname}</output>;
}

/** The reading page in the app's shell: its route, the bottom bar; any other path is a blank page. */
const inShell = (section: ReactElement) => (
  <MemoryRouter initialEntries={['/cartomancy/reading']}>
    <UIProvider>
      <Routes>
        <Route path="/cartomancy/reading" element={section} />
        <Route path="*" element={null} />
      </Routes>
      <Bar />
      <Path />
    </UIProvider>
  </MemoryRouter>
);

/** The three-card timeline, dealt and turned, with its AI interpretation bought: the reveal, unsaved. */
async function revealWithAi({ cached = false, buy = true, shell = false } = {}) {
  generatePremiumReading.mockResolvedValue({ interpretation: AI_TEXT, usedLlm: true, cardCount: 3, ...(cached ? { cached: true } : {}) });
  const section = <CartomancySection onShowPaywall={() => {}} initialSpread="carto-three-timeline" />;
  render(shell ? inShell(section) : <MemoryRouter>{section}</MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: tt('readings.focusAreas.love') }));
  fireEvent.click(screen.getByRole('button', { name: new RegExp(tt('readings.focusView.continue')) }));
  fireEvent.click(await screen.findByRole('button', { name: new RegExp(tt('readings.shuffleView.shuffleDeck')) }));
  fireEvent.click(await screen.findByRole('button', { name: tt('readings.shuffleView.cutDeck') }));
  for (const n of [1, 2, 3]) fireEvent.click(await screen.findByRole('button', { name: cardOf(n) }));
  fireEvent.click(screen.getByRole('button', { name: new RegExp(tt('readings.selectView.revealCards')) }));
  fireEvent.click(await screen.findByRole('button', { name: tt('readings.revealView.revealAll') }));
  if (buy) {
    fireEvent.click(await screen.findByRole('button', { name: new RegExp(tt('readings.revealView.getAIInsight')) }));
    await screen.findByText('落ち着いて進みましょう。');
  }
}

const startOver = () => fireEvent.click(screen.getByRole('button', { name: tt('readings.revealView.newReading') }));
const leaveSheet = () => screen.queryByRole('dialog', { name: tt('readings.revealView.leaveConfirm.title') });
const findLeaveSheet = () => screen.findByRole('dialog', { name: tt('readings.revealView.leaveConfirm.title') });
const onHome = () => screen.queryByRole('heading', { name: tt('cartomancy.reading.chooseSpread') });
const answer = (sheet: HTMLElement, key: 'save' | 'leave') =>
  fireEvent.click(within(sheet).getByRole('button', { name: tt(`readings.revealView.leaveConfirm.${key}`) }));
const path = () => screen.getByTestId('path').textContent;
const tapTab = (key: string) => fireEvent.click(screen.getByRole('tab', { name: i18n.t(`common:nav.${key}`) }));

/** Android Back on the reading page, as App's listener builds it; each step is a spy. */
function backOnTable(): AndroidBackShell {
  return {
    activeOverlay: null,
    closeOverlay: vi.fn(),
    pathname: '/cartomancy/reading',
    navigateBack: vi.fn(),
    activeTab: 'readings',
    goHome: vi.fn(),
    exitApp: vi.fn(),
  };
}
const pressBack = (shell: AndroidBackShell) => act(() => androidBack(shell));

beforeEach(async () => {
  cleanup();
  insertReturningId.mockReset().mockResolvedValue({ ok: true, data: { id: 'saved-1' } });
  updateInterpretation.mockReset().mockResolvedValue({ ok: true, data: null });
  generatePremiumReading.mockReset();
  await act(async () => { await i18n.changeLanguage('ja'); });
});
afterAll(async () => {
  cleanup();
  await act(async () => { await i18n.changeLanguage('en'); });
});

// Eight steps from the deck to a bought interpretation: more than the 5 s default under a full parallel run.
describe('CartomancySection: leaving a reveal with a bought AI interpretation asks first (p9 QZ-4)', { timeout: 20_000 }, () => {
  it('"Start a new reading": the sheet says the AI text is in the Library; Leave goes home without saving', async () => {
    await revealWithAi();
    startOver();
    const sheet = await screen.findByRole('dialog', { name: '保存せずに終えますか？' });
    expect(sheet.textContent).toContain('このリーディングはまだ保存されていません。AI解釈は、ライブラリの「AIリーディング」からいつでも読めます。');
    expect(onHome()).toBeNull();
    fireEvent.click(within(sheet).getByRole('button', { name: '保存せずに終える' }));
    await waitFor(() => expect(onHome()).not.toBeNull());
    expect(insertReturningId).not.toHaveBeenCalled();
  });

  it('Back asks the same; closing the sheet keeps the reading on the table', async () => {
    await revealWithAi();
    fireEvent.click(screen.getByRole('button', { name: tt('readings.back') }));
    const sheet = await screen.findByRole('dialog', { name: tt('readings.revealView.leaveConfirm.title') });
    fireEvent.click(within(sheet).getByRole('button', { name: i18n.t('common:actions.close') }));
    await waitFor(() => expect(leaveSheet()).toBeNull());
    expect(onHome()).toBeNull();
    expect(screen.getByText('落ち着いて進みましょう。')).toBeInTheDocument();
  });

  it('"Save and leave" saves the table with its interpretation, then goes home', async () => {
    await revealWithAi();
    startOver();
    const sheet = await screen.findByRole('dialog', { name: tt('readings.revealView.leaveConfirm.title') });
    fireEvent.click(within(sheet).getByRole('button', { name: '保存して終える' }));
    await waitFor(() => expect(onHome()).not.toBeNull());
    expect(insertReturningId).toHaveBeenCalledTimes(1);
    expect(insertReturningId.mock.calls[0][0]).toMatchObject({ interpretation: AI_TEXT, saved: true, spreadType: 'carto-three-timeline' });
  });

  it('a save that fails stays on the reading, so nothing is lost', async () => {
    insertReturningId.mockResolvedValue({ ok: false, error: 'offline' });
    await revealWithAi();
    startOver();
    const sheet = await screen.findByRole('dialog', { name: tt('readings.revealView.leaveConfirm.title') });
    fireEvent.click(within(sheet).getByRole('button', { name: '保存して終える' }));
    await waitFor(() => expect(leaveSheet()).toBeNull());
    expect(onHome()).toBeNull();
    expect(screen.getByText('落ち着いて進みましょう。')).toBeInTheDocument();
  });

  it('an interpretation the server says it served from its cache: the sheet says it would go', async () => {
    await revealWithAi({ cached: true });
    startOver();
    const sheet = await screen.findByRole('dialog', { name: tt('readings.revealView.leaveConfirm.title') });
    expect(sheet.textContent).toContain('このリーディングはまだ保存されていません。このまま終えると、AI解釈も消えてしまいます。残すには保存してください。');
    expect(sheet.textContent).not.toContain('ライブラリ');
  });

  it('saved first: no question, straight home', async () => {
    await revealWithAi();
    fireEvent.click(screen.getByRole('button', { name: tt('readings.revealView.save') }));
    await screen.findByRole('button', { name: tt('readings.revealView.saved') });
    startOver();
    await waitFor(() => expect(onHome()).not.toBeNull());
    expect(leaveSheet()).toBeNull();
  });

  it('no AI interpretation bought: no question, as before', async () => {
    await revealWithAi({ buy: false });
    startOver();
    await waitFor(() => expect(onHome()).not.toBeNull());
    expect(leaveSheet()).toBeNull();
  });
});

describe('CartomancySection: a tab on the bottom bar and Android Back ask the same question', { timeout: 20_000 }, () => {
  it('the Readings tab leaves the playing-card page, so it asks; closing the sheet keeps the table', async () => {
    await revealWithAi({ shell: true });
    tapTab('readings');
    const sheet = await findLeaveSheet();
    expect(path()).toBe('/cartomancy/reading');
    fireEvent.click(within(sheet).getByRole('button', { name: i18n.t('common:actions.close') }));
    await waitFor(() => expect(leaveSheet()).toBeNull());
    expect(path()).toBe('/cartomancy/reading');
    expect(screen.getByText('落ち着いて進みましょう。')).toBeInTheDocument();
    expect(insertReturningId).not.toHaveBeenCalled();
  });

  it('a page from the More menu: "Leave" goes there, without saving', async () => {
    await revealWithAi({ shell: true });
    tapTab('more');
    fireEvent.click(screen.getByRole('button', { name: i18n.t('common:nav.people') }));
    answer(await findLeaveSheet(), 'leave');
    await waitFor(() => expect(path()).toBe('/people'));
    expect(screen.queryByText('落ち着いて進みましょう。')).toBeNull();
    expect(insertReturningId).not.toHaveBeenCalled();
  });

  it('a tab: "Save and leave" saves the table with its interpretation, then goes to the tab', async () => {
    await revealWithAi({ shell: true });
    tapTab('home');
    answer(await findLeaveSheet(), 'save');
    await waitFor(() => expect(path()).toBe('/'));
    expect(insertReturningId).toHaveBeenCalledTimes(1);
    expect(insertReturningId.mock.calls[0][0]).toMatchObject({ interpretation: AI_TEXT, saved: true, spreadType: 'carto-three-timeline' });
  });

  it('Android Back asks, and Back again is "Stay": its step is dropped, not kept for later', async () => {
    await revealWithAi();
    const shell = backOnTable();
    pressBack(shell);
    await findLeaveSheet();
    expect(shell.navigateBack).not.toHaveBeenCalled();
    // The sheet is on top, so Back closes it (Escape), as it closes any sheet.
    pressBack(shell);
    await waitFor(() => expect(leaveSheet()).toBeNull());
    expect(screen.getByText('落ち着いて進みましょう。')).toBeInTheDocument();
    // "Start a new reading" asks next; its "Leave" goes to the spreads, not Back's way.
    startOver();
    answer(await findLeaveSheet(), 'leave');
    await waitFor(() => expect(onHome()).not.toBeNull());
    expect(shell.navigateBack).not.toHaveBeenCalled();
    expect(shell.goHome).not.toHaveBeenCalled();
    expect(shell.exitApp).not.toHaveBeenCalled();
  });

  it('Android Back: "Leave" takes the back step, without saving', async () => {
    await revealWithAi();
    const shell = backOnTable();
    pressBack(shell);
    answer(await findLeaveSheet(), 'leave');
    await waitFor(() => expect(shell.navigateBack).toHaveBeenCalledTimes(1));
    expect(shell.goHome).not.toHaveBeenCalled();
    expect(shell.exitApp).not.toHaveBeenCalled();
    expect(insertReturningId).not.toHaveBeenCalled();
  });

  it('Android Back: "Save and leave" saves the table, then takes the back step', async () => {
    await revealWithAi();
    const shell = backOnTable();
    pressBack(shell);
    answer(await findLeaveSheet(), 'save');
    await waitFor(() => expect(shell.navigateBack).toHaveBeenCalledTimes(1));
    expect(insertReturningId).toHaveBeenCalledTimes(1);
    expect(insertReturningId.mock.calls[0][0]).toMatchObject({ interpretation: AI_TEXT, saved: true, spreadType: 'carto-three-timeline' });
    expect(insertReturningId.mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(shell.navigateBack).mock.invocationCallOrder[0]);
  });

  it('no AI interpretation bought: the bar and Android Back go at once, as before', async () => {
    await revealWithAi({ buy: false, shell: true });
    const shell = backOnTable();
    pressBack(shell);
    expect(shell.navigateBack).toHaveBeenCalledTimes(1);
    expect(leaveSheet()).toBeNull();
    tapTab('home');
    await waitFor(() => expect(path()).toBe('/'));
    expect(leaveSheet()).toBeNull();
  });

  it('saved first: the bar and Android Back go at once', async () => {
    await revealWithAi({ shell: true });
    fireEvent.click(screen.getByRole('button', { name: tt('readings.revealView.save') }));
    await screen.findByRole('button', { name: tt('readings.revealView.saved') });
    const shell = backOnTable();
    pressBack(shell);
    expect(shell.navigateBack).toHaveBeenCalledTimes(1);
    expect(leaveSheet()).toBeNull();
    tapTab('home');
    await waitFor(() => expect(path()).toBe('/'));
    expect(leaveSheet()).toBeNull();
    expect(insertReturningId).toHaveBeenCalledTimes(1);
  });
});
