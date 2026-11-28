// @vitest-environment node
/**
 * p10 d2-ja-05, d3-ko-08, through the real astrology-daily: a member's day
 * is cached per revision of their language's text. It was cached under
 * 'daily:ja' / 'daily:zh' with no revision, so a member who had opened
 * today's horoscope before the full-width punctuation shipped kept
 * 「…最後に感じたのはいつ?」 and 「…被理解,是什么时候?」 until their next local
 * day. Those rows are now passed over; en and ko, whose text did not change,
 * keep the rows they have.
 *
 * p12 WP-P2-06: a cache hit keeps the day's text but reads the Moon and the
 * transits at the request time (home-astro-14), so it reads the chart too;
 * and a cached day is served only while it was built from the member's
 * chart (gap-1-04): after a recast the day is generated again and stamped
 * with the new chart.
 *
 * The real handler and `run` serve the request over a fake Supabase client
 * that holds the cache rows (the pattern of generate-reading-card-names.test.ts).
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll, afterEach } from 'vitest';

type Row = Record<string, unknown>;

/** When the fixture chart was cast (astrology_natal_charts.computed_at), and an earlier cast. */
const T1 = '2026-10-19T12:00:00.000Z';
const T0 = '2026-10-01T12:00:00.000Z';

const h = vi.hoisted(() => {
  const fixture = {
    natal_json: {
      planets: [
        { planet: 'Sun', longitude: 345.2, sign: 'Pisces', house: 5 },
        { planet: 'Moon', longitude: 101.7, sign: 'Cancer', house: 9 },
        { planet: 'Venus', longitude: 12.4, sign: 'Aries', house: 6 },
      ],
      houses: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330],
    },
    big_three_json: { sun: { sign: 'Pisces' } },
    computed_at: '2026-10-19T12:00:00.000Z',
  };
  const state = {
    user: { id: '', email: 'qa@example.com' },
    /** astrology_horoscope_cache rows, keyed user|date|type. */
    cache: new Map<string, Row>(),
    /** The type of each cache read and each cache write. */
    reads: [] as string[],
    writes: [] as string[],
    /** Every upserted row. */
    upserts: [] as Row[],
    chartReads: 0,
    /** The member's astrology_natal_charts row (null: none cast). */
    chart: fixture as Row | null,
  };

  /** A select chain: the eq filters are kept, and maybeSingle answers from them. */
  const chain = (answer: (eq: Row) => unknown) => {
    const eq: Row = {};
    const q: Record<string, unknown> = {};
    q.select = () => q;
    q.eq = (col: string, v: unknown) => {
      eq[col] = v;
      return q;
    };
    q.maybeSingle = async () => answer(eq);
    return q;
  };

  const client = {
    auth: { getUser: async () => ({ data: { user: state.user }, error: null }) },
    from(table: string) {
      if (table === 'astrology_horoscope_cache') {
        return {
          select: () => chain((eq) => {
            state.reads.push(String(eq.type));
            const row = state.cache.get(`${eq.user_id}|${eq.date}|${eq.type}`);
            return {
              data: row
                ? { content_json: row.content_json, chart_computed_at: row.chart_computed_at ?? null, generated_at: row.generated_at ?? null }
                : null,
              error: null,
            };
          }),
          upsert: async (row: Row) => {
            state.writes.push(String(row.type));
            state.upserts.push(row);
            state.cache.set(`${row.user_id}|${row.date}|${row.type}`, row);
            return { error: null };
          },
        };
      }
      if (table === 'astrology_natal_charts') {
        return chain(() => {
          state.chartReads += 1;
          return { data: state.chart, error: null };
        });
      }
      if (table === 'profiles') {
        return chain(() => ({ data: { timezone: 'UTC' }, error: null }));
      }
      throw new Error(`unexpected table ${table}`);
    },
  };

  const env: Record<string, string> = {
    SUPABASE_URL: 'http://db.test',
    SUPABASE_ANON_KEY: 'anon',
    SUPABASE_SERVICE_ROLE_KEY: 'service',
  };
  const served: { fn: null | ((req: Request) => Promise<Response>) } = { fn: null };
  (globalThis as Record<string, unknown>).Deno = {
    serve: (fn: (req: Request) => Promise<Response>) => {
      served.fn = fn;
    },
    env: { get: (k: string) => env[k] },
    version: { deno: 'test', v8: 'test', typescript: 'test' },
  };
  return { state, client, served, fixture };
});

vi.mock('jsr:@supabase/functions-js/edge-runtime.d.ts', () => ({}));
vi.mock('npm:zod@3.24.1', async () => await import('zod'));
vi.mock('npm:@supabase/supabase-js@2.57.4', () => ({ createClient: () => h.client }));
// The package the client ships, same version.
vi.mock('npm:astronomy-engine@2.1.19', async () => await import('astronomy-engine'));

