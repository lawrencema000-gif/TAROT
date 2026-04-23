import { isNative } from '../utils/platform';
import type { PremiumFeature } from './premium';
import { adConfigService } from './adConfig';
import { appStorage } from '../lib/appStorage';
import { rewardedAdUnlocks } from '../dal';

const DAILY_LIMIT = 5;
const DAILY_COUNT_KEY = 'arcana_rewarded_ad_count';
const DAILY_DATE_KEY = 'arcana_rewarded_ad_date';
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

class RewardedAdsService {
  private pluginAvailable = false;
  private isAdReady = false;
  private currentUserId: string | null = null;
  private pendingFeature: PremiumFeature | null = null;
  private pendingSpreadType: string | null = null;
  private resolveAdWatch: ((success: boolean) => void) | null = null;

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
      // Only resolve true when the unlock row actually landed in the DB.
      // Before this fix, a failed INSERT (RLS, network) still resolved true,
      // the UI said "unlocked!", then a fresh hasTemporaryAccess check
      // returned false — the card stayed locked.
      let persisted = false;
      if (this.pendingFeature) {
        persisted = await this.grantTemporaryAccess(this.pendingFeature, this.pendingSpreadType);
      }
      this.resolveAdWatch?.(persisted);
      this.resolveAdWatch = null;
      this.pendingFeature = null;
      this.pendingSpreadType = null;
    });

    AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
      this.isAdReady = false;
      this.preloadRewardedAd();
      if (this.resolveAdWatch) {
        this.resolveAdWatch(false);
        this.resolveAdWatch = null;
      }
      this.pendingFeature = null;
      this.pendingSpreadType = null;
    });

    AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => {
      this.isAdReady = false;
      this.preloadRewardedAd();
      this.resolveAdWatch?.(false);
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
   * Get remaining rewarded ad watches for today.
   * Uses server stats first (authoritative), falls back to local storage.
   */
  async getRemainingUnlocks(): Promise<number> {
    // Try server-authoritative count first
    const serverRemaining = adConfigService.getRewardedRemaining();
    const stats = adConfigService.getDailyStats();

    if (stats) {
      return serverRemaining;
    }

    // Fallback to local storage if no server data yet
    const { count } = await this.getLocalDailyCount();
    return Math.max(0, DAILY_LIMIT - count);
  }

  async canWatchAd(): Promise<boolean> {
    return (await this.getRemainingUnlocks()) > 0;
  }

  isReady(): boolean {
    return this.pluginAvailable && this.isAdReady;
  }

  setUserId(userId: string | null): void {
    this.currentUserId = userId;
  }

  async showRewardedAd(feature: PremiumFeature, spreadType?: string): Promise<boolean> {
    if (!(await this.canWatchAd())) return false;

    if (!this.pluginAvailable || !AdMob) return false;

    // Bug fix: before, this returned false immediately when the ad hadn't
    // preloaded yet — producing spurious "ads not available" toasts on
    // first open or right after a dismissed ad. Now we trigger a preload
    // and wait up to ~4s (AdMob typically takes 500-2000ms). If still
    // not ready, honestly report no ad.
    if (!this.isAdReady) {
      this.preloadRewardedAd();
      const started = Date.now();
      while (!this.isAdReady && Date.now() - started < 4000) {
        await new Promise((r) => setTimeout(r, 200));
      }
      if (!this.isAdReady) return false;
    }

    this.pendingFeature = feature;
    this.pendingSpreadType = spreadType || null;

    return new Promise((resolve) => {
      this.resolveAdWatch = resolve;
      AdMob!.showRewardVideoAd().catch(() => {
        this.resolveAdWatch = null;
        this.pendingFeature = null;
        this.pendingSpreadType = null;
        resolve(false);
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
