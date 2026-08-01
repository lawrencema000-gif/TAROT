/**
 * Golden tests for supabase/functions/_shared/charts-extended.ts (Deno module).
 *
 * Vitest cannot import Deno files, so this suite:
 *   (a) REPRODUCES each algorithm from the source, verbatim, and asserts it
 *       against INDEPENDENTLY-DERIVED expectations (hand math, physics,
 *       published tables — never the output of the code under test), and
 *   (b) SOURCE-GUARDS the Deno file as text, so the reproduced algorithms and
 *       the shipped algorithms cannot silently diverge.
 *
 * Reference ephemeris: astronomy-engine (same library the Deno module uses),
 * imported directly. Where astronomy-engine values appear they are used as the
 * physical reference (e.g. "the Moon's longitude at time t"), never as a
 * regurgitation of the module's own output.
 */
import { describe, it, expect } from 'vitest';
import * as Astronomy from 'astronomy-engine';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// ── Source text (for source-guards and table extraction) ──────────────────
const SRC_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..', '..', '..',
  'supabase', 'functions', '_shared', 'charts-extended.ts',
);
const src = readFileSync(SRC_PATH, 'utf8');
// Strip /* */ and // comments so guards only see executable code.
// (The file contains no regex literals or strings with "//", so this is safe.)
const stripped = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

// ── Reproduced helpers (verbatim from charts-extended.ts) ─────────────────
function normDeg(d: number): number { return ((d % 360) + 360) % 360; }
function wrap180(d: number): number { return ((d + 540) % 360) - 180; }
function shorterArcMidpoint(a: number, b: number): number {
  return normDeg(a + wrap180(b - a) / 2);
}

const SIDEREAL_MONTH_DAYS = 27.321661;
const TROPICAL_YEAR_DAYS = 365.2425;
const DAY_MS = 86400000;

