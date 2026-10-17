import type { EnhancedHoroscope, TarotCard, ZodiacSign } from '../types';
import { appStorage } from '../lib/appStorage';
import { localDateStr } from '../utils/localDate';

const CACHE_KEYS = {
  DAILY_HOROSCOPE: 'arcana_daily_horoscope',
  LAST_CARD: 'arcana_last_card',
  LAST_READING: 'arcana_last_reading',
  USER_PROFILE: 'arcana_user_profile',
  CACHE_TIMESTAMP: 'arcana_cache_timestamp',
  DAILY_RITUAL: 'arcana_daily_ritual',
};

const CACHE_DURATION = 24 * 60 * 60 * 1000;

interface CachedData<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

async function setCache<T>(key: string, data: T, duration = CACHE_DURATION): Promise<void> {
  try {
    const cached: CachedData<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + duration,
    };
    await appStorage.set(key, JSON.stringify(cached));
  } catch (err) {
    console.warn('Failed to cache data:', err);
  }
}

async function getCache<T>(key: string): Promise<T | null> {
  try {
    const stored = await appStorage.get(key);
    if (!stored) return null;

    const cached: CachedData<T> = JSON.parse(stored);
    if (!cached || typeof cached.expiresAt !== 'number') {
      // Corrupted data — remove and return null
      await appStorage.remove(key);
      return null;
    }
    if (Date.now() > cached.expiresAt) {
      await appStorage.remove(key);
      return null;
    }

    return cached.data;
  } catch {
    // Corrupted JSON — clean up so it doesn't fail on every subsequent read
    await appStorage.remove(key).catch(() => {});
    return null;
  }
}

async function getCacheWithMeta<T>(key: string): Promise<CachedData<T> | null> {
  try {
    const stored = await appStorage.get(key);
    if (!stored) return null;

    const cached: CachedData<T> = JSON.parse(stored);
    if (!cached || typeof cached.expiresAt !== 'number') {
      await appStorage.remove(key);
      return null;
    }
    return cached;
  } catch {
    await appStorage.remove(key).catch(() => {});
    return null;
  }
}

export async function cacheDailyHoroscope(sign: ZodiacSign, horoscope: EnhancedHoroscope): Promise<void> {
  const key = `${CACHE_KEYS.DAILY_HOROSCOPE}_${sign}`;
  await setCache(key, horoscope);
}

export async function getCachedDailyHoroscope(sign: ZodiacSign): Promise<EnhancedHoroscope | null> {
  const key = `${CACHE_KEYS.DAILY_HOROSCOPE}_${sign}`;
  return getCache<EnhancedHoroscope>(key);
}

export async function cacheLastViewedCard(card: TarotCard, reversed: boolean): Promise<void> {
  await setCache(CACHE_KEYS.LAST_CARD, { card, reversed });
}

export async function getCachedLastViewedCard(): Promise<{ card: TarotCard; reversed: boolean } | null> {
  return getCache(CACHE_KEYS.LAST_CARD);
}

export interface CachedReading {
  id: string;
  spreadType: string;
  cards: { card: TarotCard; position: string; reversed: boolean }[];
  interpretation: string;
  date: string;
}

export async function cacheLastReading(reading: CachedReading): Promise<void> {
  await setCache(CACHE_KEYS.LAST_READING, reading);
}

export async function getCachedLastReading(): Promise<CachedReading | null> {
  return getCache(CACHE_KEYS.LAST_READING);
}

export interface CachedProfile {
  id: string;
  displayName: string;
  sign: ZodiacSign;
  goals: string[];
  isPremium: boolean;
}

export async function cacheUserProfile(profile: CachedProfile): Promise<void> {
  await setCache(CACHE_KEYS.USER_PROFILE, profile, 7 * 24 * 60 * 60 * 1000);
}

export async function getCachedUserProfile(): Promise<CachedProfile | null> {
  return getCache(CACHE_KEYS.USER_PROFILE);
}

