import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/*
 * Member reports reach a moderator (WP-P0-20, social-ai-01 companion, D51).
 *
 * A member's report only added to community_posts.reported_count and hid the
 * post at five; the Moderation panel listed only rows the AI moderator had
 * flagged, so a report about self-harm waited for nobody, and a comment report
 * changed nothing at all. This reads the migrations as Postgres applies them
 * (the newest CREATE OR REPLACE of a function wins; REVOKE and GRANT add up)
 * and checks:
 *  - community_update_report_count handles comment reports, keeps the post
 *    branch's reported_count + 1, and hides both at one constant 5;
 *  - community_reported_queue() and community_resolve_reports(text,uuid,text)
 *    are SECURITY DEFINER, pin search_path, start with the is_admin() gate
 *    (42501), are closed to PUBLIC and anon and open to authenticated only;
 *  - the queue hands out no reporter id and no author id.
 */

const MIGRATIONS = join(__dirname, '..', '..', '..', 'supabase', 'migrations');

// TODO: switch to `migrationStatements` from ./sqlReplay once WP-P0-02 has merged.
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

const FILES = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
const ALL: Array<{ file: string; stmt: string }> = FILES.flatMap((file) =>
  statements(readFileSync(join(MIGRATIONS, file), 'utf8')).map((stmt) => ({ file, stmt })),
);

/** The newest CREATE [OR REPLACE] FUNCTION public.<name>, as the database ends up with it. */
function newestDefinition(name: string): { file: string; stmt: string } {
  const re = new RegExp(`^CREATE\\s+(OR\\s+REPLACE\\s+)?FUNCTION\\s+public\\.${name}\\s*\\(`, 'i');
  const found = ALL.filter((s) => re.test(s.stmt));
  expect(found.length, `no migration defines public.${name}`).toBeGreaterThan(0);
  return found[found.length - 1];
}

/** The function's body: the text between its dollar quotes. */
function body(stmt: string): string {
  const m = /AS\s+(\$[A-Za-z_]*\$)([\s\S]*)\1/i.exec(stmt);
  expect(m, 'no dollar-quoted body').not.toBeNull();
  return (m as RegExpExecArray)[2];
}

/** Who holds EXECUTE on public.<signature> after every REVOKE and GRANT in order (a new function starts open). */
function executeGrantees(signature: string): Set<string> {
  const sig = signature.replace(/\s+/g, '');
  const name = sig.slice(0, sig.indexOf('('));
  const holders = new Set<string>();
  const createRe = new RegExp(`^CREATE\\s+(OR\\s+REPLACE\\s+)?FUNCTION\\s+public\\.${name}\\s*\\(`, 'i');
  let created = false;
  for (const { stmt } of ALL) {
    if (!created && createRe.test(stmt)) {
      created = true;
      ['public', 'anon', 'authenticated'].forEach((r) => holders.add(r));
      continue;
    }
    const m = /^(REVOKE|GRANT)\s+(?:ALL|EXECUTE)\s+ON\s+FUNCTION\s+public\.([\w]+\s*\([^)]*\))\s+(?:FROM|TO)\s+(.+)$/is.exec(stmt);
    if (!m || m[2].replace(/\s+/g, '').toLowerCase() !== sig.toLowerCase()) continue;
    const roles = m[3].split(',').map((r) => r.trim().toLowerCase());
    for (const r of roles) {
      if (m[1].toUpperCase() === 'REVOKE') holders.delete(r);
      else holders.add(r);
    }
  }
  return holders;
}

const GATE = /^\s*(#variable_conflict\s+\w+\s*)?(DECLARE[\s\S]*?)?BEGIN\s+IF\s+NOT\s+public\.is_admin\s*\(\s*\)\s+THEN\s+RAISE\s+EXCEPTION\s+'admins only'\s+USING\s+ERRCODE\s*=\s*'42501'\s*;/i;

describe('community_update_report_count counts comment reports too (D51: five, for both)', () => {
  const def = newestDefinition('community_update_report_count');
  const src = body(def.stmt);

  it('is the WP-P0-20 migration’s version', () => {
    expect(def.file).toMatch(/_community_member_reports_queue\.sql$/);
  });

  it('keeps the post branch: reported_count + 1, hidden from the fifth', () => {
    expect(src).toMatch(/IF\s+NEW\.post_id\s+IS\s+NOT\s+NULL\s+THEN\s+UPDATE\s+public\.community_posts\s+SET\s+reported_count\s*=\s*reported_count\s*\+\s*1/i);
    expect(src).toMatch(/reported_count\s*\+\s*1\s*>=\s*v_hide_at/i);
  });

  it('hides a comment once five different members have a pending report on it', () => {
    expect(src).toMatch(/ELSIF\s+NEW\.comment_id\s+IS\s+NOT\s+NULL\s+THEN\s+UPDATE\s+public\.community_comments\s+SET\s+is_hidden\s*=\s*true/i);
    expect(src).toMatch(/count\s*\(\s*DISTINCT\s+\w*\.?reporter_id\s*\)/i);
    expect(src).toMatch(/status\s*=\s*'pending'/i);
    expect(src).toMatch(/\)\s*>=\s*v_hide_at/i);
  });

  it('uses one constant 5 for both branches, and no other number', () => {
    expect(src.match(/v_hide_at\s+constant\s+integer\s*:=\s*5\s*;/gi)).toHaveLength(1);
    expect(src.replace(/v_hide_at\s+constant\s+integer\s*:=\s*5\s*;/i, '')).not.toMatch(/>=\s*\d/);
  });
});

