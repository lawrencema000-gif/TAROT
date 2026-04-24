import { ZODIAC_SIGNS } from '../../types/astrology';
import type { ZodiacSign, Planet, PlanetPlacement } from '../../types/astrology';
import { ZodiacGlyphPaths, PlanetGlyphPaths } from '../icons';

/**
 * Horoscope chart wheel — astrolabe edition.
 *
 * Matches the visual language of the detailed natal chart wheel
 * (src/components/chart/ChartWheel.tsx) but with a simpler,
 * view-only interaction model. Used inside the Horoscope → Birth
 * Chart section.
 *
 * See the larger ChartWheel for the design rationale. In short:
 *   - Double gold-bead outer frame with cardinal diamonds
 *   - Element-tinted sign sectors (Fire/Earth/Air/Water)
 *   - Degree tick markings every 5° + long marks every 30°
 *   - Planet coins with outer bead ring + inner hairline
 *   - Roman-numeral house numbers in serif italic
 *   - Compass-rose center with 12 rays
 *   - Parchment noise clipped inside wheel
 */

interface Props {
  planets: PlanetPlacement[];
  houses: number[];
  ascendant: number | null;
}

const SIZE = 340;
const CENTER = SIZE / 2;

// Concentric radii
const R_OUTER_BEAD = 160;  // outer bead border
const R_OUTER_INNER = 152; // inner bead border
const R_SIGN = 140;        // sign ring outer
const R_SIGN_INNER = 114;  // sign ring inner
const R_HOUSE_NUM = 88;    // where Roman numerals sit
const R_PLANET = 72;       // planet coin centers
const R_ROSETTE_OUT = 30;  // compass rose outer
const R_ROSETTE_IN = 5;

// Element palette — matches natal wheel
const ELEMENT_FILL: Record<string, string> = {
  Fire:  'rgba(224, 122, 95, 0.10)',
  Earth: 'rgba(78, 205, 196, 0.10)',
  Air:   'rgba(74, 126, 184, 0.10)',
  Water: 'rgba(142, 110, 181, 0.10)',
};
const ELEMENT_GLYPH: Record<string, string> = {
  Fire:  '#e89a87',
  Earth: '#7ee8e1',
  Air:   '#8fb9e6',
  Water: '#b19ed1',
};
const SIGN_ELEMENT: Record<ZodiacSign, string> = {
  Aries: 'Fire', Taurus: 'Earth', Gemini: 'Air', Cancer: 'Water',
  Leo: 'Fire', Virgo: 'Earth', Libra: 'Air', Scorpio: 'Water',
  Sagittarius: 'Fire', Capricorn: 'Earth', Aquarius: 'Air', Pisces: 'Water',
};
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

// Convert an angle (0 = top, CW) to SVG x/y.
function polarToXY(angleDeg: number, radius: number): [number, number] {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [CENTER + radius * Math.cos(rad), CENTER + radius * Math.sin(rad)];
}

function sectorPath(rInner: number, rOuter: number, startDeg: number, endDeg: number): string {
  const [sx1, sy1] = polarToXY(startDeg, rOuter);
  const [sx2, sy2] = polarToXY(endDeg, rOuter);
  const [ix1, iy1] = polarToXY(endDeg, rInner);
  const [ix2, iy2] = polarToXY(startDeg, rInner);
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  return [
    `M ${sx1.toFixed(2)} ${sy1.toFixed(2)}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${sx2.toFixed(2)} ${sy2.toFixed(2)}`,
    `L ${ix1.toFixed(2)} ${iy1.toFixed(2)}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${ix2.toFixed(2)} ${iy2.toFixed(2)}`,
    'Z',
  ].join(' ');
}

function getLongitude(p: PlanetPlacement): number {
  if (p.longitude != null) return p.longitude;
  const signIdx = ZODIAC_SIGNS.indexOf(p.sign);
  return signIdx * 30 + p.degree;
}

