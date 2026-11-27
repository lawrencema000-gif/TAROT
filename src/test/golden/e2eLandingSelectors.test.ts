// @vitest-environment node
/**
 * The e2e helpers follow the app (health-status-14). landing.css moved the
 * landing's Sign in into the Menu sheet below 420px on 2026-10-20, the spec
 * kept looking for it in the bar, and the nightly production check failed 26
 * nights in a row. This test fails on the pull request that moves the
 * breakpoint or renames a label, not on a nightly weeks later.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import postcss from 'postcss';

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n');
const helpers = `${read('e2e/landing.ts')}\n${read('e2e/fixtures.ts')}`;

/** An exported name regex of the e2e helpers, written on one line: `export const X = /…/;`. */
function exported(name: string): RegExp {
  const m = new RegExp(`^export const ${name} = /(.+)/([a-z]*);$`, 'm').exec(helpers);
  if (!m) throw new Error(`${name} is not declared on one line in e2e/landing.ts or e2e/fixtures.ts`);
  return new RegExp(m[1], m[2]);
}

describe('e2e/landing.ts follows landing.css', () => {
  it('SIGN_IN_BAR_MIN_WIDTH is where the bar starts showing Sign in', () => {
    const widths: number[] = [];
    postcss.parse(read('src/styles/landing.css')).walkAtRules('media', (at) => {
      const max = /max-width:\s*([\d.]+)px/.exec(at.params);
      if (!max) return;
      at.walkRules((rule) => {
        if (!rule.selectors.some((s) => /\.lp-nav-signin\b/.test(s))) return;
        rule.walkDecls('display', (d) => {
          if (d.value.trim() === 'none') widths.push(Number(max[1]));
        });
      });
    });
    expect(widths).toEqual([419.98]);
    const constant = Number(/^export const SIGN_IN_BAR_MIN_WIDTH = (\d+);$/m.exec(helpers)?.[1]);
    expect(constant).toBe(Math.ceil(widths[0]));
  });
});

describe('the e2e names match the app’s labels in every language', () => {
  const json = (lng: string, ns: string) => JSON.parse(read(`src/i18n/locales/${lng}/${ns}.json`));
  const labels: Record<string, (lng: string) => string> = {
    MENU_NAME: (lng) => json(lng, 'landing').nav.menu,
    SIGN_IN_NAME: (lng) => json(lng, 'common').nav.signIn,
    HOME_NAME: (lng) => json(lng, 'common').nav.home,
    READINGS_NAME: (lng) => json(lng, 'common').nav.readings,
    HOROSCOPE_NAME: (lng) => json(lng, 'common').nav.horoscope,
  };
  for (const [name, label] of Object.entries(labels)) {
    it(name, () => {
      const re = exported(name);
      for (const lng of ['en', 'ja', 'ko', 'zh']) expect(label(lng), `${name} / ${lng}`).toMatch(re);
    });
  }
});

it('only e2e/landing.ts looks the landing’s Sign in up by name', () => {
  // A button lookup whose name would match the bare "Sign in" / "ログイン" label.
  // Other buttons ("Back to sign in", "Send reset link") are not this one and pass.
  const lookup = /getByRole\(\s*['"]button['"]\s*,\s*\{[^}]*name:\s*(\/(?:\\.|[^/\\\n])+\/[a-z]*|'[^']*'|"[^"]*")/g;
  const namesSignIn = (literal: string) => {
    if (!literal.startsWith('/')) return ['sign in', 'ログイン'].includes(literal.slice(1, -1).toLowerCase());
    const end = literal.lastIndexOf('/');
    const re = new RegExp(literal.slice(1, end), literal.slice(end + 1));
    return ['Sign in', 'ログイン'].some((label) => re.test(label));
  };
  const offenders = readdirSync(join(root, 'e2e'))
    .filter((f) => f.endsWith('.ts') && f !== 'landing.ts')
    .filter((f) => [...read(`e2e/${f}`).matchAll(lookup)].some(([, literal]) => namesSignIn(literal)));
  expect(offenders).toEqual([]);
});
