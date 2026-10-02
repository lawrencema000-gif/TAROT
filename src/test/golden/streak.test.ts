import { describe, it, expect } from 'vitest';
import { streakFromNights, nightsFromRituals } from '../../utils/ritualNights';
import { localDaysAgo, localDateStr } from '../../utils/localDate';

/**
 * One definition of the streak.
 *
 * Until Phase 6 the number on the Home pill was bumped on app open (UTC
 * date, +1 if yesterday else 1), the constellation beside it drew the real
 * ritual rows (written on the UTC date), and the card seed, prompt and
 * mission used the local date. Three calendars, two counters, one screen.
 *
 * The definition now lives in SQL — public.ritual_streak(p_today), migration
 * 20260928000000 — and here as streakFromNights(): the number of consecutive
 * LOCAL calendar days, ending today or yesterday, on which the ritual was
 * completed. These cases pin the TS side; the SQL is the same gaps-and-islands
 * count over the same rows, and the integrator's smoke test checks it returns
 * and writes against the linked project.
 */

type Row = { date: string; completed: boolean };
const done = (...dates: string[]): Row[] => dates.map((date) => ({ date, completed: true }));
const partial = (...dates: string[]): Row[] => dates.map((date) => ({ date, completed: false }));

describe('streakFromNights — the streak is the rituals', () => {
  it('is 0 with no rows, and there is no last completed night', () => {
    expect(streakFromNights([], '2026-10-02')).toEqual({ streak: 0, lastCompleted: null });
  });

  it('counts a run that ends today', () => {
    expect(streakFromNights(done('2026-09-30', '2026-10-01', '2026-10-02'), '2026-10-02')).toEqual({
      streak: 3,
      lastCompleted: '2026-10-02',
    });
  });

  it('counts a run that ends yesterday — tonight is not yet a gap', () => {
    expect(streakFromNights(done('2026-09-30', '2026-10-01'), '2026-10-02')).toEqual({
      streak: 2,
      lastCompleted: '2026-10-01',
    });
  });

  it('is 1 on the first night, done today', () => {
    expect(streakFromNights(done('2026-10-02'), '2026-10-02')).toEqual({ streak: 1, lastCompleted: '2026-10-02' });
  });

  it('is broken (0) when the last completed night is before yesterday, but still reports that night', () => {
    expect(streakFromNights(done('2026-09-28', '2026-09-29', '2026-09-30'), '2026-10-02')).toEqual({
      streak: 0,
      lastCompleted: '2026-09-30',
    });
  });

  it('a gap ends the count: only the run that reaches today counts', () => {
    expect(streakFromNights(done('2026-09-25', '2026-09-26', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'), '2026-10-02')).toEqual({
      streak: 5,
      lastCompleted: '2026-10-02',
    });
  });

  it('a partial night does not count, and breaks the run like a missed one', () => {
    const rows = [...done('2026-09-29', '2026-09-30'), ...partial('2026-10-01'), ...done('2026-10-02')];
    expect(streakFromNights(rows, '2026-10-02')).toEqual({ streak: 1, lastCompleted: '2026-10-02' });
    // A partial night today on top of a run to yesterday leaves yesterday's run standing.
    expect(streakFromNights([...done('2026-09-30', '2026-10-01'), ...partial('2026-10-02')], '2026-10-02')).toEqual({
      streak: 2,
      lastCompleted: '2026-10-01',
    });
    // Only partials: nothing.
    expect(streakFromNights(partial('2026-10-01', '2026-10-02'), '2026-10-02')).toEqual({ streak: 0, lastCompleted: null });
  });

  it('ignores rows dated after today (a clock set forward, a row from another device)', () => {
    expect(streakFromNights(done('2026-10-01', '2026-10-02', '2026-10-03'), '2026-10-02')).toEqual({
      streak: 2,
      lastCompleted: '2026-10-02',
    });
  });

  it('does not care about row order', () => {
    expect(streakFromNights(done('2026-10-02', '2026-09-30', '2026-10-01'), '2026-10-02').streak).toBe(3);
  });

  it('crosses a month boundary', () => {
    expect(streakFromNights(done('2026-09-29', '2026-09-30', '2026-10-01'), '2026-10-01').streak).toBe(3);
    expect(streakFromNights(done('2026-02-27', '2026-02-28', '2026-03-01'), '2026-03-01').streak).toBe(3);
    // 2028 is a leap year: Feb 29 is a night, not a gap.
    expect(streakFromNights(done('2028-02-28', '2028-02-29', '2028-03-01'), '2028-03-01').streak).toBe(3);
    // 2026 is not: a row for Feb 29 does not exist, and Feb 28 → Mar 1 is consecutive.
    expect(streakFromNights(done('2026-02-28', '2026-03-01'), '2026-03-02').streak).toBe(2);
  });

  it('crosses a year boundary', () => {
    expect(streakFromNights(done('2026-12-30', '2026-12-31', '2027-01-01'), '2027-01-01').streak).toBe(3);
    expect(streakFromNights(done('2026-12-31'), '2027-01-01')).toEqual({ streak: 1, lastCompleted: '2026-12-31' });
  });

  it('crosses DST changes without gaining or losing a day', () => {
    // US spring forward (2026-03-08) and fall back (2026-11-01); EU 2026-03-29 and 2026-10-25.
    expect(streakFromNights(done('2026-03-07', '2026-03-08', '2026-03-09'), '2026-03-09').streak).toBe(3);
    expect(streakFromNights(done('2026-10-31', '2026-11-01', '2026-11-02'), '2026-11-02').streak).toBe(3);
    expect(streakFromNights(done('2026-03-28', '2026-03-29', '2026-03-30'), '2026-03-30').streak).toBe(3);
    expect(streakFromNights(done('2026-10-24', '2026-10-25', '2026-10-26'), '2026-10-26').streak).toBe(3);
    // Yesterday across a DST day is still yesterday.
    expect(streakFromNights(done('2026-03-08'), '2026-03-09').streak).toBe(1);
    expect(streakFromNights(done('2026-10-25'), '2026-10-26').streak).toBe(1);
  });

  it('counts a year-long run exactly', () => {
    // 365 consecutive dates ending 2027-10-02, stepped by the constellation helper.
    const nights = nightsFromRituals([], '2027-10-02', 365).map((n) => ({ date: n.date, completed: true }));
    expect(nights[0].date).toBe('2026-10-03');
    expect(streakFromNights(nights, '2027-10-02')).toEqual({ streak: 365, lastCompleted: '2027-10-02' });
    // One missed night in the middle leaves only the run that reaches today.
    const broken = nights.filter((n) => n.date !== '2027-09-01');
    expect(streakFromNights(broken, '2027-10-02').streak).toBe(31);
  });
});

describe('nightsFromRituals — the constellation reads the same rows', () => {
  const full = (date: string) => ({ date, horoscopeViewed: true, tarotViewed: true, promptViewed: true, completed: true });

  it('draws a fixed window ending today, oldest first, with missed nights dark', () => {
    const nights = nightsFromRituals([full('2026-10-02')], '2026-10-02', 14);
    expect(nights).toHaveLength(14);
    expect(nights[0]).toEqual({ date: '2026-09-19', parts: 0, completed: false });
    expect(nights[13]).toEqual({ date: '2026-10-02', parts: 3, completed: true });
  });

  it('lights a partial night by its parts without calling it completed', () => {
    const nights = nightsFromRituals(
      [{ date: '2026-10-01', horoscopeViewed: true, tarotViewed: true, promptViewed: false, completed: false }],
      '2026-10-02',
      2,
    );
    expect(nights[0]).toEqual({ date: '2026-10-01', parts: 2, completed: false });
    expect(streakFromNights(nights, '2026-10-02').streak).toBe(0);
  });

  it('steps the window across month and year boundaries', () => {
    expect(nightsFromRituals([], '2027-01-01', 3).map((n) => n.date)).toEqual(['2026-12-30', '2026-12-31', '2027-01-01']);
    expect(nightsFromRituals([], '2026-03-01', 2).map((n) => n.date)).toEqual(['2026-02-28', '2026-03-01']);
  });

  it('agrees with the streak: the lit, joined nights ARE the streak', () => {
    const rows = ['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'].map(full);
    const nights = nightsFromRituals(rows, '2026-10-02', 14);
    expect(nights.filter((n) => n.completed)).toHaveLength(4);
    expect(streakFromNights(nights, '2026-10-02').streak).toBe(4);
  });
});

describe('localDaysAgo — the window is counted in the user’s calendar', () => {
  it('is today for 0 and yesterday for 1', () => {
    const now = new Date(2026, 9, 2, 12, 0, 0);
    expect(localDaysAgo(0, now)).toBe('2026-10-02');
    expect(localDaysAgo(1, now)).toBe('2026-10-01');
    expect(localDaysAgo(13, now)).toBe('2026-09-19');
  });

  it('steps calendar days, not 24-hour blocks, so a DST day does not shift it', () => {
    // 00:30 the morning after the US spring-forward day. Subtracting 24h in
    // milliseconds would land on 23:30 two days back in a zone that observed
    // it; counting calendar days lands on the day before, everywhere.
    expect(localDaysAgo(1, new Date(2026, 2, 9, 0, 30))).toBe('2026-03-08');
    expect(localDaysAgo(1, new Date(2026, 10, 2, 0, 30))).toBe('2026-11-01');
    expect(localDaysAgo(1, new Date(2026, 2, 30, 0, 30))).toBe('2026-03-29');
  });

  it('crosses month and year boundaries', () => {
    expect(localDaysAgo(1, new Date(2027, 0, 1, 9))).toBe('2026-12-31');
    expect(localDaysAgo(1, new Date(2026, 2, 1, 9))).toBe('2026-02-28');
    expect(localDaysAgo(1, new Date(2028, 2, 1, 9))).toBe('2028-02-29');
  });

  it('is the same basis as localDateStr', () => {
    const now = new Date(2026, 9, 2, 23, 59, 59);
    expect(localDaysAgo(0, now)).toBe(localDateStr(now));
  });
});
