import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/*
 * Who may call a SECURITY DEFINER function. It runs with its owner's rights,
 * so whoever can EXECUTE it can do whatever its body does. On Supabase a new
 * public function is executable by anon and authenticated through the
 * schema's default privileges, and each holds a grant of its own, so
 * `REVOKE ... FROM PUBLIC` alone closes nothing. Three migrations did only
 * that, and ai_search_memories handed any member's Companion memories to
 * anyone with the anon key and the member's id (closed in
 * 20261020000000_server_only_functions_closed).
 *
 * This replays every migration's CREATE / DROP / GRANT / REVOKE on public
 * functions the way Postgres applies them (a new function starts open to
 * anon and authenticated; CREATE OR REPLACE keeps its grants; DROP forgets
 * the function), plus the one dynamic form the migrations use (a DO loop of
 * format('REVOKE ALL ON FUNCTION %s FROM ...') over `proname IN (...)`). It
 * then checks:
 *  - a SECURITY DEFINER function anon can call is on ANON_CALLABLE, with the
 *    reason that is safe;
 *  - a callable function that takes a member's id checks its caller
 *    (auth.uid(), assert_acting_for, is_admin …) or is on ID_UNCHECKED;
 *  - the server-only functions stay closed to anon and authenticated.
 * Trigger functions are left out: PostgREST cannot call them.
 */

const MIGRATIONS = join(__dirname, '..', '..', '..', 'supabase', 'migrations');

/** SECURITY DEFINER functions anon may call, and why that is safe. */
const ANON_CALLABLE: Record<string, string> = {
  'admin_moonstone_claw(uuid,integer,text)': "raises 'Admin only' unless is_admin()",
  'admin_moonstone_grant(uuid,integer,text)': "raises 'Admin only' unless is_admin()",
  'affiliate_apply(text,text,text[])': "acts for auth.uid(); raises 'Not authenticated' signed out",
  'calculate_level_from_xp(integer)': 'arithmetic on its argument, reads nothing',
  'calculate_user_level(integer,integer,integer)': 'arithmetic on its arguments, reads nothing',
  'calculate_user_level(uuid)': "returns one member's level number (noted in 20261003000003)",
  'check_is_admin()': 'answers for the caller only',
  'compat_invite_fetch_result(text)': "acts for auth.uid(); raises 'Not authenticated' signed out",
  'compat_invite_respond(text,jsonb,text)': "acts for auth.uid(); raises 'Not authenticated' signed out",
  'delete_user_account(uuid)': 'raises unless auth.uid() is the account being deleted',
  'get_seeker_rank(integer)': 'arithmetic on its argument, reads nothing',
  'has_active_subscription(uuid)': "returns one boolean about a member's subscription",
  'is_admin()': 'answers for the caller only',
  'is_user_premium(uuid)': "returns one boolean about a member's Premium (noted in 20261003000003)",
  'live_room_replay_unlock_moonstones(uuid)': "spends the caller's Moonstones; raises 'Not authenticated' signed out",
  'live_room_tip(uuid,integer,text)': "spends the caller's Moonstones; raises 'Not authenticated' signed out",
  'newsletter_unsubscribe(uuid)': "called signed out from the email's link; the unguessable token is the credential",
  'referral_redeem(text)': "acts for auth.uid(); raises 'Not authenticated' signed out",
};

/** Callable functions that take a member's id without checking the caller, and why that is acceptable. */
const ID_UNCHECKED: Record<string, string> = {
  'calculate_user_level(uuid)': 'a level number only',
  'has_active_subscription(uuid)': 'one boolean only',
  'is_user_premium(uuid)': 'one boolean only',
};

/** Called only by the server (service-role edge functions, pg_cron, migrations). */
const SERVER_ONLY = [
  'ai_search_memories(uuid,text,vector,integer)',
  'ai_mark_turns_summarized(uuid[])',
  '_ai_usage_ledger_seal_partition(regclass)',
  'ai_usage_ledger_ensure_partitions()',
  'calculate_daily_ad_revenue()',
  'run_cost_spike_check()',
  'unlock_achievement(uuid,uuid)',
  'ai_check_and_record_usage(uuid,integer)',
  'get_ad_config(text,uuid)',
  'get_user_daily_ad_stats(uuid)',
];