// ══════════════════════════════════════════════════════════════════════════
// 1. shorterArcMidpoint
// ══════════════════════════════════════════════════════════════════════════
describe('shorterArcMidpoint', () => {
  it('midpoint(350, 10) = 0 — shorter arc crosses 0° Aries', () => {
    // Hand derivation: b-a = -340; wrap180(-340) = ((-340+540)%360)-180
    //   = 200-180 = +20 (the shorter arc from 350 to 10 is +20° forward).
    // mid = normDeg(350 + 20/2) = normDeg(360) = 0.
    expect(shorterArcMidpoint(350, 10)).toBe(0);
  });

  it('midpoint(10, 350) = 0 — symmetric across the wrap', () => {
    // b-a = 340; wrap180(340) = ((340+540)%360)-180 = 160-180 = -20
    // (shorter arc from 10 to 350 is 20° backward).
    // mid = normDeg(10 + (-20)/2) = normDeg(0) = 0.
    expect(shorterArcMidpoint(10, 350)).toBe(0);
  });

  it('midpoint(0, 180) = 270 — documents the antipodal convention', () => {
    // Antipodal points have two equally valid midpoints, 90 and 270.
    // Hand derivation of which one THIS formula picks:
    //   b-a = 180; wrap180(180) = ((180+540)%360)-180 = (720%360)-180
    //     = 0-180 = -180  ← wrap180 maps the boundary +180 to -180,
    //   so the half-arc is -90 and mid = normDeg(0 - 90) = 270.
    // Convention: the formula treats the separation as -180° (backward),
    // placing the midpoint 90° BEHIND `a`. 270 ∈ {90, 270}. ✓
    const m = shorterArcMidpoint(0, 180);
    expect([90, 270]).toContain(m);
    expect(m).toBe(270);
  });

  it('midpoint(30, 90) = 60 — plain interior case', () => {
    // b-a = 60; wrap180(60) = 60; mid = normDeg(30 + 30) = 60.
    expect(shorterArcMidpoint(30, 90)).toBe(60);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 2. Lunar return search (scan + bisect, reproduced from source)
// ══════════════════════════════════════════════════════════════════════════
// Verbatim reproduction of findLunarReturn from charts-extended.ts, with
// Astronomy.EclipticGeoMoon (geocentric, ecliptic-of-date) as the ephemeris.
function findLunarReturn(targetLon: number, around: Date): Date {
  const f = (t: Date) => wrap180(Astronomy.EclipticGeoMoon(t).lon - targetLon);
  const stepMs = 6 * 3600 * 1000;
  let prev = new Date(around.getTime() - 16 * DAY_MS);
  let prevV = f(prev);
  let bestLo: Date | null = null;
  let bestHi: Date | null = null;
  for (let t = prev.getTime() + stepMs; t <= around.getTime() + 16 * DAY_MS; t += stepMs) {
    const cur = new Date(t);
    const curV = f(cur);
    if (prevV < 0 && curV >= 0 && curV - prevV < 90) {
      if (!bestLo || Math.abs(t - around.getTime()) < Math.abs(bestHi!.getTime() - around.getTime())) {
        bestLo = prev; bestHi = cur;
      }
    }
    prev = cur; prevV = curV;
  }
  if (!bestLo || !bestHi) return around;
  let lo = bestLo.getTime(), hi = bestHi.getTime();
  while (hi - lo > 60_000) {
    const mid = (lo + hi) / 2;
    if (f(new Date(mid)) < 0) lo = mid; else hi = mid;
  }
  return new Date((lo + hi) / 2);
}

describe('lunar return search', () => {
  // Physics is the reference here (property assertions):
  //  - A sidereal month is 27.321661 days, so a ±16-day window (32 days total)
  //    around ANY date must contain at least one return — the search cannot
  //    legitimately come up empty.
  //  - The bisection terminates when the bracket is ≤ 60 s wide. The Moon's
  //    geocentric motion is ≤ 15.4°/day ≈ 0.0107°/min, so the residual at the
  //    returned instant must be < ~0.011°, comfortably inside 0.05°.
  const natal = new Date('2000-01-06T18:14:00Z'); // near the 2000-01-06 18:14 UT new moon
  const around = new Date('2024-06-15T00:00:00Z');

  it('finds an instant where the Moon is back at the natal longitude (±0.05°) within ±16 d', () => {
    const target = Astronomy.EclipticGeoMoon(natal).lon; // physical reference value
    const found = findLunarReturn(target, around);

    // Guard: the defensive fallback returns `around` verbatim; a real find
    // lands mid-bisection and will not equal it to the millisecond.
    expect(found.getTime()).not.toBe(around.getTime());

    const residual = Math.abs(wrap180(Astronomy.EclipticGeoMoon(found).lon - target));
    expect(residual).toBeLessThan(0.05);

    expect(Math.abs(found.getTime() - around.getTime())).toBeLessThanOrEqual(16 * DAY_MS);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 3. Firdaria tables (checked against the published Persian scheme,
//    extracted from the Deno source text — not reimplemented)
// ══════════════════════════════════════════════════════════════════════════
// Published reference: the Persian firdārīyāt of Abū Maʿshar (9th c.), as
// transmitted in e.g. Robert Hand, "Firdaria: A Persian System of Time Lords"
// (ARHAT) and Ben Dykes, "Persian Nativities III":
//   Diurnal:  Sun 10, Venus 8, Mercury 13, Moon 9, Saturn 11, Jupiter 12,
//             Mars 7, North Node 3, South Node 2   (total 75 years)
//   Nocturnal: same circular order, starting from the Moon:
//             Moon 9, Saturn 11, Jupiter 12, Mars 7, Sun 10, Venus 8,
//             Mercury 13, North Node 3, South Node 2  (total 75 years)
//   Sub-periods: each PLANETARY period is divided into 7 equal parts, the
//   first sub-lord being the major lord and the rest following the same
//   planetary sequence Sun→Venus→Mercury→Moon→Saturn→Jupiter→Mars
//   cyclically. The nodes receive no sub-periods.
const PUB_DAY: [string, number][] = [
  ['Sun', 10], ['Venus', 8], ['Mercury', 13], ['Moon', 9], ['Saturn', 11],
  ['Jupiter', 12], ['Mars', 7], ['North Node', 3], ['South Node', 2],
];
const PUB_NIGHT: [string, number][] = [
  ['Moon', 9], ['Saturn', 11], ['Jupiter', 12], ['Mars', 7], ['Sun', 10],
  ['Venus', 8], ['Mercury', 13], ['North Node', 3], ['South Node', 2],
];
const PUB_SUB_ORDER = ['Sun', 'Venus', 'Mercury', 'Moon', 'Saturn', 'Jupiter', 'Mars'];

function parsePairTable(name: string): [string, number][] {
  const m = stripped.match(new RegExp(name + String.raw`\s*:[^=]*=\s*\[([\s\S]*?)\];`));
  if (!m) throw new Error(`could not parse ${name} from source`);
  return [...m[1].matchAll(/\[\s*"([^"]+)"\s*,\s*(\d+)\s*\]/g)]
    .map((g) => [g[1], Number(g[2])] as [string, number]);
}

describe('Firdaria (tables extracted from Deno source vs published scheme)', () => {
  const dayTable = parsePairTable('FIRDARIA_DAY');
  const nightTable = parsePairTable('FIRDARIA_NIGHT');

  it('day sequence starts with the Sun and matches the published diurnal table', () => {
    expect(dayTable[0][0]).toBe('Sun');
    expect(dayTable).toEqual(PUB_DAY);
  });

  it('night sequence starts with the Moon and matches the published nocturnal table', () => {
    expect(nightTable[0][0]).toBe('Moon');
    expect(nightTable).toEqual(PUB_NIGHT);
  });

  it('each 75-year cycle sums exactly to 75 (10+8+13+9+11+12+7+3+2)', () => {
    // Hand sum: 10+8=18, +13=31, +9=40, +11=51, +12=63, +7=70, +3=73, +2=75.
    expect(dayTable.reduce((s, [, y]) => s + y, 0)).toBe(75);
    expect(nightTable.reduce((s, [, y]) => s + y, 0)).toBe(75);
  });

  it('sub-period lord order in source equals the published planetary sequence', () => {
    const m = stripped.match(/SUB_ORDER\s*=\s*\[([^\]]*)\]/);
    expect(m).not.toBeNull();
    const subOrder = [...m![1].matchAll(/"([^"]+)"/g)].map((g) => g[1]);
    expect(subOrder).toEqual(PUB_SUB_ORDER);
  });

  it('source: 7 equal sub-parts starting at the major lord; nodes get no subs', () => {
    // Structural guards on the generator itself:
    //  - subs exist only when the lord is not a node
    expect(stripped).toMatch(/!lord\.includes\(\s*["']Node["']\s*\)/);
    //  - exactly 7 sub-parts, each 1/7 of the major period
    expect(stripped).toMatch(/Array\.from\(\s*\{\s*length:\s*7\s*\}/);
    expect(stripped).toMatch(/\(\s*end\.getTime\(\)\s*-\s*start\.getTime\(\)\s*\)\s*\/\s*7/);
    //  - first sub-lord is the major lord, then cycle: SUB_ORDER[(startIdx+i)%7]
    //    with startIdx = SUB_ORDER.indexOf(lord) ⇒ i=0 yields the lord itself.
    expect(stripped).toMatch(/SUB_ORDER\.indexOf\(\s*lord\s*\)/);
    expect(stripped).toMatch(/SUB_ORDER\[\s*\(\s*startIdx\s*\+\s*i\s*\)\s*%\s*7\s*\]/);
  });

  it('hand-derived example: Mercury major period sub-lords', () => {
    // From the published cyclic sequence starting at Mercury:
    // Mercury → Moon → Saturn → Jupiter → Mars → Sun → Venus (derived by hand
    // by walking Sun,Venus,Mercury,Moon,Saturn,Jupiter,Mars from Mercury).
    const startIdx = PUB_SUB_ORDER.indexOf('Mercury');
    const subs = Array.from({ length: 7 }, (_, i) => PUB_SUB_ORDER[(startIdx + i) % 7]);
    expect(subs).toEqual(['Mercury', 'Moon', 'Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus']);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 4. Tertiary progression arithmetic
// ══════════════════════════════════════════════════════════════════════════
// Verbatim reproduction of tertiaryMoment from charts-extended.ts.
function tertiaryMoment(birthUtc: Date, now: Date): Date {
  const ageDays = (now.getTime() - birthUtc.getTime()) / DAY_MS;
  const lunarMonths = ageDays / SIDEREAL_MONTH_DAYS;
  return new Date(birthUtc.getTime() + lunarMonths * DAY_MS);
}

describe('tertiary progression', () => {
  it('age of exactly one sidereal month (27.321661 d) progresses exactly one day', () => {
    // Derivation: tertiary I maps 1 lunar (sidereal) month of life → 1 day of
    // ephemeris. ageDays / 27.321661 = 27.321661 / 27.321661 = 1 lunar month,
    // so the progressed moment is birth + 1 day, identically.
    // Tolerance: 27.321661 d = 2 360 591 510.4 ms; JS Date truncates the 0.4 ms
    // when constructing `now`, so the round trip can be off by ≤ ~2 ms.
    const birth = new Date(Date.UTC(1995, 2, 10, 6, 30, 0));
    const now = new Date(birth.getTime() + SIDEREAL_MONTH_DAYS * DAY_MS);
    const progressed = tertiaryMoment(birth, now);
    const expected = birth.getTime() + DAY_MS; // birth + 1 day exactly
    expect(Math.abs(progressed.getTime() - expected)).toBeLessThanOrEqual(5);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 5. Solar arc
// ══════════════════════════════════════════════════════════════════════════
// Reproduction of the arc computation in solarArcChart (the chart-shifting
// part is a uniform +arc rotation; the arc itself is the math under test).
function solarArcDegrees(birthUtc: Date, now: Date): number {
  const ageYears = (now.getTime() - birthUtc.getTime()) / (TROPICAL_YEAR_DAYS * DAY_MS);
  const progressed = new Date(birthUtc.getTime() + ageYears * DAY_MS);
  const natalSunLon = Astronomy.SunPosition(birthUtc).elon;      // physical reference
  const progressedSunLon = Astronomy.SunPosition(progressed).elon;
  return normDeg(progressedSunLon - natalSunLon);
}

describe('solar arc', () => {
  const birth = new Date('1990-06-15T12:00:00Z');

  it('arc ≈ 0 at age 0', () => {
    // progressed === birth, so the difference is identically 0 (same double).
    const arc = solarArcDegrees(birth, birth);
    expect(Math.min(arc, 360 - arc)).toBeLessThan(1e-6);
  });

  it('arc after one year is ~1° (in [0.9, 1.1])', () => {
    // Derivation: secondary progression maps 1 year of life → 1 day of
    // ephemeris (365.2425 d age / 365.2425 = 1.0 → progressed = birth + 1 d).
    // The Sun's apparent geocentric daily motion is 360°/365.2422 d
    // ≈ 0.9856°/day on average, ranging ~0.953°/day (aphelion, early July)
    // to ~1.019°/day (perihelion, early January) — always inside [0.9, 1.1].
    // 365.2425 d = 31 556 952 000 ms exactly, so no truncation error here.
    const now = new Date(birth.getTime() + TROPICAL_YEAR_DAYS * DAY_MS);
    const arc = solarArcDegrees(birth, now);
    expect(arc).toBeGreaterThanOrEqual(0.9);
    expect(arc).toBeLessThanOrEqual(1.1);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 6. Davison midpoints (time + geographic longitude)
// ══════════════════════════════════════════════════════════════════════════
// Reproductions of the midpoint arithmetic in davisonChart.
function davisonTimeMidpoint(aUtc: Date, bUtc: Date): Date {
  return new Date((aUtc.getTime() + bUtc.getTime()) / 2);
}
function davisonLonMidpoint(aLon: number, bLon: number): number {
  return normDeg(aLon + wrap180(bLon - aLon) / 2 + 180) - 180; // → (-180, 180]... see test
}

describe('Davison chart midpoints', () => {
  it('time midpoint of 2000-01-01 and 2010-01-01 is 2004-12-31T12:00Z (within ±1 d of 2005-01-01)', () => {
    // Hand derivation: days from 2000-01-01 to 2010-01-01 =
    //   10×365 + 3 leap days (2000, 2004, 2008) = 3653 days.
    // Half = 1826.5 days after 2000-01-01. Walking years:
    //   +366→2001, +365→2002 (731), +365→2003 (1096), +365→2004 (1461),
    //   +366→2005-01-01 (1827). So +1826.5 d = 2004-12-31T12:00:00Z.
    // In ms: (946684800000 + 1262304000000)/2 = 1104494400000.
    const a = new Date('2000-01-01T00:00:00Z');
    const b = new Date('2010-01-01T00:00:00Z');
    const mid = davisonTimeMidpoint(a, b);
    expect(mid.getTime()).toBe(Date.UTC(2004, 11, 31, 12, 0, 0));
    // The spec-level claim: within ±1 day of 2005-01-01 (it is 12 h before).
    expect(Math.abs(mid.getTime() - Date.UTC(2005, 0, 1))).toBeLessThanOrEqual(DAY_MS);
  });

  it('geographic longitude midpoint of 170°E and 170°W is the antimeridian (±180)', () => {
    // Shorter arc: 170 → 180 is 10° and -170 → 180 is 10°, so the shorter-arc
    // midpoint is the antimeridian. Hand-walking the formula for (170, -170):
    //   b-a = -340; wrap180(-340) = 200-180 = +20; half = +10;
    //   normDeg(170+10+180) = normDeg(360) = 0; 0-180 = -180.
    // So the formula lands on -180 (same meridian as +180).
    expect(Math.abs(davisonLonMidpoint(170, -170))).toBe(180);
    expect(Math.abs(davisonLonMidpoint(-170, 170))).toBe(180);
  });

  it('geographic longitude midpoint sanity: mid(10, 20) = 15', () => {
    // wrap180(10) = 10; normDeg(10 + 5 + 180) = 195; 195 - 180 = 15.
    expect(davisonLonMidpoint(10, 20)).toBe(15);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 7. Source-guards on the Deno file
// ══════════════════════════════════════════════════════════════════════════
describe('source-guard: charts-extended.ts', () => {
  it('reuses the golden-tested natal core (imports ./natal.ts)', () => {
    expect(src).toMatch(/from\s+["']\.\/natal\.ts["']/);
  });

  it('uses the GEOCENTRIC Moon (EclipticGeoMoon), never bare EclipticLongitude()', () => {
    // Astronomy.EclipticLongitude(Body.Moon, t) is HELIOCENTRIC — using it for
    // the Moon is the classic trap (the Moon's heliocentric longitude is
    // essentially the Earth's). The geocentric API is EclipticGeoMoon.
    expect(stripped).toContain('EclipticGeoMoon');
    expect(stripped).not.toMatch(/\bEclipticLongitude\(/);
  });

  it('ships the exact formulas reproduced in this suite', () => {
    // normDeg / wrap180 / shorterArcMidpoint
    expect(stripped).toMatch(/\(\s*\(\s*d\s*%\s*360\s*\)\s*\+\s*360\s*\)\s*%\s*360/);
    expect(stripped).toMatch(/\(\s*\(\s*d\s*\+\s*540\s*\)\s*%\s*360\s*\)\s*-\s*180/);
    expect(stripped).toMatch(/normDeg\(\s*a\s*\+\s*wrap180\(\s*b\s*-\s*a\s*\)\s*\/\s*2\s*\)/);
    // Tertiary + solar-arc constants
    expect(stripped).toMatch(/SIDEREAL_MONTH_DAYS\s*=\s*27\.321661\b/);
    expect(stripped).toMatch(/TROPICAL_YEAR_DAYS\s*=\s*365\.2425\b/);
    // Solar arc uses SunPosition (geocentric ecliptic-of-date Sun)
    expect(stripped).toMatch(/SunPosition\(/);
    // Davison midpoints
    expect(stripped).toMatch(/\(\s*aUtc\.getTime\(\)\s*\+\s*bUtc\.getTime\(\)\s*\)\s*\/\s*2/);
    expect(stripped).toMatch(/normDeg\(\s*aLon\s*\+\s*wrap180\(\s*bLon\s*-\s*aLon\s*\)\s*\/\s*2\s*\+\s*180\s*\)\s*-\s*180/);
    // Lunar return: 6 h scan step, ±16 d window, ≤ 60 s bisection bracket
    expect(stripped).toMatch(/6\s*\*\s*3600\s*\*\s*1000/);
    expect(stripped).toMatch(/16\s*\*\s*86400000/);
    expect(stripped).toMatch(/hi\s*-\s*lo\s*>\s*60_000/);
  });
});
