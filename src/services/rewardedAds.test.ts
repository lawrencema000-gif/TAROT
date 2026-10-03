/**
 * Rewarded-ad credits against the server's limits (p7 #33): the 7th ad of
 * the day is never shown, a cap refusal is reported as the cap (not as a
 * connection failure), and a credit that lands inside the 20 s gap is
 * retried instead of lost.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Listener = (...args: unknown[]) => unknown;
const listeners = new Map<string, Listener>();
const invoke = vi.fn();

vi.mock('@capacitor-community/admob', () => ({
  AdMob: {
    addListener: (event: string, fn: Listener) => {
      listeners.set(event, fn);
      return Promise.resolve({ remove: () => {} });
    },
    prepareRewardVideoAd: () => {
      queueMicrotask(() => listeners.get('loaded')?.());
      return Promise.resolve();
    },
    showRewardVideoAd: () => {
      // The ad plays to the end: AdMob fires Rewarded.
      queueMicrotask(() => listeners.get('rewarded')?.());
      return Promise.resolve();
    },
  },
  RewardAdPluginEvents: {
    Loaded: 'loaded',
    FailedToLoad: 'failedToLoad',
    Rewarded: 'rewarded',
    Dismissed: 'dismissed',
    FailedToShow: 'failedToShow',
  },
}));
vi.mock('../utils/platform', () => ({ isNative: () => true, isAndroid: () => true }));
vi.mock('../lib/supabase', () => ({ supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } } }));
vi.mock('../lib/appStorage', () => ({ appStorage: { get: async () => null, set: async () => {} } }));
vi.mock('./adConfig', () => ({
  adConfigService: {
    trackEvent: () => Promise.resolve(),
    invalidate: () => {},
    fetchConfig: () => Promise.resolve(null),
    getAdUnitId: () => 'test-unit',
    getDailyStats: () => null,
    getRewardedRemaining: () => 999999,
  },
}));

/** A FunctionsHttpError-shaped error carrying the edge envelope. */
function httpError(code: string, details: Record<string, unknown>) {
  return {
    name: 'FunctionsHttpError',
    message: 'Edge Function returned a non-2xx status code',
    context: new Response(JSON.stringify({ error: { code, message: code, details } }), { status: 429 }),
  };
}

async function freshService() {
  vi.resetModules();
  listeners.clear();
  const mod = await import('./rewardedAds');
  await mod.rewardedAdsService.initialize('user-1');
  await new Promise((r) => setTimeout(r, 0));
  return mod;
}

beforeEach(() => {
  invoke.mockReset();
});

describe('rewardedAdsService and the daily cap', () => {
  it('a credit reports the credits left today', async () => {
    const { rewardedAdsService } = await freshService();
    invoke.mockResolvedValueOnce({ data: { data: { newBalance: 150, creditsRemaining: 5, resetAt: '2099-01-01T00:00:00.000Z' } }, error: null });
    const onCredited = vi.fn();
    expect(await rewardedAdsService.showRewardedAd({ onCredited })).toBe('credited');
    expect(onCredited).toHaveBeenCalledWith(150);
    expect(rewardedAdsService.getCreditsRemaining()).toBe(5);
    expect(await rewardedAdsService.canWatchAd()).toBe(true);
  });

  it('AD_DAILY_CAP is the cap, not a connection failure — and the next ad is never shown', async () => {
    const { rewardedAdsService } = await freshService();
    invoke.mockResolvedValueOnce({ data: null, error: httpError('AD_DAILY_CAP', { creditsRemaining: 0, resetAt: '2099-01-01T00:00:00.000Z' }) });
    expect(await rewardedAdsService.showRewardedAd()).toBe('daily-cap');
    expect(rewardedAdsService.getCreditsRemaining()).toBe(0);
    expect(await rewardedAdsService.canWatchAd()).toBe(false);
    // Ad 8: refused before any ad plays, and nothing is sent.
    invoke.mockClear();
    expect(await rewardedAdsService.showRewardedAd()).toBe('daily-cap');
    expect(invoke).not.toHaveBeenCalled();
  });

  it('the sixth credit leaves 0: the seventh ad is not offered', async () => {
    const { rewardedAdsService } = await freshService();
    invoke.mockResolvedValueOnce({ data: { data: { newBalance: 300, creditsRemaining: 0, resetAt: '2099-01-01T00:00:00.000Z' } }, error: null });
    expect(await rewardedAdsService.showRewardedAd()).toBe('credited');
    expect(await rewardedAdsService.canWatchAd()).toBe(false);
    expect(await rewardedAdsService.showRewardedAd()).toBe('daily-cap');
  });

  it('AD_TOO_SOON waits out the gap and retries the same ad event', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const { rewardedAdsService } = await freshService();
      invoke
        .mockResolvedValueOnce({ data: null, error: httpError('AD_TOO_SOON', { retryAfterMs: 1200, creditsRemaining: 3 }) })
        .mockResolvedValueOnce({ data: { data: { newBalance: 200, creditsRemaining: 2 } }, error: null });
      const shown = rewardedAdsService.showRewardedAd();
      await vi.advanceTimersByTimeAsync(2_000);
      expect(await shown).toBe('credited');
      expect(invoke).toHaveBeenCalledTimes(2);
      const ids = invoke.mock.calls.map((c) => (c[1] as { body: { adEventId: string } }).body.adEventId);
      expect(ids[0]).toBe(ids[1]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('a real failure is still persist-failed', async () => {
    const { rewardedAdsService } = await freshService();
    invoke.mockResolvedValueOnce({ data: null, error: { name: 'FunctionsFetchError', message: 'Failed to fetch' } });
    expect(await rewardedAdsService.showRewardedAd()).toBe('persist-failed');
    expect(rewardedAdsService.getCreditsRemaining()).toBeNull();
  });
});
