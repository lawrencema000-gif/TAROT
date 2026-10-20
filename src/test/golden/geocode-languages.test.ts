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
 * same answers. The bare-city fixture (p9 R28) was recorded the same day
 * by the PA proof (om-fixture.mjs), trimmed to the fields the module reads.
 */
import { describe, expect, it } from 'vitest';
import fixture from './geocode-languages.fixture.json';
import bareFixture from './geocode-bare-cities.fixture.json';
import { cityNameVariants, rankPlaces, searchOpenMeteo, type OpenMeteoRow } from '../../../supabase/functions/astrology-geocode/openmeteo';
import { filterByQualifiers, filterCandidates, pairById, isNonLatinName } from '../../../supabase/functions/astrology-geocode/qualifier';

const RECORDED = { ...(fixture as Record<string, unknown>), ...(bareFixture as Record<string, unknown>) };
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

/*
 * p9 R28: a city typed by its common name, with no region. Open-Meteo
 * matches a name of one or two characters only exactly, and the city's own
 * row is named 福岡市 / 부산광역시 / 青岛市, so HEAD's one search listed
 * same-name villages (福岡 → Saitama first; 대구 → a village in North Korea)
 * or nothing (京都, 静岡, 東京), and onboarding's auto-resolve cast the
 * first row.
 */
const CITY_FIRST: Array<[string, string, string, number, number, string]> = [
  ['ja', '福岡', '福岡市, 福岡県, 日本', 33.6, 130.42, 'Asia/Tokyo'],
  ['ja', '京都', '京都市, 京都府, 日本', 35.02, 135.75, 'Asia/Tokyo'],
  ['ja', '静岡', '静岡市, 静岡県, 日本', 34.98, 138.38, 'Asia/Tokyo'],
  ['ja', '神戸', '神戸市, 兵庫県, 日本', 34.69, 135.18, 'Asia/Tokyo'],
  ['ja', '東京', '東京都, 日本', 35.69, 139.69, 'Asia/Tokyo'],
  ['ko', '부산', '부산광역시, 대한민국', 35.1, 129.03, 'Asia/Seoul'],
  ['ko', '대구', '대구광역시, 대한민국', 35.87, 128.59, 'Asia/Seoul'],
  ['zh', '青岛', '青岛市, 山东, 中国', 36.06, 120.38, 'Asia/Shanghai'],
];

describe('a city typed by its common name, with no region (p9 R28)', () => {
  for (const [lang, q, first, lat, lon, tz] of CITY_FIRST) {
    it(`${lang}: ${q} → ${first}`, async () => {
      const out = await searchOpenMeteo(q, lang, recordedFetch().fn, opts);
      expect(out.matched).toBe(true);
      expect(out.results[0].displayName).toBe(first);
      expectPlace(out.results[0], { lat, lon, timezone: tz });
    });
  }

  it('the villages of the same name are still offered, after the city', async () => {
    const out = await searchOpenMeteo('福岡', 'ja', recordedFetch().fn, opts);
    expect(out.results.map((r) => r.displayName).slice(0, 3)).toEqual(['福岡市, 福岡県, 日本', '福岡, 埼玉県, 日本', '福岡, 岩手県, 日本']);
    expect(out.results).toHaveLength(5);
    const daegu = await searchOpenMeteo('대구', 'ko', recordedFetch().fn, opts);
    expect(daegu.results[1].displayName).toContain('조선민주주의인민공화국');
  });

  it('the municipal forms are searched alongside a short name only', async () => {
    const f = recordedFetch();
    await searchOpenMeteo('福岡', 'ja', f.fn, opts);
    expect(f.calls).toEqual([
      '/v1/search?name=福岡&count=20&language=ja',
      '/v1/search?name=福岡市&count=20&language=ja',
      '/v1/search?name=福岡都&count=20&language=ja',
    ]);
    // Three characters and more match loosely: 名古屋 finds 名古屋市 in one search.
    const nagoya = recordedFetch();
    const out = await searchOpenMeteo('名古屋', 'ja', nagoya.fn, opts);
    expect(nagoya.calls).toEqual(['/v1/search?name=名古屋&count=5&language=ja']);
    expect(out.results[0].displayName).toBe('名古屋市, 愛知県, 日本');
    const en = recordedFetch();
    await searchOpenMeteo('Fukuoka', 'en', en.fn, opts);
    expect(en.calls).toEqual(['/v1/search?name=Fukuoka&count=5&language=en']);
  });

  it('a municipal form that fails adds nothing; the name’s own search failing is an error', async () => {
    const out = await searchOpenMeteo('福岡', 'ja', recordedFetch((u) => u.searchParams.get('name') === '福岡都').fn, opts);
    expect(out.results[0].displayName).toBe('福岡市, 福岡県, 日本');
    await expect(searchOpenMeteo('福岡', 'ja', recordedFetch((u) => u.searchParams.get('name') === '福岡').fn, opts)).rejects.toThrow('open-meteo 503');
  });

  it('cityNameVariants: per language, own script, one or two characters, not already municipal', () => {
    expect(cityNameVariants('福岡', 'ja')).toEqual(['福岡市', '福岡都']);
    expect(cityNameVariants('京都', 'ja')).toEqual(['京都市', '京都都']);
    expect(cityNameVariants('堺', 'ja')).toEqual(['堺市', '堺都']);
    expect(cityNameVariants('福岡市', 'ja')).toEqual([]);
    expect(cityNameVariants('名古屋', 'ja')).toEqual([]);
    expect(cityNameVariants('부산', 'ko')).toEqual(['부산시', '부산광역시', '부산특별시']);
    expect(cityNameVariants('부산시', 'ko')).toEqual([]);
    expect(cityNameVariants('青岛', 'zh')).toEqual(['青岛市']);
    expect(cityNameVariants('Tokyo', 'ja')).toEqual([]);
    expect(cityNameVariants('福岡', 'en')).toEqual([]);
    expect(cityNameVariants('서울', 'ja')).toEqual([]);
  });

  it('rankPlaces: populated places first, then population, then the seat; one row per id', () => {
    const rows: OpenMeteoRow[] = [
      { id: 1, name: '広島', feature_code: 'ISL', latitude: 0, longitude: 0 },
      { id: 2, name: '広島', feature_code: 'PPLX', latitude: 0, longitude: 0 },
      { id: 3, name: '広島市', feature_code: 'PPLA', population: 1200754, latitude: 0, longitude: 0 },
      { id: 3, name: '広島市', feature_code: 'PPLA', population: 1200754, latitude: 0, longitude: 0 },
      { id: 4, name: 'X', feature_code: 'PPLA2', latitude: 0, longitude: 0 },
      { id: 5, name: 'Y', feature_code: 'PPLQ', population: 9000, latitude: 0, longitude: 0 },
    ];
    expect(rankPlaces(rows).map((r) => r.id)).toEqual([3, 4, 2, 5, 1]);
  });
});

