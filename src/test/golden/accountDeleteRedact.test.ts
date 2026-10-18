// @vitest-environment node
/**
 * p9 QS R-6 — account deletion kept a chosen Community name. account-delete
 * redacts the profile before admin.deleteUser; when deleteUser fails, the
 * redacted row is what stays, and since 20261003000014 the Community feed
 * signs a member's named posts with profiles.community_name, which the
 * redaction never cleared. The birth zone, a destined place and the
 * personality results were never cleared either.
 *
 * Production may not have community_name yet (20261003000014 is not pushed),
 * and PostgREST refuses a whole PATCH that names a missing column
 * (PGRST204), so each later column is cleared in an update of its own. The
 * queries run through the real supabase-js against a PostgREST stand-in.
 */
import { describe, expect, it, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import {
  OWN_UPDATE_COLUMNS,
  PROFILE_REDACTION,
  redactProfile,
  type RedactDb,
} from '../../../supabase/functions/account-delete/redact';

type Row = Record<string, unknown>;

const MEMBER = '00000000-0000-4000-8000-0000000000d1';

/** The profile columns production has today (before 20261003000014). */
const COLUMNS_TODAY = [
  'id', 'display_name', 'email', 'is_guest', 'birth_date', 'birth_time', 'birth_place', 'birth_lat', 'birth_lon',
  'timezone', 'goals', 'mbti_type', 'love_language', 'tone_preference', 'avatar_seed', 'background_url', 'card_back_url',
  'birth_tz', 'birth_utc', 'destined_place', 'attachment_style', 'big_five_scores', 'enneagram_type', 'enneagram_wing',
  'locale', 'is_premium',
];
const COLUMNS_014 = [...COLUMNS_TODAY, 'community_name'];

const member = (): Row => ({
  id: MEMBER, display_name: 'Mika Tanaka', email: 'mika@example.com', is_guest: false,
  birth_date: '1991-03-08', birth_time: '06:45', birth_place: 'Osaka, Japan', birth_lat: 34.69, birth_lon: 135.5,
  timezone: 'Asia/Tokyo', goals: ['love'], mbti_type: 'INFJ', love_language: 'words', tone_preference: 'gentle',
  avatar_seed: 'https://lh3.googleusercontent.com/a/photo', background_url: 'bg.png', card_back_url: 'back.png',
  birth_tz: 'Asia/Tokyo', birth_utc: '1991-03-07T21:45:00Z', destined_place: { city: 'Lisbon' },
  attachment_style: 'anxious', big_five_scores: { O: 80 }, enneagram_type: 4, enneagram_wing: 5,
  locale: 'ja', is_premium: false, community_name: 'Moonchild',
});

/** PATCH /rest/v1/profiles?id=eq.… as PostgREST answers it: a column it does not know refuses the whole request. */
function postgrest(columns: string[], row: Row, opts: { failMain?: boolean } = {}) {
  const known = new Set(columns);
  const patches: Row[] = [];
  const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    if (init?.method !== 'PATCH' || url.pathname !== '/rest/v1/profiles') throw new Error(`stand-in: ${init?.method} ${url.pathname}`);
    const body = JSON.parse(String(init.body)) as Row;
    patches.push(body);
    if (opts.failMain && 'display_name' in body) {
      return new Response(JSON.stringify({ code: '57014', message: 'canceling statement due to statement timeout', details: null, hint: null }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    const missing = Object.keys(body).find((k) => !known.has(k));
    if (missing) {
      return new Response(JSON.stringify({ code: 'PGRST204', message: `Could not find the '${missing}' column of 'profiles' in the schema cache`, details: null, hint: null }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (url.searchParams.get('id') === `eq.${row.id}`) Object.assign(row, body);
    return new Response(null, { status: 204 });
  };
  const client = createClient('http://postgrest.test', 'service-role-key', {
    global: { fetch: fetchImpl },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { db: client as unknown as RedactDb, patches };
}

const CLEARED_BY_MAIN = Object.keys(PROFILE_REDACTION).filter((k) => !['display_name', 'is_guest'].includes(k));

describe('account-delete redaction (p9 QS R-6)', () => {
  it('the redaction this function always sent leaves the chosen Community name on the profile (the defect)', async () => {
    const row = member();
    const { db } = postgrest(COLUMNS_014, row);
    // What account-delete sent before: one update with these fields only.
    await db.from('profiles').update({ ...PROFILE_REDACTION }).eq('id', MEMBER);
    expect(row.display_name).toBe('Deleted user');
    expect(row.community_name).toBe('Moonchild');
  });

  it('…and adding community_name to that one update would redact nothing while production lacks the column', async () => {
    const row = member();
    const { db } = postgrest(COLUMNS_TODAY, row);
    const { error } = await db.from('profiles').update({ ...PROFILE_REDACTION, community_name: null }).eq('id', MEMBER);
    expect(error?.code).toBe('PGRST204');
    expect(row.display_name).toBe('Mika Tanaka');
    expect(row.email).toBe('mika@example.com');
  });

  it('with 20261003000014: the chosen name and every personal field are cleared', async () => {
    const row = member();
    const { db, patches } = postgrest(COLUMNS_014, row);
    const log = { warn: vi.fn() };
    await expect(redactProfile(db, MEMBER, log)).resolves.toEqual({ main: true, cleared: [...OWN_UPDATE_COLUMNS], skipped: [] });
    expect(row.community_name).toBeNull();
    expect(row.display_name).toBe('Deleted user');
    expect(row.is_guest).toBe(true);
    for (const k of [...CLEARED_BY_MAIN, ...OWN_UPDATE_COLUMNS]) expect(row[k], k).toBeNull();
    // The main update first, then one update per later column.
    expect(patches[0]).toEqual(PROFILE_REDACTION);
    expect(patches.slice(1)).toEqual(OWN_UPDATE_COLUMNS.map((c) => ({ [c]: null })));
    expect(log.warn).not.toHaveBeenCalled();
    // Not touched: what is not personal.
    expect(row.locale).toBe('ja');
  });

  it('on today’s production schema: everything else is cleared, community_name is skipped and logged', async () => {
    const row = member();
    const { db } = postgrest(COLUMNS_TODAY, row);
    const log = { warn: vi.fn() };
    const out = await redactProfile(db, MEMBER, log);
    expect(out).toEqual({ main: true, cleared: OWN_UPDATE_COLUMNS.filter((c) => c !== 'community_name'), skipped: ['community_name'] });
    expect(row.display_name).toBe('Deleted user');
    for (const k of [...CLEARED_BY_MAIN, ...OWN_UPDATE_COLUMNS.filter((c) => c !== 'community_name')]) expect(row[k], k).toBeNull();
    expect(log.warn).toHaveBeenCalledWith('account_delete.redact_column_skipped', expect.objectContaining({ column: 'community_name', code: 'PGRST204' }));
  });

  it('a failed main update is logged, the later columns are still cleared, and nothing throws', async () => {
    const row = member();
    const { db } = postgrest(COLUMNS_014, row, { failMain: true });
    const log = { warn: vi.fn() };
    const out = await redactProfile(db, MEMBER, log);
    expect(out.main).toBe(false);
    expect(out.skipped).toEqual([]);
    expect(row.community_name).toBeNull();
    expect(log.warn).toHaveBeenCalledWith('account_delete.redact_failed', expect.objectContaining({ code: '57014' }));
  });
});
