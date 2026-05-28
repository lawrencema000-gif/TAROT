import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCelestialMapEngine, type MapMode } from './useCelestialMapEngine';
import { CelestialMapControls } from './CelestialMapControls';
import { CelestialDestinedBeacon } from './CelestialDestinedBeacon';
import { GLOBAL_CITIES } from '../../data/citiesGlobal';
import { haversineKm, type City } from '../../utils/celestialGeo';
import type { PlanetName, Angle } from '../../utils/astrocartography';
import type { DestinedPlace } from '../../types';

/**
 * Interactive SVG world map for astrocartography.
 *
 * Pure render layer — all state, projection, hit-testing, and animation
 * timing live in `useCelestialMapEngine`. This file:
 *   - Renders the SVG layers (background, graticule, continents, lines,
 *     decoration, tap pin) in the right z-order
 *   - Attaches the engine's handlers via refs
 *   - Provides the controls overlay
 *   - Wires hover / tap / pin animations via Framer Motion
 *
 * v2 features over v1:
 *   - Pan + zoom via d3-zoom (mouse drag, wheel, pinch on touch)
 *   - Globe mode (orthographic projection) with drag-to-rotate
 *   - Mouse-position parallax on the star layer
 *   - Line hover treatment (brighten + thicken the hovered, fade others)
 *   - Animated tap pin where the user touches the map
 *   - Controls overlay (mode toggle, zoom buttons, reset)
 *   - Imperative flyTo() exposed for the city-search + power-places picks
 */

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

interface Props {
  lines: GeoJSON.FeatureCollection<
    GeoJSON.LineString,
    { planet: PlanetName; angle: Angle }
  >;
  onMapClick?: (lonLat: [number, number]) => void;
  onLineClick?: (planet: PlanetName, angle: Angle) => void;
  /** Tap on a visible city dot — opens the panel for that city. */
  onCityClick?: (city: City) => void;
  /**
   * Optional initial mode override — defaults to flat. Useful for users
   * who told us they prefer the globe (we'd persist via localStorage).
   */
  initialMode?: MapMode;
  /**
   * Imperative handle out — exposes flyTo() so parent components
   * (search, power-places) can centre the map on a chosen city.
   */
  onEngineReady?: (engine: { flyTo: (lonLat: [number, number]) => void }) => void;
  /**
   * Whether to show ALL 280 cities (premium) or only the top by
   * population (free tier). Defaults to top 30.
   */
  cityLimit?: number;
  /**
   * If set, render the destined-place beacon on the map: large gold
   * pin + rays + pulsing halo + constellation lines from contributing
   * planets to the city. Driven by profile.destinedPlace AND by the
   * in-session reveal flow.
   */
  destinedPlace?: DestinedPlace;
  /** Set to true on a fresh reveal so the beacon plays its entrance
   *  animation; false on subsequent renders so it doesn't replay
   *  every pan/zoom. */
  destinedAnimateEntrance?: boolean;
}

