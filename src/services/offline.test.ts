/**
 * Sign-out and the per-account state on the device (p8 F52):
 *  - the free tier's 3-a-day reading count belongs to the account, so signing
 *    out and back in does not hand out three fresh readings, and the next
 *    account on the phone starts from its own count;
 *  - the device-wide playing-card lesson ticks are not inherited by the next
 *    account (cleared on sign-out, on every platform).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cartoLessonsKey,
  clearUserCache,
  dailyReadingKeys,
  getDailyReadingCount,
  incrementDailyReadingCount,
} from './offline';

const TODAY = '2026-10-17';

/**
 * Node 25 ships its own (file-less, broken) localStorage over jsdom's; give
 * the code a real one. Its items are listed by Object.keys(localStorage), as
 * in a browser, because appStorage.keys() reads them that way.
 */
function memoryStorage(): Storage {
  const items = new Map<string, string>();
  const api: Storage = {
    get length() { return items.size; },
    key: (i: number) => [...items.keys()][i] ?? null,
    getItem: (k: string) => items.get(k) ?? null,
    setItem: (k: string, v: string) => void items.set(k, String(v)),
    removeItem: (k: string) => void items.delete(k),
    clear: () => items.clear(),
  };
  return new Proxy(api, {
    ownKeys: () => [...items.keys()],
    getOwnPropertyDescriptor: (_target, k) =>
      typeof k === 'string' && items.has(k)
        ? { value: items.get(k), enumerable: true, configurable: true, writable: true }
        : undefined,
  });
}

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage());
  Object.defineProperty(window, 'localStorage', { value: globalThis.localStorage, configurable: true });
});

describe('the daily free-reading count', () => {
  it('survives sign-out: three readings, sign out, sign in — still three', async () => {
    for (let i = 0; i < 3; i++) await incrementDailyReadingCount('user-a', TODAY);
    expect(await getDailyReadingCount('user-a', TODAY)).toBe(3);
    await clearUserCache();
    expect(await getDailyReadingCount('user-a', TODAY)).toBe(3);
  });

  it('is per account: the next person on the phone starts from their own count', async () => {
    for (let i = 0; i < 3; i++) await incrementDailyReadingCount('user-a', TODAY);
    await clearUserCache();
    expect(await getDailyReadingCount('user-b', TODAY)).toBe(0);
    await incrementDailyReadingCount('user-b', TODAY);
    expect(await getDailyReadingCount('user-b', TODAY)).toBe(1);
    expect(await getDailyReadingCount('user-a', TODAY)).toBe(3);
  });

  it('starts again on a new local day', async () => {
    for (let i = 0; i < 3; i++) await incrementDailyReadingCount('user-a', TODAY);
    expect(await getDailyReadingCount('user-a', '2026-10-18')).toBe(0);
  });

  it('the device count of the build before (and of a signed-out guest) is not cleared on sign-out either', async () => {
    localStorage.setItem('arcana_daily_readings', '3');
    localStorage.setItem('arcana_daily_readings_date', TODAY);
    await clearUserCache();
    expect(await getDailyReadingCount(null, TODAY)).toBe(3);
    expect(dailyReadingKeys(null)).toEqual({ count: 'arcana_daily_readings', date: 'arcana_daily_readings_date' });
    expect(dailyReadingKeys('u1')).toEqual({ count: 'arcana_daily_readings:u1', date: 'arcana_daily_readings_date:u1' });
  });

  it('a garbage count reads as 0, not NaN', async () => {
    localStorage.setItem('arcana_daily_readings:user-a', 'x');
    localStorage.setItem('arcana_daily_readings_date:user-a', TODAY);
    expect(await getDailyReadingCount('user-a', TODAY)).toBe(0);
  });
});

describe('sign-out clears what belongs to the account', () => {
  it('the lesson ticks are not inherited by the next account', async () => {
    localStorage.setItem('arcana_carto_lessons', JSON.stringify(['the-deck-in-your-hand']));
    await clearUserCache();
    expect(localStorage.getItem('arcana_carto_lessons')).toBeNull();
    expect(cartoLessonsKey('u1')).toBe('arcana_carto_lessons:u1');
    expect(cartoLessonsKey(null)).toBe('arcana_carto_lessons');
  });

  it('per-user caches go, device preferences stay', async () => {
    localStorage.setItem('arcana_rewarded_ad_count', '2');
    localStorage.setItem('arcana_daily_ritual_user-a', '{}');
    localStorage.setItem('arcana_locale', 'ja');
    localStorage.setItem('arcana_carto_lessons:user-a', JSON.stringify(['the-four-suits']));
    await clearUserCache();
    expect(localStorage.getItem('arcana_rewarded_ad_count')).toBeNull();
    expect(localStorage.getItem('arcana_daily_ritual_user-a')).toBeNull();
    expect(localStorage.getItem('arcana_locale')).toBe('ja');
    // An account's own lesson key is that account's next sign-in, not the next account's.
    expect(localStorage.getItem('arcana_carto_lessons:user-a')).not.toBeNull();
  });
});
