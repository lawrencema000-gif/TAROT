import { SIGN_SYMBOLS, PLANET_SYMBOLS, ZODIAC_SIGNS } from '../../types/astrology';
import type { ZodiacSign, Planet, PlanetPlacement } from '../../types/astrology';

interface Props {
  planets: PlanetPlacement[];
  houses: number[];
  ascendant: number | null;
}

const SIZE = 320;
const CENTER = SIZE / 2;
const OUTER_R = 145;
const SIGN_R = 130;
const INNER_R = 95;
const PLANET_R = 72;

function polarToXY(angleDeg: number, radius: number): [number, number] {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [CENTER + radius * Math.cos(rad), CENTER + radius * Math.sin(rad)];
}

const ELEMENT_COLORS: Record<string, string> = {
  Fire: '#e8889a',
  Earth: '#5bb8a9',
  Air: '#7ba3d4',
  Water: '#9789ad',
};

const SIGN_ELEMENT: Record<ZodiacSign, string> = {
  Aries: 'Fire', Taurus: 'Earth', Gemini: 'Air', Cancer: 'Water',
  Leo: 'Fire', Virgo: 'Earth', Libra: 'Air', Scorpio: 'Water',
  Sagittarius: 'Fire', Capricorn: 'Earth', Aquarius: 'Air', Pisces: 'Water',
};

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
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} className="max-w-full">
        <circle cx={CENTER} cy={CENTER} r={OUTER_R} fill="none" stroke="rgba(122,107,147,0.2)" strokeWidth="1" />
        <circle cx={CENTER} cy={CENTER} r={INNER_R} fill="none" stroke="rgba(122,107,147,0.2)" strokeWidth="1" />
        <circle cx={CENTER} cy={CENTER} r={PLANET_R - 20} fill="none" stroke="rgba(122,107,147,0.1)" strokeWidth="1" />

        {ZODIAC_SIGNS.map((sign: ZodiacSign, i: number) => {
          const startAngle = toChartAngle(i * 30);
          const midAngle = toChartAngle(i * 30 + 15);
          const [sx, sy] = polarToXY(startAngle, INNER_R);
          const [ex, ey] = polarToXY(startAngle, OUTER_R);
          const [tx, ty] = polarToXY(midAngle, SIGN_R);
          const color = ELEMENT_COLORS[SIGN_ELEMENT[sign]] || '#7a6b93';

          return (
            <g key={sign}>
              <line x1={sx} y1={sy} x2={ex} y2={ey} stroke="rgba(122,107,147,0.15)" strokeWidth="0.5" />
              <text
                x={tx} y={ty}
                textAnchor="middle"
                dominantBaseline="central"
                fill={color}
                fontSize="16"
                fontWeight={500}
                style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
              >
                {SIGN_SYMBOLS[sign]}
              </text>
            </g>
          );
        })}

        {houses.length === 12 && houses.map((cusp: number, i: number) => {
          const angle = toChartAngle(cusp);
          const [sx, sy] = polarToXY(angle, PLANET_R - 20);
          const [ex, ey] = polarToXY(angle, INNER_R);
          const isAngular = i === 0 || i === 3 || i === 6 || i === 9;

          return (
            <line
              key={`house-${i}`}
              x1={sx} y1={sy} x2={ex} y2={ey}
              stroke={isAngular ? 'rgba(212,175,85,0.4)' : 'rgba(122,107,147,0.15)'}
              strokeWidth={isAngular ? 1.5 : 0.5}
            />
          );
        })}

        {houses.length === 12 && houses.map((cusp: number, i: number) => {
          const nextCusp = houses[(i + 1) % 12];
          let mid = (cusp + nextCusp) / 2;
          if (nextCusp < cusp) mid = (cusp + nextCusp + 360) / 2;
          const angle = toChartAngle(mid % 360);
          const [tx, ty] = polarToXY(angle, INNER_R - 12);

          return (
            <text
              key={`hnum-${i}`}
              x={tx} y={ty}
              textAnchor="middle"
              dominantBaseline="central"
              fill="rgba(122,107,147,0.4)"
              fontSize="8"
            >
              {i + 1}
            </text>
          );
        })}

        {planets.map((p: PlanetPlacement, i: number) => {
          const angle = toChartAngle(getLongitude(p));
          const offset = (i % 3) * 8 - 8;
          const [px, py] = polarToXY(angle, PLANET_R + offset);

          return (
            <g key={p.planet as string}>
              <circle cx={px} cy={py} r={10} fill="rgba(18,16,28,0.9)" stroke="rgba(212,175,85,0.3)" strokeWidth="0.5" />
              <text
                x={px} y={py}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#d4af55"
                fontSize="13"
                fontWeight={500}
                style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
              >
                {PLANET_SYMBOLS[p.planet as Planet]}
              </text>
            </g>
          );
        })}

        {ascendant != null && (
          <text
            x={CENTER + OUTER_R + 8} y={CENTER + 4}
            fill="#d4af55"
            fontSize="9"
            fontWeight="bold"
          >
            ASC
          </text>
        )}
      </svg>
    </div>
  );
}
