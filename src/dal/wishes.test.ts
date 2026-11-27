import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * What the Wishing Sky asks the server for (WP-P0-03, social-ai-03).
 *
 * The sky is read through the id-free views wish_sky and wish_sky_links. A
 * wish's author id never reaches the client: "yours" and "echoed" come from
 * the server as is_mine / echoed_by_me, and the echo lines as wish-id pairs.
 */

interface Call { name: string; op: string; columns?: string; returning?: string; payload?: unknown; filters: Array<[string, string, unknown]> }
const calls: Call[] = [];
let nextError: { code: string; message: string } | null = null;

const SKY_ROWS = [
  {
    id: 'w1', text: 'I wish for a quiet week', theme: 'other', star_x: 0.5, star_y: 0.6, star_seed: 7,
    open_to_help: false, wisher_label: null, granted_at: null, echo_count: 2,
    created_at: '2026-11-27T00:00:00Z', is_mine: true, echoed_by_me: false,
  },
  {
    id: 'w2', text: 'I wish my sister gets well', theme: 'health', star_x: 0.2, star_y: 0.7, star_seed: 9,
    open_to_help: true, wisher_label: 'Ana', granted_at: null, echo_count: 1,
    created_at: '2026-11-26T00:00:00Z', is_mine: false, echoed_by_me: true,
  },
];

function respond(c: Call): unknown {
  if (nextError) { const error = nextError; nextError = null; return { data: null, error }; }
  if (c.name === 'wish_sky') return { data: SKY_ROWS, error: null };
  if (c.name === 'wish_sky_links') return { data: [{ from_wish_id: 'w1', to_wish_id: 'w2' }], error: null };
  if (c.name === 'wishes' && c.op === 'insert') {
    const p = c.payload as Record<string, unknown>;
    return {
      data: {
        id: 'new', text: p.text, theme: p.theme, star_x: p.star_x, star_y: p.star_y, star_seed: p.star_seed,
        open_to_help: p.open_to_help, wisher_label: p.wisher_label, granted_at: null, echo_count: 0,
        created_at: '2026-11-27T01:00:00Z',
      },
      error: null,
    };
  }
  return { data: null, error: null };
}

function builder(name: string) {
  const c: Call = { name, op: 'select', filters: [] };
  const chain: Record<string, unknown> = {};
  chain.select = (cols: string) => { if (c.op === 'select') c.columns = cols; else c.returning = cols; return chain; };
  chain.insert = (payload: unknown) => { c.op = 'insert'; c.payload = payload; return chain; };
  chain.delete = () => { c.op = 'delete'; return chain; };
  chain.eq = (col: string, v: unknown) => { c.filters.push(['eq', col, v]); return chain; };
  chain.order = () => chain;
  chain.limit = () => chain;
  chain.single = () => chain;
  chain.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => {
    calls.push(c);
    return Promise.resolve(respond(c)).then(res, rej);
  };
  return chain;
}

vi.mock('../lib/supabase', () => ({ supabase: { from: (name: string) => builder(name) } }));
vi.mock('../utils/telemetry', () => ({ captureException: vi.fn() }));

const dal = await import('./wishes');

beforeEach(() => { calls.length = 0; nextError = null; });

describe('the sky is read without account ids', () => {
  it('listSky reads wish_sky and maps is_mine / echoed_by_me', async () => {
    const res = await dal.listSky();
    expect(calls.map((c) => [c.name, c.op, c.columns])).toEqual([['wish_sky', 'select', dal.SKY_COLUMNS]]);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.map((w) => [w.id, w.isMine, w.echoedByMe])).toEqual([['w1', true, false], ['w2', false, true]]);
    for (const w of res.data) expect(Object.keys(w)).not.toContain('userId');
  });

  it('listLinks reads the echo lines as wish-id pairs', async () => {
    const res = await dal.listLinks();
    expect(calls.map((c) => [c.name, c.op, c.columns])).toEqual([['wish_sky_links', 'select', 'from_wish_id, to_wish_id']]);
    expect(res).toEqual({ ok: true, data: [{ fromWishId: 'w1', toWishId: 'w2' }] });
  });

  it('listLinks reports a failed read', async () => {
    nextError = { code: '42501', message: 'permission denied' };
    expect(await dal.listLinks()).toEqual({ ok: false, error: 'wishingSky.errors.loadLinks' });
  });
});

describe('writes send only what the grants allow', () => {
  it('makeWish inserts exactly the 8 client columns and reads back no account id', async () => {
    const res = await dal.makeWish('me', { text: 'I wish for a quiet week', theme: 'other', openToHelp: false });
    expect(calls).toHaveLength(1);
    const c = calls[0];
    expect([c.name, c.op]).toEqual(['wishes', 'insert']);
    expect(Object.keys(c.payload as object).sort()).toEqual(
      ['user_id', 'text', 'theme', 'open_to_help', 'wisher_label', 'star_x', 'star_y', 'star_seed'].sort(),
    );
    expect(c.returning).toBe(dal.MADE_WISH_COLUMNS);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect([res.data.isMine, res.data.echoedByMe]).toEqual([true, false]);
    expect(Object.keys(res.data)).not.toContain('userId');
  });

  it('echo inserts the caller’s own echo, and an existing one still counts as ok', async () => {
    expect(await dal.echo('w1', 'me')).toEqual({ ok: true, data: true });
    expect(calls.map((c) => [c.name, c.op, c.payload])).toEqual([['wish_echoes', 'insert', { wish_id: 'w1', user_id: 'me' }]]);
    nextError = { code: '23505', message: 'duplicate key' };
    expect(await dal.echo('w1', 'me')).toEqual({ ok: true, data: true });
  });
});
