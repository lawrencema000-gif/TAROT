import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/*
 * A fresh database (`supabase db reset`, a local stack, a Supabase branch,
 * the drift check's shadow database) is built by replaying
 * supabase/migrations in file order. Production never replays them: each
 * file ran on its own day, against whatever the dashboard had made by then.
 * So a file that alters, indexes, fills or puts a policy on a table that no
 * earlier file creates applies on production and stops a fresh replay
 * (WP-F-04: seo_blog_topics was filled before its CREATE sorted in,
 * 20260530000000 named the April and May ledger partitions that only
 * production's clock made, and two astrology tables were made by hand).
 *
 * This replays the files statically. Outside dollar-quoted bodies (functions
 * and DO blocks run later, or create what they create dynamically) it
 * collects, per statement, the tables a file creates (CREATE TABLE,
 * … PARTITION OF, CREATE [MATERIALIZED] VIEW, ALTER TABLE … RENAME TO) or
 * drops, and the public tables it changes or fills at the top level
 * (`ON public.x` in CREATE POLICY / TRIGGER / INDEX, ALTER TABLE public.x,
 * INSERT INTO / UPDATE / DELETE FROM public.x). Every such table must have
 * been created earlier: by an earlier file, or by the same file before the
 * statement.
 */

const MIGRATIONS = join(__dirname, '..', '..', '..', 'supabase', 'migrations');

/** The replay-only files WP-F-04 added, and the tables each one supplies. */
const REPLAY_ONLY: Record<string, string[]> = {
  '20260424000001_replay_ai_usage_ledger_spring_partitions.sql': ['ai_usage_ledger_2026_04', 'ai_usage_ledger_2026_05'],
  '20260505121141_replay_seo_blog_topics_table.sql': ['seo_blog_topics'],
  '20260529235959_replay_prod_only_astrology_tables.sql': ['astrology_natal_charts', 'astrology_transit_events'],
  // Makes the monthly ai_usage_ledger partitions production's cron made, in a DO
  // block (names depend on the replay date), so no static statement needs them;
  // the drift job's `db diff` does (round 4).
  '20260612215702_replay_ai_usage_ledger_monthly_partitions.sql': [],
};

/** Statements, with comments dropped and quoted / dollar-quoted text kept whole. */
function migrationStatements(sql: string): string[] {
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

/** The statement with dollar-quoted bodies and string literals blanked out. */
function topLevel(stmt: string): string {
  return stmt
    .replace(/\$([A-Za-z_]\w*)?\$[\s\S]*?\$\1\$/g, ' $$ ')
    .replace(/'(?:[^']|'')*'/g, "''");
}

const NAME = String.raw`"?([A-Za-z_][A-Za-z0-9_]*)"?`;
const PUB = String.raw`(?:"?public"?\.)`;
const re = (s: string) => new RegExp(s, 'i');

const CREATE_TABLE = re(String.raw`^create\s+(?:(?:global\s+|local\s+)?(?:temp|temporary|unlogged)\s+)?table\s+(?:if\s+not\s+exists\s+)?(${PUB}?)${NAME}`);
const CREATE_VIEW = re(String.raw`^create\s+(?:or\s+replace\s+)?(?:temp\s+|temporary\s+)?(?:materialized\s+)?view\s+(?:if\s+not\s+exists\s+)?(${PUB}?)${NAME}`);
const DROP_TABLE = re(String.raw`^drop\s+(?:table|view|materialized\s+view)\s+(?:if\s+exists\s+)?([\s\S]*?)(?:\s+(?:cascade|restrict))?$`);
const ALTER_TABLE = re(String.raw`^alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?${PUB}${NAME}`);
const RENAME = re(String.raw`^alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?(${PUB}?)${NAME}\s+rename\s+to\s+${NAME}\s*$`);
const ON_TARGET = re(String.raw`^create\s+(?:or\s+replace\s+)?(?:policy|(?:constraint\s+)?trigger|(?:unique\s+)?index)\b[\s\S]*?\bon\s+(?:only\s+)?${PUB}${NAME}`);
const INSERT = re(String.raw`^(?:with\s[\s\S]*?\)\s*)?insert\s+into\s+${PUB}${NAME}`);
const UPDATE = re(String.raw`^update\s+(?:only\s+)?${PUB}${NAME}`);
const DELETE = re(String.raw`^delete\s+from\s+(?:only\s+)?${PUB}${NAME}`);

type Problem = { file: string; table: string; statement: string };

/** Tables a non-public schema qualifier puts outside this check. */
function isPublic(qualifier: string): boolean {
  return qualifier === '' || /^"?public"?\.$/i.test(qualifier);
}

