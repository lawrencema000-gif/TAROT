// @vitest-environment node
/**
 * send-welcome-email is a webhook, not a public endpoint (WP-P0-04,
 * health-status-06).
 *
 * It ran with auth "optional", which let anyone signed out make the app
 * email any member id, learn from 404 versus 200 whether an id exists, and
 * read back the member's email and name when the Resend key was missing.
 * Now only a caller holding CRON_SECRET gets past the shared handler. The
 * secret is the gate, so there is no per-IP rate limit, which would only
 * throttle the database's own calls (they all come from one address). No
 * response carries an email or a name. The function starts a server when it
 * is imported, so this reads its source.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = join(__dirname, '..', '..', '..');
/** The checkout has CRLF line endings, and every pattern below expects \n. */
const WELCOME = readFileSync(join(REPO, 'supabase/functions/send-welcome-email/index.ts'), 'utf8').replace(/\r\n/g, '\n');

/** The object literal inside each `new Response(JSON.stringify({ … }))`. */
const RESPONSE_BODIES = [...WELCOME.matchAll(/new Response\(\s*JSON\.stringify\(\s*\{([\s\S]*?)\}\s*\)/g)].map((m) => m[1]);

describe('send-welcome-email', () => {
  it('is a webhook: only a caller holding CRON_SECRET gets past the handler', () => {
    expect(WELCOME).toMatch(/^\s*auth:\s*"webhook",?\s*$/m);
    expect(WELCOME).toMatch(/^\s*webhookSecretEnv:\s*"CRON_SECRET",?\s*$/m);
    expect(WELCOME).not.toMatch(/^\s*auth:\s*"optional"/m);
  });

  it('has no rate limit: the secret is the gate', () => {
    expect(WELCOME).not.toMatch(/\brateLimit\s*:/);
  });

  it('has no branch for a signed-in caller: under webhook auth there is none', () => {
    expect(WELCOME).not.toContain('ctx.userId');
  });

  it('never hands an email or a name back in a response', () => {
    for (const body of RESPONSE_BODIES) {
      expect(body, 'an email key or shorthand').not.toMatch(/\bemail\b/);
      expect(body, 'a name key').not.toMatch(/\bname\s*:/);
    }
  });
});
