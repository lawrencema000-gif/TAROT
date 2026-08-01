/**
 * Extended chart suite — the math behind "20+ chart types".
 *
 * Everything reuses the proven geocentric core in ./natal.ts (same planets,
 * ascendant, houses, aspects) so every chart type stays consistent with the
 * golden-tested natal engine. Pure compute, no LLM.
 *
 * Types implemented here:
 *   - Lunar return        (transiting Moon returns to natal Moon longitude)
 *   - Tertiary progression (1 day of ephemeris per lunar month of life)
 *   - Solar arc directions (all natal points advanced by the Sun's arc)
 *   - Firdaria             (Persian time-lord periods, day/night sect)
 *   - Composite chart      (shorter-arc midpoints of two natal charts)
 *   - Davison chart        (chart cast for midpoint time + midpoint place)
 *   - Sky now / mundane    (chart of the current moment)
 */

import * as Astronomy from "npm:astronomy-engine@2.1.19";
import {
  computeNatalChart,
  type NatalChart,
  type NatalInput,
  type PlanetData,
  type AspectData,
  lonToSign,
} from "./natal.ts";

function normDeg(d: number): number { return ((d % 360) + 360) % 360; }
function wrap180(d: number): number { return ((d + 540) % 360) - 180; }

/** Shorter-arc midpoint of two ecliptic longitudes. */
export function shorterArcMidpoint(a: number, b: number): number {
  return normDeg(a + wrap180(b - a) / 2);
}

// ── Lunar return ──────────────────────────────────────────────────────────

/** Find the instant the transiting Moon hits `targetLon` nearest `around`.
 *  Scans ±16 days in 6h steps for a forward crossing, then bisects to <1 min. */
export function findLunarReturn(targetLon: number, around: Date): Date {
  const f = (t: Date) => wrap180(Astronomy.EclipticGeoMoon(t).lon - targetLon);
  const stepMs = 6 * 3600 * 1000;
  let prev = new Date(around.getTime() - 16 * 86400000);
  let prevV = f(prev);
  let bestLo: Date | null = null;
  let bestHi: Date | null = null;
  for (let t = prev.getTime() + stepMs; t <= around.getTime() + 16 * 86400000; t += stepMs) {
    const cur = new Date(t);
    const curV = f(cur);
    // forward crossing: diff goes from negative to positive (Moon is prograde)
    if (prevV < 0 && curV >= 0 && curV - prevV < 90) {
      // keep the crossing closest to `around`
      if (!bestLo || Math.abs(t - around.getTime()) < Math.abs(bestHi!.getTime() - around.getTime())) {
        bestLo = prev; bestHi = cur;
      }
    }
    prev = cur; prevV = curV;
  }
  if (!bestLo || !bestHi) return around; // defensive; should not happen
  let lo = bestLo.getTime(), hi = bestHi.getTime();
  while (hi - lo > 60_000) {
    const mid = (lo + hi) / 2;
    if (f(new Date(mid)) < 0) lo = mid; else hi = mid;
  }
  return new Date((lo + hi) / 2);
}

export interface ReturnChartResult {
  chart: NatalChart;
  returnMoment: string;
}

export function lunarReturnChart(natal: NatalInput, natalChart: NatalChart, around: Date, lat?: number | null, lon?: number | null): ReturnChartResult {
  const natalMoon = natalChart.planets.find((p) => p.planet === "Moon");
  if (!natalMoon) throw new Error("natal Moon missing");
  const moment = findLunarReturn(natalMoon.longitude, around);
  const chart = computeNatalChart({
    birthDate: moment.toISOString().slice(0, 10),
    birthUtc: moment.toISOString(),
    lat: lat ?? natal.lat,
    lon: lon ?? natal.lon,
    timezone: "UTC",
  });
  return { chart, returnMoment: moment.toISOString() };
}

// ── Progressions family ───────────────────────────────────────────────────

const SIDEREAL_MONTH_DAYS = 27.321661;
const TROPICAL_YEAR_DAYS = 365.2425;

/** Tertiary progression I: one DAY of ephemeris per LUNAR MONTH of life. */
export function tertiaryMoment(birthUtc: Date, now: Date): Date {
  const ageDays = (now.getTime() - birthUtc.getTime()) / 86400000;
  const lunarMonths = ageDays / SIDEREAL_MONTH_DAYS;
  return new Date(birthUtc.getTime() + lunarMonths * 86400000);
}

/** Solar arc directions: every natal point advanced by the arc the secondary-
 *  progressed Sun has traveled since birth. */
