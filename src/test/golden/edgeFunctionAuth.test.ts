// @vitest-environment node
/**
 * Edge functions that anyone can reach stand behind a secret or a member's
 * JWT (WP-P0-04, health-status-06).
 *
 * send-welcome-email ran with auth "optional" behind verify_jwt = false, so
 * anyone signed out could make the app email any member id. The shared
 * handler (supabase/functions/_shared/handler.ts) has three modes:
 * "required" (the default) answers 401 without a member's token; "optional"
 * resolves a member's token if there is one and lets every other caller
 * through with no user; "webhook" compares a shared secret, named by
 * webhookSecretEnv, before the body is read.
 *
 * Rules:
 *  1. A verify_jwt = false function in "optional" mode is on
 *     REVIEWED_OPTIONAL, with the reason it may be public, and no entry there
 *     is stale.
 *  2. A function whose source can read auth users (`auth.admin.`) or send
 *     email (`api.resend.com`) is "webhook" or "required", with no exceptions.
 *  3. A "webhook" function names the env var that holds its secret.
 *
 * A new function passes by declaring "webhook" or "required", or by a
 * reviewed "optional" entry here. The functions start a server when they are
 * imported, so this reads their source.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = join(__dirname, '..', '..', '..');
const FUNCTIONS = join(REPO, 'supabase', 'functions');
/** The checkout has CRLF line endings, and every pattern below expects \n. */
const read = (path: string) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

type Mode = 'required' | 'optional' | 'webhook';

/** Public on purpose: signed-out callers reach these, and each says what guards it instead. */
const REVIEWED_OPTIONAL: Record<string, string> = {
  'ad-config': 'public ad configuration for signed-out pages',
  'astrology-geocode': 'public place search used before sign-up',
  'stripe-webhook': 'Stripe signature verified in run with STRIPE_WEBHOOK_SECRET',
};

/** The handler's auth option on its own line; comment lines start with `*` or `//`, so mentions there do not count. */
const MODE_LINE = /^\s*auth:\s*["'](required|optional|webhook)["']\s*,?\s*$/gm;
const SECRET_LINE = /^\s*webhookSecretEnv:\s*["']([A-Z0-9_]+)["']/m;
/** An auth mode written anywhere on a line. */
const MODE_ANYWHERE = /\bauth:\s*["'](required|optional|webhook)["']/;
/** Reads auth users, or sends email. */
const SENSITIVE = /auth\.admin\.|api\.resend\.com/;
const USES_SHARED_HANDLER = /import\s*\{[^}]*\bhandler\b[^}]*\}\s*from\s*["']\.\.\/_shared\/handler\.ts["']/;

/** Names of the `[functions.<name>]` blocks with `verify_jwt = false`. Other blocks ([auth] and its tables) are skipped. */
function functionsWithoutJwt(toml: string): string[] {
  const names: string[] = [];
  let current: string | null = null;
  for (const line of toml.split('\n')) {
    const header = /^\s*\[([^\]]+)\]\s*(?:#.*)?$/.exec(line);
    if (header) {
      const fn = /^functions\.(?:"([^"]+)"|([A-Za-z0-9_-]+))$/.exec(header[1].trim());
      current = fn ? (fn[1] ?? fn[2]) : null;
      continue;
    }
    if (current && /^\s*verify_jwt\s*=\s*false\s*(?:#.*)?$/.test(line) && !names.includes(current)) {
      names.push(current);
    }
  }
  return names;
}

/** Every source file of one function's folder (its tests aside). */
function folderSource(dir: string): string {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return [folderSource(path)];
      if (!/\.(?:ts|tsx|js|mjs)$/.test(entry.name) || /[._]test\.[a-z]+$/.test(entry.name)) return [];
      return [read(path)];
    })
    .join('\n');
}

interface EdgeFunction {
  name: string;
  /** Every own-line auth option in index.ts; one today. */
  modeLines: Mode[];
  /** The handler's mode: the own-line option, else the handler's default. */
  mode: Mode;
  secret: string | null;
  /** Code lines (not comments) that name an auth mode but are not an own-line option, so MODE_LINE would miss them. */
  inlineModes: string[];
  usesSharedHandler: boolean;
  sensitive: boolean;
}

