import { isNative } from '../utils/platform';
import { adConfigService } from './adConfig';
import { appStorage } from '../lib/appStorage';
import { supabase } from '../lib/supabase';

/**
 * Rewarded ads service.
 *
 * **Business-model refactor 2026-04-25** — rewarded ads no longer grant
 * single-use feature unlocks. Each completed ad credits a flat
 * +50 Moonstones (the universal unlock currency) through the `ad-reward`
 * edge function, which runs the credit as the service role with the
 * amount and the daily/interval caps fixed server-side. Moonstones can then be spent
 * on any report/unlock surface OR users can subscribe to Premium
 * (which unlocks everything).
 *
 * The legacy `rewarded_ad_unlocks` table + `hasTemporaryAccess` /
 * `consumeTemporaryAccess` helpers are NOT deleted — existing rows
 * stay valid (backward compat for users who had temp access before
 * this change). But new ad completions no longer grow that table.
 */

// Local telemetry counter (the server's ledger is the real count).
const DAILY_COUNT_KEY = 'arcana_rewarded_ad_count';
const DAILY_DATE_KEY  = 'arcana_rewarded_ad_date';
const UNLIMITED_SENTINEL = 999999;
const USE_TEST_ADS = import.meta.env.VITE_USE_TEST_ADS !== 'false';
const TEST_REWARDED_ID = 'ca-app-pub-3940256099942544/5224354917';

/** How many Moonstones each completed ad awards. */
export const MOONSTONES_PER_AD = 50;
/**
 * Server limits on the credit (moonstone_credit_for_ad_srv, 20261003000005):
 * at most 6 ads credited per UTC day, at least 20 s apart. The server is the
 * authority; these only shape what the client offers.
 */
export const AD_CREDITS_PER_DAY = 6;
const AD_MIN_GAP_MS = 20_000;
/** Longest the client waits, after the ad, for the 20 s gap to pass before crediting. */
const MAX_GAP_WAIT_MS = 21_000;

let AdMob: typeof import('@capacitor-community/admob').AdMob | null = null;
let RewardAdPluginEvents: typeof import('@capacitor-community/admob').RewardAdPluginEvents | null = null;

async function loadAdMobPlugin(): Promise<boolean> {
  if (AdMob) return true;

  try {
    const admobModule = await import('@capacitor-community/admob');
    AdMob = admobModule.AdMob;
    RewardAdPluginEvents = admobModule.RewardAdPluginEvents;
    return true;
  } catch {
    return false;
  }
}

/**
 * Discriminated result of showRewardedAd.
 *
 * - 'credited': ad played AND +50 Moonstones landed on the server.
 * - 'not-ready': no ad available (preload hadn't finished, or no-fill).
 * - 'dismissed': user skipped early. No reward. Silent.
 * - 'persist-failed': ad completed BUT server credit write failed after
 *    retries. Tell user to check connection.
 * - 'daily-cap': today's 6 credited ads are used up — nothing more can be
 *    earned from ads until UTC midnight. Returned BEFORE an ad is shown when
 *    the client already knows (getCreditsRemaining() === 0), so the user is
 *    never made to watch an ad that earns nothing; also when the server
 *    refuses the credit with AD_DAILY_CAP.
 * - 'too-soon': the server still refused after the client waited out the
 *    20 s gap (clock skew). Rare.
 * - 'disabled': plugin missing or feature off.
 */
export type WatchAdOutcome =
  | 'credited'
  | 'not-ready'
  | 'dismissed'
  | 'persist-failed'
  | 'daily-cap'
  | 'too-soon'
  | 'disabled';

/** What ad-reward answered: a credit, a refusal the user should hear about, or a failure. */
type CreditAttempt =
  | { kind: 'credited'; newBalance: number; creditsRemaining: number | null; resetAt: string | null }
  | { kind: 'daily-cap'; resetAt: string | null }
  | { kind: 'too-soon'; retryAfterMs: number }
  | { kind: 'failed' };

