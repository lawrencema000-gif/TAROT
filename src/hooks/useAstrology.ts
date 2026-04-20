import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getLocale } from '../i18n/config';
import i18n from '../i18n/config';
const tErr = (key: string, fallback: string) => i18n.t(`astrologyErrors.${key}`, { ns: 'app', defaultValue: fallback });
import { newCorrelationId, CORRELATION_ID_HEADER } from '../utils/correlationId';
import { apiCall, ApiError, ApiContractError } from '../lib/apiClient';
import { DailyResponse, WeeklyResponse, MonthlyResponse, TransitCalendarResponse } from '../schema';
import type { NatalChart, DailyContent, WeeklyContent, MonthlyContent, TransitEvent } from '../types/astrology';

const API_BASE = import.meta.env.VITE_SUPABASE_URL + '/functions/v1';
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ── In-memory cache (survives tab switches, clears on page reload) ──
const cache: Record<string, { data: unknown; ts: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached<T>(key: string): T | null {
  const entry = cache[key];
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data as T;
  return null;
}
function setCache(key: string, data: unknown) {
  cache[key] = { data, ts: Date.now() };
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('You must be signed in to view horoscopes. Please log in and try again.');
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
    'apikey': ANON_KEY,
  };
}

async function callFn<T>(name: string, body?: Record<string, unknown>): Promise<T> {
  const headers = await getAuthHeaders();
  // Per-call correlation ID — mirrored back in the response's X-Correlation-Id
  // header and present on every edge-function log line, so Sentry events can
  // pivot to the exact server log entry that produced them.
  const correlationId = newCorrelationId(`astrology:${name}`);
  headers[CORRELATION_ID_HEADER] = correlationId;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  // Always include the current locale so astrology functions can localize content
  const payload = { ...(body ?? {}), locale: getLocale() };
  try {
    const res = await fetch(`${API_BASE}/${name}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) {
      // On 401, try once with a refreshed session
      if (res.status === 401) {
        clearTimeout(timeout);
        const { data } = await supabase.auth.refreshSession();
        if (data.session?.access_token) {
          const retryHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${data.session.access_token}`,
            'apikey': ANON_KEY,
            // Re-use the same correlation ID so the retry shows up in the
            // same trace as the original 401.
            [CORRELATION_ID_HEADER]: correlationId,
          };
          const controller2 = new AbortController();
          const timeout2 = setTimeout(() => controller2.abort(), 15000);
          try {
            const retry = await fetch(`${API_BASE}/${name}`, {
              method: 'POST',
              headers: retryHeaders,
              body: JSON.stringify(payload),
              signal: controller2.signal,
            });
            if (!retry.ok) {
              const text = await retry.text();
              throw new Error(text);
            }
            return retry.json();
          } finally {
            clearTimeout(timeout2);
          }
        }
      }
      const text = await res.text();
      throw new Error(text);
    }
    return res.json();
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error(`Request to ${name} timed out. Please try again.`);
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

interface GeoResult {
  lat: number;
  lon: number;
  displayName: string;
}