export function ChartWheel({ planets, houses, ascendant }: Props) {
  const ascOffset = ascendant != null ? ascendant : 0;
  const toChartAngle = (lon: number) => ((ascOffset - lon + 360) % 360);

  return (
    <div className="flex justify-center">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} className="max-w-full" role="img" aria-label="Horoscope chart wheel">
        <defs>
          <clipPath id="horoscopeInterior">
            <circle cx={CENTER} cy={CENTER} r={R_OUTER_INNER - 1} />
          </clipPath>
          <filter id="parchmentNoiseHoroscope">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix values="0 0 0 0 0.83
                                   0 0 0 0 0.69
                                   0 0 0 0 0.22
                                   0 0 0 0.03 0" />
          </filter>
          <radialGradient id="horoscopeOuterGlow" cx="50%" cy="50%" r="50%">
            <stop offset="85%" stopColor="rgba(212,175,55,0)" />
            <stop offset="95%" stopColor="rgba(212,175,55,0.25)" />
            <stop offset="100%" stopColor="rgba(212,175,55,0)" />
          </radialGradient>
        </defs>

        {/* Outer glow */}
        <circle cx={CENTER} cy={CENTER} r={R_OUTER_BEAD + 6} fill="url(#horoscopeOuterGlow)" />

        {/* Parchment interior */}
        <g clipPath="url(#horoscopeInterior)">
          <rect x="0" y="0" width={SIZE} height={SIZE} fill="#0d0d1a" />
          <rect x="0" y="0" width={SIZE} height={SIZE} filter="url(#parchmentNoiseHoroscope)" opacity="0.45" />
        </g>

        {/* Double bead border */}
        <circle cx={CENTER} cy={CENTER} r={R_OUTER_BEAD} fill="none" stroke="rgba(212,175,55,0.65)" strokeWidth={1} />
        <circle cx={CENTER} cy={CENTER} r={R_OUTER_INNER} fill="none" stroke="rgba(212,175,55,0.55)" strokeWidth={0.8} />
        {Array.from({ length: 36 }).map((_, i) => {
          const angle = i * 10;
          if (angle % 90 === 0) return null;
          const [x, y] = polarToXY(angle, (R_OUTER_BEAD + R_OUTER_INNER) / 2);
          return <circle key={`hbead-${i}`} cx={x} cy={y} r={1} fill="#d4af37" opacity={0.85} />;
        })}
        {[0, 90, 180, 270].map((angle) => {
          const [x, y] = polarToXY(angle, (R_OUTER_BEAD + R_OUTER_INNER) / 2);
          return (
            <g key={`hdiamond-${angle}`} transform={`translate(${x} ${y}) rotate(45)`}>
              <rect x={-2.3} y={-2.3} width={4.6} height={4.6} fill="#d4af37" />
              <rect x={-2.3} y={-2.3} width={4.6} height={4.6} fill="none" stroke="rgba(244,214,104,0.9)" strokeWidth={0.4} />
            </g>
          );
        })}

        {/* Sign sectors — element-tinted */}
        {ZODIAC_SIGNS.map((sign: ZodiacSign, i: number) => {
          const startAngle = toChartAngle(i * 30);
          const endAngle = toChartAngle((i + 1) * 30);
          // In this chart's convention ascOffset - lon decreases with lon; swap for sector path.
          const [a, b] = endAngle > startAngle ? [startAngle, endAngle] : [endAngle, startAngle];
          const midAngle = (a + b) / 2;
          const [tx, ty] = polarToXY(midAngle, (R_SIGN + R_SIGN_INNER) / 2);
          const element = SIGN_ELEMENT[sign];
          return (
            <g key={sign}>
              <path
                d={sectorPath(R_SIGN_INNER, R_SIGN, a, b)}
                fill={ELEMENT_FILL[element]}
                stroke="rgba(212,175,55,0.18)"
                strokeWidth={0.5}
              />
              <g
                transform={`translate(${tx - 9} ${ty - 9}) scale(${18 / 32})`}
                stroke={ELEMENT_GLYPH[element]}
                strokeWidth={2.4}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <ZodiacGlyphPaths sign={sign} />
              </g>
            </g>
          );
        })}

        {/* Degree tick marks — 2° steps */}
        {Array.from({ length: 180 }).map((_, i) => {
          const deg = i * 2;
          const angle = toChartAngle(deg);
          const isSignBoundary = deg % 30 === 0;
          const is10 = deg % 10 === 0;
          const rInside = isSignBoundary ? R_SIGN_INNER - 8 : is10 ? R_SIGN_INNER - 5 : R_SIGN_INNER - 2;
          const [x1, y1] = polarToXY(angle, R_SIGN_INNER);
          const [x2, y2] = polarToXY(angle, rInside);
          const opacity = isSignBoundary ? 0.9 : is10 ? 0.5 : 0.2;
          const width = isSignBoundary ? 1 : is10 ? 0.55 : 0.3;
          const color = isSignBoundary ? '#d4af37' : '#ffffff';
          return (
            <line key={`htick-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeOpacity={opacity} strokeWidth={width} />
          );
        })}

        {/* House spokes */}
        {houses.length === 12 && houses.map((cusp: number, i: number) => {
          const angle = toChartAngle(cusp);
          const [sx, sy] = polarToXY(angle, R_ROSETTE_OUT + 4);
          const [ex, ey] = polarToXY(angle, R_SIGN_INNER);
          const isAngular = i === 0 || i === 3 || i === 6 || i === 9;
          return (
            <line
              key={`hspoke-${i}`}
              x1={sx} y1={sy} x2={ex} y2={ey}
              stroke={isAngular ? 'rgba(212,175,55,0.55)' : 'rgba(255,255,255,0.12)'}
              strokeWidth={isAngular ? 1.1 : 0.5}
            />
          );
        })}

        {/* Roman-numeral house numbers */}
        {houses.length === 12 && houses.map((cusp: number, i: number) => {
          const nextCusp = houses[(i + 1) % 12];
          let mid = (cusp + nextCusp) / 2;
          if (nextCusp < cusp) mid = (cusp + nextCusp + 360) / 2;
          const angle = toChartAngle(mid % 360);
          const [tx, ty] = polarToXY(angle, R_HOUSE_NUM);
          const isAngular = i === 0 || i === 3 || i === 6 || i === 9;
          return (
            <text
              key={`hnum-${i}`}
              x={tx} y={ty}
              textAnchor="middle"
              dominantBaseline="central"
              fill={isAngular ? 'rgba(212,175,55,0.9)' : 'rgba(255,255,255,0.45)'}
              fontSize={isAngular ? 11 : 9}
              fontWeight={isAngular ? 600 : 400}
              fontStyle="italic"
              style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', letterSpacing: '0.05em' }}
            >
              {ROMAN[i]}
            </text>
          );
        })}

        {/* Compass-rose center */}
        <g style={{ pointerEvents: 'none' }}>
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = i * 30;
            const long = i % 3 === 0;
            const [x1, y1] = polarToXY(angle, R_ROSETTE_IN + 3);
            const [x2, y2] = polarToXY(angle, long ? R_ROSETTE_OUT : R_ROSETTE_OUT - 7);
            return (
              <line
                key={`hray-${i}`}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="rgba(212,175,55,0.32)"
                strokeWidth={long ? 0.8 : 0.4}
                strokeLinecap="round"
              />
            );
          })}
          <circle cx={CENTER} cy={CENTER} r={R_ROSETTE_OUT - 3} fill="none" stroke="rgba(212,175,55,0.16)" strokeWidth={0.5} />
          <circle cx={CENTER} cy={CENTER} r={R_ROSETTE_IN + 2.5} fill="none" stroke="rgba(212,175,55,0.35)" strokeWidth={0.5} />
          <circle cx={CENTER} cy={CENTER} r={R_ROSETTE_IN} fill="#d4af37" />
        </g>

        {/* Planet coins */}
        {planets.map((p: PlanetPlacement, i: number) => {
          const angle = toChartAngle(getLongitude(p));
          const offset = (i % 3) * 7 - 7;
          const [px, py] = polarToXY(angle, R_PLANET + offset);
          return (
            <g key={p.planet as string}>
              <circle cx={px} cy={py} r={11} fill="none" stroke="rgba(212,175,55,0.3)" strokeWidth={0.5} />
              <circle cx={px} cy={py} r={9.5} fill="#0a0a10" stroke="#d4af37" strokeWidth={0.8} />
              <circle cx={px} cy={py} r={8} fill="none" stroke="rgba(212,175,55,0.28)" strokeWidth={0.4} />
              <g
                transform={`translate(${px - 6.5} ${py - 6.5}) scale(${13 / 32})`}
                stroke="#f4d668"
                strokeWidth={2.4}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <PlanetGlyphPaths planet={p.planet as Planet} />
              </g>
            </g>
          );
        })}

        {/* ASC / DESC / MC / IC labels on the outer frame */}
        {ascendant != null && (() => {
          const axes: Array<{ label: string; lon: number }> = [
            { label: 'ASC',  lon: ascOffset },
            { label: 'DESC', lon: (ascOffset + 180) % 360 },
            { label: 'MC',   lon: houses && houses[9] != null ? houses[9] : (ascOffset + 270) % 360 },
            { label: 'IC',   lon: houses && houses[9] != null ? (houses[9] + 180) % 360 : (ascOffset + 90) % 360 },
          ];
          return axes.map(({ label, lon }) => {
            const angle = toChartAngle(lon);
            const [lx, ly] = polarToXY(angle, R_OUTER_BEAD + 9);
            const [sx, sy] = polarToXY(angle, R_SIGN_INNER + 4);
            return (
              <g key={`axis-${label}`}>
                <g transform={`translate(${sx} ${sy})`}>
                  <path
                    d="M 0 -4 L 1 -1 L 4 0 L 1 1 L 0 4 L -1 1 L -4 0 L -1 -1 Z"
                    fill="#d4af37"
                    stroke="rgba(244,214,104,0.9)"
                    strokeWidth={0.4}
                  />
                </g>
                <text
                  x={lx} y={ly}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={9}
                  fontStyle="italic"
                  fontWeight={500}
                  fill="rgba(212,175,55,0.9)"
                  style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', letterSpacing: '0.15em', userSelect: 'none' }}
                >
                  {label}
                </text>
              </g>
            );
          });
        })()}
      </svg>
    </div>
  );
}
