import { describe, it, expect, vi } from 'vitest';

vi.mock('../../lib/supabase', () => ({ supabase: { functions: { invoke: vi.fn() } } }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ profile: null, updateProfile: vi.fn() }) }));

import {
  birthZoneOf,
  castParamsFor,
  fallbackZone,
  needsBirthTzBackfill,
  needsTimezoneRepair,
  runBirthTzBackfill,
  type BackfillDeps,
  type ProfilePatch,
} from './birthZone';
import { deriveBirthTz } from '../../utils/birthTz';

/*
 * p8 F21: a birth time is read in the birth place's zone. The reproduction
 * was a Google sign-up born 1991-03-08 06:45 in Osaka: profiles.timezone was
 * the signup default 'UTC', the onboarding cast sent timezone 'UTC', and the
 * chart came back Leo rising with the Sun in house 7 (Pisces rising, house
 * 12, in Asia/Tokyo).
 */

const OSAKA = { birthDate: '1991-03-08', birthTime: '06:45:00', birthLat: 34.6937, birthLon: 135.5023, timezone: 'UTC' };

function deps(over: Partial<BackfillDeps> = {}) {
  const calls: string[] = [];
  const persisted: ProfilePatch[] = [];
  const recastWith: unknown[] = [];
  const d: BackfillDeps = {
    derive: async (lat, lon) => { calls.push('derive'); return deriveBirthTz(lat, lon); },
    recast: async (p) => { calls.push('recast'); recastWith.push(p); return true; },
    persist: async (patch) => { calls.push('persist'); persisted.push(patch); return true; },
    device: 'America/Los_Angeles',
    ...over,
  };
  return { d, calls, persisted, recastWith };
}

describe('the zone a birth time is read in', () => {
  it('derives Osaka as Asia/Tokyo from the coordinates (the real tz-lookup)', async () => {
    expect(await deriveBirthTz(OSAKA.birthLat, OSAKA.birthLon)).toBe('Asia/Tokyo');
  });

  it('prefers the stored birth-place zone, then the coordinates, then the device', async () => {
    expect(await birthZoneOf({ ...OSAKA, birthTz: 'Asia/Tokyo' }, async () => 'Europe/Paris')).toEqual({ tz: 'Asia/Tokyo', derived: null });
    expect(await birthZoneOf(OSAKA)).toEqual({ tz: 'Asia/Tokyo', derived: 'Asia/Tokyo' });
    // No place: the device's zone — never the signup default 'UTC' first.
    const device = Intl.DateTimeFormat().resolvedOptions().timeZone;
    expect(await birthZoneOf({ birthDate: '1991-03-08', timezone: 'UTC' })).toEqual({ tz: device, derived: null });
    expect(fallbackZone({ timezone: 'UTC' })).toBe(device);
  });

  it('casts with the birth time in that zone, and drops the time when there is none', () => {
    expect(castParamsFor(OSAKA, 'Asia/Tokyo')).toEqual({
      birthDate: '1991-03-08', birthTime: '06:45:00', lat: 34.6937, lon: 135.5023, timezone: 'Asia/Tokyo', chartMode: 'exact',
    });
    expect(castParamsFor({ ...OSAKA, birthTime: undefined }, 'Asia/Tokyo')).toMatchObject({ birthTime: null, chartMode: 'unknown' });
  });
});

describe('the backfill for an account set up before F21', () => {
  it('applies to coordinates without a zone; latitude 0 is a coordinate', () => {
    expect(needsBirthTzBackfill(OSAKA)).toBe(true);
    expect(needsBirthTzBackfill({ ...OSAKA, birthTz: 'Asia/Tokyo' })).toBe(false);
    expect(needsBirthTzBackfill({ ...OSAKA, birthLat: undefined, birthLon: undefined })).toBe(false);
    expect(needsBirthTzBackfill({ ...OSAKA, birthDate: '' })).toBe(false);
    expect(needsBirthTzBackfill({ ...OSAKA, birthLat: 0, birthLon: 9.45 })).toBe(true);
  });

  it('repairs only the bare signup UTC, and only from a device that knows better', () => {
    expect(needsTimezoneRepair({ timezone: 'UTC' }, 'Asia/Tokyo')).toBe(true);
    expect(needsTimezoneRepair({ timezone: '' }, 'Asia/Tokyo')).toBe(true);
    expect(needsTimezoneRepair({ timezone: 'Asia/Tokyo' }, 'America/New_York')).toBe(false);
    expect(needsTimezoneRepair({ timezone: 'UTC' }, 'Etc/UTC')).toBe(false);
    expect(needsTimezoneRepair({ timezone: 'UTC' }, null)).toBe(false);
  });

  it('derives, recasts, then persists — the zone and the device zone in one write', async () => {
    const { d, calls, persisted, recastWith } = deps();
    const res = await runBirthTzBackfill(OSAKA, d);
    expect(calls).toEqual(['derive', 'recast', 'persist']);
    expect(recastWith[0]).toMatchObject({ timezone: 'Asia/Tokyo', birthTime: '06:45:00', chartMode: 'exact' });
    expect(persisted).toEqual([{ birthTz: 'Asia/Tokyo', timezone: 'America/Los_Angeles' }]);
    expect(res).toEqual({ recast: true, saved: { birthTz: 'Asia/Tokyo', timezone: 'America/Los_Angeles' } });
  });

  it('a failed recast leaves the zone unsaved, so the next session tries again', async () => {
    const { d, persisted } = deps({ recast: async () => false, device: 'Etc/UTC' });
    expect(await runBirthTzBackfill(OSAKA, d)).toEqual({ recast: false, saved: {} });
    expect(persisted).toEqual([]);
  });

  it('a zone that cannot be derived recasts nothing', async () => {
    const { d, calls } = deps({ derive: async () => null, device: 'Etc/UTC' });
    expect(await runBirthTzBackfill(OSAKA, d)).toEqual({ recast: false, saved: {} });
    expect(calls).toEqual([]);
  });

  it('a profile with no place gets only the device zone (its birth_utc fallback)', async () => {
    const { d, calls, persisted } = deps();
    const res = await runBirthTzBackfill({ birthDate: '1991-03-08', timezone: 'UTC' }, d);
    expect(calls).toEqual(['persist']);
    expect(persisted).toEqual([{ timezone: 'America/Los_Angeles' }]);
    expect(res.recast).toBe(false);
  });

  it('does nothing for a profile that is already right', async () => {
    const { d, calls } = deps();
    expect(await runBirthTzBackfill({ ...OSAKA, birthTz: 'Asia/Tokyo', timezone: 'Asia/Tokyo' }, d)).toEqual({ recast: false, saved: {} });
    expect(calls).toEqual([]);
  });
});
