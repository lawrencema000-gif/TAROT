// @vitest-environment node
// (node: the server module below imports an npm: specifier, which only the node transform lets vi.mock answer)
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../lib/supabase', () => ({ supabase: { functions: { invoke: vi.fn() } } }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ profile: null, updateProfile: vi.fn() }) }));
// The server's own chart math (_shared/natal.ts, Deno) imports npm:astronomy-engine@2.1.19 —
// the package the client ships, same version.
vi.mock('npm:astronomy-engine@2.1.19', async () => await import('astronomy-engine'));

import {
  backfillKey,
  birthZoneOf,
  castParamsFor,
  chartAnswers,
  expectedCast,
  fallbackZone,
  needsBirthTzBackfill,
  needsTimezoneRepair,
  runBirthTzBackfill,
  syncChartWithProfile,
  type BackfillDeps,
  type CastParams,
  type ProfilePatch,
  type StoredChart,
} from './birthZone';
import { deriveBirthTz } from '../../utils/birthTz';

/**
 * The server's own chart math (supabase/functions/_shared/natal.ts, which
 * astrology-person-chart runs; astrology-compute-natal carries the same
 * code inline). Loaded at run time: the app's tsc must not follow its
 * npm: import.
 */
interface ServerNatal {
  computeNatalChart: (input: { birthDate: string; birthTime?: string | null; lat?: number; lon?: number; timezone?: string }) => {
    planets: Array<{ planet: string; longitude: number }>;
    ascendant: number | null;
  };
  lonToSign: (lon: number) => { sign: string; degree: number };
}
const SERVER_NATAL = '../../../supabase/functions/_shared/natal';
const { computeNatalChart, lonToSign } = (await import(/* @vite-ignore */ SERVER_NATAL)) as ServerNatal;

/*
 * p8 F21: a birth time is read in the birth place's zone. The reproduction
 * was a Google sign-up born 1991-03-08 06:45 in Osaka: profiles.timezone was
 * the signup default 'UTC', the onboarding cast sent timezone 'UTC', and the
 * chart came back Leo rising with the Sun in house 7 (Pisces rising, house
 * 12, in Asia/Tokyo).
 */

const OSAKA = { birthDate: '1991-03-08', birthTime: '06:45:00', birthLat: 34.6937, birthLon: 135.5023, timezone: 'UTC' };
const TOKYO_0645 = castParamsFor(OSAKA, 'Asia/Tokyo');
const UTC_0645 = castParamsFor(OSAKA, 'UTC');

/** The chart as astrology-compute-natal stores it: the server's math, no houses without a birth time. */
function serverChart(p: CastParams): StoredChart {
  const c = computeNatalChart({ birthDate: p.birthDate, birthTime: p.birthTime, lat: p.lat, lon: p.lon, timezone: p.timezone });
  return { planets: c.planets, ascendant: p.chartMode === 'unknown' || !p.birthTime ? null : c.ascendant };
}

function deps(over: Partial<BackfillDeps> & { chart?: StoredChart | null } = {}) {
  const calls: string[] = [];
  const persisted: ProfilePatch[] = [];
  const recastWith: CastParams[] = [];
  const { chart = serverChart(UTC_0645), ...rest } = over;
  const d: BackfillDeps = {
    derive: async (lat, lon) => { calls.push('derive'); return deriveBirthTz(lat, lon); },
    loadChart: async () => { calls.push('load'); return chart; },
    recast: async (p) => { calls.push('recast'); recastWith.push(p); return true; },
    persist: async (patch) => { calls.push('persist'); persisted.push(patch); return true; },
    device: 'America/Los_Angeles',
    ...rest,
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
    expect(TOKYO_0645).toEqual({
      birthDate: '1991-03-08', birthTime: '06:45:00', lat: 34.6937, lon: 135.5023, timezone: 'Asia/Tokyo', chartMode: 'exact',
    });
    expect(castParamsFor({ ...OSAKA, birthTime: undefined }, 'Asia/Tokyo')).toMatchObject({ birthTime: null, chartMode: 'unknown' });
  });
});

/*
 * p9 R29 / R30: the stored chart is checked against the profile by repeating
 * astrology-compute-natal's computation here. It must be that computation.
 */
