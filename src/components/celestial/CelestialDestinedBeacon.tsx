import { motion } from 'framer-motion';
import type { DestinedPlace } from '../../types';

/**
 * On-map visual treatment for the user's destined place.
 *
 * Rendered inside CelestialMapView's zoom group so it pans/zooms
 * with the map. Renders ONLY when a destined place is set (whether
 * saved to profile or revealed in-session).
 *
 * Layers (back to front):
 *   1. Outer radiance — large gradient halo behind the city
 *   2. Animated rays — 6 thin gold lines emanating at varied angles
 *   3. Triple pulsing ring — three nested SVG circles with phase-shifted
 *      <animate> elements driving radius + opacity
 *   4. Beacon core — solid gold dot
 *   5. Constellation lines (optional) — thin gold paths from each
 *      contributing planet's nearest line-sample to the city, drawn
 *      via stroke-dashoffset animation on mount so they "draw in"
 *   6. Floating label — city name in gold Cormorant
 *
 * The contributing-line geometry needs to come from the parent because
 * this component doesn't have access to the original GeoJSON. Parent
 * passes pre-projected segments: [{ from: [x,y], to: [x,y], color }].
 */

interface ConstellationSegment {
  from: [number, number];
  to: [number, number];
  color: string;
}

interface Props {
  /** Destined place metadata (city + contributing intent). */
  place: DestinedPlace;
  /** Projected [x, y] of the destined city in current viewBox coords. */
  cityXY: [number, number];
  /** Pre-projected segments from each contributing planet line to the city.
   *  Empty array is fine — beacon renders without them. */
  constellationSegments?: ConstellationSegment[];
  /** Whether to animate the entrance (true on first appear / new reveal,
   *  false on subsequent renders so the beacon doesn't replay every
   *  pan/zoom). */
  animateEntrance?: boolean;
}

/**
 * Beacon visual. All animations driven by SVG-native <animate> tags
 * (cheaper than Framer Motion on per-frame SVG attributes; runs even
 * when the React tree is idle).
 */
export function CelestialDestinedBeacon({
  place,
  cityXY,
  constellationSegments = [],
  animateEntrance = true,
}: Props) {
  const [cx, cy] = cityXY;

  return (
    <g className="celestial-destined-beacon" pointerEvents="none">
      {/* ── Outer radiance — big soft gradient ───────────────────── */}
      <defs>
        <radialGradient id="destined-radiance" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(244,214,104,0.45)" />
          <stop offset="40%" stopColor="rgba(244,214,104,0.18)" />
          <stop offset="100%" stopColor="rgba(244,214,104,0)" />
        </radialGradient>
      </defs>
      <motion.circle
        cx={cx}
        cy={cy}
        fill="url(#destined-radiance)"
        initial={animateEntrance ? { r: 0, opacity: 0 } : false}
        animate={{ r: 42, opacity: 1 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      />

      {/* ── Animated rays — 6 thin gold lines ────────────────────── */}
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i * 60 * Math.PI) / 180;
        const innerR = 14;
        const outerR = 28;
        const x1 = cx + Math.cos(angle) * innerR;
        const y1 = cy + Math.sin(angle) * innerR;
        const x2 = cx + Math.cos(angle) * outerR;
        const y2 = cy + Math.sin(angle) * outerR;
        return (
          <motion.line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#f4d668"
            strokeWidth={0.8}
            strokeOpacity={0.7}
            strokeLinecap="round"
            initial={animateEntrance ? { opacity: 0, pathLength: 0 } : false}
            animate={{ opacity: 0.7, pathLength: 1 }}
            transition={{ duration: 0.6, delay: 0.3 + i * 0.04, ease: 'easeOut' }}
          />
        );
      })}

      {/* ── Triple pulsing ring — phase-shifted halos ────────────── */}
      {[0, 0.7, 1.4].map((delay, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={6}
          fill="none"
          stroke="#f4d668"
          strokeWidth={0.6}
          opacity={0.65}
        >
          <animate
            attributeName="r"
            from="6"
            to="20"
            dur="2.1s"
            begin={`${delay}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            from="0.65"
            to="0"
            dur="2.1s"
            begin={`${delay}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}

      {/* ── Constellation lines from each contributing planet ────── */}
      {constellationSegments.map((seg, i) => (
        <motion.line
          key={`constellation-${i}`}
          x1={seg.from[0]}
          y1={seg.from[1]}
          x2={seg.to[0]}
          y2={seg.to[1]}
          stroke={seg.color}
          strokeWidth={1.2}
          strokeOpacity={0.55}
          strokeDasharray="3 3"
          strokeLinecap="round"
          initial={animateEntrance ? { pathLength: 0, opacity: 0 } : false}
          animate={{ pathLength: 1, opacity: 0.55 }}
          transition={{ duration: 1.1, delay: 0.5 + i * 0.12, ease: 'easeOut' }}
          style={{ filter: 'drop-shadow(0 0 4px currentColor)' }}
        />
      ))}

      {/* ── Beacon core — solid gold dot with bright centre ──────── */}
      <motion.g
        initial={animateEntrance ? { scale: 0, opacity: 0 } : false}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2, type: 'spring', stiffness: 200, damping: 14 }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      >
        <circle cx={cx} cy={cy} r={5} fill="#f4d668" />
        <circle cx={cx} cy={cy} r={2} fill="#fff8dc" />
      </motion.g>

      {/* ── City label — large, gold, Cormorant ─────────────────── */}
      <motion.text
        x={cx}
        y={cy - 24}
        textAnchor="middle"
        fill="#f4d668"
        style={{
          fontFamily: '"Cormorant Garamond", "Times New Roman", serif',
          fontSize: 14,
          fontWeight: 500,
          letterSpacing: '0.1em',
          filter: 'drop-shadow(0 0 4px rgba(244,214,104,0.6))',
        }}
        initial={animateEntrance ? { opacity: 0, y: cy - 18 } : false}
        animate={{ opacity: 1, y: cy - 24 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        {place.city.name}
      </motion.text>
    </g>
  );
}
