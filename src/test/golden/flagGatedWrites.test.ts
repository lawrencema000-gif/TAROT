// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { migrationStatements } from './sqlReplay';

/*
 * social-ai-02: the `advisors` and `live-rooms` flags hold in the database
 * too, not only in the UI. The verification upload and insert need
 * `advisors` on for the caller (and a new row starts pending and unreviewed),
 * only an admin creates a live room, and the two Moonstone RPCs need
 * `live-rooms` on for the caller, with their money code otherwise unchanged.
 *
 * These checks read the migrations the way `supabase db push` applies them
 * (file name order). "Last" means the last matching statement in that order.
 * Whitespace is flattened before matching.
 */

type St = { file: string; sql: string; flat: string };

const flatten = (s: string) => s.replace(/\s+/g, ' ').trim();
const ALL: St[] = migrationStatements().map((s) => ({ ...s, flat: flatten(s.sql) }));

function lastIndex(pred: (s: St) => boolean, before = ALL.length): number {
  for (let i = before - 1; i >= 0; i--) if (pred(ALL[i])) return i;
  return -1;
}

/** Index just past the parenthesis that closes the one opening at `open`; quotes are skipped. */
function closeParen(s: string, open: number): number {
  let depth = 0;
  for (let k = open; k < s.length; k++) {
    const ch = s[k];
    if (ch === "'") {
      k = s.indexOf("'", k + 1);
      if (k < 0) return s.length;
      continue;
    }
    if (ch === '(') depth += 1;
    if (ch === ')') {
      depth -= 1;
      if (depth === 0) return k + 1;
    }
  }
  return s.length;
}

/** `(x)` -> `x`, repeatedly, when the outer pair encloses the whole expression. */
function unwrap(expr: string): string {
  let e = expr.trim();
  while (e.startsWith('(') && closeParen(e, 0) === e.length) e = e.slice(1, -1).trim();
  return e;
}

