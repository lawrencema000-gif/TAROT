import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { geoEquirectangular, geoPath, geoGraticule10 } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import worldData from 'world-atlas/countries-110m.json';
import type { PlanetName, Angle } from '../../utils/astrocartography';

/**
 * SVG world map renderer for the Celestial Map.
 *
 * Replaces the previous Mapbox renderer to remove the external tile
 * provider dependency entirely. Astrocartography is mathematical curves
 * on a globe — real-world tiles add no information, so a stylised
 * world map built from TopoJSON + d3-geo is both cheaper (no token, no
 * bill, smaller bundle) and on-brand (full control over palette,
 * graticule, and decorative layers).
 *
 * Design plan: see `docs/celestial-map-design-plan.md`. Key choices:
 *   - Equirectangular projection (smooth AC/DC sine curves)
 *   - Dark mystic ocean + gold-tinted continent fills + soft graticule
 *   - Each planet line is rendered as two strokes (outer glow + inner
 *     core) for a luminous neon feel
 *   - Lines stagger-draw on first render via stroke-dashoffset + Framer
 *     Motion. Filter toggles after that animate via opacity only.
 */

const VIEW_WIDTH = 800;
const VIEW_HEIGHT = 600;

// d3-geo `feature` and `mesh` are generic over topology + geometry. The
// world-atlas JSON ships as a Topology<{objects.countries: GeometryCollection}>;
// asserting once at the boundary keeps the rest of the file clean.
const topology = worldData as unknown as Topology<{ countries: GeometryCollection }>;

const PLANET_COLORS: Record<PlanetName, string> = {
  Sun:     '#f4d668',
  Moon:    '#e6e0ff',
  Mercury: '#a8e8e0',
  Venus:   '#f0b8a0',
  Mars:    '#e07a5f',
  Jupiter: '#d4af37',
  Saturn:  '#c2b280',
  Uranus:  '#80c8e8',
  Neptune: '#8e6eb5',
  Pluto:   '#a83253',
};

const ANGLE_WIDTH: Record<Angle, number> = {
  AC: 2.2,
  DC: 2.0,
  MC: 1.6,
  IC: 1.4,
};

const PLANET_ORDER: PlanetName[] = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
];

interface Props {
  /** Filtered planetary line features (free-tier + life-area selector applied). */
  lines: GeoJSON.FeatureCollection<
    GeoJSON.LineString,
    { planet: PlanetName; angle: Angle }
  >;
  /** Tap handler for picking a city + its nearby lines. */
  onMapClick?: (lonLat: [number, number]) => void;
  /** Tap handler for picking a specific line. */
  onLineClick?: (planet: PlanetName, angle: Angle) => void;
}

