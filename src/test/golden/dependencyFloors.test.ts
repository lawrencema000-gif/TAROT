/**
 * Production dependencies stay above the versions with known advisories
 * (health-status-16, audited 2026-11-14 with npm audit and OSV):
 * - @capacitor/android GHSA-rvm3-566m-v7fv (critical): a tapped link could load
 *   remote content at the app's origin through the internal HTTP proxy path.
 *   Affected 8.0.0–8.3.4 (no fix in that line), 8.3.5–8.4.2 (fixed 8.4.3),
 *   8.5.0 (fixed 8.5.1).
 * - dompurify GHSA-cg2g-xh64-v4q7 (critical) and GHSA-mrv2-3pqr-j5jr (high),
 *   fixed in 3.4.17.
 * - @capacitor/cli in dependencies pulled rimraf, glob, minimatch and
 *   brace-expansion into the production tree; i18next-http-backend was unused.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import DOMPurify from 'dompurify';

const json = (p: string) => JSON.parse(readFileSync(join(process.cwd(), p), 'utf8'));
const pkg = json('package.json');
const lock = json('package-lock.json');
const locked = (name: string): string | undefined => lock.packages[`node_modules/${name}`]?.version;

const parts = (v: string) => v.split('.').map(Number);
function atLeast(v: string, floor: string): boolean {
  const a = parts(v);
  const b = parts(floor);
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return true;
}

/** Outside every GHSA-rvm3-566m-v7fv range for Capacitor 8. */
function capacitorPatched(v: string): boolean {
  if (!/^\d+\.\d+\.\d+$/.test(v)) return false;
  const [major, minor] = parts(v);
  if (major !== 8) return major > 8;
  if (minor <= 3) return false;
  if (minor === 4) return atLeast(v, '8.4.3');
  if (minor === 5) return atLeast(v, '8.5.1');
  return true;
}

describe('Capacitor', () => {
  it.each([
    ['8.0.1', false], ['8.3.4', false], ['8.3.5', false], ['8.4.2', false], ['8.4.3', true],
    ['8.5.0', false], ['8.5.1', true], ['8.5.3', true], ['8.6.0', true], ['8.6.2', true],
  ])('%s patched: %s', (v, want) => {
    expect(capacitorPatched(v)).toBe(want);
  });

  it('android, core and cli are pinned to one patched version', () => {
    const android = pkg.dependencies['@capacitor/android'];
    expect(capacitorPatched(android)).toBe(true);
    expect(pkg.dependencies['@capacitor/core']).toBe(android);
    expect(pkg.devDependencies['@capacitor/cli']).toBe(android);
    expect([locked('@capacitor/android'), locked('@capacitor/core'), locked('@capacitor/cli')]).toEqual([android, android, android]);
  });

  it('the CLI is a build tool, not a production dependency', () => {
    expect(pkg.dependencies['@capacitor/cli']).toBeUndefined();
  });
});

describe('the rest of the production tree', () => {
  it('dompurify is 3.4.17 or later', () => {
    expect(atLeast(locked('dompurify') ?? '0.0.0', '3.4.17')).toBe(true);
  });

  it('i18next-http-backend is gone', () => {
    expect(pkg.dependencies['i18next-http-backend']).toBeUndefined();
    expect(locked('i18next-http-backend')).toBeUndefined();
  });
});

describe('DOMPurify still strips what the blog must never render', () => {
  // The options BlogPostPage.tsx passes (843cd0fd :155-158). Expected output computed
  // with DOMPurify 3.4.15, 3.4.17 and 3.4.18 under jsdom 28: identical in all three.
  const OPTIONS = {
    ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'h4', 'strong', 'em', 'a', 'img', 'blockquote', 'ul', 'ol', 'li', 'br', 'article', 'section', 'span', 'table', 'thead', 'tbody', 'tr', 'td', 'th'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'target', 'rel'],
  };
  it.each([
    ['<p>Hi</p><script>alert(1)</script>', '<p>Hi</p>'],
    ['<img src="https://tarotlife.app/a.png" onerror="alert(1)" alt="a">', '<img src="https://tarotlife.app/a.png" alt="a">'],
    ['<a href="javascript:alert(1)">x</a>', '<a>x</a>'],
    ['<a href="https://tarotlife.app/blog/x" target="_blank" rel="noopener">read</a>', '<a href="https://tarotlife.app/blog/x" target="_blank" rel="noopener">read</a>'],
    ['<p style="color:red" class="lede">t</p>', '<p class="lede">t</p>'],
    ['<iframe src="https://evil.example"></iframe><p>after</p>', '<p>after</p>'],
    ['<svg><a href="javascript:alert(1)"><text>x</text></a></svg>', ''],
  ])('%s', (dirty, clean) => {
    expect(DOMPurify.sanitize(dirty, OPTIONS)).toBe(clean);
  });
});
