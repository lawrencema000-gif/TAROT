/**
 * One support mailbox, on the app's own domain (p10 fix2).
 *
 * Settings (Help, and Contact on the privacy page), the landing footer's
 * Contact, the rating prompt's feedback link and the geocoder's contact for
 * Nominatim all gave a support mailbox on arcana.app, a domain that is not
 * ours: mail to it was lost or reached a stranger, and Nominatim's usage
 * policy wants a contact that reaches us. It is support@tarotlife.app, beside
 * the press@ and advisors@ addresses the app already publishes there.
 */
import { describe, expect, it, vi } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('../../lib/supabase', () => ({ supabase: {} }));
import { ratePromptService } from '../../services/ratePrompt';
// @ts-expect-error — a plain .mjs script, no types
import { publishedAddresses, checkDomain } from '../../../scripts/check-mail-routing.mjs';

const REPO = join(__dirname, '..', '..', '..');
const BINARY = /\.(?:png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|mp3|mp4|webm|pdf)$/i;
const TEST = /^src\/test\/|\/__tests__\/|\/__snapshots__\/|\.(?:test|spec)\.[cm]?[jt]sx?$/;

function files(path: string): string[] {
  if (!statSync(join(REPO, path)).isDirectory()) return [path];
  return readdirSync(join(REPO, path)).flatMap((entry) => files(`${path}/${entry}`));
}

/** The @tarotlife.app mailboxes that exist at the mail provider (p12 WP-P0-14, D10 A). */
const PROVISIONED = ['advisors@tarotlife.app', 'press@tarotlife.app', 'support@tarotlife.app'];

describe('the support mailbox', () => {
  it('every support address the app or its functions give is support@tarotlife.app', () => {
    const addresses = new Set<string>();
    const where = new Set<string>();
    for (const path of ['src', 'supabase/functions', 'public', 'scripts', 'index.html'].flatMap(files)) {
      if (BINARY.test(path) || TEST.test(path)) continue;
      for (const [address] of readFileSync(join(REPO, path), 'utf8').matchAll(/\bsupport@[\w-]+(?:\.[\w-]+)+/gi)) {
        addresses.add(address.toLowerCase());
        where.add(path);
      }
    }
    expect([...addresses]).toEqual(['support@tarotlife.app']);
    expect([...where]).toEqual(
      expect.arrayContaining([
        'src/components/overlays/SettingsSheet.tsx',
        'src/pages/LandingPage.tsx',
        'src/services/ratePrompt.ts',
        'supabase/functions/astrology-geocode/index.ts',
      ]),
    );
  });

  it("the rating prompt's feedback link writes to it", () => {
    expect(ratePromptService.getFeedbackEmail()).toBe('mailto:support@tarotlife.app?subject=Arcana%20App%20Feedback');
  });

  it('every @tarotlife.app mailbox the app publishes is a provisioned one', () => {
    const addresses = new Set<string>();
    for (const path of ['src', 'supabase/functions', 'public', 'scripts', 'index.html'].flatMap(files)) {
      if (BINARY.test(path) || TEST.test(path)) continue;
      for (const [address] of readFileSync(join(REPO, path), 'utf8').matchAll(/\b[\w.+-]+@(?:[\w-]+\.)*tarotlife\.app\b/gi)) {
        addresses.add(address.toLowerCase());
      }
    }
    // A new address fails here until it is added to PROVISIONED, with a mailbox behind it.
    expect([...addresses].sort()).toEqual(PROVISIONED);
  });

  it('the routing check reads the same addresses', () => {
    const found = publishedAddresses() as Map<string, Set<string>>;
    expect([...found.keys()].sort()).toEqual(PROVISIONED);
    expect([...found.get('press@tarotlife.app')!]).toContain('public/press.html');
    expect([...found.get('support@tarotlife.app')!]).toContain('supabase/functions/astrology-geocode/index.ts');
  });

  it('the routing check fails a domain that cannot receive mail', async () => {
    const reject = (code: string) => () => Promise.reject(Object.assign(new Error(code), { code }));
    const MX = [
      { exchange: 'mx2.mail.example', priority: 20 },
      { exchange: 'mx1.mail.example', priority: 10 },
    ];
    // 192.0.2.10 is a TEST-NET address (RFC 5737).
    const resolver = (over: Record<string, unknown> = {}) => ({
      resolveMx: () => Promise.resolve(MX),
      resolve4: () => Promise.resolve(['192.0.2.10']),
      resolve6: reject('ENODATA'),
      resolveTxt: () => Promise.resolve([['v=spf1 include:mail.example ~all'], ['google-site-verification=x']]),
      ...over,
    });

    const noMx = await checkDomain('tarotlife.app', resolver({ resolveMx: reject('ENODATA') }));
    expect(noMx.ok).toBe(false);
    expect(noMx.reason).toContain('no MX record (ENODATA)');

    expect(await checkDomain('tarotlife.app', resolver())).toEqual({
      domain: 'tarotlife.app',
      ok: true,
      mx: ['10 mx1.mail.example', '20 mx2.mail.example'],
      spf: 'v=spf1 include:mail.example ~all',
    });

    const twoSpf = await checkDomain(
      'tarotlife.app',
      resolver({ resolveTxt: () => Promise.resolve([['v=spf1 include:a.example ~all'], ['v=spf1 include:b.example ~all']]) }),
    );
    expect(twoSpf.ok).toBe(false);
    expect(twoSpf.reason).toContain('2 SPF records');

    const nullMx = await checkDomain('tarotlife.app', resolver({ resolveMx: () => Promise.resolve([{ exchange: '', priority: 0 }]) }));
    expect(nullMx.ok).toBe(false);
    expect(nullMx.reason).toContain('null MX');

    const noAddress = await checkDomain('tarotlife.app', resolver({ resolve4: reject('ENOTFOUND'), resolve6: reject('ENOTFOUND') }));
    expect(noAddress.ok).toBe(false);
    expect(noAddress.reason).toContain('has no address');

    expect(
      await checkDomain(
        'tarotlife.app',
        resolver({
          resolveMx: () => Promise.resolve([{ exchange: 'mx1.mail.example', priority: 10 }]),
          resolveTxt: () => Promise.resolve([['google-site-verification=x']]),
        }),
      ),
    ).toEqual({ domain: 'tarotlife.app', ok: true, mx: ['10 mx1.mail.example'], spf: null });
  });
});