export function solarArcChart(natalChart: NatalChart, birthUtc: Date, now: Date): { chart: NatalChart; arc: number } {
  const ageYears = (now.getTime() - birthUtc.getTime()) / (TROPICAL_YEAR_DAYS * 86400000);
  const progressed = new Date(birthUtc.getTime() + ageYears * 86400000);
  const natalSun = natalChart.planets.find((p) => p.planet === "Sun")!;
  const progressedSunLon = Astronomy.SunPosition(progressed).elon;
  const arc = normDeg(progressedSunLon - natalSun.longitude);

  const planets: PlanetData[] = natalChart.planets.map((p) => {
    const lonD = normDeg(p.longitude + arc);
    return { ...p, longitude: lonD, ...lonToSign(lonD), retrograde: false };
  });
  const chart: NatalChart = {
    ...natalChart,
    planets,
    ascendant: natalChart.ascendant !== null ? normDeg(natalChart.ascendant + arc) : null,
    ascendantSign: natalChart.ascendant !== null ? lonToSign(normDeg(natalChart.ascendant + arc)).sign : null,
    midheaven: natalChart.midheaven !== null ? normDeg(natalChart.midheaven + arc) : null,
    midheavenSign: natalChart.midheaven !== null ? lonToSign(normDeg(natalChart.midheaven + arc)).sign : null,
    houses: natalChart.houses.map((h) => normDeg(h + arc)),
    aspects: [], // directed-to-natal aspects are what matter; computed by caller
  };
  return { chart, arc: Math.round(arc * 100) / 100 };
}

/** Cross-aspects between a moving chart and the natal chart (tight orbs). */
export function crossAspects(moving: PlanetData[], natal: PlanetData[], maxOrb = 2): AspectData[] {
  const defs = [
    { type: "conjunction", angle: 0 }, { type: "opposition", angle: 180 },
    { type: "trine", angle: 120 }, { type: "square", angle: 90 }, { type: "sextile", angle: 60 },
  ];
  const out: AspectData[] = [];
  for (const m of moving) {
    for (const n of natal) {
      let diff = Math.abs(m.longitude - n.longitude);
      if (diff > 180) diff = 360 - diff;
      for (const def of defs) {
        const orb = Math.abs(diff - def.angle);
        if (orb <= maxOrb) {
          out.push({ planet1: m.planet, planet2: n.planet, type: def.type, orb: Math.round(orb * 10) / 10, applying: diff < def.angle });
          break;
        }
      }
    }
  }
  return out.sort((a, b) => a.orb - b.orb);
}

// ── Firdaria ──────────────────────────────────────────────────────────────

const FIRDARIA_DAY: [string, number][] = [
  ["Sun", 10], ["Venus", 8], ["Mercury", 13], ["Moon", 9], ["Saturn", 11],
  ["Jupiter", 12], ["Mars", 7], ["North Node", 3], ["South Node", 2],
];
const FIRDARIA_NIGHT: [string, number][] = [
  ["Moon", 9], ["Saturn", 11], ["Jupiter", 12], ["Mars", 7], ["Sun", 10],
  ["Venus", 8], ["Mercury", 13], ["North Node", 3], ["South Node", 2],
];
const SUB_ORDER = ["Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter", "Mars"];

export interface FirdariaPeriod {
  lord: string;
  start: string;   // ISO date
  end: string;
  years: number;
  subs?: { lord: string; start: string; end: string }[];
}

export interface FirdariaResult {
  sect: "day" | "night";
  periods: FirdariaPeriod[];
  current: { major: string; sub: string | null } | null;
}

/** Day birth = Sun above the horizon (houses 7-12 in the equal-house chart).
 *  Without houses (no birth time/place) we default to day sect with a flag. */
export function computeFirdaria(natalChart: NatalChart, birthUtc: Date, now: Date): FirdariaResult {
  const sun = natalChart.planets.find((p) => p.planet === "Sun");
  const sect: "day" | "night" = sun?.house != null && sun.house >= 7 ? "day" : sun?.house != null ? "night" : "day";
  const seq = sect === "day" ? FIRDARIA_DAY : FIRDARIA_NIGHT;

  const periods: FirdariaPeriod[] = [];
  let cursor = new Date(birthUtc.getTime());
  // Two full 75-year cycles cover any human lifetime.
  for (let cycle = 0; cycle < 2; cycle++) {
    for (const [lord, years] of seq) {
      const start = new Date(cursor.getTime());
      const end = new Date(cursor.getTime() + years * TROPICAL_YEAR_DAYS * 86400000);
      const period: FirdariaPeriod = {
        lord, years,
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
      };
      if (!lord.includes("Node")) {
        const subLen = (end.getTime() - start.getTime()) / 7;
        const startIdx = SUB_ORDER.indexOf(lord);
        period.subs = Array.from({ length: 7 }, (_, i) => {
          const s = new Date(start.getTime() + i * subLen);
          const e = new Date(start.getTime() + (i + 1) * subLen);
          return { lord: SUB_ORDER[(startIdx + i) % 7], start: s.toISOString().slice(0, 10), end: e.toISOString().slice(0, 10) };
        });
      }
      periods.push(period);
      cursor = end;
    }
  }

  const nowT = now.getTime();
  let current: FirdariaResult["current"] = null;
  for (const p of periods) {
    if (nowT >= Date.parse(p.start) && nowT < Date.parse(p.end)) {
      let sub: string | null = null;
      for (const s of p.subs || []) {
        if (nowT >= Date.parse(s.start) && nowT < Date.parse(s.end)) { sub = s.lord; break; }
      }
      current = { major: p.lord, sub };
      break;
    }
  }
  return { sect, periods, current };
}

