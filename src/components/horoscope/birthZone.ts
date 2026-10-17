import { useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { deriveBirthTz } from '../../utils/birthTz';
import type { UserProfile } from '../../types';

/**
 * The zone a birth time is read in (p8 F21), and the stored chart kept the
 * chart of the profile (p9 R29, R30).
 *
 * A birth time is a wall-clock reading at the birth place: born 06:45 in
 * Osaka is 06:45 Asia/Tokyo, whatever the phone says today. The profile
 * keeps that zone as `birthTz`, derived from the geocoded coordinates.
 * Until F21 the cast every onboarded user takes
 * (HoroscopeOnboarding.handleAutoCompute) read `profile.timezone || device`
 * instead, and the OAuth onboarding stored neither a `birthTz` nor a
 * `timezone`. An OAuth account's profiles.timezone is the signup default,
 * 'UTC', so a Google user had the birth time read as UTC: the wrong rising
 * sign and houses, and a Moon that can change sign. birth_utc (DB trigger:
 * birth_tz → timezone → UTC) inherited the same error, and with it the
 * Celestial Map's lines, Compare and the Chart Library.
 *
 * The stored chart (astrology_natal_charts) is what every chart screen, the
 * daily reading and the paid natal report read, as it is. F21 recast it
 * only for a profile with coordinates and no birthTz — but a missing zone
 * does not identify a wrongly cast chart. Edit profile saves the zone on any
 * save, a display-name change included, and v1.2.0 saved it whenever a place
 * was re-picked, both without a recast, so a chart cast in UTC stayed for
 * good (R29); and a corrected birth date, time or place recast nothing (R30).
 * The chart itself is now checked against the profile: this file repeats
 * astrology-compute-natal's computation of the instant, the Moon and the
 * ascendant (`expectedCast`), compares it with what the chart stores
 * (`chartAnswers`) and recasts a chart that is not the profile's
 * (`syncStoredChart`). No schema change: every chart since chart_version 2
 * stores the Moon's full longitude and the ascendant.
 *
 *  - `birthZoneOf`: the zone to cast in. The stored birthTz; else one
 *    derived from the coordinates (returned as `derived`, so the caller
 *    persists it); else `fallbackZone`.
 *  - `fallbackZone`: no birth-place zone at all. The device's zone, then
 *    the profile's, then UTC.
 *  - `syncChartWithProfile`: Edit profile, after each save.
 *  - `runBirthTzBackfill` / `useBirthTzBackfill`: every screen that shows
 *    the chart, once per account and birth data per session. With
 *    coordinates: check the chart in the birth-place zone (deriving and
 *    persisting a missing zone) and recast it when it differs. With the
 *    bare signup 'UTC' as its timezone: persist the device's zone, the
 *    birth_utc fallback for a profile with no birth place.
 */

type BirthFields = Pick<UserProfile, 'birthDate' | 'birthTime' | 'birthLat' | 'birthLon' | 'birthTz' | 'timezone'>;
type Located = BirthFields & { birthLat: number; birthLon: number };

export interface CastParams {
  birthDate: string;
  birthTime: string | null;
  lat: number;
  lon: number;
  timezone: string;
  chartMode: 'exact' | 'unknown';
}

const hasCoords = (p: Partial<BirthFields> | null | undefined): p is Located =>
  !!p && typeof p.birthLat === 'number' && typeof p.birthLon === 'number' &&
  Number.isFinite(p.birthLat) && Number.isFinite(p.birthLon);

/** Names Intl may give the zero-offset zone. A device in one of them has nothing better to offer than 'UTC'. */
const UTC_NAMES = new Set(['UTC', 'Etc/UTC', 'Etc/GMT', 'GMT', 'Etc/Universal', 'Universal', 'Etc/Zulu', 'Zulu', 'UCT', 'Etc/UCT']);

/** The device's IANA zone, or null where Intl cannot say. */
export function deviceZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/** The zone to read a birth time in when the birth place's own zone is unknown. */
export function fallbackZone(profile?: Pick<UserProfile, 'timezone'> | null): string {
  return deviceZone() || profile?.timezone || 'UTC';
}

/**
 * The zone to cast `profile`'s chart in. `derived` is set when it came from
 * the coordinates just now: the caller persists it.
 */
export async function birthZoneOf(
  profile: Partial<BirthFields>,
  derive: (lat: number, lon: number) => Promise<string | null> = deriveBirthTz,
): Promise<{ tz: string; derived: string | null }> {
  if (profile.birthTz) return { tz: profile.birthTz, derived: null };
  if (hasCoords(profile)) {
    const d = await derive(profile.birthLat, profile.birthLon);
    if (d) return { tz: d, derived: d };
  }
  return { tz: fallbackZone(profile as Pick<UserProfile, 'timezone'>), derived: null };
}

/** What astrology-compute-natal is sent for this profile, in `tz`. */
export function castParamsFor(profile: Located, tz: string): CastParams {
  const chartMode = profile.birthTime ? 'exact' : 'unknown';
  return {
    birthDate: profile.birthDate,
    birthTime: chartMode === 'unknown' ? null : (profile.birthTime || null),
    lat: profile.birthLat,
    lon: profile.birthLon,
    timezone: tz,
    chartMode,
  };
}

// ── The stored chart, checked against the profile ─────────────────────────

/**
 * The instant astrology-compute-natal reads a birth date and time as — its
 * localToUTC, step for step: the wall clock in `timezone`, noon when there
 * is no time.
 */
export function castInstant(birthDate: string, birthTime: string | null, timezone: string): Date {
  const tempUtc = new Date(`${birthDate}T${birthTime || '12:00:00'}Z`);
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    }).formatToParts(tempUtc);
    const p: Record<string, string> = {};
    for (const part of parts) p[part.type] = part.value;
    const hour = p.hour === '24' ? '00' : p.hour;
    const localAsUtc = new Date(`${p.year}-${p.month}-${p.day}T${hour}:${p.minute}:${p.second}Z`);
    const offsetMs = localAsUtc.getTime() - tempUtc.getTime();
    return new Date(tempUtc.getTime() - offsetMs);
  } catch {
    return tempUtc;
  }
}

