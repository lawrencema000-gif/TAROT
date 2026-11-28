import { describe, it, expect, vi } from 'vitest';

/*
 * WP-P2-14: if the ephemeris fails, solarYearAt falls back to the nominal
 * 立春, 4 February 00:00 China Standard Time (3 February 16:00 UTC), and
 * never to 1 January. Its own file, because the term table is a
 * module-level cache that the other golden tests fill with real instants.
 */
vi.mock('astronomy-engine', async (importOriginal) => {
  const real = await importOriginal<typeof import('astronomy-engine')>();
  return {
    ...real,
    SearchSunLongitude: () => {
      throw new Error('ephemeris unavailable (test)');
    },
  };
});

import { lichunInstant, solarYearAt } from '../../utils/solarTerms';

describe('solarYearAt — nominal 立春 when the ephemeris fails', () => {
  it('has no 立春 instant to offer', () => {
    expect(lichunInstant(2027)).toBeNull();
  });

  it('turns at 4 February 00:00 CST', () => {
    expect(solarYearAt(new Date('2027-02-03T15:59:00Z'))).toBe(2026);
    expect(solarYearAt(new Date('2027-02-03T16:00:00Z'))).toBe(2027);
  });

  it('never switches on 1 January', () => {
    expect(solarYearAt(new Date('2027-01-01T00:00:00Z'))).toBe(2026);
  });
});
