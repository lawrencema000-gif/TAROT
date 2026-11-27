import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/*
 * A member's rows follow the member out (p12 gap-1-24, WP-P0-18 Part A).
 *
 * delete_user_account deletes a list of child tables, then profiles, then
 * auth.users. A table whose foreign key to profiles or auth.users is NO ACTION
 * (or RESTRICT) and that the function does not clear makes that DELETE raise,
 * the whole call rolls back and the member reads "Couldn't delete your
 * account". On production that was astrology_natal_charts,
 * astrology_horoscope_cache and astrology_transit_events: every member with a
 * cast chart could not delete their account.
 *
 * This replays every migration's CREATE TABLE / ALTER TABLE / DROP TABLE
 * (including the ones inside DO blocks) and keeps, per public table, the
 * foreign keys that point at auth.users or public.profiles with their
 * ON DELETE action. It then checks:
 *  - every such key is ON DELETE CASCADE or SET NULL;
 *  - the three astrology tables exist after the replay and reference
 *    auth.users(id) ON DELETE CASCADE.
 */

const MIGRATIONS = join(__dirname, '..', '..', '..', 'supabase', 'migrations');

// TODO(WP-P0-18 Part B): switch to `statements` from ./sqlReplay once WP-P0-02 has merged.
/** Statements, with comments dropped and quoted / dollar-quoted text kept whole (verbatim from definerGrants.test.ts). */
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

