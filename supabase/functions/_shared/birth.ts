/**
 * Canonical birth-instant resolution for edge functions.
 *
 * The profiles table now carries `birth_utc` (timestamptz), maintained
 * by a DB trigger that interprets birth_date + birth_time in the birth
 * place's IANA zone (birth_tz → device timezone → UTC fallback chain),
 * with Postgres' tzdata handling historical DST.
 *
 * Edge functions should SELECT birth_utc alongside the legacy columns
 * and call birthMomentFromProfile(). The fallback path exists for the
 * brief window where a row predates the trigger backfill, and it also
 * fixes two latent bugs in the old inline parsing:
 *   1. `${date}T${time}:00Z` treated LOCAL birth time as UTC.
 *   2. birth_time is stored as HH:MM:SS, so appending ":00" produced
 *      "T14:30:00:00Z" → Invalid Date → solar-return/progressions threw
 *      for any user whose birth_time carried seconds.
 */

export function normalizeBirthTime(raw: string | null | undefined): string {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(raw ?? "");
  if (!m) return "12:00:00";
  return `${m[1].padStart(2, "0")}:${m[2]}:${m[3] ?? "00"}`;
}

/**
 * Convert a local wall-clock birth date/time in an IANA timezone to the
 * UTC instant, via the Intl offset-probe technique (same algorithm as
 * astrology-compute-natal's localToUTC — correct for historical DST
 * because Intl uses the runtime's full tzdata).
 */
export function localToUTC(
  birthDate: string,
  birthTime: string | null,
  timezone: string,
): Date {
  const timeStr = normalizeBirthTime(birthTime);
  const tempUtc = new Date(`${birthDate}T${timeStr}Z`);

  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false,
    }).formatToParts(tempUtc);

    const p: Record<string, string> = {};
    for (const part of parts) p[part.type] = part.value;
    const hour = p.hour === "24" ? "00" : p.hour;
    const localStr = `${p.year}-${p.month}-${p.day}T${hour}:${p.minute}:${p.second}Z`;
    const localAsUtc = new Date(localStr);
    const offsetMs = localAsUtc.getTime() - tempUtc.getTime();
    return new Date(tempUtc.getTime() - offsetMs);
  } catch {
    return tempUtc;
  }
}

export interface BirthProfileRow {
  birth_utc?: string | null;
  birth_date?: string | null;
  birth_time?: string | null;
  birth_tz?: string | null;
  timezone?: string | null;
}

/**
 * Resolve the user's birth instant. Prefers the trigger-maintained
 * birth_utc; falls back to an Intl conversion of the raw columns using
 * the same tz fallback chain as the trigger. Returns null when there is
 * no birth date at all.
 */
export function birthMomentFromProfile(profile: BirthProfileRow): Date | null {
  if (profile.birth_utc) {
    const d = new Date(profile.birth_utc);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (!profile.birth_date) return null;
  const tz = profile.birth_tz || profile.timezone || "UTC";
  const d = localToUTC(profile.birth_date, profile.birth_time ?? null, tz);
  return Number.isNaN(d.getTime()) ? null : d;
}