type Astronomy = typeof import('astronomy-engine');
let astronomy: Promise<Astronomy> | null = null;
/** astronomy-engine, loaded the first time a chart is checked; a failed load is retried next time. */
function loadAstronomy(): Promise<Astronomy> {
  astronomy ??= import('astronomy-engine').catch((e) => {
    astronomy = null;
    throw e;
  });
  return astronomy;
}

const normDeg = (d: number) => ((d % 360) + 360) % 360;

/**
 * What astrology-compute-natal computes for `params`, in what the stored
 * chart keeps of it: the Moon's geocentric longitude and, with a birth
 * time, the ascendant (its formula, obliquity 23.4393°).
 */
export async function expectedCast(params: CastParams): Promise<{ moon: number; ascendant: number | null }> {
  const A = await loadAstronomy();
  const utc = castInstant(params.birthDate, params.birthTime, params.timezone);
  const moon = A.EclipticGeoMoon(utc).lon;
  if (!params.birthTime || params.chartMode === 'unknown') return { moon, ascendant: null };
  const lst = ((A.SiderealTime(utc) + params.lon / 15) % 24 + 24) % 24;
  const ramcRad = (lst * 15 * Math.PI) / 180;
  const latRad = (params.lat * Math.PI) / 180;
  const oblRad = (23.4393 * Math.PI) / 180;
  const y = Math.cos(ramcRad);
  const x = -(Math.sin(ramcRad) * Math.cos(oblRad) + Math.tan(latRad) * Math.sin(oblRad));
  return { moon, ascendant: normDeg((Math.atan2(y, x) * 180) / Math.PI) };
}

/** What a stored chart (astrology-get-chart's natalChart) says it was cast for. */
export interface StoredChart {
  planets?: Array<{ planet?: string; longitude?: number }>;
  ascendant?: number | null;
}

/**
 * 0.05°: the Moon covers it in about six minutes, the ascendant in a
 * fraction of one — far below a wrong zone, date, time or place, far above
 * the floating-point difference between two engines.
 */
