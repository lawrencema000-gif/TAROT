import { isNative, isWeb, isAndroid } from '../utils/platform';
import { actionCounter, ActionType } from './actionCounter';
import { supabase } from '../lib/supabase';
import { rewardedAdsService } from './rewardedAds';

const AD_COOLDOWN_MS = 5 * 60 * 1000;

const TEST_AD_UNIT_IDS = {
  android: 'ca-app-pub-3940256099942544/1033173712',
  ios: 'ca-app-pub-3940256099942544/4411468910',
};

const LAST_AD_TIME_KEY = 'arcana_last_ad_time';

let AdMob: typeof import('@capacitor-community/admob').AdMob | null = null;
let InterstitialAdPluginEvents: typeof import('@capacitor-community/admob').InterstitialAdPluginEvents | null = null;

async function loadAdMobPlugin(): Promise<boolean> {
  if (AdMob) return true;

  try {
    const admobModule = await import('@capacitor-community/admob');
    AdMob = admobModule.AdMob;
    InterstitialAdPluginEvents = admobModule.InterstitialAdPluginEvents;
    return true;
  } catch (error) {
    console.warn('[Ads] AdMob plugin not available:', error);
    return false;
  }
}

class AdsService {
  private initialized = false;
  private lastAdTime = 0;
  private isAdReady = false;
  private currentUserId: string | null = null;
  private pluginAvailable = false;

  async initialize(userId: string | null = null): Promise<void> {
    if (isWeb()) {
      console.log('[Ads] Web platform detected - ads disabled');
      return;
    }

    if (this.initialized) {
      console.log('[Ads] Already initialized');
      return;
    }

    this.currentUserId = userId;

    try {
      this.pluginAvailable = await loadAdMobPlugin();

      if (!this.pluginAvailable || !AdMob) {
        console.log('[Ads] AdMob plugin not available - ads disabled');
        return;
      }

      this.loadLastAdTime();

      await AdMob.initialize({
        testingDevices: ['YOUR_DEVICE_ID_HERE'],
        initializeForTesting: true,
      });

      this.setupAdListeners();

      await this.preloadInterstitial();

      await rewardedAdsService.initialize(userId);

      this.initialized = true;
      console.log('[Ads] AdMob initialized successfully');
    } catch (error) {
      console.error('[Ads] Failed to initialize AdMob:', error);
      this.pluginAvailable = false;
    }
  }

  private loadLastAdTime(): void {
    try {
      const stored = localStorage.getItem(LAST_AD_TIME_KEY);
      this.lastAdTime = stored ? parseInt(stored, 10) : 0;
    } catch (error) {
      console.error('[Ads] Failed to load last ad time:', error);
      this.lastAdTime = 0;
    }
  }

  private saveLastAdTime(): void {
    try {
      localStorage.setItem(LAST_AD_TIME_KEY, this.lastAdTime.toString());
    } catch (error) {
      console.error('[Ads] Failed to save last ad time:', error);
    }
  }

  private setupAdListeners(): void {
    if (!AdMob || !InterstitialAdPluginEvents) return;

    AdMob.addListener(InterstitialAdPluginEvents.Loaded, () => {
      console.log('[Ads] Interstitial ad loaded');
      this.isAdReady = true;
    });

    AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, (error) => {
      console.error('[Ads] Failed to load interstitial ad:', error);
      this.isAdReady = false;
      setTimeout(() => this.preloadInterstitial(), 5000);
    });

    AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
      console.log('[Ads] Interstitial ad dismissed');
      this.isAdReady = false;
      this.preloadInterstitial();
    });

    AdMob.addListener(InterstitialAdPluginEvents.Showed, () => {
      console.log('[Ads] Interstitial ad showed');
      this.lastAdTime = Date.now();
      this.saveLastAdTime();
    });

    AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, (error) => {
      console.error('[Ads] Failed to show interstitial ad:', error);
      this.isAdReady = false;
      this.preloadInterstitial();
    });
  }

  private async preloadInterstitial(): Promise<void> {
    if (isWeb() || !this.pluginAvailable || !AdMob) {
      return;
    }

    try {
      const adUnitId = isAndroid()
        ? TEST_AD_UNIT_IDS.android
        : TEST_AD_UNIT_IDS.ios;

      await AdMob.prepareInterstitial({
        adId: adUnitId,
      });

      console.log('[Ads] Interstitial ad preloaded');
    } catch (error) {
      console.error('[Ads] Failed to preload interstitial ad:', error);
    }
  }

  private isInCooldown(): boolean {
    const timeSinceLastAd = Date.now() - this.lastAdTime;
    return timeSinceLastAd < AD_COOLDOWN_MS;
  }

  async checkAndShowAd(isPremium: boolean, actionType: ActionType): Promise<void> {
    if (isWeb()) {
      console.log('[Ads] Skipping ad - web platform');
      return;
    }

    if (!isNative()) {
      console.log('[Ads] Skipping ad - not native platform');
      return;
    }

    if (isPremium) {
      console.log('[Ads] Skipping ad - user has premium');
      return;
    }

    if (this.isInCooldown()) {
      const remainingTime = Math.ceil((AD_COOLDOWN_MS - (Date.now() - this.lastAdTime)) / 1000 / 60);
      console.log(`[Ads] Skipping ad - cooldown active (${remainingTime} minutes remaining)`);
      return;
    }

    const shouldShow = actionCounter.increment(actionType);

    if (!shouldShow) {
      console.log('[Ads] Not showing ad - action threshold not reached');
      return;
    }

    await this.showInterstitial(actionType);
  }

  private async showInterstitial(actionType: ActionType): Promise<void> {
    if (!this.initialized || !this.pluginAvailable || !AdMob) {
      console.log('[Ads] Not initialized or plugin unavailable - skipping ad');
      return;
    }

    if (!this.isAdReady) {
      console.log('[Ads] Ad not ready - preloading for next time');
      await this.preloadInterstitial();
      return;
    }

    try {
      console.log('[Ads] Showing interstitial ad');

      await this.trackImpression(actionType);

      await AdMob.showInterstitial();

      actionCounter.reset();

    } catch (error) {
      console.error('[Ads] Failed to show interstitial ad:', error);
      this.isAdReady = false;
      await this.preloadInterstitial();
    }
  }

  private async trackImpression(actionType: ActionType): Promise<void> {
    if (!this.currentUserId) {
      return;
    }

    try {
      const platform = isAndroid() ? 'android' : 'ios';
      const adUnitId = isAndroid()
        ? TEST_AD_UNIT_IDS.android
        : TEST_AD_UNIT_IDS.ios;

      await supabase
        .from('ad_impressions')
        .insert({
          user_id: this.currentUserId,
          platform,
          action_trigger: actionType,
          ad_unit_id: adUnitId,
        });

      console.log('[Ads] Impression tracked');
    } catch (error) {
      console.error('[Ads] Failed to track impression:', error);
    }
  }

  setUserId(userId: string | null): void {
    this.currentUserId = userId;
    rewardedAdsService.setUserId(userId);
  }

  getActionProgress(): { count: number; threshold: number; percentage: number } {
    return {
      count: actionCounter.getCount(),
      threshold: actionCounter.getThreshold(),
      percentage: actionCounter.getProgress(),
    };
  }
}

export const adsService = new AdsService();