/** A body that knows who is calling. */
const CHECKS_CALLER = /auth\.uid\s*\(\s*\)|assert_acting_for\s*\(|\bis_admin\s*\(|check_is_admin\s*\(|auth\.role\s*\(\s*\)|auth\.jwt\s*\(\s*\)|request\.jwt/i;
/** A parameter that names a member. */
const MEMBER_ID = /^(p_)?(user_id|uid|member_id|profile_id|target_user_id)$/;

type Param = { name: string | null; type: string };
type Fn = {
  name: string;
  types: string[];
  params: Param[];
  exists: boolean;
  anon: boolean;
  auth: boolean;
  secdef: boolean;
  trigger: boolean;
  body: string;
};

/** Statements, with comments dropped and quoted / dollar-quoted text kept whole. */
function statements(sql: string): string[] {
  const out: string[] = [];
  let buf = '';
  let i = 0;
  while (i < sql.length) {
    if (sql.startsWith('--', i)) {
      const j = sql.indexOf('\n', i);
      i = j < 0 ? sql.length : j;
      continue;
    }
    if (sql.startsWith('/*', i)) {
      const j = sql.indexOf('*/', i + 2);
      i = j < 0 ? sql.length : j + 2;
      continue;
    }
    const c = sql[i];
    if (c === "'") {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === "'" && sql[j + 1] === "'") { j += 2; continue; }
        if (sql[j] === "'") break;
        j += 1;
      }
      buf += sql.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    const tag = /^\$([A-Za-z_]\w*)?\$/.exec(sql.slice(i, i + 64));
    if (tag) {
      const j = sql.indexOf(tag[0], i + tag[0].length);
      const end = j < 0 ? sql.length : j + tag[0].length;
      buf += sql.slice(i, end);
      i = end;
      continue;
    }
    if (c === ';') {
      if (buf.trim()) out.push(buf.trim());
      buf = '';
      i += 1;
      continue;
    }
    buf += c;
    i += 1;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

const SYNONYMS: Record<string, string> = {
  int: 'integer', int4: 'integer', int8: 'bigint', int2: 'smallint', bool: 'boolean',
  varchar: 'character varying', timestamptz: 'timestamp with time zone',
  timestamp: 'timestamp without time zone', float8: 'double precision', float4: 'real', decimal: 'numeric',
};

function normType(raw: string): string {
  let t = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  t = t.replace(/^(public|extensions|pg_catalog)\./, '').replace(/\(\s*\d+(\s*,\s*\d+)?\s*\)/g, '').trim();
  const array = t.endsWith('[]');
  const base = array ? t.slice(0, -2).trim() : t;
  return (SYNONYMS[base] ?? base) + (array ? '[]' : '');
}

function splitTopLevel(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of s) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; } else cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  return parts.map((p) => p.trim()).filter(Boolean);
}

/** IN / INOUT / VARIADIC parameters (OUT ones are not part of the identity). */
function params(list: string, withNames: boolean): Param[] {
  const out: Param[] = [];
  for (let p of splitTopLevel(list)) {
    p = p.split(/\s+(?:default\b|=)/i)[0].trim();
    const mode = /^(in|out|inout|variadic)\s+/i.exec(p);
    if (mode) p = p.slice(mode[0].length);
    if (mode && mode[1].toLowerCase() === 'out') continue;
    const named = /^("?[A-Za-z_]\w*"?)\s+(.+)$/.exec(p);
    if (withNames && named && !/^(double|character|timestamp|time|bit)\b/i.test(p)) {
      out.push({ name: named[1].replace(/"/g, '').toLowerCase(), type: normType(named[2]) });
    } else {
      out.push({ name: null, type: normType(p) });
    }
  }
  return out;
}

/** The text inside the parenthesis that opens at `start`, and where it closes. */
function parens(s: string, start: number): [string, number] {
  let depth = 0;
  for (let k = start; k < s.length; k++) {
    if (s[k] === '(') depth += 1;
    else if (s[k] === ')') {
      depth -= 1;
      if (depth === 0) return [s.slice(start + 1, k), k];
    }
  }
  return [s.slice(start + 1), s.length];
}

const NAME = String.raw`((?:"?public"?\.)?"?[A-Za-z_]\w*"?)`;
const fname = (raw: string) => raw.replace(/"/g, '').toLowerCase().replace(/^public\./, '');

/** name(args) pairs in a GRANT / REVOKE / DROP list. */
function refs(s: string): Array<{ name: string; types: string[] }> {
  const out: Array<{ name: string; types: string[] }> = [];
  const re = new RegExp(`${NAME}\\s*\\(`, 'g');
  let from = 0;
  for (let m = re.exec(s); m; m = re.exec(s)) {
    if (m.index < from) continue;
    const [inner, end] = parens(s, m.index + m[0].length - 1);
    out.push({ name: fname(m[1]), types: params(inner, false).map((p) => p.type) });
    from = end;
    re.lastIndex = end;
  }
  return out;
}

const sig = (f: { name: string; types: string[] }) => `${f.name}(${f.types.join(',')})`;

function replay(dir: string): Map<string, Fn> {
  const fns = new Map<string, Fn>();
  const existing = (name: string) => [...fns.values()].filter((f) => f.name === name && f.exists);
  const setGrant = (targets: Fn[], kind: string, grantees: Set<string>) => {
    for (const f of targets) {
      if (grantees.has('anon')) f.anon = kind === 'GRANT';
      if (grantees.has('authenticated')) f.auth = kind === 'GRANT';
    }
  };
  const files = readdirSync(dir).filter((n) => n.endsWith('.sql')).sort();
  for (const file of files) {
    for (const st of statements(readFileSync(join(dir, file), 'utf8'))) {
      const flat = st.replace(/\s+/g, ' ');

      const create = new RegExp(`^CREATE (?:OR REPLACE )?FUNCTION ${NAME}\\s*\\(`, 'i').exec(flat);
      if (create) {
        const name = fname(create[1]);
        if (name.includes('.')) continue; // another schema
        const open = st.indexOf('(', st.toLowerCase().indexOf('function'));
        const [inner] = parens(st, open);
        const ps = params(inner, true);
        const types = ps.map((p) => p.type);
        const dollar = /(\$[A-Za-z_]*\$)([\s\S]*?)\1/.exec(st);
        const quoted = dollar ? null : /\bAS\s+'((?:[^']|'')*)'/i.exec(st);
        const body = dollar ? dollar[2] : quoted ? quoted[1] : '';
        const attrs = dollar ? st.slice(0, dollar.index) + ' ' + st.slice(dollar.index + dollar[0].length) : st;
        const key = sig({ name, types });
        let f = fns.get(key);
        if (!f || !f.exists) {
          f = { name, types, params: ps, exists: true, anon: true, auth: true, secdef: false, trigger: false, body: '' };
          fns.set(key, f);
        }
        f.params = ps;
        f.body = body;
        f.secdef = /\bSECURITY\s+DEFINER\b/i.test(attrs);
        f.trigger = /\bRETURNS\s+(event_)?trigger\b/i.test(attrs);
        continue;
      }

      const drop = /^DROP FUNCTION (?:IF EXISTS )?(.*)$/i.exec(flat);
      if (drop) {
        const listed = refs(drop[1]);
        const bare = [...drop[1].matchAll(new RegExp(`${NAME}\\s*(?=,|$|\\bCASCADE\\b|\\bRESTRICT\\b)`, 'gi'))].map((m) => fname(m[1]));
        for (const f of fns.values()) {
          if (listed.some((r) => r.name === f.name && sig(r) === sig(f)) || bare.includes(f.name)) f.exists = false;
        }
        continue;
      }

      const grant = /^(REVOKE|GRANT)\s+(?:ALL(?: PRIVILEGES)?|EXECUTE)\s+ON\s+(?:FUNCTION|ROUTINE)\s+(.*?)\s+(?:FROM|TO)\s+(.*)$/i.exec(flat);
      if (grant) {
        const kind = grant[1].toUpperCase();
        const grantees = new Set(grant[3].split(',').map((w) => w.trim().replace(/"/g, '').toLowerCase()));
        for (const r of refs(grant[2])) {
          let targets = existing(r.name).filter((f) => sig(f) === sig(r));
          if (!targets.length) {
            const same = existing(r.name);
            targets = same.length === 1 ? same : [];
          }
          setGrant(targets, kind, grantees);
        }
        continue;
      }

      // DO $$ ... FOR r IN SELECT ... WHERE p.proname IN ('a', 'b') LOOP
      //   EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
      if (/^DO\b/i.test(flat)) {
        const names = /proname\s+IN\s*\(([^)]*)\)/i.exec(flat);
        if (!names) continue;
        const listed = [...names[1].matchAll(/'([A-Za-z_]\w*)'/g)].map((m) => m[1].toLowerCase());
        for (const m of flat.matchAll(/format\(\s*'(REVOKE|GRANT)\s+(?:ALL|EXECUTE)\s+ON\s+FUNCTION\s+%s\s+(?:FROM|TO)\s+([^']+)'/gi)) {
          const grantees = new Set(m[2].split(',').map((w) => w.trim().toLowerCase()));
          for (const name of listed) setGrant(existing(name), m[1].toUpperCase(), grantees);
        }
      }
    }
  }
  return fns;
}

describe('SECURITY DEFINER functions: who may call them', () => {
  const fns = [...replay(MIGRATIONS).values()].filter((f) => f.exists && f.secdef && !f.trigger);
  const bySig = new Map(fns.map((f) => [sig(f), f]));

  it('the replay finds the functions (a broken parser must not pass quietly)', () => {
    expect(fns.length).toBeGreaterThan(50);
    expect(fns.filter((f) => f.anon || f.auth).length).toBeGreaterThan(30);
  });

  it('every SECURITY DEFINER function anon can call is on the reviewed list', () => {
    const open = fns.filter((f) => f.anon).map(sig).sort();
    expect(open.filter((s) => !(s in ANON_CALLABLE))).toEqual([]);
    // A stale entry would hide the next function that takes its name.
    expect(Object.keys(ANON_CALLABLE).filter((s) => !open.includes(s))).toEqual([]);
  });

  it("a callable function that takes a member's id checks who is calling", () => {
    const unchecked = fns
      .filter((f) => (f.anon || f.auth) && f.params.some((p) => p.type === 'uuid' && p.name !== null && MEMBER_ID.test(p.name)))
      .filter((f) => !CHECKS_CALLER.test(f.body))
      .map(sig)
      .sort();
    expect(unchecked.filter((s) => !(s in ID_UNCHECKED))).toEqual([]);
    expect(Object.keys(ID_UNCHECKED).filter((s) => !unchecked.includes(s))).toEqual([]);
  });

  it.each(SERVER_ONLY)('%s is closed to anon and authenticated', (s) => {
    const f = bySig.get(s);
    expect(f, `${s} not found in the migrations`).toBeDefined();
    expect({ anon: f!.anon, authenticated: f!.auth }).toEqual({ anon: false, authenticated: false });
  });
});
