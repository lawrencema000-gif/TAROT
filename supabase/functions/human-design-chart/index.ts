import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import * as Astronomy from "npm:astronomy-engine@2.1.19";
import { AppError, handler } from "../_shared/handler.ts";

/**
 * Human Design chart — real bodygraph from ecliptic longitudes.
 *
 * Replaces the client-side `deriveHumanDesign()` hash-stub with a
 * proper 88°-solar-arc calculation that reads:
 *
 *   1. 13 Personality activations at birth
 *      Sun, Earth, Moon, North Node, South Node, Mercury..Pluto.
 *      ("Earth" is the point 180° opposite the Sun; nodes are
 *      simplified as the Moon's mean node + its opposite.)
 *   2. 13 Design activations at the moment when the Sun's longitude
 *      was exactly 88° less than birth (typically ~88.5 days prior).
 *      Found by binary-search on an astronomy-engine Sun-longitude
 *      probe — tolerance ~0.0001°.
 *
 * Each longitude is mapped to an I-Ching Gate (64 gates x 5.625°) and
 * a Line (1-6 within the gate). Gates determine which of the 36 HD
 * channels are defined (both gate-halves hanging). Channels determine
 * which of the 9 centres are defined, which gives Type, Authority,
 * and Profile.
 *
 * Output mirrors what the client UI needs:
 *   { type, strategy, notSelfTheme, authority, profile,
 *     definedCenters[], openCenters[], channels[], personality[],
 *     design[], profileLines: [personalityLine, designLine] }
 */

// ─── Constants ────────────────────────────────────────────────────
// Gate wheel starts at gate 41 line 1 at ecliptic longitude 302.25°
// (2°15' Aquarius). Each gate spans 5.625° (= 360° / 64).
const GATE_WHEEL_START_LON = 302.25;
const GATE_WIDTH = 360 / 64;
const LINE_WIDTH = GATE_WIDTH / 6;

// Canonical gate order around the HD Rave mandala, starting at gate
// 41 and moving counter-clockwise (same direction as increasing
// ecliptic longitude when you cross from Aquarius into Pisces).
// Source: Ra Uru Hu, The Rave I'Ching.
const GATE_WHEEL: number[] = [
  41, 19, 13, 49, 30, 55, 37, 63, 22, 36, // Aquarius - Pisces
  25, 17, 21, 51, 42, 3,                   // Aries
  27, 24, 2, 23, 8, 20,                    // Taurus
  16, 35, 45, 12, 15, 52,                  // Gemini
  39, 53, 62, 56, 31, 33,                  // Cancer
  7, 4, 29, 59, 40, 64,                    // Leo
  47, 6, 46, 18, 48, 57,                   // Virgo
  32, 50, 28, 44, 1, 43,                   // Libra
  14, 34, 9, 5, 26, 11,                    // Scorpio
  10, 58, 38, 54, 61, 60,                  // Sagittarius - early Capricorn
];

// Gate → Centre map. Keys are gate numbers, values are the centre the
// gate belongs to on the bodygraph.
const GATE_CENTER: Record<number, Center> = {
  // Head (Crown) — pressure centre
  64: "Head", 61: "Head", 63: "Head",
  // Ajna — awareness
  47: "Ajna", 24: "Ajna", 4: "Ajna", 17: "Ajna", 43: "Ajna", 11: "Ajna",
  // Throat — manifestation
  62: "Throat", 23: "Throat", 56: "Throat", 16: "Throat", 20: "Throat",
  31: "Throat", 8: "Throat", 33: "Throat", 35: "Throat", 12: "Throat",
  45: "Throat",
  // G (Identity / Self)
  7: "G", 1: "G", 13: "G", 25: "G", 46: "G", 2: "G", 15: "G", 10: "G",
  // Heart (Ego / Will)
  21: "Heart", 40: "Heart", 26: "Heart", 51: "Heart",
  // Sacral — life-force motor
  34: "Sacral", 5: "Sacral", 14: "Sacral", 29: "Sacral",
  59: "Sacral", 9: "Sacral", 3: "Sacral", 42: "Sacral", 27: "Sacral",
  // Solar Plexus — emotional motor
  6: "SolarPlexus", 37: "SolarPlexus", 22: "SolarPlexus",
  36: "SolarPlexus", 30: "SolarPlexus", 55: "SolarPlexus", 49: "SolarPlexus",
  // Spleen — intuition + survival
  50: "Spleen", 32: "Spleen", 28: "Spleen", 18: "Spleen",
  48: "Spleen", 57: "Spleen", 44: "Spleen",
  // Root — adrenal pressure motor
  53: "Root", 60: "Root", 52: "Root", 19: "Root",
  39: "Root", 41: "Root", 58: "Root", 38: "Root", 54: "Root",
};