describe.each([
  ['community_reported_queue', 'community_reported_queue()'],
  ['community_resolve_reports', 'community_resolve_reports(text,uuid,text)'],
])('%s is for admins only', (name, signature) => {
  const def = newestDefinition(name);

  it('is SECURITY DEFINER with a pinned search_path', () => {
    const head = def.stmt.slice(0, def.stmt.search(/AS\s+\$/i));
    expect(head).toMatch(/SECURITY\s+DEFINER/i);
    expect(head).toMatch(/SET\s+search_path\s*=\s*pg_catalog\s*,\s*public/i);
  });

  it('starts with the is_admin() gate (42501)', () => {
    expect(body(def.stmt)).toMatch(GATE);
  });

  it('is closed to PUBLIC and anon, and open to authenticated only', () => {
    expect([...executeGrantees(signature)].sort()).toEqual(['authenticated']);
  });
});

describe('community_reported_queue() hands out what a moderator needs, and nobody’s id', () => {
  const def = newestDefinition('community_reported_queue');

  it('returns no reporter id and no author id', () => {
    expect(def.stmt).not.toMatch(/reporter_id/i);
    expect(def.stmt).not.toMatch(/user_id/i);
  });

  it('lists pending reports, self-harm first, then the most reported, then the newest', () => {
    const src = body(def.stmt);
    expect(src).toMatch(/status\s*=\s*'pending'/i);
    expect(src).toMatch(/ORDER\s+BY\s+g\.self_harm\s+DESC\s*,\s*g\.reports\s+DESC\s*,\s*g\.last_reported\s+DESC\s+LIMIT\s+100/i);
  });

  it('gives each item its kind, topic, text, hidden state, count, reasons and self-harm flag', () => {
    const cols = /RETURNS\s+TABLE\s*\(([\s\S]*?)\)\s*LANGUAGE/i.exec(def.stmt)?.[1] ?? '';
    const names = cols.split(',').map((c) => c.trim().split(/\s+/)[0]);
    expect(names).toEqual([
      'kind', 'id', 'post_id', 'topic', 'content', 'is_anonymous', 'is_hidden',
      'reports', 'reasons', 'self_harm', 'first_reported', 'last_reported',
    ]);
  });
});

describe('community_resolve_reports(kind, id, action)', () => {
  const src = body(newestDefinition('community_resolve_reports').stmt);

  it('takes dismiss, restore or remove, and refuses anything else (22023)', () => {
    expect(src).toMatch(/p_action\s+NOT\s+IN\s*\(\s*'dismiss'\s*,\s*'restore'\s*,\s*'remove'\s*\)/i);
    expect(src).toMatch(/ERRCODE\s*=\s*'22023'/i);
  });

  it('closes the pending reports: actioned on remove, dismissed otherwise', () => {
    expect(src).toMatch(/CASE\s+WHEN\s+p_action\s*=\s*'remove'\s+THEN\s+'actioned'\s+ELSE\s+'dismissed'\s+END/i);
    expect(src).toMatch(/status\s*=\s*'pending'/i);
  });

  it('restore shows the item again; remove blocks and hides it', () => {
    expect(src).toMatch(/p_action\s*=\s*'restore'[\s\S]*?SET\s+is_hidden\s*=\s*false/i);
    expect(src).toMatch(/p_action\s*=\s*'remove'[\s\S]*?SET\s+moderation_status\s*=\s*'blocked'[\s\S]*?is_hidden\s*=\s*true/i);
  });

  it('returns how many reports it changed', () => {
    expect(src).toMatch(/GET\s+DIAGNOSTICS\s+v_rows\s*=\s*ROW_COUNT/i);
    expect(src).toMatch(/RETURN\s+v_rows\s*;/i);
  });
});
