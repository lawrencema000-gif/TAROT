import type { EnhancedHoroscope, TarotCard, ZodiacSign } from '../types';
import { appStorage } from '../lib/appStorage';

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
    if (Date.now() > cached.expiresAt) {
      await appStorage.remove(key);
      return null;
    }

    return cached.data;
  } catch {
    return null;
  }
}

async function getCacheWithMeta<T>(key: string): Promise<CachedData<T> | null> {
  try {
    const stored = await appStorage.get(key);
    if (!stored) return null;

    const cached: CachedData<T> = JSON.parse(stored);
    return cached;
  } catch {
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
  date: string;
}

export async function cacheDailyRitual(userId: string, state: CachedRitualState): Promise<void> {
  const key = `${CACHE_KEYS.DAILY_RITUAL}_${userId}`;
  await setCache(key, state);
}

export async function getCachedDailyRitual(userId: string, date: string): Promise<CachedRitualState | null> {
  const key = `${CACHE_KEYS.DAILY_RITUAL}_${userId}`;
  const cached = await getCache<CachedRitualState>(key);
  if (cached && cached.date === date) return cached;
  return null;
}

export async function clearUserCache(): Promise<void> {
  for (const key of Object.values(CACHE_KEYS)) {
    if (key.startsWith('arcana_')) {
      await appStorage.remove(key);
    }
  }

  const allKeys = await appStorage.keys();
  for (const key of allKeys) {
    if (key.startsWith('arcana_daily_horoscope_')) {
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
