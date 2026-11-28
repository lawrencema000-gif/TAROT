import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FREE_TIER } from '../../services/premium';

/*
 * p12 tarot-09 / D08 A (WP-P0-12): the free tier's three readings a day are
 * counted per account on the server. claim_free_reading is the only writer of
 * free_reading_claims; it claims atomically (the fourth is refused, ten at once
 * give three), acts for auth.uid() only, takes the device's local date within
 * one day of the UTC date, is closed to anon, and its limit is the app's.
 */

const MIGRATIONS = join(__dirname, '..', '..', '..', 'supabase', 'migrations');

/** SQL with its -- and block comments taken out. */
function strip(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');
}

/** The newest migration that defines public.claim_free_reading, comments stripped. */
function newestClaimMigration(): { name: string; sql: string } {
  const names = readdirSync(MIGRATIONS).filter((n) => n.endsWith('.sql')).sort();
  for (let i = names.length - 1; i >= 0; i--) {
    const sql = strip(readFileSync(join(MIGRATIONS, names[i]), 'utf8'));
    if (/FUNCTION\s+public\.claim_free_reading\s*\(/i.test(sql)) return { name: names[i], sql };
  }
  throw new Error('no migration defines public.claim_free_reading');
}

describe('free_reading_claims and claim_free_reading (D08 A)', () => {
  const { sql } = newestClaimMigration();

  it('claim_free_reading runs as definer with a fixed search_path and acts for the caller only', () => {
    expect(sql).toContain('SECURITY DEFINER');
    expect(sql).toContain('SET search_path = pg_catalog, public');
    expect(sql).toContain('auth.uid()');
  });

  it("takes the device's date only within one day of the UTC date", () => {
    expect(sql).toContain('v_utc_today - 1');
    expect(sql).toContain('v_utc_today + 1');
  });

  it('claims in one statement that never passes the limit', () => {
    expect(sql).toContain('ON CONFLICT (user_id, reading_date) DO UPDATE');
    expect(sql).toContain('WHERE c.used < v_limit');
  });

  it('is closed to anon and open to members', () => {
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.claim_free_reading(date) FROM PUBLIC, anon, authenticated');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.claim_free_reading(date) TO authenticated');
  });

  it("its limit is the app's FREE_TIER.dailyReadings", () => {
    const m = sql.match(/v_limit\s+constant\s+integer\s*:=\s*(\d+)/i);
    expect(m).not.toBeNull();
    expect(Number(m![1])).toBe(FREE_TIER.dailyReadings);
  });

  it('the table is read by its owner only and written only through the function', () => {
    expect(sql).toMatch(/ALTER TABLE public\.free_reading_claims ENABLE ROW LEVEL SECURITY/);
    const policies = [...sql.matchAll(/CREATE POLICY\s+\w+\s+ON\s+public\.free_reading_claims\b([^;]*);/gi)];
    expect(policies).toHaveLength(1);
    expect(policies[0][1]).toMatch(/FOR SELECT/i);
    expect(policies[0][1]).toContain('auth.uid()');
    expect(sql).not.toMatch(/GRANT\s+[^;]*\b(INSERT|UPDATE|DELETE|ALL)\b[^;]*ON\s+(TABLE\s+)?public\.free_reading_claims\s+TO\s+[^;]*\bauthenticated\b/i);
  });

  it('old rows are pruned daily', () => {
    expect(sql).toMatch(/cron\.schedule\(\s*'free-reading-claims-prune'/);
    expect(sql).toContain('DELETE FROM public.free_reading_claims WHERE reading_date <');
  });
});
