import type { EnhancedHoroscope, TarotCard, ZodiacSign } from '../types';

const CACHE_KEYS = {
  DAILY_HOROSCOPE: 'stellara_daily_horoscope',
  LAST_CARD: 'stellara_last_card',
  LAST_READING: 'stellara_last_reading',
  USER_PROFILE: 'stellara_user_profile',
  CACHE_TIMESTAMP: 'stellara_cache_timestamp',
};

const CACHE_DURATION = 24 * 60 * 60 * 1000;

interface CachedData<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

function setCache<T>(key: string, data: T, duration = CACHE_DURATION): void {
  try {
    const cached: CachedData<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + duration,
    };
    localStorage.setItem(key, JSON.stringify(cached));
  } catch (err) {
    console.warn('Failed to cache data:', err);
  }
}

function getCache<T>(key: string): T | null {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const cached: CachedData<T> = JSON.parse(stored);
    if (Date.now() > cached.expiresAt) {
      localStorage.removeItem(key);
      return null;
    }

    return cached.data;
  } catch {
    return null;
  }
}

function getCacheWithMeta<T>(key: string): CachedData<T> | null {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const cached: CachedData<T> = JSON.parse(stored);
    return cached;
  } catch {
    return null;
  }
}

function clearCache(key: string): void {
  localStorage.removeItem(key);
}

export function cacheDailyHoroscope(sign: ZodiacSign, horoscope: EnhancedHoroscope): void {
  const key = `${CACHE_KEYS.DAILY_HOROSCOPE}_${sign}`;
  setCache(key, horoscope);
}

export function getCachedDailyHoroscope(sign: ZodiacSign): EnhancedHoroscope | null {
  const key = `${CACHE_KEYS.DAILY_HOROSCOPE}_${sign}`;
  return getCache<EnhancedHoroscope>(key);
}

export function cacheLastViewedCard(card: TarotCard, reversed: boolean): void {
  setCache(CACHE_KEYS.LAST_CARD, { card, reversed });
}

export function getCachedLastViewedCard(): { card: TarotCard; reversed: boolean } | null {
  return getCache(CACHE_KEYS.LAST_CARD);
}

export interface CachedReading {
  id: string;
  spreadType: string;
  cards: { card: TarotCard; position: string; reversed: boolean }[];
  interpretation: string;
  date: string;
}

export function cacheLastReading(reading: CachedReading): void {
  setCache(CACHE_KEYS.LAST_READING, reading);
}

export function getCachedLastReading(): CachedReading | null {
  return getCache(CACHE_KEYS.LAST_READING);
}

export interface CachedProfile {
  id: string;
  displayName: string;
  sign: ZodiacSign;
  goals: string[];
  isPremium: boolean;
}

export function cacheUserProfile(profile: CachedProfile): void {
  setCache(CACHE_KEYS.USER_PROFILE, profile, 7 * 24 * 60 * 60 * 1000);
}

export function getCachedUserProfile(): CachedProfile | null {
  return getCache(CACHE_KEYS.USER_PROFILE);
}

export function clearUserCache(): void {
  Object.values(CACHE_KEYS).forEach(key => {
    if (key.startsWith('stellara_')) {
      localStorage.removeItem(key);
    }
  });

  const allKeys = Object.keys(localStorage);
  allKeys.forEach(key => {
    if (key.startsWith('stellara_daily_horoscope_')) {
      localStorage.removeItem(key);
    }
  });
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

export function getCacheAge(key: string): number | null {
  const cached = getCacheWithMeta(key);
  if (!cached) return null;
  return Date.now() - cached.timestamp;
}

export function isCacheStale(key: string, maxAge = CACHE_DURATION): boolean {
  const age = getCacheAge(key);
  if (age === null) return true;
  return age > maxAge;
}

export async function withOfflineFallback<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  cacheDuration = CACHE_DURATION
): Promise<{ data: T; fromCache: boolean }> {
  if (!isOnline()) {
    const cached = getCache<T>(cacheKey);
    if (cached) {
      return { data: cached, fromCache: true };
    }
    throw new Error('No network connection and no cached data available');
  }

  try {
    const data = await fetchFn();
    setCache(cacheKey, data, cacheDuration);
    return { data, fromCache: false };
  } catch (err) {
    const cached = getCache<T>(cacheKey);
    if (cached) {
      return { data: cached, fromCache: true };
    }
    throw err;
  }
}

export function preloadEssentialData(sign: ZodiacSign): void {
  const horoscopeKey = `${CACHE_KEYS.DAILY_HOROSCOPE}_${sign}`;
  const horoscope = getCache(horoscopeKey);

  if (!horoscope && isOnline()) {
    console.log('Preloading horoscope data for offline use');
  }
}

export function getOfflineStatus(): {
  isOnline: boolean;
  hasCachedHoroscope: boolean;
  hasCachedCard: boolean;
  hasCachedProfile: boolean;
  cacheSize: number;
} {
  let cacheSize = 0;
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('stellara_')) {
      const value = localStorage.getItem(key);
      if (value) {
        cacheSize += value.length * 2;
      }
    }
  });

  return {
    isOnline: isOnline(),
    hasCachedHoroscope: Object.keys(localStorage).some(k =>
      k.startsWith('stellara_daily_horoscope_')
    ),
    hasCachedCard: !!getCache(CACHE_KEYS.LAST_CARD),
    hasCachedProfile: !!getCache(CACHE_KEYS.USER_PROFILE),
    cacheSize,
  };
}

export function formatCacheSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
