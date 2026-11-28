// @vitest-environment node
/**
 * The newsletter's database side after WP-P5-03 (health-status-02, gap-1-17).
 *
 * - The welcome trigger only enqueues into public.email_outbox: it no longer
 *   calls pg_net with app.settings that were never set.
 * - Every opt-in gets a server-side consent time.
 * - newsletter_unsubscribe knows a member's profile token as well as the
 *   landing course's tokens, and tells a token that belongs to nobody
 *   ("unknown_token", shown as "Link not recognised") from a second click on
 *   a real link ("already_unsubscribed"). It used to answer both with one
 *   reason, which the page showed as "Already unsubscribed — No further
 *   emails will be sent." to the holder of a token that matched nobody.
 * - The landing course stops retrying a row after five failures.
 *
 * This replays supabase/migrations in name order and takes the last
 * CREATE [OR REPLACE] FUNCTION of each name, the definition a fresh database
 * (and production, which applied the same files) ends with.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS = join(__dirname, '..', '..', '..', 'supabase', 'migrations');
const FILES = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();

/** The file with `--` line comments dropped (a commented-out definition is not one). */
function withoutLineComments(sql: string): string {
  return sql.replace(/\r\n/g, '\n').split('\n').map((l) => (/^\s*--/.test(l) ? '' : l.replace(/\s--\s.*$/, ''))).join('\n');
}

const SOURCES = FILES.map((file) => ({ file, sql: withoutLineComments(readFileSync(join(MIGRATIONS, file), 'utf8')) }));
const ALL = SOURCES.map((s) => s.sql).join('\n');

/** name → body of the last CREATE [OR REPLACE] FUNCTION of that name (dollar-quoted body). */
function lastFunctionBodies(): Map<string, { file: string; body: string }> {
  const out = new Map<string, { file: string; body: string }>();
  for (const { file, sql } of SOURCES) {
    const re = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?"?(\w+)"?\s*\(/gi;
    for (const m of sql.matchAll(re)) {
      const from = (m.index ?? 0) + m[0].length;
      const open = /\$(\w*)\$/.exec(sql.slice(from));
      if (!open) continue;
      const start = from + open.index + open[0].length;
      const end = sql.indexOf(open[0], start);
      if (end < 0) continue;
      out.set(m[1].toLowerCase(), { file, body: sql.slice(start, end) });
    }
  }
  return out;
}

const FNS = lastFunctionBodies();
const fn = (name: string) => {
  const f = FNS.get(name);
  expect(f, name).toBeDefined();
  return f!.body;
};

describe('send_welcome_email_trigger only enqueues', () => {
  it('inserts one outbox row per member, on a change to true (NULL included)', () => {
    const body = fn('send_welcome_email_trigger');
    expect(body).toContain('INSERT INTO public.email_outbox');
    expect(body).toContain('ON CONFLICT (user_id, kind) DO NOTHING');
    expect(body).toContain('IS DISTINCT FROM TRUE');
  });

  it('calls nothing over the network and reads no setting or key', () => {
    const body = fn('send_welcome_email_trigger');
    expect(body).not.toContain("current_setting('app.settings");
    expect(body).not.toContain('net.http_post');
    expect(body).not.toContain('service_role');
  });

  it('one welcome per member, ever', () => {
    expect(ALL).toMatch(/CREATE TABLE IF NOT EXISTS public\.email_outbox \([\s\S]*?UNIQUE \(user_id, kind\)/);
  });
});

describe('the consent time is set on the server', () => {
  it('a BEFORE trigger on profiles stamps newsletter_subscribed_at on every new opt-in', () => {
    expect(fn('profiles_stamp_newsletter_consent')).toMatch(/NEW\.newsletter_subscribed_at\s*:=\s*now\(\)/);
    expect(ALL).toMatch(
      /CREATE TRIGGER profiles_stamp_newsletter_consent\s+BEFORE INSERT OR UPDATE OF subscribed_to_newsletter ON public\.profiles/,
    );
  });
});

describe('newsletter_unsubscribe', () => {
  it('tries the course tokens first, then a member profile token, and switches the newsletter off', () => {
    const body = fn('newsletter_unsubscribe');
    const signups = body.indexOf('UPDATE public.newsletter_signups');
    const profiles = body.indexOf('FROM public.newsletter_profile_tokens');
    expect(signups).toBeGreaterThanOrEqual(0);
    expect(profiles).toBeGreaterThan(signups);
    expect(body).toMatch(/SET subscribed_to_newsletter = false/);
  });

  it('gap-1-17: "already_unsubscribed" only for a token a row holds, "unknown_token" otherwise', () => {
    const body = fn('newsletter_unsubscribe');
    const check = body.search(/IF EXISTS \(SELECT 1 FROM public\.newsletter_signups WHERE unsubscribe_token = p_token\)\s+OR EXISTS \(SELECT 1 FROM public\.newsletter_profile_tokens WHERE token = p_token\) THEN/);
    const already = body.indexOf("'already_unsubscribed'");
    const unknown = body.indexOf("'unknown_token'");
    expect(check).toBeGreaterThanOrEqual(0);
    expect(already).toBeGreaterThan(check);
    expect(unknown).toBeGreaterThan(already);
    expect(body).not.toContain('unknown_or_already_unsubscribed');
  });
});

describe('the new tables are server-only', () => {
  it.each(['email_outbox', 'newsletter_profile_tokens'])('%s: RLS on, no grant to PUBLIC, anon or authenticated', (table) => {
    expect(ALL).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`);
    expect(ALL).toContain(`REVOKE ALL ON public.${table} FROM PUBLIC, anon, authenticated;`);
    expect(ALL).not.toMatch(new RegExp(`GRANT[^;]*ON (?:TABLE )?public\\.${table}\\b[^;]*TO[^;]*\\b(anon|authenticated|PUBLIC)\\b`, 'i'));
  });
});

describe('the drain is not scheduled in release 1', () => {
  // Release 2 (after the owner's "sender confirmed", owner job 17) adds
  // …_welcome_email_drain_schedule.sql and turns this into: exactly one
  // cron.schedule('send-welcome-email', in that file, guarded by WHERE EXISTS
  // over public.email_outbox.
  it("no migration schedules send-welcome-email", () => {
    const scheduling = SOURCES.filter((s) => /cron\.schedule\(\s*'send-welcome-email'/.test(s.sql)).map((s) => s.file);
    expect(scheduling).toEqual([]);
  });
});

describe('the landing course', () => {
  it('newsletter_signups counts failed sends per row', () => {
    expect(ALL).toMatch(/ALTER TABLE public\.newsletter_signups ADD COLUMN IF NOT EXISTS send_failures integer NOT NULL DEFAULT 0/);
  });
});
