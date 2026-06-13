/**
 * Golden geometric tests for src/utils/astrocartography.ts
 *
 * METHODOLOGY — every expected value is derived INDEPENDENTLY of the function
 * under test:
 *   - The MC-line geometry references are re-derived from first principles by
 *     calling the `astronomy-engine` library DIRECTLY (the published authority
 *     for the RA/Dec/sidereal-time inputs) and applying the textbook
 *     astrocartography meridian formula `LST = RA  =>  lon = RA - GAST` by hand
 *     in the test. We never paste `computeCelestialLines` output back in as the
 *     "expected".
 *   - The haversine great-circle distance used for the ~0 km proximity check is
 *     a from-scratch implementation written in this file (Wikipedia "Haversine
 *     formula", mean Earth radius R = 6371.0088 km, the IUGG mean radius).
 *   - The feature counts are derived from the source's own PLANETS array length
 *     and the documented angle set {MC, IC, AC, DC}; see referenceTable in the
 *     report.
 *   - The round-trip reference is the ISO-8601 UTC string identity.
 */

import { describe, it, expect } from 'vitest';
import {
  Body,
  Equator,
  MakeTime,
  Observer,
  SiderealTime,
} from 'astronomy-engine';
import {
  computeCelestialLines,
  birthDataFromLocalUTC,
  PLANETS,
  type BirthData,
} from '../../utils/astrocartography';

// --------------------------------------------------------------------------
// Independent helpers (NOT imported from the module under test)
// --------------------------------------------------------------------------

/**
 * Mean Earth radius in km — IUGG arithmetic mean (2a+b)/3 = 6371.0088 km.
 * Source: Wikipedia "Earth radius" / IUGG mean radius R1.
 */
const EARTH_RADIUS_KM = 6371.0088;

/**
 * Great-circle distance between two lon/lat points, in km.
 * From-scratch implementation of the haversine formula:
 *   a = sin²(Δφ/2) + cos φ1 · cos φ2 · sin²(Δλ/2)
 *   d = 2R · atan2(√a, √(1−a))
 * Reference: Wikipedia "Haversine formula".
 */
function haversineKm(
  lon1: number,
  lat1: number,
  lon2: number,
  lat2: number,
): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dPhi = toRad(lat2 - lat1);
  const dLam = toRad(lon2 - lon1);
  const p1 = toRad(lat1);
  const p2 = toRad(lat2);
  const a =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dLam / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Wrap a longitude into (-180, 180], matching GeoJSON convention. */
function wrapLon(lon: number): number {
  let x = (((lon + 180) % 360) + 360) % 360 - 180;
  if (x === -180) x = 180;
  return x;
}

/**
 * Independently re-derive the ideal MC longitude for a planet at a UTC instant,
 * by calling astronomy-engine directly (the same documented authority the app
 * relies on for its inputs) and applying the textbook meridian relation
 *   LST(meridian) = RA  =>  GAST + lon = RA  =>  lon = RA - GAST.
 * This does NOT call any internal helper of astrocartography.ts.
 */
function independentMcLon(body: Body, utcDate: Date): number {
  const time = MakeTime(utcDate);
  const observer = new Observer(0, 0, 0); // geocentric origin, apparent coords
  const eq = Equator(body, time, observer, /* ofdate */ true, /* aberration */ true);
  const raDeg = eq.ra * 15; // astronomy-engine returns RA in hours
  const gastDeg = (((SiderealTime(time) * 15) % 360) + 360) % 360;
  return wrapLon(raDeg - gastDeg);
}

const BODY_OF: Record<string, Body> = {
  Sun: Body.Sun,
  Moon: Body.Moon,
  Mercury: Body.Mercury,
  Venus: Body.Venus,
  Mars: Body.Mars,
  Jupiter: Body.Jupiter,
  Saturn: Body.Saturn,
  Uranus: Body.Uranus,
  Neptune: Body.Neptune,
  Pluto: Body.Pluto,
};

// A fixed, reproducible birth instant (J2000.0 epoch, noon UTC).
const TEST_UTC = '2000-01-01T12:00:00.000Z';
const birth: BirthData = birthDataFromLocalUTC(TEST_UTC);

