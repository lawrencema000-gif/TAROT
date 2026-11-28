import { describe, it, expect } from 'vitest';
import { getMoonPhase, PHASE_ORDER, type MoonPhaseKey } from '../../data/moonPhases';

/*
 * WP-P2-10 (home-astro-10). "Tonight's moon" computed the phase from a mean
 * cycle (a new moon anchored at 2000-01-06 18:14 UTC and eight equal
 * 3.69-day buckets). At 2026-11-14 15:04 UTC it said "day 4.7" and "Next:
 * First quarter in 0.8 days"; the real age was 5.33 days and the First
 * Quarter was 2.86 days away. It now reads the real Moon from
 * astronomy-engine.
 *
 * Reference: USNO "Phases of the Moon" 2026 (aa.usno.navy.mil API 4.0.1):
 *   Last Quarter  2026-11-01 20:28 UT
 *   New Moon      2026-11-09 07:02
 *   First Quarter 2026-11-17 11:48
 *   Full Moon     2026-11-24 14:53
 *   Last Quarter  2026-12-01 06:08
 *   New Moon      2026-12-09 00:52
 *   First Quarter 2026-12-17 05:42
 * Expected values: the rule in moonPhases.ts applied to the USNO instants;
 * illumination from Meeus ch. 48 (independent of astronomy-engine).
 */

type Row = [at: string, tz: string, key: MoonPhaseKey, next: MoonPhaseKey, inDays: number, ageDays: number, illum: number, waxing: boolean];

const ROWS: Row[] = [
  ['2026-11-14T15:04:03Z', 'UTC', 'waxing-crescent', 'first-quarter', 2.9, 5.3, 0.24, true],
  ['2026-11-17T03:00:00Z', 'Asia/Tokyo', 'first-quarter', 'full', 7.5, 7.8, 0.47, true],
  ['2026-11-17T03:00:00Z', 'America/New_York', 'waxing-crescent', 'first-quarter', 0.4, 7.8, 0.47, true],
  ['2026-11-17T12:00:00Z', 'UTC', 'first-quarter', 'full', 7.1, 8.2, 0.5, true],
  ['2026-11-23T23:00:00Z', 'Asia/Tokyo', 'full', 'last-quarter', 7.3, 14.7, 0.99, true],
  ['2026-11-23T23:00:00Z', 'America/Los_Angeles', 'waxing-gibbous', 'full', 0.7, 14.7, 0.99, true],
  ['2026-11-24T14:52:00Z', 'UTC', 'full', 'last-quarter', 6.6, 15.3, 1.0, true],
  ['2026-11-24T23:59:00Z', 'UTC', 'full', 'last-quarter', 6.3, 15.7, 1.0, false],
  ['2026-11-25T00:01:00Z', 'UTC', 'waning-gibbous', 'last-quarter', 6.3, 15.7, 1.0, false],
  ['2026-12-01T12:00:00Z', 'Europe/London', 'last-quarter', 'new', 7.5, 22.2, 0.47, false],
  ['2026-12-05T12:00:00Z', 'UTC', 'waning-crescent', 'new', 3.5, 26.2, 0.12, false],
  ['2026-12-09T03:00:00Z', 'UTC', 'new', 'first-quarter', 8.1, 0.1, 0.0, true],
];

const PRINCIPAL = new Set<MoonPhaseKey>(['new', 'first-quarter', 'full', 'last-quarter']);
const ORDER = PHASE_ORDER;

describe('getMoonPhase against the USNO 2026 table', () => {
  it.each(ROWS)('%s in %s → %s, next %s in %s days, day %s', (at, tz, key, next, inDays, ageDays, illum, waxing) => {
    const p = getMoonPhase(new Date(at), tz);
    expect(p).not.toBeNull();
    expect(p!.key).toBe(key);
    expect(p!.nextPhase.key).toBe(next);
    expect(p!.nextPhase.inDays).toBe(inDays);
    expect(p!.ageDays).toBe(ageDays);
    expect(Math.abs(p!.illumination - illum)).toBeLessThanOrEqual(0.01);
    expect(p!.waxing).toBe(waxing);
  });

  it('the audit instant: day 5.3 and First quarter in 2.9 days (was 4.7 and 0.8)', () => {
    const p = getMoonPhase(new Date('2026-11-14T15:04:03Z'), 'UTC')!;
    expect(p.ageDays).toBe(5.3);
    expect(p.nextPhase).toMatchObject({ key: 'first-quarter', inDays: 2.9 });
    // "Next" carries the real instant: USNO First Quarter 2026-11-17 11:48 UT.
    expect(Math.abs(p.nextPhase.at.getTime() - Date.parse('2026-11-17T11:48:00Z'))).toBeLessThan(5 * 60_000);
  });

  it('November 2026 hourly (UTC): principal names only on USNO days, never "next" = shown, cyclic order', () => {
    const start = Date.parse('2026-11-01T00:00:00Z');
    const end = Date.parse('2026-11-30T23:00:00Z');
    const principalDays = new Set<string>();
    const transitions: Array<[MoonPhaseKey, MoonPhaseKey]> = [];
    let prev: MoonPhaseKey | null = null;
    for (let t = start; t <= end; t += 3_600_000) {
      const d = new Date(t);
      const p = getMoonPhase(d, 'UTC');
      expect(p).not.toBeNull();
      if (PRINCIPAL.has(p!.key)) principalDays.add(d.toISOString().slice(0, 10));
      expect(p!.nextPhase.key).not.toBe(p!.key);
      if (prev !== null && prev !== p!.key) transitions.push([prev, p!.key]);
      prev = p!.key;
    }
    expect([...principalDays].sort()).toEqual(['2026-11-01', '2026-11-09', '2026-11-17', '2026-11-24']);
    for (const [a, b] of transitions) {
      expect(ORDER[(ORDER.indexOf(a) + 1) % ORDER.length]).toBe(b);
    }
    // Last quarter (11-01) → waning crescent → new (11-09) → … → full (11-24) → waning gibbous (to 11-30).
    expect(transitions.length).toBe(7);
    expect(new Set(transitions.flat())).toEqual(new Set(ORDER));
  });

  it('an invalid date gives null, not a wrong Moon', () => {
    expect(getMoonPhase(new Date(NaN))).toBeNull();
  });
});
