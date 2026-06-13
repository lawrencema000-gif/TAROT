import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import * as Astronomy from 'astronomy-engine';

/**
 * GOLDEN test for the GEOCENTRIC astronomy core.
 *
 * Sprint A bug: planetary longitudes were computed HELIOCENTRICALLY because
 * `Astronomy.EclipticLongitude(body, date)` returns the HELIOCENTRIC J2000
 * ecliptic longitude (planet as seen from the SUN). Western astrology is
 * GEOCENTRIC (planet as seen from EARTH); the two differ by ~180 deg for the
 * Sun/Earth and produce astrologically impossible charts for the inner planets.
 *
 * The canonical fixed helper lives at supabase/functions/_shared/astro.ts
 * (Deno, `import npm:astronomy-engine`). We cannot run Deno here, so we import
 * the SAME npm package directly and reproduce the helper's exact call chain:
 *   Sun    -> Astronomy.SunPosition(date).elon
 *   Moon   -> Astronomy.EclipticGeoMoon(date).lon
 *   others -> Astronomy.Ecliptic(Astronomy.GeoVector(body, date, true)).elon
 *
 * Every EXPECTED value below is derived from an INDEPENDENT external/physical
 * authority, NOT from running the helper. See per-assertion comments.
 */

// Reproduce the helper's exact logic (mirrors supabase/functions/_shared/astro.ts).
type ChartBody = Astronomy.Body | 'Sun' | 'Moon';
function geoEclipticLongitude(body: ChartBody, date: Date): number {
  // astronomy-engine's Body is a STRING enum (Body.Sun === 'Sun'), so the
  // string check also covers the enum member. The `as string` casts keep
  // the dual-form check (faithful to the helper) without tsc flagging the
  // second comparison as provably-unreachable.
  if (body === 'Sun' || (body as string) === Astronomy.Body.Sun) {
    return Astronomy.SunPosition(date).elon;
  }
  if (body === 'Moon' || (body as string) === Astronomy.Body.Moon) {
    return Astronomy.EclipticGeoMoon(date).lon;
  }
  const vec = Astronomy.GeoVector(body as Astronomy.Body, date, true);
  return Astronomy.Ecliptic(vec).elon;
}

describe('geocentric Sun longitude (catches heliocentric regression)', () => {
  // INDEPENDENT REFERENCE:
  // At J2000.0 = 2000-01-01T12:00:00Z the Sun's GEOCENTRIC apparent ecliptic
  // longitude is ~280.6 deg (Sun in Capricorn; perihelion ~Jan 3-4, so the Sun
  // sits a few degrees past 270 deg = 0 deg Capricorn). This is a standard,
  // widely-published almanac value (e.g. Meeus, "Astronomical Algorithms",
  // and any ephemeris: Sun in early Capricorn at New Year).
  // The HELIOCENTRIC Earth longitude at the same instant is ~100.6 deg
  // (exactly opposite, +/- 180 deg). A heliocentric regression would yield
  // ~100 deg instead of ~280 deg, so this assertion catches it outright.
  const j2000 = new Date('2000-01-01T12:00:00Z');

  it('Sun is ~280.6 deg at J2000.0 (geocentric, NOT the heliocentric ~100.6)', () => {
    const lon = geoEclipticLongitude('Sun', j2000);
    // tolerance ~1 deg: the published almanac figure rounds to ~280.6; the
    // apparent-of-date value is ~280.4. Either way nowhere near 100.6.
    expect(lon).toBeCloseTo(280.6, 0); // toBeCloseTo(x, 0) => |diff| < 0.5
  });

  it('REGRESSION GUARD: geocentric Sun and heliocentric Earth differ by ~180 deg', () => {
    // This documents the exact trap. EclipticLongitude(Body.Earth) is the
    // heliocentric Earth longitude; the geocentric Sun is the antipode.
    // Physical identity: lon_sun_geo = lon_earth_helio + 180 (mod 360).
    const sunGeo = geoEclipticLongitude('Sun', j2000);
    const earthHelio = Astronomy.EclipticLongitude(Astronomy.Body.Earth, j2000);
    let diff = ((sunGeo - earthHelio) % 360 + 360) % 360;
    if (diff > 180) diff -= 360; // signed shortest separation
    expect(Math.abs(diff)).toBeCloseTo(180, 0); // ~180 deg apart
  });

  it('Sun is ~0/360 deg at the 2025 March equinox', () => {
    // INDEPENDENT REFERENCE: the March (vernal) equinox is DEFINED as the
    // instant the Sun's geocentric apparent ecliptic longitude = 0 deg.
    // The 2025 March equinox is 2025-03-20 ~09:01 UTC (published almanac).
    // So the Sun's longitude must be ~0 (== 360) there.
    const equinox = new Date('2025-03-20T09:01:00Z');
    const lon = geoEclipticLongitude('Sun', equinox);
    const wrapped = lon > 180 ? lon - 360 : lon; // map ~360 -> ~0
    expect(wrapped).toBeCloseTo(0, 0); // within 0.5 deg of the equinox point
  });
});

