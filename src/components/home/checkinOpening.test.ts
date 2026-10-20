import { describe, it, expect, vi } from 'vitest';

vi.mock('../../lib/supabase', () => ({ supabase: {} }));
vi.mock('../../utils/telemetry', () => ({ captureException: () => {} }));

import { checkinDay, nextCheckinOpensAt } from '../../dal/moonstones';
import { checkinOpening, nextClaimLabel } from './checkinOpening';

/**
 * The daily check-in belongs to the UTC day (the server's CURRENT_DATE), so
 * it reopens at UTC midnight — the same morning in Tokyo, the same afternoon
 * in Los Angeles. The widget used to say "Come back tomorrow" either way
 * (p8 F56); it now names the reader's own time, and "tomorrow" only when it
 * is the reader's tomorrow.
 */

const t = (key: string, opts?: Record<string, unknown>) =>
  `${key}${opts && 'time' in opts ? `(${String(opts.time)})` : ''}`;

describe('the check-in day and when the next one opens', () => {
  it('is the UTC date, and the next opening is the next UTC midnight', () => {
    expect(checkinDay(new Date('2026-10-16T23:30:00Z'))).toBe('2026-10-16');
    expect(checkinDay(new Date('2026-10-17T00:00:00Z'))).toBe('2026-10-17');
    expect(nextCheckinOpensAt(new Date('2026-10-16T23:30:00Z')).toISOString()).toBe('2026-10-17T00:00:00.000Z');
    // A claim at the stroke of midnight belongs to the new day: the next is a day on.
    expect(nextCheckinOpensAt(new Date('2026-10-17T00:00:00Z')).toISOString()).toBe('2026-10-18T00:00:00.000Z');
    // Month and year ends.
    expect(nextCheckinOpensAt(new Date('2026-10-31T12:00:00Z')).toISOString()).toBe('2026-11-01T00:00:00.000Z');
    expect(nextCheckinOpensAt(new Date('2026-12-31T23:59:59Z')).toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });
});

describe('the widget names the opening on the reader’s clock', () => {
  it('Tokyo, claimed at 08:30: it reopens at 9:00 the same morning (the case the finding saw)', () => {
    const o = checkinOpening(new Date('2026-10-16T23:30:00Z'), 'ja', 'Asia/Tokyo'); // 08:30 JST, 17 Oct
    expect(o.day).toBe('today');
    expect(o.time).toBe('9:00');
    expect(o.atMidnight).toBe(false);
    expect(nextClaimLabel(t, new Date('2026-10-16T23:30:00Z'), 'ja', 'Asia/Tokyo')).toBe('moonstones.nextClaimAt(9:00)');
  });

  it('Tokyo, claimed at 10:05: tomorrow at 9:00', () => {
    const now = new Date('2026-10-17T01:05:00Z'); // 10:05 JST
    expect(checkinOpening(now, 'ja', 'Asia/Tokyo').day).toBe('tomorrow');
    expect(nextClaimLabel(t, now, 'ja', 'Asia/Tokyo')).toBe('moonstones.nextClaimTomorrowAt(9:00)');
  });

  it('Los Angeles: a morning claim reopens at 5:00 PM the same day; an evening one tomorrow', () => {
    const morning = new Date('2026-10-17T15:00:00Z'); // 08:00 PDT
    expect(nextClaimLabel(t, morning, 'en', 'America/Los_Angeles')).toBe('moonstones.nextClaimAt(5:00 PM)');
    const evening = new Date('2026-10-18T00:30:00Z'); // 17:30 PDT, 17 Oct
    expect(nextClaimLabel(t, evening, 'en', 'America/Los_Angeles')).toBe('moonstones.nextClaimTomorrowAt(5:00 PM)');
  });

  it('formats the time as each language writes it', () => {
    const now = new Date('2026-10-17T01:05:00Z');
    expect(checkinOpening(now, 'ko', 'Asia/Seoul').time).toBe('오전 9:00');
    expect(checkinOpening(now, 'zh', 'Asia/Shanghai').time).toBe('8:00');
    expect(checkinOpening(now, 'en', 'Asia/Kolkata').time).toBe('5:30 AM');
  });

  it('where UTC midnight is the reader’s own midnight, "Come back tomorrow" says it all', () => {
    const now = new Date('2026-10-17T10:00:00Z');
    expect(checkinOpening(now, 'en', 'Africa/Abidjan').atMidnight).toBe(true);
    expect(nextClaimLabel(t, now, 'en', 'Africa/Abidjan')).toBe('moonstones.alreadyClaimed');
  });
});
