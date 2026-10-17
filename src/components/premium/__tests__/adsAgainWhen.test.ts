import { describe, expect, it } from 'vitest';
import { adsAgainWhen } from '../WatchAdSheet';

// The daily ad ceiling resets at UTC midnight; the sheet names that moment
// on the reader's clock instead of always saying "tomorrow" (p8 F56).
const t = (key: string, options?: Record<string, unknown>) =>
  `${key}${options?.time ? `|${String(options.time)}` : ''}`;

describe('adsAgainWhen', () => {
  it('names a time later today when UTC midnight is still ahead on the reader’s day', () => {
    // 08:30 in Tokyo = 23:30 UTC the day before: ads earn again at 09:00 Tokyo, the same morning.
    const r = adsAgainWhen(t, new Date('2026-10-16T23:30:00Z'), 'Asia/Tokyo');
    expect(r.startsWith('premium.watchAd.when.at|')).toBe(true);
    expect(r).toMatch(/9:00/);
  });

  it('says tomorrow at a time when UTC midnight falls on the reader’s next day', () => {
    // 10:00 in Tokyo = 01:00 UTC: the next reset is 09:00 Tokyo tomorrow.
    const r = adsAgainWhen(t, new Date('2026-10-17T01:00:00Z'), 'Asia/Tokyo');
    expect(r.startsWith('premium.watchAd.when.tomorrowAt|')).toBe(true);
  });

  it('says just tomorrow where UTC midnight is the reader’s own midnight', () => {
    expect(adsAgainWhen(t, new Date('2026-10-17T15:00:00Z'), 'UTC')).toBe('premium.watchAd.when.tomorrow');
  });
});
