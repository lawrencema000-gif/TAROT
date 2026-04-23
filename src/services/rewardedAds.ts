import { isNative } from '../utils/platform';
import type { PremiumFeature } from './premium';
import { adConfigService } from './adConfig';
import { appStorage } from '../lib/appStorage';
import { rewardedAdUnlocks } from '../dal';

// Rewarded ads are unlimited per-day. Local count is still tracked for
// telemetry (and so `incrementLocalDailyCount` remains meaningful if we
// ever re-introduce a cap), but it no longer gates anything.
const DAILY_COUNT_KEY = 'arcana_rewarded_ad_count';
const DAILY_DATE_KEY = 'arcana_rewarded_ad_date';
const UNLIMITED_SENTINEL = 999999;
const USE_TEST_ADS = import.meta.env.VITE_USE_TEST_ADS !== 'false';
const TEST_REWARDED_ID = 'ca-app-pub-3940256099942544/5224354917';

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
 * - 'unlocked': ad played to completion AND the unlock row landed on the
 *   server. Card should flip to unlocked state.
 * - 'not-ready': no ad was available (first open + preload hadn't finished,
 *   or AdMob returned no-fill). Show "Ad not available — try again."
 * - 'dismissed': user closed the ad early — no reward. Silent.
 * - 'persist-failed': ad completed BUT we couldn't write the unlock row
 *   after retries. Tell the user to check connection and try again.
 * - 'disabled': feature disabled / daily limit reached / plugin missing.
 */
export type WatchAdOutcome = 'unlocked' | 'not-ready' | 'dismissed' | 'persist-failed' | 'disabled';

class RewardedAdsService {
  private pluginAvailable = false;
  private isAdReady = false;
  private currentUserId: string | null = null;
  private pendingFeature: PremiumFeature | null = null;
  private pendingSpreadType: string | null = null;
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
      // The ad played to completion. Resolve based on whether the DB
      // insert succeeded. Distinct outcomes let the UI show an accurate
      // toast instead of the generic "ad not available" message when
      // what actually failed was the server write.
      let persisted = false;
      if (this.pendingFeature) {
        persisted = await this.grantTemporaryAccess(this.pendingFeature, this.pendingSpreadType);
      }
      this.resolveAdWatch?.(persisted ? 'unlocked' : 'persist-failed');
      this.resolveAdWatch = null;
      this.pendingFeature = null;
      this.pendingSpreadType = null;
    });

    AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
      this.isAdReady = false;
      this.preloadRewardedAd();
      // If a Rewarded event already resolved, resolveAdWatch is null and
      // this is just a cleanup. Otherwise: user skipped the ad — treat
      // as 'dismissed' so the UI stays silent (no scary error toast).
      if (this.resolveAdWatch) {
        this.resolveAdWatch('dismissed');
        this.resolveAdWatch = null;
      }
      this.pendingFeature = null;
      this.pendingSpreadType = null;
    });

    AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => {
      this.isAdReady = false;
      this.preloadRewardedAd();
      this.resolveAdWatch?.('not-ready');
      this.resolveAdWatch = null;
      this.pendingFeature = null;
      this.pendingSpreadType = null;
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

  /**
   * Remaining rewarded ad watches for today. Unlimited since 2026-05-22 —
   * returns a high sentinel so any legacy `> 0` callers continue to work.
   * Server stats still flow through `adConfigService.getRewardedRemaining`
   * (which also returns the sentinel after migration 20260522000000).
   */
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

  async showRewardedAd(feature: PremiumFeature, spreadType?: string): Promise<WatchAdOutcome> {
    if (!(await this.canWatchAd())) return 'disabled';
    if (!this.pluginAvailable || !AdMob) return 'disabled';

    // Trigger preload and poll isAdReady for up to 4s. AdMob typically
    // loads in 500-2000ms. If still not ready, report 'not-ready' — the
    // UI can then show the "try again in a moment" copy.
    if (!this.isAdReady) {
      this.preloadRewardedAd();
      const started = Date.now();
      while (!this.isAdReady && Date.now() - started < 4000) {
        await new Promise((r) => setTimeout(r, 200));
      }
      if (!this.isAdReady) return 'not-ready';
    }

    this.pendingFeature = feature;
    this.pendingSpreadType = spreadType || null;

    return new Promise<WatchAdOutcome>((resolve) => {
      this.resolveAdWatch = resolve;
      AdMob!.showRewardVideoAd().catch(() => {
        this.resolveAdWatch = null;
        this.pendingFeature = null;
        this.pendingSpreadType = null;
        resolve('not-ready');
      });
    });
  }

  /**
   * Persist the reward on the server. Returns true if the unlock row was
   * successfully written. On transient failures (network blip, etc), we
   * retry twice with 500ms + 1s backoff before giving up.
   *
   * Return value is what the Promise at showRewardedAd resolves to — i.e.
   * whether the UI should treat the feature as unlocked. Only a confirmed
   * server write counts.
   */
  private async grantTemporaryAccess(feature: PremiumFeature, spreadType: string | null): Promise<boolean> {
    if (!this.currentUserId) return false;

    const adUnitId = USE_TEST_ADS ? TEST_REWARDED_ID : adConfigService.getAdUnitId('rewarded');

    let persisted = false;
    const backoffs = [0, 500, 1000];  // immediate, 0.5s, 1s
    for (const delay of backoffs) {
      if (delay > 0) await new Promise((r) => setTimeout(r, delay));
      const res = await rewardedAdUnlocks.insert({
        userId: this.currentUserId,
        feature,
        spreadType,
        adUnitId,
      });
      if (res.ok) {
        persisted = true;
        break;
      }
      console.warn('[RewardedAds] Unlock insert failed (will retry):', res.error);
    }

    if (!persisted) {
      console.error('[RewardedAds] Unlock insert failed after retries — user will not see feature unlocked');
      return false;
    }

    // Only after confirmed server write: increment local count + track.
    this.incrementLocalDailyCount();
    try {
      await adConfigService.trackEvent('rewarded', 'feature_unlock', {
        completed: true,
        rewardAmount: 1,
        rewardType: feature,
      });
      adConfigService.invalidate();
      adConfigService.fetchConfig().catch(() => {});
    } catch {
      /* best-effort analytics — already unlocked */
    }
    return true;
  }

  async hasTemporaryAccess(feature: PremiumFeature, spreadType?: string): Promise<boolean> {
    if (!this.currentUserId) return false;

    const res = await rewardedAdUnlocks.hasActiveUnused(this.currentUserId, feature, spreadType);
    return res.ok && res.data;
  }

  async consumeTemporaryAccess(feature: PremiumFeature, spreadType?: string): Promise<boolean> {
    if (!this.currentUserId) return false;

    const found = await rewardedAdUnlocks.findOldestUnused(this.currentUserId, feature, spreadType);
    if (!found.ok || !found.data) return false;

    const updated = await rewardedAdUnlocks.markUsed(found.data.id);
    return updated.ok;
  }

  // --- Local storage fallback for daily count ---

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
