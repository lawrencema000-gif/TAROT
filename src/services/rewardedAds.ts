import { isNative } from '../utils/platform';
import { adConfigService } from './adConfig';
import { appStorage } from '../lib/appStorage';
import { supabase } from '../lib/supabase';

/**
 * Rewarded ads service.
 *
 * **Business-model refactor 2026-04-25** — rewarded ads no longer grant
 * single-use feature unlocks. Each completed ad credits a flat
 * +50 Moonstones (the universal unlock currency) via the SECURITY
 * DEFINER RPC `moonstone_credit_for_ad`. Moonstones can then be spent
 * on any report/unlock surface OR users can subscribe to Premium
 * (which unlocks everything).
 *
 * The legacy `rewarded_ad_unlocks` table + `hasTemporaryAccess` /
 * `consumeTemporaryAccess` helpers are NOT deleted — existing rows
 * stay valid (backward compat for users who had temp access before
 * this change). But new ad completions no longer grow that table.
 */

// Rewarded ads are unlimited per-day.
const DAILY_COUNT_KEY = 'arcana_rewarded_ad_count';
const DAILY_DATE_KEY  = 'arcana_rewarded_ad_date';
const UNLIMITED_SENTINEL = 999999;
const USE_TEST_ADS = import.meta.env.VITE_USE_TEST_ADS !== 'false';
const TEST_REWARDED_ID = 'ca-app-pub-3940256099942544/5224354917';

/** How many Moonstones each completed ad awards. */
export const MOONSTONES_PER_AD = 50;

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
 * - 'disabled': plugin missing or feature off.
 */
export type WatchAdOutcome = 'credited' | 'not-ready' | 'dismissed' | 'persist-failed' | 'disabled';

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
      // Ad reward fired. Credit +50 Moonstones via the RPC. Idempotent
      // per ad_event_id on the server side — a double-fire can't double
      // credit.
      let persisted = false;
      let newBalance = 0;
      if (this.pending && this.currentUserId) {
        try {
          const { data, error } = await supabase.rpc('moonstone_credit_for_ad', {
            p_ad_event_id: this.pending.adEventId,
            p_amount: MOONSTONES_PER_AD,
          });
          if (!error) {
            const row = Array.isArray(data) ? data[0] : data;
            newBalance = (row?.new_balance as number) ?? 0;
            persisted = true;
            this.pending.onCredited?.(newBalance);
          } else {
            console.warn('[RewardedAds] credit RPC failed:', error);
          }
        } catch (e) {
          console.warn('[RewardedAds] credit RPC threw:', e);
        }
        this.incrementLocalDailyCount();
        // Fire analytics event. Non-blocking.
        adConfigService.trackEvent('rewarded', 'feature_unlock', {
          completed: true,
          rewardAmount: MOONSTONES_PER_AD,
          rewardType: 'moonstones',
        }).catch(() => {});
        adConfigService.invalidate();
        adConfigService.fetchConfig().catch(() => {});
      }
      this.resolveAdWatch?.(persisted ? 'credited' : 'persist-failed');
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

  /** Legacy counter — always returns a high sentinel post-refactor. */
  async getRemainingUnlocks(): Promise<number> {
    const serverRemaining = adConfigService.getRewardedRemaining();
    const stats = adConfigService.getDailyStats();
    return stats ? serverRemaining : UNLIMITED_SENTINEL;
  }

  async canWatchAd(): Promise<boolean> {
    return true;
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
