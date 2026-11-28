// @vitest-environment node
/**
 * p12 WP-P2-06, gap-1-04, through the real astrology-weekly and
 * astrology-monthly: a cached week or month belongs to one chart. After a
 * member corrected their birth details, This week and This month kept the
 * old chart's reading until the next Monday or the 1st. A row stamped with an
 * earlier chart is now generated again from the new one (the weekly key
 * moments from the new natal planets, the monthly New and Full Moon houses
 * from the new cusps) and stamped with it; a row stamped with the member's
 * chart is served with no write.
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll, afterEach } from 'vitest';

type Row = Record<string, unknown>;

const T0 = '2026-10-01T12:00:00.000Z';
const T1 = '2026-11-10T12:00:00.000Z';

const h = vi.hoisted(() => {
  const state = {
    user: { id: '', email: 'qa@example.com' },
    cache: new Map<string, Row>(),
    writes: [] as string[],
    upserts: [] as Row[],
    chart: null as Row | null,
  };

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
          select: () => chain((eq) => ({ data: state.cache.get(`${eq.user_id}|${eq.date}|${eq.type}`) ?? null, error: null })),
          upsert: async (row: Row) => {
            state.writes.push(`${row.type}@${row.date}`);
            state.upserts.push(row);
            state.cache.set(`${row.user_id}|${row.date}|${row.type}`, row);
            return { error: null };
          },
        };
      }
      if (table === 'astrology_natal_charts') return chain(() => ({ data: state.chart, error: null }));
      if (table === 'profiles') return chain(() => ({ data: { timezone: 'UTC' }, error: null }));
      throw new Error(`unexpected table ${table}`);
    },
  };

  const env: Record<string, string> = {
    SUPABASE_URL: 'http://db.test',
    SUPABASE_ANON_KEY: 'anon',
    SUPABASE_SERVICE_ROLE_KEY: 'service',
  };
  const served: { fns: ((req: Request) => Promise<Response>)[] } = { fns: [] };
  (globalThis as Record<string, unknown>).Deno = {
    serve: (fn: (req: Request) => Promise<Response>) => {
      served.fns.push(fn);
    },
    env: { get: (k: string) => env[k] },
    version: { deno: 'test', v8: 'test', typescript: 'test' },
  };
  return { state, client, served };
});

vi.mock('jsr:@supabase/functions-js/edge-runtime.d.ts', () => ({}));
vi.mock('npm:zod@3.24.1', async () => await import('zod'));
vi.mock('npm:@supabase/supabase-js@2.57.4', () => ({ createClient: () => h.client }));
vi.mock('npm:astronomy-engine@2.1.19', async () => await import('astronomy-engine'));

const MODULES = ['weekly', 'monthly'].map((k) => `../../../supabase/functions/astrology-${k}/index`);
const NATAL = '../../../supabase/functions/_shared/natal';

interface ServerNatal {
  computeNatalChart: (input: { birthDate: string; birthTime?: string | null; lat?: number; lon?: number; timezone?: string }) => {
    planets: { planet: string; longitude: number; sign: string; house: number | null }[];
    houses: number[];
  };
}
let natal: ServerNatal;

/** A cast chart as astrology_natal_charts holds it. */
function chartRow(input: Parameters<ServerNatal['computeNatalChart']>[0], computedAt: string): Row {
  const c = natal.computeNatalChart(input);
  return {
    natal_json: { planets: c.planets, houses: c.houses },
    big_three_json: { sun: { sign: c.planets.find((p) => p.planet === 'Sun')!.sign } },
    computed_at: computedAt,
  };
}
const OSAKA_1991 = { birthDate: '1991-03-08', birthTime: '06:45', lat: 34.6937, lon: 135.5023, timezone: 'Asia/Tokyo' };
const LA_1985 = { birthDate: '1985-01-20', birthTime: '08:00', lat: 34.0522, lon: -118.2437, timezone: 'America/Los_Angeles' };

beforeAll(async () => {
  for (const m of ['log', 'info', 'warn', 'error'] as const) vi.spyOn(console, m).mockImplementation(() => {});
  vi.stubGlobal('fetch', vi.fn(async () => {
    throw new Error('unexpected fetch');
  }));
  for (const m of MODULES) await import(/* @vite-ignore */ m);
  natal = (await import(/* @vite-ignore */ NATAL)) as ServerNatal;
  expect(h.served.fns).toHaveLength(2);
});
afterAll(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

let n = 0;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-15T08:00:00Z'));
  n += 1;
  h.state.user = { id: `00000000-0000-4000-8000-${String(n + 950).padStart(12, '0')}`, email: 'qa@example.com' };
  h.state.cache.clear();
  h.state.writes.length = 0;
  h.state.upserts.length = 0;
});
afterEach(() => {
  vi.useRealTimers();
});

const BODY = { date: '2026-11-15', timezone: 'Asia/Tokyo', locale: 'en' };

async function call(which: 0 | 1): Promise<Row> {
  const res = await h.served.fns[which](new Request('http://fn.test/x', {
    method: 'POST',
    headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
    body: JSON.stringify(BODY),
  }));
  expect(res.status).toBe(200);
  return (await res.json()) as Row;
}

describe.each([
  [0, 'weekly', '2026-11-09'],
  [1, 'monthly', '2026-11-01'],
] as const)('astrology-%s: a cached reading belongs to one chart (gap-1-04)', (which, type, key) => {
  it('a row stamped with an earlier chart is generated again from the new chart, and stamped with it', async () => {
    // What the old chart gave, cached at T0.
    h.state.chart = chartRow(OSAKA_1991, T0);
    const old = await call(which);
    expect(h.state.writes).toEqual([`${type}@${key}`]);
    expect(h.state.upserts[0].chart_computed_at).toBe(T0);

    // The member corrects their birth details at T1.
    h.state.chart = chartRow(LA_1985, T1);
    const fresh = await call(which);
    expect(h.state.writes).toEqual([`${type}@${key}`, `${type}@${key}`]);
    expect(h.state.upserts[1].chart_computed_at).toBe(T1);

    // And the new reading is the new chart's.
    const fromScratch = await (async () => {
      h.state.cache.clear();
      return await call(which);
    })();
    expect(fresh).toEqual(fromScratch);
    if (type === 'weekly') expect(fresh.keyMoments).not.toEqual(old.keyMoments);
    else expect([fresh.newMoon, fresh.fullMoon]).not.toEqual([old.newMoon, old.fullMoon]);
  });

  it('a row stamped with the member\'s chart is served, with no write', async () => {
    h.state.chart = chartRow(LA_1985, T1);
    const kept = { kept: true };
    h.state.cache.set(`${h.state.user.id}|${key}|${type}`, { content_json: kept, chart_computed_at: T1, generated_at: T1 });
    expect(await call(which)).toEqual(kept);
    expect(h.state.writes).toEqual([]);
  });
});
