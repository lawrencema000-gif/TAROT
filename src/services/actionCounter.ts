import { appStorage } from '../lib/appStorage';

export type ActionType = 'reading' | 'quiz' | 'journal' | 'horoscope';

const STORAGE_KEYS = {
  sessionCount: 'arcana_session_count',
  lifetimeCompletions: 'arcana_lifetime_completions',
  dailyInterstitialCount: 'arcana_daily_interstitial_count',
  dailyInterstitialDate: 'arcana_daily_interstitial_date',
};

const SESSION_THRESHOLD = 2;
const DAILY_INTERSTITIAL_CAP = 3;
const GRACE_PERIOD_COMPLETIONS = 2;

class ActionCounterService {
  private sessionCount: number = 0;
  private lifetimeCompletions: number = 0;
  private dailyInterstitialCount: number = 0;
  private dailyInterstitialDate: string = '';
  private loaded = false;

  async init(): Promise<void> {
    if (this.loaded) return;
    this.sessionCount = parseInt((await appStorage.get(STORAGE_KEYS.sessionCount)) || '0', 10);
    this.lifetimeCompletions = parseInt((await appStorage.get(STORAGE_KEYS.lifetimeCompletions)) || '0', 10);

    const today = new Date().toISOString().split('T')[0];
    const storedDate = (await appStorage.get(STORAGE_KEYS.dailyInterstitialDate)) || '';

    if (storedDate === today) {
      this.dailyInterstitialCount = parseInt((await appStorage.get(STORAGE_KEYS.dailyInterstitialCount)) || '0', 10);
    } else {
      this.dailyInterstitialCount = 0;
      appStorage.set(STORAGE_KEYS.dailyInterstitialDate, today);
      appStorage.set(STORAGE_KEYS.dailyInterstitialCount, '0');
    }
    this.dailyInterstitialDate = today;
    this.loaded = true;
  }

  private save(): void {
    // Fire-and-forget — in-memory state is the source of truth
    appStorage.set(STORAGE_KEYS.sessionCount, this.sessionCount.toString());
    appStorage.set(STORAGE_KEYS.lifetimeCompletions, this.lifetimeCompletions.toString());
    appStorage.set(STORAGE_KEYS.dailyInterstitialCount, this.dailyInterstitialCount.toString());
    appStorage.set(STORAGE_KEYS.dailyInterstitialDate, this.dailyInterstitialDate);
  }

  private refreshDailyIfNeeded(): void {
    const today = new Date().toISOString().split('T')[0];
    if (this.dailyInterstitialDate !== today) {
      this.dailyInterstitialCount = 0;
      this.dailyInterstitialDate = today;
      this.save();
    }
  }

  increment(actionType: ActionType): boolean {
    this.lifetimeCompletions++;
    this.sessionCount++;
    this.save();

    console.log(
      `[ActionCounter] "${actionType}" completed. Sessions: ${this.sessionCount}/${SESSION_THRESHOLD}, ` +
      `Lifetime: ${this.lifetimeCompletions}, Daily ads: ${this.dailyInterstitialCount}/${DAILY_INTERSTITIAL_CAP}`
    );

    return this.shouldShowAd();
  }

  shouldShowAd(): boolean {
    this.refreshDailyIfNeeded();

    if (this.lifetimeCompletions <= GRACE_PERIOD_COMPLETIONS) {
      console.log(`[ActionCounter] Grace period active (${this.lifetimeCompletions}/${GRACE_PERIOD_COMPLETIONS})`);
      return false;
    }

    if (this.dailyInterstitialCount >= DAILY_INTERSTITIAL_CAP) {
      console.log(`[ActionCounter] Daily cap reached (${this.dailyInterstitialCount}/${DAILY_INTERSTITIAL_CAP})`);
      return false;
    }

    if (this.sessionCount < SESSION_THRESHOLD) {
      return false;
    }

    return true;
  }

  recordAdShown(): void {
    this.refreshDailyIfNeeded();
    this.sessionCount = 0;
    this.dailyInterstitialCount++;
    this.save();
    console.log(`[ActionCounter] Ad shown. Daily count: ${this.dailyInterstitialCount}/${DAILY_INTERSTITIAL_CAP}`);
  }

  reset(): void {
    this.sessionCount = 0;
    this.save();
  }

  getCount(): number {
    return this.sessionCount;
  }

  getThreshold(): number {
    return SESSION_THRESHOLD;
  }

  getProgress(): number {
    return Math.min((this.sessionCount / SESSION_THRESHOLD) * 100, 100);
  }

  getDailyAdCount(): number {
    this.refreshDailyIfNeeded();
    return this.dailyInterstitialCount;
  }

  getDailyCap(): number {
    return DAILY_INTERSTITIAL_CAP;
  }

  getLifetimeCompletions(): number {
    return this.lifetimeCompletions;
  }
}

export const actionCounter = new ActionCounterService();