describe('the client repeats the server’s cast', () => {
  const CASES: CastParams[] = [
    TOKYO_0645,
    UTC_0645,
    { ...TOKYO_0645, birthTime: '18:45' },
    { birthDate: '1985-01-15', birthTime: '23:59', lat: -37.8136, lon: 144.9631, timezone: 'Australia/Melbourne', chartMode: 'exact' },
    { birthDate: '2001-07-04', birthTime: '02:30:00', lat: 40.7128, lon: -74.006, timezone: 'America/New_York', chartMode: 'exact' },
    { birthDate: '1970-12-31', birthTime: '00:00', lat: 64.1466, lon: -21.9426, timezone: 'Atlantic/Reykjavik', chartMode: 'exact' },
  ];

  it('the Moon and the ascendant equal the server module’s (_shared/natal.ts), case by case', async () => {
    for (const p of CASES) {
      const server = computeNatalChart({ birthDate: p.birthDate, birthTime: p.birthTime, lat: p.lat, lon: p.lon, timezone: p.timezone });
      const client = await expectedCast(p);
      expect(client.moon).toBeCloseTo(server.planets.find((x) => x.planet === 'Moon')!.longitude, 9);
      expect(client.ascendant!).toBeCloseTo(server.ascendant!, 9);
    }
    // No birth time: noon in the zone, no ascendant.
    const noon = await expectedCast({ ...TOKYO_0645, birthTime: null, chartMode: 'unknown' });
    expect(noon.ascendant).toBeNull();
    expect(noon.moon).toBeCloseTo(computeNatalChart({ birthDate: '1991-03-08', birthTime: null, timezone: 'Asia/Tokyo' }).planets[1].longitude, 9);
  });

  it('…and the charts production cast for the reviewer (f21-gap, edit-birth)', async () => {
    // 06:45 in Asia/Tokyo: Pisces rising, Moon Sagittarius 11.03.
    const tokyo = await expectedCast(TOKYO_0645);
    expect(lonToSign(tokyo.ascendant!).sign).toBe('Pisces');
    expect(lonToSign(tokyo.moon)).toEqual({ sign: 'Sagittarius', degree: 11.03 });
    // The same birth read as UTC (the pre-F21 cast): Leo rising, Moon Sagittarius 15.48.
    const utc = await expectedCast(UTC_0645);
    expect(lonToSign(utc.ascendant!).sign).toBe('Leo');
    expect(lonToSign(utc.moon)).toEqual({ sign: 'Sagittarius', degree: 15.48 });
    // 18:45 in Asia/Tokyo: Virgo rising, the Moon at the longitude production returned.
    const evening = await expectedCast({ ...TOKYO_0645, birthTime: '18:45' });
    expect(lonToSign(evening.ascendant!).sign).toBe('Virgo');
    expect(evening.moon).toBeCloseTo(256.9634099638914, 9);
  });
});

describe('a stored chart answers the profile it was cast for, and no other', () => {
  it('the chart cast for the profile answers it', async () => {
    expect(await chartAnswers(serverChart(TOKYO_0645), TOKYO_0645)).toBe(true);
    const noTime = castParamsFor({ ...OSAKA, birthTime: undefined }, 'Asia/Tokyo');
    expect(await chartAnswers(serverChart(noTime), noTime)).toBe(true);
  });

  it('not a chart read in another zone, at another time, on another date or at another place', async () => {
    const tokyoChart = serverChart(TOKYO_0645);
    expect(await chartAnswers(serverChart(UTC_0645), TOKYO_0645)).toBe(false);
    expect(await chartAnswers(tokyoChart, { ...TOKYO_0645, birthTime: '18:45' })).toBe(false);
    expect(await chartAnswers(tokyoChart, { ...TOKYO_0645, birthTime: '06:50:00' })).toBe(false);
    expect(await chartAnswers(tokyoChart, { ...TOKYO_0645, birthDate: '1991-03-09' })).toBe(false);
    expect(await chartAnswers(tokyoChart, { ...TOKYO_0645, lat: 35.6895, lon: 139.6917 })).toBe(false);
  });

  it('a birth time added or removed changes the chart; without one, the place within the zone does not', async () => {
    const noTime = castParamsFor({ ...OSAKA, birthTime: undefined }, 'Asia/Tokyo');
    expect(await chartAnswers(serverChart(noTime), TOKYO_0645)).toBe(false);
    expect(await chartAnswers(serverChart(TOKYO_0645), noTime)).toBe(false);
    // No houses: the planets of noon in Asia/Tokyo are the same in Osaka and Tokyo.
    expect(await chartAnswers(serverChart(noTime), { ...noTime, lat: 35.6895, lon: 139.6917 })).toBe(true);
  });

  it('a chart without a Moon longitude cannot be checked, and answers nothing', async () => {
    expect(await chartAnswers({ planets: [{ planet: 'Moon' }], ascendant: 340 }, TOKYO_0645)).toBe(false);
    expect(await chartAnswers({}, TOKYO_0645)).toBe(false);
  });
});

