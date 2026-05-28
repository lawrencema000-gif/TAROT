import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { geoEquirectangular, geoOrthographic, geoPath, geoGraticule10, geoInterpolate, type GeoProjection } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import { select } from 'd3-selection';
import { zoom, zoomIdentity, type D3ZoomEvent, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
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

  // Stable refs for the pointer handlers below — they read latest
  // values without re-binding listeners on every rotation tick (which
  // would cause the gesture to drop mid-drag).
  const projectionRef = useRef(projection);
  const rotationRef = useRef(rotation);
  useEffect(() => {
    projectionRef.current = projection;
  }, [projection]);
  useEffect(() => {
    rotationRef.current = rotation;
  }, [rotation]);

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

  // Track the current mode for d3-zoom's filter without rebinding the
  // whole behaviour on every mode change. d3's filter sees the latest
  // value via the ref.
  const modeRef = useRef<MapMode>(initialMode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // Attach d3-zoom + d3-drag handlers to the SVG. Re-runs whenever the
  // svg/group refs land. d3-zoom mutates a CSS transform on the group;
  // d3-drag (globe mode only) drives the rotation state.
  const attachToSvg = useCallback(
    (svgEl: SVGSVGElement | null, groupEl: SVGGElement | null) => {
      svgRef.current = svgEl;
      groupRef.current = groupEl;
      if (!svgEl) return;

      // ── d3-zoom ─────────────────────────────────────────────────
      // Filter: in globe mode, REJECT mousedown/touchstart so that
      // d3-drag (attached separately) can capture the rotation gesture.
      // Wheel + pinch still pass through so zoom continues to work in
      // both modes. Without this filter, d3-zoom and d3-drag fight over
      // the same pointer events and rotation never fires.
      const z = zoom<SVGSVGElement, unknown>()
        .scaleExtent(ZOOM_RANGE)
        .filter((event) => {
          // Allow wheel + pinch (touch with 2 fingers) at all times.
          // Block primary mousedown / single-finger touchstart when in
          // globe mode so the drag handler gets them.
          const isPrimaryDrag =
            event.type === 'mousedown' || event.type === 'touchstart' || event.type === 'pointerdown';
          if (isPrimaryDrag && modeRef.current === 'globe') {
            return false;
          }
          // Defer to d3-zoom's default filter: no ctrl-wheel for browser
          // zoom, no right-click pan, etc.
          return !event.ctrlKey && !event.button;
        })
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

      // Suppress browser pan-zoom on touch (we handle it ourselves).
      svgEl.style.touchAction = 'none';
    },
    [],
  );

  // ── Globe drag-to-rotate ──────────────────────────────────────────
  // Raw pointer-event handlers attached directly to the SVG. This is
  // the second attempt — the first used d3-drag with a `target.tagName
  // === 'svg'` filter, which only fired on truly empty SVG areas. On a
  // globe the SVG is dense with continent paths and planet lines, so
  // the filter rejected drag on almost every pixel and rotation never
  // worked.
  //
  // Raw handlers fire regardless of which child element is the target —
  // we capture the gesture at the root and only forward to child
  // handlers (city dot click, line tap) when the gesture is a CLICK,
  // not a drag (movement > 5px from start).
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || mode !== 'globe') return;

    let active = false;
    let startX = 0;
    let startY = 0;
    let startRotation: [number, number, number] = [0, 0, 0];
    let totalDelta = 0;

    function onPointerDown(e: PointerEvent) {
      if (e.button !== 0 && e.pointerType !== 'touch') return;
      active = true;
      startX = e.clientX;
      startY = e.clientY;
      startRotation = [...rotationRef.current];
      totalDelta = 0;
      svgEl!.setPointerCapture(e.pointerId);
    }

    function onPointerMove(e: PointerEvent) {
      if (!active) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      totalDelta = Math.max(totalDelta, Math.abs(dx) + Math.abs(dy));
      // Scale pixel delta to degrees by the projection scale so the
      // rotation feels natural at any zoom level.
      const scale = projectionRef.current?.scale() ?? 200;
      const sensitivity = 80 / scale;
      const newLambda = startRotation[0] + dx * sensitivity;
      // Clamp φ so the user can't flip past the poles.
      const newPhi = Math.max(-85, Math.min(85, startRotation[1] + dy * sensitivity));
      setRotation([newLambda, newPhi, startRotation[2]]);
    }

    function onPointerUp(e: PointerEvent) {
      if (!active) return;
      active = false;
      try { svgEl!.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
      // If the gesture was a real drag (movement > threshold), swallow
      // the subsequent click so the tap-to-open-panel doesn't fire.
      // Without this guard, rotating then releasing on a city dot
      // would open that city's panel.
      if (totalDelta > 6) {
        const stopClick = (clickEv: MouseEvent) => {
          clickEv.stopPropagation();
          clickEv.preventDefault();
          svgEl!.removeEventListener('click', stopClick, true);
        };
        svgEl!.addEventListener('click', stopClick, true);
        // Auto-cleanup in case no click event fires (e.g. touch release
        // outside the element).
        setTimeout(() => svgEl!.removeEventListener('click', stopClick, true), 50);
      }
    }

    svgEl.addEventListener('pointerdown', onPointerDown);
    svgEl.addEventListener('pointermove', onPointerMove);
    svgEl.addEventListener('pointerup', onPointerUp);
    svgEl.addEventListener('pointercancel', onPointerUp);
    return () => {
      svgEl.removeEventListener('pointerdown', onPointerDown);
      svgEl.removeEventListener('pointermove', onPointerMove);
      svgEl.removeEventListener('pointerup', onPointerUp);
      svgEl.removeEventListener('pointercancel', onPointerUp);
    };
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
