// @vitest-environment node
/**
 * Birth-place search with a region, in every app language (p8 O#35). Under a
 * ja/ko/zh language Open-Meteo names the regions in that language (ミズーリ州),
 * so "Springfield, Vermont" used to match nothing there and the five most
 * populous Springfields came back. astrology-geocode now matches each place
 * in the user's language AND in English, and retries a kana/hangul/han city
 * under its English name.
 *
 * Fixture: real Open-Meteo responses recorded 2026-10-17 by the FC proof
 * (geocode-live.mjs) — the same module ran against the live API with the
 * same answers.
 */
import { describe, expect, it } from 'vitest';
import fixture from './geocode-languages.fixture.json';
import { searchOpenMeteo } from '../../../supabase/functions/astrology-geocode/openmeteo';
import { filterByQualifiers, filterCandidates, pairById, isNonLatinName } from '../../../supabase/functions/astrology-geocode/qualifier';

const RECORDED = fixture as Record<string, unknown>;
const opts = { userAgent: 'test', timeoutMs: 5000 };

/** A fetch that answers from the recorded responses; `fail` makes some requests fail. */
function recordedFetch(fail?: (url: URL) => boolean) {
  const calls: string[] = [];
  const fn = async (input: string | URL) => {
    const u = new URL(String(input));
    const key = `${u.pathname}?${[...u.searchParams].filter(([k]) => k !== 'format').map(([k, v]) => `${k}=${v}`).join('&')}`;
    calls.push(key);
    if (fail?.(u)) return new Response('{"error":true}', { status: 503 });
    const body = RECORDED[key];
    if (body === undefined) throw new Error(`no recorded response for ${key}`);
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  return { fn, calls };
}

const VERMONT = { lat: 43.3, lon: -72.48, timezone: 'America/New_York' };
const TEXAS = { lat: 29.58, lon: -95.76, timezone: 'America/Chicago' };
const FLORIDA = { lat: 28.08, lon: -80.61, timezone: 'America/New_York' };
const MAINE = { lat: 43.66, lon: -70.26, timezone: 'America/New_York' };

function expectPlace(r: { lat: number; lon: number; timezone?: string } | undefined, want: typeof VERMONT) {
  expect(r).toBeDefined();
  expect(r!.lat).toBeCloseTo(want.lat, 1);
  expect(r!.lon).toBeCloseTo(want.lon, 1);
  expect(r!.timezone).toBe(want.timezone);
}

describe('a region typed in English, under every app language', () => {
  for (const lang of ['en', 'ja', 'ko', 'zh']) {
    it(`${lang}: Springfield, Vermont / Springfield, VT → Vermont only`, async () => {
      for (const place of ['Springfield, Vermont', 'Springfield, VT']) {
        const out = await searchOpenMeteo(place, lang, recordedFetch().fn, opts);
        expect(out.matched).toBe(true);
        expect(out.results).toHaveLength(1);
        expectPlace(out.results[0], VERMONT);
      }
    });
    it(`${lang}: Richmond, Texas → Texas; Melbourne, Florida → Florida first; Portland, Maine → Maine`, async () => {
      const richmond = await searchOpenMeteo('Richmond, Texas', lang, recordedFetch().fn, opts);
      expect(richmond.matched).toBe(true);
      expectPlace(richmond.results[0], TEXAS);
      const melbourne = await searchOpenMeteo('Melbourne, Florida', lang, recordedFetch().fn, opts);
      expectPlace(melbourne.results[0], FLORIDA);
      const portland = await searchOpenMeteo('Portland, Maine', lang, recordedFetch().fn, opts);
      expectPlace(portland.results[0], MAINE);
    });
  }

  it('the place is shown in the user’s language', async () => {
    const ja = await searchOpenMeteo('Springfield, Vermont', 'ja', recordedFetch().fn, opts);
    expect(ja.results[0].displayName).toContain('バーモント州');
    const ko = await searchOpenMeteo('Springfield, Vermont', 'ko', recordedFetch().fn, opts);
    expect(ko.results[0].displayName).toContain('버몬트');
    const zh = await searchOpenMeteo('Springfield, Vermont', 'zh', recordedFetch().fn, opts);
    expect(zh.results[0].displayName).toContain('佛蒙特');
  });
});

describe('a city and region typed in the app’s own script', () => {
  it('ja: スプリングフィールド, バーモント州 — the Vermont Springfield carries no Japanese name, so its English name is searched', async () => {
    const f = recordedFetch();
    const out = await searchOpenMeteo('スプリングフィールド, バーモント州', 'ja', f.fn, opts);
    expect(out.matched).toBe(true);
    expectPlace(out.results[0], VERMONT);
    expect(f.calls.some((c) => c.startsWith('/v1/get?id='))).toBe(true);
    expect(f.calls).toContain('/v1/search?name=Springfield&count=20&language=ja');
  });
  it('ko: 리치먼드, 텍사스 → Texas; zh: 斯普林菲尔德, 佛蒙特州 → Vermont', async () => {
    const ko = await searchOpenMeteo('리치먼드, 텍사스', 'ko', recordedFetch().fn, opts);
    expect(ko.matched).toBe(true);
    expectPlace(ko.results[0], TEXAS);
    const zh = await searchOpenMeteo('斯普林菲尔德, 佛蒙特州', 'zh', recordedFetch().fn, opts);
    expect(zh.matched).toBe(true);
    expectPlace(zh.results[0], VERMONT);
  });
  it('recognises kana, hangul and han names', () => {
    expect(['スプリングフィールド', '스프링필드', '斯普林菲尔德'].map(isNonLatinName)).toEqual([true, true, true]);
    expect(isNonLatinName('Springfield')).toBe(false);
  });
});

describe('when nothing is in the region typed', () => {
  it('the same-name places come back flagged matched:false, for the picker to say so', async () => {
    for (const lang of ['en', 'ja']) {
      const out = await searchOpenMeteo('Springfield, Atlantis', lang, recordedFetch().fn, opts);
      expect(out.qualified).toBe(true);
      expect(out.matched).toBe(false);
      expect(out.results.length).toBe(5);
    }
  });
  it('no region typed: one search, as before', async () => {
    const f = recordedFetch();
    const out = await searchOpenMeteo('Tokyo', 'ja', f.fn, opts);
    expect(out.qualified).toBe(false);
    expect(f.calls).toEqual(['/v1/search?name=Tokyo&count=5&language=ja']);
  });
  it('the English search failing falls back to the user’s language alone (no error)', async () => {
    const f = recordedFetch((u) => u.searchParams.get('language') === 'en');
    const out = await searchOpenMeteo('Springfield, バーモント州', 'ja', f.fn, opts);
    expect(out.matched).toBe(true);
    expectPlace(out.results[0], VERMONT);
  });
});

describe('what HEAD did with the same rows', () => {
  it('the Japanese rows alone never match "Vermont"; paired with their English twins they do', () => {
    const ja = (RECORDED['/v1/search?name=Springfield&count=20&language=ja'] as { results: Array<{ id: number; name: string }> }).results;
    const en = (RECORDED['/v1/search?name=Springfield&count=20&language=en'] as { results: Array<{ id: number; name: string }> }).results;
    expect(filterByQualifiers(ja, ['Vermont'])).toEqual([]);
    const paired = filterCandidates(pairById(ja, en), ['Vermont']);
    expect(paired).toHaveLength(1);
    expect(paired[0].loc).toMatchObject({ admin1: 'バーモント州' });
  });
});
