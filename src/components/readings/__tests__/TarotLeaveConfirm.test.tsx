import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { render, screen, act, waitFor, fireEvent, cleanup, within } from '@testing-library/react';
import { useEffect, type ReactElement } from 'react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

/*
 * p9 QU1 R-c: an AI interpretation bought for a reading on the table was
 * thrown away by one tap on "Start a new reading" or Back when the reading
 * had not been saved — 50 Moonstones for a free reader, and no word about
 * it. Leaving such a reveal now asks first, and says where the text is:
 * generate-reading files every interpretation it charges for under the
 * Library's AI readings (p9 Q02; cache hits too since p9 QZ-6). The client
 * still treats a cached answer as unfiled — an older deployed function did
 * not file it — so for that one the sheet says it would go, and offers to
 * save the reading with it.
 *
 * The shell's two ways out still left it without a word: a tab on the
 * bottom bar (BottomNav called setActiveTab) and Android's hardware Back
 * (androidBack went home). They ask now, in the same situations and with
 * the same sheet (leaveGuard), and the answer takes their step — the tab,
 * the back step — or drops it.
 */

const USER = { id: '00000000-0000-4000-8000-0000000000b8', email: 'qa@example.com' };
const insertReturningId = vi.fn();
const updateInterpretation = vi.fn();
const generatePremiumReading = vi.fn();
const openRatePrompt = vi.fn();

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: USER, profile: { isPremium: true, isAdFree: true, card_back_url: null, goals: [] }, refreshProfile: vi.fn() }),
}));
vi.mock('../../../context/RitualContext', () => ({ useRitual: () => ({ tarotRefreshTrigger: 0 }) }));
vi.mock('../../../context/GamificationContext', () => ({ useGamification: () => ({ openRatePrompt: () => openRatePrompt() }) }));
vi.mock('../../../dal', () => ({
  tarotReadings: {
    insertReturningId: (...a: unknown[]) => insertReturningId(...a),
    updateInterpretation: (...a: unknown[]) => updateInterpretation(...a),
  },
}));
vi.mock('../../../services/tarotCards', async () => {
  const { fullDeck } = await import('../../../data/tarotDeck');
  const { localizeCards } = await import('../../../i18n/localizeCard');
  return { getAllTarotCards: async () => localizeCards(fullDeck) };
});
vi.mock('../../../services/readingInterpretation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../services/readingInterpretation')>()),
  generatePremiumReading: (...a: unknown[]) => generatePremiumReading(...a),
}));
vi.mock('../../../utils/shareCard', () => ({ shareOrDownloadCard: vi.fn() }));
vi.mock('../../../i18n/contentOverlay', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../i18n/contentOverlay')>()),
  loadContentOverlay: vi.fn().mockResolvedValue(null),
}));
vi.mock('../../../services/offline', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../services/offline')>()),
  getDailyReadingCount: vi.fn().mockResolvedValue(0),
  incrementDailyReadingCount: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../services/ads', () => ({ adsService: { checkAndShowAd: vi.fn().mockResolvedValue(undefined) } }));
vi.mock('../../../services/levelSystem', () => ({ awardXP: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../../services/achievements', () => ({ checkAchievementProgress: vi.fn(), checkSpecificCardAchievement: vi.fn() }));
vi.mock('../../../services/rewardedAds', () => ({
  rewardedAdsService: { canWatchAd: vi.fn().mockResolvedValue(false), hasTemporaryAccess: vi.fn().mockResolvedValue(false), consumeTemporaryAccess: vi.fn() },
}));
vi.mock('../../../services/ratePrompt', () => ({
  ratePromptService: { incrementPositiveActions: vi.fn(), shouldShowPrompt: vi.fn().mockResolvedValue(false), recordPromptShown: vi.fn() },
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
import { TarotSection } from '../TarotSection';
import { BottomNav } from '../../layout/BottomNav';
import { Sheet } from '../../ui/Sheet';
import { UIProvider, useUI } from '../../../context/UIContext';
import { ratePromptService } from '../../../services/ratePrompt';
import { adsService } from '../../../services/ads';
import { androidBack, openDeepLink, type AndroidBackShell } from '../../../App';

const tt = (key: string, opts?: Record<string, unknown>) => i18n.t(`app:${key}`, opts);
const AI_TEXT = '1) 概要\n道が開けつつあります。\n\n2) 結び\n落ち着いて進みましょう。';

/** The bottom bar as App wires it: UIContext's lit tab and its setActiveTab. */
function Bar() {
  const { activeTab, setActiveTab } = useUI();
  return <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />;
}

/** Where the app is. */
function Path() {
  return <output data-testid="path">{useLocation().pathname}</output>;
}

/** The header's Saved button, in <main> with the page, as App's Header is. */
function SavedButton() {
  const { openOverlay } = useUI();
  return (
    <button type="button" onClick={() => openOverlay('saved')}>
      Open Saved
    </button>
  );
}

/** The shell's Saved overlay, beside <main> as App mounts it. */
function SavedOverlay() {
  const { activeOverlay, closeOverlay } = useUI();
  return (
    <Sheet open={activeOverlay === 'saved'} onClose={closeOverlay} title="Saved">
      <p>Saved readings</p>
    </Sheet>
  );
}

/** App's appUrlOpen listener: a link opened from outside the app goes to openDeepLink with the shell's own hands. */
const appUrlOpen: { listener: ((url: string) => void) | null } = { listener: null };
function LinkListener() {
  const { closeOverlay, setActiveTab } = useUI();
  const navigate = useNavigate();
  useEffect(() => {
    appUrlOpen.listener = (url) => openDeepLink(url, { closeOverlay, navigate, setActiveTab });
    return () => {
      appUrlOpen.listener = null;
    };
  }, [closeOverlay, navigate, setActiveTab]);
  return null;
}
const openLink = (url: string) => act(() => appUrlOpen.listener?.(url));

/** The Readings page in the app's shell: its route in <main>, the bottom bar, the Saved overlay; any other path is a blank page. */
const inShell = (section: ReactElement) => (
  <MemoryRouter initialEntries={['/readings']}>
    <UIProvider>
      <main className="relative z-10">
        <SavedButton />
        <Routes>
          <Route path="/readings" element={section} />
          <Route path="*" element={null} />
        </Routes>
      </main>
      <Bar />
      <SavedOverlay />
      <LinkListener />
      <Path />
    </UIProvider>
  </MemoryRouter>
);

/** The daily draw, dealt and turned, with its AI interpretation bought: the reveal, unsaved. */
async function revealWithAi({ cached = false, buy = true, shell = false } = {}) {
  generatePremiumReading.mockResolvedValue({ interpretation: AI_TEXT, usedLlm: true, cardCount: 1, ...(cached ? { cached: true } : {}) });
  const section = <TarotSection onShowPaywall={() => {}} />;
  render(shell ? inShell(section) : <MemoryRouter>{section}</MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: tt('readings.dailyDraw.title') }));
  fireEvent.click(screen.getByRole('button', { name: tt('readings.focusAreas.general') }));
  fireEvent.click(screen.getByRole('button', { name: new RegExp(tt('readings.focusView.continue')) }));
  fireEvent.click(screen.getByRole('button', { name: new RegExp(tt('readings.shuffleView.shuffleDeck')) }));
  fireEvent.click(screen.getByRole('button', { name: tt('readings.shuffleView.cutDeck') }));
  fireEvent.click(await screen.findByRole('button', { name: tt('readings.selectView.cardOf', { n: 1, total: 78 }) }));
  fireEvent.click(screen.getByRole('button', { name: new RegExp(tt('readings.selectView.revealCards')) }));
  fireEvent.click(await screen.findByRole('button', { name: tt('readings.revealView.revealAll') }));
  if (buy) {
    fireEvent.click(await screen.findByRole('button', { name: new RegExp(tt('readings.revealView.getAIInsight')) }));
    await screen.findByText('道が開けつつあります。');
  }
}

const startOver = () => fireEvent.click(screen.getByRole('button', { name: tt('readings.revealView.newReading') }));
const leaveSheet = () => screen.queryByRole('dialog', { name: tt('readings.revealView.leaveConfirm.title') });
const findLeaveSheet = () => screen.findByRole('dialog', { name: tt('readings.revealView.leaveConfirm.title') });
const onHome = () => screen.queryByRole('button', { name: tt('readings.dailyDraw.title') });
const answer = (sheet: HTMLElement, key: 'save' | 'leave') =>
  fireEvent.click(within(sheet).getByRole('button', { name: tt(`readings.revealView.leaveConfirm.${key}`) }));
const path = () => screen.getByTestId('path').textContent;
const tapTab = (key: string) => fireEvent.click(screen.getByRole('tab', { name: i18n.t(`common:nav.${key}`) }));

/** Android Back on the Readings tab, as App's listener builds it; each step is a spy. */
function backOnReadings(): AndroidBackShell {
  return {
    activeOverlay: null,
    closeOverlay: vi.fn(),
    pathname: '/readings',
    navigateBack: vi.fn(),
    activeTab: 'readings',
    goHome: vi.fn(),
    exitApp: vi.fn(),
  };
}
const pressBack = (shell: AndroidBackShell) => act(() => androidBack(shell));

/** A request held on the wire until the test lets it answer. */
function held<T>() {
  let release!: (value: T) => void;
  const promise = new Promise<T>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

/** Longer than a sheet's exit (180 ms): a sheet told to close has left the page by then. */
const pastExit = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 250)));

/** The sheet's two answers. */
const answersOn = (sheet: HTMLElement) => ({
  save: within(sheet).getByRole('button', { name: tt('readings.revealView.leaveConfirm.save') }),
  leave: within(sheet).getByRole('button', { name: tt('readings.revealView.leaveConfirm.leave') }),
});

/** Every way the sheet hears "Stay": its close button, the scrim, Escape, Android Back (which sends Escape). */
function tryToStay(sheet: HTMLElement, shell: AndroidBackShell) {
  fireEvent.click(within(sheet).getByRole('button', { name: i18n.t('common:actions.close') }));
  fireEvent.click(sheet.querySelector(':scope > [aria-hidden="true"]')!);
  act(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  });
  pressBack(shell);
}

beforeEach(async () => {
  cleanup();
  insertReturningId.mockReset().mockResolvedValue({ ok: true, data: { id: 'saved-1' } });
  updateInterpretation.mockReset().mockResolvedValue({ ok: true, data: null });
  generatePremiumReading.mockReset();
  vi.mocked(adsService.checkAndShowAd).mockReset().mockResolvedValue(undefined);
  vi.mocked(ratePromptService.incrementPositiveActions).mockReset().mockResolvedValue(1);
  vi.mocked(ratePromptService.shouldShowPrompt).mockReset().mockResolvedValue(false);
  vi.mocked(ratePromptService.recordPromptShown).mockReset();
  openRatePrompt.mockReset();
  await act(async () => { await i18n.changeLanguage('ja'); });
});
afterAll(async () => {
  cleanup();
  await act(async () => { await i18n.changeLanguage('en'); });
});

// Seven steps from the deck to a bought interpretation: more than the 5 s default under a full parallel run.
describe('TarotSection: leaving a reveal with a bought AI interpretation asks first (QU1 R-c)', { timeout: 20_000 }, () => {
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
    expect(screen.getByText('道が開けつつあります。')).toBeInTheDocument();
  });

  it('"Save and leave" saves the reading with its interpretation, then goes home', async () => {
    await revealWithAi();
    startOver();
    const sheet = await screen.findByRole('dialog', { name: tt('readings.revealView.leaveConfirm.title') });
    fireEvent.click(within(sheet).getByRole('button', { name: '保存して終える' }));
    await waitFor(() => expect(onHome()).not.toBeNull());
    expect(insertReturningId).toHaveBeenCalledTimes(1);
    expect(insertReturningId.mock.calls[0][0]).toMatchObject({ interpretation: AI_TEXT, saved: true });
  });

  it('a save that fails stays on the reading, so nothing is lost', async () => {
    insertReturningId.mockResolvedValue({ ok: false, error: 'offline' });
    await revealWithAi();
    startOver();
    const sheet = await screen.findByRole('dialog', { name: tt('readings.revealView.leaveConfirm.title') });
    fireEvent.click(within(sheet).getByRole('button', { name: '保存して終える' }));
    await waitFor(() => expect(leaveSheet()).toBeNull());
    expect(onHome()).toBeNull();
    expect(screen.getByText('道が開けつつあります。')).toBeInTheDocument();
  });

  it('an interpretation served from the cache is not in the Library: the sheet says it would go', async () => {
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

describe('TarotSection: a tab on the bottom bar and Android Back ask the same question', { timeout: 20_000 }, () => {
  it('a tab asks, on the Readings page; closing the sheet stays there with the reading', async () => {
    await revealWithAi({ shell: true });
    tapTab('home');
    const sheet = await findLeaveSheet();
    expect(path()).toBe('/readings');
    fireEvent.click(within(sheet).getByRole('button', { name: i18n.t('common:actions.close') }));
    await waitFor(() => expect(leaveSheet()).toBeNull());
    expect(path()).toBe('/readings');
    expect(screen.getByText('道が開けつつあります。')).toBeInTheDocument();
    expect(insertReturningId).not.toHaveBeenCalled();
  });

  it('a tab: "Leave" goes to the tab that was tapped, without saving', async () => {
    await revealWithAi({ shell: true });
    tapTab('horoscope');
    answer(await findLeaveSheet(), 'leave');
    await waitFor(() => expect(path()).toBe('/horoscope'));
    expect(screen.queryByText('道が開けつつあります。')).toBeNull();
    expect(insertReturningId).not.toHaveBeenCalled();
  });

  it('a tab: "Save and leave" saves the reading with its interpretation, then goes to the tab', async () => {
    await revealWithAi({ shell: true });
    tapTab('home');
    answer(await findLeaveSheet(), 'save');
    await waitFor(() => expect(path()).toBe('/'));
    expect(insertReturningId).toHaveBeenCalledTimes(1);
    expect(insertReturningId.mock.calls[0][0]).toMatchObject({ interpretation: AI_TEXT, saved: true });
  });

  it('the Readings tab is the page on screen: it leaves nothing, so it asks nothing', async () => {
    await revealWithAi({ shell: true });
    tapTab('readings');
    expect(leaveSheet()).toBeNull();
    expect(path()).toBe('/readings');
    expect(screen.getByText('道が開けつつあります。')).toBeInTheDocument();
  });

  it('Android Back asks, and Back again is "Stay": its step is dropped, not kept for later', async () => {
    await revealWithAi();
    const shell = backOnReadings();
    pressBack(shell);
    await findLeaveSheet();
    expect(shell.goHome).not.toHaveBeenCalled();
    // The sheet is on top, so Back closes it (Escape), as it closes any sheet.
    pressBack(shell);
    await waitFor(() => expect(leaveSheet()).toBeNull());
    expect(screen.getByText('道が開けつつあります。')).toBeInTheDocument();
    // "Start a new reading" asks next; its "Leave" goes home, not Back's way.
    startOver();
    answer(await findLeaveSheet(), 'leave');
    await waitFor(() => expect(onHome()).not.toBeNull());
    expect(shell.goHome).not.toHaveBeenCalled();
    expect(shell.navigateBack).not.toHaveBeenCalled();
    expect(shell.exitApp).not.toHaveBeenCalled();
  });

  it('Android Back: "Leave" takes the back step, without saving', async () => {
    await revealWithAi();
    const shell = backOnReadings();
    pressBack(shell);
    answer(await findLeaveSheet(), 'leave');
    await waitFor(() => expect(shell.goHome).toHaveBeenCalledTimes(1));
    expect(shell.navigateBack).not.toHaveBeenCalled();
    expect(shell.exitApp).not.toHaveBeenCalled();
    expect(insertReturningId).not.toHaveBeenCalled();
  });

  it('Android Back: "Save and leave" saves the reading, then takes the back step', async () => {
    await revealWithAi();
    const shell = backOnReadings();
    pressBack(shell);
    answer(await findLeaveSheet(), 'save');
    await waitFor(() => expect(shell.goHome).toHaveBeenCalledTimes(1));
    expect(insertReturningId).toHaveBeenCalledTimes(1);
    expect(insertReturningId.mock.calls[0][0]).toMatchObject({ interpretation: AI_TEXT, saved: true });
    expect(insertReturningId.mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(shell.goHome).mock.invocationCallOrder[0]);
  });

  it('Android Back: a save that fails stays on the reading, and the step is not taken', async () => {
    insertReturningId.mockResolvedValue({ ok: false, error: 'offline' });
    await revealWithAi();
    const shell = backOnReadings();
    pressBack(shell);
    answer(await findLeaveSheet(), 'save');
    await waitFor(() => expect(leaveSheet()).toBeNull());
    expect(shell.goHome).not.toHaveBeenCalled();
    expect(screen.getByText('道が開けつつあります。')).toBeInTheDocument();
  });

  it('no AI interpretation bought: the bar and Android Back go at once, as before', async () => {
    await revealWithAi({ buy: false, shell: true });
    const shell = backOnReadings();
    pressBack(shell);
    expect(shell.goHome).toHaveBeenCalledTimes(1);
    expect(leaveSheet()).toBeNull();
    tapTab('home');
    await waitFor(() => expect(path()).toBe('/'));
    expect(leaveSheet()).toBeNull();
  });

  it('saved first: the bar and Android Back go at once', async () => {
    await revealWithAi({ shell: true });
    fireEvent.click(screen.getByRole('button', { name: tt('readings.revealView.save') }));
    await screen.findByRole('button', { name: tt('readings.revealView.saved') });
    const shell = backOnReadings();
    pressBack(shell);
    expect(shell.goHome).toHaveBeenCalledTimes(1);
    expect(leaveSheet()).toBeNull();
    tapTab('home');
    await waitFor(() => expect(path()).toBe('/'));
    expect(leaveSheet()).toBeNull();
    expect(insertReturningId).toHaveBeenCalledTimes(1);
  });
});

/*
 * "Save and leave" is the member's answer, and the first answer is final.
 * Stay used to close the sheet while the row was written, and the step it
 * held still ran when the row landed. The sheet spins through the insert,
 * holds both answers, and hears no Stay; the step runs once.
 *
 * It holds through the insert and no further. It used to hold through the
 * ad check and the rate prompt the save awaited after the insert as well —
 * a flag fetch and two to five requests, none with a timeout — so on a
 * stalled network the member was held, spinning, over a reading already
 * saved. The step is taken as the row lands; the ad and the rate prompt run
 * after it. The bookmark still waits for them, as it always did.
 */
describe('TarotSection: "Save and leave" is final until its insert has answered', { timeout: 20_000 }, () => {
  it('while the row is written, Stay and "Leave" do nothing; the tab is taken once it lands', async () => {
    const insert = held<{ ok: true; data: { id: string } }>();
    insertReturningId.mockReturnValue(insert.promise);
    await revealWithAi({ shell: true });
    tapTab('horoscope');
    const sheet = await findLeaveSheet();
    answer(sheet, 'save');
    expect(answersOn(sheet).save).toBeDisabled();
    expect(answersOn(sheet).leave).toBeDisabled();

    const shell = backOnReadings();
    tryToStay(sheet, shell);
    fireEvent.click(answersOn(sheet).leave);
    await pastExit();
    expect(leaveSheet()).not.toBeNull();
    expect(path()).toBe('/readings');
    expect(onHome()).toBeNull();

    await act(async () => insert.release({ ok: true, data: { id: 'saved-1' } }));
    await waitFor(() => expect(path()).toBe('/horoscope'));
    expect(insertReturningId).toHaveBeenCalledTimes(1);
    expect(shell.goHome).not.toHaveBeenCalled();
  });

  it('the row written, the sheet closes and Back’s step is taken at once, the rate prompt still on the wire; then nothing more', async () => {
    const prompt = held<number>();
    vi.mocked(ratePromptService.incrementPositiveActions).mockReturnValueOnce(prompt.promise);
    await revealWithAi();
    const shell = backOnReadings();
    pressBack(shell);
    answer(await findLeaveSheet(), 'save');

    // The rate prompt has not answered; the step is taken, and the sheet goes.
    await waitFor(() => expect(shell.goHome).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(leaveSheet()).toBeNull());
    expect(insertReturningId).toHaveBeenCalledTimes(1);
    expect(ratePromptService.incrementPositiveActions).toHaveBeenCalledTimes(1);
    expect(ratePromptService.shouldShowPrompt).not.toHaveBeenCalled();
    // The ad check and the rate prompt start after the step, not before it.
    expect(vi.mocked(shell.goHome).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(adsService.checkAndShowAd).mock.invocationCallOrder[0],
    );

    await act(async () => prompt.release(1));
    await waitFor(() => expect(ratePromptService.shouldShowPrompt).toHaveBeenCalledTimes(1));
    // One step: Back's. The section did not go to its spreads as well.
    expect(shell.goHome).toHaveBeenCalledTimes(1);
    expect(onHome()).toBeNull();
    expect(shell.navigateBack).not.toHaveBeenCalled();
    expect(shell.exitApp).not.toHaveBeenCalled();
  });

  it('nor does the step wait for the ad check (a flag fetch and an interstitial on Android); the rate prompt follows the ad, as before', async () => {
    const ad = held<void>();
    vi.mocked(adsService.checkAndShowAd).mockReturnValueOnce(ad.promise);
    await revealWithAi({ shell: true });
    tapTab('horoscope');
    answer(await findLeaveSheet(), 'save');

    await waitFor(() => expect(path()).toBe('/horoscope'));
    expect(adsService.checkAndShowAd).toHaveBeenCalledTimes(1);
    expect(ratePromptService.incrementPositiveActions).not.toHaveBeenCalled();
    // The page has gone; what the row earns still arrives.
    await act(async () => ad.release());
    await waitFor(() => expect(ratePromptService.shouldShowPrompt).toHaveBeenCalledTimes(1));
    expect(ratePromptService.incrementPositiveActions).toHaveBeenCalledTimes(1);
    expect(insertReturningId).toHaveBeenCalledTimes(1);
  });

  it('a save that fails lets go of the answer: the sheet closes as before, the step is not taken, and asked again, Stay and "Leave" answer', async () => {
    const insert = held<{ ok: false; error: string }>();
    insertReturningId.mockReturnValueOnce(insert.promise);
    await revealWithAi();
    const shell = backOnReadings();
    pressBack(shell);
    const sheet = await findLeaveSheet();
    answer(sheet, 'save');
    // Stay is not heard while the insert runs, even one that will fail.
    tryToStay(sheet, shell);
    await pastExit();
    expect(leaveSheet()).not.toBeNull();

    await act(async () => insert.release({ ok: false, error: 'offline' }));
    await waitFor(() => expect(leaveSheet()).toBeNull());
    expect(shell.goHome).not.toHaveBeenCalled();
    expect(screen.getByText('道が開けつつあります。')).toBeInTheDocument();
    // Nothing written, nothing earned.
    expect(adsService.checkAndShowAd).not.toHaveBeenCalled();
    expect(ratePromptService.incrementPositiveActions).not.toHaveBeenCalled();

    startOver();
    const again = await findLeaveSheet();
    expect(answersOn(again).save).toBeEnabled();
    expect(answersOn(again).leave).toBeEnabled();
    fireEvent.click(within(again).getByRole('button', { name: i18n.t('common:actions.close') }));
    await waitFor(() => expect(leaveSheet()).toBeNull());

    startOver();
    answer(await findLeaveSheet(), 'leave');
    await waitFor(() => expect(onHome()).not.toBeNull());
    expect(insertReturningId).toHaveBeenCalledTimes(1);
  });

  it('the bookmark is as it was: it spins through the insert, then waits on the ad check and the rate prompt in turn', async () => {
    const insert = held<{ ok: true; data: { id: string } }>();
    insertReturningId.mockReturnValueOnce(insert.promise);
    const prompt = held<number>();
    vi.mocked(ratePromptService.incrementPositiveActions).mockReturnValueOnce(prompt.promise);
    vi.mocked(ratePromptService.shouldShowPrompt).mockResolvedValueOnce(true);
    await revealWithAi();

    fireEvent.click(screen.getByRole('button', { name: tt('readings.revealView.save') }));
    expect(screen.getByRole('button', { name: tt('readings.revealView.save') })).toHaveAttribute('aria-busy', 'true');
    expect(adsService.checkAndShowAd).not.toHaveBeenCalled();

    await act(async () => insert.release({ ok: true, data: { id: 'saved-1' } }));
    await screen.findByRole('button', { name: tt('readings.revealView.saved') });
    await waitFor(() => expect(ratePromptService.incrementPositiveActions).toHaveBeenCalledTimes(1));
    expect(adsService.checkAndShowAd).toHaveBeenCalledTimes(1);
    // Each waits for the one before it.
    expect(ratePromptService.shouldShowPrompt).not.toHaveBeenCalled();
    expect(openRatePrompt).not.toHaveBeenCalled();

    await act(async () => prompt.release(1));
    await waitFor(() => expect(openRatePrompt).toHaveBeenCalledTimes(1));
    expect(ratePromptService.recordPromptShown).toHaveBeenCalledTimes(1);
    expect(vi.mocked(adsService.checkAndShowAd).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(ratePromptService.incrementPositiveActions).mock.invocationCallOrder[0],
    );
    // No question, and the reading stays on the table.
    expect(leaveSheet()).toBeNull();
    expect(screen.getByText('道が開けつつあります。')).toBeInTheDocument();
    expect(insertReturningId).toHaveBeenCalledTimes(1);
  });
});

/*
 * The page is drawn in the shell's <main>, a stacking context of its own
 * (z-10), and the sheet was drawn there too: under the Search, Saved or
 * Settings sheet and the More menu, which App mounts beside <main>. A link
 * opened from outside the app asked from under the open Saved sheet — a
 * question the member could not see, which the first Android Back answered
 * with Stay: the link was dropped and the overlay stayed. The overlay closes
 * before the link asks now, and the sheet is drawn on <body>, above it all.
 */
describe('TarotSection: the question is asked above everything open', { timeout: 20_000 }, () => {
  it('the sheet is drawn on <body>, outside the page’s <main>', async () => {
    await revealWithAi({ shell: true });
    tapTab('home');
    const sheet = await findLeaveSheet();
    expect(sheet.closest('main')).toBeNull();
    expect(sheet.parentElement).toBe(document.body);
  });

  it('a link opened from outside the app closes the Saved sheet first, then asks; "Leave" takes the link', async () => {
    await revealWithAi({ shell: true });
    fireEvent.click(screen.getByRole('button', { name: 'Open Saved' }));
    await screen.findByRole('dialog', { name: 'Saved' });

    openLink('https://tarotlife.app/horoscope/leo');
    const sheet = await findLeaveSheet();
    // The Saved sheet has gone, and the question is the only thing up.
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Saved' })).toBeNull());
    expect(sheet.closest('main')).toBeNull();
    expect(path()).toBe('/readings');

    answer(sheet, 'leave');
    await waitFor(() => expect(path()).toBe('/horoscope'));
    expect(insertReturningId).not.toHaveBeenCalled();
  });

  it('a link under the Saved sheet, then Android Back: Back answers the question on screen (Stay) and nothing is left open', async () => {
    await revealWithAi({ shell: true });
    fireEvent.click(screen.getByRole('button', { name: 'Open Saved' }));
    await screen.findByRole('dialog', { name: 'Saved' });

    openLink('https://tarotlife.app/reading/abc123');
    await findLeaveSheet();
    const shell = backOnReadings();
    pressBack(shell);
    await waitFor(() => expect(leaveSheet()).toBeNull());
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Saved' })).toBeNull());
    expect(path()).toBe('/readings');
    expect(screen.getByText('道が開けつつあります。')).toBeInTheDocument();
    expect(shell.goHome).not.toHaveBeenCalled();
  });
});
