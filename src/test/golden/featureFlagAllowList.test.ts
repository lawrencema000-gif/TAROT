// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { migrationStatements } from './sqlReplay';

/*
 * FWP-02 (found while planning WP-P0-02): a flag's allow-list is for the
 * members on it. A column revoke would have broken the flag read of every
 * installed Android build, which selects `allowed_user_ids`, and every flag
 * would read as off there.
 *
 * Instead the table is renamed `feature_flag_settings` and closed to clients,
 * and `feature_flags` becomes a view with the same columns, in which the
 * allow-list shows only the caller's own id, and only when the caller is on
 * it. evaluate() checks only the caller's own id, so every client gets the
 * same answer for itself as before.
 *
 * Supabase's default privileges grant anon and authenticated ALL on every new
 * relation in public, views included, and the view reads the table as its
 * owner. So the view is revoked before SELECT is granted: clients only read it.
 */

type St = { file: string; sql: string; flat: string };

const ROOT = join(__dirname, '..', '..', '..');
const ALL: St[] = migrationStatements().map((s) => ({ ...s, flat: s.sql.replace(/\s+/g, ' ').trim() }));

function lastIndex(pred: (s: St) => boolean): number {
  for (let i = ALL.length - 1; i >= 0; i--) if (pred(ALL[i])) return i;
  return -1;
}