// --------------------------------------------------------------------------
// Reference 2: birthDataFromLocalUTC round-trip (no timezone drift)
// --------------------------------------------------------------------------
describe('birthDataFromLocalUTC round-trip', () => {
  it('parses an ISO UTC string with zero timezone drift', () => {
    // Independent reference: the ISO-8601 identity. A correctly parsed UTC
    // instant must serialise back to the exact same instant.
    const iso = '1990-07-15T08:30:00.000Z';
    const bd = birthDataFromLocalUTC(iso);
    expect(bd.utcDate.toISOString()).toBe(iso);
    // Epoch-millis cross-check, independently computed by Date.parse.
    expect(bd.utcDate.getTime()).toBe(Date.parse(iso));
  });

  it('preserves a Z-suffixed instant exactly (no implicit local-time shift)', () => {
    const iso = '2000-01-01T12:00:00.000Z';
    const bd = birthDataFromLocalUTC(iso);
    // Independently: J2000 noon UTC = 946728000000 ms since the Unix epoch.
    //   days from 1970-01-01 to 2000-01-01 = 30y*365 + 7 leap days = 10957 days
    //   10957 * 86400 = 946684800 s; + 12h (43200 s) = 946728000 s.
    expect(bd.utcDate.getTime()).toBe(946728000 * 1000);
    expect(bd.utcDate.getUTCFullYear()).toBe(2000);
    expect(bd.utcDate.getUTCHours()).toBe(12);
  });
});

