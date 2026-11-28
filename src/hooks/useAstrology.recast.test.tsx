// @vitest-environment jsdom
/**
 * p12 WP-P2-06, gap-1-04: after a member corrected their birth details, the
 * in-memory reading built from the old chart was kept for five more minutes
 * and a mounted Today view never asked again. recastNatalChart now drops
 * every reading kept in memory and tells the mounted views to load again;
 * a response asked for before the recast that lands last does not overwrite
 * the newer one.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ apiCall: vi.fn() }));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { access_token: 'token' } } }),
      refreshSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}));
vi.mock('../i18n/config', () => ({
  default: { t: (k: string, o?: { defaultValue?: string }) => o?.defaultValue ?? k, on: () => {} },
  getLocale: () => 'en',
}));
vi.mock('../i18n/contentOverlay', () => ({ useContentOverlay: () => null }));
vi.mock('../data/interpretations/localize', () => ({ withOverlay: (x: unknown) => x }));
vi.mock('../schema', () => ({ DailyResponse: {}, WeeklyResponse: {}, MonthlyResponse: {}, TransitCalendarResponse: {} }));
vi.mock('../lib/apiClient', () => ({
  apiCall: (...args: unknown[]) => h.apiCall(...args),
  ApiError: class ApiError extends Error {},
  ApiContractError: class ApiContractError extends Error {},
  handleSessionExpired: vi.fn(),
}));

const CAST = { latitude: 34.05, longitude: -118.24, lat: 34.05, lon: -118.24, timezone: 'America/Los_Angeles', chartMode: 'tropical' };

/** The hooks module afresh: its in-memory cache is module state. */
async function load() {
  vi.resetModules();
  return await import('./useAstrology');
}

/** The server's daily answer for whichever chart is current. */
let chart = 'A';

beforeEach(() => {
  chart = 'A';
  h.apiCall.mockReset();
  h.apiCall.mockImplementation(async () => ({ data: { date: '2026-11-15', theme: `chart ${chart}` } }));
  // astrology-compute-natal (callFn goes through fetch).
  vi.stubGlobal('fetch', vi.fn(async () => {
    chart = 'B';
    return new Response(JSON.stringify({ natalChart: { planets: [] }, bigThree: {} }), { status: 200 });
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const theme = (c: unknown) => (c as { theme?: string } | null)?.theme;

describe('a recast replaces the readings built from the old chart (gap-1-04)', () => {
  it('a mounted Today view fetches again once the recast resolves, and shows the new reading', async () => {
    const mod = await load();
    const { result } = renderHook(() => mod.useDailyHoroscope());
    await waitFor(() => expect(theme(result.current.content)).toBe('chart A'));
    expect(h.apiCall).toHaveBeenCalledTimes(1);

    await act(async () => { await mod.recastNatalChart(CAST as never); });
    await waitFor(() => expect(theme(result.current.content)).toBe('chart B'));
    expect(h.apiCall).toHaveBeenCalledTimes(2);
  });

  it('a view mounted within 5 minutes of a recast does not reuse the reading kept in memory', async () => {
    const mod = await load();
    const first = renderHook(() => mod.useDailyHoroscope());
    await waitFor(() => expect(theme(first.result.current.content)).toBe('chart A'));
    first.unmount();

    await mod.recastNatalChart(CAST as never);
    const again = renderHook(() => mod.useDailyHoroscope());
    await waitFor(() => expect(theme(again.result.current.content)).toBe('chart B'));
    expect(h.apiCall).toHaveBeenCalledTimes(2);
  });

  it('a response asked for before the recast that lands last does not overwrite the newer one', async () => {
    let releaseOld: () => void = () => {};
    h.apiCall.mockImplementationOnce(() => new Promise((resolve) => {
      releaseOld = () => resolve({ data: { date: '2026-11-15', theme: 'chart A' } });
    }));
    const mod = await load();
    const { result } = renderHook(() => mod.useDailyHoroscope());
    expect(h.apiCall).toHaveBeenCalledTimes(1);

    await act(async () => { await mod.recastNatalChart(CAST as never); });
    await waitFor(() => expect(theme(result.current.content)).toBe('chart B'));

    await act(async () => { releaseOld(); await Promise.resolve(); });
    expect(theme(result.current.content)).toBe('chart B');
    expect(result.current.loading).toBe(false);

    // Nor did the late answer land in memory: a new view still reads chart B.
    const again = renderHook(() => mod.useDailyHoroscope());
    expect(theme(again.result.current.content)).toBe('chart B');
  });
});
