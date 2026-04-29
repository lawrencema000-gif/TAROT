import { supabase } from '../lib/supabase';
import { isAndroid } from '../utils/platform';
import { newCorrelationId, CORRELATION_ID_HEADER } from '../utils/correlationId';

interface AdUnitConfig {
  adUnitId: string;
  isEnabled: boolean;
  settings: Record<string, unknown>;
}

interface DailyStats {
  date: string;
  totalImpressions: number;
  rewardedWatched: number;
  rewardedRemaining: number;
  byType: {
    banner: number;
    interstitial: number;
    rewarded: number;
    app_open: number;
  };
}

interface AdConfig {
  showAds: boolean;
  isPremium: boolean;
  isAdFree: boolean;
  adUnits: Record<string, AdUnitConfig>;
  dailyStats: DailyStats | null;
  timestamp: string;
}

type AdEventType = 'banner' | 'interstitial' | 'rewarded' | 'app_open';
type ActionTrigger = 'reading' | 'quiz' | 'journal' | 'app_launch' | 'navigation' | 'feature_unlock';

interface AdEvent {
  adType: AdEventType;
  platform: 'android' | 'ios';
  adUnitId: string;
  actionTrigger: ActionTrigger;
  durationMs?: number;
  completed?: boolean;
  clicked?: boolean;
  rewardAmount?: number;
  rewardType?: string;
  errorCode?: string;
}

// Env var fallbacks (used if backend config fetch fails). One pair per
// ad type — Google AdMob issues distinct ad-unit IDs per platform so we
// never share IDs across iOS/Android.
const ENV_FALLBACKS: Record<string, Record<string, string>> = {
  app_open: {
    android: import.meta.env.VITE_ADMOB_APPOPEN_ANDROID || '',
    ios: import.meta.env.VITE_ADMOB_APPOPEN_IOS || '',
  },
  interstitial: {
    android: import.meta.env.VITE_ADMOB_INTERSTITIAL_ANDROID || '',
    ios: import.meta.env.VITE_ADMOB_INTERSTITIAL_IOS || '',
  },
  banner: {
    android: import.meta.env.VITE_ADMOB_BANNER_ANDROID || '',
    ios: import.meta.env.VITE_ADMOB_BANNER_IOS || '',
  },
  rewarded: {
    android: import.meta.env.VITE_ADMOB_REWARDED_ANDROID || '',
    ios: import.meta.env.VITE_ADMOB_REWARDED_IOS || '',
  },
};

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
// Rewarded ads are unlimited per-day as of 2026-05-22; use a high sentinel
// so any legacy `rewardedRemaining > 0` check continues to pass.
const UNLIMITED_SENTINEL = 999999;

class AdConfigService {
  private config: AdConfig | null = null;
  private lastFetchTime = 0;
  private fetchPromise: Promise<AdConfig | null> | null = null;

  /**
   * Fetch ad config from backend. Caches for 5 minutes.
   * Returns null if fetch fails (callers should use env fallbacks).
   */
  async fetchConfig(): Promise<AdConfig | null> {
    // Return cached if fresh
    if (this.config && Date.now() - this.lastFetchTime < CACHE_TTL_MS) {
      return this.config;
    }

    // Deduplicate concurrent fetches
    if (this.fetchPromise) return this.fetchPromise;

    this.fetchPromise = this._doFetch();
    try {
      return await this.fetchPromise;
    } finally {
      this.fetchPromise = null;
    }
  }

  private async _doFetch(): Promise<AdConfig | null> {
    try {
      const platform = isAndroid() ? 'android' : 'ios';
      const correlationId = newCorrelationId('ad-config');
      const { data, error } = await supabase.functions.invoke('ad-config', {
        body: { platform },
        headers: { [CORRELATION_ID_HEADER]: correlationId },
      });

      if (error) {
        console.warn('[AdConfig] Failed to fetch:', error.message);
        return this.config; // return stale cache if available
      }

      this.config = data as AdConfig;
      this.lastFetchTime = Date.now();
      console.log('[AdConfig] Loaded from backend:', {
        showAds: this.config.showAds,
        units: Object.keys(this.config.adUnits || {}),
        rewardedRemaining: this.config.dailyStats?.rewardedRemaining,
      });
      return this.config;
    } catch (err) {
      console.warn('[AdConfig] Fetch error:', err);
      return this.config;
    }
  }

  /**
   * Get the ad unit ID for a given ad type.
   * Uses backend config if available, falls back to env vars.
   */
  getAdUnitId(adType: AdEventType): string {
    const platform = isAndroid() ? 'android' : 'ios';

    // Try backend config first
    if (this.config?.adUnits?.[adType]) {
      const unit = this.config.adUnits[adType];
      if (unit.isEnabled && unit.adUnitId) {
        return unit.adUnitId;
      }
    }

    // Fallback to env vars
    return ENV_FALLBACKS[adType]?.[platform] || '';
  }

  /** Whether ads should be shown (from backend config) */
  shouldShowAds(): boolean | null {
    if (!this.config) return null; // unknown, let caller decide
    return this.config.showAds;
  }

  /** Get server-authoritative remaining rewarded ad watches for today */
  getRewardedRemaining(): number {
    if (!this.config?.dailyStats) return UNLIMITED_SENTINEL; // assume full if no data
    return Math.max(0, this.config.dailyStats.rewardedRemaining);
  }

  /** Get full daily stats */
  getDailyStats(): DailyStats | null {
    return this.config?.dailyStats || null;
  }

  /** Invalidate cache so next call fetches fresh data */
  invalidate(): void {
    this.lastFetchTime = 0;
  }

  /**
   * Send ad events to the backend via the ad-events edge function.
   * Batches events for efficiency. Returns success count.
   */
  async sendEvents(events: AdEvent[]): Promise<number> {
    if (events.length === 0) return 0;

    try {
      const correlationId = newCorrelationId('ad-events');
      const { data, error } = await supabase.functions.invoke('ad-events', {
        body: { events },
        headers: { [CORRELATION_ID_HEADER]: correlationId },
      });

      if (error) {
        console.warn('[AdConfig] Failed to send events:', error.message);
        return 0;
      }

      return data?.success || 0;
    } catch (err) {
      console.warn('[AdConfig] Send events error:', err);
      return 0;
    }
  }

  /** Convenience: send a single ad event */
  async trackEvent(
    adType: AdEventType,
    actionTrigger: ActionTrigger,
    extra?: Partial<Omit<AdEvent, 'adType' | 'platform' | 'adUnitId' | 'actionTrigger'>>
  ): Promise<void> {
    const platform = isAndroid() ? 'android' : 'ios';
    const adUnitId = this.getAdUnitId(adType);

    await this.sendEvents([{
      adType,
      platform,
      adUnitId,
      actionTrigger,
      ...extra,
    }]);
  }
}

export const adConfigService = new AdConfigService();
export type { AdConfig, AdUnitConfig, DailyStats, AdEvent, AdEventType, ActionTrigger };
