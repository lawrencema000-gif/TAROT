/**
 * Does this reader hold the Year Ahead unlock for the year the forecast is
 * served for? (p9 R06)
 *
 * The unlock is bought per calendar year, in the reader's own calendar:
 * YearAheadReportPage keys it on the device's `getFullYear()`, so a reader
 * who bought it in 2026 buys it again on 1 January 2027 and from then on
 * holds two rows, ('year-ahead', '2026') and ('year-ahead', '2027'). The
 * function used to read the unlock with `.maybeSingle()` and no year: with
 * two rows postgrest-js answers PGRST116 and `data: null`, the error was
 * dropped, and every load of the report the reader had just paid for again
 * was a 402 — permanently.
 *
 * Whose calendar counts: the reader's. The page sends the year it unlocked
 * (`year`). A reader's local year is the server's UTC year or one either
 * side of it (on the evening of 31 December UTC+9 is already in the next
 * year; on the morning of 1 January UTC−10 is still in the last one), and
 * so is a device clock that is somewhat off, so the window is the UTC year
 * ±1. A year outside it is not served. An older page sends no year: a row
 * for any year in the window then counts — that page had already checked
 * its own year's row before it called.
 *
 * The lookup asks for at most one row (`limit(1)`), so any number of years
 * bought never turns into an error, and a failed lookup is reported as a
 * failure, not as "not unlocked".
 *
 * Pure apart from the query, and typed structurally, so Node runs it in
 * src/test/golden/year-ahead-unlock.test.ts with the real supabase-js.
 */

export const YEAR_AHEAD_REPORT_KEY = "year-ahead";

/** The calendar years a reader can be in at `now`: the UTC year and one either side. */
export function yearAheadWindow(now: Date): number[] {
  const y = now.getUTCFullYear();
  return [y - 1, y, y + 1];
}

interface UnlockRows {
  data: Array<{ reference: string }> | null;
  error: { message: string; code?: string } | null;
}

/** The part of a supabase-js query the check uses. */
export interface UnlockFilter {
  eq(column: string, value: string): UnlockFilter;
  in(column: string, values: readonly string[]): UnlockFilter;
  limit(count: number): PromiseLike<UnlockRows>;
}

/** The part of a supabase-js client the check uses (the edge function passes its service client). */
export interface UnlockDb {
  from(table: string): { select(columns: string): UnlockFilter };
}

export type UnlockCheck =
  /** `reference`: the year whose row was found, when one was. `outOfWindow`: the year asked for cannot be this year anywhere. */
  | { ok: true; unlocked: boolean; reference: string | null; outOfWindow: boolean }
  | { ok: false; error: string };

/**
 * Whether `userId` holds the Year Ahead unlock for `year` (the year the
 * page unlocked), or — without one — for any year in the window at `now`.
 */
export async function findYearAheadUnlock(
  db: UnlockDb,
  userId: string,
  opts: { year?: number; now: Date },
): Promise<UnlockCheck> {
  const years = yearAheadWindow(opts.now);
  if (opts.year !== undefined && !years.includes(opts.year)) {
    return { ok: true, unlocked: false, reference: null, outOfWindow: true };
  }
  const references = (opts.year !== undefined ? [opts.year] : years).map(String);
  const { data, error } = await db
    .from("report_unlocks")
    .select("reference")
    .eq("user_id", userId)
    .eq("report_key", YEAR_AHEAD_REPORT_KEY)
    .in("reference", references)
    .limit(1);
  if (error) return { ok: false, error: error.code ? `${error.code}: ${error.message}` : error.message };
  const row = Array.isArray(data) ? data[0] : undefined;
  return { ok: true, unlocked: !!row, reference: row?.reference ?? null, outOfWindow: false };
}
