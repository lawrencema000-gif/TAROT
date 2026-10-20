// @vitest-environment node
// (node: the server module imports an npm: specifier, which only the node transform lets vi.mock answer)
/**
 * The Midheaven of supabase/functions/_shared/natal.ts (astrology-person-chart,
 * the chart suite, compare, daily score) — p9 Q22.
 *
 * computeMidheaven returned atan2(tan RAMC, cos ε), which only answers in
 * (−90°, 90°): for every RAMC between 90° and 270° — about half of all births
 * — it gave the IC, and ChartWheel drew "IC" at the top and "MC" at the
 * bottom. The QA's person 阿明 (1990-11-02 08:30 Shanghai): RAMC 169.98°,
 * true MC 169.10° (Virgo 19.1°); the server said 349.11° (Pisces 19.1°).
 *
 * The reference here does not use the formula. The MC is, by definition, the
 * point of the ecliptic on the upper meridian: its right ascension is the
 * local sidereal time. astronomy-engine gives the sidereal time and the
 * rotation from the true ecliptic of date to the equator of date; the
 * ecliptic longitude whose right ascension is the RAMC is solved for
 * numerically, and Horizon confirms it is the upper culmination (above the
 * horizon, the IC below).
 */
import { describe, it, expect, vi } from 'vitest';
import * as A from 'astronomy-engine';

// natal.ts (Deno) imports npm:astronomy-engine@2.1.19 — the package the client ships, same version.
vi.mock('npm:astronomy-engine@2.1.19', async () => await import('astronomy-engine'));

interface ServerNatal {
  computeNatalChart: (input: { birthDate: string; birthTime?: string | null; lat?: number; lon?: number; timezone?: string }) => {
    ascendant: number | null;
    midheaven: number | null;
    midheavenSign: string | null;
    version: number;
  };
  lonToSign: (lon: number) => { sign: string; degree: number };
  localToUTC: (birthDate: string, birthTime: string | null, timezone: string) => Date;
  CHART_VERSION: number;
}
const SERVER_NATAL = '../../../supabase/functions/_shared/natal';
const natal = (await import(/* @vite-ignore */ SERVER_NATAL)) as ServerNatal;

const norm = (d: number) => ((d % 360) + 360) % 360;
/** Signed difference a − b in (−180°, 180°]. */
const diff = (a: number, b: number) => {
  const d = norm(a - b);
  return d > 180 ? d - 360 : d;
};
const arc = (a: number, b: number) => Math.abs(diff(a, b));

function ramcOf(utc: Date, lon: number): number {
  return norm((A.SiderealTime(utc) + lon / 15) * 15);
}

/** The right ascension (degrees) of the true-ecliptic point at longitude `lambda`. */
function raOfEclipticPoint(utc: Date, lambda: number): { ra: number; dec: number } {
  const time = A.MakeTime(utc);
  const ecl = A.VectorFromSphere(new A.Spherical(0, lambda, 1), time);
  const eq = A.EquatorFromVector(A.RotateVector(A.Rotation_ECT_EQD(time), ecl));
  return { ra: eq.ra * 15, dec: eq.dec };
}

/** The ecliptic longitude whose right ascension is the RAMC, by bisection near the RAMC. */
function referenceMidheaven(utc: Date, lon: number): number {
  const ramc = ramcOf(utc, lon);
  // RA(λ) − RAMC rises through 0 once within a few degrees of the RAMC (the
  // reduction to the ecliptic is under 2.5°).
  let lo = ramc - 10;
  let hi = ramc + 10;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (diff(raOfEclipticPoint(utc, mid).ra, ramc) < 0) lo = mid;
    else hi = mid;
  }
  return norm((lo + hi) / 2);
}

function altitudeOf(utc: Date, lat: number, lon: number, lambda: number): number {
  const { ra, dec } = raOfEclipticPoint(utc, lambda);
  return A.Horizon(utc, new A.Observer(lat, lon, 0), ra / 15, dec).altitude;
}

/** The formula natal.ts had before the fix. */
function headMidheaven(utc: Date, lon: number): number {
  const ramc = ramcOf(utc, lon) * (Math.PI / 180);
  return norm((Math.atan2(Math.tan(ramc), Math.cos((23.4393 * Math.PI) / 180)) * 180) / Math.PI);
}

