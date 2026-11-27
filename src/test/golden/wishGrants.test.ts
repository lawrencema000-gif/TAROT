// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/*
 * WP-P0-03 (social-ai-03, social-ai-06 / health-status-05): who can read and
 * write the Wishing Sky, replayed from the migrations.
 *
 * Before: anon read every visible wish with its author's account id
 * (wishes_select_visible + GRANT SELECT ON wishes TO anon), every echo with
 * the echoer's id (wish_echoes_select_all USING (true)), and the author of a
 * wish could un-hide it and set its counters (wishes_update_own, and UPDATE on
 * all 15 columns).
 *
 * After: members read only their own base rows; the sky is read through two
 * owner-run views without account ids; members hold no UPDATE on wishes and
 * INSERT only on the 8 columns clients send; a guard trigger keeps the server's
 * columns the server's.
 *
 * The replay models Supabase's default privileges: CREATE TABLE and the first
 * CREATE VIEW give anon and authenticated all seven table privileges, which is
 * why every revoke must name every grantee.
 */

const MIGRATIONS = join(process.cwd(), 'supabase', 'migrations');

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

const TABLES = ['wishes', 'wish_echoes', 'wish_reports', 'wish_offers', 'community_posts'];
const VIEWS = ['wish_sky', 'wish_sky_links'];
const OBJECTS = new Set([...TABLES, ...VIEWS]);
const ALL7 = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'];
const ROLES = ['anon', 'authenticated'];

type Policy = { cmd: string; text: string };

