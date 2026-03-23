import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${API_BASE}/${name}`, {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : JSON.stringify({}),
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
          };
          const controller2 = new AbortController();
          const timeout2 = setTimeout(() => controller2.abort(), 15000);
          try {
            const retry = await fetch(`${API_BASE}/${name}`, {
              method: 'POST',
              headers: retryHeaders,
              body: body ? JSON.stringify(body) : JSON.stringify({}),
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
      const msg = e instanceof Error ? e.message : 'Failed to load chart';
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
      setError(e instanceof Error ? e.message : 'Failed to compute chart');
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
      const data = await callFn<DailyContent>('astrology-daily', date ? { date } : {});
      setContent(data);
      setCache(key, data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load daily horoscope');
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
      const data = await callFn<WeeklyContent>('astrology-weekly');
      setContent(data);
      setCache(cacheKey, data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load weekly forecast');
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
      const data = await callFn<MonthlyContent>('astrology-monthly');
      setContent(data);
      setCache(cacheKey, data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load monthly forecast');
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
      const params: Record<string, unknown> = { days: 30 };
      if (natalPlanet) params.natalPlanet = natalPlanet;
      const data = await callFn<{ events: TransitEvent[] }>('astrology-transit-calendar', params);
      setEvents(data.events || []);
      setCache(cacheKey, data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load transits');
    } finally {
      setLoading(false);
    }
  }, []);

  return { events, loading, error, load };
}