// 36 HD channels — each as a canonical [a,b] pair. When both gates
// fire, the channel is defined and both its centres are coloured in.
const CHANNELS: Array<[number, number]> = [
  [64, 47],  [61, 24],  [63, 4],   // Head ↔ Ajna
  [17, 62],  [43, 23],  [11, 56],  // Ajna ↔ Throat
  [20, 10],  [20, 34],  [20, 57],  // Throat integration
  [16, 48],                         // Wavelength
  [35, 36],  [12, 22],              // Throat ↔ Solar Plexus
  [45, 21],                         // Throat ↔ Heart (Money)
  [8, 1],    [33, 13],  [31, 7],    // Throat ↔ G  (33-13 = Channel of the Prodigal)
  [10, 57],  [10, 34],              // G ↔ others (Integration)
  [25, 51],                         // G ↔ Heart
  [2, 14],   [15, 5],   [29, 46],   // G ↔ Sacral
  [59, 6],                          // Sacral ↔ Solar Plexus (Mating)
  [27, 50],                         // Sacral ↔ Spleen
  [42, 53],  [3, 60],   [9, 52],    // Sacral ↔ Root
  [34, 57],                         // Sacral ↔ Spleen (Power)
  [26, 44],                         // Heart ↔ Spleen (Surrender)
  [40, 37],                         // Heart ↔ Solar Plexus (Community)
  [54, 32],  [28, 38],  [18, 58],   // Root ↔ Spleen
  [19, 49],  [39, 55],  [41, 30],   // Root ↔ Solar Plexus
];

// ─── Types ────────────────────────────────────────────────────────
type Center =
  | "Head" | "Ajna" | "Throat" | "G" | "Heart"
  | "Sacral" | "SolarPlexus" | "Spleen" | "Root";

type HDType =
  | "Manifestor" | "Generator" | "Manifesting Generator"
  | "Projector" | "Reflector";

type HDAuthority =
  | "Emotional" | "Sacral" | "Splenic" | "Ego Manifested"
  | "Ego Projected" | "Self-Projected" | "Mental" | "Lunar";

interface Activation {
  body: string;          // Sun, Earth, Moon, etc.
  longitude: number;     // ecliptic lon 0..360
  gate: number;          // 1..64
  line: number;          // 1..6
  colour?: number;       // 1..6 (fine-grained)
  tone?: number;         // 1..6 (fine-grained)
}

interface RequestBody {
  birthDate: string;      // YYYY-MM-DD
  birthTime?: string;     // HH:MM, optional — noon local if omitted
  timezone?: string;      // IANA tz, defaults to UTC
  lat?: number;           // optional, doesn't affect HD gates but bundled for completeness
  lon?: number;
}

interface ResponseBody {
  type: HDType;
  strategy: string;
  notSelfTheme: string;
  signature: string;
  authority: HDAuthority;
  authorityExplanation: string;
  profile: string;                 // e.g. "5/1"
  profileLines: [number, number];  // [personality, design]
  definedCenters: Center[];
  openCenters: Center[];
  channels: string[];              // e.g. ["20-10", "34-57"]
  definedGates: number[];
  personality: Activation[];
  design: Activation[];
  /** sacral + throat connectivity diagnostic used to derive Type */
  sacralDefined: boolean;
  throatDefined: boolean;
}

// ─── Math helpers ─────────────────────────────────────────────────
function normDeg(d: number): number {
  return ((d % 360) + 360) % 360;
}