describe('the backfill every chart screen runs', () => {
  it('derives a missing zone only for a birth place without one; latitude 0 is a coordinate', () => {
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

  it('pre-F21 (no zone, chart in UTC): derives, checks, recasts, then persists — both fields in one write', async () => {
    const { d, calls, persisted, recastWith } = deps();
    const res = await runBirthTzBackfill(OSAKA, d);
    expect(calls).toEqual(['derive', 'load', 'recast', 'persist']);
    expect(recastWith[0]).toEqual(TOKYO_0645);
    expect(persisted).toEqual([{ birthTz: 'Asia/Tokyo', timezone: 'America/Los_Angeles' }]);
    expect(res).toMatchObject({ recast: true, saved: { birthTz: 'Asia/Tokyo', timezone: 'America/Los_Angeles' } });
  });

  it('p9 R29: a zone saved without a recast (Edit profile, v1.2.0) no longer hides the UTC chart', async () => {
    // f21-gap.mjs: a display-name change saved birth_tz Asia/Tokyo; /horoscope sent 0 casts and the chart stayed Leo rising.
    const { d, calls, persisted, recastWith } = deps();
    const res = await runBirthTzBackfill({ ...OSAKA, birthTz: 'Asia/Tokyo' }, d);
    expect(calls).toEqual(['load', 'recast', 'persist']);
    expect(recastWith[0]).toEqual(TOKYO_0645);
    expect(persisted).toEqual([{ timezone: 'America/Los_Angeles' }]);
    expect(res.recast).toBe(true);
  });

  it('p9 R30: a corrected birth time is recast the next time a chart screen opens', async () => {
    // edit-birth.mjs: 06:45 → 18:45 saved; the chart stayed the 06:45 one (Pisces rising, Moon in house 9).
    const { d, recastWith } = deps({ chart: serverChart(TOKYO_0645), device: 'Asia/Tokyo' });
    const res = await runBirthTzBackfill({ ...OSAKA, birthTime: '18:45:00', birthTz: 'Asia/Tokyo', timezone: 'Asia/Tokyo' }, d);
    expect(res.recast).toBe(true);
    expect(recastWith[0]).toMatchObject({ birthTime: '18:45:00', timezone: 'Asia/Tokyo' });
  });

  it('a chart that is the profile’s is left alone', async () => {
    const { d, calls } = deps({ chart: serverChart(TOKYO_0645), device: 'Asia/Tokyo' });
    expect(await runBirthTzBackfill({ ...OSAKA, birthTz: 'Asia/Tokyo', timezone: 'Asia/Tokyo' }, d)).toEqual({ recast: false, saved: {}, retry: false });
    expect(calls).toEqual(['load']);
    // …and a missing zone is saved once the chart agrees with it.
    const pre = deps({ chart: serverChart(TOKYO_0645), device: 'Etc/UTC' });
    expect((await runBirthTzBackfill(OSAKA, pre.d)).saved).toEqual({ birthTz: 'Asia/Tokyo' });
    expect(pre.calls).toEqual(['derive', 'load', 'persist']);
  });

  it('no chart yet: nothing to recast, and a derived zone is saved for the first cast', async () => {
    const { d, calls, persisted } = deps({ chart: null, device: 'Etc/UTC' });
    expect(await runBirthTzBackfill(OSAKA, d)).toMatchObject({ recast: false, saved: { birthTz: 'Asia/Tokyo' } });
    expect(calls).toEqual(['derive', 'load', 'persist']);
    expect(persisted).toEqual([{ birthTz: 'Asia/Tokyo' }]);
  });

  it('a failed read or recast leaves the zone unsaved and asks for another try; the device zone is still repaired', async () => {
    const recastFails = deps({ recast: async () => false, device: 'Etc/UTC' });
    expect(await runBirthTzBackfill(OSAKA, recastFails.d)).toEqual({ recast: false, saved: {}, retry: true });
    expect(recastFails.persisted).toEqual([]);
    const unreadable = deps({ loadChart: async () => { throw new Error('offline'); } });
    expect(await runBirthTzBackfill(OSAKA, unreadable.d)).toEqual({ recast: false, saved: { timezone: 'America/Los_Angeles' }, retry: true });
  });

  it('a zone that cannot be derived checks nothing', async () => {
    const { d, calls } = deps({ derive: async () => null, device: 'Etc/UTC' });
    expect(await runBirthTzBackfill(OSAKA, d)).toEqual({ recast: false, saved: {}, retry: false });
    expect(calls).toEqual([]);
  });

  it('a profile with no place gets only the device zone (its birth_utc fallback)', async () => {
    const { d, calls, persisted } = deps();
    const res = await runBirthTzBackfill({ birthDate: '1991-03-08', timezone: 'UTC' }, d);
    expect(calls).toEqual(['persist']);
    expect(persisted).toEqual([{ timezone: 'America/Los_Angeles' }]);
    expect(res.recast).toBe(false);
  });

  it('runs once per account and birth data: an edit is checked again', () => {
    const base = { id: 'u1', ...OSAKA, birthTz: 'Asia/Tokyo', timezone: 'Asia/Tokyo' };
    const key = backfillKey(base, 'Asia/Tokyo');
    expect(key).not.toBeNull();
    expect(backfillKey({ ...base }, 'Asia/Tokyo')).toBe(key);
    expect(backfillKey({ ...base, birthTime: '18:45:00' }, 'Asia/Tokyo')).not.toBe(key);
    expect(backfillKey({ ...base, birthDate: '1991-03-09' }, 'Asia/Tokyo')).not.toBe(key);
    expect(backfillKey({ ...base, birthLat: 35.6895 }, 'Asia/Tokyo')).not.toBe(key);
    expect(backfillKey({ ...base, birthTz: 'Asia/Seoul' }, 'Asia/Tokyo')).not.toBe(key);
    // Nothing to check or repair: no run.
    expect(backfillKey({ id: 'u1', timezone: 'Asia/Tokyo' }, 'Asia/Tokyo')).toBeNull();
    expect(backfillKey({ ...OSAKA }, 'Asia/Tokyo')).toBeNull();
  });
});

describe('Edit profile’s check after a save (p9 R30)', () => {
  it('recasts in the saved zone when the saved birth data is not the chart’s', async () => {
    const { d, recastWith } = deps({ chart: serverChart(TOKYO_0645) });
    expect(await syncChartWithProfile({ ...OSAKA, birthTime: '18:45', birthTz: 'Asia/Tokyo' }, d)).toBe('recast');
    expect(recastWith).toEqual([{ ...TOKYO_0645, birthTime: '18:45' }]);
    expect(await syncChartWithProfile({ ...OSAKA, birthTz: 'Asia/Tokyo' }, deps({ chart: serverChart(TOKYO_0645) }).d)).toBe('current');
  });

  it('nothing to check without a birth date, a place, a zone or a chart', async () => {
    const { d, calls } = deps();
    expect(await syncChartWithProfile({ ...OSAKA, birthLat: undefined, birthLon: undefined, birthTz: 'Asia/Tokyo' }, d)).toBe('none');
    expect(await syncChartWithProfile({ ...OSAKA }, d)).toBe('none');
    expect(calls).toEqual([]);
    expect(await syncChartWithProfile({ ...OSAKA, birthTz: 'Asia/Tokyo' }, deps({ chart: null }).d)).toBe('none');
  });
});
