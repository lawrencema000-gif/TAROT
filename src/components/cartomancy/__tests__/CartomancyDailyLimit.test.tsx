import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { render, screen, act, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/*
 * p12 tarot-09 / D08 A (WP-P0-12): playing cards share tarot's free daily
 * count, now counted per account on the server. A deep-linked spread waits
 * for the server's count before it opens; a refused claim deals nothing; with
 * the server out of reach the device's count decides, as before.
 */

const USER = { id: '00000000-0000-4000-8000-0000000000d9', email: 'qa@example.com' };
const m = vi.hoisted(() => ({
  claim: vi.fn(),
  used: vi.fn(),
  getCount: vi.fn(),
  increment: vi.fn(),
  raise: vi.fn(),
}));

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: USER, profile: { isPremium: false, isAdFree: false, card_back_url: null, goals: [] }, refreshProfile: vi.fn() }),
}));
vi.mock('../../../context/GamificationContext', () => ({ useGamification: () => ({ openRatePrompt: vi.fn() }) }));
vi.mock('../../../dal', () => ({ tarotReadings: { insertReturningId: vi.fn(), updateInterpretation: vi.fn() } }));
vi.mock('../../../dal/freeReadings', () => ({
  claimFreeReading: (...a: unknown[]) => m.claim(...a),
  usedToday: (...a: unknown[]) => m.used(...a),
}));
vi.mock('../../../services/offline', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../services/offline')>()),
  getDailyReadingCount: (...a: unknown[]) => m.getCount(...a),
  incrementDailyReadingCount: (...a: unknown[]) => m.increment(...a),
  raiseDailyReadingCount: (...a: unknown[]) => m.raise(...a),
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
vi.mock('../../../hooks/useMoonstoneSpend', () => ({ useMoonstoneSpend: () => ({ tryConsume: vi.fn(), refund: vi.fn(), EarnSheet: null }) }));
vi.mock('../../premium', () => ({ WatchAdSheet: () => null }));
vi.mock('../../../utils/platform', () => ({ isNative: () => false }));

import i18n from '../../../i18n/config';
import { localDateStr } from '../../../utils/localDate';
import { CartomancySection } from '../CartomancySection';

const PAYWALL = () => i18n.t('app:readings.paywall.unlimited');

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

/** The deep-linked free three-card spread. */
function renderDeepLink(onShowPaywall = vi.fn()) {
  render(
    <MemoryRouter>
      <CartomancySection onShowPaywall={onShowPaywall} initialSpread="carto-three-timeline" />
    </MemoryRouter>,
  );
  return onShowPaywall;
}

const focusStep = () => screen.queryByRole('button', { name: 'Shuffle for this focus' });

/** Focus → shuffle → cut → pick three → Reveal cards. */
async function dealToReveal() {
  fireEvent.click(await screen.findByRole('button', { name: 'Love' }));
  fireEvent.click(screen.getByRole('button', { name: 'Shuffle for this focus' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Shuffle the deck' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Cut the deck' }));
  for (const n of [1, 2, 3]) fireEvent.click(await screen.findByRole('button', { name: new RegExp(`^Card ${n} of \\d+$`) }));
  fireEvent.click(screen.getByRole('button', { name: 'Reveal cards' }));
}

describe('CartomancySection: the free daily limit is counted per account (D08 A)', { timeout: 20_000 }, () => {
  beforeEach(() => {
    cleanup();
    m.claim.mockReset().mockResolvedValue({ status: 'allowed', used: 1, limit: 3, premium: false });
    m.used.mockReset().mockResolvedValue({ ok: true, data: 0 });
    m.getCount.mockReset().mockResolvedValue(0);
    m.increment.mockReset().mockResolvedValue(undefined);
    m.raise.mockReset().mockResolvedValue(0);
  });
  afterAll(() => cleanup());

  it('a second browser starts from the server count: three used elsewhere, the deep link opens the paywall', async () => {
    m.used.mockResolvedValue({ ok: true, data: 3 });
    const onShowPaywall = renderDeepLink();
    await waitFor(() => expect(onShowPaywall).toHaveBeenCalledWith(PAYWALL()));
    expect(m.used).toHaveBeenCalledWith(localDateStr());
    expect(focusStep()).toBeNull();
    expect(m.claim).not.toHaveBeenCalled();
  });

  it('the deep link waits for the server count before it opens anything', async () => {
    const pending = deferred<unknown>();
    m.used.mockReturnValue(pending.promise);
    const onShowPaywall = renderDeepLink();
    await waitFor(() => expect(m.used).toHaveBeenCalled());
    await act(async () => {});
    expect(focusStep()).toBeNull();
    expect(screen.queryByRole('button', { name: 'Love' })).toBeNull();
    expect(onShowPaywall).not.toHaveBeenCalled();
    await act(async () => { pending.resolve({ ok: true, data: 3 }); });
    await waitFor(() => expect(onShowPaywall).toHaveBeenCalledWith(PAYWALL()));
    expect(focusStep()).toBeNull();
  });

  it('a refused claim deals nothing and shows the paywall', async () => {
    m.used.mockResolvedValue({ ok: true, data: 2 });
    m.claim.mockResolvedValue({ status: 'refused', used: 3, limit: 3 });
    const onShowPaywall = renderDeepLink();
    await dealToReveal();
    await waitFor(() => expect(onShowPaywall).toHaveBeenCalledWith(PAYWALL()));
    expect(m.claim).toHaveBeenCalledWith(localDateStr());
    expect(screen.queryByRole('button', { name: 'Reveal all' })).toBeNull();
    expect(m.increment).not.toHaveBeenCalled();
    expect(m.raise).toHaveBeenCalledWith(USER.id, 3, localDateStr());
  });

  it('an allowed claim deals and counts once', async () => {
    const onShowPaywall = renderDeepLink();
    await dealToReveal();
    expect(await screen.findByRole('button', { name: 'Reveal all' })).toBeTruthy();
    await waitFor(() => expect(m.increment).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(m.raise).toHaveBeenCalledWith(USER.id, 1));
    expect(onShowPaywall).not.toHaveBeenCalled();
  });

  it('offline: the device count decides — 1 deals', async () => {
    m.used.mockResolvedValue({ ok: false, error: 'TypeError: Failed to fetch' });
    m.claim.mockResolvedValue({ status: 'unavailable' });
    m.getCount.mockResolvedValue(1);
    const onShowPaywall = renderDeepLink();
    await dealToReveal();
    expect(await screen.findByRole('button', { name: 'Reveal all' })).toBeTruthy();
    await waitFor(() => expect(m.increment).toHaveBeenCalledTimes(1));
    expect(onShowPaywall).not.toHaveBeenCalled();
  });

  it('offline: the device count decides — 3 is the paywall, no deal', async () => {
    m.used.mockResolvedValue({ ok: false, error: 'TypeError: Failed to fetch' });
    m.claim.mockResolvedValue({ status: 'unavailable' });
    m.getCount.mockResolvedValue(3);
    const onShowPaywall = renderDeepLink();
    await waitFor(() => expect(onShowPaywall).toHaveBeenCalledWith(PAYWALL()));
    expect(focusStep()).toBeNull();
    expect(m.increment).not.toHaveBeenCalled();
  });
});