const CAST_TOLERANCE_DEG = 0.05;

const arc = (a: number, b: number) => {
  const d = Math.abs(normDeg(a) - normDeg(b));
  return Math.min(d, 360 - d);
};

/**
 * Was `chart` cast for `params`? Its houses must exist exactly when there is
 * a birth time, its Moon must be where that instant puts it, and its
 * ascendant where that instant and place put it. A chart without a Moon
 * longitude cannot be checked, and answers nothing.
 */
export async function chartAnswers(chart: StoredChart, params: CastParams): Promise<boolean> {
  const moon = chart.planets?.find((p) => p.planet === 'Moon')?.longitude;
  if (typeof moon !== 'number' || !Number.isFinite(moon)) return false;
  const asc = typeof chart.ascendant === 'number' && Number.isFinite(chart.ascendant) ? chart.ascendant : null;
  const want = await expectedCast(params);
  if ((asc === null) !== (want.ascendant === null)) return false;
  if (arc(moon, want.moon) > CAST_TOLERANCE_DEG) return false;
  return asc === null || arc(asc, want.ascendant as number) <= CAST_TOLERANCE_DEG;
}

export interface ChartDeps {
  /** The stored chart; null when none is cast yet. May throw when it cannot be read. */
  loadChart: () => Promise<StoredChart | null>;
  /** Recast the stored natal chart; true when it was saved. */
  recast: (params: CastParams) => Promise<boolean>;
}

/**
 * - current: the stored chart is the profile's.
 * - recast: it was not, and has been recast.
 * - none: there is no chart to check (none cast yet, or no place or zone).
 * - failed: it could not be read, checked or recast; try again later.
 */
export type ChartSync = 'current' | 'recast' | 'none' | 'failed';

/** Recast the stored chart when it is not the chart of `profile` read in `tz`. */
export async function syncStoredChart(profile: Located, tz: string, deps: ChartDeps): Promise<ChartSync> {
  const params = castParamsFor(profile, tz);
  try {
    const chart = await deps.loadChart();
    if (!chart) return 'none';
    if (await chartAnswers(chart, params)) return 'current';
    return (await deps.recast(params)) ? 'recast' : 'failed';
  } catch {
    return 'failed';
  }
}

/**
 * The live chart: read through astrology-get-chart and recast through
 * astrology-compute-natal, both through useNatalChart's cache, so the next
 * screen to read the chart reads the one checked or cast here.
 */
export function liveChartDeps(): ChartDeps {
  const astro = () => import('../../hooks/useAstrology');
  return {
    loadChart: async () => (await (await astro()).loadNatalChart())?.natalChart ?? null,
    recast: async (params) => {
      try {
        await (await astro()).recastNatalChart(params);
        return true;
      } catch {
        return false;
      }
    },
  };
}

/**
 * After a profile save (Edit profile, p9 R30): the stored chart checked
 * against what was saved, in its birth-place zone, and recast when it is
 * not that chart — a corrected birth date, time or place, or a zone saved
 * over a chart cast in another (R29). 'none' without a birth date, place or
 * zone to cast from.
 */
export async function syncChartWithProfile(profile: Partial<BirthFields>, deps: ChartDeps = liveChartDeps()): Promise<ChartSync> {
  if (!profile.birthDate || !hasCoords(profile) || !profile.birthTz) return 'none';
  return syncStoredChart(profile, profile.birthTz, deps);
}

// ── The backfill every chart screen runs ──────────────────────────────────

/** A birth place with no zone saved: derive it and save it. */
export function needsBirthTzBackfill(profile: Partial<BirthFields> | null | undefined): boolean {
  return !!profile?.birthDate && hasCoords(profile) && !profile.birthTz;
}

/** Still on the signup default: 'UTC' (or nothing) on a device that knows a real zone. */
export function needsTimezoneRepair(profile: Partial<BirthFields> | null | undefined, device: string | null): boolean {
  if (!profile || !device || UTC_NAMES.has(device)) return false;
  return !profile.timezone || profile.timezone === 'UTC';
}

