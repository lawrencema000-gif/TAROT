/**
 * Canonical GEOCENTRIC ecliptic longitude for chart computation.
 *
 * WHY THIS EXISTS (the bug class it kills):
 * `Astronomy.EclipticLongitude(body, date)` returns the HELIOCENTRIC
 * J2000 ecliptic longitude — the planet as seen from the SUN. Western
 * astrology is geocentric: every chart position must be the planet as
 * seen from EARTH. Using the heliocentric value made Mercury/Venus/Mars
 * signs wrong most days (and produced astrologically impossible charts —
 * geocentric Mercury can never be more than ~28° from the Sun), froze
 * retrograde detection (heliocentric motion is always prograde), and
 * pinned the "Moon" opposite the Sun moving ~1°/day instead of ~13°.
 *
 * The correct calls, all in the true-ecliptic-of-date frame so they are
 * mutually consistent:
 *   Sun    → Astronomy.SunPosition(date).elon        (apparent, of-date)
 *   Moon   → Astronomy.EclipticGeoMoon(date).lon     (geocentric, of-date)
 *   others → Astronomy.Ecliptic(GeoVector(body, date, true)).elon
 *            (GeoVector: geocentric EQJ w/ light-travel + aberration;
 *             Ecliptic: EQJ → true ecliptic of date since v2.0)
 *
 * EVERY edge function that places a body on the zodiac MUST use this
 * helper. Do not call Astronomy.EclipticLongitude for chart positions —
 * it is only valid for heliocentric work (which we don't do).
 */

import * as Astronomy from "npm:astronomy-engine@2.1.19";

export type ChartBody = Astronomy.Body | "Sun" | "Moon";

export function geoEclipticLongitude(body: ChartBody, date: Date): number {
  if (body === "Sun" || body === Astronomy.Body.Sun) {
    return Astronomy.SunPosition(date).elon;
  }
  if (body === "Moon" || body === Astronomy.Body.Moon) {
    return Astronomy.EclipticGeoMoon(date).lon;
  }
  const vec = Astronomy.GeoVector(body as Astronomy.Body, date, true);
  return Astronomy.Ecliptic(vec).elon;
}

/**
 * Geocentric retrograde test via ±1-day central difference of the
 * GEOCENTRIC longitude. (The old heliocentric version never fired —
 * heliocentric motion is always prograde.)
 */
export function isRetrogradeGeo(body: ChartBody, date: Date): boolean {
  const dayMs = 86_400_000;
  const before = new Date(date.getTime() - dayMs);
  const after = new Date(date.getTime() + dayMs);
  let diff = geoEclipticLongitude(body, after) - geoEclipticLongitude(body, before);
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff < 0;
}
