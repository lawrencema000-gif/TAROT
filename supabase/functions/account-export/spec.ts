/**
 * What account-export reads, table by table. Pure data (no Deno imports), so
 * the rules are unit-tested from the app's suite (src/test/accountExport.test.ts).
 *
 * The export is the caller's own data and nothing else. Two community rules
 * follow from 20261003000014, which keeps anonymous authors anonymous:
 *   - community_blocks: only blocks the caller made. Blocks made AGAINST the
 *     caller are someone else's data, and exporting them told a member who had
 *     blocked them.
 *   - community_anonymous_blocks: blocks the caller made from an anonymous
 *     post or comment. Exported without blocked_id — that id is the anonymous
 *     author, whom the caller was never told.
 */

export interface ExportSpec {
  table: string;
  /** The column that holds the caller's id. */
  ownerColumn: string;
  /** PostgREST select list. */
  columns: string;
}

const own = (table: string, ownerColumn = "user_id"): ExportSpec => ({ table, ownerColumn, columns: "*" });

export const EXPORT_SPECS: ExportSpec[] = [
  own("profiles", "id"),
  own("journal_entries"),
  own("mood_entries"),
  own("tarot_readings"),
  own("daily_rituals"),
  own("quiz_results"),
  own("saved_highlights"),
  own("content_interactions"),
  own("premium_readings"),
  own("rewarded_ad_unlocks"),
  own("community_posts"),
  own("community_comments"),
  own("community_reactions"),
  own("community_reports", "reporter_id"),
  own("community_blocks", "blocker_id"),
  // Created by 20261003000014; until it is pushed the table is missing and
  // exports as [] (see isMissingTable).
  { table: "community_anonymous_blocks", ownerColumn: "blocker_id", columns: "id, created_at" },
  own("moonstone_transactions"),
  own("moonstone_daily_checkins"),
  own("advisor_interest"),
  own("subscriptions"),
  own("user_preferences"),
];

/** A table this database does not have (yet): PostgREST's PGRST205, or Postgres's 42P01. */
export function isMissingTable(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "PGRST205" || error.code === "42P01" ||
    /could not find the table|relation .* does not exist/i.test(error.message ?? "");
}