/** The structured error envelope a FunctionsHttpError carries in `context` (a Response). */
async function readErrorEnvelope(error: unknown): Promise<{ code?: string; details?: Record<string, unknown> } | null> {
  const ctx = (error as { context?: unknown } | null)?.context;
  if (!ctx || typeof (ctx as Response).json !== 'function') return null;
  try {
    const body = await (ctx as Response).clone().json();
    const e = (body as { error?: { code?: string; details?: Record<string, unknown> } } | null)?.error;
    return e && typeof e === 'object' ? e : null;
  } catch {
    return null;
  }
}

async function requestCredit(adEventId: string): Promise<CreditAttempt> {
  try {
    const { data, error } = await supabase.functions.invoke('ad-reward', { body: { adEventId } });
    if (!error) {
      const payload = (data as { data?: { newBalance?: number; creditsRemaining?: number | null; resetAt?: string | null } } | null)?.data;
      return {
        kind: 'credited',
        newBalance: payload?.newBalance ?? 0,
        creditsRemaining: typeof payload?.creditsRemaining === 'number' ? payload.creditsRemaining : null,
        resetAt: payload?.resetAt ?? null,
      };
    }
    const envelope = await readErrorEnvelope(error);
    if (envelope?.code === 'AD_DAILY_CAP') {
      const resetAt = envelope.details?.resetAt;
      return { kind: 'daily-cap', resetAt: typeof resetAt === 'string' ? resetAt : null };
    }
    if (envelope?.code === 'AD_TOO_SOON') {
      const retry = Number(envelope.details?.retryAfterMs);
      return { kind: 'too-soon', retryAfterMs: Number.isFinite(retry) ? Math.max(0, retry) : AD_MIN_GAP_MS };
    }
    console.warn('[RewardedAds] credit failed:', error);
    return { kind: 'failed' };
  } catch (e) {
    console.warn('[RewardedAds] credit threw:', e);
    return { kind: 'failed' };
  }
}

interface PendingAdContext {
  adEventId: string;
  onCredited?: (newBalance: number) => void;
}

class RewardedAdsService {
  private pluginAvailable = false;
  private isAdReady = false;
  private currentUserId: string | null = null;
  private pending: PendingAdContext | null = null;
  private resolveAdWatch: ((outcome: WatchAdOutcome) => void) | null = null;
  /** Credits left today as the server last said (ad-reward / ad-config); null = unknown. */
  private creditsLeft: number | null = null;
  /** When the daily cap resets (ms epoch); the known count expires with it. */
  private creditsResetAt = 0;
  /** Earliest moment the server accepts the next credit (ms epoch). */
  private nextCreditAt = 0;

  async initialize(userId: string | null = null): Promise<void> {
    this.currentUserId = userId;

    if (!isNative()) return;

    try {
      this.pluginAvailable = await loadAdMobPlugin();

      if (!this.pluginAvailable || !AdMob) return;

      this.setupAdListeners();
      await this.preloadRewardedAd();
    } catch {
      this.pluginAvailable = false;
    }
  }

