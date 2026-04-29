import { isNative, isWeb } from '../utils/platform';
import { registerPlugin } from '@capacitor/core';
import { actionCounter, type ActionType } from './actionCounter';
import { rewardedAdsService } from './rewardedAds';
import { adConfigService } from './adConfig';
import { appStorage } from '../lib/appStorage';
import { supabase } from '../lib/supabase';

// Cached forced-ads flag. Refetched at most once every 5 minutes so
// flipping the feature_flags row in the DB takes effect within minutes
// without requiring an app redeploy. Rewarded ads (the moonstone-earn
// flow) are NOT gated by this flag — they're user-initiated, opt-in.
const FORCED_ADS_FLAG_KEY = 'forced-ads-enabled';
const FORCED_ADS_TTL_MS = 5 * 60 * 1000;
let cachedForcedAdsEnabled: boolean | null = null;
let cachedForcedAdsAt = 0;

async function isForcedAdsEnabled(): Promise<boolean> {
  if (cachedForcedAdsEnabled !== null && Date.now() - cachedForcedAdsAt < FORCED_ADS_TTL_MS) {
    return cachedForcedAdsEnabled;
  }
  try {
    const { data } = await supabase
      .from('feature_flags')
      .select('enabled')
      .eq('key', FORCED_ADS_FLAG_KEY)
      .maybeSingle();
    // Default to FALSE if the flag is missing — fail closed (no ads)
    // is the safer default while we have the flag paused.
    cachedForcedAdsEnabled = (data?.enabled as boolean | undefined) ?? false;
    cachedForcedAdsAt = Date.now();
  } catch {
    cachedForcedAdsEnabled = false;
    cachedForcedAdsAt = Date.now();
  }
  return cachedForcedAdsEnabled ?? false;
}

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
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
  app_open: 'ca-app-pub-3940256099942544/9257395921',
};

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
  private isInterstitialReady = false;
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

      // Timeout: don't let AdMob init hang the app
      await Promise.race([
        AdMob.initialize({ testingDevices: [], initializeForTesting: USE_TEST_ADS }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('AdMob init timeout')), 10000)),
      ]);

      if (USE_TEST_ADS) {
        console.log('[Ads] Running in TEST mode — using Google test ad units');
      }

      this.setupInterstitialListeners();

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
    return adConfigService.getAdUnitId(adType as 'interstitial' | 'rewarded' | 'app_open');
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

  async showAppOpenAdOnColdStart(isPremium: boolean, isAdFree: boolean): Promise<void> {
    if (isWeb() || !isNative()) return;
    if (isPremium || isAdFree) return;
    // Forced ads (interstitial + app-open) are paused — only rewarded
    // ads (the moonstone-earn flow) are still active. Toggle this in
    // the feature_flags table to re-enable.
    if (!(await isForcedAdsEnabled())) {
      console.log('[Ads] App-open ad skipped — forced-ads-enabled flag is OFF');
      return;
    }

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
    // Forced ads paused — see header comment in this file. Action
    // counter still increments so we have visibility into how many
    // ads WOULD have shown if re-enabled later.
    if (!(await isForcedAdsEnabled())) {
      actionCounter.increment(actionType);
      return;
    }

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
