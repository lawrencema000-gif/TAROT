import { isNative, isWeb, isAndroid } from '../utils/platform';
import { registerPlugin } from '@capacitor/core';
import { actionCounter, type ActionType } from './actionCounter';
import { supabase } from '../lib/supabase';
import { rewardedAdsService } from './rewardedAds';
import { appStorage } from '../lib/appStorage';

// Custom Capacitor plugin for App Open Ads (native Android only)
interface AppOpenAdPlugin {
  load(options: { adUnitId: string }): Promise<void>;
  show(): Promise<void>;
  isLoaded(): Promise<{ loaded: boolean }>;
}
const AppOpenAd = registerPlugin<AppOpenAdPlugin>('AppOpenAd');

const AD_COOLDOWN_MS = 10 * 60 * 1000;

// Google test ad unit IDs — used in dev builds or when env vars are missing
const TEST_AD_IDS = {
  interstitial: { android: 'ca-app-pub-3940256099942544/1033173712', ios: 'ca-app-pub-3940256099942544/4411468910' },
  banner: { android: 'ca-app-pub-3940256099942544/6300978111', ios: 'ca-app-pub-3940256099942544/2934735716' },
  appOpen: { android: 'ca-app-pub-3940256099942544/9257395921' },
};

const APP_OPEN_AD_ID = import.meta.env.PROD
  ? (import.meta.env.VITE_ADMOB_APPOPEN_ANDROID || TEST_AD_IDS.appOpen.android)
  : TEST_AD_IDS.appOpen.android;

const AD_UNIT_IDS = import.meta.env.PROD
  ? {
      interstitial: {
        android: import.meta.env.VITE_ADMOB_INTERSTITIAL_ANDROID || TEST_AD_IDS.interstitial.android,
        ios: import.meta.env.VITE_ADMOB_INTERSTITIAL_IOS || TEST_AD_IDS.interstitial.ios,
      },
      banner: {
        android: import.meta.env.VITE_ADMOB_BANNER_ANDROID || TEST_AD_IDS.banner.android,
        ios: import.meta.env.VITE_ADMOB_BANNER_IOS || TEST_AD_IDS.banner.ios,
      },
    }
  : TEST_AD_IDS;

const LAST_AD_TIME_KEY = 'arcana_last_ad_time';

let AdMob: typeof import('@capacitor-community/admob').AdMob | null = null;
let InterstitialAdPluginEvents: typeof import('@capacitor-community/admob').InterstitialAdPluginEvents | null = null;
let BannerAdSize: typeof import('@capacitor-community/admob').BannerAdSize | null = null;
let BannerAdPosition: typeof import('@capacitor-community/admob').BannerAdPosition | null = null;
let BannerAdPluginEvents: typeof import('@capacitor-community/admob').BannerAdPluginEvents | null = null;

async function loadAdMobPlugin(): Promise<boolean> {
  if (AdMob) return true;

  try {
    const admobModule = await import('@capacitor-community/admob');
    AdMob = admobModule.AdMob;
    InterstitialAdPluginEvents = admobModule.InterstitialAdPluginEvents;
    BannerAdSize = admobModule.BannerAdSize;
    BannerAdPosition = admobModule.BannerAdPosition;
    BannerAdPluginEvents = admobModule.BannerAdPluginEvents;
    return true;
  } catch (error) {
    console.warn('[Ads] AdMob plugin not available:', error);
    return false;
  }
}

class AdsService {
  private initialized = false;
  private lastAdTime = 0;
  private isInterstitialReady = false;
  private isBannerVisible = false;
  private currentUserId: string | null = null;
  private pluginAvailable = false;

  async initialize(userId: string | null = null): Promise<void> {
    if (isWeb()) {
      console.log('[Ads] Web platform - ads disabled');
      return;
    }

    if (this.initialized) return;

    this.currentUserId = userId;
    await actionCounter.init();

    try {
      this.pluginAvailable = await loadAdMobPlugin();

      if (!this.pluginAvailable || !AdMob) {
        console.log('[Ads] AdMob plugin not available');
        return;
      }

      await this.loadLastAdTime();

      await AdMob.initialize({
        testingDevices: [],
        initializeForTesting: false,
      });

      this.setupInterstitialListeners();
      this.setupBannerListeners();

      await this.preloadInterstitial();
      await rewardedAdsService.initialize(userId);

      this.initialized = true;
      console.log('[Ads] AdMob initialized');
    } catch (error) {
      console.error('[Ads] Failed to initialize:', error);
      this.pluginAvailable = false;
    }
  }

  private async loadLastAdTime(): Promise<void> {
    try {
      const stored = await appStorage.get(LAST_AD_TIME_KEY);
      this.lastAdTime = stored ? parseInt(stored, 10) : 0;
    } catch {
      this.lastAdTime = 0;
    }
  }

  private saveLastAdTime(): void {
    appStorage.set(LAST_AD_TIME_KEY, this.lastAdTime.toString());
  }

  private setupInterstitialListeners(): void {
    if (!AdMob || !InterstitialAdPluginEvents) return;

    AdMob.addListener(InterstitialAdPluginEvents.Loaded, () => {
      this.isInterstitialReady = true;
    });

    AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, () => {
      this.isInterstitialReady = false;
      setTimeout(() => this.preloadInterstitial(), 5000);
    });

    AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
      this.isInterstitialReady = false;
      this.preloadInterstitial();
    });

    AdMob.addListener(InterstitialAdPluginEvents.Showed, () => {
      this.lastAdTime = Date.now();
      this.saveLastAdTime();
    });

    AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () => {
      this.isInterstitialReady = false;
      this.preloadInterstitial();
    });
  }

  private async preloadInterstitial(): Promise<void> {
    if (isWeb() || !this.pluginAvailable || !AdMob) return;

    try {
      const adId = isAndroid()
        ? AD_UNIT_IDS.interstitial.android
        : AD_UNIT_IDS.interstitial.ios;

      await AdMob.prepareInterstitial({ adId });
    } catch (error) {
      console.error('[Ads] Failed to preload interstitial:', error);
    }
  }

  private setupBannerListeners(): void {
    if (!AdMob || !BannerAdPluginEvents) return;

    AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
      this.isBannerVisible = true;
    });

    AdMob.addListener(BannerAdPluginEvents.FailedToLoad, () => {
      this.isBannerVisible = false;
    });

    AdMob.addListener(BannerAdPluginEvents.Opened, () => {
      this.isBannerVisible = true;
    });

    AdMob.addListener(BannerAdPluginEvents.Closed, () => {
      this.isBannerVisible = false;
    });

    AdMob.addListener(BannerAdPluginEvents.AdImpression, () => {
      this.trackImpression('banner', 'banner');
    });
  }

  async showAppOpenAdOnColdStart(isPremium: boolean, isAdFree: boolean): Promise<void> {
    if (isWeb() || !isNative() || !isAndroid()) return;
    if (isPremium || isAdFree) return;

    try {
      await AppOpenAd.load({ adUnitId: APP_OPEN_AD_ID });
      await AppOpenAd.show();
      await this.trackImpression('banner', 'appopen');
      console.log('[Ads] App open ad shown');
    } catch (error) {
      console.warn('[Ads] App open ad failed:', error);
    }
  }

  private isInCooldown(): boolean {
    return Date.now() - this.lastAdTime < AD_COOLDOWN_MS;
  }

  async checkAndShowAd(isPremium: boolean, actionType: ActionType, isAdFree = false): Promise<void> {
    if (isWeb() || !isNative()) return;
    if (isPremium || isAdFree) return;

    if (this.isInCooldown()) {
      const remaining = Math.ceil((AD_COOLDOWN_MS - (Date.now() - this.lastAdTime)) / 60000);
      console.log(`[Ads] Cooldown active (${remaining}m remaining)`);
      actionCounter.increment(actionType);
      return;
    }

    const shouldShow = actionCounter.increment(actionType);
    if (!shouldShow) return;

    await this.showInterstitial(actionType);
  }

  private async showInterstitial(actionType: ActionType): Promise<void> {
    if (!this.initialized || !this.pluginAvailable || !AdMob) return;

    if (!this.isInterstitialReady) {
      await this.preloadInterstitial();
      return;
    }

    try {
      await this.trackImpression(actionType, 'interstitial');
      await AdMob.showInterstitial();
      actionCounter.recordAdShown();
    } catch (error) {
      console.error('[Ads] Failed to show interstitial:', error);
      this.isInterstitialReady = false;
      await this.preloadInterstitial();
    }
  }

  async showBanner(): Promise<void> {
    if (isWeb() || !this.pluginAvailable || !AdMob || !BannerAdSize || !BannerAdPosition) return;

    try {
      // Remove any stale banner before showing a fresh one
      if (this.isBannerVisible) {
        try { await AdMob.removeBanner(); } catch { /* ignore */ }
        this.isBannerVisible = false;
      }

      const adId = isAndroid()
        ? AD_UNIT_IDS.banner.android
        : AD_UNIT_IDS.banner.ios;

      await AdMob.showBanner({
        adId,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.TOP_CENTER,
        margin: 0,
        isTesting: false,
      });

      this.isBannerVisible = true;
      console.log('[Ads] Banner shown');
    } catch (error) {
      console.error('[Ads] Failed to show banner:', error);
      this.isBannerVisible = false;
    }
  }

  async hideBanner(): Promise<void> {
    if (!this.pluginAvailable || !AdMob) return;

    try {
      await AdMob.removeBanner();
    } catch (error) {
      console.error('[Ads] Failed to hide banner:', error);
    } finally {
      this.isBannerVisible = false;
    }
  }

  async removeBanner(): Promise<void> {
    if (!this.pluginAvailable || !AdMob) return;

    try {
      await AdMob.removeBanner();
    } catch (error) {
      console.error('[Ads] Failed to remove banner:', error);
    } finally {
      this.isBannerVisible = false;
    }
  }

  isBannerShowing(): boolean {
    return this.isBannerVisible;
  }

  private async trackImpression(actionType: ActionType | 'banner', adType: string): Promise<void> {
    if (!this.currentUserId) return;

    try {
      const platform = isAndroid() ? 'android' : 'ios';
      let adUnitId: string;
      if (adType === 'banner') {
        adUnitId = isAndroid() ? AD_UNIT_IDS.banner.android : AD_UNIT_IDS.banner.ios;
      } else {
        adUnitId = isAndroid() ? AD_UNIT_IDS.interstitial.android : AD_UNIT_IDS.interstitial.ios;
      }

      await supabase.from('ad_impressions').insert({
        user_id: this.currentUserId,
        platform,
        action_trigger: actionType,
        ad_unit_id: adUnitId,
      });
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
export type { ActionType } from './actionCounter';
