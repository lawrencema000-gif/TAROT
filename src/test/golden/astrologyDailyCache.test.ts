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
 * The real handler and `run` serve the request over a fake Supabase client
 * that holds the cache rows (the pattern of generate-reading-card-names.test.ts).
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';

type Row = Record<string, unknown>;

const h = vi.hoisted(() => {
  const state = {
    user: { id: '', email: 'qa@example.com' },
    /** astrology_horoscope_cache rows, keyed user|date|type. */
    cache: new Map<string, Row>(),
    /** The type of each cache read and each cache write. */
    reads: [] as string[],
    writes: [] as string[],
    chartReads: 0,
  };

  const chart = {
    natal_json: {
      planets: [
        { planet: 'Sun', longitude: 345.2, sign: 'Pisces', house: 5 },
        { planet: 'Moon', longitude: 101.7, sign: 'Cancer', house: 9 },
        { planet: 'Venus', longitude: 12.4, sign: 'Aries', house: 6 },
      ],
      houses: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330],
    },
    big_three_json: { sun: { sign: 'Pisces' } },
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
            return { data: row ? { content_json: row.content_json } : null, error: null };
          }),
          upsert: async (row: Row) => {
            state.writes.push(String(row.type));
            state.cache.set(`${row.user_id}|${row.date}|${row.type}`, row);
            return { error: null };
          },
        };
      }
      if (table === 'astrology_natal_charts') {
        return chain(() => {
          state.chartReads += 1;
          return { data: chart, error: null };
        });
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
  return { state, client, served };
});

vi.mock('jsr:@supabase/functions-js/edge-runtime.d.ts', () => ({}));
vi.mock('npm:zod@3.24.1', async () => await import('zod'));
vi.mock('npm:@supabase/supabase-js@2.57.4', () => ({ createClient: () => h.client }));
// The package the client ships, same version.
vi.mock('npm:astronomy-engine@2.1.19', async () => await import('astronomy-engine'));

const DAY = '2026-10-20';

async function daily(locale: string): Promise<Row> {
  const res = await h.served.fn!(new Request('http://fn.test/astrology-daily', {
    method: 'POST',
    headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: DAY, locale }),
  }));
  expect(res.status).toBe(200);
  return (await res.json()) as Row;
}

/** The function, loaded at run time by a specifier the app's typecheck does not follow (see generate-reading-library.test.ts). */
const FUNCTION_MODULE = '../../../supabase/functions/astrology-daily/index';

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
  // A member of their own for each test: the handler's rate limit is per member.
  n += 1;
  h.state.user = { id: `00000000-0000-4000-8000-${String(n + 700).padStart(12, '0')}`, email: 'qa@example.com' };
  h.state.cache.clear();
  h.state.reads.length = 0;
  h.state.writes.length = 0;
  h.state.chartReads = 0;
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
    h.state.cache.set(`${h.state.user.id}|${DAY}|daily:${lng}`, { content_json: CACHED_BEFORE_FIX[lng] });

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
    expect(h.state.chartReads).toBe(1);
    expect(h.state.writes).toHaveLength(1);
  });

  it.each([
    ['en', 'daily', 'What would I do today if I had no fear?'],
    ['ko', 'daily:ko', '두려움이 없다면 오늘 무엇을 할까?'],
  ] as const)('%s keeps the rows it has, under %s: its text did not change', async (lng, type, prompt) => {
    const kept = { date: DAY, journalPrompt: prompt };
    h.state.cache.set(`${h.state.user.id}|${DAY}|${type}`, { content_json: kept });

    expect(await daily(lng)).toEqual(kept);
    expect(h.state.reads).toEqual([type]);
    expect(h.state.chartReads).toBe(0);
  });
});