export function CelestialMapView({ lines, onMapClick, onLineClick }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  // Equirectangular projection sized to fill our viewBox. fitExtent
  // (full world bounds) is what d3 would normally do, but we want a
  // tight fit including all latitudes between -85 and 85 (we don't
  // draw the poles).
  const projection = useMemo(() => {
    return geoEquirectangular().fitExtent(
      [[0, 0], [VIEW_WIDTH, VIEW_HEIGHT]],
      { type: 'Sphere' },
    );
  }, []);

  const pathGenerator = useMemo(() => geoPath(projection), [projection]);

  // Continent geometry (all countries merged into a single outline) +
  // country sub-borders (rendered subtly inside the continents for
  // visual texture without label noise).
  const continentsPath = useMemo(() => {
    const countries = feature(topology, topology.objects.countries);
    return pathGenerator(countries) ?? '';
  }, [pathGenerator]);

  const bordersPath = useMemo(() => {
    const borders = mesh(topology, topology.objects.countries, (a, b) => a !== b);
    return pathGenerator(borders) ?? '';
  }, [pathGenerator]);

  const graticulePath = useMemo(() => {
    return pathGenerator(geoGraticule10()) ?? '';
  }, [pathGenerator]);

  // Build per-planet, per-angle SVG path strings from the filtered
  // GeoJSON feature collection. Returned grouped so we can stagger
  // the draw-in animation by planet.
  const planetPaths = useMemo(() => {
    const grouped: Array<{ planet: PlanetName; angle: Angle; d: string; key: string }> = [];
    for (const feat of lines.features) {
      const { planet, angle } = feat.properties!;
      const d = pathGenerator(feat) ?? '';
      if (!d) continue;
      grouped.push({ planet, angle, d, key: `${planet}-${angle}-${grouped.length}` });
    }
    return grouped;
  }, [lines, pathGenerator]);

  // Once the initial draw-in finishes, switch future filter changes to
  // opacity transitions instead of redraws — feels snappier and avoids
  // re-staggering every time the user taps a life-area chip.
  useEffect(() => {
    if (hasAnimated) return;
    const total = PLANET_ORDER.length * 250 + 1100;
    const t = setTimeout(() => setHasAnimated(true), total);
    return () => clearTimeout(t);
  }, [hasAnimated]);

  // Reverse-project click coordinates (SVG pixel → lon/lat) so the
  // parent can run city proximity / line hit-test. We hit-test lines
  // by sampling the click radius against each rendered line; simpler
  // and more reliable than SVG hit-testing because path stroke widths
  // vary and Safari's mobile pointer model is fussy.
  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    // Map the client coords back to the viewBox coords (independent
    // of CSS scaling — the SVG can be any rendered size).
    const x = ((e.clientX - rect.left) / rect.width) * VIEW_WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * VIEW_HEIGHT;
    const lonLat = projection.invert?.([x, y]);
    if (!lonLat) return;

    // Hit test lines by checking each line's distance to the tap.
    // We use the inverted lon/lat against the original GeoJSON
    // coordinates — same coordinate space, no projection drift.
    if (onLineClick) {
      const tolerance = 3; // viewBox-pixel tolerance against projected coords
      for (const { planet, angle } of planetPaths) {
        const feat = lines.features.find(
          (f) => f.properties!.planet === planet && f.properties!.angle === angle,
        );
        if (!feat) continue;
        const coords = feat.geometry.coordinates as [number, number][];
        for (const [lon, lat] of coords) {
          const proj = projection([lon, lat]);
          if (!proj) continue;
          const dx = proj[0] - x;
          const dy = proj[1] - y;
          if (dx * dx + dy * dy <= tolerance * tolerance) {
            onLineClick(planet, angle);
            return;
          }
        }
      }
    }

    onMapClick?.([lonLat[0], lonLat[1]]);
  }

  return (
    <div className="w-full h-full bg-mystic-950 relative overflow-hidden">
      {/* Soft radial backlight — slight ocean lift at centre. Pure
          decoration; the actual ocean colour comes from the rect below. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(60,60,90,0.18) 0%, transparent 70%)',
        }}
        aria-hidden
      />

      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full relative z-10 cursor-crosshair"
        onClick={handleSvgClick}
        role="img"
        aria-label="Celestial map showing planetary lines on a world projection"
      >
        <defs>
          {/* Per-planet glow filters — slight gaussian blur so the
              outer stroke reads as a luminous halo around the inner
              core. One filter shared across all planets works because
              the colour is applied via stroke, not the filter. */}
          <filter id="celestial-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" />
          </filter>
        </defs>

        {/* Ocean — solid mystic-950 baseline (the page background is
            already this colour; this rect ensures the SVG is opaque
            even when used standalone). */}
        <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="#0a0a0f" />

        {/* Decorative star dots — fixed positions in the SVG so they
            don't migrate when the projection changes. Low opacity so
            they read as atmospheric noise, not "stars". */}
        <g className="celestial-stars" aria-hidden>
          {STAR_POSITIONS.map(([sx, sy, r], i) => (
            <circle key={i} cx={sx} cy={sy} r={r} fill="#e6e0ff" opacity={0.25} />
          ))}
        </g>

        {/* Graticule — 30° lat/lon grid in soft gold */}
        <motion.path
          d={graticulePath}
          fill="none"
          stroke="rgba(212,175,55,0.07)"
          strokeWidth={0.6}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />

        {/* Equator + tropics — same color but slightly brighter */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
        >
          <line
            x1={0} y1={VIEW_HEIGHT / 2} x2={VIEW_WIDTH} y2={VIEW_HEIGHT / 2}
            stroke="rgba(212,175,55,0.18)" strokeWidth={0.8}
          />
          {/* Tropic of Cancer (~23.4° N) and Capricorn (~23.4° S) */}
          {[23.4, -23.4].map((lat) => {
            const proj = projection([0, lat]);
            if (!proj) return null;
            return (
              <line
                key={lat}
                x1={0} y1={proj[1]} x2={VIEW_WIDTH} y2={proj[1]}
                stroke="rgba(212,175,55,0.10)" strokeWidth={0.5}
                strokeDasharray="2 4"
              />
            );
          })}
        </motion.g>

        {/* Continents — fill + subtle gold tint overlay */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <path d={continentsPath} fill="#1f1f2e" stroke="#3a3a52" strokeWidth={0.8} />
          {/* Country sub-borders — very subtle interior detail */}
          <path d={bordersPath} fill="none" stroke="rgba(60,60,90,0.45)" strokeWidth={0.4} />
          {/* Gold-tint overlay — gives continents a faint warm glow */}
          <path d={continentsPath} fill="rgba(212,175,55,0.04)" />
        </motion.g>

        {/* Planet lines — outer glow + inner core, drawn per planet,
            staggered by planet order. */}
        <g className="celestial-lines">
          {PLANET_ORDER.map((planet, planetIdx) => {
            const planetLines = planetPaths.filter((p) => p.planet === planet);
            if (planetLines.length === 0) return null;
            return (
              <g key={planet}>
                {planetLines.map((line, lineIdx) => {
                  const color = PLANET_COLORS[planet];
                  const delay = hasAnimated ? 0 : 0.9 + planetIdx * 0.25 + lineIdx * 0.05;
                  const duration = hasAnimated ? 0 : 0.8;
                  return (
                    <g key={line.key}>
                      {/* Outer halo — wider, blurred, low opacity */}
                      <motion.path
                        d={line.d}
                        fill="none"
                        stroke={color}
                        strokeWidth={ANGLE_WIDTH[line.angle] * 3}
                        strokeOpacity={0.25}
                        strokeLinecap="round"
                        filter="url(#celestial-glow)"
                        initial={hasAnimated ? false : { pathLength: 0, opacity: 0 }}
                        animate={hasAnimated ? { opacity: 0.25 } : { pathLength: 1, opacity: 0.25 }}
                        transition={{ duration, delay, ease: 'easeOut' }}
                      />
                      {/* Inner core — solid, narrower */}
                      <motion.path
                        d={line.d}
                        fill="none"
                        stroke={color}
                        strokeWidth={ANGLE_WIDTH[line.angle]}
                        strokeOpacity={0.92}
                        strokeLinecap="round"
                        initial={hasAnimated ? false : { pathLength: 0, opacity: 0 }}
                        animate={hasAnimated ? { opacity: 0.92 } : { pathLength: 1, opacity: 0.92 }}
                        transition={{ duration, delay, ease: 'easeOut' }}
                      />
                    </g>
                  );
                })}
              </g>
            );
          })}
        </g>

        {/* Continent labels — rendered last so they sit on top of
            lines for legibility. Positions are hand-tuned in projected
            coords so they always centre nicely. */}
        <g className="celestial-labels" pointerEvents="none">
          {CONTINENT_LABELS.map((label) => {
            const proj = projection([label.lon, label.lat]);
            if (!proj) return null;
            return (
              <motion.text
                key={label.name}
                x={proj[0]}
                y={proj[1]}
                textAnchor="middle"
                className="fill-mystic-300"
                style={{
                  fontFamily: '"Cormorant Garamond", "Times New Roman", serif',
                  fontSize: label.size,
                  fontWeight: 400,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  mixBlendMode: 'screen',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.65 }}
                transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }}
              >
                {label.name}
              </motion.text>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

/**
 * Fixed star-dot positions for decorative atmosphere. Placed in the
 * upper half of the viewBox where there's mostly ocean, so the dots
 * don't fight with continent fills. Hand-tuned so they feel like
 * constellation suggestion rather than random noise.
 */
const STAR_POSITIONS: Array<[number, number, number]> = [
  [40, 70, 0.8],
  [120, 40, 0.6],
  [220, 90, 1.0],
  [310, 50, 0.7],
  [410, 110, 0.5],
  [510, 60, 0.8],
  [600, 100, 0.6],
  [690, 50, 0.9],
  [760, 80, 0.7],
  [80, 180, 0.5],
  [550, 200, 0.6],
  [720, 230, 0.7],
  [50, 540, 0.7],
  [200, 570, 0.5],
  [400, 555, 0.8],
  [620, 560, 0.6],
  [750, 540, 0.7],
];

const CONTINENT_LABELS: Array<{ name: string; lon: number; lat: number; size: number }> = [
  { name: 'North America', lon: -100, lat: 45, size: 14 },
  { name: 'South America', lon: -60, lat: -15, size: 13 },
  { name: 'Europe', lon: 15, lat: 50, size: 12 },
  { name: 'Africa', lon: 20, lat: 5, size: 14 },
  { name: 'Asia', lon: 90, lat: 45, size: 16 },
  { name: 'Oceania', lon: 135, lat: -25, size: 12 },
];