/** DDL that decides what the name public.feature_flags is. */
const DEFINES_FEATURE_FLAGS =
  /^(?:CREATE (?:OR REPLACE )?(?:TABLE|VIEW)(?: IF NOT EXISTS)?|ALTER (?:TABLE|VIEW)(?: IF EXISTS)?|DROP (?:TABLE|VIEW)(?: IF EXISTS)?) (?:public\.)?"?feature_flags"?(?=[\s(]|$)/i;

const viewAt = lastIndex((s) => DEFINES_FEATURE_FLAGS.test(s.flat));
const view = ALL[viewAt]?.flat ?? '';

/** The view's select list, split at its top-level commas, as `{ name, expr }`. */
function selectList(sql: string): Array<{ name: string; expr: string }> {
  const m = /\bAS SELECT (.*) FROM public\.feature_flag_settings$/i.exec(sql);
  if (!m) return [];
  const items: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of m[1]) {
    if (ch === '(' || ch === '[') depth += 1;
    if (ch === ')' || ch === ']') depth -= 1;
    if (ch === ',' && depth === 0) { items.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) items.push(cur.trim());
  return items.map((expr) => {
    const alias = /\sAS ([a-z_]\w*)$/i.exec(expr);
    return { name: (alias ? alias[1] : expr).toLowerCase(), expr };
  });
}

/** Privileges anon and authenticated hold on a relation, replaying GRANT / REVOKE from `from` on. */
function privilegesAfter(relationName: string, from: number, start: string[]): Record<'anon' | 'authenticated', Set<string>> {
  const ALL_PRIVS = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN'];
  const held = { anon: new Set(start), authenticated: new Set(start) };
  const re = new RegExp(
    `^(GRANT|REVOKE) (.+?) ON (?:TABLE )?(?:public\\.)?"?${relationName}"? (?:TO|FROM) (.+)$`,
    'i',
  );
  for (const st of ALL.slice(from + 1)) {
    const m = re.exec(st.flat);
    if (!m) continue;
    const privs = /^ALL(?: PRIVILEGES)?$/i.test(m[2].trim())
      ? ALL_PRIVS
      : m[2].split(',').map((p) => p.trim().toUpperCase());
    const grantees = m[3].split(',').map((g) => g.trim().replace(/"/g, '').toLowerCase());
    for (const role of ['anon', 'authenticated'] as const) {
      if (!grantees.includes(role) && !grantees.includes('public')) continue;
      // A REVOKE FROM PUBLIC does not touch a role's own grant; Supabase grants to each role.
      if (m[1].toUpperCase() === 'REVOKE' && !grantees.includes(role)) continue;
      for (const p of privs) {
        if (m[1].toUpperCase() === 'GRANT') held[role].add(p);
        else held[role].delete(p);
      }
    }
  }
  return held;
}

describe('feature flag allow-lists stay private (FWP-02)', () => {
  it('public.feature_flags ends as an owner-run security-barrier view over feature_flag_settings', () => {
    expect(viewAt, 'no statement defines public.feature_flags').toBeGreaterThanOrEqual(0);
    expect(view).toMatch(/^CREATE VIEW public\.feature_flags WITH \(security_barrier = true\) AS SELECT /i);
    expect(view).toMatch(/ FROM public\.feature_flag_settings$/i);
    // Owner-run on purpose: a security_invoker view could not read the closed table.
    expect(view).not.toMatch(/security_invoker/i);
  });

  it('its allow-list is the CASE that shows only the caller, and only when the caller is on it', () => {
    const allow = selectList(view).find((c) => c.name === 'allowed_user_ids');
    expect(allow?.expr).toBe(
      "CASE WHEN (SELECT auth.uid()) = ANY (allowed_user_ids) THEN ARRAY[(SELECT auth.uid())]::uuid[] ELSE '{}'::uuid[] END AS allowed_user_ids",
    );
  });

  it('every column the app (and every installed build) selects is still there', () => {
    const dal = readFileSync(join(ROOT, 'src', 'dal', 'featureFlags.ts'), 'utf8');
    const select = /\.from\('feature_flags'\)\s*\.select\('([^']+)'\)/.exec(dal);
    expect(select, "src/dal/featureFlags.ts no longer reads .from('feature_flags').select('…')").not.toBeNull();
    const wanted = select![1].split(',').map((c) => c.trim());
    const columns = selectList(view).map((c) => c.name);
    expect(wanted.filter((c) => !columns.includes(c))).toEqual([]);
  });

  it('anon and authenticated may only read the view', () => {
    // Supabase's default privileges: a new relation in public starts with ALL for both roles.
    const held = privilegesAfter('feature_flags', viewAt, ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN']);
    expect([...held.anon].sort()).toEqual(['SELECT']);
    expect([...held.authenticated].sort()).toEqual(['SELECT']);
  });

  it('the table is renamed, then closed to PUBLIC, anon and authenticated', () => {
    const renamed = lastIndex((s) => /^ALTER TABLE (?:public\.)?feature_flags RENAME TO feature_flag_settings$/i.test(s.flat));
    expect(renamed).toBeGreaterThanOrEqual(0);
    expect(renamed).toBeLessThan(viewAt);
    const closed = lastIndex((s) => /^REVOKE ALL ON (?:TABLE )?public\.feature_flag_settings FROM PUBLIC, anon, authenticated$/i.test(s.flat));
    expect(closed).toBeGreaterThan(renamed);
    // The table had every default grant; nothing may give any of it back.
    const held = privilegesAfter('feature_flag_settings', closed, []);
    expect([...held.anon]).toEqual([]);
    expect([...held.authenticated]).toEqual([]);
  });

  it('feature_on_for_me reads the table, because it needs the whole allow-list', () => {
    const at = lastIndex((s) => /^CREATE (?:OR REPLACE )?FUNCTION public\.feature_on_for_me\s*\(/i.test(s.flat));
    expect(at).toBeGreaterThan(viewAt);
    expect(ALL[at].flat).toContain('FROM public.feature_flag_settings');
    expect(ALL[at].flat).not.toMatch(/\bpublic\.feature_flags\b/);
  });

  it('the edge-function evaluator reads the table (with the service role), not the view', () => {
    const src = readFileSync(join(ROOT, 'supabase', 'functions', '_shared', 'feature-flags.ts'), 'utf8');
    expect(src).toMatch(/\.from\("feature_flag_settings"\)/);
    expect(src).not.toMatch(/\.from\("feature_flags"\)/);
  });
});
