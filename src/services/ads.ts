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

      // Fetch ad config from backend (non-blocking — uses env fallbacks if it fails)
      adConfigService.fetchConfig().catch(() => {});

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
      const adId = adConfigService.getAdUnitId('interstitial');
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
      const adUnitId = adConfigService.getAdUnitId('app_open');
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

      const adId = adConfigService.getAdUnitId('banner');

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

  setUserId(userId: string | null): void {
    this.currentUserId = userId;
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
