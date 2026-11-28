// @vitest-environment node
/**
 * The welcome email links into the app and sends from the newsletter's
 * sender (p10 fix2).
 *
 * Its button, Unsubscribe and Privacy Policy links pointed at arcana.app,
 * which is not ours (and /privacy is no page anywhere), and it was sent from
 * an address on that domain, which Resend cannot verify for us, so the send
 * was refused. The function starts a server when it is imported, so this
 * reads its source for the sender; the email itself is built by the pure
 * content.ts (WP-P5-03), with the member's unsubscribe token in its link.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildWelcomeEmail } from '../../../supabase/functions/send-welcome-email/content';

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
const EMAIL = buildWelcomeEmail({
  displayName: 'Luna',
  unsubscribeUrl: 'https://tarotlife.app/unsubscribe?token=3f1c2a9e-8b7d-4c6e-9f0a-1b2c3d4e5f60',
  year: 2026,
  siteUrl: site ? JSON.parse(site) : '',
});
const links = [...EMAIL.html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);

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

describe('the landing course mail (WP-P5-03)', () => {
  it('logs no address, and advertises no one-click POST its page cannot take', () => {
    expect(NEWSLETTER).not.toContain('email: row.email');
    expect(NEWSLETTER).not.toContain('List-Unsubscribe-Post');
    expect(NEWSLETTER).toContain('"List-Unsubscribe"');
  });
});