export interface CachedRitualState {
  horoscopeViewed: boolean;
  tarotViewed: boolean;
  promptViewed: boolean;
  completed: boolean;
  /** The user's LOCAL calendar date (localDateStr) — the same basis as
   *  daily_rituals.date, so the cached night is the night the row is for. */
  date: string;
}

/** One entry per user; `state.date` says which local day it describes. */
export async function cacheDailyRitual(userId: string, state: CachedRitualState): Promise<void> {
  const key = `${CACHE_KEYS.DAILY_RITUAL}_${userId}`;
  await setCache(key, state);
}

/** The cached ritual for `date` (a local calendar date), or null if the entry is for another day. */
export async function getCachedDailyRitual(userId: string, date: string): Promise<CachedRitualState | null> {
  const key = `${CACHE_KEYS.DAILY_RITUAL}_${userId}`;
  const cached = await getCache<CachedRitualState>(key);
  if (cached && cached.date === date) return cached;
  return null;
}

// ── The free tier's daily reading allowance ────────────────────────────────
// Three readings a local day, counted on the device. The count belongs to the
// ACCOUNT: it is keyed by user id, so signing out and back in does not hand
// out three fresh readings, and a second person signing in on the same phone
// starts from their own count (p8 F52). Signed out, the device keys of before
// count (the guest's allowance). These keys are deliberately NOT cleared on
// sign-out. TarotSection and CartomancySection share this one count.

const DAILY_READINGS_KEY = 'arcana_daily_readings';
const DAILY_READINGS_DATE_KEY = 'arcana_daily_readings_date';

/** The storage keys of one account's daily count (the device's when signed out). */
export function dailyReadingKeys(userId?: string | null): { count: string; date: string } {
  return userId
    ? { count: `${DAILY_READINGS_KEY}:${userId}`, date: `${DAILY_READINGS_DATE_KEY}:${userId}` }
    : { count: DAILY_READINGS_KEY, date: DAILY_READINGS_DATE_KEY };
}

