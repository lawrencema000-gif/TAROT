// @vitest-environment node
/**
 * account-export (supabase/functions/account-export) exports the caller's own
 * rows and nothing else (P8 F00). It used to export community_blocks in both
 * directions — telling a member who had blocked them — and, with
 * 20261003000014, a block made from an anonymous row must never hand back
 * the anonymous author's id.
 */
import { describe, expect, it } from 'vitest';
import { EXPORT_SPECS, isMissingTable } from '../../supabase/functions/account-export/spec';

const byTable = Object.fromEntries(EXPORT_SPECS.map((s) => [s.table, s]));

describe('account-export', () => {
  it('exports only the blocks the caller made', () => {
    expect(byTable.community_blocks).toMatchObject({ ownerColumn: 'blocker_id' });
    expect(EXPORT_SPECS.some((s) => s.ownerColumn === 'blocked_id')).toBe(false);
  });

  it('exports anonymous blocks without the author behind them', () => {
    const spec = byTable.community_anonymous_blocks;
    expect(spec).toMatchObject({ ownerColumn: 'blocker_id' });
    expect(spec.columns).not.toBe('*');
    expect(spec.columns.split(',').map((c) => c.trim())).not.toContain('blocked_id');
  });

  it('still exports every table it exported before', () => {
    const before = [
      'profiles', 'journal_entries', 'mood_entries', 'tarot_readings', 'daily_rituals', 'quiz_results',
      'saved_highlights', 'content_interactions', 'premium_readings', 'rewarded_ad_unlocks',
      'community_posts', 'community_comments', 'community_reactions', 'community_reports', 'community_blocks',
      'moonstone_transactions', 'moonstone_daily_checkins', 'advisor_interest', 'subscriptions', 'user_preferences',
    ];
    for (const t of before) expect(byTable[t], t).toBeDefined();
    expect(byTable.profiles.ownerColumn).toBe('id');
    expect(byTable.community_reports.ownerColumn).toBe('reporter_id');
  });

  it('treats a table the database does not have yet as empty, not as an error', () => {
    expect(isMissingTable({ code: 'PGRST205', message: "Could not find the table 'public.community_anonymous_blocks' in the schema cache" })).toBe(true);
    expect(isMissingTable({ code: '42P01', message: 'relation "public.community_anonymous_blocks" does not exist' })).toBe(true);
    expect(isMissingTable({ code: '42501', message: 'permission denied for table x' })).toBe(false);
    expect(isMissingTable(null)).toBe(false);
  });
});
