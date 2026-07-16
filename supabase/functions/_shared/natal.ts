/**
 * Shared natal-chart computation — the proven geocentric math extracted from
 * astrology-compute-natal so the People feature (astrology-person-chart) and
 * synastry compute identical charts. Every placement is geocentric,
 * true-ecliptic-of-date; the Ascendant uses the corrected textbook formula.
 *
 * CHART_VERSION mirrors astrology-compute-natal — bump both together.
 */

import * as Astronomy from "npm:astronomy-engine@2.1.19";
import { geoEclipticLongitude, isRetrogradeGeo } from "./astro.ts";

export const CHART_VERSION = 2;

export const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;

const SIGN_ELEMENTS: Record<string, string> = {
  Aries: "Fire", Taurus: "Earth", Gemini: "Air", Cancer: "Water",
  Leo: "Fire", Virgo: "Earth", Libra: "Air", Scorpio: "Water",
  Sagittarius: "Fire", Capricorn: "Earth", Aquarius: "Air", Pisces: "Water",
};
const SIGN_MODALITIES: Record<string, string> = {
  Aries: "Cardinal", Taurus: "Fixed", Gemini: "Mutable", Cancer: "Cardinal",
  Leo: "Fixed", Virgo: "Mutable", Libra: "Cardinal", Scorpio: "Fixed",
  Sagittarius: "Mutable", Capricorn: "Cardinal", Aquarius: "Fixed", Pisces: "Mutable",
};
const SIGN_RULERS: Record<string, string> = {
  Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon",
  Leo: "Sun", Virgo: "Mercury", Libra: "Venus", Scorpio: "Pluto",
  Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Uranus", Pisces: "Neptune",
};

export interface PlanetData {
  planet: string;
  sign: string;
  degree: number;
  longitude: number;
  house: number | null;
  retrograde: boolean;
}
export interface AspectData {
  planet1: string;
  planet2: string;
  type: string;
  orb: number;
  applying: boolean;
}
export interface NatalChart {
  version: number;
  planets: PlanetData[];
  ascendant: number | null;
  ascendantSign: string | null;
  midheaven: number | null;
  midheavenSign: string | null;
  houses: number[];
  hasHouses: boolean;
  aspects: AspectData[];
  elements: Record<string, number>;
  modalities: Record<string, number>;
  chartRuler: string | null;
  dominantPlanets: string[];
}

function normDeg(d: number): number { return ((d % 360) + 360) % 360; }

export function lonToSign(lon: number) {
  const n = normDeg(lon);
  const idx = Math.floor(n / 30);
  return { sign: SIGNS[idx], degree: Math.round((n % 30) * 100) / 100 };
}

/** Interpret a local birth time in an IANA timezone as a UTC instant.
 *  Prefer a precomputed birthUtc (DB trigger) when available. */
export function localToUTC(birthDate: string, birthTime: string | null, timezone: string): Date {
  const timeStr = (birthTime && /^\d{2}:\d{2}/.test(birthTime))
    ? (birthTime.length === 5 ? `${birthTime}:00` : birthTime)
    : "12:00:00";
  const dtStr = `${birthDate}T${timeStr}`;
  const tempUtc = new Date(dtStr + "Z");
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    }).formatToParts(tempUtc);
    const p: Record<string, string> = {};
    for (const part of parts) p[part.type] = part.value;
    const hour = p.hour === "24" ? "00" : p.hour;
    const localStr = `${p.year}-${p.month}-${p.day}T${hour}:${p.minute}:${p.second}Z`;
    const offsetMs = new Date(localStr).getTime() - tempUtc.getTime();
    return new Date(tempUtc.getTime() - offsetMs);
  } catch {
    return tempUtc;
  }
}

function computeAscendant(utcDate: Date, lat: number, lon: number): number {
  const gst = Astronomy.SiderealTime(utcDate);
  const lst = ((gst + lon / 15) % 24 + 24) % 24;
  const ramc = lst * 15;
  const obliquity = 23.4393;
  const latRad = (lat * Math.PI) / 180;
  const oblRad = (obliquity * Math.PI) / 180;
  const ramcRad = (ramc * Math.PI) / 180;
  const y = Math.cos(ramcRad);
  const x = -(Math.sin(ramcRad) * Math.cos(oblRad) + Math.tan(latRad) * Math.sin(oblRad));
  return normDeg((Math.atan2(y, x) * 180) / Math.PI);
}

function computeMidheaven(utcDate: Date, lon: number): number {
  const gst = Astronomy.SiderealTime(utcDate);
  const lst = ((gst + lon / 15) % 24 + 24) % 24;
  const ramc = (lst * 15) * (Math.PI / 180);
  const oblRad = (23.4393 * Math.PI) / 180;
  const mc = Math.atan2(Math.tan(ramc), Math.cos(oblRad));
  return normDeg((mc * 180) / Math.PI);
}

function computeEqualHouses(ascendant: number): number[] {
  return Array.from({ length: 12 }, (_, i) => normDeg(ascendant + i * 30));
}

function findHouse(lon: number, cusps: number[]): number {
  const n = normDeg(lon);
  for (let i = 0; i < 12; i++) {
    const curr = cusps[i]; const next = cusps[(i + 1) % 12];
    if (curr <= next) { if (n >= curr && n < next) return i + 1; }
    else { if (n >= curr || n < next) return i + 1; }
  }
  return 1;
}

