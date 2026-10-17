import { useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { getLocale } from '../../i18n/config';
import { deriveBirthTz } from '../../utils/birthTz';
import type { UserProfile } from '../../types';

/**
 * The zone a birth time is read in (p8 F21).
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
 *  - `birthZoneOf`: the zone to cast in. The stored birthTz; else one
 *    derived from the coordinates (returned as `derived`, so the caller
 *    persists it); else `fallbackZone`.
 *  - `fallbackZone`: no birth-place zone at all. The device's zone, then
 *    the profile's, then UTC.
 *  - `runBirthTzBackfill` / `useBirthTzBackfill`: an account set up before
 *    F21. With coordinates and no birthTz: derive the zone, recast the
 *    stored chart in it, then persist the zone. With the bare signup
 *    'UTC' as its timezone: persist the device's zone, the birth_utc
 *    fallback for a profile with no birth place. Once per account: what is
 *    persisted ends the condition.
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

/** Cast before F21: a birth date and coordinates, and no birth-place zone. */
export function needsBirthTzBackfill(profile: Partial<BirthFields> | null | undefined): boolean {
  return !!profile?.birthDate && hasCoords(profile) && !profile.birthTz;
}

/** Still on the signup default: 'UTC' (or nothing) on a device that knows a real zone. */
export function needsTimezoneRepair(profile: Partial<BirthFields> | null | undefined, device: string | null): boolean {
  if (!profile || !device || UTC_NAMES.has(device)) return false;
  return !profile.timezone || profile.timezone === 'UTC';
}

export interface BackfillDeps {
  derive: (lat: number, lon: number) => Promise<string | null>;
  /** Recast the stored natal chart; true when it was saved. */
  recast: (params: CastParams) => Promise<boolean>;
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
}

/**
 * Derive, recast, persist — in that order. The condition that brings a
 * profile here is the missing zone, so a zone persisted over the old chart
 * would never be revisited: a failed recast leaves the zone unsaved, and
 * the next session tries again (recasting again is harmless: same inputs,
 * same chart). Both fields go in one write, so two saves never race to
 * replace the profile.
 */
export async function runBirthTzBackfill(profile: Partial<BirthFields> | null | undefined, deps: BackfillDeps): Promise<BackfillResult> {
  const patch: ProfilePatch = {};
  let recast = false;
  if (needsBirthTzBackfill(profile)) {
    const p = profile as Located;
    const tz = await deps.derive(p.birthLat, p.birthLon);
    if (tz && (await deps.recast(castParamsFor(p, tz)))) {
      recast = true;
      patch.birthTz = tz;
    }
  }
  if (needsTimezoneRepair(profile, deps.device)) patch.timezone = deps.device!;
  if (!patch.birthTz && !patch.timezone) return { recast, saved: {} };
  const ok = await deps.persist(patch);
  return { recast, saved: ok ? patch : {} };
}

/** One backfill per account per session, shared by every screen that mounts the hook. */
const runs = new Map<string, Promise<BackfillResult>>();

/** Test seam: forget this session's runs. */
export function resetBirthTzBackfillRuns(): void {
  runs.clear();
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

  const needed = needsBirthTzBackfill(profile) || needsTimezoneRepair(profile, deviceZone());
  const uid = profile?.id;
  useEffect(() => {
    if (!needed || !uid || !profile) return;
    let run = runs.get(uid);
    if (!run) {
      run = runBirthTzBackfill(profile, {
        derive: deriveBirthTz,
        recast: async (params) => {
          const { error } = await supabase.functions.invoke('astrology-compute-natal', {
            body: { ...params, locale: getLocale() },
          });
          return !error;
        },
        persist: async (patch) => !(await updateProfile(patch)).error,
        device: deviceZone(),
      }).catch((): BackfillResult => ({ recast: false, saved: {} }));
      runs.set(uid, run);
    }
    void run.then(({ recast }) => {
      if (recast && mounted.current) onRecastRef.current?.();
    });
    // The profile object changes on every update; the run is keyed on the
    // account and the condition, not on the object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needed, uid]);
}
