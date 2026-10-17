/**
 * What a completed ritual reports to the badges, from the device's clock.
 *
 * Only the device knows its local hour and weekday, so the three ritual
 * badges are reported from here: Early Riser ("before 9 AM"), Night Owl
 * ("after 9 PM") and Weekend Warrior. The thresholds are the badges' own
 * words in every locale (HomePage used 7 and 22, so a ritual at 8:30 never
 * counted towards "before 9 AM").
 *
 * The server (20261003000018) matches each report to the ritual's own
 * ritual_complete record, so a report is sent for every completed ritual —
 * also when the XP award came back capped or failed (p8 F05): dropping it
 * there cost the badge a ritual the server had recorded.
 */
export type RitualTimeReport = 'morning_ritual' | 'evening_ritual' | 'weekend_ritual';

/** Early Riser counts rituals completed before this local hour. */
export const MORNING_BEFORE_HOUR = 9;
/** Night Owl counts rituals completed at or after this local hour. */
export const EVENING_FROM_HOUR = 21;

/** The badge reports a ritual completed at `at` (local time) makes. */
export function ritualTimeReports(at: Date): RitualTimeReport[] {
  const reports: RitualTimeReport[] = [];
  const hour = at.getHours();
  if (hour < MORNING_BEFORE_HOUR) reports.push('morning_ritual');
  if (hour >= EVENING_FROM_HOUR) reports.push('evening_ritual');
  const day = at.getDay();
  if (day === 0 || day === 6) reports.push('weekend_ritual');
  return reports;
}