/** Readings this account has started today (its local day); 0 on a new day. */
export async function getDailyReadingCount(userId?: string | null, today: string = localDateStr()): Promise<number> {
  try {
    const keys = dailyReadingKeys(userId);
    const storedDate = await appStorage.get(keys.date);
    if (storedDate !== today) {
      await appStorage.set(keys.date, today);
      await appStorage.set(keys.count, '0');
      return 0;
    }
    const n = parseInt((await appStorage.get(keys.count)) || '0', 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

/** Count one more reading for this account today. */
export async function incrementDailyReadingCount(userId?: string | null, today: string = localDateStr()): Promise<void> {
  try {
    const current = await getDailyReadingCount(userId, today);
    const keys = dailyReadingKeys(userId);
    await appStorage.set(keys.date, today);
    await appStorage.set(keys.count, (current + 1).toString());
  } catch {
    // silent
  }
}

/**
 * Where an account's playing-card lesson ticks belong ("1 of 12 lessons
 * done"). cartoFlow.ts keeps them under the device key `arcana_carto_lessons`
 * today, which the next account on the phone inherited (p8 F52); that key is
 * cleared on sign-out below until the lessons move to this per-account key.
 */
export function cartoLessonsKey(userId?: string | null): string {
  return userId ? `arcana_carto_lessons:${userId}` : 'arcana_carto_lessons';
}

// Keys that identify per-user state and must be cleared on sign-out
// to prevent User A's data leaking into User B's session. Device-level
// preferences (onboarding, locale, anon_id, attribution) are preserved.
// The daily reading allowance is not here: it is keyed by account above.
const PER_USER_EXACT_KEYS = [
  'arcana_rewarded_ad_count',
  'arcana_rewarded_ad_date',
  'arcana_last_ad_time',
  'arcana_session_count',
  'arcana_lifetime_completions',
  'arcana_daily_interstitial_count',
  'arcana_daily_interstitial_date',
  'arcana_guest_saved',
  'arcana_guest_history',
  'arcana_guest_favorites',
];

/**
 * Per-user keys a module writes straight to window.localStorage on every
 * platform, which appStorage (Capacitor Preferences on native) does not
 * reach: cartoFlow's device-wide lesson ticks, which are not the next
 * account's (p8 F52).
 */
const PER_USER_LOCAL_STORAGE_KEYS = ['arcana_carto_lessons'];

const PER_USER_PREFIXES = [
  'arcana_daily_horoscope_',
  'arcana_daily_ritual_',
  'arcana_horoscope_xp_',
];

export async function clearUserCache(): Promise<void> {
  for (const key of Object.values(CACHE_KEYS)) {
    if (key.startsWith('arcana_')) {
      await appStorage.remove(key);
    }
  }

  for (const key of PER_USER_EXACT_KEYS) {
    await appStorage.remove(key);
  }
  for (const key of PER_USER_LOCAL_STORAGE_KEYS) {
    try {
      if (typeof window !== 'undefined') window.localStorage?.removeItem(key);
    } catch {
      // storage blocked: nothing was kept there either
    }
  }

  const allKeys = await appStorage.keys();
  for (const key of allKeys) {
    if (PER_USER_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      await appStorage.remove(key);
    }
  }
}

export function isOnline(): boolean {
  return navigator.onLine;
}

export function addOnlineListener(callback: () => void): () => void {
  window.addEventListener('online', callback);
  return () => window.removeEventListener('online', callback);
}

export function addOfflineListener(callback: () => void): () => void {
  window.addEventListener('offline', callback);
  return () => window.removeEventListener('offline', callback);
}

export async function getCacheAge(key: string): Promise<number | null> {
  const cached = await getCacheWithMeta(key);
  if (!cached) return null;
  return Date.now() - cached.timestamp;
}

export async function isCacheStale(key: string, maxAge = CACHE_DURATION): Promise<boolean> {
  const age = await getCacheAge(key);
  if (age === null) return true;
  return age > maxAge;
}

export async function withOfflineFallback<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  cacheDuration = CACHE_DURATION
): Promise<{ data: T; fromCache: boolean }> {
  if (!isOnline()) {
    const cached = await getCache<T>(cacheKey);
    if (cached) {
      return { data: cached, fromCache: true };
    }
    throw new Error('No network connection and no cached data available');
  }

  try {
    const data = await fetchFn();
    await setCache(cacheKey, data, cacheDuration);
    return { data, fromCache: false };
  } catch (err) {
    const cached = await getCache<T>(cacheKey);
    if (cached) {
      return { data: cached, fromCache: true };
    }
    throw err;
  }
}

export async function preloadEssentialData(sign: ZodiacSign): Promise<void> {
  const horoscopeKey = `${CACHE_KEYS.DAILY_HOROSCOPE}_${sign}`;
  const horoscope = await getCache(horoscopeKey);

  if (!horoscope && isOnline()) {
    console.log('Preloading horoscope data for offline use');
  }
}

export async function getOfflineStatus(): Promise<{
  isOnline: boolean;
  hasCachedHoroscope: boolean;
  hasCachedCard: boolean;
  hasCachedProfile: boolean;
  cacheSize: number;
}> {
  let cacheSize = 0;
  const allKeys = await appStorage.keys();
  for (const key of allKeys) {
    if (key.startsWith('arcana_')) {
      const value = await appStorage.get(key);
      if (value) {
        cacheSize += value.length * 2;
      }
    }
  }

  return {
    isOnline: isOnline(),
    hasCachedHoroscope: allKeys.some(k => k.startsWith('arcana_daily_horoscope_')),
    hasCachedCard: !!(await getCache(CACHE_KEYS.LAST_CARD)),
    hasCachedProfile: !!(await getCache(CACHE_KEYS.USER_PROFILE)),
    cacheSize,
  };
}

export function formatCacheSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
