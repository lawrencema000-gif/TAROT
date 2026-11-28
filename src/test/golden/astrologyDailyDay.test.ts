// @vitest-environment node
/**
 * p12 WP-P2-06, through the real astrology-daily, -weekly and -monthly.
 *
 * home-astro-02: the reading is for the member's day. The app sends its
 * local date and zone; the server takes the date within a day of the UTC
 * date, else the request's zone, the profile's zone, then UTC. The weekly
 * key is the Monday of the member's date and the monthly key the 1st of the
 * member's month, not the UTC week and month.
 * home-astro-14: on a cache hit the Moon and the transits are read at the
 * request time; the text is kept.
 * health-status-10: a failed cache write is logged, not swallowed.
 *
 * Moon references: astronomy-engine EclipticGeoMoon, 299.309° at
 * 2026-11-15T08:00Z (Capricorn, house 10 of the fixture's equal houses from
 * 0° Aries) and 300.787° at 11:00Z (Aquarius, house 11); the ingress is at
 * 09:24:09.8Z.
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll, afterEach } from 'vitest';
import {
  resolveReadingDay,
  weekStartOf,
  monthStartOf,
  cacheTypeFor,
} from '../../../supabase/functions/_shared/readingDay';

type Row = Record<string, unknown>;

const h = vi.hoisted(() => {
  const state = {
    user: { id: '', email: 'qa@example.com' },
    /** astrology_horoscope_cache rows, keyed user|date|type. */
    cache: new Map<string, Row>(),
    /** `${type}@${date}` of each cache read and each cache write. */
    reads: [] as string[],
    writes: [] as string[],
    writeError: null as null | { code: string },
    profileZone: 'UTC' as string | null,
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
    computed_at: '2026-11-01T00:00:00.000Z',
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
          select: () => chain((eq) => {
            state.reads.push(`${eq.type}@${eq.date}`);
            const row = state.cache.get(`${eq.user_id}|${eq.date}|${eq.type}`);
            return { data: row ?? null, error: null };
          }),
          upsert: async (row: Row) => {
            state.writes.push(`${row.type}@${row.date}`);
            if (!state.writeError) state.cache.set(`${row.user_id}|${row.date}|${row.type}`, row);
            return { error: state.writeError };
          },
        };
      }
      if (table === 'astrology_natal_charts') return chain(() => ({ data: chart, error: null }));
      if (table === 'profiles') return chain(() => ({ data: { timezone: state.profileZone }, error: null }));
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

/** The functions, loaded at run time by specifiers the app's typecheck does not follow. */
const MODULES = ['daily', 'weekly', 'monthly'].map((k) => `../../../supabase/functions/astrology-${k}/index`);

let warn: { mock: { calls: unknown[][] }; mockClear: () => void };

beforeAll(async () => {
  for (const m of ['log', 'info', 'error'] as const) vi.spyOn(console, m).mockImplementation(() => {});
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubGlobal('fetch', vi.fn(async () => {
    throw new Error('unexpected fetch');
  }));
  for (const m of MODULES) await import(/* @vite-ignore */ m);
  expect(h.served.fns).toHaveLength(3);
});
afterAll(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

let n = 0;
function newMember() {
  n += 1;
  h.state.user = { id: `00000000-0000-4000-8000-${String(n + 900).padStart(12, '0')}`, email: 'qa@example.com' };
}
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  newMember();
  h.state.cache.clear();
  h.state.reads.length = 0;
  h.state.writes.length = 0;
  h.state.writeError = null;
  h.state.profileZone = 'UTC';
  warn.mockClear();
});
afterEach(() => {
  vi.useRealTimers();
});

