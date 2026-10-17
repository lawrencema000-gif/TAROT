import { describe, it, expect, afterEach } from 'vitest';
import { calendarDay } from './readingDates';

/*
 * p8 F14 / F47 / F73: a saved reading's `date` is a calendar day. Read with
 * `new Date('2026-10-06')` it is UTC midnight — the evening of Oct 5 in New
 * York, so the Library listed it a day early.
 */
const TZ = process.env.TZ;
afterEach(() => {
  process.env.TZ = TZ;
});

const shortDay = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

describe('calendarDay', () => {
  it.each(['America/Los_Angeles', 'America/New_York', 'UTC', 'Asia/Tokyo', 'Pacific/Kiritimati'])(
    'a date-only value is that day in %s',
    (zone) => {
      process.env.TZ = zone;
      expect(shortDay(calendarDay('2026-10-06'))).toBe('Oct 6');
      expect(shortDay(calendarDay('2026-01-01'))).toBe('Jan 1');
    },
  );

  it('where new Date() was a day early', () => {
    process.env.TZ = 'America/New_York';
    expect(shortDay(new Date('2026-10-06'))).toBe('Oct 5');
    expect(shortDay(calendarDay('2026-10-06'))).toBe('Oct 6');
  });

  it('a timestamp is the instant it names, in the reader’s zone', () => {
    const iso = '2026-10-06T17:03:00.000Z'; // 02:03 on Oct 7 in Tokyo
    expect(calendarDay(iso).getTime()).toBe(Date.parse(iso));
    process.env.TZ = 'Asia/Tokyo';
    expect(shortDay(calendarDay(iso))).toBe('Oct 7');
    process.env.TZ = 'America/New_York';
    expect(shortDay(calendarDay(iso))).toBe('Oct 6');
  });
});
