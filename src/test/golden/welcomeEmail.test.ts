// @vitest-environment node
/**
 * The welcome email links into the app and sends from the newsletter's
 * sender (p10 fix2).
 *
 * Its button, Unsubscribe and Privacy Policy links pointed at arcana.app,
 * which is not ours (and /privacy is no page anywhere), and it was sent from
 * an address on that domain, which Resend cannot verify for us, so the send
 * was refused. The function starts a server when it is imported, so this
 * reads its source.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = join(__dirname, '..', '..', '..');
const read = (path: string) => readFileSync(join(REPO, path), 'utf8');
const WELCOME = read('supabase/functions/send-welcome-email/index.ts');
const NEWSLETTER = read('supabase/functions/send-newsletter-course/index.ts');
const APP = read('src/App.tsx');

/** The initialiser of a top-level `const NAME = …;`, as written. */
function constant(src: string, name: string): string | undefined {
  return new RegExp(`^const ${name} = ([^;\\n]+);`, 'm').exec(src)?.[1];
}

const site = constant(WELCOME, 'SITE_URL');
const links = [...WELCOME.matchAll(/href="([^"]*)"/g)].map((m) => m[1].replace('${SITE_URL}', site ? JSON.parse(site) : ''));

describe('the welcome email', () => {
  it('links only into tarotlife.app', () => {
    expect(site).toBe('"https://tarotlife.app"');
    expect(links).toHaveLength(3);
    for (const href of links) expect(new URL(href).origin, href).toBe('https://tarotlife.app');
  });

  it('each link reaches a page the app serves: the home, a route in App.tsx, a static file', () => {
    expect(links.map((href) => new URL(href).pathname)).toEqual(['/', '/unsubscribe', '/privacy-policy.html']);
    for (const href of links) {
      const path = new URL(href).pathname;
      const served = path === '/' || APP.includes(`path: '${path}'`) || existsSync(join(REPO, 'public', path));
      expect(served, href).toBe(true);
    }
  });

  it("sends from the newsletter's sender, with its reply-to", () => {
    expect(constant(WELCOME, 'FROM_EMAIL')).toMatch(/^Deno\.env\.get\("NEWSLETTER_FROM_EMAIL"\)/);
    expect(constant(WELCOME, 'FROM_EMAIL')).toBe(constant(NEWSLETTER, 'FROM_EMAIL'));
    expect(constant(WELCOME, 'REPLY_TO')).toBe(constant(NEWSLETTER, 'REPLY_TO'));
    expect(WELCOME).toMatch(/\bfrom: FROM_EMAIL,/);
    expect(WELCOME).toMatch(/\breply_to: REPLY_TO,/);
  });
});
