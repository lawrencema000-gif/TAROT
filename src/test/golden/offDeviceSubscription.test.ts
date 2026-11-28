// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/*
 * p12 FWP-06 (WP-P0-06 step 12). Once public.subscriptions can hold rows, a
 * member may have two qualifying off-device rows (a monthly, then a yearly
 * Stripe subscription). `.maybeSingle()` answers an error for two rows; the
 * reconcile ignored the error, saw no row, and the Android app downgraded a
 * paying member. The read must take the newest row and never downgrade on a
 * failed read.
 */

const SRC = join(__dirname, '..', '..', '..', 'supabase', 'functions', 'reconcile-premium-from-device', 'index.ts');

function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('reconcile-premium-from-device off-device read', () => {
  const src = code(readFileSync(SRC, 'utf8'));
  const start = src.indexOf('.in("provider", ["stripe", "web", "promo"])');
  const downgrade = src.indexOf('.update({ is_premium: false })');

  it('finds the read and the downgrade', () => {
    expect(start).toBeGreaterThan(0);
    expect(downgrade).toBeGreaterThan(start);
  });

  it('takes the newest qualifying row with limit(1), not maybeSingle()', () => {
    const read = src.slice(start, src.indexOf(';', start));
    expect(read).toContain('.order("updated_at", { ascending: false })');
    expect(read).toContain('.limit(1)');
    expect(read).not.toContain('.maybeSingle()');
  });

  it('returns Premium unchanged on a failed read, before the downgrade', () => {
    const between = src.slice(start, downgrade);
    const failed = between.indexOf('reason: "off_device_lookup_failed"');
    expect(failed).toBeGreaterThan(0);
    const branch = between.slice(between.lastIndexOf('if (', failed), failed + 40);
    expect(branch).toMatch(/^if \(\w*[Ee]rr/);
    expect(between.slice(between.lastIndexOf('return', failed), failed)).toMatch(/changed:\s*false,\s*isPremium:\s*true/);
  });
});
