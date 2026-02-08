import { supabase } from '../lib/supabase';
import { isNative, isAndroid } from '../utils/platform';
import type { PremiumFeature } from './premium';

const DAILY_LIMIT = 5;
const DAILY_COUNT_KEY = 'arcana_rewarded_ad_count';
const DAILY_DATE_KEY = 'arcana_rewarded_ad_date';

const REWARDED_AD_UNIT_IDS = {
  android: 'ca-app-pub-9489106590476826/7730478171',
  ios: 'ca-app-pub-3940256099942544/1712485313',
};

let AdMob: typeof import('@capacitor-community/admob').AdMob | null = null;
let RewardAdPluginEvents: typeof import('@capacitor-community/admob').RewardAdPluginEvents | null = null;

async function loadAdMobPlugin(): Promise<boolean> {
  if (AdMob) return true;

  try {
    const admobModule = await import('@capacitor-community/admob');
    AdMob = admobModule.AdMob;
    RewardAdPluginEvents = admobModule.RewardAdPluginEvents;
    return true;
  } catch (error) {
    console.warn('[RewardedAds] AdMob plugin not available:', error);
    return false;
  }
}

interface DailyCount {
  count: number;
  date: string;
}

class RewardedAdsService {
  private pluginAvailable = false;
  private isAdReady = false;
  private currentUserId: string | null = null;
  private pendingFeature: PremiumFeature | null = null;
  private resolveAdWatch: ((success: boolean) => void) | null = null;

  async initialize(userId: string | null = null): Promise<void> {
    this.currentUserId = userId;

    if (!isNative()) {
      console.log('[RewardedAds] Not native platform - disabled');
      return;
    }

    try {
      this.pluginAvailable = await loadAdMobPlugin();

      if (!this.pluginAvailable || !AdMob) {
        console.log('[RewardedAds] AdMob plugin not available');
        return;
      }

      this.setupAdListeners();
      await this.preloadRewardedAd();

      console.log('[RewardedAds] Initialized successfully');
    } catch (error) {
      console.error('[RewardedAds] Failed to initialize:', error);
      this.pluginAvailable = false;
    }
  }

