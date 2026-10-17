import { describe, it, expect } from 'vitest';
import { ritualTimeReports } from './ritualReports';

/** A local date-time (the device's clock), month 1-based. */
const at = (y: number, m: number, d: number, h: number, min = 0) => new Date(y, m - 1, d, h, min);

describe('the badge reports a completed ritual makes (p8 F05)', () => {
  it('Early Riser counts a ritual before 9 AM, as its text says ("before 9 AM")', () => {
    // 2026-10-13 is a Tuesday.
    expect(ritualTimeReports(at(2026, 10, 13, 6, 30))).toEqual(['morning_ritual']);
    expect(ritualTimeReports(at(2026, 10, 13, 8, 59))).toEqual(['morning_ritual']);
    // HEAD's threshold was 7: an 8:30 ritual never counted towards "before 9 AM".
    expect(ritualTimeReports(at(2026, 10, 13, 8, 30))).toContain('morning_ritual');
    expect(ritualTimeReports(at(2026, 10, 13, 9, 0))).toEqual([]);
  });

  it('Night Owl counts a ritual from 9 PM ("after 9 PM"); the day between counts for neither', () => {
    expect(ritualTimeReports(at(2026, 10, 14, 20, 59))).toEqual([]);
    expect(ritualTimeReports(at(2026, 10, 14, 21, 0))).toEqual(['evening_ritual']);
    expect(ritualTimeReports(at(2026, 10, 14, 23, 45))).toEqual(['evening_ritual']);
    expect(ritualTimeReports(at(2026, 10, 14, 12, 0))).toEqual([]);
  });

  it('Weekend Warrior counts Saturdays and Sundays, alongside the hour', () => {
    expect(ritualTimeReports(at(2026, 10, 17, 7, 45))).toEqual(['morning_ritual', 'weekend_ritual']); // Saturday
    expect(ritualTimeReports(at(2026, 10, 18, 22, 0))).toEqual(['evening_ritual', 'weekend_ritual']); // Sunday
    expect(ritualTimeReports(at(2026, 10, 18, 14, 0))).toEqual(['weekend_ritual']);
    expect(ritualTimeReports(at(2026, 10, 19, 14, 0))).toEqual([]); // Monday
  });
});
