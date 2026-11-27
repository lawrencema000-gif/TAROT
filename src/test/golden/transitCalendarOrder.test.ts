// @vitest-environment node
/**
 * WP-P2-22 Part A (gap-3-12): Explore's transit calendar sorted its rows by
 * month number with no year ("Jan 4" = 4, "Dec 14" = 1114), so from
 * 3 December, when the 30-day window crosses New Year, every January row sat
 * above the December ones until the 31st. The function's day loop already
 * pushes events in date order, so the sort is gone and the rows keep it.
 *
 * The real function runs here (the real handler and its `run`) with the clock
 * fixed at 2026-12-10 12:00 UTC, over a fake Supabase client that holds one
 * natal chart. Deno.serve hands over the handler; the npm:/jsr: imports
 * resolve to their Node packages.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import * as Astronomy from 'astronomy-engine';
import { TransitCalendarResponse } from '../../../supabase/functions/_schema/astrology';

const h = vi.hoisted(() => {
  /** The member's natal planets; the test fills them before each call. */
  const state = { planets: [] as { planet: string; longitude: number; sign: string }[] };

  const query = (answer: () => unknown) => {
    const q: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'gte', 'in', 'like', 'limit', 'order', 'neq', 'is']) q[m] = () => q;
    q.maybeSingle = async () => answer();
    q.single = q.maybeSingle;
    q.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve().then(answer).then(resolve, reject);
    return q;
  };

  const client = {
    auth: {
      getUser: async () => ({
        data: { user: { id: '00000000-0000-4000-8000-000000000022', email: 'qa@example.com' } },
        error: null,
      }),
    },
    from(table: string) {
      if (table === 'astrology_natal_charts') {
        return query(() => ({ data: { natal_json: { planets: state.planets } }, error: null }));
      }
      return query(() => ({ data: null, error: null }));
    },
    rpc: async () => ({ data: null, error: null }),
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
vi.mock('npm:astronomy-engine@2.1.19', async () => await import('astronomy-engine'));
vi.mock('npm:@supabase/supabase-js@2.57.4', () => ({ createClient: () => h.client }));

/** Loaded at run time: tsconfig.app.json checks src, not the function's Deno globals. */
const FUNCTION_MODULE = '../../../supabase/functions/astrology-transit-calendar/index';

const NOW = new Date('2026-12-10T12:00:00Z');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The function's "Mon D" UTC label back to a date in the window that starts at NOW. */
function labelToDate(label: string): Date {
  const [m, d] = label.split(' ');
  const month = MONTHS.indexOf(m);
  expect(month).toBeGreaterThanOrEqual(0);
  const year = month < NOW.getUTCMonth() ? NOW.getUTCFullYear() + 1 : NOW.getUTCFullYear();
  return new Date(Date.UTC(year, month, Number(d), 12));
}

async function calendar(): Promise<{ date: string; transitPlanet: string; natalPlanet: string }[]> {
  const res = await h.served.fn!(new Request('http://fn.test/astrology-transit-calendar', {
    method: 'POST',
    headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ days: 30, locale: 'en' }),
  }));
  expect(res.status).toBe(200);
  const json = await res.json();
  return TransitCalendarResponse.parse(json).events;
}

beforeAll(async () => {
  for (const m of ['log', 'info', 'warn', 'error'] as const) vi.spyOn(console, m).mockImplementation(() => {});
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  await import(/* @vite-ignore */ FUNCTION_MODULE);
  expect(typeof h.served.fn).toBe('function');
});
afterAll(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('astrology-transit-calendar: rows stay in date order across New Year (WP-P2-22 Part A)', () => {
  it('lists December transits above January ones when the window crosses New Year', async () => {
    // Natal points the transiting Sun reaches in mid-December and early January
    // (it moves about 1 degree a day): conjunctions that enter orb on both sides
    // of New Year, far from any other natal point.
    const sun = (iso: string) => Astronomy.SunPosition(new Date(iso)).elon;
    h.state.planets = [
      { planet: 'Moon', longitude: sun('2026-12-18T12:00:00Z'), sign: 'Sagittarius' },
      { planet: 'Mercury', longitude: sun('2027-01-05T12:00:00Z'), sign: 'Capricorn' },
    ];

    const events = await calendar();
    const sunMoon = events.find((e) => e.transitPlanet === 'Sun' && e.natalPlanet === 'Moon');
    const sunMercury = events.find((e) => e.transitPlanet === 'Sun' && e.natalPlanet === 'Mercury');
    expect(sunMoon?.date.startsWith('Dec ')).toBe(true);
    expect(sunMercury?.date.startsWith('Jan ')).toBe(true);
    expect(events.indexOf(sunMoon!)).toBeLessThan(events.indexOf(sunMercury!));

    // Every row, not only these two: no January date above a December one.
    const times = events.map((e) => labelToDate(e.date).getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(events.some((e) => e.date.startsWith('Jan '))).toBe(true);
  });

  it('the function no longer sorts by month number', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const src = readFileSync(resolve(__dirname, '../../../supabase/functions/astrology-transit-calendar/index.ts'), 'utf8');
    expect(src).not.toMatch(/months\.indexOf\(m\)\s*\*\s*100/);
  });
});
