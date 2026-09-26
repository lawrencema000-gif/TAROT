/**
 * Client-side natal-chart types + the ONE colour map every chart surface
 * reads. Mirrors the edge-function output (_shared/natal.ts NatalChart) and
 * bridges it to the wheel's model (types/astrology WheelChart).
 *
 * Before Phase 5c there were four colour schemes for the same aspects and
 * elements (wheel, grid, legend, list rows all disagreed; trine and sextile
 * shared a teal, square and opposition shared a rose). Everything now reads
 * from here, and the values here are the design tokens in tailwind.config.js
 * — change them there first, then here.
 */

import {
  PLANETS,
  ZODIAC_SIGNS,
  type Planet,
  type ZodiacSign,
  type AspectType,
  type Aspect,
  type PlanetPlacement,
  type WheelChart,
} from '../types/astrology';

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

// ─── Tokens ─────────────────────────────────────────────────────────
// Hexes from tailwind.config.js. SVG and canvas cannot read a Tailwind
// class, so the charts take the values from this object, by name.
export const CHART_TOKENS = {
  gold: '#d4af37',
  goldLight: '#f4d668',
  teal: '#4ecdc4',
  tealLight: '#7ee8e1',
  coral: '#e07a5f',
  coralLight: '#f4a390',
  blue: '#4a7eb8',
  blueInk: '#779eca',
  violet: '#8e6eb5',
  violetLight: '#a98fd0',
  violetInk: '#a58bc4',
  rose: '#d4848c',
  ink100: '#f2f2f7',
  ink300: '#c6c6d8',
  ink400: '#a3a3bd',
  ink600: '#7e7e9e',
  canvas: '#07070f',
  sunken: '#101024',
  surface: '#16162e',
  raised: '#1f1f3a',
  hairline: '#2c2c4c',
} as const;

/** `#rrggbb` + alpha → `rgba()`; the charts never concatenate hex-alpha strings. */
export function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return hex;
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ─── Glyphs ─────────────────────────────────────────────────────────
export const PLANET_GLYPH: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
};

// U+2648–2653 are Emoji_Presentation=Yes, so without the text variation
// selector (U+FE0E) Android and iOS paint them as colour emoji and ignore
// `fill`/`color`. The selector makes them text again wherever they render.
export const SIGN_GLYPH: Record<string, string> = {
  Aries: '♈︎', Taurus: '♉︎', Gemini: '♊︎', Cancer: '♋︎',
  Leo: '♌︎', Virgo: '♍︎', Libra: '♎︎', Scorpio: '♏︎',
  Sagittarius: '♐︎', Capricorn: '♑︎', Aquarius: '♒︎', Pisces: '♓︎',
};

export const SIGN_ORDER = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const;

export const ASPECT_GLYPH: Record<string, string> = {
  conjunction: '☌', opposition: '☍', trine: '△', square: '□', sextile: '✶',
};

// ─── Elements ───────────────────────────────────────────────────────
export type ChartTone = 'neutral' | 'gold' | 'teal' | 'coral' | 'blue' | 'violet' | 'rose';

/** Fill colour per element: Fire coral, Earth teal, Air blue, Water violet. */
export const ELEMENT_COLOR: Record<string, string> = {
  Fire: CHART_TOKENS.coral,
  Earth: CHART_TOKENS.teal,
  Air: CHART_TOKENS.blue,
  Water: CHART_TOKENS.violet,
};

/** Ink per element: the lighter variants that pass AA as a stroke on the canvas. */
export const ELEMENT_INK: Record<string, string> = {
  Fire: CHART_TOKENS.coralLight,
  Earth: CHART_TOKENS.tealLight,
  Air: CHART_TOKENS.blueInk,
  Water: CHART_TOKENS.violetInk,
};

/** Primitive tone (Tag, Progress) per element — the same hue as ELEMENT_COLOR. */
export const ELEMENT_TONE: Record<string, ChartTone> = {
  Fire: 'coral', Earth: 'teal', Air: 'blue', Water: 'violet',
};

export const MODALITY_TONE: Record<string, ChartTone> = {
  Cardinal: 'gold', Fixed: 'rose', Mutable: 'blue',
};

export const SIGN_ELEMENT: Record<string, string> = {
  Aries: 'Fire', Leo: 'Fire', Sagittarius: 'Fire',
  Taurus: 'Earth', Virgo: 'Earth', Capricorn: 'Earth',
  Gemini: 'Air', Libra: 'Air', Aquarius: 'Air',
  Cancer: 'Water', Scorpio: 'Water', Pisces: 'Water',
};

// ─── Aspects ────────────────────────────────────────────────────────
// One colour per aspect type. Opposition is not square, trine is not sextile.
export const ASPECT_COLOR: Record<string, string> = {
  conjunction: CHART_TOKENS.gold,
  opposition: CHART_TOKENS.violet,
  trine: CHART_TOKENS.teal,
  square: CHART_TOKENS.coral,
  sextile: CHART_TOKENS.blue,
};