/** Split on commas that are not inside parentheses. */
function splitTop(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of s) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const bare = (name: string) => name.trim().replace(/^public\./i, '').replace(/"/g, '').toLowerCase();

function replay() {
  const grants = new Map<string, Map<string, Set<string>>>();
  const policies = new Map<string, Map<string, Policy>>();
  const viewCols = new Map<string, string[]>();
  let guardFn: string | null = null;
  const triggers: string[] = [];

  const privsOf = (obj: string, role: string) => {
    if (!grants.has(obj)) grants.set(obj, new Map());
    const m = grants.get(obj)!;
    if (!m.has(role)) m.set(role, new Set());
    return m.get(role)!;
  };
  const defaults = (obj: string) => {
    for (const r of ROLES) ALL7.forEach((p) => privsOf(obj, r).add(p));
  };

  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
  for (const f of files) {
    for (const raw of statements(readFileSync(join(MIGRATIONS, f), 'utf8'))) {
      const s = raw.replace(/\s+/g, ' ').trim();

      let m = /^CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?"?(\w+)"?/i.exec(s);
      if (m && OBJECTS.has(m[1].toLowerCase())) {
        if (!grants.has(m[1].toLowerCase())) defaults(m[1].toLowerCase());
        continue;
      }

      m = /^CREATE (?:OR REPLACE )?VIEW (?:public\.)?"?(\w+)"? ?(\(([^)]*)\))?/i.exec(s);
      if (m && OBJECTS.has(m[1].toLowerCase())) {
        const v = m[1].toLowerCase();
        if (!grants.has(v)) defaults(v);
        viewCols.set(v, m[3] ? m[3].split(',').map((c) => c.trim().toLowerCase()) : []);
        continue;
      }

      m = /^(GRANT|REVOKE) (.+?) ON (?:TABLE )?(.+?) (TO|FROM) (.+?)(?: WITH GRANT OPTION)?(?: CASCADE| RESTRICT)?$/i.exec(s);
      if (m && !/^(FUNCTION|SCHEMA|SEQUENCE|ALL |ROUTINE|PROCEDURE|TYPE|DOMAIN)/i.test(m[3])) {
        const isGrant = m[1].toUpperCase() === 'GRANT';
        const objs = m[3].split(',').map(bare).filter((o) => OBJECTS.has(o));
        if (!objs.length) continue;
        const roles = m[5].split(',').map((r) => r.trim().toLowerCase()).filter((r) => ROLES.includes(r));
        const items: string[] = [];
        for (const item of splitTop(m[2])) {
          const im = /^(\w+)(?: PRIVILEGES)?\s*(?:\(([^)]*)\))?$/i.exec(item.trim());
          if (!im) throw new Error(`unparsed privilege "${item}" in ${f}`);
          const priv = im[1].toUpperCase();
          const privs = priv === 'ALL' ? ALL7 : [priv];
          for (const p of privs) {
            if (im[2]) im[2].split(',').forEach((c) => items.push(`${p}(${c.trim().toLowerCase()})`));
            else items.push(p);
          }
        }
        for (const o of objs) for (const r of roles) {
          const set = privsOf(o, r);
          for (const it of items) {
            if (isGrant) { set.add(it); continue; }
            set.delete(it);
            if (!it.includes('(')) for (const x of [...set]) if (x.startsWith(`${it}(`)) set.delete(x);
          }
        }
        continue;
      }

      m = /^CREATE POLICY ("?)([\w ]+?)\1 ON (?:public\.)?"?(\w+)"?(.*)$/i.exec(s);
      if (m && OBJECTS.has(m[3].toLowerCase())) {
        const t = m[3].toLowerCase();
        const cmd = /^(?: AS \w+)? FOR (SELECT|INSERT|UPDATE|DELETE|ALL)\b/i.exec(m[4])?.[1].toUpperCase() ?? 'ALL';
        if (!policies.has(t)) policies.set(t, new Map());
        policies.get(t)!.set(m[2], { cmd, text: s });
        continue;
      }

      m = /^DROP POLICY (?:IF EXISTS )?("?)([\w ]+?)\1 ON (?:public\.)?"?(\w+)"?/i.exec(s);
      if (m && OBJECTS.has(m[3].toLowerCase())) {
        policies.get(m[3].toLowerCase())?.delete(m[2]);
        continue;
      }

      if (/^CREATE (?:OR REPLACE )?FUNCTION (?:public\.)?wish_guard_server_columns\b/i.test(s)) {
        guardFn = s;
        continue;
      }

      if (/^CREATE (?:OR REPLACE )?TRIGGER /i.test(s)) triggers.push(s);
    }
  }
  return { grants, policies, viewCols, guardFn, triggers };
}

const state = replay();
const held = (obj: string, role: string) => [...(state.grants.get(obj)?.get(role) ?? [])].sort();
const pols = (t: string) => [...(state.policies.get(t)?.entries() ?? [])];

describe('the Wishing Sky: grants', () => {
  it('anon holds nothing on the wish tables', () => {
    for (const t of ['wishes', 'wish_echoes', 'wish_reports', 'wish_offers']) {
      expect([t, held(t, 'anon')]).toEqual([t, []]);
    }
  });

  it('members insert only the 8 columns clients send, and update no wish', () => {
    expect(held('wishes', 'authenticated')).toEqual([
      'DELETE', 'SELECT',
      ...['user_id', 'text', 'theme', 'open_to_help', 'wisher_label', 'star_x', 'star_y', 'star_seed'].map((c) => `INSERT(${c})`),
    ].sort());
  });

  it('members hold exactly what the echo, report and offer paths need', () => {
    expect(held('wish_echoes', 'authenticated')).toEqual(['DELETE', 'INSERT', 'SELECT']);
    expect(held('wish_reports', 'authenticated')).toEqual(['INSERT', 'SELECT']);
    expect(held('wish_offers', 'authenticated')).toEqual(['INSERT', 'SELECT', 'UPDATE(status)']);
  });

  it('the sky views are read-only for members', () => {
    for (const v of VIEWS) expect([v, held(v, 'authenticated')]).toEqual([v, ['SELECT']]);
  });

  it('signed-out callers read the sky views (the interim before D01)', () => {
    for (const v of VIEWS) expect([v, held(v, 'anon')]).toEqual([v, ['SELECT']]);
  });

  it('ratchet: nobody holds UPDATE on community_posts (20261003000014 §3)', () => {
    for (const r of ROLES) {
      expect([r, held('community_posts', r).filter((p) => p.startsWith('UPDATE'))]).toEqual([r, []]);
    }
  });
});

describe('the Wishing Sky: policies', () => {
  it('members read only their own wishes, and no policy lets them update one', () => {
    const reads = pols('wishes').filter(([, p]) => p.cmd === 'SELECT' || p.cmd === 'ALL');
    expect(reads.map(([n]) => n)).toEqual(['wishes_select_own']);
    const text = reads[0][1].text;
    expect(text).toContain('auth.uid()');
    expect(text).toContain('user_id');
    expect(text).not.toContain('is_hidden');
    expect(pols('wishes').filter(([, p]) => p.cmd === 'UPDATE' || p.cmd === 'ALL')).toEqual([]);
  });

  it('members read only their own echoes', () => {
    const reads = pols('wish_echoes').filter(([, p]) => p.cmd === 'SELECT' || p.cmd === 'ALL');
    expect(reads.map(([n]) => n)).toEqual(['wish_echoes_select_own']);
    for (const [n, p] of pols('wish_echoes')) {
      expect([n, /USING \(\s*true\s*\)/i.test(p.text)]).toEqual([n, false]);
    }
  });

  it('offer policies never read wishes as the caller', () => {
    for (const [n, p] of pols('wish_offers')) {
      expect([n, /\bFROM\s+(public\.)?wishes\b/i.test(p.text)]).toEqual([n, false]);
    }
  });
});

describe('the Wishing Sky: views and the guard', () => {
  it('the views declare their columns, and none is an account id', () => {
    expect(state.viewCols.get('wish_sky')).toEqual([
      'id', 'text', 'theme', 'star_x', 'star_y', 'star_seed', 'open_to_help', 'wisher_label',
      'granted_at', 'echo_count', 'created_at', 'is_mine', 'echoed_by_me',
    ]);
    expect(state.viewCols.get('wish_sky_links')).toEqual(['from_wish_id', 'to_wish_id']);
    for (const v of VIEWS) {
      for (const id of ['user_id', 'author_id', 'helper_id']) {
        expect([v, state.viewCols.get(v)?.includes(id)]).toEqual([v, false]);
      }
    }
  });

  it('the guard names every server-owned column and runs as the caller', () => {
    const fn = state.guardFn;
    expect(fn).not.toBeNull();
    for (const col of ['id', 'user_id', 'is_hidden', 'moderation_status', 'report_count', 'echo_count',
      'granted_at', 'created_at', 'star_x', 'star_y', 'star_seed']) {
      expect([col, new RegExp(`NEW\\.${col} IS DISTINCT FROM OLD\\.${col}\\b`).test(fn!)]).toEqual([col, true]);
    }
    // The header, before the body (whose comment explains why it is not one).
    expect(fn!.slice(0, fn!.indexOf('$$'))).not.toMatch(/SECURITY DEFINER/i);
  });

  it('the guard fires before every update of a wish', () => {
    expect(state.triggers.some((t) =>
      /^CREATE TRIGGER wish_guard_server_columns BEFORE UPDATE ON public\.wishes FOR EACH ROW/i.test(t))).toBe(true);
  });
});
