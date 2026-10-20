// @vitest-environment node
/**
 * p9 R06 — buying the Year Ahead in a second calendar year broke the report
 * for good: astrology-year-ahead read the unlock with `.maybeSingle()` and
 * no year, two rows ('2026' and '2027') made postgrest-js answer PGRST116
 * with `data: null`, and the dropped error read as "not unlocked" — 402 on
 * every load of the report just paid for.
 *
 * The queries run through the real supabase-js against a PostgREST stand-in
 * that applies `eq` / `in` / `limit` to rows the way PostgREST does, so the
 * client library's own handling of the answer is what is under test.
 */
import { describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import {
  findYearAheadUnlock,
  yearAheadWindow,
  type UnlockDb,
} from '../../../supabase/functions/astrology-year-ahead/unlock';

type Row = Record<string, unknown>;

/** GET /rest/v1/<table>?select=…&col=eq.v&col=in.(a,b)&limit=n over in-memory rows. */
function postgrest(tables: Record<string, Row[]>, opts: { fail?: boolean } = {}) {
  const seen: string[] = [];
  const fetchImpl = async (input: RequestInfo | URL): Promise<Response> => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    seen.push(decodeURIComponent(url.search));
    if (opts.fail) {
      return new Response(JSON.stringify({ code: '57014', message: 'canceling statement due to statement timeout' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    let rows = [...(tables[url.pathname.replace(/^\/rest\/v1\//, '')] ?? [])];
    let columns: string[] | null = null;
    let limit: number | null = null;
    for (const [k, v] of url.searchParams) {
      if (k === 'select') columns = v === '*' ? null : v.split(',');
      else if (k === 'limit') limit = Number(v);
      else if (v.startsWith('eq.')) rows = rows.filter((r) => String(r[k]) === v.slice(3));
      else if (v.startsWith('in.(') && v.endsWith(')')) {
        const set = v.slice(4, -1).split(',').map((s) => s.replace(/^"|"$/g, ''));
        rows = rows.filter((r) => set.includes(String(r[k])));
      } else throw new Error(`stand-in does not know ${k}=${v}`);
    }
    if (limit !== null) rows = rows.slice(0, limit);
    const out = columns ? rows.map((r) => Object.fromEntries(columns!.map((c) => [c, r[c]]))) : rows;
    return new Response(JSON.stringify(out), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  const client = createClient('http://postgrest.test', 'service-role-key', {
    global: { fetch: fetchImpl },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { client, seen };
}

const READER = '00000000-0000-4000-8000-0000000000a6';
const OTHER = '00000000-0000-4000-8000-0000000000b6';
const unlockRow = (user: string, reference: string, report_key = 'year-ahead'): Row => ({
  id: `${user}:${report_key}:${reference}`, user_id: user, report_key, reference, cost_currency: 'moonstones', cost_amount: 300,
});

/** A 2026 buyer who paid again on 1 January 2027 (the page keys the unlock on the local year). */
const twoYears = () => ({
  report_unlocks: [
    unlockRow(READER, '2026'),
    unlockRow(READER, '2027'),
    unlockRow(READER, 'INTJ', 'career-archetype'),
    unlockRow(OTHER, '2027'),
  ],
});

const JAN_1_2027 = new Date('2027-01-01T09:00:00Z');

describe('p9 R06 — the Year Ahead unlock check', () => {
  it('reproduces the defect: the old query, with two years bought, answers PGRST116 and no row', async () => {
    const { client } = postgrest(twoYears());
    // The query astrology-year-ahead ran before this fix, as it ran.
    const { data: unlock, error } = await client
      .from('report_unlocks')
      .select('id')
      .eq('user_id', READER)
      .eq('report_key', 'year-ahead')
      .maybeSingle();
    expect(error?.code).toBe('PGRST116');
    expect(unlock).toBeNull();
    // …which `if (!unlock && !is_premium) throw 402` read as "not unlocked".
    const oneYear = postgrest({ report_unlocks: [unlockRow(READER, '2026')] });
    const single = await oneYear.client.from('report_unlocks').select('id').eq('user_id', READER).eq('report_key', 'year-ahead').maybeSingle();
    expect(single.error).toBeNull();
    expect(single.data).not.toBeNull();
  });

  it('the year the page unlocked is found, with one year bought or two', async () => {
    const two = postgrest(twoYears());
    expect(await findYearAheadUnlock(two.client as unknown as UnlockDb, READER, { year: 2027, now: JAN_1_2027 }))
      .toEqual({ ok: true, unlocked: true, reference: '2027', outOfWindow: false });
    // The query names the reader, the report and the year, and asks for one row.
    expect(two.seen.at(-1)).toContain(`user_id=eq.${READER}`);
    expect(two.seen.at(-1)).toContain('report_key=eq.year-ahead');
    expect(two.seen.at(-1)).toContain('reference=in.(2027)');
    expect(two.seen.at(-1)).toContain('limit=1');
    expect(await findYearAheadUnlock(two.client as unknown as UnlockDb, READER, { year: 2026, now: JAN_1_2027 }))
      .toMatchObject({ ok: true, unlocked: true, reference: '2026' });
    const one = postgrest({ report_unlocks: [unlockRow(READER, '2027')] });
    expect(await findYearAheadUnlock(one.client as unknown as UnlockDb, READER, { year: 2027, now: JAN_1_2027 }))
      .toMatchObject({ ok: true, unlocked: true });
  });

  it('a year not bought is not unlocked — nor is another reader’s row, or another report', async () => {
    const { client } = postgrest({ report_unlocks: [unlockRow(READER, '2026'), unlockRow(OTHER, '2027'), unlockRow(READER, '2027', 'career-archetype')] });
    expect(await findYearAheadUnlock(client as unknown as UnlockDb, READER, { year: 2027, now: JAN_1_2027 }))
      .toEqual({ ok: true, unlocked: false, reference: null, outOfWindow: false });
  });

  it('the reader’s calendar counts: a local year either side of the UTC year is served', async () => {
    const { client } = postgrest({ report_unlocks: [unlockRow(READER, '2027')] });
    // 31 Dec 2026 20:00 UTC is already 1 January 2027 in Tokyo; the page there unlocked 2027.
    expect(await findYearAheadUnlock(client as unknown as UnlockDb, READER, { year: 2027, now: new Date('2026-12-31T20:00:00Z') }))
      .toMatchObject({ ok: true, unlocked: true });
    const late = postgrest({ report_unlocks: [unlockRow(READER, '2026')] });
    // 1 Jan 2027 05:00 UTC is still 31 December 2026 in Honolulu.
    expect(await findYearAheadUnlock(late.client as unknown as UnlockDb, READER, { year: 2026, now: new Date('2027-01-01T05:00:00Z') }))
      .toMatchObject({ ok: true, unlocked: true });
  });

  it('a year that cannot be this year anywhere is not served, and nothing is asked of the table', async () => {
    const { client, seen } = postgrest({ report_unlocks: [unlockRow(READER, '2024')] });
    expect(await findYearAheadUnlock(client as unknown as UnlockDb, READER, { year: 2024, now: JAN_1_2027 }))
      .toEqual({ ok: true, unlocked: false, reference: null, outOfWindow: true });
    expect(seen).toHaveLength(0);
  });

  it('a page from before the fix (no year sent) is served by a row for any year in the window — two rows included', async () => {
    const { client, seen } = postgrest(twoYears());
    expect(await findYearAheadUnlock(client as unknown as UnlockDb, READER, { now: JAN_1_2027 }))
      .toMatchObject({ ok: true, unlocked: true });
    expect(seen.at(-1)).toContain('reference=in.(2026,2027,2028)');
    const stale = postgrest({ report_unlocks: [unlockRow(READER, '2024')] });
    expect(await findYearAheadUnlock(stale.client as unknown as UnlockDb, READER, { now: JAN_1_2027 }))
      .toMatchObject({ ok: true, unlocked: false });
  });

  it('a lookup that fails is a failure, never "not unlocked"', async () => {
    const { client } = postgrest(twoYears(), { fail: true });
    const res = await findYearAheadUnlock(client as unknown as UnlockDb, READER, { year: 2027, now: JAN_1_2027 });
    expect(res.ok).toBe(false);
    expect(res.ok === false && res.error).toContain('57014');
  });

  it('the window is the UTC year and one either side', () => {
    expect(yearAheadWindow(new Date('2026-12-31T23:59:59Z'))).toEqual([2025, 2026, 2027]);
    expect(yearAheadWindow(new Date('2027-01-01T00:00:00Z'))).toEqual([2026, 2027, 2028]);
  });
});
