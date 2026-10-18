// @vitest-environment node
/**
 * p9 QZ-6: generate-reading returned an interpretation it found in its
 * response cache BEFORE the premium_readings insert that a fresh one gets,
 * though the handler had already taken the charge. The member paid for a
 * reading the Library's AI readings never listed, and the daily limit, which
 * counts those rows, never counted it. The cache-hit branch now files the
 * row the same way before it answers; an insert that fails fails the request,
 * and the handler gives the charge back, as on the fresh path.
 *
 * The real function runs here — the real handler (auth, AI gate, spend,
 * replays) and the real `run` — over a fake Supabase client that keeps the
 * Library rows, the response cache, the request claims, the charges and the
 * refunds, with the model behind a stubbed fetch. Deno.serve hands over the
 * handler; the npm:/jsr: imports resolve to their Node packages.
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';

type Row = Record<string, unknown>;

const h = vi.hoisted(() => {
  const state = {
    user: { id: '', email: 'qa@example.com' },
    isPremium: false,
    /** premium_readings: the Library's AI readings, and what the daily limit counts. */
    premium: [] as Row[],
    insertFails: false,
    /** ai_response_cache through ai_cache_get / ai_cache_set: readings and stored replays. */
    cache: new Map<string, unknown>(),
    /** ai_response_cache claim rows (the primary key makes a second insert fail). */
    claims: new Set<string>(),
    /** Spend keys the debit RPC has charged. */
    charges: [] as string[],
    refunds: [] as string[],
  };

  /** A chainable query: each filter returns it; awaiting it, or maybeSingle, answers. */
  const query = (answer: () => unknown) => {
    const q: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'gte', 'in', 'like', 'limit', 'order', 'neq', 'is']) q[m] = () => q;
    q.maybeSingle = async () => answer();
    q.single = q.maybeSingle;
    q.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => Promise.resolve().then(answer).then(resolve, reject);
    return q;
  };

  const client = {
    auth: { getUser: async () => ({ data: { user: state.user }, error: null }) },
    from(table: string) {
      switch (table) {
        case 'feature_flags':
          return query(() => ({ data: null, error: null }));
        case 'profiles':
          return query(() => ({ data: { is_premium: state.isPremium }, error: null }));
        case 'journal_entries':
        case 'moonstone_transactions':
        case 'premium_action_log':
          return query(() => ({ data: [], error: null }));
        case 'premium_readings':
          return {
            select: () => query(() => ({ count: state.premium.filter((r) => r.user_id === state.user.id).length, error: null })),
            insert: (row: Row) => query(() => {
              if (state.insertFails) return { error: { message: 'insert failed', code: '08006' } };
              state.premium.push(row);
              return { error: null };
            }),
          };
        case 'ai_usage_ledger':
          return { insert: () => query(() => ({ error: null })) };
        case 'ai_response_cache':
          return {
            insert: (row: Row) => query(() => {
              const key = row.cache_key as string;
              if (state.claims.has(key)) return { error: { code: '23505', message: 'duplicate key value' } };
              state.claims.add(key);
              return { error: null };
            }),
            select: () => query(() => ({ data: { created_at: new Date().toISOString() }, error: null })),
            delete: () => {
              const q = query(() => ({ error: null }));
              q.eq = (_col: string, key: string) => {
                state.claims.delete(key);
                return q;
              };
              return q;
            },
          };
      }
      throw new Error(`unexpected table ${table}`);
    },
    async rpc(name: string, args: Row) {
      switch (name) {
        case 'ai_check_and_record_usage':
          return { data: [{ allowed: true, used: 1, ceiling: 200 }], error: null };
        case 'spend_moonstones_for_action_srv': {
          const key = args.p_idempotency_key as string;
          const charged = !state.charges.includes(key);
          if (charged) state.charges.push(key);
          return { data: [{ allowed: true, charged, new_balance: 100, premium_bypass: false, soft_cap_reached: false }], error: null };
        }
        case 'refund_action_spend_srv':
          state.refunds.push(args.p_idempotency_key as string);
          return { data: [{ refunded: true }], error: null };
        case 'ai_cache_get':
          return { data: state.cache.get(args.p_cache_key as string) ?? null, error: null };
        case 'ai_cache_set':
          state.cache.set(args.p_cache_key as string, args.p_response);
          return { error: null };
      }
      throw new Error(`unexpected rpc ${name}`);
    },
  };

  const env: Record<string, string> = {
    SUPABASE_URL: 'http://db.test',
    SUPABASE_ANON_KEY: 'anon',
    SUPABASE_SERVICE_ROLE_KEY: 'service',
    OPENAI_API_KEY: 'sk-test',
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

const AI_TEXT = '1) 概要\n新しい始まりが近づいています。\n\n2) 結び\n軽やかに一歩を。';
const openAi = vi.fn(async () => new Response(
  JSON.stringify({ choices: [{ message: { content: AI_TEXT } }], usage: { prompt_tokens: 40, completion_tokens: 80, total_tokens: 120 } }),
  { status: 200, headers: { 'Content-Type': 'application/json' } },
));

const reading = (requestId: string = crypto.randomUUID()) => ({
  cards: [{ id: 0, name: 'The Fool', reversed: false, keywords: ['beginnings'], meaningUpright: 'A beginning.' }],
  spreadType: 'single',
  focusArea: 'general',
  question: '新しい仕事はどうなりますか',
  locale: 'ja',
  requestId,
});

async function call(body: Row): Promise<{ status: number; json: Row; replayed: boolean }> {
  const res = await h.served.fn!(new Request('http://fn.test/generate-reading', {
    method: 'POST',
    headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
  return { status: res.status, json: (await res.json()) as Row, replayed: res.headers.get('X-Spend-Replay') === '1' };
}

const libraryRows = () => h.state.premium.filter((r) => r.user_id === h.state.user.id);

/**
 * The function, loaded at run time by a specifier the app's typecheck does
 * not follow: tsconfig.app.json checks src, and the function's Deno globals
 * and npm:/jsr: imports are not its to check (vitest resolves them above).
 */
const FUNCTION_MODULE = '../../../supabase/functions/generate-reading/index';

beforeAll(async () => {
  for (const m of ['log', 'info', 'warn', 'error'] as const) vi.spyOn(console, m).mockImplementation(() => {});
  vi.stubGlobal('fetch', openAi);
  await import(/* @vite-ignore */ FUNCTION_MODULE);
  expect(typeof h.served.fn).toBe('function');
});
afterAll(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

let n = 0;
beforeEach(() => {
  // A member of their own for each test: the handler's rate limit (5 a minute) is per member.
  n += 1;
  h.state.user = { id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`, email: 'qa@example.com' };
  h.state.isPremium = false;
  h.state.insertFails = false;
  h.state.cache.clear();
  h.state.claims.clear();
  h.state.charges.length = 0;
  h.state.refunds.length = 0;
  openAi.mockClear();
});

describe('generate-reading: a cached interpretation is filed like a fresh one (p9 QZ-6)', () => {
  it('the second request for the same table is answered from the cache, charged, and in the Library', async () => {
    const fresh = await call(reading());
    expect(fresh.status).toBe(200);
    expect(fresh.json).toEqual({ interpretation: AI_TEXT, usedLlm: true, cardCount: 1, deck: 'tarot' });
    expect(openAi).toHaveBeenCalledTimes(1);
    expect(libraryRows()).toHaveLength(1);

    const cached = await call(reading());
    expect(cached.status).toBe(200);
    expect(cached.json).toEqual({ interpretation: AI_TEXT, usedLlm: true, cardCount: 1, deck: 'tarot', cached: true });
    // No second model call: it came from the cache…
    expect(openAi).toHaveBeenCalledTimes(1);
    // …it was charged (two requests, two charges, nothing given back)…
    expect(h.state.charges).toHaveLength(2);
    expect(h.state.refunds).toEqual([]);
    // …and the Library lists it, in the row a fresh one gets.
    const rows = libraryRows();
    expect(rows).toHaveLength(2);
    expect(rows[1]).toEqual(rows[0]);
    expect(rows[1]).toEqual({
      user_id: h.state.user.id,
      reading_type: 'single',
      content: AI_TEXT,
      context: expect.objectContaining({ question: '新しい仕事はどうなりますか', focusArea: 'general', deck: 'tarot', usedLlm: true }),
      cards: [{ id: 0, name: 'The Fool', reversed: false }],
    });
  });

  it('the daily limit counts cached readings: a free member’s fourth is refused and not charged', async () => {
    for (let i = 0; i < 3; i++) expect((await call(reading())).status).toBe(200);
    expect(openAi).toHaveBeenCalledTimes(1);
    expect(libraryRows()).toHaveLength(3);

    const fourth = await call(reading());
    expect(fourth.status).toBe(429);
    expect((fourth.json.error as Row).code).toBe('DAILY_LIMIT_REACHED');
    // The charge the handler took for it was given back.
    expect(h.state.refunds).toEqual([h.state.charges[3]]);
    expect(libraryRows()).toHaveLength(3);
  });

  it('a Library insert that fails fails the cached answer too, and the charge is given back', async () => {
    expect((await call(reading())).status).toBe(200);
    h.state.insertFails = true;
    const failed = await call(reading());
    expect(failed.status).toBe(500);
    expect((failed.json.error as Row).code).toBe('READING_SAVE_FAILED');
    expect(h.state.refunds).toEqual([h.state.charges[1]]);
    expect(libraryRows()).toHaveLength(1);
  });

  it('a replay of the same request is the stored answer: no second row, no second charge', async () => {
    const id = crypto.randomUUID();
    expect((await call(reading())).status).toBe(200); // fills the cache
    const first = await call(reading(id));
    expect(first.json.cached).toBe(true);
    expect(libraryRows()).toHaveLength(2);

    // The connection dropped and the client sends the same request again.
    const again = await call(reading(id));
    expect(again.status).toBe(200);
    expect(again.replayed).toBe(true);
    expect(again.json).toEqual(first.json);
    expect(libraryRows()).toHaveLength(2);
    expect(h.state.charges).toHaveLength(2);
    expect(h.state.refunds).toEqual([]);
  });
});
