import { useMemo } from 'react';
import {
  type NatalChart, PLANET_GLYPH, SIGN_GLYPH, SIGN_ORDER, SIGN_ELEMENT,
  ELEMENT_COLOR, ASPECT_COLOR, eclipticToXY,
} from '../../lib/chart';

interface Props {
  chart: NatalChart;
  size?: number;
  className?: string;
}

/**
 * Deterministic SVG natal wheel — zodiac ring, house spokes (when houses are
 * known), planet glyphs at true ecliptic longitudes, and aspect lines colored
 * by type. Pure geometry from the chart JSON; no external deps.
 */
export function NatalWheel({ chart, size = 340, className }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const rZodiacOuter = size * 0.47;
  const rZodiacInner = size * 0.38;
  const rPlanets = size * 0.31;
  const rAspect = size * 0.27;

  // Spread overlapping planet glyphs so clusters stay legible.
  const placed = useMemo(() => {
    const sorted = [...chart.planets].sort((a, b) => a.longitude - b.longitude);
    const minGap = 9; // degrees
    const adj = sorted.map((p) => ({ ...p, drawLon: p.longitude }));
    for (let i = 1; i < adj.length; i++) {
      const gap = adj[i].drawLon - adj[i - 1].drawLon;
      if (gap < minGap) adj[i].drawLon = adj[i - 1].drawLon + minGap;
    }
    return adj;
  }, [chart.planets]);

  const lonToPoint = (lon: number, r: number) => eclipticToXY(lon, r, cx, cy);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" className={className} role="img" aria-label="Natal chart wheel">
      {/* zodiac ring */}
      <circle cx={cx} cy={cy} r={rZodiacOuter} fill="none" stroke="rgba(212,168,83,0.25)" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={rZodiacInner} fill="none" stroke="rgba(212,168,83,0.12)" strokeWidth="0.75" />

      {/* 12 sign segments + glyphs */}
      {SIGN_ORDER.map((sign, i) => {
        const startLon = i * 30;
        const midLon = startLon + 15;
        const p1 = lonToPoint(startLon, rZodiacInner);
        const p2 = lonToPoint(startLon, rZodiacOuter);
        const glyphPt = lonToPoint(midLon, (rZodiacInner + rZodiacOuter) / 2);
        const el = SIGN_ELEMENT[sign];
        return (
          <g key={sign}>
            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="rgba(212,168,83,0.18)" strokeWidth="0.75" />
            <text x={glyphPt.x} y={glyphPt.y} textAnchor="middle" dominantBaseline="central"
              fontSize={size * 0.042} fill={ELEMENT_COLOR[el] || 'rgba(212,168,83,0.7)'} fontFamily="serif">
              {SIGN_GLYPH[sign]}
            </text>
          </g>
        );
      })}

      {/* house cusps + ASC/MC markers */}
      {chart.hasHouses && chart.houses.map((cusp, i) => {
        const a = lonToPoint(cusp, rZodiacInner);
        const b = lonToPoint(cusp, rAspect);
        const isAngle = i === 0 || i === 9; // ASC, MC
        return (
          <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke={isAngle ? 'rgba(212,168,83,0.5)' : 'rgba(255,255,255,0.06)'}
            strokeWidth={isAngle ? 1.25 : 0.5} strokeDasharray={isAngle ? undefined : '2 4'} />
        );
      })}
      {chart.ascendant !== null && (() => {
        const p = lonToPoint(chart.ascendant, rZodiacOuter + size * 0.03);
        return <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize={size * 0.032} fill="rgba(212,168,83,0.8)" fontWeight="600">ASC</text>;
      })()}

      {/* aspect lines */}
      {chart.aspects.map((asp, i) => {
        const p1 = chart.planets.find((p) => p.planet === asp.planet1);
        const p2 = chart.planets.find((p) => p.planet === asp.planet2);
        if (!p1 || !p2) return null;
        const a = lonToPoint(p1.longitude, rAspect);
        const b = lonToPoint(p2.longitude, rAspect);
        return (
          <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke={ASPECT_COLOR[asp.type] || 'rgba(255,255,255,0.15)'}
            strokeWidth={asp.type === 'conjunction' ? 1.4 : 0.9}
            strokeOpacity={0.55} strokeLinecap="round" />
        );
      })}
      <circle cx={cx} cy={cy} r={rAspect} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />

      {/* planet glyphs */}
      {placed.map((p) => {
        const pt = lonToPoint(p.drawLon, rPlanets);
        const tick = lonToPoint(p.longitude, rZodiacInner);
        const inner = lonToPoint(p.drawLon, rPlanets - size * 0.02);
        const el = SIGN_ELEMENT[p.sign];
        return (
          <g key={p.planet}>
            <line x1={tick.x} y1={tick.y} x2={inner.x} y2={inner.y} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
            <circle cx={pt.x} cy={pt.y} r={size * 0.032} fill="rgba(8,8,16,0.85)" stroke={ELEMENT_COLOR[el] || 'rgba(212,168,83,0.4)'} strokeWidth="0.75" />
            <text x={pt.x} y={pt.y} textAnchor="middle" dominantBaseline="central" fontSize={size * 0.038} fill="var(--tx, #f4efe6)" fontFamily="serif">
              {PLANET_GLYPH[p.planet] || p.planet[0]}
            </text>
            {p.retrograde && (
              <text x={pt.x + size * 0.028} y={pt.y - size * 0.028} fontSize={size * 0.022} fill="#e0684f">℞</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