function computePlanets(utcDate: Date, houseCusps: number[] | null): PlanetData[] {
  const planets: PlanetData[] = [];
  const sunLon = Astronomy.SunPosition(utcDate).elon;
  planets.push({ planet: "Sun", longitude: sunLon, ...lonToSign(sunLon), house: houseCusps ? findHouse(sunLon, houseCusps) : null, retrograde: false });
  const moonLon = Astronomy.EclipticGeoMoon(utcDate).lon;
  planets.push({ planet: "Moon", longitude: moonLon, ...lonToSign(moonLon), house: houseCusps ? findHouse(moonLon, houseCusps) : null, retrograde: false });
  const bodyMap: [string, Astronomy.Body][] = [
    ["Mercury", Astronomy.Body.Mercury], ["Venus", Astronomy.Body.Venus], ["Mars", Astronomy.Body.Mars],
    ["Jupiter", Astronomy.Body.Jupiter], ["Saturn", Astronomy.Body.Saturn], ["Uranus", Astronomy.Body.Uranus],
    ["Neptune", Astronomy.Body.Neptune], ["Pluto", Astronomy.Body.Pluto],
  ];
  for (const [name, body] of bodyMap) {
    const lon = geoEclipticLongitude(body, utcDate);
    planets.push({ planet: name, longitude: lon, ...lonToSign(lon), house: houseCusps ? findHouse(lon, houseCusps) : null, retrograde: isRetrogradeGeo(body, utcDate) });
  }
  return planets;
}

function computeAspects(planets: PlanetData[]): AspectData[] {
  const aspectDefs = [
    { type: "conjunction", angle: 0, maxOrb: 8 },
    { type: "opposition", angle: 180, maxOrb: 8 },
    { type: "trine", angle: 120, maxOrb: 8 },
    { type: "square", angle: 90, maxOrb: 7 },
    { type: "sextile", angle: 60, maxOrb: 6 },
  ];
  const aspects: AspectData[] = [];
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      let diff = Math.abs(planets[i].longitude - planets[j].longitude);
      if (diff > 180) diff = 360 - diff;
      for (const def of aspectDefs) {
        const orb = Math.abs(diff - def.angle);
        if (orb <= def.maxOrb) {
          aspects.push({ planet1: planets[i].planet, planet2: planets[j].planet, type: def.type, orb: Math.round(orb * 10) / 10, applying: diff < def.angle });
          break;
        }
      }
    }
  }
  return aspects;
}

export interface NatalInput {
  birthDate: string;
  birthTime?: string | null;
  birthUtc?: string | null;   // preferred canonical instant (DB trigger)
  lat?: number | null;
  lon?: number | null;
  timezone?: string | null;
}

/** Compute a full natal chart. Houses/ascendant require lat+lon; without them
 *  the chart still returns planets, signs, aspects and dominants. */
export function computeNatalChart(input: NatalInput): NatalChart {
  const utcDate = input.birthUtc && !Number.isNaN(new Date(input.birthUtc).getTime())
    ? new Date(input.birthUtc)
    : localToUTC(input.birthDate, input.birthTime ?? null, input.timezone || "UTC");

  const hasCoords = typeof input.lat === "number" && typeof input.lon === "number";
  let ascendant: number | null = null;
  let midheaven: number | null = null;
  let houseCusps: number[] | null = null;
  if (hasCoords) {
    ascendant = computeAscendant(utcDate, input.lat as number, input.lon as number);
    midheaven = computeMidheaven(utcDate, input.lon as number);
    houseCusps = computeEqualHouses(ascendant);
  }

  const planets = computePlanets(utcDate, houseCusps);
  const aspects = computeAspects(planets);

  const elements: Record<string, number> = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
  const modalities: Record<string, number> = { Cardinal: 0, Fixed: 0, Mutable: 0 };
  for (const p of planets) {
    const el = SIGN_ELEMENTS[p.sign]; const mod = SIGN_MODALITIES[p.sign];
    if (el) elements[el]++; if (mod) modalities[mod]++;
  }
  const ascSign = ascendant !== null ? lonToSign(ascendant).sign : null;
  const chartRuler = ascSign ? (SIGN_RULERS[ascSign] || null) : null;
  const dominantPlanets = ["Sun", "Moon"];
  if (chartRuler && !dominantPlanets.includes(chartRuler)) dominantPlanets.push(chartRuler);

  return {
    version: CHART_VERSION,
    planets,
    ascendant,
    ascendantSign: ascSign,
    midheaven,
    midheavenSign: midheaven !== null ? lonToSign(midheaven).sign : null,
    houses: houseCusps || [],
    hasHouses: hasCoords,
    aspects,
    elements,
    modalities,
    chartRuler,
    dominantPlanets,
  };
}

/** Cross-chart aspects between two people (synastry). */
export function computeSynastryAspects(a: PlanetData[], b: PlanetData[]): AspectData[] {
  const aspectDefs = [
    { type: "conjunction", angle: 0, maxOrb: 8 },
    { type: "opposition", angle: 180, maxOrb: 8 },
    { type: "trine", angle: 120, maxOrb: 7 },
    { type: "square", angle: 90, maxOrb: 7 },
    { type: "sextile", angle: 60, maxOrb: 5 },
  ];
  const out: AspectData[] = [];
  for (const p1 of a) {
    for (const p2 of b) {
      let diff = Math.abs(p1.longitude - p2.longitude);
      if (diff > 180) diff = 360 - diff;
      for (const def of aspectDefs) {
        const orb = Math.abs(diff - def.angle);
        if (orb <= def.maxOrb) {
          out.push({ planet1: p1.planet, planet2: p2.planet, type: def.type, orb: Math.round(orb * 10) / 10, applying: diff < def.angle });
          break;
        }
      }
    }
  }
  return out;
}