function longitudeToGateLine(lon: number): { gate: number; line: number; offset: number } {
  const offset = normDeg(lon - GATE_WHEEL_START_LON);
  const gateIdx = Math.floor(offset / GATE_WIDTH);
  const gate = GATE_WHEEL[gateIdx];
  const withinGate = offset - gateIdx * GATE_WIDTH;
  const line = Math.min(6, Math.floor(withinGate / LINE_WIDTH) + 1);
  return { gate, line, offset };
}

function localToUTC(birthDate: string, birthTime: string | undefined, timezone: string): Date {
  const timeStr = birthTime || "12:00:00";
  const timeWithSeconds = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  const dtStr = `${birthDate}T${timeWithSeconds}`;
  const tempUtc = new Date(dtStr + "Z");
  if (timezone === "UTC") return tempUtc;
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false,
    }).formatToParts(tempUtc);
    const p: Record<string, string> = {};
    for (const part of parts) p[part.type] = part.value;
    const hour = p.hour === "24" ? "00" : p.hour;
    const localStr = `${p.year}-${p.month}-${p.day}T${hour}:${p.minute}:${p.second}Z`;
    const localAsUtc = new Date(localStr);
    const offsetMs = localAsUtc.getTime() - tempUtc.getTime();
    return new Date(tempUtc.getTime() - offsetMs);
  } catch {
    return tempUtc;
  }
}

function sunLon(date: Date): number {
  return normDeg(Astronomy.SunPosition(date).elon);
}

/**
 * Find the UTC moment when the Sun's ecliptic longitude was exactly
 * `(birthSunLon - 88) mod 360`. Binary search within a 92-day window
 * prior to birth until we converge to within 0.0001°.
 */
function findDesignMoment(birthUtc: Date, birthSunLon: number): Date {
  const targetLon = normDeg(birthSunLon - 88);

  // Sun moves ~0.9856°/day so 88° is about 89.3 days. Start with a
  // window of [birth - 92d, birth - 85d] which safely brackets the
  // target.
  let lo = new Date(birthUtc.getTime() - 92 * 86_400_000);
  let hi = new Date(birthUtc.getTime() - 85 * 86_400_000);

  // The target may not lie exactly in that window during eccentric
  // parts of Earth's orbit. Walk the window outward if needed.
  for (let attempt = 0; attempt < 6; attempt++) {
    const loDiff = shortArc(sunLon(lo) - targetLon);
    const hiDiff = shortArc(sunLon(hi) - targetLon);
    if (loDiff < 0 && hiDiff > 0) break;       // target straddled
    if (loDiff > 0 && hiDiff < 0) break;       // target straddled (opposite direction)
    if (loDiff < 0 && hiDiff < 0) lo = new Date(lo.getTime() - 2 * 86_400_000);
    if (loDiff > 0 && hiDiff > 0) hi = new Date(hi.getTime() + 2 * 86_400_000);
  }

  // Binary search until tolerance met.
  for (let i = 0; i < 60; i++) {
    const mid = new Date((lo.getTime() + hi.getTime()) / 2);
    const midLon = sunLon(mid);
    const diff = shortArc(midLon - targetLon);
    if (Math.abs(diff) < 0.0001) return mid;
    // If mid Sun is "ahead" of target, the target moment is earlier.
    if (diff > 0) hi = mid;
    else lo = mid;
  }
  return new Date((lo.getTime() + hi.getTime()) / 2);
}

function shortArc(d: number): number {
  let r = ((d % 360) + 540) % 360 - 180;
  if (r === -180) r = 180;
  return r;
}

// ─── Activation computation ───────────────────────────────────────
interface BodyLon { body: string; lon: number }

