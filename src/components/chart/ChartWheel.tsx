import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HOUSE_THEMES,
  type NatalChart,
  type Planet,
  type ZodiacSign,
  type AspectType,
} from '../../types/astrology';
import {
  PlanetGlyph,
  ZodiacGlyph,
  PlanetGlyphPaths,
  ZodiacGlyphPaths,
} from '../icons';
import { useT } from '../../i18n/useT';

/**
 * Interactive natal chart wheel — astrolabe edition.
 *
 * Redesign 2026-04-25 replaces the previous flat-radar aesthetic with
 * a full illuminated-manuscript treatment:
 *
 *   1. Double gold bead border (outer + inner rings with 36 beads +
 *      four cardinal diamond markers) — reads as an engraved frame,
 *      not a radar dish.
 *   2. Degree tick markings — 1°, 5°, and 30° ticks at different
 *      lengths/opacities give the wheel a measured astrolabe feel.
 *   3. Element-tinted sign sectors — Fire=coral, Earth=teal,
 *      Air=cosmic-blue, Water=cosmic-violet at ~8% opacity, so the
 *      signs read as a colored cycle rather than a uniform grey.
 *   4. Cardinal axis (ASC / DESC / MC / IC) emphasized with thicker
 *      gold beams, four-point star caps, and serif-italic labels.
 *   5. Planet glyphs rendered as engraved coins (dark center + bead
 *      ring + inner hairline + SVG path glyph, no Unicode).
 *   6. Aspect lines typed by aspect kind — conjunction solid gold,
 *      trine solid teal, sextile blue-dashed, square coral-dashed,
 *      opposition violet-dotted.
 *   7. Compass-rose center (12 rays + central dot) replaces the
 *      empty middle; house numbers are Roman numerals in serif,
 *      with bolder weight on the four angular houses.
 *   Bonus: parchment noise clipped to the wheel interior, outer
 *   glow ring, and a scale-in mount animation.
 *
 * Pure client-side SVG. No bundle impact beyond the component itself.
 * Tap a planet to surface details below the wheel. Tap a house sector
 * for the house theme. Tap an aspect line to see the pair + orb.
 */

export interface OverlayPlanet {
  planet: Planet;
  sign: ZodiacSign;
  degree: number;
  longitude?: number;
}

interface ChartWheelProps {
  chart: NatalChart;
  /** Optional transit (or progressed) planets drawn as an outer ring. */
  overlay?: OverlayPlanet[];
  /** Label for the overlay (e.g. "Today" or "2026-05-01"). */
  overlayLabel?: string;
}

// ─── Aspect styling ────────────────────────────────────────────────
// Each aspect type gets its own color + stroke treatment so you can
// read the chart's relationships at a glance without reading labels.
const ASPECT_STYLE: Record<
  AspectType,
  { color: string; dasharray?: string; width: number; opacity: number }
> = {
  conjunction: { color: '#d4af37', width: 1.4, opacity: 0.75 },             // solid gold
  opposition:  { color: '#8e6eb5', width: 1.3, opacity: 0.7, dasharray: '1 4' },   // violet dotted
  trine:       { color: '#4ecdc4', width: 1.2, opacity: 0.7 },             // solid teal
  square:      { color: '#e07a5f', width: 1.3, opacity: 0.7, dasharray: '4 3' },   // coral dashed
  sextile:     { color: '#4a7eb8', width: 1.0, opacity: 0.6, dasharray: '2 3' },   // blue short-dashed
};

