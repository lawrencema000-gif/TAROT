import { useEffect, useRef, useState } from 'react';
import type { MapRef, MapMouseEvent } from 'react-map-gl/mapbox';
import { Map, Source, Layer } from 'react-map-gl/mapbox';
import type { LineLayerSpecification } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import {
  PLANETS,
  type PlanetName,
  type Angle,
} from '../../utils/astrocartography';

/**
 * The Mapbox map + planetary line layers.
 *
 * Token: lives in `import.meta.env.VITE_MAPBOX_TOKEN`. Without a token
 * the component renders a clear placeholder explaining what's needed
 * rather than failing silently. Mapbox public tokens are safe to embed
 * in client-side bundles per Mapbox's docs (rate-limited by domain).
 *
 * Style: we use a Mapbox stock dark style as the base then layer our
 * planetary lines on top. Cleanest path; we can swap in a fully-custom
 * Arcana-branded style later via Mapbox Studio without touching this
 * component.
 *
 * Line data is computed by the parent (CelestialMapPage) and passed in
 * already filtered. Lifting the math up lets the parent reuse the full
 * unfiltered FeatureCollection for the City Insight Panel's
 * "X more lines run through here" upgrade hints.
 */

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
  /** Initial camera. Defaults to a wide world view. */
  initialView?: { longitude: number; latitude: number; zoom: number };
}

/**
 * Brand color per planet for the line strokes. We keep gold as the
 * dominant family (Arcana brand) with subtle hue shifts per planet so
 * a chart with all 40 lines stays visually coherent rather than rainbow-
 * vomit. Hexes here are also used by the legend.
 */
const PLANET_COLORS: Record<PlanetName, string> = {
  Sun:     '#f4d668', // bright gold
  Moon:    '#e6e0ff', // pearl
  Mercury: '#a8e8e0', // mint
  Venus:   '#f0b8a0', // rose-gold
  Mars:    '#e07a5f', // amber-red
  Jupiter: '#d4af37', // warm gold
  Saturn:  '#c2b280', // cool gold
  Uranus:  '#80c8e8', // electric blue
  Neptune: '#8e6eb5', // purple
  Pluto:   '#a83253', // deep crimson
};

/**
 * Line width per angle type. AC/DC (horizon) lines are the headlining
 * curves so we draw them thicker; MC/IC (meridian) lines are thinner
 * since they're straight verticals and would otherwise overdominate.
 */
const ANGLE_WIDTH: Record<Angle, number> = {
  AC: 2.2,
  DC: 2.0,
  MC: 1.6,
  IC: 1.4,
};

export function CelestialMapView({
  lines,
  onMapClick,
  onLineClick,
  initialView,
}: Props) {
  const mapRef = useRef<MapRef | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

  // Wire a Mapbox click handler that hit-tests the planetary line
  // layer. If a line is hit, fire onLineClick; otherwise fire
  // onMapClick with the raw lon/lat (used for "tap a city").
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !mapLoaded) return;
    const handler = (e: MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: PLANETS.flatMap((p) => [
          `celestial-line-${p}-AC`,
          `celestial-line-${p}-DC`,
          `celestial-line-${p}-MC`,
          `celestial-line-${p}-IC`,
        ]),
      });
      if (features.length > 0 && onLineClick) {
        const f = features[0];
        const { planet, angle } = f.properties as { planet: PlanetName; angle: Angle };
        onLineClick(planet, angle);
        return;
      }
      if (onMapClick) {
        onMapClick([e.lngLat.lng, e.lngLat.lat]);
      }
    };
    map.on('click', handler);
    return () => {
      map.off('click', handler);
    };
  }, [mapLoaded, onMapClick, onLineClick]);

  if (!mapboxToken) {
    // Soft-fail when token isn't configured yet — clearer than a blank
    // map. This is what an admin sees during initial setup.
    return (
      <div className="h-full w-full flex items-center justify-center p-6 bg-mystic-950 hairline-gold-soft rounded-2xl">
        <div className="text-center max-w-sm">
          <div className="text-gold text-sm font-medium mb-2">Map provider not configured</div>
          <p className="text-mystic-400 text-xs leading-relaxed">
            Set <code className="text-gold">VITE_MAPBOX_TOKEN</code> in the build environment
            and redeploy. The astrocartography compute is already working —
            just the tile renderer is missing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={mapboxToken}
      // Stock dark style — Mapbox-hosted; will be swapped for a fully
      // custom Arcana style once we author one in Mapbox Studio. The
      // important thing is `dark-v11` already gives us navy land +
      // darker ocean + minimal labels which matches our brand baseline.
      mapStyle="mapbox://styles/mapbox/dark-v11"
      initialViewState={
        initialView ?? { longitude: 0, latitude: 20, zoom: 1.2 }
      }
      style={{ width: '100%', height: '100%' }}
      // Avoid the default Mapbox attribution overlay sitting on top of
      // our bottom nav; we'll add a less-intrusive credit elsewhere.
      attributionControl={false}
      onLoad={() => setMapLoaded(true)}
      onError={(e) => {
        // Surfaces invalid-token + network issues during dev.
        console.warn('[CelestialMap] mapbox error:', e);
      }}
    >
      <Source id="celestial-lines" type="geojson" data={lines}>
        {PLANETS.flatMap((planet) =>
          (['AC', 'DC', 'MC', 'IC'] as Angle[]).map((angle) => {
            const layerId = `celestial-line-${planet}-${angle}`;
            const layer: LineLayerSpecification = {
              id: layerId,
              type: 'line',
              source: 'celestial-lines',
              filter: [
                'all',
                ['==', ['get', 'planet'], planet],
                ['==', ['get', 'angle'], angle],
              ],
              paint: {
                'line-color': PLANET_COLORS[planet],
                'line-width': ANGLE_WIDTH[angle],
                'line-opacity': angle === 'AC' || angle === 'DC' ? 0.85 : 0.7,
                'line-blur': 0.4,
              },
            };
            return <Layer key={layerId} {...layer} />;
          }),
        )}
      </Source>
    </Map>
  );
}
