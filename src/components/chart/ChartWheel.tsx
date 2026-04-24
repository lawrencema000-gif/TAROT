import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SIGN_SYMBOLS,
  PLANET_SYMBOLS,
  HOUSE_THEMES,
  type NatalChart,
  type Planet,
  type ZodiacSign,
  type AspectType,
} from '../../types/astrology';
import { useT } from '../../i18n/useT';

/**
 * Interactive SVG chart wheel.
 *
 * Pure client-side render — zero dependencies, zero bundle impact beyond
 * the component itself. Tap a planet to surface its details below the
 * wheel. Tap a house sector for the house theme. Tap an aspect line to
 * see the pair + orb.
 *
 * Design choices:
 *   - Wheel is 320px logical viewBox so it scales cleanly on mobile.
 *   - Houses are drawn as 12 pie sectors starting from ASC (9 o'clock).
 *   - Sign wheel is an outer ring with 12 glyph slices.
 *   - Planets sit on an inner ring near their exact longitude, with minor
 *     overlap spreading if two planets share ~3° of ecliptic.
 *   - Aspects are chord lines drawn only for major aspects with orb <2°.
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

const ASPECT_COLORS: Record<AspectType, string> = {
  conjunction: '#d4af37',
  opposition:  '#8e6eb5',
  trine:       '#4ade80',
  square:      '#f472b6',
  sextile:     '#60a5fa',
};

type Selection =
  | { kind: 'planet'; planet: Planet; sign: ZodiacSign; degree: number; house: number | null }
  | { kind: 'transit'; planet: Planet; sign: ZodiacSign; degree: number }
  | { kind: 'house'; index: number }
  | { kind: 'aspect'; planet1: Planet; planet2: Planet; type: AspectType; orb: number }
  | null;

const SIGNS: ZodiacSign[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

// Convert ecliptic longitude to SVG angle. Chart convention: Ascendant on
// the left (9 o'clock = 180°). Longitudes increase counterclockwise in
// traditional charts — but SVG angles increase clockwise. So we flip.
function lonToSvgAngle(lon: number, ascLon: number | null): number {
  const asc = ascLon ?? 0;
  const rel = ((lon - asc) % 360 + 360) % 360;   // degrees CCW from ASC
  return 180 - rel;                               // SVG degrees (0 = right, +CW)
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
  // In SVG, positive arc goes clockwise. We draw start→end clockwise (sweep=1).
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

export function ChartWheel({ chart, overlay, overlayLabel }: ChartWheelProps) {
  const { t } = useT('app');
  const [selection, setSelection] = useState<Selection>(null);

  const cx = 160, cy = 160;
  const rOuter = 150;      // outer sign ring
  const rSign  = 135;      // inner edge of sign ring
  const rTransit = 122;    // transit glyph ring (outside of house spokes)
  const rHouse = 115;      // inner edge of house ring
  const rPlanet = 90;      // natal planet ring
  const rAspectEdge = 82;  // endpoints of aspect lines

  const ascLon = chart.ascendant;

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

  // Spread planets that are within ~4° of each other so glyphs don't collide.
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
        style={{ maxWidth: 360 }}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <svg viewBox="0 0 320 320" className="w-full h-auto" role="img" aria-label="Natal chart wheel">
          {/* Outer ring background */}
          <circle cx={cx} cy={cy} r={rOuter} fill="none" stroke="rgba(212,175,55,0.35)" strokeWidth={1} />
          <circle cx={cx} cy={cy} r={rSign}  fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
          <circle cx={cx} cy={cy} r={rHouse} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
          <circle cx={cx} cy={cy} r={rPlanet - 8} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={1} />

          {/* Sign wedges */}
          {SIGNS.map((sign, i) => {
            const startLon = i * 30;
            const endLon = (i + 1) * 30;
            const startAngle = lonToSvgAngle(startLon, ascLon);
            const endAngle = lonToSvgAngle(endLon, ascLon);
            // Angles run CW in SVG. To keep the sector order consistent, swap.
            const [a, b] = startAngle > endAngle ? [endAngle, startAngle] : [startAngle, endAngle];
            const midAngle = (a + b) / 2;
            const pos = polar(cx, cy, (rOuter + rSign) / 2, midAngle);
            return (
              <g key={sign}>
                <path
                  d={sectorPath(cx, cy, rSign, rOuter, a, b)}
                  fill={i % 2 === 0 ? 'rgba(212,175,55,0.05)' : 'rgba(142,110,181,0.05)'}
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth={0.5}
                />
                <text
                  x={pos.x}
                  y={pos.y + 5}
                  textAnchor="middle"
                  fontSize={14}
                  fill="#d4af37"
                  style={{ userSelect: 'none' }}
                >
                  {SIGN_SYMBOLS[sign]}
                </text>
              </g>
            );
          })}

          {/* House spokes + numbers */}
          {houseCuspsLon.map((cuspLon, i) => {
            const angle = lonToSvgAngle(cuspLon, ascLon);
            const a = polar(cx, cy, rSign, angle);
            const b = polar(cx, cy, 20, angle);
            const nextLon = houseCuspsLon[(i + 1) % 12];
            const midLon = (cuspLon + (nextLon >= cuspLon ? nextLon : nextLon + 360)) / 2 % 360;
            const midAngle = lonToSvgAngle(midLon, ascLon);
            const numPos = polar(cx, cy, (rHouse + rPlanet - 8) / 2, midAngle);
            const isAngular = i === 0 || i === 3 || i === 6 || i === 9;
            return (
              <g key={i}>
                <line
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={isAngular ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.1)'}
                  strokeWidth={isAngular ? 1.2 : 0.6}
                />
                <text
                  x={numPos.x}
                  y={numPos.y + 3}
                  textAnchor="middle"
                  fontSize={8}
                  fill="rgba(255,255,255,0.35)"
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => setSelection({ kind: 'house', index: i + 1 })}
                >
                  {i + 1}
                </text>
              </g>
            );
          })}

          {/* Aspects (drawn before planets so they sit behind) */}
          {chart.aspects.filter((a) => shouldShowAspect(a.type, a.orb)).map((a, i) => {
            const p1 = placedPlanets.find((p) => p.planet === a.planet1);
            const p2 = placedPlanets.find((p) => p.planet === a.planet2);
            if (!p1 || !p2) return null;
            const from = polar(cx, cy, rAspectEdge, p1.svgAngle);
            const to   = polar(cx, cy, rAspectEdge, p2.svgAngle);
            return (
              <line
                key={`${a.planet1}-${a.planet2}-${a.type}-${i}`}
                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke={ASPECT_COLORS[a.type]}
                strokeWidth={1.2}
                strokeOpacity={0.4}
                onClick={() => setSelection({ kind: 'aspect', planet1: a.planet1, planet2: a.planet2, type: a.type, orb: a.orb })}
                style={{ cursor: 'pointer' }}
              />
            );
          })}

          {/* Planet glyphs */}
          {placedPlanets.map((p) => {
            const pos = polar(cx, cy, rPlanet, p.svgAngle);
            const isSelected = selection?.kind === 'planet' && selection.planet === p.planet;
            return (
              <g
                key={p.planet}
                onClick={() =>
                  setSelection({ kind: 'planet', planet: p.planet, sign: p.sign, degree: p.degree, house: p.house })
                }
                style={{ cursor: 'pointer' }}
              >
                <circle
                  cx={pos.x} cy={pos.y} r={10}
                  fill={isSelected ? '#d4af37' : 'rgba(10,10,15,0.9)'}
                  stroke={isSelected ? '#fff' : 'rgba(212,175,55,0.5)'}
                  strokeWidth={isSelected ? 1.5 : 1}
                />
                <text
                  x={pos.x} y={pos.y + 4}
                  textAnchor="middle"
                  fontSize={12}
                  fill={isSelected ? '#0a0a0f' : '#d4af37'}
                  style={{ userSelect: 'none', pointerEvents: 'none' }}
                >
                  {PLANET_SYMBOLS[p.planet]}
                </text>
              </g>
            );
          })}

          {/* Overlay planets (transits / progressions) */}
          {placedOverlay.map((p) => {
            const pos = polar(cx, cy, rTransit, p.svgAngle);
            const isSelected = selection?.kind === 'transit' && selection.planet === p.planet;
            return (
              <g
                key={`t-${p.planet}`}
                onClick={() =>
                  setSelection({ kind: 'transit', planet: p.planet, sign: p.sign, degree: p.degree })
                }
                style={{ cursor: 'pointer' }}
              >
                <circle
                  cx={pos.x} cy={pos.y} r={8}
                  fill={isSelected ? '#60a5fa' : 'rgba(10,10,15,0.9)'}
                  stroke={isSelected ? '#fff' : 'rgba(96,165,250,0.7)'}
                  strokeWidth={isSelected ? 1.5 : 1}
                  strokeDasharray="2 2"
                />
                <text
                  x={pos.x} y={pos.y + 3}
                  textAnchor="middle"
                  fontSize={9}
                  fill={isSelected ? '#0a0a0f' : '#60a5fa'}
                  style={{ userSelect: 'none', pointerEvents: 'none' }}
                >
                  {PLANET_SYMBOLS[p.planet]}
                </text>
              </g>
            );
          })}

          {/* ASC marker */}
          {ascLon !== null && (
            <g>
              <text
                x={14}
                y={cy + 4}
                fontSize={9}
                fill="rgba(212,175,55,0.9)"
                style={{ userSelect: 'none' }}
              >
                ASC
              </text>
            </g>
          )}
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
              <p className="text-sm font-medium text-mystic-100">
                {PLANET_SYMBOLS[selection.planet]} {selection.planet} in {selection.sign}
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
              <p className="text-sm font-medium text-mystic-100">
                {PLANET_SYMBOLS[selection.planet]} {selection.planet} in {selection.sign}
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
              <p className="text-sm font-medium text-mystic-100">
                {selection.planet1} {selection.type} {selection.planet2}
              </p>
              <p className="text-xs text-mystic-400 mt-0.5">
                orb {selection.orb.toFixed(1)}°
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-[10px] text-mystic-500">
        {(Object.entries(ASPECT_COLORS) as [AspectType, string][]).map(([type, color]) => (
          <span key={type} className="inline-flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 rounded-full" style={{ backgroundColor: color, opacity: 0.6 }} />
            {type}
          </span>
        ))}
      </div>
    </div>
  );
}
