/**
 * What account-delete clears on the profile before admin.deleteUser.
 *
 * deleteUser normally cascades the profile away. The redaction is what is
 * left when it does not (the function then answers DELETE_FAILED and the
 * account stays): the profile must no longer name or describe the member to
 * anyone. Since 20261003000014 the Community feed signs a member's named
 * posts and comments with profiles.community_name, so a chosen Community
 * name kept on the redacted row went on naming the member on every post
 * (p9 QS R-6). The birth zone, a destined place and the personality results
 * were never cleared either.
 *
 * Each of those is cleared in an update of its own, after the main one.
 * PostgREST refuses a whole PATCH that names a column the database does not
 * have (PGRST204): community_name arrives with 20261003000014, which
 * production may not have yet, and one update naming it would leave every
 * field unredacted. A column that is not there yet is logged and skipped.
 *
 * Pure apart from the queries, and typed structurally, so Node runs it in
 * src/test/golden/accountDeleteRedact.test.ts with the real supabase-js.
 */

/** The fields every production schema has had since this function shipped. */
export const PROFILE_REDACTION: Readonly<Record<string, string | boolean | null>> = {
  display_name: "Deleted user",
  email: null,
  is_guest: true,
  birth_date: null,
  birth_time: null,
  birth_place: null,
  birth_lat: null,
  birth_lon: null,
  timezone: null,
  goals: null,
  mbti_type: null,
  love_language: null,
  tone_preference: null,
  avatar_seed: null,
  background_url: null,
  card_back_url: null,
};

/**
 * Cleared one by one after PROFILE_REDACTION, each on its own: the chosen
 * Community name (20261003000014), the birth zone (20260612221759), the
 * destined place, and the attachment, Big Five and Enneagram results.
 */
export const OWN_UPDATE_COLUMNS = [
  "community_name",
  "birth_tz",
  "destined_place",
  "attachment_style",
  "big_five_scores",
  "enneagram_type",
  "enneagram_wing",
] as const;

type Result = { error: { message: string; code?: string } | null };

/** The slice of a supabase-js client the redaction uses. */
export interface RedactDb {
  from(table: "profiles"): {
    update(values: Record<string, unknown>): { eq(column: "id", value: string): PromiseLike<Result> };
  };
}

export interface RedactLog {
  warn(msg: string, fields?: Record<string, unknown>): void;
}

export interface RedactOutcome {
  /** The main redaction landed. */
  main: boolean;
  /** The columns cleared on their own. */
  cleared: string[];
  /** The columns that could not be cleared (not in this schema yet, or the update failed). */
  skipped: string[];
}

/** Redact `userId`'s profile. Never throws: the deletion goes ahead either way. */
export async function redactProfile(db: RedactDb, userId: string, log: RedactLog): Promise<RedactOutcome> {
  const { error } = await db.from("profiles").update({ ...PROFILE_REDACTION }).eq("id", userId);
  if (error) log.warn("account_delete.redact_failed", { err: error.message, code: error.code ?? null });

  const cleared: string[] = [];
  const skipped: string[] = [];
  for (const column of OWN_UPDATE_COLUMNS) {
    const r = await db.from("profiles").update({ [column]: null }).eq("id", userId);
    if (r.error) {
      log.warn("account_delete.redact_column_skipped", { column, err: r.error.message, code: r.error.code ?? null });
      skipped.push(column);
    } else {
      cleared.push(column);
    }
  }
  return { main: !error, cleared, skipped };
}
