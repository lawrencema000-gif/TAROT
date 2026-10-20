import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

/*
 * p10 d2-ja-08: the Love Tree and Soulmate share texts sent friends to
 * arcana.app in all four languages — a host that is not the app (403 and 404
 * from someone else's server, a TLS failure on www). Eight translations each
 * carried the host, so it could only be fixed eight times. A share text takes
 * its link as {{url}} from code now (the app's own host, tarotlife.app), and
 * this gate holds the locale files to that:
 *
 *  - no string in any namespace of any language names arcana.app (the
 *    Android package id, com.arcana.app, is not a host and is allowed);
 *  - the Love Tree and Soulmate share texts end with their {{url}}, after a
 *    space or the full-width colon. A word written against a link
 *    ("arcana.app/love-tree에서") is taken into it by a messenger's linkifier.
 *
 * Needs the p10 'pages' locale delta merged.
 *
 * p10 fix2: the host was not only in the translations. The Stripe redirect
 * allowlists and CORS accepted it (an open redirect from our checkout to a
 * domain we do not control), the welcome email linked to it and sent from
 * it, Settings, the landing footer, the rating prompt and the geocoder gave
 * a support mailbox on it, and the deep links were built for it. So nothing
 * that ships or deploys may name it: the app, the edge functions, the auth
 * emails and config, the build scripts, the static files. A test may (that
 * is where it is forbidden), and so may a comment that says in prose why a
 * value is what it is, never as a link or an address.
 */

const ROOT = join(__dirname, '..', '..', 'i18n', 'locales');
const LANGS = ['en', 'ja', 'ko', 'zh'] as const;
const WRONG_HOST = /(?<!com\.)\barcana\.app\b/i;

function strings(node: unknown, path: string, out: Array<[string, string]>): void {
  if (typeof node === 'string') out.push([path, node]);
  else if (Array.isArray(node)) node.forEach((v, i) => strings(v, `${path}.${i}`, out));
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) strings(v, path ? `${path}.${k}` : k, out);
  }
}

describe('share links in the locale files', () => {
  it.each(LANGS)('%s: no string names arcana.app, which is not the app', (lng) => {
    const bad: string[] = [];
    for (const file of readdirSync(join(ROOT, lng)).filter((f) => f.endsWith('.json'))) {
      const all: Array<[string, string]> = [];
      strings(JSON.parse(readFileSync(join(ROOT, lng, file), 'utf8')), '', all);
      for (const [path, raw] of all) if (WRONG_HOST.test(raw)) bad.push(`${lng}/${file} ${path}: ${raw.slice(0, 80)}`);
    }
    expect(bad).toEqual([]);
  });

  it.each(LANGS)('%s: the Love Tree and Soulmate share texts end with their {{url}}', (lng) => {
    const app = JSON.parse(readFileSync(join(ROOT, lng, 'app.json'), 'utf8'));
    expect(app.loveTree.shareText).toMatch(/(?: |：)\{\{url\}\}$/);
    expect(app.soulmate.shareText).toMatch(/(?: |：)\{\{url\}\}$/);
  });
});

const REPO = join(__dirname, '..', '..', '..');
/** What ships or deploys. The historic docs and the old migrations are left as they were written. */
const SHIPPED = ['src', 'supabase/functions', 'supabase/email-templates', 'supabase/config.toml', 'scripts', 'public', 'index.html'];
const BINARY = /\.(?:png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|mp3|mp4|webm|pdf)$/i;
const TEST = /^src\/test\/|\/__tests__\/|\/__snapshots__\/|\.(?:test|spec)\.[cm]?[jt]sx?$/;
const SCRIPT = /\.[cm]?[jt]sx?$/;
/** The host as a link or an address: after //, @ or a subdomain's dot, or before a path. */
const AS_LINK = /(?:\/\/|@|(?<!\bcom)\.)arcana\.app\b|(?<!com\.)\barcana\.app\//i;

function files(path: string): string[] {
  if (!statSync(join(REPO, path)).isDirectory()) return [path];
  return readdirSync(join(REPO, path)).flatMap((entry) => files(`${path}/${entry}`));
}

/** A script with its comments taken out, read the way TypeScript reads it. */
function withoutComments(path: string, text: string): string {
  const kind = /x$/.test(path) ? ts.ScriptKind.TSX : /js$/.test(path) ? ts.ScriptKind.JS : ts.ScriptKind.TS;
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, kind);
  return ts.createPrinter({ removeComments: true }).printFile(source);
}

/** Whether a file names the host where it counts: anywhere in a page, data or a style; in a script's code, or as a link or an address in its comments. */
function namesHost(path: string, text: string): boolean {
  if (!WRONG_HOST.test(text)) return false;
  if (!SCRIPT.test(path)) return true;
  return WRONG_HOST.test(withoutComments(path, text)) || AS_LINK.test(text);
}

describe('nothing that ships names arcana.app (p10 fix2)', () => {
  it('reads the host where it counts, and only there', () => {
    // What the fix removed: a host in an allowlist, a link, an address, a placeholder.
    expect(namesHost('a.ts', `const HOSTS = ['tarotlife.app', 'www.arcana.app'];`)).toBe(true);
    expect(namesHost('a.ts', 'const ORIGIN = "https://arcana.app";')).toBe(true);
    expect(namesHost('a.tsx', `<Input placeholder="seeker@arcana.app" />`)).toBe(true);
    expect(namesHost('a.ts', 'const html = `<a href="https://arcana.app/privacy">`;')).toBe(true);
    expect(namesHost('a.mjs', `export const SITE = 'arcana.app';`)).toBe(true);
    expect(namesHost('a.html', '<!-- arcana.app -->')).toBe(true);
    expect(namesHost('a.json', '{ "share": "arcana.app/love-tree" }')).toBe(true);
    // A comment may say why, in prose; never as a link or an address.
    expect(namesHost('a.ts', `/** every language named arcana.app, which is not the app */\nconst A = 1;`)).toBe(false);
    expect(namesHost('a.ts', `// The host was arcana.app, which is not ours.\nconst A = 1;`)).toBe(false);
    expect(namesHost('a.ts', `/**\n * Supported routes:\n *   https://arcana.app/reading/:id\n */\nconst A = 1;`)).toBe(true);
    expect(namesHost('a.ts', `// write to support@arcana.app\nconst A = 1;`)).toBe(true);
    // The Android package id, URL scheme and Play Store id are ours.
    expect(namesHost('a.ts', `const URL = 'https://play.google.com/store/apps/details?id=com.arcana.app';`)).toBe(false);
    expect(namesHost('a.ts', `const REDIRECT = 'com.arcana.app://auth';`)).toBe(false);
    expect(namesHost('a.toml', `"com.arcana.app://**",`)).toBe(false);
  });

  it('no file outside the tests names it', () => {
    const offenders: string[] = [];
    let read = 0;
    for (const path of SHIPPED.flatMap(files)) {
      if (BINARY.test(path) || TEST.test(path)) continue;
      read++;
      const text = readFileSync(join(REPO, path), 'utf8');
      if (!namesHost(path, text)) continue;
      text.split('\n').forEach((line, i) => {
        if (WRONG_HOST.test(line)) offenders.push(`${path}:${i + 1}: ${line.trim().slice(0, 100)}`);
      });
    }
    expect(read).toBeGreaterThan(500);
    expect(offenders).toEqual([]);
  });
});