function describeFunction(name: string): EdgeFunction {
  const src = read(join(FUNCTIONS, name, 'index.ts'));
  const modeLines = [...src.matchAll(MODE_LINE)].map((m) => m[1] as Mode);
  const inlineModes = src.split('\n').filter((line) => {
    const code = line.trim();
    if (code.startsWith('*') || code.startsWith('/*') || code.startsWith('//')) return false;
    return MODE_ANYWHERE.test(line) && !new RegExp(MODE_LINE.source).test(line);
  });
  return {
    name,
    modeLines,
    mode: modeLines[0] ?? 'required',
    secret: SECRET_LINE.exec(src)?.[1] ?? null,
    inlineModes,
    usesSharedHandler: USES_SHARED_HANDLER.test(src),
    sensitive: SENSITIVE.test(folderSource(join(FUNCTIONS, name))),
  };
}

const FOLDERS = readdirSync(FUNCTIONS, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
  .map((entry) => entry.name)
  .sort();
const ALL = FOLDERS.filter((name) => existsSync(join(FUNCTIONS, name, 'index.ts'))).map(describeFunction);
const BY_NAME = new Map(ALL.map((fn) => [fn.name, fn]));
const NO_JWT = functionsWithoutJwt(read(join(REPO, 'supabase', 'config.toml')));

describe('edge functions anyone can reach are behind a secret or a JWT', () => {
  it('reads the functions and the verify_jwt = false blocks', () => {
    expect(ALL.length).toBeGreaterThan(10);
    expect(FOLDERS.filter((name) => !BY_NAME.has(name)), 'function folders without an index.ts').toEqual([]);
    // The database calls send-welcome-email with a secret and no JWT, so the gateway must not ask for one.
    expect(NO_JWT).toContain('send-welcome-email');
    expect(NO_JWT.filter((name) => !BY_NAME.has(name)), 'verify_jwt = false blocks with no supabase/functions/<name>/index.ts').toEqual([]);
  });

  it('reads each auth mode without guessing: one own-line option, or none and the shared handler', () => {
    expect(ALL.filter((fn) => fn.modeLines.length > 1).map((fn) => fn.name), 'more than one auth line').toEqual([]);
    // Written inline (or with a comment after it), the option is invisible to MODE_LINE: put it on its own line.
    expect(ALL.filter((fn) => fn.inlineModes.length > 0).map((fn) => `${fn.name}: ${fn.inlineModes[0].trim()}`)).toEqual([]);
    // With no auth line, "required" is the shared handler's default, and only the shared handler's.
    expect(ALL.filter((fn) => fn.modeLines.length === 0 && !fn.usesSharedHandler).map((fn) => fn.name)).toEqual([]);
  });

  it('rule 1: a verify_jwt = false function in "optional" mode is a reviewed public endpoint', () => {
    const unreviewed = NO_JWT.filter((name) => BY_NAME.get(name)?.mode === 'optional' && !(name in REVIEWED_OPTIONAL));
    expect(unreviewed, 'make it "webhook" or "required", or review it into REVIEWED_OPTIONAL with its reason').toEqual([]);
  });

  it('rule 1: every reviewed entry is still "optional" with verify_jwt = false, and says why', () => {
    for (const [name, reason] of Object.entries(REVIEWED_OPTIONAL)) {
      expect(reason.trim().length, name).toBeGreaterThan(0);
      expect(BY_NAME.get(name)?.mode, `${name} (stale entry)`).toBe('optional');
      expect(NO_JWT, `${name} (stale entry)`).toContain(name);
    }
  });

  it('rule 2: a function that can read auth users or send email is "webhook" or "required"', () => {
    const sensitive = ALL.filter((fn) => fn.sensitive);
    expect(sensitive.length).toBeGreaterThan(0);
    const open = sensitive.filter((fn) => fn.mode !== 'webhook' && fn.mode !== 'required').map((fn) => `${fn.name}: ${fn.mode}`);
    expect(open).toEqual([]);
  });

  it('rule 3: a "webhook" function names the env var that holds its secret', () => {
    expect(ALL.filter((fn) => fn.mode === 'webhook' && !fn.secret).map((fn) => fn.name)).toEqual([]);
  });
});
