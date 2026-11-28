import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/*
 * The migration statement splitter the golden tests share: definerGrants
 * (who may call a SECURITY DEFINER function), flagGatedWrites and
 * featureFlagAllowList (social-ai-02, FWP-02). Each replays
 * supabase/migrations statement by statement, in the order `supabase db push`
 * applies them.
 */

/** Statements, with comments dropped and quoted / dollar-quoted text kept whole. */
export function statements(sql: string): string[] {
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

export const MIGRATIONS_DIR = join(__dirname, '..', '..', '..', 'supabase', 'migrations');
/** Every migration's statements in the order `supabase db push` applies them (file name order). */
export function migrationStatements(dir = MIGRATIONS_DIR): Array<{ file: string; sql: string }> {
  return readdirSync(dir).filter((n) => n.endsWith('.sql')).sort()
    .flatMap((file) => statements(readFileSync(join(dir, file), 'utf8')).map((sql) => ({ file, sql })));
}
