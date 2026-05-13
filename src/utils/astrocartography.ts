/**
 * Astrocartography — compute the four planetary "lines" on Earth where
 * a given planet was either rising (AC), setting (DC), at upper meridian
 * (MC), or at lower meridian (IC) at the user's moment of birth.
 *
 * Math reference: https://en.wikipedia.org/wiki/Astrocartography
 *   AC/DC: latitude vs. longitude curves solved from
 *     tan(lat) = -cos(LST - α) / tan(δ)            (DC; +90° offset for AC)
 *   MC/IC: vertical lines at longitudes where the planet's right
 *     ascension equals the local sidereal time at the meridian.
 *
 * We use the `astronomy-engine` library for high-accuracy geocentric
 * planet positions (RA + Dec) at the birth UTC instant. All 10 classical
 * planets are computed: Sun, Moon, Mercury, Venus, Mars, Jupiter,
 * Saturn, Uranus, Neptune, Pluto.
 *
 * Output is a GeoJSON FeatureCollection ready to feed straight into
 * Mapbox/MapLibre as a source. Each feature carries metadata so the
 * style layer can color by planet and the tap handler can identify
 * which line was hit.
 */

import {
  Body,
  Equator,
  MakeTime,
  Observer,
  SiderealTime,
} from 'astronomy-engine';

/**
 * The ten planets we cartograph. Pluto is included for completeness even
 * though it's technically a dwarf planet — astrology treats it as a
 * full classical influence.
 */
export const PLANETS = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
] as const;
export type PlanetName = (typeof PLANETS)[number];

/**
 * The four angle types — which "house cusp" the planet is on for the
 * longitude swept along the line.
 *   AC = Ascendant / rising — planet is on the eastern horizon
 *   DC = Descendant / setting — planet is on the western horizon
 *   MC = Midheaven / culminating — planet is at upper meridian
 *   IC = Imum Coeli — planet is at lower meridian (opposite the MC)
 */
export type Angle = 'AC' | 'DC' | 'MC' | 'IC';

export interface BirthData {
  /** UTC moment of birth as a JS Date. Time zone is already collapsed. */
  utcDate: Date;
}

/**
 * Mapping astronomy-engine Body enums to our planet names. astronomy-
 * engine uses Body.Sun / Body.Moon / etc. — the strings are friendlier
 * to display and translate.
 */