async function geocodeClientFallback(query: string): Promise<GeoResult[]> {
  const encoded = encodeURIComponent(query);
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=5&addressdetails=1`,
    { headers: { 'User-Agent': 'Arcana-Astrology-App/1.0' } }
  );
  if (!res.ok) return [];
  const data: { lat: string; lon: string; display_name: string }[] = await res.json();
  return data.map(item => ({
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon),
    displayName: item.display_name,
  }));
}

export function useGeocode() {
  const [results, setResults] = useState<GeoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (birthPlace: string) => {
    if (!birthPlace.trim()) { setResults([]); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await callFn<{ results: GeoResult[] }>('astrology-geocode', { birthPlace });
      if (data.results?.length) {
        setResults(data.results);
        setLoading(false);
        return;
      }
    } catch { /* fall through to client-side */ }

    try {
      const fallbackResults = await geocodeClientFallback(birthPlace);
      setResults(fallbackResults);
      if (!fallbackResults.length) {
        setError('No locations found. Try a different search term.');
      }
    } catch {
      setResults([]);
      setError('Location search unavailable. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, error, search };
}

interface ChartResponse {
  natalChart: NatalChart;
  bigThree: NatalChart['bigThree'];
  dominants: NatalChart['dominants'];
  aspects: NatalChart['aspects'];
  error?: string;
}

export function useNatalChart() {
  const [chart, setChart] = useState<ChartResponse | null>(() => getCached<ChartResponse>('chart'));
  const [loading, setLoading] = useState(!getCached('chart'));
  const [error, setError] = useState<string | null>(null);

  const fetchChart = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await callFn<ChartResponse>('astrology-get-chart');
      if (data.error === 'No chart found' || !data.natalChart) {
        setChart(null);
      } else {
        setChart(data);
        setCache('chart', data);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : tErr('loadChart', 'Failed to load chart');
      if (msg.includes('No chart found')) {
        setChart(null);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // If we already have cached data, skip the initial fetch
    if (getCached('chart')) return;
    fetchChart();
  }, [fetchChart]);

  const computeChart = useCallback(async (params: {
    birthDate: string;
    birthTime: string | null;
    lat: number;
    lon: number;
    timezone: string;
    chartMode: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await callFn<ChartResponse>('astrology-compute-natal', params);
      setChart(data);
      setCache('chart', data);
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : tErr('computeChart', 'Failed to compute chart'));
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { chart, loading, error, fetchChart, computeChart };
}

export function useDailyHoroscope() {
  const cacheKey = 'daily';
  const [content, setContent] = useState<DailyContent | null>(() => getCached<DailyContent>(cacheKey));
  const [loading, setLoading] = useState(!getCached(cacheKey));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (date?: string) => {
    const key = date ? `daily-${date}` : cacheKey;
    const cached = getCached<DailyContent>(key);
    if (cached) { setContent(cached); setLoading(false); return; }

    setLoading(true);
    setError(null);
    try {
      const { data } = await apiCall({
        fn: 'astrology-daily',
        body: { ...(date ? { date } : {}), locale: getLocale() },
        response: DailyResponse,
      });
      // Schema-validated; cast covers the legacy types/astrology.ts shape
      // that still uses readonly strings instead of the zod-inferred unions.
      const content = data as unknown as DailyContent;
      setContent(content);
      setCache(key, content);
    } catch (e) {
      if (e instanceof ApiError || e instanceof ApiContractError) {
        setError(e.message);
      } else {
        setError(e instanceof Error ? e.message : tErr('dailyHoroscope', 'Failed to load daily horoscope'));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (getCached(cacheKey)) return;
    load();
  }, [load]);

  return { content, loading, error, refresh: load };
}

export function useWeeklyForecast() {
  const cacheKey = 'weekly';
  const [content, setContent] = useState<WeeklyContent | null>(() => getCached<WeeklyContent>(cacheKey));
  const [loading, setLoading] = useState(!getCached(cacheKey));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const cached = getCached<WeeklyContent>(cacheKey);
    if (cached) { setContent(cached); setLoading(false); return; }

    setLoading(true);
    setError(null);
    try {
      const { data } = await apiCall({
        fn: 'astrology-weekly',
        body: { locale: getLocale() },
        response: WeeklyResponse,
      });
      const content = data as unknown as WeeklyContent;
      setContent(content);
      setCache(cacheKey, content);
    } catch (e) {
      if (e instanceof ApiError || e instanceof ApiContractError) {
        setError(e.message);
      } else {
        setError(e instanceof Error ? e.message : tErr('weeklyForecast', 'Failed to load weekly forecast'));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (getCached(cacheKey)) return;
    load();
  }, [load]);

  return { content, loading, error, refresh: load };
}

export function useMonthlyForecast() {
  const cacheKey = 'monthly';
  const [content, setContent] = useState<MonthlyContent | null>(() => getCached<MonthlyContent>(cacheKey));
  const [loading, setLoading] = useState(!getCached(cacheKey));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const cached = getCached<MonthlyContent>(cacheKey);
    if (cached) { setContent(cached); setLoading(false); return; }

    setLoading(true);
    setError(null);
    try {
      const { data } = await apiCall({
        fn: 'astrology-monthly',
        body: { locale: getLocale() },
        response: MonthlyResponse,
      });
      const content = data as unknown as MonthlyContent;
      setContent(content);
      setCache(cacheKey, content);
    } catch (e) {
      if (e instanceof ApiError || e instanceof ApiContractError) {
        setError(e.message);
      } else {
        setError(e instanceof Error ? e.message : tErr('monthlyForecast', 'Failed to load monthly forecast'));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (getCached(cacheKey)) return;
    load();
  }, [load]);

  return { content, loading, error, refresh: load };
}

export function useTransitCalendar() {
  const [events, setEvents] = useState<TransitEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (natalPlanet?: string) => {
    const cacheKey = `transits-${natalPlanet || 'all'}`;
    const cached = getCached<{ events: TransitEvent[] }>(cacheKey);
    if (cached) { setEvents(cached.events || []); return; }

    setLoading(true);
    setError(null);
    try {
      const body: { days: number; natalPlanet?: string; locale: string } = {
        days: 30,
        locale: getLocale(),
      };
      if (natalPlanet) body.natalPlanet = natalPlanet;
      const { data } = await apiCall({
        fn: 'astrology-transit-calendar',
        body,
        response: TransitCalendarResponse,
      });
      const typed = data as unknown as { events: TransitEvent[] };
      setEvents(typed.events || []);
      setCache(cacheKey, typed);
    } catch (e) {
      if (e instanceof ApiError || e instanceof ApiContractError) {
        setError(e.message);
      } else {
        setError(e instanceof Error ? e.message : tErr('transits', 'Failed to load transits'));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  return { events, loading, error, load };
}