  private setupAdListeners(): void {
    if (!AdMob || !RewardAdPluginEvents) return;

    AdMob.addListener(RewardAdPluginEvents.Loaded, () => {
      this.isAdReady = true;
    });

    AdMob.addListener(RewardAdPluginEvents.FailedToLoad, () => {
      this.isAdReady = false;
      setTimeout(() => this.preloadRewardedAd(), 5000);
    });

    AdMob.addListener(RewardAdPluginEvents.Rewarded, async () => {
      // Ad reward fired. Credit +50 Moonstones through the ad-reward edge
      // function (service role, amount fixed server-side, 6 credits per UTC
      // day, 20 s apart, idempotent per ad_event_id — a double-fire can't
      // double credit). The old direct RPC accepted any id and amount from
      // any client and is service-role only now (migration 20261003000005).
      let outcome: WatchAdOutcome = 'persist-failed';
      const pending = this.pending;
      if (pending && this.currentUserId) {
        // The ad usually outlasts the 20 s gap; if it did not, wait it out
        // rather than make the user watch another ad.
        const gap = this.nextCreditAt - Date.now();
        if (gap > 0) await new Promise((r) => setTimeout(r, Math.min(gap, MAX_GAP_WAIT_MS)));

        let attempt = await requestCredit(pending.adEventId);
        if (attempt.kind === 'too-soon' && attempt.retryAfterMs <= MAX_GAP_WAIT_MS) {
          const wait = attempt.retryAfterMs + 250;
          await new Promise((r) => setTimeout(r, wait));
          attempt = await requestCredit(pending.adEventId);
        }

        if (attempt.kind === 'credited') {
          outcome = 'credited';
          this.nextCreditAt = Date.now() + AD_MIN_GAP_MS;
          if (attempt.creditsRemaining !== null) this.setCreditsLeft(attempt.creditsRemaining, attempt.resetAt);
          else if (this.creditsLeft !== null) this.setCreditsLeft(Math.max(0, this.creditsLeft - 1), null);
          pending.onCredited?.(attempt.newBalance);
          // Broadcast for the home widget + any open balance display.
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('moonstone:balance', { detail: attempt.newBalance }));
          }
        } else if (attempt.kind === 'daily-cap') {
          outcome = 'daily-cap';
          this.setCreditsLeft(0, attempt.resetAt);
        } else if (attempt.kind === 'too-soon') {
          outcome = 'too-soon';
          this.nextCreditAt = Date.now() + attempt.retryAfterMs;
        }
        this.incrementLocalDailyCount();
        // Fire analytics event. Non-blocking.
        adConfigService.trackEvent('rewarded', 'feature_unlock', {
          completed: true,
          rewardAmount: outcome === 'credited' ? MOONSTONES_PER_AD : 0,
          rewardType: 'moonstones',
        }).catch(() => {});
        adConfigService.invalidate();
        adConfigService.fetchConfig().catch(() => {});
      }
      this.resolveAdWatch?.(outcome);
      this.resolveAdWatch = null;
      this.pending = null;
    });

    AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
      this.isAdReady = false;
      this.preloadRewardedAd();
      // If Rewarded already resolved, this is cleanup. Otherwise user
      // skipped - report 'dismissed' silently.
      if (this.resolveAdWatch) {
        this.resolveAdWatch('dismissed');
        this.resolveAdWatch = null;
      }
      this.pending = null;
    });

    AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => {
      this.isAdReady = false;
      this.preloadRewardedAd();
      this.resolveAdWatch?.('not-ready');
      this.resolveAdWatch = null;
      this.pending = null;
    });
  }

  private async preloadRewardedAd(): Promise<void> {
    if (!this.pluginAvailable || !AdMob) return;

    try {
      const adUnitId = USE_TEST_ADS ? TEST_REWARDED_ID : adConfigService.getAdUnitId('rewarded');
      await AdMob.prepareRewardVideoAd({ adId: adUnitId });
    } catch {
      /* empty */
    }
  }

  private setCreditsLeft(n: number, resetAtIso: string | null): void {
    this.creditsLeft = Math.max(0, Math.min(AD_CREDITS_PER_DAY, n));
    const parsed = resetAtIso ? Date.parse(resetAtIso) : NaN;
    const now = new Date();
    this.creditsResetAt = Number.isFinite(parsed)
      ? parsed
      : Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('rewarded:credits', { detail: this.creditsLeft }));
    }
  }

  /**
   * Ads that can still earn Moonstones today (0..6), or null when the client
   * does not know yet (signed out, ad-config not loaded). 0 means "come back
   * tomorrow": do not offer an ad.
   */
  getCreditsRemaining(): number | null {
    if (this.creditsLeft !== null && Date.now() >= this.creditsResetAt) this.creditsLeft = null;
    if (this.creditsLeft !== null) return this.creditsLeft;
    const stats = adConfigService.getDailyStats();
    if (!stats) return null;
    const server = adConfigService.getRewardedRemaining();
    // The pre-2026-10-03 config sent a 999999 "unlimited" sentinel.
    return server >= UNLIMITED_SENTINEL ? null : Math.max(0, Math.min(AD_CREDITS_PER_DAY, server));
  }

  /** Ads left today; the sentinel when unknown (kept for the legacy callers). */
  async getRemainingUnlocks(): Promise<number> {
    return this.getCreditsRemaining() ?? UNLIMITED_SENTINEL;
  }

  /** False once today's ad credits are used up — the UI then stops offering ads. */
  async canWatchAd(): Promise<boolean> {
    return this.getCreditsRemaining() !== 0;
  }

  isReady(): boolean {
    return this.pluginAvailable && this.isAdReady;
  }

  setUserId(userId: string | null): void {
    this.currentUserId = userId;
  }

  /**
   * Show a rewarded ad. On successful reward, credits
   * MOONSTONES_PER_AD (default 50) to the user's balance.
   *
   * `onCredited(newBalance)` fires synchronously from the Rewarded
   * listener so callers can update their UI without needing a
   * separate balance refetch.
   */
  async showRewardedAd(opts?: { onCredited?: (newBalance: number) => void }): Promise<WatchAdOutcome> {
    if (!this.pluginAvailable || !AdMob) return 'disabled';
    // Never make someone watch an ad that cannot earn anything.
    if (this.getCreditsRemaining() === 0) return 'daily-cap';

    // Poll up to 4s for ad load on first show.
    if (!this.isAdReady) {
      this.preloadRewardedAd();
      const started = Date.now();
      while (!this.isAdReady && Date.now() - started < 4000) {
        await new Promise((r) => setTimeout(r, 200));
      }
      if (!this.isAdReady) return 'not-ready';
    }

    const adEventId = `ad_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    this.pending = { adEventId, onCredited: opts?.onCredited };

    return new Promise<WatchAdOutcome>((resolve) => {
      this.resolveAdWatch = resolve;
      AdMob!.showRewardVideoAd().catch(() => {
        this.resolveAdWatch = null;
        this.pending = null;
        resolve('not-ready');
      });
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // Legacy helpers kept for backward compatibility with features that
  // previously granted temporary access via `rewarded_ad_unlocks`.
  // New code paths should NOT call these — feature unlocks happen
  // exclusively via Premium subscription or Moonstones spend.
  // ─────────────────────────────────────────────────────────────────

  async hasTemporaryAccess(feature: string, spreadType?: string): Promise<boolean> {
    // Temporary feature-unlock grants are deprecated. Existing rows in
    // `rewarded_ad_unlocks` still resolve for users who had them before
    // the monetization refactor, but we no longer insert new ones. To
    // keep behaviour simple + predictable, always resolve false here.
    void feature; void spreadType;
    return false;
  }

  async consumeTemporaryAccess(feature: string, spreadType?: string): Promise<boolean> {
    void feature; void spreadType;
    return false;
  }

  // --- Local storage fallback for daily count (telemetry only) ---

  private async getLocalDailyCount(): Promise<{ count: number; date: string }> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const storedDate = await appStorage.get(DAILY_DATE_KEY);
      const storedCount = await appStorage.get(DAILY_COUNT_KEY);

      if (storedDate === today && storedCount) {
        return { count: parseInt(storedCount, 10), date: today };
      }

      await appStorage.set(DAILY_DATE_KEY, today);
      await appStorage.set(DAILY_COUNT_KEY, '0');
      return { count: 0, date: today };
    } catch {
      return { count: 0, date: new Date().toISOString().split('T')[0] };
    }
  }

  private async incrementLocalDailyCount(): Promise<void> {
    try {
      const { count, date } = await this.getLocalDailyCount();
      await appStorage.set(DAILY_DATE_KEY, date);
      await appStorage.set(DAILY_COUNT_KEY, (count + 1).toString());
    } catch {
      /* empty */
    }
  }
}

export const rewardedAdsService = new RewardedAdsService();