export interface BackfillDeps extends ChartDeps {
  derive: (lat: number, lon: number) => Promise<string | null>;
  /** Save these profile fields; true when they were saved. */
  persist: (patch: ProfilePatch) => Promise<boolean>;
  /** The device's zone (deviceZone()). */
  device: string | null;
}

export type ProfilePatch = { birthTz?: string; timezone?: string };

export interface BackfillResult {
  /** The stored chart was recast in the birth place's zone. */
  recast: boolean;
  /** What was saved on the profile; empty when nothing was, or the save failed. */
  saved: ProfilePatch;
  /** The chart could not be read, checked or recast: the next screen tries again. */
  retry?: boolean;
}

/**
 * Check (and recast), then persist. A zone derived here is saved once the
 * chart agrees with it, or when there is no chart yet; a check that failed
 * leaves it unsaved, and the next try derives it again. Both fields go in
 * one write, so two saves never race to replace the profile.
 */
export async function runBirthTzBackfill(profile: Partial<BirthFields> | null | undefined, deps: BackfillDeps): Promise<BackfillResult> {
  const patch: ProfilePatch = {};
  let recast = false;
  let retry = false;
  if (profile?.birthDate && hasCoords(profile)) {
    const derived = needsBirthTzBackfill(profile) ? await deps.derive(profile.birthLat, profile.birthLon) : null;
    const tz = profile.birthTz || derived;
    if (tz) {
      const sync = await syncStoredChart(profile, tz, deps);
      recast = sync === 'recast';
      retry = sync === 'failed';
      if (derived && !retry) patch.birthTz = derived;
    }
  }
  if (needsTimezoneRepair(profile, deps.device)) patch.timezone = deps.device!;
  if (!patch.birthTz && !patch.timezone) return { recast, saved: {}, retry };
  const ok = await deps.persist(patch);
  return { recast, saved: ok ? patch : {}, retry };
}

/** One run per account and birth data per session, shared by every screen that mounts the hook. */
const runs = new Map<string, Promise<BackfillResult>>();

/** Test seam: forget this session's runs. */
export function resetBirthTzBackfillRuns(): void {
  runs.clear();
}

/**
 * What a run is keyed on: the account and every field it reads, so an edit
 * of the birth data (here or on another device) is checked again. Null when
 * there is nothing to do.
 */
export function backfillKey(profile: (Partial<BirthFields> & { id?: string }) | null | undefined, device: string | null): string | null {
  const id = profile?.id;
  if (!profile || !id) return null;
  const chart = !!profile.birthDate && hasCoords(profile);
  const repair = needsTimezoneRepair(profile, device);
  if (!chart && !repair) return null;
  return [id, profile.birthDate, profile.birthTime, profile.birthLat, profile.birthLon, profile.birthTz, repair ? 'tz' : ''].join('|');
}

/**
 * Mounted by every screen that shows the natal chart or reads the birth
 * instant (the Horoscope tabs, Readings → Horoscope, the natal report, the
 * Celestial Map, Compare). A screen holding its own copy of the chart
 * passes `onRecast` (its useNatalChart().fetchChart) and reloads once the
 * recast lands. birthTz, timezone and birthUtc reach every screen through
 * the profile, which updateProfile replaces with the row the trigger
 * recomputed.
 */
export function useBirthTzBackfill(onRecast?: () => void): void {
  const { profile, updateProfile } = useAuth();
  const onRecastRef = useRef(onRecast);
  onRecastRef.current = onRecast;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const key = backfillKey(profile, deviceZone());
  useEffect(() => {
    if (!key || !profile) return;
    let run = runs.get(key);
    if (!run) {
      run = runBirthTzBackfill(profile, {
        ...liveChartDeps(),
        derive: deriveBirthTz,
        persist: async (patch) => !(await updateProfile(patch)).error,
        device: deviceZone(),
      }).catch((): BackfillResult => ({ recast: false, saved: {}, retry: true }));
      runs.set(key, run);
    }
    void run.then(({ recast, retry }) => {
      if (retry && runs.get(key) === run) runs.delete(key);
      if (recast && mounted.current) onRecastRef.current?.();
    });
    // The profile object changes on every update; the run is keyed on the
    // account and the fields it reads, not on the object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
