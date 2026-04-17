import { isNative } from '../utils/platform';
import type { PremiumFeature } from './premium';
import { adConfigService } from './adConfig';
import { appStorage } from '../lib/appStorage';
import { supabase } from '../lib/supabase';

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
      if (this.pendingFeature) {
        await this.grantTemporaryAccess(this.pendingFeature, this.pendingSpreadType);
      }
      this.resolveAdWatch?.(true);
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

    if (!this.isAdReady) {
      await this.preloadRewardedAd();
      return false;
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

  private async grantTemporaryAccess(feature: PremiumFeature, spreadType: string | null): Promise<void> {
    if (!this.currentUserId) return;

    const adUnitId = USE_TEST_ADS ? TEST_REWARDED_ID : adConfigService.getAdUnitId('rewarded');

    try {
      // Insert unlock record (server-side FIRST, then increment local count)
      const { error } = await supabase.from('rewarded_ad_unlocks').insert({
        user_id: this.currentUserId,
        feature,
        spread_type: spreadType,
        ad_unit_id: adUnitId,
      });

      if (error) {
        console.error('[RewardedAds] Failed to save unlock:', error);
      }

      // Only increment local count AFTER server confirms
      this.incrementLocalDailyCount();

      // Track rewarded ad event via backend
      await adConfigService.trackEvent('rewarded', 'feature_unlock', {
        completed: true,
        rewardAmount: 1,
        rewardType: feature,
      });

      // Refresh config to get updated daily stats from server
      adConfigService.invalidate();
      adConfigService.fetchConfig().catch(() => {});
    } catch {
      /* empty */
    }
  }

  async hasTemporaryAccess(feature: PremiumFeature, spreadType?: string): Promise<boolean> {
    if (!this.currentUserId) return false;

    try {
      let query = supabase
        .from('rewarded_ad_unlocks')
        .select('id')
        .eq('user_id', this.currentUserId)
        .eq('feature', feature)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString()); // Only count non-expired unlocks

      if (spreadType) {
        query = query.eq('spread_type', spreadType);
      }

      const { data, error } = await query.limit(1).maybeSingle();

      if (error) return false;

      return !!data;
    } catch {
      return false;
    }
  }

  async consumeTemporaryAccess(feature: PremiumFeature, spreadType?: string): Promise<boolean> {
    if (!this.currentUserId) return false;

    try {
      let query = supabase
        .from('rewarded_ad_unlocks')
        .select('id')
        .eq('user_id', this.currentUserId)
        .eq('feature', feature)
        .eq('used', false);

      if (spreadType) {
        query = query.eq('spread_type', spreadType);
      }

      const { data, error: selectError } = await query
        .order('unlocked_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (selectError || !data) {
        return false;
      }

      const { error: updateError } = await supabase
        .from('rewarded_ad_unlocks')
        .update({ used: true })
        .eq('id', data.id);

      if (updateError) return false;

      return true;
    } catch {
      return false;
    }
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
