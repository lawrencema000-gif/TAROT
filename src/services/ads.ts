import { isNative, isWeb, isAndroid } from '../utils/platform';
import { registerPlugin } from '@capacitor/core';
import { actionCounter, type ActionType } from './actionCounter';
import { rewardedAdsService } from './rewardedAds';
import { adConfigService } from './adConfig';
import { appStorage } from '../lib/appStorage';

// Custom Capacitor plugin for App Open Ads (native Android only)
interface AppOpenAdPlugin {
  load(options: { adUnitId: string }): Promise<void>;
  show(): Promise<void>;
  isLoaded(): Promise<{ loaded: boolean }>;
}
const AppOpenAd = registerPlugin<AppOpenAdPlugin>('AppOpenAd');

const AD_COOLDOWN_MS = 10 * 60 * 1000;
const LAST_AD_TIME_KEY = 'arcana_last_ad_time';
// Uses test ads by default. Set VITE_USE_TEST_ADS=false for production (app must be on Play Store)
const USE_TEST_ADS = import.meta.env.VITE_USE_TEST_ADS !== 'false';

// Google's official test ad unit IDs — always return test ads
const TEST_AD_UNITS: Record<string, string> = {
  banner: 'ca-app-pub-3940256099942544/6300978111',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
  app_open: 'ca-app-pub-3940256099942544/9257395921',
};

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
  private pluginAvailable = false;

  async initialize(userId: string | null = null): Promise<void> {
    if (isWeb()) {
      console.log('[Ads] Web platform - ads disabled');
      return;
    }

    if (this.initialized) return;

    await actionCounter.init();

    try {
      this.pluginAvailable = await loadAdMobPlugin();

      if (!this.pluginAvailable || !AdMob) {
        console.log('[Ads] AdMob plugin not available');
        return;
      }

      await this.loadLastAdTime();

      // Fetch ad config from backend (non-blocking — uses env fallbacks if it fails)
      adConfigService.fetchConfig().catch(() => {});

      await AdMob.initialize({
        testingDevices: [],
        initializeForTesting: USE_TEST_ADS,
      });

      if (USE_TEST_ADS) {
        console.log('[Ads] Running in DEBUG mode — using Google test ad units');
      }

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

  /** Get ad unit ID — test IDs in debug builds, production IDs in release */
  private getAdId(adType: string): string {
    if (USE_TEST_ADS) {
      return TEST_AD_UNITS[adType] || '';
    }
    return adConfigService.getAdUnitId(adType as 'banner' | 'interstitial' | 'rewarded' | 'app_open');
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
      const adId = this.getAdId('interstitial');
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

    AdMob.addListener(BannerAdPluginEvents.FailedToLoad, (info) => {
      console.warn('[Ads] Banner failed to load:', info);
      this.isBannerVisible = false;
      // Must remove banner to clear the native view (prevents black rectangle)
      AdMob?.removeBanner().catch(() => {});
    });

    AdMob.addListener(BannerAdPluginEvents.Opened, () => {
      this.isBannerVisible = true;
    });

    AdMob.addListener(BannerAdPluginEvents.Closed, () => {
      this.isBannerVisible = false;
    });

    AdMob.addListener(BannerAdPluginEvents.AdImpression, () => {
      // Track banner impression via backend
      adConfigService.trackEvent('banner', 'navigation');
    });
  }

  async showAppOpenAdOnColdStart(isPremium: boolean, isAdFree: boolean): Promise<void> {
    if (isWeb() || !isNative() || !isAndroid()) return;
    if (isPremium || isAdFree) return;

    try {
      const adUnitId = this.getAdId('app_open');
      if (!adUnitId) return;

      await AppOpenAd.load({ adUnitId });
      await AppOpenAd.show();
      // Track as app_open type with app_launch trigger
      await adConfigService.trackEvent('app_open', 'app_launch');
      console.log('[Ads] App open ad shown');
    } catch (error) {
      console.warn('[Ads] App open ad failed:', error);
    }
  }

  private isInCooldown(): boolean {
    return Date.now() - this.lastAdTime < AD_COOLDOWN_MS;
  }

  private mapActionToTrigger(actionType: ActionType): 'reading' | 'quiz' | 'journal' | 'navigation' {
    const map: Record<ActionType, 'reading' | 'quiz' | 'journal' | 'navigation'> = {
      reading: 'reading',
      quiz: 'quiz',
      journal: 'journal',
      horoscope: 'navigation',
    };
    return map[actionType] || 'navigation';
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
      await AdMob.showInterstitial();
      // Track impression AFTER successful display
      await adConfigService.trackEvent('interstitial', this.mapActionToTrigger(actionType));
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
      if (this.isBannerVisible) {
        try { await AdMob.removeBanner(); } catch { /* ignore */ }
        this.isBannerVisible = false;
      }

      const adId = this.getAdId('banner');

      await AdMob.showBanner({
        adId,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        margin: 0,
        isTesting: false,
      });

      this.isBannerVisible = true;
      console.log('[Ads] Banner shown');
    } catch (error) {
      console.error('[Ads] Failed to show banner:', error);
      this.isBannerVisible = false;
      // Remove the native banner view to prevent black rectangle on failure
      try { await AdMob.removeBanner(); } catch { /* ignore */ }
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

  setUserId(userId: string | null): void {
    rewardedAdsService.setUserId(userId);
    // Refresh config now that we have a user (gets premium status + daily stats)
    if (userId) {
      adConfigService.invalidate();
      adConfigService.fetchConfig().catch(() => {});
    }
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
