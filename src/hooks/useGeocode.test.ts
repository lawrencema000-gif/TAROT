/**
 * useGeocode and a region nothing matched (p8 O#35). astrology-geocode says
 * `qualifierMatched: false` when the user typed "City, Region" and none of
 * the places it found is in that region. The hook must not list those
 * same-name cities as if they were the place typed: it first asks the
 * device's own Nominatim search (the edge is refused by Nominatim, a phone
 * is not), and otherwise lists them with a notice that they are elsewhere.
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { access_token: 'token' } } }),
      refreshSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}));
vi.mock('../i18n/config', () => {
  const t = (key: string, opts?: { defaultValue?: string; region?: string }) =>
    `${key}|${(opts?.defaultValue ?? '').replace('{{region}}', opts?.region ?? '')}`;
  return { default: { t, on: () => {} }, getLocale: () => 'ja' };
});
vi.mock('../i18n/contentOverlay', () => ({ useContentOverlay: () => null }));
vi.mock('../data/interpretations/localize', () => ({ withOverlay: (x: unknown) => x }));
// The shared zod schemas import `npm:zod` (Deno); the vite build aliases it, vitest does not.
vi.mock('../schema', () => ({ DailyResponse: {}, WeeklyResponse: {}, MonthlyResponse: {}, TransitCalendarResponse: {} }));
vi.mock('../lib/apiClient', () => ({
  apiCall: vi.fn(),
  ApiError: class ApiError extends Error {},
  ApiContractError: class ApiContractError extends Error {},
  handleSessionExpired: vi.fn(),
}));

import { typedRegion, useGeocode } from './useAstrology';

const MISSOURI = [
  { lat: 37.22, lon: -93.3, displayName: 'スプリングフィールド, ミズーリ州, アメリカ' },
  { lat: 39.8, lon: -89.64, displayName: 'スプリングフィールド, イリノイ州, アメリカ' },
];
const VERMONT_NOMINATIM = [{ lat: '43.2984', lon: '-72.4823', display_name: 'Springfield, Windsor County, Vermont, United States' }];

/** The server's answer for astrology-geocode, and the device's Nominatim answer. */
function stubFetch(server: unknown, nominatim: unknown[] | 'down') {
  const calls: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    calls.push(String(input));
    if (String(input).includes('/functions/v1/astrology-geocode')) {
      if (server === 'down') throw new TypeError('Failed to fetch');
      return new Response(JSON.stringify(server), { status: 200 });
    }
    if (nominatim === 'down') throw new TypeError('Failed to fetch');
    return new Response(JSON.stringify(nominatim), { status: 200 });
  }));
  return calls;
}