describe('geocentric Moon longitude (catches frozen/opposite-Sun bug)', () => {
  // INDEPENDENT REFERENCE: the geocentric Moon advances ~360 deg / 27.32 days
  // = ~13.18 deg/day (sidereal month). Day-to-day apparent motion ranges
  // ~12-14 deg/day. The buggy heliocentric/"Moon opposite Sun" path moved
  // only ~1 deg/day. We assert real lunar motion between consecutive days.
  it('Moon moves ~12-14 deg/day between two consecutive days', () => {
    const d1 = new Date('2000-01-01T12:00:00Z');
    const d2 = new Date('2000-01-02T12:00:00Z');
    const lon1 = geoEclipticLongitude('Moon', d1);
    const lon2 = geoEclipticLongitude('Moon', d2);
    let delta = ((lon2 - lon1) % 360 + 360) % 360; // forward motion, 0..360
    expect(delta).toBeGreaterThan(11);
    expect(delta).toBeLessThan(15);
  });

  it('Moon stays within [0,360)', () => {
    const lon = geoEclipticLongitude('Moon', new Date('2000-01-01T12:00:00Z'));
    expect(lon).toBeGreaterThanOrEqual(0);
    expect(lon).toBeLessThan(360);
  });
});

describe('geocentric planet longitudes are bounded and use the geo path', () => {
  const j2000 = new Date('2000-01-01T12:00:00Z');

  // INDEPENDENT REFERENCE (geometric sanity, not engine output):
  // Mercury's GEOCENTRIC ecliptic longitude can NEVER be more than ~28 deg
  // (max elongation) from the Sun. At J2000 the Sun is ~280.6 deg, so a
  // correct geocentric Mercury must lie within ~[252, 309] deg. A heliocentric
  // Mercury (~252 deg helio at J2000) could violate this; this catches a
  // heliocentric regression for an inner planet via the elongation constraint.
  it('Mercury is within ~28 deg of the geocentric Sun (max elongation law)', () => {
    const sun = geoEclipticLongitude('Sun', j2000);
    const merc = geoEclipticLongitude(Astronomy.Body.Mercury, j2000);
    let sep = ((merc - sun) % 360 + 360) % 360;
    if (sep > 180) sep -= 360;
    expect(Math.abs(sep)).toBeLessThanOrEqual(28);
  });

  it('all planet longitudes are within [0,360)', () => {
    for (const body of [
      Astronomy.Body.Mercury,
      Astronomy.Body.Venus,
      Astronomy.Body.Mars,
      Astronomy.Body.Jupiter,
      Astronomy.Body.Saturn,
    ]) {
      const lon = geoEclipticLongitude(body, j2000);
      expect(lon).toBeGreaterThanOrEqual(0);
      expect(lon).toBeLessThan(360);
    }
  });
});