async function call(which: 0 | 1 | 2, iso: string, body: Row): Promise<{ status: number; json: Row }> {
  vi.setSystemTime(new Date(iso));
  const name = ['astrology-daily', 'astrology-weekly', 'astrology-monthly'][which];
  const res = await h.served.fns[which](new Request(`http://fn.test/${name}`, {
    method: 'POST',
    headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
  return { status: res.status, json: (await res.json()) as Row };
}
const daily = (iso: string, body: Row) => call(0, iso, body).then((r) => {
  expect(r.status).toBe(200);
  return r.json;
});

/** The JSON log lines console.warn got. */
const warned = (): Row[] => warn.mock.calls.map((c: unknown[]) => {
  try { return JSON.parse(String(c[0])) as Row; } catch { return {}; }
});

const TOKYO = { date: '2026-11-15', timezone: 'Asia/Tokyo', locale: 'en' };

describe('astrology-daily: the member\'s day (home-astro-02)', () => {
  it('a Tokyo member just after midnight gets their own date, read and written under it', async () => {
    const day = await daily('2026-11-14T15:00:50Z', TOKYO);
    expect(day.date).toBe('2026-11-15');
    expect(h.state.reads).toEqual(['daily@2026-11-15']);
    expect(h.state.writes).toEqual(['daily@2026-11-15']);
  });

  it('no turnover at 09:00 JST: one day, one write, one theme', async () => {
    const early = await daily('2026-11-14T23:30:00Z', TOKYO);
    const late = await daily('2026-11-15T00:30:00Z', TOKYO);
    expect(h.state.writes).toEqual(['daily@2026-11-15']);
    expect(late.theme).toBe(early.theme);
  });

  it('the Moon and the transits are read at every open (home-astro-14)', async () => {
    const a8 = await daily('2026-11-15T08:00:00Z', TOKYO);
    expect(a8.moonSign).toBe('Capricorn');
    expect(a8.moonHouse).toBe(10);
    const a11 = await daily('2026-11-15T11:00:00Z', TOKYO);
    expect(h.state.writes).toHaveLength(1);
    expect(a11.theme).toBe(a8.theme);
    expect(a11.moonSign).toBe('Aquarius');
    expect(a11.moonHouse).toBe(11);

    // A member with the same chart opening first at 11:00Z is told the same sky.
    newMember();
    const b11 = await daily('2026-11-15T11:00:00Z', TOKYO);
    expect([b11.moonSign, b11.moonHouse, b11.transitHighlights]).toEqual([a11.moonSign, a11.moonHouse, a11.transitHighlights]);
  });

  it('a date outside a day of the UTC date, or not a date, is refused (and logged)', async () => {
    h.state.profileZone = 'UTC';
    const far = await daily('2026-11-14T15:00:50Z', { date: '2030-01-01', locale: 'en' });
    expect(far.date).toBe('2026-11-14');
    expect(warned().some((l) => l.msg === 'astrology_daily.date_rejected' && l.rejected === '2030-01-01')).toBe(true);

    const ahead = await daily('2026-11-15T03:00:00Z', { date: '2026-11-17', timezone: 'Asia/Tokyo', locale: 'en' });
    expect(ahead.date).toBe('2026-11-15');
    const bogus = await daily('2026-03-01T03:00:00Z', { date: '2026-02-30', timezone: 'Asia/Tokyo', locale: 'en' });
    expect(bogus.date).toBe('2026-03-01');
  });

  it('installed builds that send only the locale get their profile zone\'s day', async () => {
    h.state.profileZone = 'Asia/Tokyo';
    expect((await daily('2026-11-14T15:00:50Z', { locale: 'en' })).date).toBe('2026-11-15');
    newMember();
    h.state.profileZone = 'UTC';
    expect((await daily('2026-11-14T15:00:50Z', { locale: 'en' })).date).toBe('2026-11-14');
  });

  it('a failed cache write still answers, and is logged with its code', async () => {
    h.state.writeError = { code: '23514' };
    const day = await daily('2026-11-14T15:00:50Z', TOKYO);
    expect(day.date).toBe('2026-11-15');
    expect(day.theme).toBeTruthy();
    expect(warned().some((l) => l.msg === 'astrology_daily.cache_write_failed' && l.code === '23514' && l.type === 'daily')).toBe(true);
  });

  it('the answer is private to the member and not kept by any cache on the way', async () => {
    vi.setSystemTime(new Date('2026-11-14T15:00:50Z'));
    const res = await h.served.fns[0](new Request('http://fn.test/astrology-daily', {
      method: 'POST',
      headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
      body: JSON.stringify(TOKYO),
    }));
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
  });
});

describe('astrology-weekly: the member\'s week', () => {
  it('Sunday 20:00 in New York is still the week of Monday 9 November', async () => {
    const { status, json } = await call(1, '2026-11-16T01:00:00Z', { date: '2026-11-15', timezone: 'America/New_York', locale: 'en' });
    expect(status).toBe(200);
    expect(h.state.reads).toEqual(['weekly@2026-11-09']);
    expect(h.state.writes).toEqual(['weekly@2026-11-09']);
    expect([json.weekStart, json.weekEnd]).toEqual(['Nov 9', 'Nov 15']);
  });

  it('Monday 01:00 in Tokyo is already the new week', async () => {
    const { status } = await call(1, '2026-11-15T16:00:00Z', { date: '2026-11-16', timezone: 'Asia/Tokyo', locale: 'en' });
    expect(status).toBe(200);
    expect(h.state.writes).toEqual(['weekly@2026-11-16']);
  });

  it('a failed cache write is logged', async () => {
    h.state.writeError = { code: '23514' };
    const { status } = await call(1, '2026-11-15T16:00:00Z', { date: '2026-11-16', timezone: 'Asia/Tokyo', locale: 'ko' });
    expect(status).toBe(200);
    expect(warned().some((l) => l.msg === 'astrology_weekly.cache_write_failed' && l.type === 'weekly:ko:r2')).toBe(true);
  });
});

describe('astrology-monthly: the member\'s month', () => {
  it('30 November 21:00 in Los Angeles is still November', async () => {
    const { status, json } = await call(2, '2026-12-01T05:00:00Z', { date: '2026-11-30', timezone: 'America/Los_Angeles', locale: 'en' });
    expect(status).toBe(200);
    expect(h.state.writes).toEqual(['monthly@2026-11-01']);
    expect(json.month).toBe('November 2026');
  });

  it('1 December 01:00 in Tokyo is already December', async () => {
    const { status, json } = await call(2, '2026-11-30T16:00:00Z', { date: '2026-12-01', timezone: 'Asia/Tokyo', locale: 'en' });
    expect(status).toBe(200);
    expect(h.state.writes).toEqual(['monthly@2026-12-01']);
    expect(json.month).toBe('December 2026');
  });

  it('a failed cache write is logged', async () => {
    h.state.writeError = { code: '23514' };
    const { status } = await call(2, '2026-11-30T16:00:00Z', { date: '2026-12-01', timezone: 'Asia/Tokyo', locale: 'ja' });
    expect(status).toBe(200);
    expect(warned().some((l) => l.msg === 'astrology_monthly.cache_write_failed' && l.type === 'monthly:ja:r2')).toBe(true);
  });
});

describe('_shared/readingDay', () => {
  it.each([
    [{ date: '2026-11-15', timezone: 'Asia/Tokyo' }, '2026-11-14T15:00:50Z', null, '2026-11-15', 'client-date'],
    [{ date: '2026-11-13', timezone: 'Pacific/Honolulu' }, '2026-11-14T07:37:00Z', null, '2026-11-13', 'client-date'],
    [{ date: '2026-11-16', timezone: 'Pacific/Kiritimati' }, '2026-11-15T20:00:00Z', null, '2026-11-16', 'client-date'],
    [{ date: '2026-11-14', timezone: 'Pacific/Pago_Pago' }, '2026-11-15T00:00:00Z', null, '2026-11-14', 'client-date'],
    [{ date: '2026-11-17', timezone: 'Asia/Tokyo' }, '2026-11-15T03:00:00Z', null, '2026-11-15', 'timezone'],
    [{ date: '2026-02-30', timezone: 'Asia/Tokyo' }, '2026-03-01T03:00:00Z', null, '2026-03-01', 'timezone'],
    [{ date: '2030-01-01' }, '2026-11-14T15:00:50Z', null, '2026-11-14', 'utc'],
    [{}, '2026-11-14T15:00:50Z', null, '2026-11-14', 'utc'],
    [{}, '2026-11-14T15:00:50Z', 'Asia/Tokyo', '2026-11-15', 'profile-timezone'],
    [{}, '2026-11-14T15:00:50Z', 'UTC', '2026-11-14', 'utc'],
    [{ timezone: 'Mars/Olympus' }, '2026-11-14T15:00:50Z', 'Asia/Tokyo', '2026-11-15', 'profile-timezone'],
    [{ date: 20261115 }, '2026-11-14T15:00:50Z', null, '2026-11-14', 'utc'],
  ] as const)('resolveReadingDay(%j) at %s, profile %s → %s (%s)', (body, iso, zone, day, source) => {
    const r = resolveReadingDay(body as { date?: unknown; timezone?: unknown }, new Date(iso), zone);
    expect([r.day, r.source]).toEqual([day, source]);
  });

  it('the device\'s own date is never refused and always kept, in 12 zones, hourly over 2026–27', () => {
    const zones = ['Asia/Tokyo', 'Asia/Seoul', 'Asia/Shanghai', 'Australia/Sydney', 'Europe/London', 'UTC',
      'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Pacific/Honolulu', 'Pacific/Kiritimati', 'Pacific/Pago_Pago'];
    let refused = 0;
    let wrong = 0;
    for (const zone of zones) {
      const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' });
      for (let t = Date.UTC(2026, 0, 1); t < Date.UTC(2028, 0, 1); t += 3_600_000) {
        const now = new Date(t);
        const member = fmt.format(now);
        const r = resolveReadingDay({ date: member, timezone: zone }, now);
        if (r.source !== 'client-date') refused++;
        if (r.day !== member) wrong++;
      }
    }
    expect({ refused, wrong }).toEqual({ refused: 0, wrong: 0 });
  });

  it('week and month keys, and cache types', () => {
    expect(weekStartOf('2027-01-03')).toBe('2026-12-28');
    expect(weekStartOf('2026-11-16')).toBe('2026-11-16');
    expect(monthStartOf('2026-12-01')).toBe('2026-12-01');
    expect(cacheTypeFor('daily', 'en', undefined)).toBe('daily');
    expect(cacheTypeFor('daily', 'ja', 2)).toBe('daily:ja:r2');
    expect(cacheTypeFor('weekly', 'ko', undefined)).toBe('weekly:ko');
  });
});