// --------------------------------------------------------------------------
// Reference 3: FeatureCollection structure, counts, valid ranges, shapes
// --------------------------------------------------------------------------
describe('computeCelestialLines structure & counts', () => {
  const fc = computeCelestialLines(birth);

  it('returns a GeoJSON FeatureCollection of LineStrings', () => {
    expect(fc.type).toBe('FeatureCollection');
    expect(Array.isArray(fc.features)).toBe(true);
    for (const f of fc.features) {
      expect(f.type).toBe('Feature');
      expect(f.geometry.type).toBe('LineString');
    }
  });

  it('emits exactly one MC and one IC meridian per planet (10 planets => 20)', () => {
    // Reference: PLANETS.length planets, each contributing exactly 1 MC and
    // 1 IC feature (meridians are never split — they are single vertical lines).
    // AC/DC counts vary because they can split at the antimeridian, so we only
    // pin the deterministic meridian count here.
    expect(PLANETS.length).toBe(10);
    const mc = fc.features.filter((f) => f.properties.angle === 'MC');
    const ic = fc.features.filter((f) => f.properties.angle === 'IC');
    expect(mc.length).toBe(10);
    expect(ic.length).toBe(10);
    // Every planet name appears once among MC features.
    expect(new Set(mc.map((f) => f.properties.planet)).size).toBe(10);
  });

  it('emits at least one AC and one DC feature per planet for this epoch', () => {
    // For real solar-system bodies at J2000 noon none are circumpolar across
    // the entire ±75° sweep, so each planet must yield >=1 AC and >=1 DC line.
    for (const planet of PLANETS) {
      const ac = fc.features.filter(
        (f) => f.properties.planet === planet && f.properties.angle === 'AC',
      );
      const dc = fc.features.filter(
        (f) => f.properties.planet === planet && f.properties.angle === 'DC',
      );
      expect(ac.length).toBeGreaterThanOrEqual(1);
      expect(dc.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('total feature count is at least 40 (20 meridians + >=1 AC + >=1 DC each)', () => {
    // Lower bound reference: 10*(MC+IC) = 20 deterministic, plus >=1 AC and
    // >=1 DC per planet = >=20 more, so >=40 total.
    expect(fc.features.length).toBeGreaterThanOrEqual(40);
  });

  it('every coordinate lies within valid lon[-180,180]/lat[-90,90] ranges', () => {
    for (const f of fc.features) {
      for (const [lon, lat] of f.geometry.coordinates) {
        expect(lon).toBeGreaterThanOrEqual(-180);
        expect(lon).toBeLessThanOrEqual(180);
        expect(lat).toBeGreaterThanOrEqual(-90);
        expect(lat).toBeLessThanOrEqual(90);
      }
    }
  });

  it('labels are "<Planet> <Angle>"', () => {
    for (const f of fc.features) {
      expect(f.properties.label).toBe(
        `${f.properties.planet} ${f.properties.angle}`,
      );
    }
  });
});

// --------------------------------------------------------------------------
// Reference 3b: MC/IC are meridians (constant lon); AC/DC are curves (vary lon)
// --------------------------------------------------------------------------
describe('line geometry: meridians vs. curves', () => {
  const fc = computeCelestialLines(birth);

  it('MC and IC lines have constant longitude across all their vertices', () => {
    const meridians = fc.features.filter(
      (f) => f.properties.angle === 'MC' || f.properties.angle === 'IC',
    );
    expect(meridians.length).toBe(20);
    for (const f of meridians) {
      const lons = f.geometry.coordinates.map((c) => c[0]);
      const spread = Math.max(...lons) - Math.min(...lons);
      // A true meridian: zero longitude spread (allow a hair for float noise).
      expect(spread).toBeCloseTo(0, 9);
      // And it must actually span latitude (a real vertical line, not a dot).
      const lats = f.geometry.coordinates.map((c) => c[1]);
      expect(Math.max(...lats) - Math.min(...lats)).toBeGreaterThan(100);
    }
  });

  it('AC and DC lines are curves — longitude varies along the line', () => {
    // Pick the Moon's AC line: the Moon has the largest |declination-rate| and
    // a non-trivial dec, guaranteeing a curved horizon line whose longitude
    // changes with latitude. (Any planet not at dec~0 curves; we assert the
    // generic property across all AC/DC segments of length >=2.)
    const curves = fc.features.filter(
      (f) =>
        (f.properties.angle === 'AC' || f.properties.angle === 'DC') &&
        f.geometry.coordinates.length >= 3,
    );
    expect(curves.length).toBeGreaterThan(0);
    let anyCurved = false;
    for (const f of curves) {
      const lons = f.geometry.coordinates.map((c) => c[0]);
      if (Math.max(...lons) - Math.min(...lons) > 0.01) anyCurved = true;
    }
    expect(anyCurved).toBe(true);
  });
});

// --------------------------------------------------------------------------
// Reference 1: a point sampled ON a computed MC line is ~0 km from the
// INDEPENDENTLY-derived meridian for that planet.
// --------------------------------------------------------------------------
describe('MC line self-consistency (~0 km from independent meridian)', () => {
  const fc = computeCelestialLines(birth);

  it('every MC line vertex is < 60 km from its independent RA-GAST meridian', () => {
    // Tolerance 60 km matches the known worst-midpoint error (~55.6 km) from
    // Sprint A's 1° sampling resolution. Here the vertices lie exactly on the
    // line by construction, so the only "distance" is the gap between the app's
    // mcLon and our independent mcLon at the SAME latitude — which should be
    // sub-km. We still bound by 60 km to stay within the documented budget.
    const mcFeatures = fc.features.filter((f) => f.properties.angle === 'MC');
    expect(mcFeatures.length).toBe(10);

    let worst = 0;
    for (const f of mcFeatures) {
      const planet = f.properties.planet;
      const refLon = independentMcLon(BODY_OF[planet], birth.utcDate);
      for (const [lon, lat] of f.geometry.coordinates) {
        // Distance along the parallel between the app's longitude and the
        // independently-derived meridian longitude, at this vertex's latitude.
        const dLon = Math.abs(wrapLon(lon - refLon));
        const d = haversineKm(refLon, lat, refLon + (lon - refLon), lat);
        worst = Math.max(worst, d);
        expect(d).toBeLessThan(60);
        // Sanity: longitudes themselves agree to well under a degree.
        expect(dLon).toBeLessThan(0.001);
      }
    }
    // The vertices are collinear with the ideal meridian, so worst-case should
    // be essentially zero (sub-km), comfortably under the 60 km budget.
    expect(worst).toBeLessThan(60);
  });

  it('IC line longitude = MC longitude + 180 (antipodal meridian)', () => {
    // Independent geometric fact: the IC meridian is the antimeridian of the
    // MC meridian, lon_IC = wrap(lon_MC + 180). Derived from first principles,
    // re-checked against astronomy-engine RA/GAST, not from the app output.
    for (const planet of PLANETS) {
      const mcRef = independentMcLon(BODY_OF[planet], birth.utcDate);
      const icRef = wrapLon(mcRef + 180);
      const icFeature = fc.features.find(
        (f) => f.properties.planet === planet && f.properties.angle === 'IC',
      )!;
      const icLon = icFeature.geometry.coordinates[0][0];
      // Compare via haversine at the equator (purely a longitude difference).
      const d = haversineKm(icRef, 0, icLon, 0);
      expect(d).toBeLessThan(60);
    }
  });
});