const PLANET_BODIES: Record<PlanetName, Body> = {
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

/**
 * Get the geocentric apparent right ascension (hours) and declination
 * (degrees) for each planet at the given UTC instant. Apparent
 * (corrected for nutation + aberration) matches what astrology tradition
 * uses for chart angles.
 */
function computePlanetCoords(utcDate: Date): Record<PlanetName, { raDeg: number; decDeg: number }> {
  const time = MakeTime(utcDate);
  // astronomy-engine's `Equator` requires an Observer instance whenever
  // ofdate=true (apparent coordinates) — it rejects null. For
  // astrocartography we want geocentric apparent RA/Dec, so we feed it
  // an Observer at lat 0, lon 0, height 0 (the geocentric origin).
  // The chart angles fall out the same as a true geocentric calc to
  // well within the precision astrocartography cares about.
  const observer = new Observer(0, 0, 0);
  const out = {} as Record<PlanetName, { raDeg: number; decDeg: number }>;
  for (const planet of PLANETS) {
    const eq = Equator(PLANET_BODIES[planet], time, observer, /* ofdate */ true, /* aberration */ true);
    out[planet] = {
      raDeg: eq.ra * 15, // astronomy-engine returns RA in hours; convert to degrees
      decDeg: eq.dec,
    };
  }
  return out;
}

/**
 * Greenwich Apparent Sidereal Time in degrees at the birth instant.
 * GAST is what we compare RA against to get the longitude where each
 * planet was at the meridian.
 */
function gastDeg(utcDate: Date): number {
  const time = MakeTime(utcDate);
  // SiderealTime returns hours; convert to degrees and normalize.
  const gastHours = SiderealTime(time);
  return ((gastHours * 15) % 360 + 360) % 360;
}

/**
 * Wrap a longitude into the -180..+180 range (the convention GeoJSON
 * expects). Longitudes wider than that wrap to the other side of the
 * date line.
 */
function wrapLon(lon: number): number {
  let x = ((lon + 180) % 360 + 360) % 360 - 180;
  if (x === -180) x = 180;
  return x;
}

/**
 * For an MC line: the planet's RA = local sidereal time at the meridian.
 * LST = GAST + lon (east positive). Therefore the MC longitude is just
 * RA - GAST, wrapped. IC is MC + 180°.
 */
function meridianLongitudes(raDeg: number, gast: number): { mcLon: number; icLon: number } {
  const mcLon = wrapLon(raDeg - gast);
  const icLon = wrapLon(mcLon + 180);
  return { mcLon, icLon };
}

/**
 * For AC/DC lines: at each candidate latitude, find the longitudes
 * where the planet is on the horizon. The horizon condition is:
 *
 *   cos(H) = -tan(φ) · tan(δ)
 *
 * where H is hour angle (LST - RA). If |cos(H)| > 1 the planet never
 * rises/sets at that latitude — return null. Otherwise there are two
 * solutions: H and -H, corresponding to AC and DC respectively (with
 * sign depending on hemisphere). We compute both, then convert to
 * longitude via lon = LST - GAST = (RA + H) - GAST.
 *
 * Convention: rising body is east of meridian (positive H is afternoon
 * in astronomy; we use the astrology convention where AC is the
 * eastern horizon).
 */
function horizonLongitudes(
  raDeg: number,
  decDeg: number,
  latDeg: number,
  gast: number,
): { acLon: number | null; dcLon: number | null } {
  const lat = (latDeg * Math.PI) / 180;
  const dec = (decDeg * Math.PI) / 180;

  // Polar regions where the planet either never sets or never rises:
  //   cos(H) = -tan(φ) tan(δ)
  // If |RHS| > 1, no horizon crossing exists at this latitude.
  const cosH = -Math.tan(lat) * Math.tan(dec);
  if (Math.abs(cosH) > 1) {
    return { acLon: null, dcLon: null };
  }
  const H = Math.acos(cosH); // 0..π
  const Hdeg = (H * 180) / Math.PI;

  // AC: eastern horizon, hour angle = -H (planet is east of meridian,
  //     i.e. rising in the east).
  // DC: western horizon, hour angle = +H.
  const acLon = wrapLon(raDeg - Hdeg - gast);
  const dcLon = wrapLon(raDeg + Hdeg - gast);

  return { acLon, dcLon };
}

export interface CelestialLineProperties {
  planet: PlanetName;
  angle: Angle;
  /** "Sun AC", "Venus MC", etc. — convenient for labelling. */
  label: string;
}

export type CelestialLineFeature = GeoJSON.Feature<
  GeoJSON.LineString,
  CelestialLineProperties
>;

/**
 * Compute all 40 planetary lines (10 planets × 4 angles) and return as a
 * GeoJSON FeatureCollection ready to add as a Mapbox source.
 *
 * Resolution: AC/DC lines are sampled at 1° latitude steps (~180 points
 * per line); MC/IC lines are straight north-south meridians (2 points
 * each). The 1° step is plenty smooth at any zoom level — Mapbox draws
 * great-circle interpolation between the points.
 */
export function computeCelestialLines(birth: BirthData): GeoJSON.FeatureCollection<
  GeoJSON.LineString,
  CelestialLineProperties
> {
  const coords = computePlanetCoords(birth.utcDate);
  const gast = gastDeg(birth.utcDate);
  const features: CelestialLineFeature[] = [];

  for (const planet of PLANETS) {
    const { raDeg, decDeg } = coords[planet];

    // MC + IC: vertical north-south meridians at fixed longitudes.
    const { mcLon, icLon } = meridianLongitudes(raDeg, gast);
    features.push(meridianFeature(planet, 'MC', mcLon));
    features.push(meridianFeature(planet, 'IC', icLon));

    // AC + DC: sweep latitude from -75° to +75°, collecting the AC and
    // DC longitudes at each step. Beyond ±75° many planet lines simply
    // don't cross the horizon (the planet is circumpolar at that
    // latitude), so we cap there to keep the visible line shape
    // meaningful and avoid the curves shooting to infinity.
    const acPoints: [number, number][] = [];
    const dcPoints: [number, number][] = [];
    for (let lat = -75; lat <= 75; lat += 1) {
      const { acLon, dcLon } = horizonLongitudes(raDeg, decDeg, lat, gast);
      if (acLon !== null) acPoints.push([acLon, lat]);
      if (dcLon !== null) dcPoints.push([dcLon, lat]);
    }
    // Split each set of points if there's a longitude wraparound jump >180°
    // between adjacent samples — otherwise the rendered line spans the
    // entire globe horizontally as a visual artifact.
    for (const segment of splitOnLongitudeJumps(acPoints)) {
      features.push(horizonFeature(planet, 'AC', segment));
    }
    for (const segment of splitOnLongitudeJumps(dcPoints)) {
      features.push(horizonFeature(planet, 'DC', segment));
    }
  }

  return { type: 'FeatureCollection', features };
}

function meridianFeature(planet: PlanetName, angle: 'MC' | 'IC', lon: number): CelestialLineFeature {
  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: [
        [lon, -85],
        [lon, 85],
      ],
    },
    properties: { planet, angle, label: `${planet} ${angle}` },
  };
}

function horizonFeature(
  planet: PlanetName,
  angle: 'AC' | 'DC',
  points: [number, number][],
): CelestialLineFeature {
  return {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: points },
    properties: { planet, angle, label: `${planet} ${angle}` },
  };
}

/**
 * Split a sequence of [lon, lat] points wherever consecutive longitudes
 * jump by more than 180° (a sign that the line wrapped around the
 * antimeridian). Returns one segment per visually-contiguous run so
 * Mapbox doesn't draw a horizontal line across the whole world.
 */
function splitOnLongitudeJumps(points: [number, number][]): [number, number][][] {
  if (points.length < 2) return points.length ? [points] : [];
  const segments: [number, number][][] = [];
  let current: [number, number][] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1][0];
    const curr = points[i][0];
    if (Math.abs(curr - prev) > 180) {
      if (current.length >= 2) segments.push(current);
      current = [points[i]];
    } else {
      current.push(points[i]);
    }
  }
  if (current.length >= 2) segments.push(current);
  return segments;
}

/**
 * Convenience: parse a local-time birth string + IANA tz + lat/lon into
 * the BirthData shape this module expects. The chart's geographic
 * location doesn't affect astrocartography lines themselves (the lines
 * are about WHERE in the world each planet was rising/setting AT THE
 * BIRTH INSTANT, not relative to the birth city), so we ignore birth
 * lat/lon here — but we still need to convert the local birth time to
 * UTC, which requires the birth-place timezone.
 */
export function birthDataFromLocalUTC(utcIsoString: string): BirthData {
  return { utcDate: new Date(utcIsoString) };
}