  private setupAdListeners(): void {
    if (!AdMob || !RewardAdPluginEvents) return;

    AdMob.addListener(RewardAdPluginEvents.Loaded, () => {
      console.log('[RewardedAds] Ad loaded');
      this.isAdReady = true;
    });

    AdMob.addListener(RewardAdPluginEvents.FailedToLoad, (error) => {
      console.error('[RewardedAds] Failed to load:', error);
      this.isAdReady = false;
      setTimeout(() => this.preloadRewardedAd(), 5000);
    });

    AdMob.addListener(RewardAdPluginEvents.Rewarded, async () => {
      console.log('[RewardedAds] User earned reward');
      if (this.pendingFeature) {
        await this.grantTemporaryAccess(this.pendingFeature);
      }
      this.resolveAdWatch?.(true);
      this.resolveAdWatch = null;
      this.pendingFeature = null;
    });

    AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
      console.log('[RewardedAds] Ad dismissed');
      this.isAdReady = false;
      this.preloadRewardedAd();
      if (this.resolveAdWatch) {
        this.resolveAdWatch(false);
        this.resolveAdWatch = null;
      }
      this.pendingFeature = null;
    });

    AdMob.addListener(RewardAdPluginEvents.FailedToShow, (error) => {
      console.error('[RewardedAds] Failed to show:', error);
      this.isAdReady = false;
      this.preloadRewardedAd();
      this.resolveAdWatch?.(false);
      this.resolveAdWatch = null;
      this.pendingFeature = null;
    });
  }

  private async preloadRewardedAd(): Promise<void> {
    if (!this.pluginAvailable || !AdMob) return;

    try {
      const adUnitId = isAndroid()
        ? REWARDED_AD_UNIT_IDS.android
        : REWARDED_AD_UNIT_IDS.ios;

      await AdMob.prepareRewardVideoAd({
        adId: adUnitId,
      });

      console.log('[RewardedAds] Ad preloaded');
    } catch (error) {
      console.error('[RewardedAds] Failed to preload:', error);
    }
  }

  private getDailyCount(): DailyCount {
    try {
      const today = new Date().toISOString().split('T')[0];
      const storedDate = localStorage.getItem(DAILY_DATE_KEY);
      const storedCount = localStorage.getItem(DAILY_COUNT_KEY);

      if (storedDate === today && storedCount) {
        return { count: parseInt(storedCount, 10), date: today };
      }

      localStorage.setItem(DAILY_DATE_KEY, today);
      localStorage.setItem(DAILY_COUNT_KEY, '0');
      return { count: 0, date: today };
    } catch (error) {
      console.error('[RewardedAds] Failed to get daily count:', error);
      return { count: 0, date: new Date().toISOString().split('T')[0] };
    }
  }

  private incrementDailyCount(): void {
    try {
      const { count, date } = this.getDailyCount();
      localStorage.setItem(DAILY_DATE_KEY, date);
      localStorage.setItem(DAILY_COUNT_KEY, (count + 1).toString());
    } catch (error) {
      console.error('[RewardedAds] Failed to increment daily count:', error);
    }
  }

  getRemainingUnlocks(): number {
    const { count } = this.getDailyCount();
    return Math.max(0, DAILY_LIMIT - count);
  }

  canWatchAd(): boolean {
    return this.getRemainingUnlocks() > 0;
  }

  isReady(): boolean {
    return this.pluginAvailable && this.isAdReady;
  }

  setUserId(userId: string | null): void {
    this.currentUserId = userId;
  }

  async showRewardedAd(feature: PremiumFeature): Promise<boolean> {
    if (!this.canWatchAd()) {
      console.log('[RewardedAds] Daily limit reached');
      return false;
    }

    if (!this.pluginAvailable || !AdMob) {
      console.log('[RewardedAds] Plugin not available');
      return false;
    }

    if (!this.isAdReady) {
      console.log('[RewardedAds] Ad not ready');
      await this.preloadRewardedAd();
      return false;
    }

    this.pendingFeature = feature;

    return new Promise((resolve) => {
      this.resolveAdWatch = resolve;
      AdMob!.showRewardVideoAd().catch((error) => {
        console.error('[RewardedAds] Failed to show ad:', error);
        this.resolveAdWatch = null;
        this.pendingFeature = null;
        resolve(false);
      });
    });
  }

  private async grantTemporaryAccess(feature: PremiumFeature): Promise<void> {
    if (!this.currentUserId) {
      console.error('[RewardedAds] No user ID set');
      return;
    }

    this.incrementDailyCount();

    const adUnitId = isAndroid()
      ? REWARDED_AD_UNIT_IDS.android
      : REWARDED_AD_UNIT_IDS.ios;

    try {
      const { error } = await supabase.from('rewarded_ad_unlocks').insert({
        user_id: this.currentUserId,
        feature,
        ad_unit_id: adUnitId,
      });

      if (error) {
        console.error('[RewardedAds] Failed to save unlock:', error);
      } else {
        console.log(`[RewardedAds] Granted temporary access to ${feature}`);
      }
    } catch (error) {
      console.error('[RewardedAds] Failed to grant access:', error);
    }
  }

  async hasTemporaryAccess(feature: PremiumFeature): Promise<boolean> {
    if (!this.currentUserId) return false;

    try {
      const { data, error } = await supabase
        .from('rewarded_ad_unlocks')
        .select('id')
        .eq('user_id', this.currentUserId)
        .eq('feature', feature)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[RewardedAds] Failed to check access:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('[RewardedAds] Failed to check access:', error);
      return false;
    }
  }

  async consumeTemporaryAccess(feature: PremiumFeature): Promise<boolean> {
    if (!this.currentUserId) return false;

    try {
      const { data, error: selectError } = await supabase
        .from('rewarded_ad_unlocks')
        .select('id')
        .eq('user_id', this.currentUserId)
        .eq('feature', feature)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
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

      if (updateError) {
        console.error('[RewardedAds] Failed to consume access:', updateError);
        return false;
      }

      console.log(`[RewardedAds] Consumed temporary access for ${feature}`);
      return true;
    } catch (error) {
      console.error('[RewardedAds] Failed to consume access:', error);
      return false;
    }
  }
}

export const rewardedAdsService = new RewardedAdsService();