const ident = (raw: string) => raw.replace(/"/g, '').toLowerCase();
/** A public table's bare name, or null for another schema. */
function publicTable(raw: string): string | null {
  const name = ident(raw);
  if (!name.includes('.')) return name;
  const [schema, table] = name.split('.');
  return schema === 'public' ? table : null;
}

type Fk = { column: string; target: 'auth.users' | 'profiles'; onDelete: string };
type Table = Map<string, Fk>; // constraint name -> member foreign key

const QNAME = String.raw`((?:"?[A-Za-z_]\w*"?\.)?"?[A-Za-z_]\w*"?)`;
const REFS = new RegExp(String.raw`\bREFERENCES\s+${QNAME}\s*(?:\(\s*"?(\w+)"?\s*\))?([\s\S]*)$`, 'i');

/** The member key a REFERENCES clause declares, if it points at auth.users or profiles. */
function memberRef(clause: string, column: string): Fk | null {
  const m = REFS.exec(clause);
  if (!m) return null;
  const target = ident(m[1]);
  let t: Fk['target'];
  if (target === 'auth.users') t = 'auth.users';
  else if (target === 'profiles' || target === 'public.profiles') t = 'profiles';
  else return null;
  const del = /\bON\s+DELETE\s+(CASCADE|SET\s+NULL|SET\s+DEFAULT|RESTRICT|NO\s+ACTION)\b/i.exec(m[3]);
  return { column, target: t, onDelete: del ? del[1].toUpperCase().replace(/\s+/g, ' ') : 'NO ACTION' };
}

/** A table constraint `[CONSTRAINT n] FOREIGN KEY (col) REFERENCES ...`. */
function tableFk(table: string, item: string): [string, Fk] | null {
  const m = /^(?:CONSTRAINT\s+("?\w+"?)\s+)?FOREIGN\s+KEY\s*\(\s*"?(\w+)"?\s*\)\s*([\s\S]*)$/i.exec(item);
  if (!m) return null;
  const column = ident(m[2]);
  const fk = memberRef(m[3], column);
  if (!fk) return null;
  return [m[1] ? ident(m[1]) : `${table}_${column}_fkey`, fk];
}

/** A column definition `col type ... REFERENCES ...`. */
function columnFk(table: string, item: string): [string, Fk] | null {
  const m = /^("?\w+"?)\s+([\s\S]*)$/.exec(item);
  if (!m) return null;
  const column = ident(m[1]);
  const named = /\bCONSTRAINT\s+("?\w+"?)\s+REFERENCES\b/i.exec(m[2]);
  const fk = memberRef(m[2], column);
  if (!fk) return null;
  return [named ? ident(named[1]) : `${table}_${column}_fkey`, fk];
}

function replay(): Map<string, Table> {
  const tables = new Map<string, Table>();

  const createTable = (stmt: string) => {
    const m = new RegExp(String.raw`^CREATE\s+(?:UNLOGGED\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?${QNAME}\s*\(`, 'i').exec(stmt);
    if (!m) return;
    const table = publicTable(m[1]);
    if (!table || tables.has(table)) return;
    const [body] = parens(stmt, m[0].length - 1);
    const fks: Table = new Map();
    for (const item of splitTopLevel(body)) {
      if (/^(PRIMARY|UNIQUE|CHECK|EXCLUDE|LIKE)\b/i.test(item)) continue;
      const hit = /^(CONSTRAINT\s+\S+\s+)?FOREIGN\s+KEY\b/i.test(item) ? tableFk(table, item) : columnFk(table, item);
      if (hit) fks.set(hit[0], hit[1]);
    }
    tables.set(table, fks);
  };

  const alterTable = (stmt: string) => {
    const m = new RegExp(String.raw`^ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:ONLY\s+)?${QNAME}\s+`, 'i').exec(stmt);
    if (!m) return;
    const table = publicTable(m[1]);
    const fks = table ? tables.get(table) : undefined;
    if (!table || !fks) return;
    for (const action of splitTopLevel(stmt.slice(m[0].length))) {
      let a: RegExpExecArray | null;
      if ((a = /^DROP\s+CONSTRAINT\s+(?:IF\s+EXISTS\s+)?("?\w+"?)/i.exec(action))) {
        fks.delete(ident(a[1]));
      } else if ((a = /^DROP\s+(?:COLUMN\s+)?(?:IF\s+EXISTS\s+)?("?\w+"?)/i.exec(action))) {
        const col = ident(a[1]);
        for (const [name, fk] of fks) if (fk.column === col) fks.delete(name);
      } else if ((a = /^ADD\s+((?:CONSTRAINT\s+\S+\s+)?FOREIGN\s+KEY\b[\s\S]*)$/i.exec(action))) {
        const hit = tableFk(table, a[1]);
        if (hit) fks.set(hit[0], hit[1]);
      } else if ((a = /^ADD\s+(?:COLUMN\s+)?(?:IF\s+NOT\s+EXISTS\s+)?([\s\S]*)$/i.exec(action))) {
        if (/^(CONSTRAINT|PRIMARY|UNIQUE|CHECK|EXCLUDE)\b/i.test(a[1])) continue;
        const hit = columnFk(table, a[1]);
        if (hit) fks.set(hit[0], hit[1]);
      }
    }
  };

  const dropTable = (stmt: string) => {
    const m = /^DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?([\s\S]+?)(?:\s+(?:CASCADE|RESTRICT))?$/i.exec(stmt);
    if (!m) return;
    for (const raw of splitTopLevel(m[1])) {
      const table = publicTable(raw);
      if (table) tables.delete(table);
    }
  };

  const run = (sql: string) => {
    for (const stmt of statements(sql)) {
      // A DO block: replay its body (a CREATE TABLE behind IF to_regclass(...)
      // IS NULL acts as IF NOT EXISTS, which createTable already does).
      const body = /^DO\s+(\$\w*\$)([\s\S]*)\1/i.exec(stmt);
      if (body) {
        run(body[2]);
        continue;
      }
      // Inside a DO body a statement can follow BEGIN / IF ... THEN.
      const at = /\b(CREATE\s+(?:UNLOGGED\s+)?TABLE|ALTER\s+TABLE|DROP\s+TABLE)\b/i.exec(stmt);
      if (!at) continue;
      const s = stmt.slice(at.index);
      if (/^CREATE/i.test(s)) createTable(s);
      else if (/^ALTER/i.test(s)) alterTable(s);
      else dropTable(s);
    }
  };

  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
  for (const f of files) run(readFileSync(join(MIGRATIONS, f), 'utf8'));
  return tables;
}

const ASTROLOGY = ['astrology_natal_charts', 'astrology_horoscope_cache', 'astrology_transit_events'];

describe('member foreign keys cascade (p12 gap-1-24)', () => {
  const tables = replay();
  const all = [...tables].flatMap(([table, fks]) =>
    [...fks].map(([name, fk]) => ({ table, name, ...fk })),
  );

  it('the replay sees the member tables', () => {
    expect(tables.has('profiles')).toBe(true);
    expect(tables.has('people')).toBe(true);
    // A parser that silently stops seeing keys would pass everything below.
    expect(all.length).toBeGreaterThan(50);
    expect(all.find((k) => k.table === 'people' && k.column === 'user_id')?.onDelete).toBe('CASCADE');
  });

  it('every foreign key to auth.users or profiles is ON DELETE CASCADE or SET NULL', () => {
    const blocking = all
      .filter((k) => k.onDelete !== 'CASCADE' && k.onDelete !== 'SET NULL')
      .map((k) => `${k.table}.${k.column} -> ${k.target} (${k.name}): ON DELETE ${k.onDelete}`);
    expect(blocking).toEqual([]);
  });

  it.each(ASTROLOGY)('%s exists and its user_id follows auth.users ON DELETE CASCADE', (table) => {
    const fks = tables.get(table);
    expect(fks, `${table} is not created by any migration`).toBeDefined();
    const onUser = [...(fks ?? new Map<string, Fk>())].filter(([, fk]) => fk.column === 'user_id');
    expect(onUser).toEqual([
      [`${table}_user_id_fkey`, { column: 'user_id', target: 'auth.users', onDelete: 'CASCADE' }],
    ]);
  });
});
