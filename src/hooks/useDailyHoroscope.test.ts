// @vitest-environment jsdom
/**
 * p12 WP-P2-06, home-astro-02: the horoscope is the member's day. The hooks
 * sent only `{ locale }` and kept one dateless 'daily' entry, so the server
 * answered for the UTC date: a Tokyo member before 09:00 JST got yesterday,
 * a New York member after 19:00 EST got tomorrow. They now send the device's
 * date and zone, key the in-memory cache by that date, ask for the new day
 * when the page is re-rendered or made visible past midnight, and let the
 * latest request win.
 *
 * Expected dates are the zone's en-CA date at the instant (Intl).
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
// The shared zod schemas import `npm:zod` (Deno); the vite build aliases it, vitest does not.
vi.mock('../schema', () => ({ DailyResponse: {}, WeeklyResponse: {}, MonthlyResponse: {}, TransitCalendarResponse: {} }));
vi.mock('../lib/apiClient', () => ({
  apiCall: (...args: unknown[]) => h.apiCall(...args),
  ApiError: class ApiError extends Error {},
  ApiContractError: class ApiContractError extends Error {},
  handleSessionExpired: vi.fn(),
}));

type Call = { fn: string; body: { date?: string; timezone?: string; locale?: string } };

const ORIGINAL_TZ = process.env.TZ;

/** The hooks module afresh: its in-memory cache is module state. */
async function load() {
  vi.resetModules();
  return await import('./useAstrology');
}

function at(zone: string, iso: string) {
  process.env.TZ = zone;
  vi.setSystemTime(new Date(iso));
}

const echo = async (opts: Call) => ({ data: { date: opts.body.date, theme: 'T' } });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  h.apiCall.mockReset();
  h.apiCall.mockImplementation(echo);
});

afterEach(() => {
  vi.useRealTimers();
  process.env.TZ = ORIGINAL_TZ;
});

const calls = (): Call[] => h.apiCall.mock.calls.map((c) => c[0] as Call);

describe('useDailyHoroscope asks for the member\'s day (home-astro-02)', () => {
  it.each([
    ['Asia/Tokyo', '2026-11-14T15:00:50Z', '2026-11-15'],
    ['America/New_York', '2026-11-15T02:00:00Z', '2026-11-14'],
    ['Pacific/Honolulu', '2026-11-14T07:37:00Z', '2026-11-13'],
  ])('%s at %s: the request carries the local date %s and the zone', async (zone, iso, date) => {
    at(zone, iso);
    const { useDailyHoroscope } = await load();
    const { result } = renderHook(() => useDailyHoroscope());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(calls()).toEqual([{ fn: 'astrology-daily', body: { date, timezone: zone, locale: 'en' }, response: {} }]);
    expect((result.current.content as { date?: string } | null)?.date).toBe(date);
  });

  it('past midnight, a re-render asks for the new day, not the 5-minute copy of the old one', async () => {
    at('Asia/Tokyo', '2026-11-14T14:59:00Z');
    const { useDailyHoroscope } = await load();
    const { result, rerender } = renderHook(() => useDailyHoroscope());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(calls().map((c) => c.body.date)).toEqual(['2026-11-14']);

    vi.setSystemTime(new Date('2026-11-14T15:01:00Z'));
    rerender();
    await waitFor(() => expect((result.current.content as { date?: string } | null)?.date).toBe('2026-11-15'));
    expect(calls().map((c) => c.body.date)).toEqual(['2026-11-14', '2026-11-15']);

    // The new day is now in memory: refresh serves it without a third call.
    await act(async () => { await result.current.refresh(); });
    expect(calls()).toHaveLength(2);
    expect((result.current.content as { date?: string } | null)?.date).toBe('2026-11-15');
  });

  it('past midnight, the page becoming visible again asks for the new day', async () => {
    at('Asia/Tokyo', '2026-11-14T14:59:00Z');
    const { useDailyHoroscope } = await load();
    const { result } = renderHook(() => useDailyHoroscope());
    await waitFor(() => expect(result.current.loading).toBe(false));

    vi.setSystemTime(new Date('2026-11-14T15:01:00Z'));
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    await waitFor(() => expect((result.current.content as { date?: string } | null)?.date).toBe('2026-11-15'));
    expect(calls().map((c) => c.body.date)).toEqual(['2026-11-14', '2026-11-15']);
  });

  it('the latest request wins: an earlier day answering late does not replace the new one', async () => {
    at('Asia/Tokyo', '2026-11-14T14:59:00Z');
    let releaseOld: () => void = () => {};
    h.apiCall.mockImplementation((opts: Call) => {
      if (opts.body.date === '2026-11-14') {
        return new Promise((resolve) => { releaseOld = () => resolve({ data: { date: '2026-11-14', theme: 'old' } }); });
      }
      return echo(opts);
    });
    const { useDailyHoroscope } = await load();
    const { result, rerender } = renderHook(() => useDailyHoroscope());
    expect(calls().map((c) => c.body.date)).toEqual(['2026-11-14']);

    vi.setSystemTime(new Date('2026-11-14T15:01:00Z'));
    rerender();
    await waitFor(() => expect((result.current.content as { date?: string } | null)?.date).toBe('2026-11-15'));

    await act(async () => { releaseOld(); await Promise.resolve(); });
    expect((result.current.content as { date?: string } | null)?.date).toBe('2026-11-15');
    expect(result.current.loading).toBe(false);
  });
});

describe('the week and month tabs ask for the member\'s week and month too', () => {
  it('useWeeklyForecast and useMonthlyForecast send the Tokyo date and zone', async () => {
    at('Asia/Tokyo', '2026-11-14T15:00:50Z');
    const { useWeeklyForecast, useMonthlyForecast } = await load();
    const w = renderHook(() => useWeeklyForecast());
    const m = renderHook(() => useMonthlyForecast());
    await waitFor(() => expect(w.result.current.loading).toBe(false));
    await waitFor(() => expect(m.result.current.loading).toBe(false));
    const body = { date: '2026-11-15', timezone: 'Asia/Tokyo', locale: 'en' };
    expect(calls().map((c) => [c.fn, c.body])).toEqual([
      ['astrology-weekly', body],
      ['astrology-monthly', body],
    ]);
  });
});
