import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { z } from 'zod';
import { supabase } from '../lib/supabase';
import { getLocale } from '../i18n/config';
import i18n from '../i18n/config';
import { newCorrelationId, CORRELATION_ID_HEADER } from '../utils/correlationId';
import { apiCall, ApiError, ApiContractError, handleSessionExpired } from '../lib/apiClient';
import { DailyResponse, WeeklyResponse, MonthlyResponse, TransitCalendarResponse } from '../schema';
import type { NatalChart, DailyContent, WeeklyContent, MonthlyContent, TransitEvent } from '../types/astrology';
import { useContentOverlay } from '../i18n/contentOverlay';
import { withOverlay, type Interpretations, type InterpModule } from '../data/interpretations/localize';
import { localDateStr, localTimeZone } from '../utils/localDate';

const tErr = (key: string, fallback: string) => i18n.t(`astrologyErrors.${key}`, { ns: 'app', defaultValue: fallback });

/** Error from the legacy callFn path, carrying a code so the UI can pick a message. */
class AstroCallError extends Error {
  constructor(readonly code: 'NO_SESSION' | 'TIMEOUT' | 'HTTP', message: string, readonly status?: number) {
    super(message);
    this.name = 'AstroCallError';
  }
}

/**
 * Turn any thrown error into a message that says what happened and what to
 * do next. The raw server/network text goes to the console for diagnostics
 * and is never rendered.
 */
function userMessage(e: unknown, key: string, fallback: string): string {
  console.error(`[astrology] ${key} failed:`, e);
  const code = e instanceof ApiError || e instanceof AstroCallError ? e.code : null;
  const status = e instanceof ApiError || e instanceof AstroCallError ? e.status : undefined;
  if (code === 'NO_SESSION' || code === 'UNAUTHORIZED' || status === 401) {
    return tErr('signedOut', 'Your session ended — sign in again to load this.');
  }
  if (code === 'TIMEOUT') {
    return tErr('timeout', 'The request timed out — check your connection and try again.');
  }
  if (code === 'RATE_LIMITED' || status === 429) {
    return tErr('rateLimited', 'Too many requests — wait a moment and try again.');
  }
  if (code === 'NATAL_CHART_MISSING') {
    // Not a connection problem: the chart is not cast yet (a first visit,
    // or a reading asked for before the cast landed).
    return tErr('chartMissing', 'Your birth chart isn’t set up yet. Open Horoscope to cast it, then try again.');
  }
  if (e instanceof ApiContractError) {
    return tErr('contract', 'The server sent something this version couldn’t read — try again in a moment.');
  }
  return tErr(key, fallback);
}

