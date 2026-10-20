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
/** What ad-config answers: the signed-in account's daily stats (null = none yet). */
const adConfig = vi.hoisted(() => ({
  stats: null as { rewardedRemaining: number } | null,
  /** The stats the NEXT fetch brings back (the account the session now belongs to). */
  next: null as { rewardedRemaining: number } | null,
  /** The network is down: a fetch hands back the cached config, as adConfig.ts does. */
  offline: false,
  fetches: 0,
}));

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
    fetchConfig: () => {
      adConfig.fetches += 1;
      // Each answer is a new object, as JSON from the server is.
      if (adConfig.next && !adConfig.offline) adConfig.stats = { ...adConfig.next };
      return Promise.resolve(adConfig.stats ? { dailyStats: adConfig.stats } : null);
    },
    getAdUnitId: () => 'test-unit',
    getDailyStats: () => adConfig.stats,
    getRewardedRemaining: () => (adConfig.stats ? adConfig.stats.rewardedRemaining : 999999),
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
  adConfig.stats = null;
  adConfig.next = null;
  adConfig.offline = false;
  adConfig.fetches = 0;
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

describe('rewardedAdsService across a change of account (p8 F07)', () => {
  /** Account A uses its sixth ad of the day: 0 left. */
  async function serviceAfterSixthAd() {
    const mod = await freshService();
    invoke.mockResolvedValueOnce({ data: { data: { newBalance: 300, creditsRemaining: 0, resetAt: '2099-01-01T00:00:00.000Z' } }, error: null });
    expect(await mod.rewardedAdsService.showRewardedAd()).toBe('credited');
    expect(mod.rewardedAdsService.getCreditsRemaining()).toBe(0);
    // ad-config, as cached on the device, still says A has nothing left.
    adConfig.stats = { rewardedRemaining: 0 };
    return mod;
  }

  it('the next account does not inherit "0 ads left": it gets its own count and can watch', async () => {
    const { rewardedAdsService } = await serviceAfterSixthAd();
    const events: unknown[] = [];
    const onCredits = (e: Event) => events.push((e as CustomEvent).detail);
    window.addEventListener('rewarded:credits', onCredits);
    try {
      rewardedAdsService.setUserId(null);
      // Signed out: A's figures are gone (unknown, not 0).
      expect(rewardedAdsService.getCreditsRemaining()).toBeNull();
      // B signs in; B's ad-config says 6 left.
      adConfig.next = { rewardedRemaining: 6 };
      rewardedAdsService.setUserId('user-B');
      // Until B's own config lands the cached (A's) 0 is not believed.
      expect(rewardedAdsService.getCreditsRemaining()).toBeNull();
      await new Promise((r) => setTimeout(r, 0));
      expect(rewardedAdsService.getCreditsRemaining()).toBe(6);
      expect(await rewardedAdsService.canWatchAd()).toBe(true);
      expect(events).toContain(6);
      // And B's ad plays and is credited.
      invoke.mockClear();
      invoke.mockResolvedValueOnce({ data: { data: { newBalance: 50, creditsRemaining: 5, resetAt: '2099-01-01T00:00:00.000Z' } }, error: null });
      expect(await rewardedAdsService.showRewardedAd()).toBe('credited');
      expect(invoke).toHaveBeenCalledTimes(1);
      expect(rewardedAdsService.getCreditsRemaining()).toBe(5);
    } finally {
      window.removeEventListener('rewarded:credits', onCredits);
    }
  });

  it('a switch straight from A to B (no sign-out in between) resets too', async () => {
    const { rewardedAdsService } = await serviceAfterSixthAd();
    adConfig.next = { rewardedRemaining: 4 };
    rewardedAdsService.setUserId('user-B');
    await new Promise((r) => setTimeout(r, 0));
    expect(rewardedAdsService.getCreditsRemaining()).toBe(4);
    expect(await rewardedAdsService.showRewardedAd({})).not.toBe('daily-cap');
  });

  it('the same account again keeps what the server said', async () => {
    const { rewardedAdsService } = await serviceAfterSixthAd();
    const before = adConfig.fetches;
    rewardedAdsService.setUserId('user-1');
    expect(rewardedAdsService.getCreditsRemaining()).toBe(0);
    expect(await rewardedAdsService.showRewardedAd()).toBe('daily-cap');
    expect(adConfig.fetches).toBe(before);
  });

  it('B’s config cannot be fetched (offline): unknown, not A’s cached 0', async () => {
    const { rewardedAdsService } = await serviceAfterSixthAd();
    adConfig.offline = true;
    adConfig.next = { rewardedRemaining: 6 };
    rewardedAdsService.setUserId('user-B');
    await new Promise((r) => setTimeout(r, 0));
    expect(rewardedAdsService.getCreditsRemaining()).toBeNull();
    expect(await rewardedAdsService.canWatchAd()).toBe(true);
    // Back online: the next read fetches B's own count.
    adConfig.offline = false;
    rewardedAdsService.getCreditsRemaining();
    await new Promise((r) => setTimeout(r, 0));
    expect(rewardedAdsService.getCreditsRemaining()).toBe(6);
  });

  it('B really capped: its own config says 0, and the ad is not offered', async () => {
    const { rewardedAdsService } = await serviceAfterSixthAd();
    rewardedAdsService.setUserId(null);
    adConfig.next = { rewardedRemaining: 0 };
    rewardedAdsService.setUserId('user-B');
    await new Promise((r) => setTimeout(r, 0));
    expect(rewardedAdsService.getCreditsRemaining()).toBe(0);
    expect(await rewardedAdsService.canWatchAd()).toBe(false);
  });
});