function bodyLongitudes(date: Date): BodyLon[] {
  const out: BodyLon[] = [];
  const s = normDeg(Astronomy.SunPosition(date).elon);
  out.push({ body: "Sun", lon: s });
  out.push({ body: "Earth", lon: normDeg(s + 180) });
  out.push({ body: "Moon", lon: normDeg(Astronomy.EclipticGeoMoon(date).lon) });

  // North Node — use mean node via simple formula. astronomy-engine
  // doesn't expose lunar nodes directly; approximate from the widely
  // used Meeus formula (good to ~0.5°, fine for gate mapping):
  // Ω = 125.0445222 - 0.0529537 * D   (D = days since J2000.0)
  const j2000 = new Date("2000-01-01T12:00:00Z").getTime();
  const D = (date.getTime() - j2000) / 86_400_000;
  const northNode = normDeg(125.0445222 - 0.0529537 * D);
  out.push({ body: "NorthNode", lon: northNode });
  out.push({ body: "SouthNode", lon: normDeg(northNode + 180) });

  const bodies: [string, Astronomy.Body][] = [
    ["Mercury", Astronomy.Body.Mercury],
    ["Venus",   Astronomy.Body.Venus],
    ["Mars",    Astronomy.Body.Mars],
    ["Jupiter", Astronomy.Body.Jupiter],
    ["Saturn",  Astronomy.Body.Saturn],
    ["Uranus",  Astronomy.Body.Uranus],
    ["Neptune", Astronomy.Body.Neptune],
    ["Pluto",   Astronomy.Body.Pluto],
  ];
  for (const [name, b] of bodies) {
    out.push({ body: name, lon: normDeg(Astronomy.EclipticLongitude(b, date)) });
  }
  return out;
}

function toActivations(bodies: BodyLon[]): Activation[] {
  return bodies.map((b) => {
    const { gate, line } = longitudeToGateLine(b.lon);
    return { body: b.body, longitude: b.lon, gate, line };
  });
}

// ─── Type / Authority derivation ──────────────────────────────────
function deriveChart(personality: Activation[], design: Activation[]): {
  definedCenters: Set<Center>;
  channels: string[];
  definedGates: number[];
  sacralDefined: boolean;
  throatDefined: boolean;
  type: HDType;
  authority: HDAuthority;
} {
  const allGates = new Set<number>();
  for (const a of personality) allGates.add(a.gate);
  for (const a of design) allGates.add(a.gate);
  const definedGates = [...allGates].sort((a, b) => a - b);

  // Channel: both sides of the pair hanging.
  const channels: string[] = [];
  const definedCenters = new Set<Center>();
  for (const [a, b] of CHANNELS) {
    if (allGates.has(a) && allGates.has(b)) {
      channels.push(`${a}-${b}`);
      const cA = GATE_CENTER[a];
      const cB = GATE_CENTER[b];
      if (cA) definedCenters.add(cA);
      if (cB) definedCenters.add(cB);
    }
  }

  const sacralDefined = definedCenters.has("Sacral");
  const throatDefined = definedCenters.has("Throat");
  const centerDefinedCount = definedCenters.size;

  // Throat connectivity to a motor — do ANY defined channels connect
  // Throat directly to Sacral / Solar Plexus / Heart / Root?
  const MOTOR_CENTERS: Center[] = ["Sacral", "SolarPlexus", "Heart", "Root"];
  const throatToMotor = channels.some((c) => {
    const [a, b] = c.split("-").map((n) => parseInt(n, 10));
    const ca = GATE_CENTER[a];
    const cb = GATE_CENTER[b];
    return (
      (ca === "Throat" && MOTOR_CENTERS.includes(cb as Center)) ||
      (cb === "Throat" && MOTOR_CENTERS.includes(ca as Center))
    );
  });

  // Type
  let type: HDType;
  if (centerDefinedCount === 0) {
    type = "Reflector";
  } else if (sacralDefined) {
    type = throatToMotor ? "Manifesting Generator" : "Generator";
  } else if (throatToMotor) {
    type = "Manifestor";
  } else {
    type = "Projector";
  }

  // Authority priority order
  let authority: HDAuthority;
  if (type === "Reflector") {
    authority = "Lunar";
  } else if (definedCenters.has("SolarPlexus")) {
    authority = "Emotional";
  } else if (definedCenters.has("Sacral")) {
    authority = "Sacral";
  } else if (definedCenters.has("Spleen")) {
    authority = "Splenic";
  } else if (definedCenters.has("Heart")) {
    authority = type === "Projector" ? "Ego Projected" : "Ego Manifested";
  } else if (definedCenters.has("G")) {
    authority = "Self-Projected";
  } else {
    authority = "Mental";
  }

  return { definedCenters, channels, definedGates, sacralDefined, throatDefined, type, authority };
}