describe('SOURCE GUARD: astro.ts must use the geocentric API', () => {
  // Read the canonical helper as raw text and assert it uses the correct
  // geocentric calls and does NOT revert to the heliocentric EclipticLongitude
  // for chart positions. This fails loudly on any future regression.
  const astroPath = resolve(
    __dirname,
    '../../../supabase/functions/_shared/astro.ts',
  );
  const src = readFileSync(astroPath, 'utf8');

  it('uses SunPosition for the Sun', () => {
    expect(src).toContain('SunPosition');
  });
  it('uses EclipticGeoMoon for the Moon', () => {
    expect(src).toContain('EclipticGeoMoon');
  });
  it('uses GeoVector for planets', () => {
    expect(src).toContain('GeoVector');
  });
  it('does NOT call EclipticLongitude(...) for chart positions', () => {
    // The heliocentric trap. We strip BOTH line comments and block-comment
    // lines (the doc comment legitimately names EclipticLongitude when
    // explaining why it is forbidden), then look for an actual CALL.
    //
    // Use a word boundary so we match a BARE `EclipticLongitude(` call but NOT
    // the safe `geoEclipticLongitude(` helper (which merely contains the name
    // as a suffix). \b before "EclipticLongitude" ensures the preceding char
    // is a non-word char (e.g. `.` or whitespace), excluding "geo...".
    const codeOnly = src
      .split('\n')
      .map((line) => line.replace(/\/\/.*$/, ''))
      .filter((line) => !line.trimStart().startsWith('*'))
      .join('\n');
    expect(codeOnly).not.toMatch(/\bEclipticLongitude\(/);
  });
});

describe('ASCENDANT formula guard', () => {
  // Fixed formula:
  //   asc = atan2( cos(RAMC), -( sin(RAMC)*cos(eps) + tan(lat)*sin(eps) ) )
  // reproduced here exactly, normalized into [0,360).
  const DEG = Math.PI / 180;
  const RAD = 180 / Math.PI;
  const EPS = 23.4392911; // mean obliquity of the ecliptic at J2000 (IAU value)

  function ascendant(ramcDeg: number, latDeg: number, epsDeg: number): number {
    const a =
      Math.atan2(
        Math.cos(ramcDeg * DEG),
        -(
          Math.sin(ramcDeg * DEG) * Math.cos(epsDeg * DEG) +
          Math.tan(latDeg * DEG) * Math.sin(epsDeg * DEG)
        ),
      ) * RAD;
    return ((a % 360) + 360) % 360;
  }

  // HAND-DERIVED REFERENCES:
  // Equator (lat=0), RAMC=0:
  //   cos(0)=1, sin(0)=0, tan(0)=0
  //   asc = atan2(1, -(0 + 0)) = atan2(1, 0) = +90 deg.
  it('asc(RAMC=0, lat=0) = 90 deg (hand-derived)', () => {
    expect(ascendant(0, 0, EPS)).toBeCloseTo(90, 6);
  });

  // Equator (lat=0), RAMC=90:
  //   cos(90)=0, sin(90)=1, tan(0)=0
  //   asc = atan2(0, -(1*cos(eps) + 0)) = atan2(0, -0.9175) = 180 deg.
  it('asc(RAMC=90, lat=0) = 180 deg (hand-derived)', () => {
    expect(ascendant(90, 0, EPS)).toBeCloseTo(180, 6);
  });

  // Equator (lat=0), RAMC=180:
  //   cos(180)=-1, sin(180)=0, tan(0)=0
  //   asc = atan2(-1, -(0+0)) = atan2(-1, 0) = -90 -> +270 deg.
  it('asc(RAMC=180, lat=0) = 270 deg (hand-derived)', () => {
    expect(ascendant(180, 0, EPS)).toBeCloseTo(270, 6);
  });

  it('ascendant is always within [0,360) across many inputs', () => {
    for (let ramc = 0; ramc < 360; ramc += 17) {
      for (const lat of [-66, -51.5, 0, 23.4, 51.5, 66]) {
        const a = ascendant(ramc, lat, EPS);
        expect(a).toBeGreaterThanOrEqual(0);
        expect(a).toBeLessThan(360);
      }
    }
  });
});