function replay(files: string[], read: (f: string) => string): Problem[] {
  const created = new Set<string>();
  const problems: Problem[] = [];
  for (const file of files) {
    for (const raw of migrationStatements(read(file))) {
      const stmt = topLevel(raw).replace(/\s+/g, ' ').trim();
      if (/^(begin|commit|do\b|create\s+(or\s+replace\s+)?(function|procedure)|comment\b)/i.test(stmt)) continue;

      const renamed = RENAME.exec(stmt);
      if (renamed && isPublic(renamed[1])) {
        const from = renamed[2].toLowerCase();
        if (!created.has(from)) problems.push({ file, table: from, statement: stmt.slice(0, 120) });
        created.delete(from);
        created.add(renamed[3].toLowerCase());
        continue;
      }

      const table = CREATE_TABLE.exec(stmt) ?? CREATE_VIEW.exec(stmt);
      if (table) {
        if (isPublic(table[1])) created.add(table[2].toLowerCase());
        // A partition or LIKE names its parent; the parent must exist.
        const parent = re(String.raw`\b(?:partition\s+of|like)\s+${PUB}${NAME}`).exec(stmt);
        if (parent && !created.has(parent[1].toLowerCase())) {
          problems.push({ file, table: parent[1].toLowerCase(), statement: stmt.slice(0, 120) });
        }
        continue;
      }

      const dropped = DROP_TABLE.exec(stmt);
      if (dropped) {
        for (const part of dropped[1].split(',')) {
          const m = re(String.raw`^\s*(${PUB}?)${NAME}\s*$`).exec(part);
          if (m && isPublic(m[1])) created.delete(m[2].toLowerCase());
        }
        continue;
      }

      for (const pattern of [ON_TARGET, ALTER_TABLE, INSERT, UPDATE, DELETE]) {
        const m = pattern.exec(stmt);
        if (!m) continue;
        const name = m[1].toLowerCase();
        if (!created.has(name)) problems.push({ file, table: name, statement: stmt.slice(0, 120) });
        break;
      }
    }
  }
  return problems;
}

/*
 * A top-level DO block that looks up a production-only auth.users row and
 * RAISEs an EXCEPTION when it is missing always stops a fresh replay: a
 * fresh database has no users (WP-F-04: 20260507150000 raised for the
 * owner's account). Such a block must skip with a NOTICE instead
 * (S-F04-1). Files allowed to keep the pattern are listed here; none are.
 */
const RAISES_ON_MISSING_USER_ALLOWLIST: string[] = [];

const MISSING_ROW_BRANCH = /\bif\s+(?:not\s+found|[A-Za-z_][\w.]*\s+is\s+null)\s+then\b([\s\S]*?)\bend\s+if\b/gi;

/** Top-level DO blocks that read auth.users and raise when the row is missing. */
function raisesOnMissingUser(sql: string): string[] {
  const hits: string[] = [];
  for (const stmt of migrationStatements(sql)) {
    if (!/^do\b/i.test(stmt)) continue;
    const body = stmt.replace(/--[^\n]*/g, ' ');
    if (!/\bauth\s*\.\s*"?users"?\b/i.test(body)) continue;
    for (const m of body.matchAll(MISSING_ROW_BRANCH)) {
      if (/\braise\s+exception\b/i.test(m[1])) hits.push(m[0].replace(/\s+/g, ' ').slice(0, 120));
    }
  }
  return hits;
}

const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
const read = (f: string) => readFileSync(join(MIGRATIONS, f), 'utf8');

describe('migrations replay on a fresh database', () => {
  it('every table a migration changes or fills was created by an earlier statement', () => {
    expect(replay(files, read)).toEqual([]);
  });

  it('no top-level DO block raises when a production-only auth.users row is missing', () => {
    const flagged = files
      .filter((f) => !RAISES_ON_MISSING_USER_ALLOWLIST.includes(f))
      .filter((f) => raisesOnMissingUser(read(f)).length > 0);
    expect(flagged).toEqual([]);
  });

  it('the missing-user check flags the unguarded pattern and passes the guard', () => {
    const lookup = "DO $$ DECLARE v_id uuid; BEGIN SELECT id INTO v_id FROM auth.users WHERE email = 'owner@example.invalid';";
    const update = ' UPDATE public.profiles SET is_premium = TRUE WHERE id = v_id; END $$;';
    expect(raisesOnMissingUser(`${lookup} IF v_id IS NULL THEN RAISE EXCEPTION 'no auth.users row'; END IF;${update}`)).toHaveLength(1);
    expect(raisesOnMissingUser(`${lookup} IF NOT FOUND THEN RAISE EXCEPTION 'missing'; END IF;${update}`)).toHaveLength(1);
    expect(raisesOnMissingUser(`${lookup} IF v_id IS NULL THEN RAISE NOTICE 'skipping'; RETURN; END IF;${update}`)).toEqual([]);
    expect(raisesOnMissingUser(read('20260507150000_grant_lawrence_premium.sql'))).toEqual([]);
  });

  it('the replay-only files are what makes the replay pass', () => {
    for (const [file, tables] of Object.entries(REPLAY_ONLY)) {
      expect(files).toContain(file);
      const missing = new Set(replay(files.filter((f) => f !== file), read).map((p) => p.table));
      for (const t of tables) expect(missing).toContain(t);
    }
  });
});
