import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { render, screen, act, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/*
 * p12 tarot-09 / D08 A (WP-P0-12): the free tier's three readings a day are
 * counted per account on the server. A second browser starts from the
 * server's count, not 0; each free deal is claimed before it is dealt and a
 * refused claim deals nothing; with the server out of reach the device's
 * count decides, as before; a double tap claims once; Premium never asks.
 */

const USER = { id: '00000000-0000-4000-8000-0000000000d8', email: 'qa@example.com' };
const auth = vi.hoisted(() => ({ profile: { isPremium: false, isAdFree: false, card_back_url: null, goals: [] as string[] } }));
const m = vi.hoisted(() => ({
  claim: vi.fn(),
  used: vi.fn(),
  getCount: vi.fn(),
  increment: vi.fn(),
  raise: vi.fn(),
}));

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: USER, profile: auth.profile, refreshProfile: vi.fn() }),
}));
vi.mock('../../../context/RitualContext', () => ({ useRitual: () => ({ tarotRefreshTrigger: 0 }) }));
vi.mock('../../../context/GamificationContext', () => ({ useGamification: () => ({ openRatePrompt: vi.fn() }) }));
vi.mock('../../../dal', () => ({ tarotReadings: { insertReturningId: vi.fn(), updateInterpretation: vi.fn() } }));
vi.mock('../../../dal/freeReadings', () => ({
  claimFreeReading: (...a: unknown[]) => m.claim(...a),
  usedToday: (...a: unknown[]) => m.used(...a),
}));
vi.mock('../../../services/tarotCards', async () => {
  const { fullDeck } = await import('../../../data/tarotDeck');
  const { localizeCards } = await import('../../../i18n/localizeCard');
  return { getAllTarotCards: async () => localizeCards(fullDeck) };
});
vi.mock('../../../i18n/contentOverlay', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../i18n/contentOverlay')>()),
  loadContentOverlay: vi.fn().mockResolvedValue(null),
}));
vi.mock('../../../services/offline', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../services/offline')>()),
  getDailyReadingCount: (...a: unknown[]) => m.getCount(...a),
  incrementDailyReadingCount: (...a: unknown[]) => m.increment(...a),
  raiseDailyReadingCount: (...a: unknown[]) => m.raise(...a),
}));
vi.mock('../../../services/ads', () => ({ adsService: { checkAndShowAd: vi.fn() } }));
vi.mock('../../../services/levelSystem', () => ({ awardXP: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../../services/achievements', () => ({ checkAchievementProgress: vi.fn(), checkSpecificCardAchievement: vi.fn() }));
vi.mock('../../../services/rewardedAds', () => ({
  rewardedAdsService: { canWatchAd: vi.fn().mockResolvedValue(false), hasTemporaryAccess: vi.fn().mockResolvedValue(false), consumeTemporaryAccess: vi.fn() },
}));
vi.mock('../../../services/ratePrompt', () => ({
  ratePromptService: { incrementPositiveActions: vi.fn(), shouldShowPrompt: vi.fn().mockResolvedValue(false), recordPromptShown: vi.fn() },
}));
vi.mock('../../../hooks/useMoonstoneSpend', () => ({ useMoonstoneSpend: () => ({ tryConsume: vi.fn(), refund: vi.fn(), EarnSheet: null }) }));
vi.mock('../../premium', () => ({ WatchAdSheet: () => null }));
vi.mock('../../../utils/platform', () => ({ isNative: () => false }));

import i18n from '../../../i18n/config';
import { localDateStr } from '../../../utils/localDate';
import { TarotSection } from '../TarotSection';

const tt = (key: string, opts?: Record<string, unknown>) => i18n.t(`app:${key}`, opts);
const PAYWALL = () => i18n.t('app:readings.paywall.unlimited');

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

/** The section, once today's count (device and server) has loaded. */
async function renderSection(onShowPaywall = vi.fn()) {
  render(
    <MemoryRouter>
      <TarotSection onShowPaywall={onShowPaywall} />
    </MemoryRouter>,
  );
  await screen.findByRole('button', { name: tt('readings.dailyDraw.title') });
  if (!auth.profile.isPremium) await waitFor(() => expect(m.used).toHaveBeenCalled());
  await act(async () => {});
  return onShowPaywall;
}

const tapDailyDraw = () => fireEvent.click(screen.getByRole('button', { name: tt('readings.dailyDraw.title') }));
const focusStep = () => screen.queryByRole('button', { name: new RegExp(tt('readings.focusView.continue')) });

/** Daily draw → General → Continue → Shuffle → Cut → card 1 → Reveal cards. */
async function dealToReveal({ revealTaps = 1 } = {}) {
  tapDailyDraw();
  fireEvent.click(screen.getByRole('button', { name: tt('readings.focusAreas.general') }));
  fireEvent.click(screen.getByRole('button', { name: new RegExp(tt('readings.focusView.continue')) }));
  fireEvent.click(screen.getByRole('button', { name: new RegExp(tt('readings.shuffleView.shuffleDeck')) }));
  fireEvent.click(screen.getByRole('button', { name: tt('readings.shuffleView.cutDeck') }));
  fireEvent.click(await screen.findByRole('button', { name: tt('readings.selectView.cardOf', { n: 1, total: 78 }) }));
  const reveal = screen.getByRole('button', { name: new RegExp(tt('readings.selectView.revealCards')) });
  for (let i = 0; i < revealTaps; i++) fireEvent.click(reveal);
}

/** Back, step by step, to the Readings home. */
async function backHome() {
  for (let i = 0; i < 5 && !screen.queryByRole('button', { name: tt('readings.dailyDraw.title') }); i++) {
    fireEvent.click(screen.getAllByRole('button', { name: new RegExp(`^${tt('readings.back')}$`) })[0]);
    await act(async () => {});
  }
  expect(screen.getByRole('button', { name: tt('readings.dailyDraw.title') })).toBeTruthy();
}

describe('TarotSection: the free daily limit is counted per account (D08 A)', { timeout: 20_000 }, () => {
  beforeEach(() => {
    cleanup();
    auth.profile = { isPremium: false, isAdFree: false, card_back_url: null, goals: [] };
    m.claim.mockReset().mockResolvedValue({ status: 'allowed', used: 1, limit: 3, premium: false });
    m.used.mockReset().mockResolvedValue({ ok: true, data: 0 });
    m.getCount.mockReset().mockResolvedValue(0);
    m.increment.mockReset().mockResolvedValue(undefined);
    m.raise.mockReset().mockResolvedValue(0);
  });
  afterAll(() => cleanup());

  it('a second browser starts from the server count: three used elsewhere, the paywall at once', async () => {
    m.used.mockResolvedValue({ ok: true, data: 3 });
    const onShowPaywall = await renderSection();
    expect(m.used).toHaveBeenCalledWith(localDateStr());
    tapDailyDraw();
    expect(onShowPaywall).toHaveBeenCalledWith(PAYWALL());
    expect(focusStep()).toBeNull();
    expect(m.claim).not.toHaveBeenCalled();
  });

  it('a refused claim deals nothing and shows the paywall; the next tap goes straight to it', async () => {
    m.used.mockResolvedValue({ ok: true, data: 2 });
    m.claim.mockResolvedValue({ status: 'refused', used: 3, limit: 3 });
    const onShowPaywall = await renderSection();
    await dealToReveal();
    await waitFor(() => expect(onShowPaywall).toHaveBeenCalledWith(PAYWALL()));
    expect(m.claim).toHaveBeenCalledWith(localDateStr());
    expect(screen.queryByRole('button', { name: tt('readings.revealView.revealAll') })).toBeNull();
    expect(m.increment).not.toHaveBeenCalled();
    expect(m.raise).toHaveBeenCalledWith(USER.id, 3, localDateStr());

    onShowPaywall.mockClear();
    await backHome();
    tapDailyDraw();
    expect(onShowPaywall).toHaveBeenCalledWith(PAYWALL());
    expect(focusStep()).toBeNull();
    expect(m.claim).toHaveBeenCalledTimes(1);
  });

  it('an allowed claim deals, counts once on the device, and raises it to the server count', async () => {
    m.claim.mockResolvedValue({ status: 'allowed', used: 1, limit: 3, premium: false });
    const onShowPaywall = await renderSection();
    await dealToReveal();
    expect(await screen.findByRole('button', { name: tt('readings.revealView.revealAll') })).toBeTruthy();
    await waitFor(() => expect(m.increment).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(m.raise).toHaveBeenCalledWith(USER.id, 1));
    expect(onShowPaywall).not.toHaveBeenCalled();
  });

  it('offline: the device count decides — 1 deals', async () => {
    m.used.mockResolvedValue({ ok: false, error: 'TypeError: Failed to fetch' });
    m.claim.mockResolvedValue({ status: 'unavailable' });
    m.getCount.mockResolvedValue(1);
    const onShowPaywall = await renderSection();
    await dealToReveal();
    expect(await screen.findByRole('button', { name: tt('readings.revealView.revealAll') })).toBeTruthy();
    await waitFor(() => expect(m.increment).toHaveBeenCalledTimes(1));
    expect(m.raise).not.toHaveBeenCalled();
    expect(onShowPaywall).not.toHaveBeenCalled();
  });

  it('offline: the device count decides — 3 is the paywall, no deal', async () => {
    m.used.mockResolvedValue({ ok: false, error: 'TypeError: Failed to fetch' });
    m.claim.mockResolvedValue({ status: 'unavailable' });
    m.getCount.mockResolvedValue(3);
    const onShowPaywall = await renderSection();
    tapDailyDraw();
    expect(onShowPaywall).toHaveBeenCalledWith(PAYWALL());
    expect(focusStep()).toBeNull();
    expect(m.increment).not.toHaveBeenCalled();
  });

  it('a double tap on Reveal claims once and deals once', async () => {
    const pending = deferred<unknown>();
    m.claim.mockReturnValue(pending.promise);
    await renderSection();
    await dealToReveal({ revealTaps: 2 });
    expect(m.claim).toHaveBeenCalledTimes(1);
    await act(async () => { pending.resolve({ status: 'allowed', used: 2, limit: 3, premium: false }); });
    expect(await screen.findByRole('button', { name: tt('readings.revealView.revealAll') })).toBeTruthy();
    await waitFor(() => expect(m.increment).toHaveBeenCalledTimes(1));
    expect(m.claim).toHaveBeenCalledTimes(1);
  });

  it('Premium asks the server nothing', async () => {
    auth.profile = { isPremium: true, isAdFree: true, card_back_url: null, goals: [] };
    await renderSection();
    await dealToReveal();
    expect(await screen.findByRole('button', { name: tt('readings.revealView.revealAll') })).toBeTruthy();
    expect(m.used).not.toHaveBeenCalled();
    expect(m.claim).not.toHaveBeenCalled();
  });
});