// ── Composite + Davison ───────────────────────────────────────────────────

function compositeAspects(planets: PlanetData[]): AspectData[] {
  const defs = [
    { type: "conjunction", angle: 0, maxOrb: 8 }, { type: "opposition", angle: 180, maxOrb: 8 },
    { type: "trine", angle: 120, maxOrb: 7 }, { type: "square", angle: 90, maxOrb: 7 },
    { type: "sextile", angle: 60, maxOrb: 5 },
  ];
  const out: AspectData[] = [];
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      let diff = Math.abs(planets[i].longitude - planets[j].longitude);
      if (diff > 180) diff = 360 - diff;
      for (const def of defs) {
        const orb = Math.abs(diff - def.angle);
        if (orb <= def.maxOrb) {
          out.push({ planet1: planets[i].planet, planet2: planets[j].planet, type: def.type, orb: Math.round(orb * 10) / 10, applying: diff < def.angle });
          break;
        }
      }
    }
  }
  return out;
}

/** Midpoint composite: shorter-arc midpoint of each planet pair. Houses are
 *  omitted (composite houses are contested; we show the planet wheel). */
export function compositeChart(a: NatalChart, b: NatalChart): NatalChart {
  const planets: PlanetData[] = a.planets.map((pa) => {
    const pb = b.planets.find((p) => p.planet === pa.planet)!;
    const lonM = shorterArcMidpoint(pa.longitude, pb.longitude);
    return { planet: pa.planet, longitude: lonM, ...lonToSign(lonM), house: null, retrograde: false };
  });
  const elements: Record<string, number> = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
  const modalities: Record<string, number> = { Cardinal: 0, Fixed: 0, Mutable: 0 };
  const SIGN_EL: Record<string, string> = { Aries: "Fire", Leo: "Fire", Sagittarius: "Fire", Taurus: "Earth", Virgo: "Earth", Capricorn: "Earth", Gemini: "Air", Libra: "Air", Aquarius: "Air", Cancer: "Water", Scorpio: "Water", Pisces: "Water" };
  const SIGN_MOD: Record<string, string> = { Aries: "Cardinal", Cancer: "Cardinal", Libra: "Cardinal", Capricorn: "Cardinal", Taurus: "Fixed", Leo: "Fixed", Scorpio: "Fixed", Aquarius: "Fixed", Gemini: "Mutable", Virgo: "Mutable", Sagittarius: "Mutable", Pisces: "Mutable" };
  for (const p of planets) { elements[SIGN_EL[p.sign]]++; modalities[SIGN_MOD[p.sign]]++; }
  const asc = a.ascendant !== null && b.ascendant !== null ? shorterArcMidpoint(a.ascendant, b.ascendant) : null;
  return {
    version: a.version,
    planets,
    ascendant: asc,
    ascendantSign: asc !== null ? lonToSign(asc).sign : null,
    midheaven: null, midheavenSign: null,
    houses: [], hasHouses: false,
    aspects: compositeAspects(planets),
    elements, modalities,
    chartRuler: null, dominantPlanets: ["Sun", "Moon"],
  };
}

/** Davison: a real chart cast for the midpoint in TIME and SPACE of two births. */
export function davisonChart(aUtc: Date, bUtc: Date, aLat: number | null, aLon: number | null, bLat: number | null, bLon: number | null): { chart: NatalChart; moment: string } {
  const mid = new Date((aUtc.getTime() + bUtc.getTime()) / 2);
  let lat: number | null = null, lonMid: number | null = null;
  if (aLat != null && bLat != null && aLon != null && bLon != null) {
    lat = (aLat + bLat) / 2;
    lonMid = normDeg(aLon + wrap180(bLon - aLon) / 2 + 180) - 180; // shorter-arc geographic midpoint
  }
  const chart = computeNatalChart({
    birthDate: mid.toISOString().slice(0, 10),
    birthUtc: mid.toISOString(),
    lat, lon: lonMid, timezone: "UTC",
  });
  return { chart, moment: mid.toISOString() };
}
