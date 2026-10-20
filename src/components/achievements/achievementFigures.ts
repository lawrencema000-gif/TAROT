import type { AchievementWithProgress } from '../../services/achievements';

/**
 * The figures the Achievements page prints, from the same records as its
 * badges (p8 F64).
 */

type ReadingBadge = Pick<AchievementWithProgress, 'unlock_condition' | 'unlocked_at' | 'progress' | 'target'>;

export interface ReadingsFigure {
  count: number;
  /** Every reading badge is unlocked, so `count` is a floor: print "500+". */
  atLeast: boolean;
}

/**
 * How many readings the member has completed, counted the way the reading
 * badges count them: the server's reading_complete ledger, which a tarot
 * reading and a playing-card reading both write (TarotSection,
 * CartomancySection). profiles.total_readings is something else: the rows
 * in tarot_readings, which only a SAVED tarot reading inserts. So after two
 * tarot and two playing-card readings, two of them saved, the stat read
 * "Readings 2" above "Apprentice Reader 4/10".
 *
 * The server re-derives a locked badge's progress as the ledger count capped
 * at the badge's target (check_achievement_progress, 20261003000018), so the
 * largest locked progress IS the count. An unlocked badge keeps the target it
 * was unlocked at, a floor. With every reading badge unlocked, the count is
 * at least the largest target. Null when no reading badge is loaded.
 */
export function readingsDone(badges: readonly ReadingBadge[]): ReadingsFigure | null {
  const reading = badges.filter((a) => a.unlock_condition?.activity_type === 'reading_complete');
  if (reading.length === 0) return null;
  const floor = Math.max(0, ...reading.filter((a) => a.unlocked_at).map((a) => a.target));
  const locked = reading.filter((a) => !a.unlocked_at);
  if (locked.length === 0) return { count: floor, atLeast: true };
  return { count: Math.max(floor, ...locked.map((a) => a.progress)), atLeast: false };
}

/**
 * An unlock date, written one way across the page: "Oct 7" / 「10月7日」 /
 * "10월 7일" this year, with the year added for an earlier one. The cards
 * used toLocaleDateString ("10/7/2026") while Recent unlocks printed
 * "Oct 7" (p8 F64).
 */
export function formatUnlockDate(iso: string, locale: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const options: Intl.DateTimeFormatOptions = d.getFullYear() === now.getFullYear()
    ? { month: 'short', day: 'numeric' }
    : { year: 'numeric', month: 'short', day: 'numeric' };
  return new Intl.DateTimeFormat(locale, options).format(d);
}