interface Birth { name: string; birthDate: string; birthTime: string; lat: number; lon: number; timezone: string }
const BIRTHS: Birth[] = [
  { name: '阿明, Shanghai (the QA person)', birthDate: '1990-11-02', birthTime: '08:30', lat: 31.22, lon: 121.46, timezone: 'Asia/Shanghai' },
  { name: 'Sydney (the QA natal account)', birthDate: '1988-11-02', birthTime: '14:10', lat: -33.8688, lon: 151.2093, timezone: 'Australia/Sydney' },
  { name: 'Osaka', birthDate: '1991-03-08', birthTime: '06:45', lat: 34.6937, lon: 135.5023, timezone: 'Asia/Tokyo' },
  { name: 'Osaka, evening', birthDate: '1991-03-08', birthTime: '18:45', lat: 34.6937, lon: 135.5023, timezone: 'Asia/Tokyo' },
  { name: 'New York', birthDate: '2001-07-04', birthTime: '02:30', lat: 40.7128, lon: -74.006, timezone: 'America/New_York' },
  { name: 'Reykjavik', birthDate: '1970-12-31', birthTime: '00:00', lat: 64.1466, lon: -21.9426, timezone: 'Atlantic/Reykjavik' },
  { name: 'Melbourne', birthDate: '1985-01-15', birthTime: '23:59', lat: -37.8136, lon: 144.9631, timezone: 'Australia/Melbourne' },
  { name: 'London', birthDate: '1960-06-15', birthTime: '12:00', lat: 51.5074, lon: -0.1278, timezone: 'Europe/London' },
  { name: 'São Paulo', birthDate: '1995-09-10', birthTime: '18:20', lat: -23.5505, lon: -46.6333, timezone: 'America/Sao_Paulo' },
  { name: 'Seoul', birthDate: '1999-02-14', birthTime: '09:05', lat: 37.5665, lon: 126.978, timezone: 'Asia/Seoul' },
  { name: 'Cairo', birthDate: '1975-03-21', birthTime: '06:00', lat: 30.0444, lon: 31.2357, timezone: 'Africa/Cairo' },
  { name: 'Los Angeles', birthDate: '1982-08-30', birthTime: '21:40', lat: 34.0522, lon: -118.2437, timezone: 'America/Los_Angeles' },
];

const cases = BIRTHS.map((b) => {
  const utc = natal.localToUTC(b.birthDate, b.birthTime, b.timezone);
  const chart = natal.computeNatalChart({ birthDate: b.birthDate, birthTime: b.birthTime, lat: b.lat, lon: b.lon, timezone: b.timezone });
  const ramc = ramcOf(utc, b.lon);
  return { ...b, utc, chart, ramc, swapped: ramc > 90 && ramc < 270 };
});

describe('natal.ts Midheaven (p9 Q22)', () => {
  it('the births cover both halves of the RAMC circle, the half the old formula swapped included', () => {
    expect(cases.filter((c) => c.swapped).length).toBeGreaterThanOrEqual(4);
    expect(cases.filter((c) => !c.swapped).length).toBeGreaterThanOrEqual(4);
  });

  it.each(cases.map((c) => [c.name, c] as const))('%s: the MC is the culminating ecliptic point (astronomy-engine)', (_name, c) => {
    const ref = referenceMidheaven(c.utc, c.lon);
    expect(arc(c.chart.midheaven!, ref)).toBeLessThan(0.02);
    expect(c.chart.midheavenSign).toBe(natal.lonToSign(ref).sign);
    // The upper culmination: above the horizon; the IC opposite it below.
    expect(altitudeOf(c.utc, c.lat, c.lon, c.chart.midheaven!)).toBeGreaterThan(0);
    expect(altitudeOf(c.utc, c.lat, c.lon, norm(c.chart.midheaven! + 180))).toBeLessThan(0);
    // Within the reduction to the ecliptic of the RAMC, and east of it lies the ascendant.
    expect(arc(c.chart.midheaven!, c.ramc)).toBeLessThan(2.6);
    const ascFromMc = norm(c.chart.ascendant! - c.chart.midheaven!);
    expect(ascFromMc).toBeGreaterThan(0);
    expect(ascFromMc).toBeLessThan(180);
  });

  it('the old formula gave the IC exactly where RAMC is between 90° and 270°, and the MC elsewhere', () => {
    for (const c of cases) {
      const ref = referenceMidheaven(c.utc, c.lon);
      expect(arc(headMidheaven(c.utc, c.lon), ref)).toBeCloseTo(c.swapped ? 180 : 0, 1);
    }
  });

  it('阿明: MC Virgo 19.1° (the server said Pisces 19.1°), ascendant Sagittarius 7.9° as before', () => {
    const c = cases[0];
    expect(c.ramc).toBeCloseTo(169.98, 1);
    expect(natal.lonToSign(c.chart.midheaven!)).toEqual({ sign: 'Virgo', degree: expect.closeTo(19.1, 1) });
    expect(c.chart.midheaven!).toBeCloseTo(169.1, 1);
    expect(natal.lonToSign(c.chart.ascendant!).sign).toBe('Sagittarius');
    expect(c.chart.ascendant!).toBeCloseTo(247.86, 1);
  });

  it('the charts cached before the fix are recomputed (CHART_VERSION moved on from 2)', () => {
    expect(natal.CHART_VERSION).toBe(3);
    expect(cases[0].chart.version).toBe(3);
  });
});
