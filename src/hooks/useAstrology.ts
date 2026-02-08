import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { NatalChart, DailyContent, WeeklyContent, MonthlyContent, TransitEvent } from '../types/astrology';

const API_BASE = import.meta.env.VITE_SUPABASE_URL + '/functions/v1';
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token || ''}`,
    'apikey': ANON_KEY,
  };
}

async function callFn<T>(name: string, body?: Record<string, unknown>): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/${name}`, {
    method: 'POST',
    headers,
    body: body ? JSON.stringify(body) : JSON.stringify({}),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }
  return res.json();
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
  const [chart, setChart] = useState<ChartResponse | null>(null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => { fetchChart(); }, [fetchChart]);

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
  const [content, setContent] = useState<DailyContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (date?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await callFn<DailyContent>('astrology-daily', date ? { date } : {});
      setContent(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load daily horoscope');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { content, loading, error, refresh: load };
}

export function useWeeklyForecast() {
  const [content, setContent] = useState<WeeklyContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await callFn<WeeklyContent>('astrology-weekly');
      setContent(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load weekly forecast');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { content, loading, error, refresh: load };
}

export function useMonthlyForecast() {
  const [content, setContent] = useState<MonthlyContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await callFn<MonthlyContent>('astrology-monthly');
      setContent(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load monthly forecast');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { content, loading, error, refresh: load };
}

export function useTransitCalendar() {
  const [events, setEvents] = useState<TransitEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (natalPlanet?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = { days: 30 };
      if (natalPlanet) params.natalPlanet = natalPlanet;
      const data = await callFn<{ events: TransitEvent[] }>('astrology-transit-calendar', params);
      setEvents(data.events || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load transits');
    } finally {
      setLoading(false);
    }
  }, []);

  return { events, loading, error, load };
}