// ─── Sign → element map for tinted sector fills ───────────────────
const SIGNS: ZodiacSign[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

const SIGN_ELEMENT_FILL: Record<ZodiacSign, string> = {
  Aries:       'rgba(224, 122, 95, 0.10)', // Fire
  Leo:         'rgba(224, 122, 95, 0.10)',
  Sagittarius: 'rgba(224, 122, 95, 0.10)',
  Taurus:      'rgba(78, 205, 196, 0.10)', // Earth
  Virgo:       'rgba(78, 205, 196, 0.10)',
  Capricorn:   'rgba(78, 205, 196, 0.10)',
  Gemini:      'rgba(74, 126, 184, 0.10)', // Air
  Libra:       'rgba(74, 126, 184, 0.10)',
  Aquarius:    'rgba(74, 126, 184, 0.10)',
  Cancer:      'rgba(142, 110, 181, 0.10)', // Water
  Scorpio:     'rgba(142, 110, 181, 0.10)',
  Pisces:      'rgba(142, 110, 181, 0.10)',
};

// Glyph color keyed off element for a subtle color-coded ring.
const SIGN_GLYPH_COLOR: Record<ZodiacSign, string> = {
  Aries:       '#e89a87', Leo: '#e89a87', Sagittarius: '#e89a87',
  Taurus:      '#7ee8e1', Virgo: '#7ee8e1', Capricorn: '#7ee8e1',
  Gemini:      '#8fb9e6', Libra: '#8fb9e6', Aquarius: '#8fb9e6',
  Cancer:      '#b19ed1', Scorpio: '#b19ed1', Pisces: '#b19ed1',
};

// ─── Selection state ──────────────────────────────────────────────
type Selection =
  | { kind: 'planet'; planet: Planet; sign: ZodiacSign; degree: number; house: number | null }
  | { kind: 'transit'; planet: Planet; sign: ZodiacSign; degree: number }
  | { kind: 'house'; index: number }
  | { kind: 'aspect'; planet1: Planet; planet2: Planet; type: AspectType; orb: number }
  | null;

// ─── Coordinate helpers ───────────────────────────────────────────
// Convert ecliptic longitude to SVG angle. Chart convention: Ascendant
// on the left (9 o'clock = 180° in SVG angle). Longitudes increase
// counterclockwise in traditional charts — but SVG angles increase
// clockwise. So we flip.
function lonToSvgAngle(lon: number, ascLon: number | null): number {
  const asc = ascLon ?? 0;
  const rel = ((lon - asc) % 360 + 360) % 360;   // degrees CCW from ASC
  return 180 - rel;                              // SVG degrees (0 = right, +CW)
}

function polar(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function sectorPath(cx: number, cy: number, rInner: number, rOuter: number, startDeg: number, endDeg: number): string {
  const s1 = polar(cx, cy, rOuter, startDeg);
  const s2 = polar(cx, cy, rOuter, endDeg);
  const i1 = polar(cx, cy, rInner, endDeg);
  const i2 = polar(cx, cy, rInner, startDeg);
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  return [
    `M ${s1.x.toFixed(2)} ${s1.y.toFixed(2)}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${s2.x.toFixed(2)} ${s2.y.toFixed(2)}`,
    `L ${i1.x.toFixed(2)} ${i1.y.toFixed(2)}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${i2.x.toFixed(2)} ${i2.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

function shouldShowAspect(type: AspectType, orb: number): boolean {
  const tight: Record<AspectType, number> = {
    conjunction: 3, opposition: 3, trine: 2.5, square: 2.5, sextile: 1.5,
  };
  return orb <= tight[type];
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

// ─── Component ────────────────────────────────────────────────────
export function ChartWheel({ chart, overlay, overlayLabel }: ChartWheelProps) {
  const { t } = useT('app');
  const [selection, setSelection] = useState<Selection>(null);

  // Geometry — a 360x360 viewBox with the wheel centered.
  const cx = 180, cy = 180;
  const rOuterBead   = 172;   // outer bead border
  const rOuterInner  = 162;   // inner bead border
  const rSign        = 148;   // sign ring outer edge
  const rSignInner   = 120;   // sign ring inner edge
  const rTransit     = 108;   // transit glyph ring
  const rHouseNum    = 92;    // where Roman numerals sit
  const rPlanet      = 76;    // natal planet coin centers
  const rAspectEdge  = 58;    // aspect line endpoints
  const rRosetteOut  = 34;    // compass rose outer radius
  const rRosetteIn   = 6;     // compass rose inner dot radius

  const ascLon = chart.ascendant;

  // Spread overlay planets within ~6° so glyphs don't collide.
  const placedOverlay = useMemo(() => {
    if (!overlay) return [];
    const list = overlay
      .filter((o) => typeof o.longitude === 'number')
      .map((o) => ({ ...o, svgAngle: lonToSvgAngle(o.longitude as number, ascLon) }))
      .sort((a, b) => a.svgAngle - b.svgAngle);
    const spread = 6;
    for (let i = 1; i < list.length; i++) {
      const gap = list[i].svgAngle - list[i - 1].svgAngle;
      if (Math.abs(gap) < spread) list[i].svgAngle = list[i - 1].svgAngle + spread;
    }
    return list;
  }, [overlay, ascLon]);

  // Spread natal planets similarly.
  const placedPlanets = useMemo(() => {
    const byAngle = chart.planets
      .map((p) => ({ ...p, svgAngle: lonToSvgAngle(p.longitude ?? 0, ascLon) }))
      .sort((a, b) => a.svgAngle - b.svgAngle);
    const spread = 5;
    for (let i = 1; i < byAngle.length; i++) {
      const gap = byAngle[i].svgAngle - byAngle[i - 1].svgAngle;
      if (Math.abs(gap) < spread) {
        byAngle[i].svgAngle = byAngle[i - 1].svgAngle + spread;
      }
    }
    return byAngle;
  }, [chart.planets, ascLon]);

  // House cusps if present, else equal houses from ASC.
  const houseCuspsLon: number[] = useMemo(() => {
    if (chart.houses && chart.houses.length === 12) return chart.houses;
    const asc = ascLon ?? 0;
    return Array.from({ length: 12 }, (_, i) => (asc + i * 30) % 360);
  }, [chart.houses, ascLon]);

  return (
    <div className="space-y-3">
      <motion.div
        className="relative mx-auto"
        style={{ maxWidth: 380 }}
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      >
        <svg viewBox="0 0 360 360" className="w-full h-auto" role="img" aria-label="Natal chart wheel">
          <defs>
            {/* Parchment fill clipped to the wheel interior */}
            <clipPath id="natalInterior">
              <circle cx={cx} cy={cy} r={rOuterInner - 1} />
            </clipPath>
            <filter id="parchmentNoiseNatal">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" />
              <feColorMatrix values="0 0 0 0 0.83
                                     0 0 0 0 0.69
                                     0 0 0 0 0.22
                                     0 0 0 0.035 0" />
            </filter>
            {/* Outer glow gradient */}
            <radialGradient id="outerGlow" cx="50%" cy="50%" r="50%">
              <stop offset="85%" stopColor="rgba(212,175,55,0)" />
              <stop offset="95%" stopColor="rgba(212,175,55,0.25)" />
              <stop offset="100%" stopColor="rgba(212,175,55,0)" />
            </radialGradient>
            {/* Aspect stroke gradients — fade at the middle so lines feel drawn rather than scanned */}
            {(Object.keys(ASPECT_STYLE) as AspectType[]).map((t) => {
              const c = ASPECT_STYLE[t].color;
              return (
                <linearGradient id={`aspect-${t}`} key={t} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={c} stopOpacity="0.95" />
                  <stop offset="50%" stopColor={c} stopOpacity="0.55" />
                  <stop offset="100%" stopColor={c} stopOpacity="0.95" />
                </linearGradient>
              );
            })}
          </defs>

          {/* Outer vignette glow */}
          <circle cx={cx} cy={cy} r={rOuterBead + 6} fill="url(#outerGlow)" />

          {/* Parchment interior */}
          <g clipPath="url(#natalInterior)">
            <rect x="0" y="0" width="360" height="360" fill="#0d0d1a" />
            <rect x="0" y="0" width="360" height="360" filter="url(#parchmentNoiseNatal)" opacity="0.55" />
          </g>

          {/* 1. Double bead border — outer + inner rings with beads + cardinal diamonds */}
          <circle cx={cx} cy={cy} r={rOuterBead} fill="none" stroke="rgba(212,175,55,0.65)" strokeWidth={1} />
          <circle cx={cx} cy={cy} r={rOuterInner} fill="none" stroke="rgba(212,175,55,0.55)" strokeWidth={0.8} />
          {/* 36 beads between the two rings (every 10°), skipping cardinal slots */}
          {Array.from({ length: 36 }).map((_, i) => {
            const angle = i * 10;
            if (angle % 90 === 0) return null; // cardinals get diamond markers
            const p = polar(cx, cy, (rOuterBead + rOuterInner) / 2, angle);
            return <circle key={`bead-${i}`} cx={p.x} cy={p.y} r={1.1} fill="#d4af37" opacity={0.85} />;
          })}
          {/* 4 cardinal diamond markers (true SVG directions — top/right/bottom/left) */}
          {[0, 90, 180, 270].map((angle) => {
            const p = polar(cx, cy, (rOuterBead + rOuterInner) / 2, angle);
            return (
              <g key={`diamond-${angle}`} transform={`translate(${p.x} ${p.y}) rotate(45)`}>
                <rect x={-2.5} y={-2.5} width={5} height={5} fill="#d4af37" />
                <rect x={-2.5} y={-2.5} width={5} height={5} fill="none" stroke="rgba(244,214,104,0.9)" strokeWidth={0.4} />
              </g>
            );
          })}

          {/* 3. Sign sector fills, tinted by element */}
          {SIGNS.map((sign, i) => {
            const startLon = i * 30;
            const endLon = (i + 1) * 30;
            const startAngle = lonToSvgAngle(startLon, ascLon);
            const endAngle = lonToSvgAngle(endLon, ascLon);
            const [a, b] = startAngle > endAngle ? [endAngle, startAngle] : [startAngle, endAngle];
            const midAngle = (a + b) / 2;
            const pos = polar(cx, cy, (rSign + rSignInner) / 2, midAngle);
            return (
              <g key={`sign-${sign}`}>
                <path
                  d={sectorPath(cx, cy, rSignInner, rSign, a, b)}
                  fill={SIGN_ELEMENT_FILL[sign]}
                  stroke="rgba(212,175,55,0.18)"
                  strokeWidth={0.5}
                />
                {/* Sign glyph drawn via shared SVG paths, colored by element */}
                <g
                  transform={`translate(${pos.x - 9} ${pos.y - 9}) scale(${18 / 32})`}
                  stroke={SIGN_GLYPH_COLOR[sign]}
                  strokeWidth={2.4}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ pointerEvents: 'none' }}
                >
                  <ZodiacGlyphPaths sign={sign} />
                </g>
              </g>
            );
          })}

          {/* 2. Degree tick markings — inside the sign ring */}
          {Array.from({ length: 360 }).map((_, deg) => {
            const angle = lonToSvgAngle(deg, ascLon);
            const isSignBoundary = deg % 30 === 0;
            const is5 = deg % 5 === 0;
            if (!is5 && !isSignBoundary) {
              // 1° micro-tick (only draw every other to save nodes — still dense)
              if (deg % 2 !== 0) return null;
            }
            const rInside = isSignBoundary ? rSignInner - 8 : is5 ? rSignInner - 5 : rSignInner - 2;
            const p1 = polar(cx, cy, rSignInner, angle);
            const p2 = polar(cx, cy, rInside, angle);
            const opacity = isSignBoundary ? 0.9 : is5 ? 0.5 : 0.2;
            const width = isSignBoundary ? 1 : is5 ? 0.6 : 0.3;
            const color = isSignBoundary ? '#d4af37' : '#ffffff';
            return (
              <line
                key={`tick-${deg}`}
                x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                stroke={color}
                strokeOpacity={opacity}
                strokeWidth={width}
              />
            );
          })}
          {/* Terminal dots on sign-boundary ticks (every 30°) */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = lonToSvgAngle(i * 30, ascLon);
            const p = polar(cx, cy, rSignInner - 9, angle);
            return <circle key={`sign-dot-${i}`} cx={p.x} cy={p.y} r={1} fill="#d4af37" opacity={0.9} />;
          })}

          {/* 7. House spokes — thin faint lines except angular houses which are gold */}
          {houseCuspsLon.map((cuspLon, i) => {
            const angle = lonToSvgAngle(cuspLon, ascLon);
            const a = polar(cx, cy, rSignInner, angle);
            const b = polar(cx, cy, rRosetteOut, angle);
            const isAngular = i === 0 || i === 3 || i === 6 || i === 9;
            return (
              <line
                key={`spoke-${i}`}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={isAngular ? 'rgba(212,175,55,0.55)' : 'rgba(255,255,255,0.12)'}
                strokeWidth={isAngular ? 1.1 : 0.5}
              />
            );
          })}

          {/* 4. Cardinal axis — thicker gold beams for ASC-DESC and MC-IC with star caps */}
          {ascLon !== null && (() => {
            const asc = lonToSvgAngle(ascLon, ascLon);        // 180 (9 o'clock)
            const desc = lonToSvgAngle(ascLon + 180, ascLon); // 0   (3 o'clock)
            const mcLon = (chart.houses && chart.houses[9] != null) ? chart.houses[9] : (ascLon + 270) % 360;
            const mc = lonToSvgAngle(mcLon, ascLon);
            const ic = lonToSvgAngle(mcLon + 180, ascLon);
            const axes = [
              { label: 'ASC', angle: asc, labelAngle: asc },
              { label: 'DESC', angle: desc, labelAngle: desc },
              { label: 'MC', angle: mc, labelAngle: mc },
              { label: 'IC', angle: ic, labelAngle: ic },
            ];
            return (
              <g>
                {/* two beams: ASC-DESC and MC-IC */}
                {[[asc, desc], [mc, ic]].map(([angle1, angle2], idx) => {
                  const p1 = polar(cx, cy, rSignInner, angle1);
                  const p2 = polar(cx, cy, rSignInner, angle2);
                  return (
                    <line
                      key={`axis-${idx}`}
                      x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                      stroke="rgba(212,175,55,0.4)"
                      strokeWidth={0.8}
                      strokeDasharray="2 4"
                    />
                  );
                })}
                {/* 4-point star caps + labels at each angle */}
                {axes.map(({ label, angle, labelAngle }) => {
                  const starPos = polar(cx, cy, rSignInner + 4, angle);
                  const labelPos = polar(cx, cy, rOuterBead + 9, labelAngle);
                  return (
                    <g key={label}>
                      {/* Four-point star */}
                      <g transform={`translate(${starPos.x} ${starPos.y})`}>
                        <path
                          d="M 0 -4.5 L 1.1 -1.1 L 4.5 0 L 1.1 1.1 L 0 4.5 L -1.1 1.1 L -4.5 0 L -1.1 -1.1 Z"
                          fill="#d4af37"
                          stroke="rgba(244,214,104,0.9)"
                          strokeWidth={0.4}
                        />
                      </g>
                      {/* Label outside the outer bead ring */}
                      <text
                        x={labelPos.x}
                        y={labelPos.y + 3}
                        textAnchor="middle"
                        fontSize={9}
                        fontStyle="italic"
                        fontWeight={500}
                        fill="rgba(212,175,55,0.9)"
                        fontFamily="Cormorant Garamond, Georgia, serif"
                        style={{ letterSpacing: '0.15em', userSelect: 'none' }}
                      >
                        {label}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })()}

          {/* 7. Roman-numeral house numbers at midpoints of each sector */}
          {houseCuspsLon.map((cuspLon, i) => {
            const nextLon = houseCuspsLon[(i + 1) % 12];
            const midLon = (cuspLon + (nextLon >= cuspLon ? nextLon : nextLon + 360)) / 2 % 360;
            const midAngle = lonToSvgAngle(midLon, ascLon);
            const numPos = polar(cx, cy, rHouseNum, midAngle);
            const isAngular = i === 0 || i === 3 || i === 6 || i === 9;
            return (
              <text
                key={`hnum-${i}`}
                x={numPos.x}
                y={numPos.y + 3.5}
                textAnchor="middle"
                fontSize={isAngular ? 11 : 9}
                fill={isAngular ? 'rgba(212,175,55,0.9)' : 'rgba(255,255,255,0.45)'}
                fontWeight={isAngular ? 600 : 400}
                fontStyle="italic"
                fontFamily="Cormorant Garamond, Georgia, serif"
                style={{ cursor: 'pointer', userSelect: 'none', letterSpacing: '0.05em' }}
                onClick={() => setSelection({ kind: 'house', index: i + 1 })}
              >
                {ROMAN[i]}
              </text>
            );
          })}

          {/* 6. Aspect lines — typed strokes using per-aspect gradient + dashed styles */}
          {chart.aspects.filter((a) => shouldShowAspect(a.type, a.orb)).map((a, i) => {
            const p1 = placedPlanets.find((p) => p.planet === a.planet1);
            const p2 = placedPlanets.find((p) => p.planet === a.planet2);
            if (!p1 || !p2) return null;
            const from = polar(cx, cy, rAspectEdge, p1.svgAngle);
            const to = polar(cx, cy, rAspectEdge, p2.svgAngle);
            const style = ASPECT_STYLE[a.type];
            return (
              <line
                key={`asp-${a.planet1}-${a.planet2}-${a.type}-${i}`}
                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke={`url(#aspect-${a.type})`}
                strokeWidth={style.width}
                strokeOpacity={style.opacity}
                strokeDasharray={style.dasharray}
                strokeLinecap="round"
                onClick={() => setSelection({ kind: 'aspect', planet1: a.planet1, planet2: a.planet2, type: a.type, orb: a.orb })}
                style={{ cursor: 'pointer' }}
              />
            );
          })}

          {/* 7. Compass-rose center: 12 rays + center dot */}
          <g style={{ pointerEvents: 'none' }}>
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = i * 30;
              const long = i % 3 === 0;
              const p1 = polar(cx, cy, rRosetteIn + 3, angle);
              const p2 = polar(cx, cy, long ? rRosetteOut : rRosetteOut - 8, angle);
              return (
                <line
                  key={`ray-${i}`}
                  x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                  stroke="rgba(212,175,55,0.35)"
                  strokeWidth={long ? 0.8 : 0.4}
                  strokeLinecap="round"
                />
              );
            })}
            {/* Outer rosette ring */}
            <circle cx={cx} cy={cy} r={rRosetteOut - 3} fill="none" stroke="rgba(212,175,55,0.18)" strokeWidth={0.5} />
            {/* Inner ring */}
            <circle cx={cx} cy={cy} r={rRosetteIn + 3} fill="none" stroke="rgba(212,175,55,0.35)" strokeWidth={0.6} />
            {/* Center dot with subtle glow */}
            <circle cx={cx} cy={cy} r={rRosetteIn - 1} fill="#d4af37" />
            <circle cx={cx} cy={cy} r={rRosetteIn + 1.5} fill="none" stroke="rgba(244,214,104,0.4)" strokeWidth={0.5} />
          </g>

          {/* 5. Natal planet coins */}
          {placedPlanets.map((p) => {
            const pos = polar(cx, cy, rPlanet, p.svgAngle);
            const isSelected = selection?.kind === 'planet' && selection.planet === p.planet;
            return (
              <g
                key={`planet-${p.planet}`}
                onClick={() =>
                  setSelection({ kind: 'planet', planet: p.planet, sign: p.sign, degree: p.degree, house: p.house })
                }
                style={{ cursor: 'pointer' }}
              >
                {/* Outer bead ring */}
                <circle cx={pos.x} cy={pos.y} r={12.2} fill="none" stroke="rgba(212,175,55,0.35)" strokeWidth={0.6} />
                {/* Coin face */}
                <circle
                  cx={pos.x} cy={pos.y} r={10.5}
                  fill={isSelected ? '#d4af37' : '#0a0a10'}
                  stroke={isSelected ? '#fff' : '#d4af37'}
                  strokeWidth={isSelected ? 1.3 : 0.9}
                />
                {/* Inner hairline */}
                <circle cx={pos.x} cy={pos.y} r={8.8} fill="none" stroke={isSelected ? 'rgba(0,0,0,0.4)' : 'rgba(212,175,55,0.3)'} strokeWidth={0.4} />
                {/* Planet SVG glyph */}
                <g
                  transform={`translate(${pos.x - 7.5} ${pos.y - 7.5}) scale(${15 / 32})`}
                  stroke={isSelected ? '#0a0a10' : '#f4d668'}
                  strokeWidth={2.4}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ pointerEvents: 'none' }}
                >
                  <PlanetGlyphPaths planet={p.planet} />
                </g>
                {/* Degree label below coin */}
                <text
                  x={pos.x} y={pos.y + 21}
                  textAnchor="middle"
                  fontSize={7}
                  fill="rgba(255,255,255,0.5)"
                  fontFamily="Cormorant Garamond, Georgia, serif"
                  style={{ userSelect: 'none', pointerEvents: 'none' }}
                >
                  {p.degree.toFixed(0)}°
                </text>
              </g>
            );
          })}

          {/* 5. Transit/overlay planet coins (if any) — smaller + cooler palette */}
          {placedOverlay.map((p) => {
            const pos = polar(cx, cy, rTransit, p.svgAngle);
            const isSelected = selection?.kind === 'transit' && selection.planet === p.planet;
            return (
              <g
                key={`transit-${p.planet}`}
                onClick={() => setSelection({ kind: 'transit', planet: p.planet, sign: p.sign, degree: p.degree })}
                style={{ cursor: 'pointer' }}
              >
                <circle cx={pos.x} cy={pos.y} r={9.5} fill="none" stroke="rgba(96,165,250,0.35)" strokeWidth={0.5} strokeDasharray="1.5 1.5" />
                <circle
                  cx={pos.x} cy={pos.y} r={8}
                  fill={isSelected ? '#60a5fa' : '#0a0a10'}
                  stroke={isSelected ? '#fff' : '#60a5fa'}
                  strokeWidth={isSelected ? 1.3 : 0.8}
                />
                <g
                  transform={`translate(${pos.x - 6} ${pos.y - 6}) scale(${12 / 32})`}
                  stroke={isSelected ? '#0a0a10' : '#a3cfff'}
                  strokeWidth={2.4}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ pointerEvents: 'none' }}
                >
                  <PlanetGlyphPaths planet={p.planet} />
                </g>
              </g>
            );
          })}
        </svg>
      </motion.div>

      {/* Detail panel — smooth cross-fade between selections */}
      <div className="min-h-[84px]">
        <AnimatePresence mode="wait">
          {!selection && (
            <motion.p
              key="prompt"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="text-xs text-mystic-500 italic text-center"
            >
              {t('chartWheel.tapPrompt', { defaultValue: 'Tap a planet, house, or aspect line.' })}
            </motion.p>
          )}
          {selection?.kind === 'planet' && (
            <motion.div
              key={`planet-${selection.planet}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="bg-mystic-900/60 border border-gold/20 rounded-xl p-3"
            >
              <p className="text-[10px] uppercase tracking-widest text-gold mb-1">
                {t('chartWheel.planetLabel', { defaultValue: 'Planet' })}
              </p>
              <p className="text-sm font-medium text-mystic-100 flex items-center gap-1.5">
                <PlanetGlyph planet={selection.planet} size={18} className="text-gold" />
                {selection.planet} in {selection.sign}
                <ZodiacGlyph sign={selection.sign} size={16} className="text-mystic-300" />
              </p>
              <p className="text-xs text-mystic-400 mt-0.5">
                {selection.degree.toFixed(1)}°{selection.house ? ` · House ${selection.house}` : ''}
              </p>
            </motion.div>
          )}
          {selection?.kind === 'transit' && (
            <motion.div
              key={`transit-${selection.planet}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="bg-mystic-900/60 border border-cosmic-blue/30 rounded-xl p-3"
            >
              <p className="text-[10px] uppercase tracking-widest text-cosmic-blue mb-1">
                {t('chartWheel.transitLabel', { defaultValue: 'Transit' })}
                {overlayLabel ? ` · ${overlayLabel}` : ''}
              </p>
              <p className="text-sm font-medium text-mystic-100 flex items-center gap-1.5">
                <PlanetGlyph planet={selection.planet} size={18} className="text-cosmic-blue" />
                {selection.planet} in {selection.sign}
                <ZodiacGlyph sign={selection.sign} size={16} className="text-mystic-300" />
              </p>
              <p className="text-xs text-mystic-400 mt-0.5">{selection.degree.toFixed(1)}°</p>
            </motion.div>
          )}
          {selection?.kind === 'house' && (
            <motion.div
              key={`house-${selection.index}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="bg-mystic-900/60 border border-cosmic-violet/30 rounded-xl p-3"
            >
              <p className="text-[10px] uppercase tracking-widest text-cosmic-violet mb-1">
                {t('chartWheel.houseLabel', { defaultValue: 'House {{n}}', n: selection.index })}
              </p>
              <p className="text-sm text-mystic-100">
                {HOUSE_THEMES[selection.index - 1]}
              </p>
            </motion.div>
          )}
          {selection?.kind === 'aspect' && (
            <motion.div
              key={`aspect-${selection.planet1}-${selection.planet2}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="bg-mystic-900/60 border border-cosmic-blue/30 rounded-xl p-3"
            >
              <p className="text-[10px] uppercase tracking-widest text-cosmic-blue mb-1">
                {t('chartWheel.aspectLabel', { defaultValue: 'Aspect' })}
              </p>
              <p className="text-sm font-medium text-mystic-100 flex items-center gap-2">
                <PlanetGlyph planet={selection.planet1} size={18} className="text-gold" />
                <span>{selection.type}</span>
                <PlanetGlyph planet={selection.planet2} size={18} className="text-gold" />
              </p>
              <p className="text-xs text-mystic-400 mt-0.5">
                orb {selection.orb.toFixed(1)}°
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Legend — styled aspect lines match the in-chart strokes */}
      <div className="flex flex-wrap justify-center gap-3 text-[10px] text-mystic-400">
        {(Object.entries(ASPECT_STYLE) as [AspectType, typeof ASPECT_STYLE.conjunction][]).map(([type, style]) => (
          <span key={type} className="inline-flex items-center gap-1.5">
            <svg width="18" height="4" viewBox="0 0 18 4" aria-hidden>
              <line
                x1="1" y1="2" x2="17" y2="2"
                stroke={style.color}
                strokeWidth={style.width + 0.4}
                strokeDasharray={style.dasharray}
                strokeLinecap="round"
              />
            </svg>
            <span className="capitalize">{type}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