/** The expression after a top-level USING / WITH CHECK of a policy statement, or null. */
function clause(flat: string, keyword: 'USING' | 'WITH CHECK'): string | null {
  const re = keyword === 'USING' ? /\bUSING\s*\(/gi : /\bWITH CHECK\s*\(/gi;
  for (let m = re.exec(flat); m; m = re.exec(flat)) {
    // Top level only: the keyword must not sit inside parentheses.
    let depth = 0;
    for (let k = 0; k < m.index; k++) {
      if (flat[k] === "'") { k = flat.indexOf("'", k + 1); if (k < 0) break; continue; }
      if (flat[k] === '(') depth += 1;
      if (flat[k] === ')') depth -= 1;
    }
    if (depth !== 0) continue;
    const open = m.index + m[0].length - 1;
    return unwrap(flat.slice(open, closeParen(flat, open)));
  }
  return null;
}

const IDENT = String.raw`("(?:[^"]|"")+"|[A-Za-z_][\w$]*)`;
const RELATION = String.raw`((?:"?[A-Za-z_]\w*"?\.)?"?[A-Za-z_]\w*"?)`;
const CREATE_POLICY = new RegExp(`^CREATE POLICY ${IDENT} ON ${RELATION}`, 'i');
const DROP_POLICY = new RegExp(`^DROP POLICY (?:IF EXISTS )?${IDENT} ON ${RELATION}`, 'i');
const ident = (raw: string) => raw.replace(/^"|"$/g, '').replace(/""/g, '"');
const relation = (raw: string) => raw.replace(/"/g, '').toLowerCase().replace(/^public\./, '');

type Policy = { name: string; table: string; cmd: string; roles: string; using: string | null; check: string | null; at: number };

function policy(st: St, at: number): Policy | null {
  const m = CREATE_POLICY.exec(st.flat);
  if (!m) return null;
  const head = st.flat.split(/\s(?:USING|WITH CHECK)\s*\(/i)[0];
  return {
    name: ident(m[1]),
    table: relation(m[2]),
    cmd: (/\bFOR (ALL|SELECT|INSERT|UPDATE|DELETE)\b/i.exec(head)?.[1] ?? 'ALL').toUpperCase(),
    roles: (/\bTO (.+)$/i.exec(head)?.[1] ?? 'public').trim().toLowerCase(),
    using: clause(st.flat, 'USING'),
    check: clause(st.flat, 'WITH CHECK'),
    at,
  };
}

/** The policies a table ends with: every CREATE POLICY and DROP POLICY replayed in order. */
function finalPolicies(table: string): Map<string, Policy> {
  const live = new Map<string, Policy>();
  ALL.forEach((st, at) => {
    const created = policy(st, at);
    if (created && created.table === table) {
      live.set(created.name, created);
      return;
    }
    const dropped = DROP_POLICY.exec(st.flat);
    if (dropped && relation(dropped[2]) === table) live.delete(ident(dropped[1]));
  });
  return live;
}

function lastPolicy(name: string, table: string): Policy {
  const i = lastIndex((s) => {
    const p = policy(s, 0);
    return !!p && p.name === name && p.table === table;
  });
  expect(i, `no CREATE POLICY ${name} ON ${table}`).toBeGreaterThanOrEqual(0);
  return policy(ALL[i], i)!;
}

/** The dollar-quoted body of a CREATE FUNCTION statement, and the rest (its attributes). */
function fn(st: St): { body: string; attrs: string } {
  const m = /(\$[A-Za-z_]*\$)([\s\S]*?)\1/.exec(st.sql);
  if (!m) return { body: '', attrs: st.flat };
  return { body: m[2], attrs: flatten(st.sql.slice(0, m.index) + ' ' + st.sql.slice(m.index + m[0].length)) };
}

const createsFunction = (name: string) => (s: St) =>
  new RegExp(`^CREATE (?:OR REPLACE )?FUNCTION (?:public\\.)?${name}\\s*\\(`, 'i').test(s.flat);

/** SQL line comments removed, so a constant must appear in the code, not only in a comment. */
const code = (body: string) => body.replace(/--[^\n]*/g, ' ');

describe('the ID and selfie upload follows the advisors flag', () => {
  it('"verification upload own" requires feature_on_for_me(\'advisors\') and keeps its bucket and folder checks', () => {
    const p = lastPolicy('verification upload own', 'storage.objects');
    expect(p.cmd).toBe('INSERT');
    expect(p.check).toContain("feature_on_for_me('advisors')");
    expect(p.check).toContain("bucket_id = 'advisor-verification'");
    expect(p.check).toContain('storage.foldername(name)');
    // Nothing drops it afterwards.
    const dropped = ALL.slice(p.at + 1).some((s) => {
      const m = DROP_POLICY.exec(s.flat);
      return !!m && ident(m[1]) === 'verification upload own' && relation(m[2]) === 'storage.objects';
    });
    expect(dropped).toBe(false);
  });

  it('no other policy lets a member write into the advisor-verification bucket', () => {
    const writers = [...finalPolicies('storage.objects').values()]
      .filter((p) => ['INSERT', 'UPDATE', 'ALL'].includes(p.cmd))
      .filter((p) => `${p.using ?? ''} ${p.check ?? ''}`.includes('advisor-verification'));
    expect(writers.map((p) => p.name)).toEqual(['verification upload own']);
  });
});

describe('a verification row starts pending and unreviewed, and only while advisors is on', () => {
  it('advisor_verifications_insert_own pins status, reviewer fields and the flag', () => {
    const p = lastPolicy('advisor_verifications_insert_own', 'advisor_verifications');
    expect(p.cmd).toBe('INSERT');
    expect(p.roles).toBe('authenticated');
    for (const part of [
      "feature_on_for_me('advisors')",
      "status = 'pending'",
      'admin_notes IS NULL',
      'reviewed_by IS NULL',
      'reviewed_at IS NULL',
      '(SELECT auth.uid()) = user_id',
    ]) {
      expect(p.check).toContain(part);
    }
  });

  it('it is the only INSERT policy on advisor_verifications', () => {
    const inserters = [...finalPolicies('advisor_verifications').values()].filter((p) => ['INSERT', 'ALL'].includes(p.cmd));
    expect(inserters.map((p) => p.name)).toEqual(['advisor_verifications_insert_own']);
  });
});

describe('live rooms: only an admin creates a room', () => {
  const policies = finalPolicies('live_rooms');

  it('the table ends with exactly these four policies', () => {
    expect([...policies.keys()].sort()).toEqual(
      ['live_rooms_admin_insert', 'live_rooms_host_delete', 'live_rooms_host_update', 'live_rooms_public_read'],
    );
  });

  it('the only policy that admits an INSERT checks public.is_admin() alone', () => {
    const inserters = [...policies.values()].filter((p) => ['INSERT', 'ALL'].includes(p.cmd));
    expect(inserters.map((p) => p.name)).toEqual(['live_rooms_admin_insert']);
    expect(inserters[0].check).toBe('public.is_admin()');
  });

  it('a host may still edit and delete their own room', () => {
    expect(policies.get('live_rooms_host_update')?.cmd).toBe('UPDATE');
    expect(policies.get('live_rooms_host_update')?.check).toContain('host_user_id');
    expect(policies.get('live_rooms_host_delete')?.cmd).toBe('DELETE');
  });
});

describe('the two Moonstone RPCs refuse while live-rooms is off for the caller', () => {
  const GATE = "IF NOT public.feature_on_for_me('live-rooms') THEN RAISE EXCEPTION 'Feature live-rooms is not enabled' USING ERRCODE = '42501'; END IF;";
  const AUTH = "IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;";

  it.each([
    ['live_room_tip', '20260511000000_live_rooms.sql'],
    ['live_room_replay_unlock_moonstones', '20260515000000_live_room_recordings.sql'],
  ])('%s: the gate follows the sign-in check, and nothing else changed', (name, firstFile) => {
    const first = ALL.findIndex(createsFunction(name));
    const last = lastIndex(createsFunction(name));
    expect(ALL[first].file).toBe(firstFile);
    expect(last).toBeGreaterThan(first);

    const original = fn(ALL[first]);
    const gated = fn(ALL[last]);
    const body = flatten(gated.body);
    expect(body).toContain(`${AUTH} ${GATE}`);
    // The money code is otherwise untouched: remove the gate and the body is the original.
    expect(body.replace(` ${GATE}`, '')).toBe(flatten(original.body));
    // Same signature and attributes, so CREATE OR REPLACE keeps its grants.
    expect(gated.attrs).toBe(original.attrs);
  });
});

describe('the SQL mirror of the client evaluator', () => {
  it('feature_bucket is the FNV-1a of userBucket(), runs as the caller and is closed to clients', () => {
    const at = lastIndex(createsFunction('feature_bucket'));
    expect(at).toBeGreaterThanOrEqual(0);
    const { body, attrs } = fn(ALL[at]);
    expect(attrs).not.toMatch(/SECURITY\s+DEFINER/i);
    for (const part of ['2166136261', '16777619', '4294967295', '% 100']) expect(code(body)).toContain(part);
    const closed = ALL.slice(at + 1).some((s) =>
      /^REVOKE ALL ON FUNCTION public\.feature_bucket\(text, text\) FROM PUBLIC, anon, authenticated$/i.test(s.flat));
    expect(closed).toBe(true);
  });

  it('feature_on_for_me is SECURITY DEFINER with a fixed search_path and reads the whole rule', () => {
    const at = lastIndex(createsFunction('feature_on_for_me'));
    expect(at).toBeGreaterThanOrEqual(0);
    const { body, attrs } = fn(ALL[at]);
    expect(attrs).toMatch(/SECURITY\s+DEFINER/i);
    expect(attrs).toMatch(/SET search_path = /i);
    for (const part of ['allowed_user_ids', 'rollout_percent', 'feature_bucket(', 'is_admin()', 'auth.uid()']) {
      expect(code(body)).toContain(part);
    }
  });
});