// ─── Type-specific content ────────────────────────────────────────
const TYPE_INFO: Record<HDType, { strategy: string; notSelf: string; signature: string }> = {
  Manifestor:              { strategy: "Inform before you act",          notSelf: "Anger",       signature: "Peace" },
  Generator:               { strategy: "Respond — wait for the gut yes", notSelf: "Frustration", signature: "Satisfaction" },
  "Manifesting Generator": { strategy: "Respond, then inform",            notSelf: "Frustration & Anger", signature: "Satisfaction & Peace" },
  Projector:               { strategy: "Wait for the invitation",         notSelf: "Bitterness",  signature: "Success" },
  Reflector:               { strategy: "Wait a lunar cycle before deciding", notSelf: "Disappointment", signature: "Surprise" },
};

const AUTHORITY_EXPLANATION: Record<HDAuthority, string> = {
  Emotional: "Wait through your emotional wave — clarity comes after the feeling has moved through you. Never decide in the spike.",
  Sacral: "Listen to the body's in-the-moment 'yes' (uh-huh) or 'no' (uh-uh). Your gut is the most reliable compass you have.",
  Splenic: "A quiet, soft, in-the-now intuition. It speaks once. If you miss it, it's gone — learn to trust the first whisper.",
  "Ego Manifested": "Decide from the heart — is your will genuinely behind this? If yes, speak and move.",
  "Ego Projected": "Listen for what your voice says when you talk about the choice. Your own speech reveals the decision.",
  "Self-Projected": "Talk it through with someone safe. What YOU say out loud reveals what's aligned with your identity.",
  Mental: "You have no inner authority — consult your trusted people. Decision comes from the mirror of conversation.",
  Lunar: "Wait a full 28-day lunar cycle before any big decision. Let the decision move through every phase of you.",
};

// ─── Handler ──────────────────────────────────────────────────────
Deno.serve(handler<RequestBody, ResponseBody>({
  fn: "human-design-chart",
  auth: "optional",
  methods: ["POST"],
  rateLimit: { max: 10, windowMs: 60_000 },
  ai: true,
  run: (_ctx, body) => {
    if (!body?.birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(body.birthDate)) {
      throw new AppError("INVALID_INPUT", "Valid birthDate (YYYY-MM-DD) required", 400);
    }
    const tz = body.timezone || "UTC";
    const personalityDate = localToUTC(body.birthDate, body.birthTime, tz);

    const personalityLons = bodyLongitudes(personalityDate);
    const sunP = personalityLons.find((b) => b.body === "Sun")!.lon;
    const designDate = findDesignMoment(personalityDate, sunP);
    const designLons = bodyLongitudes(designDate);

    const personality = toActivations(personalityLons);
    const design = toActivations(designLons);

    const chart = deriveChart(personality, design);

    // Profile — Sun's line at Personality, Sun's line at Design.
    const personalityLine = personality.find((a) => a.body === "Sun")!.line;
    const designLine = design.find((a) => a.body === "Sun")!.line;
    const profile = `${personalityLine}/${designLine}`;

    const allCenters: Center[] = [
      "Head", "Ajna", "Throat", "G", "Heart",
      "Sacral", "SolarPlexus", "Spleen", "Root",
    ];
    const openCenters = allCenters.filter((c) => !chart.definedCenters.has(c));

    const typeMeta = TYPE_INFO[chart.type];

    return {
      type: chart.type,
      strategy: typeMeta.strategy,
      notSelfTheme: typeMeta.notSelf,
      signature: typeMeta.signature,
      authority: chart.authority,
      authorityExplanation: AUTHORITY_EXPLANATION[chart.authority],
      profile,
      profileLines: [personalityLine, designLine],
      definedCenters: [...chart.definedCenters],
      openCenters,
      channels: chart.channels,
      definedGates: chart.definedGates,
      personality,
      design,
      sacralDefined: chart.sacralDefined,
      throatDefined: chart.throatDefined,
    };
  },
}));
