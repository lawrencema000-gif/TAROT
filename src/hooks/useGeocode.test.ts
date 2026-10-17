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