const API_BASE = import.meta.env.VITE_SUPABASE_URL + '/functions/v1';
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ── In-memory cache (survives tab switches, clears on page reload) ──
let cache: Record<string, { data: unknown; ts: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached<T>(key: string): T | null {
  const entry = cache[key];
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data as T;
  return null;
}
function setCache(key: string, data: unknown) {
  cache[key] = { data, ts: Date.now() };
}

/**
 * Locale changes must invalidate the in-memory cache so the next render
 * refetches in the new language. Without this the user sees the old
 * locale's horoscope content until the 5-min TTL elapses — and the
 * in-component useEffect early-returns on a cache hit, so nothing triggers
 * a refetch on its own.
 *
 * Bound once at module load. Clears synchronously before any consumer
 * re-reads on the next render.
 */
if (typeof window !== 'undefined') {
  import('../i18n/config').then((mod) => {
    mod.default.on('languageChanged', () => {
      cache = {};
    });
  }).catch(() => { /* no-op in test environments */ });

  // Also flush on auth transitions so User A's horoscope / chart doesn't
  // leak to User B if they sign in on the same device. SIGNED_OUT +
  // SIGNED_IN + USER_UPDATED all fire through this handler — safe to
  // over-invalidate; next read refetches with the right token.
  supabase.auth.onAuthStateChange(() => {
    cache = {};
  });
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new AstroCallError('NO_SESSION', 'No active session');
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
              // Still 401 with a fresh token: the session is gone. Same
              // handling as apiCall (one toast, sign out), not a silent card.
              if (retry.status === 401) void handleSessionExpired();
              throw new AstroCallError('HTTP', text, retry.status);
            }
            return retry.json();
          } finally {
            clearTimeout(timeout2);
          }
        }
      }
      const text = await res.text();
      // 401 and the refresh produced no session: expired.
      if (res.status === 401) void handleSessionExpired();
      throw new AstroCallError('HTTP', text, res.status);
    }
    return res.json();
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new AstroCallError('TIMEOUT', `Request to ${name} timed out`);
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
  // featureType=settlement only for "City, Region", the rescue it was added
  // for: without it "Springfield, Atlantis" came back as two streets in
  // France. On a bare name it drops the city's own rows (its station, its
  // wards) and ranks same-name places first: 京都 → a town in Guangdong,
  // 静岡 → five places none of them in Shizuoka (p9 R27). Unfiltered, the
  // first row of a bare name is in the city typed.
  const settlement = typedRegion(query) ? '&featureType=settlement' : '';
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=5&addressdetails=1${settlement}`,
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

/** "Springfield, Vermont, USA" → "Vermont, USA": what the user typed after the city. */
export function typedRegion(birthPlace: string): string {
  return birthPlace.split(/[,，、]/).slice(1).map((p) => p.trim()).filter(Boolean).join(', ');
}

export function useGeocode() {
  const [results, setResults] = useState<GeoResult[]>([]);
  /** The query `results` (and `error`) answer: the rows carry no query of their own. */
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * True when the server geocoder failed and the results came from the
   * client-side fallback (R5 M-6). The fallback used to hide the failure
   * entirely; callers show a non-blocking "approximate location" notice.
   */
  const [usedFallback, setUsedFallback] = useState(false);
  /**
   * True when the user typed a region ("Springfield, Vermont") and none of
   * the places listed is in it — the server's `qualifierMatched: false` (p8
   * O#35). The places are still listed (a misspelt region must not hide the
   * city), but `error` then says they are elsewhere, so nobody picks a
   * same-name city believing it is theirs. Before that, the device's own
   * Nominatim search gets the full string: the edge is refused by Nominatim,
   * a phone is not.
   */
  const [regionMissed, setRegionMissed] = useState(false);
  /**
   * The latest search (p9 R32). Searches take different paths, so they
   * finish out of order: 福岡 goes server-empty and then to the device
   * Nominatim (two round trips), 福岡市 is answered by the server (one). The
   * earlier answer used to land last and replace the newer rows under the
   * newer text, for good. Only the latest search may now write results,
   * query, loading and error.
   */
  const latest = useRef(0);

  const search = useCallback(async (birthPlace: string) => {
    const ticket = ++latest.current;
    const isLatest = () => ticket === latest.current;
    /** This search's answer — dropped when a newer search has started since. */
    const answer = (rows: GeoResult[], notice: { error?: string | null; fallback?: boolean; regionMissed?: boolean } = {}) => {
      if (!isLatest()) return;
      setResults(rows);
      setQuery(birthPlace);
      setError(notice.error ?? null);
      setUsedFallback(!!notice.fallback);
      setRegionMissed(!!notice.regionMissed);
      setLoading(false);
    };
    if (!birthPlace.trim()) { answer([]); return; }
    setLoading(true);
    setError(null);
    setUsedFallback(false);
    setRegionMissed(false);
    /** Same-name places outside the region typed: listed, with a notice, if nothing better turns up. */
    let elsewhere: GeoResult[] = [];
    try {
      const data = await callFn<{ results: GeoResult[]; qualifierMatched?: boolean }>('astrology-geocode', { birthPlace });
      if (data.results?.length) {
        if (data.qualifierMatched !== false) {
          answer(data.results);
          return;
        }
        elsewhere = data.results;
      }
    } catch { /* fall through to client-side */ }
    // A newer search is under way: no device search for this one.
    if (!isLatest()) return;

    const showElsewhere = () => answer(elsewhere, {
      regionMissed: true,
      error: i18n.t('astrologyErrors.geocodeRegionMissed', {
        ns: 'app',
        region: typedRegion(birthPlace),
        defaultValue: 'None of these places is in {{region}}. Check the spelling, or try the place’s English name.',
      }),
    });

    try {
      const fallbackResults = await geocodeClientFallback(birthPlace);
      if (!fallbackResults.length && elsewhere.length) {
        showElsewhere();
        return;
      }
      answer(fallbackResults, {
        // An answer to the full "City, Region" string is not approximate; a
        // rescue after the server failed outright is.
        fallback: fallbackResults.length > 0 && elsewhere.length === 0,
        error: fallbackResults.length ? null : tErr('geocodeNone', 'No places matched — try the nearest city, or add the country.'),
      });
    } catch (e) {
      if (elsewhere.length) {
        showElsewhere();
        return;
      }
      if (isLatest()) console.error('[astrology] geocode fallback failed:', e);
      answer([], { error: tErr('geocodeUnavailable', 'Place search isn’t responding — check your connection and try again.') });
    }
  }, []);

  return { results, query, loading, error, search, usedFallback, regionMissed };
}

interface ChartResponse {
  natalChart: NatalChart;
  bigThree: NatalChart['bigThree'];
  dominants: NatalChart['dominants'];
  aspects: NatalChart['aspects'];
  error?: string;
}

/** What astrology-compute-natal is sent (components/horoscope/birthZone castParamsFor). */
export interface NatalCastParams {
  birthDate: string;
  birthTime: string | null;
  lat: number;
  lon: number;
  timezone: string;
  chartMode: string;
}

/**
 * The stored natal chart, or null when none is cast yet: this session's
 * copy when a screen already read it (what every chart screen shows), else
 * astrology-get-chart's. The chart check (birthZone) reads it here.
 */
export async function loadNatalChart(): Promise<ChartResponse | null> {
  const cached = getCached<ChartResponse>('chart');
  if (cached) return cached;
  try {
    const data = await callFn<ChartResponse>('astrology-get-chart');
    if (data.error === 'No chart found' || !data.natalChart) return null;
    setCache('chart', data);
    return data;
  } catch (e) {
    if (e instanceof Error && e.message.includes('No chart found')) return null;
    throw e;
  }
}

/**
 * Recast the stored natal chart, and keep the answer as this session's
 * copy: a screen that mounts afterwards reads the new chart, not the one
 * cached before the recast (p9 R30).
 */
export async function recastNatalChart(params: NatalCastParams): Promise<ChartResponse> {
  const data = await callFn<ChartResponse>('astrology-compute-natal', { ...params });
  // Every reading kept in memory was computed from the chart just replaced
  // (gap-1-04): drop them all, keep the new chart, and tell the mounted
  // Today / Week / Month views to load again.
  cache = {};
  setCache('chart', data);
  for (const fn of [...recastListeners]) {
    try { fn(); } catch (e) { console.error('[astrology] recast listener failed:', e); }
  }
  return data;
}

const recastListeners = new Set<() => void>();

/** Run `fn` after every recastNatalChart; returns the unsubscribe. */
export function onNatalChartRecast(fn: () => void): () => void {
  recastListeners.add(fn);
  return () => { recastListeners.delete(fn); };
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
      const raw = e instanceof Error ? e.message : '';
      if (raw.includes('No chart found')) {
        setChart(null);
      } else {
        setError(userMessage(e, 'loadChart', 'Couldn’t load your chart — check your connection and try again.'));
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

  const computeChart = useCallback(async (params: NatalCastParams) => {
    setLoading(true);
    setError(null);
    try {
      const data = await recastNatalChart(params);
      setChart(data);
      return data;
    } catch (e) {
      setError(userMessage(e, 'computeChart', 'Couldn’t compute your chart — check your birth details and try again.'));
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { chart, loading, error, fetchChart, computeChart };
}

/**
 * The member's day, on the device's calendar — the day Home, the ritual and
 * the journal count (home-astro-02). Re-read on every render and whenever
 * the page becomes visible again, so a tab or app left open past midnight
 * asks for the new day.
 */
function useMemberDay(): string {
  const [, setTick] = useState(0);
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') setTick((n) => n + 1);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);
  return localDateStr();
}

/** What a horoscope request says about the member's day (see supabase/functions/_shared/readingDay.ts). */
function readingDayBody(date: string): { date: string; timezone?: string; locale: string } {
  const timezone = localTimeZone();
  return { date, ...(timezone ? { timezone } : {}), locale: getLocale() };
}

/**
 * A reading for the member's day (daily) or the week / month it is in.
 * Cached per day in memory; only the newest request may write the state,
 * so an answer for an earlier day — or one asked for before a recast — that
 * lands late never replaces the new one.
 */
function useMemberDayReading<T>(
  fn: 'astrology-daily' | 'astrology-weekly' | 'astrology-monthly',
  kind: 'daily' | 'weekly' | 'monthly',
  response: z.ZodType<unknown>,
  errorKey: string,
  errorFallback: string,
) {
  const today = useMemberDay();
  const [content, setContent] = useState<T | null>(() => getCached<T>(`${kind}-${today}`));
  const [loading, setLoading] = useState(() => !getCached(`${kind}-${today}`));
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);

  const load = useCallback(async (date: string = localDateStr()) => {
    const ticket = ++latest.current;
    const key = `${kind}-${date}`;
    const cached = getCached<T>(key);
    if (cached) { setContent(cached); setError(null); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiCall({ fn, body: readingDayBody(date), response });
      // Schema-validated; the cast covers the legacy types/astrology.ts shapes.
      if (ticket === latest.current) {
        setCache(key, data);
        setContent(data as unknown as T);
      }
    } catch (e) {
      if (ticket === latest.current) setError(userMessage(e, errorKey, errorFallback));
    } finally {
      if (ticket === latest.current) setLoading(false);
    }
  }, [fn, kind, response, errorKey, errorFallback]);

  useEffect(() => { void load(today); }, [today, load]);
  // A recast replaced the chart these readings were built from (gap-1-04).
  useEffect(() => onNatalChartRecast(() => { void load(); }), [load]);

  return { content, loading, error, refresh: load };
}

export function useDailyHoroscope() {
  return useMemberDayReading<DailyContent>('astrology-daily', 'daily', DailyResponse, 'dailyHoroscope', 'Couldn’t load today’s horoscope — check your connection and try again.');
}

export function useWeeklyForecast() {
  return useMemberDayReading<WeeklyContent>('astrology-weekly', 'weekly', WeeklyResponse, 'weeklyForecast', 'Couldn’t load this week’s forecast — check your connection and try again.');
}

export function useMonthlyForecast() {
  return useMemberDayReading<MonthlyContent>('astrology-monthly', 'monthly', MonthlyResponse, 'monthlyForecast', 'Couldn’t load this month’s forecast — check your connection and try again.');
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
      setError(userMessage(e, 'transits', 'Couldn’t load your transits — check your connection and try again.'));
    } finally {
      setLoading(false);
    }
  }, []);

  return { events, loading, error, load };
}

/**
 * The interpretation library (planet in sign / house, aspects, houses, sign
 * compatibility) in the reader's language: the lazily imported English
 * library read through the `interpretations` content overlay. Null until
 * both have loaded — render a skeleton until then, never the English for a
 * frame and then the translation.
 */
export function useInterpretations(): Interpretations | null {
  const [mod, setMod] = useState<InterpModule | null>(null);
  const { overlay, ready } = useContentOverlay('interpretations');
  useEffect(() => {
    let alive = true;
    import('../data/interpretations').then((m) => {
      if (alive) setMod(m);
    });
    return () => {
      alive = false;
    };
  }, []);
  return useMemo(() => (mod && ready ? withOverlay(mod, overlay) : null), [mod, ready, overlay]);
}