describe('a short CJK city with its region (p9 R28)', () => {
  it('ja: 京都, 京都府 matches 京都市 (京都 alone found nothing to match)', async () => {
    const out = await searchOpenMeteo('京都, 京都府', 'ja', recordedFetch().fn, opts);
    expect(out.matched).toBe(true);
    expect(out.results[0].displayName).toBe('京都市, 京都府, 日本');
  });
  it('ko: 대구, 대한민국 → 대구광역시; zh: 青岛, 山东 → 青岛市', async () => {
    const ko = await searchOpenMeteo('대구, 대한민국', 'ko', recordedFetch().fn, opts);
    expect(ko.results[0].displayName).toBe('대구광역시, 대한민국');
    const zh = await searchOpenMeteo('青岛, 山东', 'zh', recordedFetch().fn, opts);
    expect(zh.results[0].displayName).toBe('青岛市, 山东, 中国');
  });
});

describe('what HEAD did with the same rows', () => {
  it('p9 R28: the name’s own rows put a village first (福岡 Saitama, 대구 North Korea) or are empty (京都, 東京)', () => {
    const rows = (k: string) => ((RECORDED[k] as { results?: OpenMeteoRow[] }).results ?? []);
    expect(rows('/v1/search?name=福岡&count=20&language=ja')[0]).toMatchObject({ admin1: '埼玉県', feature_code: 'PPL' });
    expect(rows('/v1/search?name=대구&count=20&language=ko')[0]).toMatchObject({ country_code: 'KP' });
    expect(rows('/v1/search?name=京都&count=20&language=ja')).toEqual([]);
    expect(rows('/v1/search?name=東京&count=20&language=ja')).toEqual([]);
  });

  it('the Japanese rows alone never match "Vermont"; paired with their English twins they do', () => {
    const ja = (RECORDED['/v1/search?name=Springfield&count=20&language=ja'] as { results: Array<{ id: number; name: string }> }).results;
    const en = (RECORDED['/v1/search?name=Springfield&count=20&language=en'] as { results: Array<{ id: number; name: string }> }).results;
    expect(filterByQualifiers(ja, ['Vermont'])).toEqual([]);
    const paired = filterCandidates(pairById(ja, en), ['Vermont']);
    expect(paired).toHaveLength(1);
    expect(paired[0].loc).toMatchObject({ admin1: 'バーモント州' });
  });
});
