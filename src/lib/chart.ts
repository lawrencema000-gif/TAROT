/**
 * Client-side natal-chart types + rendering helpers. Mirrors the edge-function
 * output (_shared/natal.ts NatalChart). Glyphs, colors, and the ecliptic→screen
 * projection used by NatalWheel and the other chart graphics.
 */

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

export const PLANET_GLYPH: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
};

export const SIGN_GLYPH: Record<string, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋', Leo: '♌', Virgo: '♍',
  Libra: '♎', Scorpio: '♏', Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
};

export const SIGN_ORDER = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const;

export const ELEMENT_COLOR: Record<string, string> = {
  Fire: '#e0684f', Earth: '#8caa6a', Air: '#7db0d8', Water: '#7a7fd0',
};
export const SIGN_ELEMENT: Record<string, keyof typeof ELEMENT_COLOR | string> = {
  Aries: 'Fire', Leo: 'Fire', Sagittarius: 'Fire',
  Taurus: 'Earth', Virgo: 'Earth', Capricorn: 'Earth',
  Gemini: 'Air', Libra: 'Air', Aquarius: 'Air',
  Cancer: 'Water', Scorpio: 'Water', Pisces: 'Water',
};

export const ASPECT_COLOR: Record<string, string> = {
  conjunction: '#d4a853', // gold — fusion
  trine: '#5cc9a7',       // teal — flow
  sextile: '#5cc9a7',
  square: '#e0684f',      // rose — friction
  opposition: '#e0684f',
};
export const ASPECT_GLYPH: Record<string, string> = {
  conjunction: '☌', opposition: '☍', trine: '△', square: '□', sextile: '✶',
};

/**
 * Project an ecliptic longitude (0-360, 0=Aries) onto a circle of radius r
 * centered at (cx, cy). Aries sits at the left (9 o'clock); longitude
 * increases counter-clockwise (Cancer top, Libra right, Capricorn bottom).
 * SVG y is flipped so +sin points up.
 */
export function eclipticToXY(lon: number, r: number, cx: number, cy: number): { x: number; y: number } {
  const theta = ((180 - lon) * Math.PI) / 180;
  return { x: cx + r * Math.cos(theta), y: cy - r * Math.sin(theta) };
}

/**
 * Cross-chart (synastry) aspects between two people's planets — pure geometry
 * on the ecliptic longitudes both charts already carry. Mirrors the server
 * computeSynastryAspects so we don't need a round-trip just to compare.
 */
const SYN_DEFS = [
  { type: 'conjunction', angle: 0, maxOrb: 8 },
  { type: 'opposition', angle: 180, maxOrb: 8 },
  { type: 'trine', angle: 120, maxOrb: 7 },
  { type: 'square', angle: 90, maxOrb: 7 },
  { type: 'sextile', angle: 60, maxOrb: 5 },
];
export function computeSynastry(a: PlanetData[], b: PlanetData[]): AspectData[] {
  const out: AspectData[] = [];
  for (const p1 of a) {
    for (const p2 of b) {
      let diff = Math.abs(p1.longitude - p2.longitude);
      if (diff > 180) diff = 360 - diff;
      for (const def of SYN_DEFS) {
        const orb = Math.abs(diff - def.angle);
        if (orb <= def.maxOrb) {
          out.push({ planet1: p1.planet, planet2: p2.planet, type: def.type, orb: Math.round(orb * 10) / 10, applying: diff < def.angle });
          break;
        }
      }
    }
  }
  // Tightest orbs first — the most defining connections.
  return out.sort((x, y) => x.orb - y.orb);
}

/** A rough 0-100 harmony score from cross-aspects (flowing aspects add,
 *  hard aspects subtract, weighted by the luminaries and tightness). */
export function synastryScore(aspects: AspectData[]): number {
  let score = 60;
  const weight = (p: string) => (p === 'Sun' || p === 'Moon' || p === 'Venus' ? 2 : 1);
  for (const a of aspects) {
    const w = weight(a.planet1) * weight(a.planet2) * (1 - a.orb / 10);
    if (a.type === 'trine' || a.type === 'sextile') score += 3 * w;
    else if (a.type === 'conjunction') score += 2 * w;
    else if (a.type === 'square' || a.type === 'opposition') score -= 2 * w;
  }
  return Math.max(5, Math.min(99, Math.round(score)));
}