const DAY = '2026-10-20';

async function request(locale: string, date = DAY): Promise<Response> {
  return await h.served.fn!(new Request('http://fn.test/astrology-daily', {
    method: 'POST',
    headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, locale }),
  }));
}

async function daily(locale: string, date = DAY): Promise<Row> {
  const res = await request(locale, date);
  expect(res.status).toBe(200);
  return (await res.json()) as Row;
}

/** The function, loaded at run time by a specifier the app's typecheck does not follow (see generate-reading-library.test.ts). */
const FUNCTION_MODULE = '../../../supabase/functions/astrology-daily/index';
/** The server's chart caster (natal-midheaven.test.ts loads it the same way). */
const SERVER_NATAL = '../../../supabase/functions/_shared/natal';

beforeAll(async () => {
  for (const m of ['log', 'info', 'warn', 'error'] as const) vi.spyOn(console, m).mockImplementation(() => {});
  // Nothing here may reach the network.
  vi.stubGlobal('fetch', vi.fn(async () => {
    throw new Error('unexpected fetch');
  }));
  await import(/* @vite-ignore */ FUNCTION_MODULE);
  expect(typeof h.served.fn).toBe('function');
});
afterAll(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

let n = 0;
beforeEach(() => {
  // The server takes the app's date only within a day of the UTC date.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-20T03:00:00Z'));
  // A member of their own for each test: the handler's rate limit is per member.
  n += 1;
  h.state.user = { id: `00000000-0000-4000-8000-${String(n + 700).padStart(12, '0')}`, email: 'qa@example.com' };
  h.state.cache.clear();
  h.state.reads.length = 0;
  h.state.writes.length = 0;
  h.state.upserts.length = 0;
  h.state.chartReads = 0;
  h.state.chart = h.fixture;
});
afterEach(() => {
  vi.useRealTimers();
});

/** A member's day as it was cached before the fix (QA's text). */
const CACHED_BEFORE_FIX: Record<'ja' | 'zh', Row> = {
  ja: { date: DAY, journalPrompt: '本当に見られ理解されたと最後に感じたのはいつ?' },
  zh: { date: DAY, ritual: '闭上眼,想象自己漂浮在平静而疗愈的水中。', journalPrompt: '上一次真正被看见、被理解,是什么时候?' },
};

/** An ASCII comma or question mark straight after Japanese or Chinese text. */
const ASCII_AFTER_CJK = /[぀-ヿ㐀-鿿][,?]/;

describe('astrology-daily: a day cached before its text changed is not served (p10 d2-ja-05, d3-ko-08)', () => {
  it.each(['ja', 'zh'] as const)('%s: the day cached before the punctuation fix is passed over, and today is written afresh', async (lng) => {
    h.state.cache.set(`${h.state.user.id}|${DAY}|daily:${lng}`, { content_json: CACHED_BEFORE_FIX[lng], chart_computed_at: T1 });

    const day = await daily(lng);
    expect(day.journalPrompt).toMatch(/？$/);
    expect(JSON.stringify(day)).not.toMatch(ASCII_AFTER_CJK);
    // Read and written under the locale's revision, never the bare key.
    expect(h.state.reads).toHaveLength(1);
    expect(h.state.reads[0]).toMatch(new RegExp(`^daily:${lng}:r\\d+$`));
    expect(h.state.writes).toEqual(h.state.reads);
  });

  it('the next request that day is served from the row just written', async () => {
    const first = await daily('zh');
    expect(await daily('zh')).toEqual(first);
    // The hit reads the chart too, for the live Moon and transits.
    expect(h.state.chartReads).toBe(2);
    expect(h.state.writes).toHaveLength(1);
  });

  it.each([
    ['en', 'daily', 'What would I do today if I had no fear?'],
    ['ko', 'daily:ko', '두려움이 없다면 오늘 무엇을 할까?'],
  ] as const)('%s keeps the rows it has, under %s: its text did not change', async (lng, type, prompt) => {
    const kept = { date: DAY, journalPrompt: prompt };
    h.state.cache.set(`${h.state.user.id}|${DAY}|${type}`, { content_json: kept, chart_computed_at: T1 });

    const day = await daily(lng);
    expect(day).toMatchObject(kept);
    // The Moon is read now: EclipticGeoMoon(2026-10-20T03:00Z) = 312.716°,
    // Aquarius, house 11 of the fixture's equal houses from 0° Aries.
    expect(day.moonSign).toBe('Aquarius');
    expect(day.moonHouse).toBe(11);
    expect(h.state.reads).toEqual([type]);
    expect(h.state.writes).toEqual([]);
    expect(h.state.chartReads).toBe(1);
  });
});

describe('astrology-daily: a cached day belongs to one chart (gap-1-04)', () => {
  const kept = { date: DAY, theme: 'the old chart’s theme', journalPrompt: 'kept' };
  const put = (row: Row) => h.state.cache.set(`${h.state.user.id}|${DAY}|daily`, { content_json: kept, ...row });

  it('a row stamped with an earlier chart is not served: the day is generated again and stamped with the chart it was built from', async () => {
    put({ chart_computed_at: T0, generated_at: '2026-10-20T01:00:00.000Z' });
    const day = await daily('en');
    expect(day.theme).not.toBe(kept.theme);
    expect(h.state.writes).toEqual(['daily']);
    expect(h.state.upserts[0].chart_computed_at).toBe(T1);
    expect(h.state.upserts[0].generated_at).toBe('2026-10-20T03:00:00.000Z');
  });

  it('a row stamped with the member\'s chart is served, with no write', async () => {
    put({ chart_computed_at: T1, generated_at: '2026-10-20T01:00:00.000Z' });
    expect(await daily('en')).toMatchObject(kept);
    expect(h.state.writes).toEqual([]);
  });

  it('a row from before the stamp column is served when it was generated after the chart was cast, and generated again when before', async () => {
    put({ chart_computed_at: null, generated_at: '2026-10-20T01:00:00.000Z' });
    expect(await daily('en')).toMatchObject(kept);
    expect(h.state.writes).toEqual([]);

    put({ chart_computed_at: null, generated_at: '2026-10-19T11:59:59.000Z' });
    expect((await daily('en')).theme).not.toBe(kept.theme);
    expect(h.state.writes).toEqual(['daily']);
    expect(h.state.upserts[0].chart_computed_at).toBe(T1);
  });

  it('no chart: NATAL_CHART_MISSING, even with a cached day', async () => {
    put({ chart_computed_at: T1, generated_at: '2026-10-20T01:00:00.000Z' });
    h.state.chart = null;
    const res = await request('en');
    expect(res.status).toBe(404);
    expect(JSON.stringify(await res.json())).toContain('NATAL_CHART_MISSING');
    expect(h.state.writes).toEqual([]);
  });

  it('golden: after a recast the same day is the new chart\'s transits and Moon house', async () => {
    interface ServerNatal {
      computeNatalChart: (input: { birthDate: string; birthTime?: string | null; lat?: number; lon?: number; timezone?: string }) => {
        planets: { planet: string; longitude: number; sign: string; house: number | null }[];
        houses: number[];
      };
    }
    const natal = (await import(/* @vite-ignore */ SERVER_NATAL)) as ServerNatal;
    const asRow = (c: ReturnType<ServerNatal['computeNatalChart']>, computedAt: string): Row => ({
      natal_json: { planets: c.planets, houses: c.houses },
      big_three_json: { sun: { sign: c.planets.find((p) => p.planet === 'Sun')!.sign } },
      computed_at: computedAt,
    });
    const chartA = natal.computeNatalChart({ birthDate: '1991-03-08', birthTime: '06:45', lat: 34.6937, lon: 135.5023, timezone: 'Asia/Tokyo' });
    const chartB = natal.computeNatalChart({ birthDate: '1985-01-20', birthTime: '08:00', lat: 34.0522, lon: -118.2437, timezone: 'America/Los_Angeles' });

    vi.setSystemTime(new Date('2026-11-15T08:03:42Z'));
    const day = '2026-11-15';
    const hits = (d: Row) => (d.transitHighlights as { planet: string; aspect: string; natalPlanet: string }[])
      .map((t) => `${t.planet} ${t.aspect} ${t.natalPlanet}`);

    h.state.chart = asRow(chartA, '2026-11-01T00:00:00.000Z');
    const before = await daily('en', day);
    expect(hits(before)).toContain('Pluto conjunction Saturn');
    expect(before.moonHouse).toBe(11);

    // The member corrects their birth details: the chart is cast again.
    h.state.chart = asRow(chartB, '2026-11-15T08:00:00.000Z');
    const after = await daily('en', day);
    expect(hits(after)).not.toContain('Pluto conjunction Saturn');
    expect(hits(after)).toEqual(expect.arrayContaining(['Mercury conjunction Pluto', 'Jupiter square Saturn']));
    expect(after.moonHouse).toBe(12);
    expect(h.state.writes).toEqual(['daily', 'daily']);
    expect(h.state.upserts[1].chart_computed_at).toBe('2026-11-15T08:00:00.000Z');
  });
});
