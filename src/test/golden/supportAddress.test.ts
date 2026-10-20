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

const REPO = join(__dirname, '..', '..', '..');
const BINARY = /\.(?:png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|mp3|mp4|webm|pdf)$/i;
const TEST = /^src\/test\/|\/__tests__\/|\/__snapshots__\/|\.(?:test|spec)\.[cm]?[jt]sx?$/;

function files(path: string): string[] {
  if (!statSync(join(REPO, path)).isDirectory()) return [path];
  return readdirSync(join(REPO, path)).flatMap((entry) => files(`${path}/${entry}`));
}

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
});