async function searchFor(place: string) {
  const hook = renderHook(() => useGeocode());
  await act(async () => { await hook.result.current.search(place); });
  return hook.result.current;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('useGeocode when the region typed matched nothing', () => {
  it('asks the device’s own search first, and lists its answer (no notice)', async () => {
    const calls = stubFetch({ results: MISSOURI, qualifierMatched: false }, VERMONT_NOMINATIM);
    const out = await searchFor('Springfield, Vermont');
    expect(calls.some((c) => c.includes('nominatim.openstreetmap.org') && c.includes(encodeURIComponent('Springfield, Vermont')))).toBe(true);
    expect(out.results.map((r) => r.displayName)).toEqual(['Springfield, Windsor County, Vermont, United States']);
    expect(out.regionMissed).toBe(false);
    expect(out.error).toBeNull();
    expect(out.usedFallback).toBe(false);
  });

  it('otherwise lists the same-name places WITH a notice naming the region', async () => {
    stubFetch({ results: MISSOURI, qualifierMatched: false }, []);
    const out = await searchFor('Springfield, Vermont');
    expect(out.results).toEqual(MISSOURI);
    expect(out.regionMissed).toBe(true);
    expect(out.error).toContain('astrologyErrors.geocodeRegionMissed');
    expect(out.error).toContain('Vermont');
  });

  it('…also when the device search is unreachable', async () => {
    stubFetch({ results: MISSOURI, qualifierMatched: false }, 'down');
    const out = await searchFor('スプリングフィールド、バーモント州');
    expect(out.results).toEqual(MISSOURI);
    expect(out.regionMissed).toBe(true);
    expect(out.error).toContain('バーモント州');
  });
});

describe('useGeocode otherwise unchanged', () => {
  it('a matched answer is listed as it is, with no notice and no second search', async () => {
    const calls = stubFetch({ results: MISSOURI, qualifierMatched: true }, VERMONT_NOMINATIM);
    const out = await searchFor('Springfield, Missouri');
    expect(out.results).toEqual(MISSOURI);
    expect(out.regionMissed).toBe(false);
    expect(out.error).toBeNull();
    expect(calls.some((c) => c.includes('nominatim'))).toBe(false);
  });

  it('a server without the field (older deploy) is believed', async () => {
    stubFetch({ results: MISSOURI }, []);
    const out = await searchFor('Springfield');
    expect(out.results).toEqual(MISSOURI);
    expect(out.regionMissed).toBe(false);
  });

  it('the server down: the device search, flagged approximate', async () => {
    stubFetch('down', VERMONT_NOMINATIM);
    const out = await searchFor('Springfield, Vermont');
    expect(out.results).toHaveLength(1);
    expect(out.usedFallback).toBe(true);
    expect(out.regionMissed).toBe(false);
  });

  it('typedRegion reads what follows the city, on ASCII and CJK commas', () => {
    expect(typedRegion('Springfield, Vermont, USA')).toBe('Vermont, USA');
    expect(typedRegion('スプリングフィールド、バーモント州')).toBe('バーモント州');
    expect(typedRegion('Tokyo')).toBe('');
  });
});

/*
 * p9 R27: the device search filtered every query to settlements. On a bare
 * name that drops the city's own rows and ranks same-name places first
 * (live, 2026-10-17: 京都 → 「井都镇, 汕頭市, 広東省, 中国」 first; unfiltered,
 * Kyoto station in 下京区, 京都市). The filter is kept for "City, Region",
 * the rescue it was added for ("Springfield, Atlantis" → streets in France).
 */
describe('the device search (p9 R27)', () => {
  const nominatimCall = (calls: string[]) => calls.find((c) => c.includes('nominatim.openstreetmap.org'));

  it('a bare name is searched unfiltered: the first row is in the city typed', async () => {
    const KYOTO_STATION = [{ lat: '34.9858', lon: '135.7588', display_name: '京都, 塩小路通, 東塩小路町, 下京区, 京都市, 京都府, 600-8213, 日本' }];
    const calls = stubFetch({ results: [] }, KYOTO_STATION);
    const out = await searchFor('京都');
    expect(nominatimCall(calls)).toContain(`q=${encodeURIComponent('京都')}`);
    expect(nominatimCall(calls)).not.toContain('featureType');
    expect(out.results[0].displayName).toContain('京都市');
    // …also when the server is down.
    const down = stubFetch('down', KYOTO_STATION);
    await searchFor('静岡');
    expect(nominatimCall(down)).not.toContain('featureType');
  });

  it('"City, Region" keeps featureType=settlement, on both paths that reach the device', async () => {
    const missed = stubFetch({ results: MISSOURI, qualifierMatched: false }, []);
    await searchFor('Springfield, Atlantis');
    expect(nominatimCall(missed)).toContain('featureType=settlement');
    const down = stubFetch('down', []);
    await searchFor('京都、京都府');
    expect(nominatimCall(down)).toContain('featureType=settlement');
  });
});

/*
 * p9 R32: searches finish out of order. Reproduction (search-race.mjs): 福岡
 * typed, then 市 — 福岡 is server-empty and goes on to the device search
 * (two round trips), 福岡市 is answered by the server (one). HEAD wrote
 * whichever answer landed last: the rows became the 福岡 villages under the
 * text 福岡市, for good, and picking the first saved Saitama.
 */
describe('only the latest search writes (p9 R32)', () => {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const CITY = { lat: 33.6, lon: 130.42, displayName: '福岡市, 福岡県, 日本' };
  const VILLAGE = [{ lat: '35.88', lon: '139.55', display_name: '福岡, 埼玉県, 日本' }];

  /** astrology-geocode answers `server[place]` after `delay[place]` ms; the device search answers 福岡's village. */
  function stagedFetch(server: Record<string, unknown>, delay: Record<string, number>, deviceDelay: number) {
    vi.stubGlobal('fetch', vi.fn(async (input: string, init?: RequestInit) => {
      if (String(input).includes('/functions/v1/astrology-geocode')) {
        const { birthPlace } = JSON.parse(String(init?.body)) as { birthPlace: string };
        await sleep(delay[birthPlace] ?? 0);
        return new Response(JSON.stringify(server[birthPlace] ?? { results: [] }), { status: 200 });
      }
      await sleep(deviceDelay);
      return new Response(JSON.stringify(VILLAGE), { status: 200 });
    }));
  }

  it('an earlier search that lands later never replaces the newer rows', async () => {
    stagedFetch({ 福岡市: { results: [CITY], qualifierMatched: true } }, { 福岡: 20, 福岡市: 5 }, 60);
    const hook = renderHook(() => useGeocode());
    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => { first = hook.result.current.search('福岡'); });
    await act(async () => { await sleep(10); });
    act(() => { second = hook.result.current.search('福岡市'); });
    await act(async () => { await second; });
    expect(hook.result.current).toMatchObject({ results: [CITY], query: '福岡市', loading: false, error: null });
    await act(async () => { await first; });
    // HEAD: here the rows became 「福岡, 埼玉県, 日本」 under the text 福岡市.
    expect(hook.result.current).toMatchObject({ results: [CITY], query: '福岡市', loading: false, error: null, usedFallback: false });
  });

  it('an earlier search that lands first neither shows its rows nor ends the newer one’s loading', async () => {
    stagedFetch({ 福岡: { results: [{ ...CITY, displayName: '福岡, 埼玉県, 日本' }], qualifierMatched: true }, 福岡市: { results: [CITY], qualifierMatched: true } }, { 福岡: 5, 福岡市: 40 }, 0);
    const hook = renderHook(() => useGeocode());
    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => { first = hook.result.current.search('福岡'); });
    act(() => { second = hook.result.current.search('福岡市'); });
    await act(async () => { await first; });
    expect(hook.result.current).toMatchObject({ results: [], loading: true });
    await act(async () => { await second; });
    expect(hook.result.current).toMatchObject({ results: [CITY], query: '福岡市', loading: false });
  });

  it('clearing the text drops a search still under way', async () => {
    stagedFetch({}, { 福岡: 5 }, 20);
    const hook = renderHook(() => useGeocode());
    let first!: Promise<void>;
    act(() => { first = hook.result.current.search('福岡'); });
    await act(async () => { await hook.result.current.search(''); });
    await act(async () => { await first; });
    expect(hook.result.current).toMatchObject({ results: [], loading: false, error: null });
  });
});
