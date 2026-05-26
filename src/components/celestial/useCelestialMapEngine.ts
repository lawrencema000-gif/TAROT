import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { geoEquirectangular, geoOrthographic, geoPath, geoGraticule10, geoInterpolate, type GeoProjection } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import { select } from 'd3-selection';
import { zoom, zoomIdentity, type D3ZoomEvent, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
import { drag, type D3DragEvent } from 'd3-drag';
import { easeCubicInOut } from 'd3-ease';
import worldData from 'world-atlas/countries-110m.json';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { PlanetName, Angle } from '../../utils/astrocartography';

/**
 * Interactive engine for the Celestial Map v2.
 *
 * Owns:
 *   - The active projection (equirectangular flat OR orthographic globe)
 *   - Zoom transform (d3.zoomTransform)
 *   - Globe rotation [λ, φ, γ]
 *   - Hover state for planet lines
 *   - Tap pin position
 *   - Mode-transition animation between flat and globe
 *
 * Exposes paths + transforms + handlers for the view to render. Keeps
 * the view file purely declarative.
 *
 * Performance note: continent + border + graticule paths are recomputed
 * on every projection change (zoom doesn't change projection — d3-zoom
 * applies a CSS transform on the SVG group). Rotation in globe mode DOES
 * change projection, so paths re-render on every drag tick — debounced
 * to requestAnimationFrame to keep 60fps achievable on mid-range phones.
 */

const VIEW_WIDTH = 800;
const VIEW_HEIGHT = 600;
const ZOOM_RANGE: [number, number] = [0.8, 8];
const MODE_TRANSITION_MS = 800;

export type MapMode = 'flat' | 'globe';

const topology = worldData as unknown as Topology<{ countries: GeometryCollection }>;

interface EngineOptions {
  /** Filtered planetary lines to render. */
  lines: GeoJSON.FeatureCollection<
    GeoJSON.LineString,
    { planet: PlanetName; angle: Angle }
  >;
  /** Initial projection mode. */
  initialMode?: MapMode;
}

export interface CelestialMapEngine {
  /** Current projection mode. */
  mode: MapMode;
  /** Current zoom transform (CSS transform string applied on the SVG g). */
  transform: ZoomTransform;
  /** True while a mode-transition animation is in flight. */
  isAnimating: boolean;
  /** Currently-hovered line, if any. */
  hovered: { planet: PlanetName; angle: Angle } | null;
  setHovered: (h: { planet: PlanetName; angle: Angle } | null) => void;
  /** Pin position after a user tap (in lon/lat). */
  tapPin: { lon: number; lat: number } | null;
  setTapPin: (p: { lon: number; lat: number } | null) => void;
  /** Pre-computed SVG path strings — re-evaluated when projection changes. */
  paths: {
    continents: string;
    borders: string;
    graticule: string;
    planetLines: Array<{ key: string; d: string; planet: PlanetName; angle: Angle }>;
  };
  /** Project a lon/lat point to viewBox pixel coords. */
  project: (lonLat: [number, number]) => [number, number] | null;
  /** Inverse-project viewBox pixel to lon/lat. */
  invert: (xy: [number, number]) => [number, number] | null;
  /** Attach all handlers to the SVG element + the zoomable group. */
  attachToSvg: (svgEl: SVGSVGElement | null, groupEl: SVGGElement | null) => void;
  /** UI commands. */
  setMode: (m: MapMode) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  /** Animate the camera to centre on a specific lon/lat. */
  flyTo: (lonLat: [number, number]) => void;
  /** Viewport size constants for consumers. */
  viewWidth: number;
  viewHeight: number;
}

export function useCelestialMapEngine({ lines, initialMode = 'flat' }: EngineOptions): CelestialMapEngine {
  const [mode, setModeState] = useState<MapMode>(initialMode);
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity);
  const [rotation, setRotation] = useState<[number, number, number]>([0, -10, 0]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hovered, setHovered] = useState<{ planet: PlanetName; angle: Angle } | null>(null);
  const [tapPin, setTapPin] = useState<{ lon: number; lat: number } | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const groupRef = useRef<SVGGElement | null>(null);
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // Projection rebuilt whenever mode or rotation changes. fitExtent
  // normalises both projections to the same viewBox so toggling doesn't
  // jolt the user.
  const projection = useMemo<GeoProjection>(() => {
    const base = mode === 'globe' ? geoOrthographic() : geoEquirectangular();
    base.fitExtent([[20, 20], [VIEW_WIDTH - 20, VIEW_HEIGHT - 20]], { type: 'Sphere' });
    if (mode === 'globe') base.rotate(rotation);
    return base;
  }, [mode, rotation]);

  const pathGenerator = useMemo(() => geoPath(projection), [projection]);

  const paths = useMemo(() => {
    const countries = feature(topology, topology.objects.countries);
    const borders = mesh(topology, topology.objects.countries, (a, b) => a !== b);
    const planetLines = lines.features
      .map((feat, i) => ({
        key: `${feat.properties!.planet}-${feat.properties!.angle}-${i}`,
        d: pathGenerator(feat) ?? '',
        planet: feat.properties!.planet,
        angle: feat.properties!.angle,
      }))
      .filter((p) => p.d.length > 0);
    return {
      continents: pathGenerator(countries) ?? '',
      borders: pathGenerator(borders) ?? '',
      graticule: pathGenerator(geoGraticule10()) ?? '',
      planetLines,
    };
  }, [pathGenerator, lines]);

  const project = useCallback(
    (lonLat: [number, number]) => {
      const r = projection(lonLat);
      return r ? ([r[0], r[1]] as [number, number]) : null;
    },
    [projection],
  );

  const invert = useCallback(
    (xy: [number, number]) => {
      const r = projection.invert?.(xy);
      return r ? ([r[0], r[1]] as [number, number]) : null;
    },
    [projection],
  );

  // Attach d3-zoom + d3-drag handlers to the SVG. Re-runs whenever the
  // svg/group refs land. d3-zoom mutates a CSS transform on the group;
  // d3-drag (globe mode only) drives the rotation state.
  const attachToSvg = useCallback(
    (svgEl: SVGSVGElement | null, groupEl: SVGGElement | null) => {
      svgRef.current = svgEl;
      groupRef.current = groupEl;
      if (!svgEl) return;

      // ── d3-zoom ─────────────────────────────────────────────────
      const z = zoom<SVGSVGElement, unknown>()
        .scaleExtent(ZOOM_RANGE)
        .on('zoom', (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
          setTransform(event.transform);
          // Apply the transform to the group via CSS — far cheaper than
          // re-projecting everything on every wheel tick.
          if (groupRef.current) {
            groupRef.current.setAttribute('transform', event.transform.toString());
          }
        });
      zoomBehaviorRef.current = z;
      select(svgEl).call(z);

      // Suppress double-tap-to-zoom on touch (rotation owns drag).
      svgEl.style.touchAction = 'none';
    },
    [],
  );

  // ── Globe drag-to-rotate ──────────────────────────────────────────
  // Attached separately from zoom so we can disable it in flat mode
  // without rebuilding the whole zoom behavior. Uses a stable ref so
  // we don't double-bind on re-renders.
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || mode !== 'globe') return;

    let dragStart: [number, number] = [0, 0];
    let startRotation: [number, number, number] = [0, 0, 0];

    const dragBehavior = drag<SVGSVGElement, unknown>()
      .filter((event) => {
        // Don't capture drag when the user is interacting with a
        // child element that should handle its own input (e.g. the
        // tap-to-open-panel on cities). Empty area = our drag.
        const target = event.target as Element | null;
        return !!(target?.tagName === 'svg' || target?.classList.contains('celestial-drag-surface'));
      })
      .on('start', (event: D3DragEvent<SVGSVGElement, unknown, unknown>) => {
        dragStart = [event.x, event.y];
        startRotation = [...rotation];
      })
      .on('drag', (event: D3DragEvent<SVGSVGElement, unknown, unknown>) => {
        const dx = event.x - dragStart[0];
        const dy = event.y - dragStart[1];
        // Scale pixel delta to degrees by the projection scale so the
        // globe rotates at a natural rate. Approximate factor: 0.4
        // deg/px works well for our viewBox size.
        const scale = projection.scale();
        const sensitivity = 80 / scale;
        const newLambda = startRotation[0] + dx * sensitivity;
        // Clamp φ so the user can't flip past the poles.
        const newPhi = Math.max(-85, Math.min(85, startRotation[1] + dy * sensitivity));
        setRotation([newLambda, newPhi, startRotation[2]]);
      });

    select(svgEl).call(dragBehavior);
    return () => {
      // Detach by replacing with a no-op drag behaviour. d3-drag has no
      // explicit "remove" — calling .on('start', null) etc. is the way.
      select(svgEl).on('.drag', null);
    };
    // projection is stable per (mode, rotation); we depend on
    // `mode` here so this only re-runs when toggling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ── Mode transition animation (flat ↔ globe) ──────────────────────
  // Currently a snap-swap with a fade veil from the view. A future
  // refinement: blend two projections with d3.geoInterpolate. For now
  // the fade veil keeps the toggle feeling cinematic without the cost
  // of a per-frame projection rebuild.
  const setMode = useCallback((m: MapMode) => {
    if (m === mode) return;
    setIsAnimating(true);
    setModeState(m);
    // Reset zoom on mode toggle — a zoom level that was nice on flat
    // is nonsense on the globe and vice versa.
    if (svgRef.current && zoomBehaviorRef.current) {
      select(svgRef.current).transition().duration(MODE_TRANSITION_MS / 2).call(
        zoomBehaviorRef.current.transform,
        zoomIdentity,
      );
    }
    setTimeout(() => setIsAnimating(false), MODE_TRANSITION_MS);
  }, [mode]);

  const zoomIn = useCallback(() => {
    const svgEl = svgRef.current;
    const z = zoomBehaviorRef.current;
    if (!svgEl || !z) return;
    select(svgEl).transition().duration(300).call(z.scaleBy, 1.5);
  }, []);

  const zoomOut = useCallback(() => {
    const svgEl = svgRef.current;
    const z = zoomBehaviorRef.current;
    if (!svgEl || !z) return;
    select(svgEl).transition().duration(300).call(z.scaleBy, 1 / 1.5);
  }, []);

  const reset = useCallback(() => {
    const svgEl = svgRef.current;
    const z = zoomBehaviorRef.current;
    if (svgEl && z) {
      select(svgEl).transition().duration(500).call(z.transform, zoomIdentity);
    }
    setRotation([0, -10, 0]);
    setTapPin(null);
  }, []);

  // ── Fly-to (animate the camera to a lon/lat target) ───────────────
  // In globe mode: animates rotation so the target sits centre. In
  // flat mode: animates the zoom transform so the target sits centre
  // at the current scale. Used by the city search + power-places picks.
  const flyTo = useCallback(
    (lonLat: [number, number]) => {
      if (mode === 'globe') {
        const start: [number, number, number] = [...rotation];
        const interpRot = geoInterpolate(
          [-start[0], -start[1]] as [number, number],
          lonLat,
        );
        const duration = 700;
        const t0 = performance.now();
        const step = (now: number) => {
          const t = Math.min(1, (now - t0) / duration);
          const eased = easeCubicInOut(t);
          const [lon, lat] = interpRot(eased);
          setRotation([-lon, -lat, 0]);
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      } else {
        const svgEl = svgRef.current;
        const z = zoomBehaviorRef.current;
        if (!svgEl || !z) return;
        const projected = projection(lonLat);
        if (!projected) return;
        // Compute the transform that would centre `projected` in the
        // viewBox at the current scale k.
        const k = transform.k;
        const x = VIEW_WIDTH / 2 - projected[0] * k;
        const y = VIEW_HEIGHT / 2 - projected[1] * k;
        select(svgEl)
          .transition()
          .duration(700)
          .call(z.transform, zoomIdentity.translate(x, y).scale(k));
      }
    },
    [mode, rotation, projection, transform.k],
  );

  return {
    mode,
    transform,
    isAnimating,
    hovered,
    setHovered,
    tapPin,
    setTapPin,
    paths,
    project,
    invert,
    attachToSvg,
    setMode,
    zoomIn,
    zoomOut,
    reset,
    flyTo,
    viewWidth: VIEW_WIDTH,
    viewHeight: VIEW_HEIGHT,
  };
}
