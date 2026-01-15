const ACTION_COUNT_KEY = 'arcana_action_count';
const LAST_ACTION_TIME_KEY = 'arcana_last_action_time';

export type ActionType = 'reading' | 'quiz' | 'journal';

const ACTION_THRESHOLD = 2;

class ActionCounterService {
  private count: number = 0;
  private lastActionTime: number = 0;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const storedCount = localStorage.getItem(ACTION_COUNT_KEY);
      const storedTime = localStorage.getItem(LAST_ACTION_TIME_KEY);

      this.count = storedCount ? parseInt(storedCount, 10) : 0;
      this.lastActionTime = storedTime ? parseInt(storedTime, 10) : 0;
    } catch (error) {
      console.error('Failed to load action counter from storage:', error);
      this.count = 0;
      this.lastActionTime = 0;
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(ACTION_COUNT_KEY, this.count.toString());
      localStorage.setItem(LAST_ACTION_TIME_KEY, this.lastActionTime.toString());
    } catch (error) {
      console.error('Failed to save action counter to storage:', error);
    }
  }

  increment(actionType: ActionType): boolean {
    this.count++;
    this.lastActionTime = Date.now();
    this.saveToStorage();

    console.log(`[ActionCounter] Action "${actionType}" recorded. Count: ${this.count}/${ACTION_THRESHOLD}`);

    return this.shouldShowAd();
  }

  shouldShowAd(): boolean {
    return this.count >= ACTION_THRESHOLD;
  }

  reset(): void {
    console.log('[ActionCounter] Resetting counter after ad shown');
    this.count = 0;
    this.saveToStorage();
  }

  getCount(): number {
    return this.count;
  }

  getThreshold(): number {
    return ACTION_THRESHOLD;
  }

  getProgress(): number {
    return Math.min((this.count / ACTION_THRESHOLD) * 100, 100);
  }
}

export const actionCounter = new ActionCounterService();