export const ASPECT_TONE: Record<string, ChartTone> = {
  conjunction: 'gold', opposition: 'violet', trine: 'teal', square: 'coral', sextile: 'blue',
};

export interface AspectStroke {
  color: string;
  width: number;
  /** Dash pattern in viewBox units; solid when absent. */
  dash?: number[];
}

/** Stroke treatment per aspect type — the wheel's lines and the legend swatches share it. */
export const ASPECT_STYLE: Record<AspectType, AspectStroke> = {
  conjunction: { color: ASPECT_COLOR.conjunction, width: 1.6 },
  opposition:  { color: ASPECT_COLOR.opposition,  width: 1.4, dash: [1.2, 3.2] },
  trine:       { color: ASPECT_COLOR.trine,       width: 1.3 },
  square:      { color: ASPECT_COLOR.square,      width: 1.4, dash: [4, 3] },
  sextile:     { color: ASPECT_COLOR.sextile,     width: 1.1, dash: [2, 3] },
};

/** Orb ceilings for the "tight" filter — the aspects that define a chart. */
export const TIGHT_ORB: Record<AspectType, number> = {
  conjunction: 3, opposition: 3, trine: 2.5, square: 2.5, sextile: 1.5,
};

export const ASPECT_ORDER: AspectType[] = ['conjunction', 'opposition', 'trine', 'square', 'sextile'];

// ─── Other chart palettes ───────────────────────────────────────────
/** Firdaria time lords. */
export const TIME_LORD_COLOR: Record<string, string> = {
  Sun: CHART_TOKENS.gold,
  Moon: CHART_TOKENS.ink300,
  Mercury: CHART_TOKENS.blue,
  Venus: CHART_TOKENS.rose,
  Mars: CHART_TOKENS.coral,
  Jupiter: CHART_TOKENS.teal,
  Saturn: CHART_TOKENS.violet,
  'North Node': CHART_TOKENS.tealLight,
  'South Node': CHART_TOKENS.violetLight,
};

/** 五行 for the BaZi luck-pillar band. */
export const FIVE_ELEMENT_COLOR: Record<string, string> = {
  wood: CHART_TOKENS.teal,
  fire: CHART_TOKENS.coral,
  earth: CHART_TOKENS.gold,
  metal: CHART_TOKENS.ink300,
  water: CHART_TOKENS.blue,
};

/** Whether a luck pillar nourishes or drains the day master. */
export const FLAVOUR_COLOR: Record<string, string> = {
  supporting: CHART_TOKENS.teal,
  challenging: CHART_TOKENS.coral,
  neutral: CHART_TOKENS.ink400,
};

/** 四化 in the Zi Wei chart. */
export const ZIWEI_TRANSFORM_COLOR: Record<string, string> = {
  hua_lu: CHART_TOKENS.teal,
  hua_quan: CHART_TOKENS.gold,
  hua_ke: CHART_TOKENS.blue,
  hua_ji: CHART_TOKENS.coral,
};

// ─── Enum guards ────────────────────────────────────────────────────
const PLANET_SET = new Set<string>(PLANETS);
const SIGN_SET = new Set<string>(ZODIAC_SIGNS);
const ASPECT_SET = new Set<string>(ASPECT_ORDER);

export function isPlanet(s: string): s is Planet { return PLANET_SET.has(s); }
export function isZodiacSign(s: string): s is ZodiacSign { return SIGN_SET.has(s); }
export function isAspectType(s: string): s is AspectType { return ASPECT_SET.has(s); }

// ─── Adapter ────────────────────────────────────────────────────────
/**
 * The one bridge from the person-chart / chart-suite model to the wheel.
 * Bodies the wheel has no glyph for are left out (the wheel draws the ten
 * classical planets); their aspects go with them. Houses are passed only
 * when the source computed them, so a timeless chart never grows cusps.
 */
export function toWheelChart(chart: NatalChart): WheelChart {
  const planets: PlanetPlacement[] = [];
  for (const p of chart.planets) {
    if (!isPlanet(p.planet) || !isZodiacSign(p.sign)) continue;
    planets.push({
      planet: p.planet,
      sign: p.sign,
      degree: p.degree,
      longitude: typeof p.longitude === 'number' ? p.longitude : undefined,
      house: p.house,
      retrograde: p.retrograde,
    });
  }
  const aspects: Aspect[] = [];
  for (const a of chart.aspects) {
    if (!isPlanet(a.planet1) || !isPlanet(a.planet2) || !isAspectType(a.type)) continue;
    aspects.push({ planet1: a.planet1, planet2: a.planet2, type: a.type, orb: a.orb, applying: a.applying });
  }
  return {
    planets,
    houses: chart.hasHouses && chart.houses.length === 12 ? chart.houses : [],
    ascendant: chart.ascendant,
    midheaven: chart.midheaven,
    aspects,
  };
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