export function CelestialMapView({
  lines,
  onMapClick,
  onLineClick,
  onCityClick,
  initialMode = 'flat',
  onEngineReady,
  cityLimit = 30,
  destinedPlace,
  destinedAnimateEntrance = false,
}: Props) {
  const engine = useCelestialMapEngine({ lines, initialMode });
  const svgRef = useRef<SVGSVGElement | null>(null);
  const groupRef = useRef<SVGGElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const [showHint, setShowHint] = useState(false);
  const [hoveredCity, setHoveredCity] = useState<City | null>(null);

  // The cities we render as visible dots on the map. Free users get the
  // 30 most populated (covers every major destination); premium users
  // can see all 280. We sort once at module mount and slice each render
  // — slicing 280 items is free.
  const visibleCities = useMemo(() => {
    return [...GLOBAL_CITIES]
      .sort((a, b) => b.pop - a.pop)
      .slice(0, cityLimit);
  }, [cityLimit]);

  // Wire the engine's handlers to the actual SVG element.
  useEffect(() => {
    engine.attachToSvg(svgRef.current, groupRef.current);
  }, [engine]);

  // Surface the flyTo() handle to the parent so it can centre on cities.
  useEffect(() => {
    if (onEngineReady) onEngineReady({ flyTo: engine.flyTo });
  }, [engine.flyTo, onEngineReady]);

  // Show a one-time "drag, pinch, tap" hint on first interaction with
  // the map. Hidden after 5s or as soon as the user moves.
  useEffect(() => {
    const KEY = 'arcana_celestial_map_v2_hint_seen';
    try {
      if (!localStorage.getItem(KEY)) {
        setShowHint(true);
        localStorage.setItem(KEY, '1');
        const t = setTimeout(() => setShowHint(false), 5000);
        return () => clearTimeout(t);
      }
    } catch { /* private mode */ }
  }, []);

  // Mouse-parallax for the star layer on desktop only. Tracks cursor
  // position relative to the wrapper centre, normalised to [-1, 1].
  // requestAnimationFrame-throttled so we never schedule more than one
  // update per frame on a fast mouse mover.
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const isTouch = 'ontouchstart' in window;
    if (isTouch) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    let rafId: number | null = null;
    let lastEvent: MouseEvent | null = null;
    const tick = () => {
      rafId = null;
      const e = lastEvent;
      if (!e) return;
      const rect = wrapper.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;   // -0.5 … +0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      setParallax({ x, y });
    };
    const onMove = (e: MouseEvent) => {
      lastEvent = e;
      if (rafId == null) rafId = requestAnimationFrame(tick);
    };
    wrapper.addEventListener('mousemove', onMove);
    return () => {
      wrapper.removeEventListener('mousemove', onMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // Hit-test: convert click point to viewBox coords, then to lon/lat.
  // The engine's d3-zoom transform is applied via CSS on the group,
  // so we must invert it here before invert-projecting.
  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    setShowHint(false);
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const xViewBox = ((e.clientX - rect.left) / rect.width) * engine.viewWidth;
    const yViewBox = ((e.clientY - rect.top) / rect.height) * engine.viewHeight;

    // Undo the zoom transform on the group to recover untransformed
    // coordinates that the projection's invert can read.
    const t = engine.transform;
    const xLocal = (xViewBox - t.x) / t.k;
    const yLocal = (yViewBox - t.y) / t.k;
    const lonLat = engine.invert([xLocal, yLocal]);
    if (!lonLat) return;

    // Line hit-test: same tolerance as v1 (12 viewBox-px) but now we
    // test against the post-transform projected positions, not the
    // raw ones, so the tap target stays accurate at any zoom level.
    if (onLineClick) {
      const tolerance = 12 / t.k; // viewBox px, scaled down by current zoom
      for (const line of engine.paths.planetLines) {
        // Match the original feature coords for hit-test (not the
        // SVG `d` string).
        const feat = lines.features.find(
          (f) => f.properties!.planet === line.planet && f.properties!.angle === line.angle,
        );
        if (!feat) continue;
        const coords = feat.geometry.coordinates as [number, number][];
        for (const [lon, lat] of coords) {
          const proj = engine.project([lon, lat]);
          if (!proj) continue;
          const dx = proj[0] - xLocal;
          const dy = proj[1] - yLocal;
          if (dx * dx + dy * dy <= tolerance * tolerance) {
            engine.setTapPin({ lon, lat });
            onLineClick(line.planet, line.angle);
            return;
          }
        }
      }
    }

    // Otherwise treat the click as a city-tap.
    engine.setTapPin({ lon: lonLat[0], lat: lonLat[1] });
    onMapClick?.([lonLat[0], lonLat[1]]);
  }

  // ── Decorative star layer ────────────────────────────────────────
  // Three depth planes — back stars drift slower than front stars
  // when the cursor moves, selling depth without expensive math.
  const stars = useMemo(() => {
    const seed = 42; // deterministic positions across renders
    const rand = (i: number) => {
      // tiny seeded PRNG: simple LCG, plenty good for decorative stars
      const v = (i * 9301 + 49297 + seed) % 233280;
      return v / 233280;
    };
    return Array.from({ length: 80 }, (_, i) => {
      const plane = i % 3; // 0 back, 1 middle, 2 front
      return {
        x: rand(i * 3) * engine.viewWidth,
        y: rand(i * 3 + 1) * engine.viewHeight,
        r: 0.4 + plane * 0.4,
        opacity: 0.15 + plane * 0.12,
        plane,
        twinkleDelay: rand(i * 3 + 2) * 6,
        twinkleDur: 3 + rand(i * 5) * 5,
      };
    });
  }, [engine.viewWidth, engine.viewHeight]);

  // Tap pin's projected coordinates (recomputed when projection changes
  // so the pin tracks rotation in globe mode).
  const pinXY = engine.tapPin ? engine.project([engine.tapPin.lon, engine.tapPin.lat]) : null;

  // ── Destined place: projected coords + constellation segments ───
  // For each planet line passing within 700km of the destined city,
  // find the closest point on that line + project both endpoints. The
  // beacon component renders the lines as dashed gold paths "drawing
  // in" toward the city.
  const destinedXY = useMemo(() => {
    if (!destinedPlace) return null;
    return engine.project([destinedPlace.city.lon, destinedPlace.city.lat]);
  }, [destinedPlace, engine]);

  const constellationSegments = useMemo(() => {
    if (!destinedPlace || !destinedXY) return [];
    const dest = destinedPlace.city;
    const RADIUS_KM = 700;
    const PLANET_COLOR_LOCAL: Record<PlanetName, string> = {
      Sun: '#f4d668', Moon: '#e6e0ff', Mercury: '#a8e8e0', Venus: '#f0b8a0',
      Mars: '#e07a5f', Jupiter: '#d4af37', Saturn: '#c2b280', Uranus: '#80c8e8',
      Neptune: '#8e6eb5', Pluto: '#a83253',
    };
    // Find closest sample point on each planet line within radius.
    const segs: Array<{ from: [number, number]; to: [number, number]; color: string }> = [];
    const bestPerPlanet = new Map<string, { lon: number; lat: number; km: number }>();
    for (const feat of lines.features) {
      const { planet, angle } = feat.properties!;
      const key = `${planet}-${angle}`;
      const coords = feat.geometry.coordinates as [number, number][];
      for (const [lon, lat] of coords) {
        const km = haversineKm(dest.lat, dest.lon, lat, lon);
        if (km <= RADIUS_KM) {
          const prev = bestPerPlanet.get(key);
          if (!prev || km < prev.km) bestPerPlanet.set(key, { lon, lat, km });
        }
      }
    }
    // Project + build segments (up to 4 closest).
    const sorted = [...bestPerPlanet.entries()]
      .sort((a, b) => a[1].km - b[1].km)
      .slice(0, 4);
    for (const [key, { lon, lat }] of sorted) {
      const fromXY = engine.project([lon, lat]);
      if (!fromXY) continue;
      const planet = key.split('-')[0] as PlanetName;
      segs.push({ from: fromXY, to: destinedXY, color: PLANET_COLOR_LOCAL[planet] });
    }
    return segs;
  }, [destinedPlace, destinedXY, engine, lines]);

  return (
    <div
      ref={wrapperRef}
      className="w-full h-full bg-mystic-950 relative overflow-hidden select-none"
    >
      {/* Soft radial backlight — a touch lighter at centre. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(70,70,110,0.22) 0%, rgba(10,10,15,0.0) 70%)',
        }}
        aria-hidden
      />

      <svg
        ref={svgRef}
        viewBox={`0 0 ${engine.viewWidth} ${engine.viewHeight}`}
        preserveAspectRatio="xMidYMid slice"
        className="celestial-drag-surface w-full h-full relative z-10 cursor-grab active:cursor-grabbing"
        onClick={handleSvgClick}
        role="img"
        aria-label="Interactive celestial map with planetary lines on a world projection"
      >
        <defs>
          <filter id="celestial-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" />
          </filter>
          <filter id="celestial-glow-strong" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          {/* Continent depth gradient — top a touch lighter than bottom. */}
          <linearGradient id="continent-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#262638" />
            <stop offset="100%" stopColor="#16162a" />
          </linearGradient>
          {/* Subtle ocean gradient — used as the rect fill. */}
          <radialGradient id="ocean-fill" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#101020" />
            <stop offset="100%" stopColor="#0a0a0f" />
          </radialGradient>
          {/* Tap-pin pulse ring. */}
          <radialGradient id="pin-pulse" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(244,214,104,0.5)" />
            <stop offset="60%" stopColor="rgba(244,214,104,0.1)" />
            <stop offset="100%" stopColor="rgba(244,214,104,0)" />
          </radialGradient>
        </defs>

        {/* Ocean — radial gradient rect */}
        <rect width={engine.viewWidth} height={engine.viewHeight} fill="url(#ocean-fill)" />

        {/* Star background — three parallax planes. The whole star
            layer lives OUTSIDE the zoom group so it doesn't scale with
            zoom — depth feel intact at any zoom level. */}
        <g className="celestial-stars" aria-hidden>
          {stars.map((s, i) => {
            const parallaxScale = s.plane === 0 ? 4 : s.plane === 1 ? 8 : 14;
            return (
              <circle
                key={i}
                cx={s.x + parallax.x * parallaxScale}
                cy={s.y + parallax.y * parallaxScale}
                r={s.r}
                fill="#e6e0ff"
                opacity={s.opacity}
                style={{
                  transition: 'cx 0.6s ease-out, cy 0.6s ease-out',
                }}
              >
                <animate
                  attributeName="opacity"
                  values={`${s.opacity};${s.opacity * 0.4};${s.opacity}`}
                  dur={`${s.twinkleDur}s`}
                  begin={`${s.twinkleDelay}s`}
                  repeatCount="indefinite"
                />
              </circle>
            );
          })}
        </g>

        {/* ── Zoomable / transformable group ─────────────────────── */}
        <g ref={groupRef} className="celestial-zoom-group">
          {/* Graticule */}
          <motion.path
            d={engine.paths.graticule}
            fill="none"
            stroke="rgba(212,175,55,0.07)"
            strokeWidth={0.6}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />

          {/* Equator highlight in flat mode only — looks weird on globe. */}
          {engine.mode === 'flat' && (
            <line
              x1={0}
              y1={engine.viewHeight / 2}
              x2={engine.viewWidth}
              y2={engine.viewHeight / 2}
              stroke="rgba(212,175,55,0.16)"
              strokeWidth={0.8}
            />
          )}

          {/* Continents — gradient fill + subtle gold-tint overlay */}
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <path
              d={engine.paths.continents}
              fill="url(#continent-fill)"
              stroke="#3a3a52"
              strokeWidth={0.8}
            />
            <path
              d={engine.paths.borders}
              fill="none"
              stroke="rgba(60,60,90,0.45)"
              strokeWidth={0.4}
            />
            <path d={engine.paths.continents} fill="rgba(212,175,55,0.04)" />
          </motion.g>

          {/* Planet lines — outer halo + inner core with hover dim */}
          <g className="celestial-lines">
            {engine.paths.planetLines.map((line) => {
              const color = PLANET_COLORS[line.planet];
              const isHovered = engine.hovered?.planet === line.planet && engine.hovered?.angle === line.angle;
              const isOtherHovered = engine.hovered && !isHovered;
              const opacity = isOtherHovered ? 0.3 : 1;
              const widthBoost = isHovered ? 1.5 : 1;
              return (
                <g
                  key={line.key}
                  onMouseEnter={() => engine.setHovered({ planet: line.planet, angle: line.angle })}
                  onMouseLeave={() => engine.setHovered(null)}
                  style={{ transition: 'opacity 200ms ease' }}
                  opacity={opacity}
                >
                  <path
                    d={line.d}
                    fill="none"
                    stroke={color}
                    strokeWidth={ANGLE_WIDTH[line.angle] * 3 * widthBoost}
                    strokeOpacity={isHovered ? 0.55 : 0.25}
                    strokeLinecap="round"
                    filter={isHovered ? 'url(#celestial-glow-strong)' : 'url(#celestial-glow)'}
                    style={{ transition: 'stroke-opacity 200ms ease, stroke-width 200ms ease' }}
                  />
                  <path
                    d={line.d}
                    fill="none"
                    stroke={color}
                    strokeWidth={ANGLE_WIDTH[line.angle] * widthBoost}
                    strokeOpacity={0.95}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-width 200ms ease' }}
                  />
                </g>
              );
            })}
          </g>

          {/* Continent labels — render AFTER lines so they sit on top */}
          <g pointerEvents="none">
            {CONTINENT_LABELS.map((label) => {
              const proj = engine.project([label.lon, label.lat]);
              if (!proj) return null;
              return (
                <text
                  key={label.name}
                  x={proj[0]}
                  y={proj[1]}
                  textAnchor="middle"
                  className="fill-mystic-200"
                  style={{
                    fontFamily: '"Cormorant Garamond", "Times New Roman", serif',
                    fontSize: label.size,
                    fontWeight: 400,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    mixBlendMode: 'screen',
                  }}
                  opacity={0.55}
                >
                  {label.name}
                </text>
              );
            })}
          </g>

          {/* ── City dots ──────────────────────────────────────────
              280-city dataset rendered as tiny tappable circles. Each
              dot sits inside the zoom group so it pans+zooms with the
              map. Hover shows a tooltip; tap opens the City Insight
              Panel via the parent's onCityClick.

              Visibility: in globe mode, a city behind the sphere has
              a projected coordinate but its great-circle distance to
              the viewer's centre exceeds 90°. We filter those out so
              the back of the globe stays clean.
          */}
          <g className="celestial-cities">
            {visibleCities.map((city) => {
              const proj = engine.project([city.lon, city.lat]);
              if (!proj) return null;
              // In globe mode, hide cities on the back hemisphere.
              if (engine.mode === 'globe') {
                // Check if projected within viewBox (orthographic returns
                // NaN-equivalent for the far side — but d3 returns the
                // 2D coords anyway, so we also test the inverse:
                // re-invert and compare distance.
                const inv = engine.invert(proj);
                if (!inv) return null;
                // Greater than ~0.5° divergence between original and
                // re-projected = far side.
                const dLon = Math.abs(((city.lon - inv[0] + 540) % 360) - 180);
                if (dLon > 1) return null;
              }
              const isHovered = hoveredCity?.name === city.name && hoveredCity?.cc === city.cc;
              const r = isHovered ? 2.6 : 1.6;
              return (
                <g
                  key={`${city.name}-${city.cc}`}
                  onMouseEnter={() => setHoveredCity(city)}
                  onMouseLeave={() => setHoveredCity(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCityClick?.(city);
                  }}
                  style={{ cursor: onCityClick ? 'pointer' : 'default' }}
                >
                  {/* Soft halo (only when hovered) */}
                  {isHovered && (
                    <circle
                      cx={proj[0]}
                      cy={proj[1]}
                      r={6}
                      fill="rgba(244,214,104,0.18)"
                      pointerEvents="none"
                    />
                  )}
                  {/* Invisible larger hit area for easier tapping */}
                  <circle
                    cx={proj[0]}
                    cy={proj[1]}
                    r={8}
                    fill="transparent"
                  />
                  {/* The visible dot */}
                  <circle
                    cx={proj[0]}
                    cy={proj[1]}
                    r={r}
                    fill={isHovered ? '#f4d668' : '#bfbfd1'}
                    fillOpacity={isHovered ? 1 : 0.7}
                    stroke="#0a0a0f"
                    strokeWidth={0.6}
                    style={{
                      transition: 'r 180ms ease, fill 180ms ease, fill-opacity 180ms ease',
                    }}
                  />
                  {/* In-map label when hovered (rendered inside the SVG
                      so it pans/zooms with the dot; the floating HTML
                      tooltip below shows the full country + flag). */}
                  {isHovered && (
                    <text
                      x={proj[0] + 6}
                      y={proj[1] - 6}
                      style={{
                        fontFamily: '"Cormorant Garamond", "Times New Roman", serif',
                        fontSize: 11,
                        fontWeight: 500,
                        letterSpacing: '0.04em',
                      }}
                      fill="#f4d668"
                      pointerEvents="none"
                    >
                      {city.name}
                    </text>
                  )}
                </g>
              );
            })}
          </g>

          {/* ── Destined-place beacon ──────────────────────────────
              Big animated gold pin + rays + pulsing halo + constellation
              lines from contributing planets, when a destined place is
              set. Lives inside the zoom group so it pans/zooms with
              the map; constellation segments recompute on rotation
              changes in globe mode via the useMemo dep on `engine`. */}
          {destinedPlace && destinedXY && (
            <CelestialDestinedBeacon
              place={destinedPlace}
              cityXY={destinedXY}
              constellationSegments={constellationSegments}
              animateEntrance={destinedAnimateEntrance}
            />
          )}

          {/* Tap pin — animated gold drop with pulse */}
          {pinXY && (
            <g pointerEvents="none">
              {/* Pulsing halo — uses native SVG animate for cheapness */}
              <circle cx={pinXY[0]} cy={pinXY[1]} r="16" fill="url(#pin-pulse)">
                <animate attributeName="r" values="14;22;14" dur="2.2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.9;0.3;0.9" dur="2.2s" repeatCount="indefinite" />
              </circle>
              {/* Pin core */}
              <circle cx={pinXY[0]} cy={pinXY[1]} r="3" fill="#f4d668" />
              <circle cx={pinXY[0]} cy={pinXY[1]} r="5" fill="none" stroke="#f4d668" strokeOpacity="0.6" strokeWidth="0.6" />
            </g>
          )}
        </g>

        {/* Mode-transition fade veil — out of the zoom group so it
            covers the whole map. Renders semi-opaque during transition,
            transparent otherwise. */}
        <AnimatePresence>
          {engine.isAnimating && (
            <motion.rect
              key="veil"
              width={engine.viewWidth}
              height={engine.viewHeight}
              fill="#0a0a0f"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.55 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              pointerEvents="none"
            />
          )}
        </AnimatePresence>
      </svg>

      {/* ── Controls overlay (above SVG, inside wrapper) ─────────── */}
      <CelestialMapControls
        mode={engine.mode}
        onModeChange={engine.setMode}
        onZoomIn={engine.zoomIn}
        onZoomOut={engine.zoomOut}
        onReset={engine.reset}
      />

      {/* ── One-time interaction hint ───────────────────────────── */}
      <AnimatePresence>
        {showHint && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.4 }}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full bg-mystic-900/80 backdrop-blur-md hairline-gold-soft text-xs text-mystic-200 whitespace-nowrap pointer-events-none"
          >
            Drag to pan · Pinch to zoom · Tap a place for insight
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hover tooltip (planet line) ─────────────────────────── */}
      <AnimatePresence>
        {engine.hovered && !hoveredCity && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute top-3 left-3 z-20 px-3 py-1.5 rounded-lg bg-mystic-900/80 backdrop-blur-md hairline-gold-soft text-xs text-mystic-100 pointer-events-none"
          >
            <span style={{ color: PLANET_COLORS[engine.hovered.planet] }}>●</span>
            <span className="ml-2">{engine.hovered.planet} {engine.hovered.angle}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hover tooltip (city) ────────────────────────────────── */}
      <AnimatePresence>
        {hoveredCity && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute top-3 left-3 z-20 px-3 py-1.5 rounded-lg bg-mystic-900/85 backdrop-blur-md hairline-gold-soft text-xs text-mystic-100 pointer-events-none flex items-center gap-2"
          >
            <span className="text-base" aria-hidden>
              {hoveredCity.cc
                ? String.fromCodePoint(...hoveredCity.cc.toUpperCase().split('').map((c) => 127397 + c.charCodeAt(0)))
                : '📍'}
            </span>
            <div>
              <div className="font-medium">{hoveredCity.name}</div>
              <div className="text-[10px] text-mystic-400">{hoveredCity.country}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const CONTINENT_LABELS: Array<{ name: string; lon: number; lat: number; size: number }> = [
  { name: 'North America', lon: -100, lat: 45, size: 14 },
  { name: 'South America', lon: -60, lat: -15, size: 13 },
  { name: 'Europe', lon: 15, lat: 50, size: 12 },
  { name: 'Africa', lon: 20, lat: 5, size: 14 },
  { name: 'Asia', lon: 90, lat: 45, size: 16 },
  { name: 'Oceania', lon: 135, lat: -25, size: 12 },
];
