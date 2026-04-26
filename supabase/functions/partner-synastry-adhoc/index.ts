import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import * as Astronomy from "npm:astronomy-engine@2.1.19";
import { AppError, handler } from "../_shared/handler.ts";
import { z } from "npm:zod@3.24.1";

/**
 * Ad-hoc partner synastry.
 *
 * Unlike `astrology-synastry` (which requires the caller to already
 * have a stored natal chart), this function takes BOTH birth dates
 * inline and returns a full cross-aspect synastry. Used by the
 * Partner Compatibility page so anyone can run a reading without
 * pre-computing their chart.
 *
 * Computes:
 *   - "Me" chart: 10 planet longitudes
 *   - "Partner" chart: 10 planet longitudes
 *   - Cross-aspects (every combination where orb is tight enough)
 *   - Elemental compatibility scores derived from Sun ↔ Sun and
 *     Moon ↔ Moon (core emotional + identity compatibility)
 *   - Per-aspect flavour label (harmonious / dynamic / challenging)
 *
 * Birth times are optional on both sides. Without a birth time we
 * skip the Moon (too fast to be meaningful without it) and default
 * to 12:00 local for the other planet positions.
 */

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;

type Sign = typeof SIGNS[number];

const SIGN_ELEMENTS: Record<Sign, "Fire" | "Earth" | "Air" | "Water"> = {
  Aries: "Fire", Taurus: "Earth", Gemini: "Air", Cancer: "Water",
  Leo: "Fire", Virgo: "Earth", Libra: "Air", Scorpio: "Water",
  Sagittarius: "Fire", Capricorn: "Earth", Aquarius: "Air", Pisces: "Water",
};

const BODIES: { name: string; body: Astronomy.Body | "Sun" | "Moon" }[] = [
  { name: "Sun",     body: "Sun" },
  { name: "Moon",    body: "Moon" },
  { name: "Mercury", body: Astronomy.Body.Mercury },
  { name: "Venus",   body: Astronomy.Body.Venus },
  { name: "Mars",    body: Astronomy.Body.Mars },
  { name: "Jupiter", body: Astronomy.Body.Jupiter },
  { name: "Saturn",  body: Astronomy.Body.Saturn },
  { name: "Uranus",  body: Astronomy.Body.Uranus },
  { name: "Neptune", body: Astronomy.Body.Neptune },
  { name: "Pluto",   body: Astronomy.Body.Pluto },
];

const ASPECTS: { type: AspectType; angle: number; maxOrb: number; flavour: AspectFlavour }[] = [
  { type: "conjunction", angle: 0,   maxOrb: 6, flavour: "intense" },
  { type: "opposition",  angle: 180, maxOrb: 6, flavour: "challenging" },
  { type: "trine",       angle: 120, maxOrb: 5, flavour: "harmonious" },
  { type: "square",      angle: 90,  maxOrb: 5, flavour: "challenging" },
  { type: "sextile",     angle: 60,  maxOrb: 4, flavour: "harmonious" },
];

type AspectType = "conjunction" | "opposition" | "trine" | "square" | "sextile";
type AspectFlavour = "harmonious" | "challenging" | "intense";

const RequestSchema = z.object({
  myBirthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  myBirthTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  myTimezone: z.string().optional(),
  partnerBirthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  partnerBirthTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  partnerTimezone: z.string().optional(),
});
type Req = z.infer<typeof RequestSchema>;

interface Position {
  planet: string;
  longitude: number;
  sign: Sign;
  degree: number;
}

interface CrossAspect {
  myPlanet: string;
  partnerPlanet: string;
  type: AspectType;
  flavour: AspectFlavour;
  orb: number;
  interpretation: string;
}

interface Resp {
  me: Position[];
  partner: Position[];
  crossAspects: CrossAspect[];
  overallScore: number;
  harmoniousCount: number;
  challengingCount: number;
  intenseCount: number;
  elementalBlend: { fire: number; earth: number; air: number; water: number };
}

// ─── Math ─────────────────────────────────────────────────────────
function normDeg(d: number): number { return ((d % 360) + 360) % 360; }
function shortArc(d: number): number {
  let r = ((d % 360) + 540) % 360 - 180;
  if (r === -180) r = 180;
  return r;
}

function lonToSign(lon: number): { sign: Sign; degree: number } {
  const n = normDeg(lon);
  const idx = Math.floor(n / 30);
  return { sign: SIGNS[idx], degree: Math.round((n % 30) * 100) / 100 };
}

function localToUTC(date: string, time: string | undefined, timezone: string | undefined): Date {
  const tz = timezone || "UTC";
  const timeStr = time || "12:00:00";
  const full = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  const dt = new Date(`${date}T${full}Z`);
  if (tz === "UTC") return dt;
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    }).formatToParts(dt);
    const p: Record<string, string> = {};
    for (const part of parts) p[part.type] = part.value;
    const hour = p.hour === "24" ? "00" : p.hour;
    const localStr = `${p.year}-${p.month}-${p.day}T${hour}:${p.minute}:${p.second}Z`;
    const localAsUtc = new Date(localStr);
    const offsetMs = localAsUtc.getTime() - dt.getTime();
    return new Date(dt.getTime() - offsetMs);
  } catch {
    return dt;
  }
}

function computePositions(utc: Date, skipMoon: boolean): Position[] {
  const out: Position[] = [];
  for (const b of BODIES) {
    if (b.name === "Moon" && skipMoon) continue;
    let lon: number;
    if (b.body === "Sun") lon = normDeg(Astronomy.SunPosition(utc).elon);
    else if (b.body === "Moon") lon = normDeg(Astronomy.EclipticGeoMoon(utc).lon);
    else lon = normDeg(Astronomy.EclipticLongitude(b.body as Astronomy.Body, utc));
    const { sign, degree } = lonToSign(lon);
    out.push({ planet: b.name, longitude: lon, sign, degree });
  }
  return out;
}

// ─── Aspect interpretation table ──────────────────────────────────
// A short, specific read for each meaningful cross-aspect pair.
// Covers the important pairings; anything else gets a generic
// harmonious/challenging/intense flavour note.
const ASPECT_INTERPRETATIONS: Record<string, string> = {
  // --- Sun ↔ * ---
  "Sun-Sun-conjunction": "You share a core identity — same sun sign or close. Deep resonance; watch for ego collision since your selfhoods are shaped by the same light.",
  "Sun-Sun-trine": "Your identities rhyme easily. You recognise each other's direction without needing to explain it.",
  "Sun-Sun-square": "Your core selfhoods push against each other. This is the relationship that will ask you to grow into who you really are — if you both stay curious.",
  "Sun-Sun-opposition": "You embody opposing approaches to selfhood. Classic attract-each-other-then-drive-each-other-crazy pairing. The opposition is also the completion.",
  "Sun-Moon-conjunction": "One's identity nurtures the other's feelings directly. One of the most stable binding aspects — natural emotional rapport.",
  "Sun-Moon-trine": "A warm, intuitive flow — one feels held by the other's very presence without having to ask.",
  "Sun-Moon-square": "Your needs don't map onto your partner's identity easily. This asks for emotional translation work but has deep pay-off.",
  "Sun-Moon-opposition": "You meet each other across a polarity — one rational-directional, the other emotional-receptive. Can be deeply complementary or deeply wearing.",
  "Sun-Venus-conjunction": "Instant affection. Their sense of beauty/love aligns with your identity — you feel seen at first sight.",
  "Sun-Venus-trine": "Natural enjoyment of each other. Easy to be around.",
  "Sun-Venus-square": "Attraction + misalignment — you each value different things. Can create a love-hate pull.",
  "Sun-Mars-conjunction": "Direct energetic connection. Sparky, active, sometimes combative.",
  "Sun-Mars-trine": "Your drive ignites theirs. You get things done together.",
  "Sun-Mars-square": "Repeated small friction about pace, assertion, and who leads. Generative if you can name it.",
  "Sun-Saturn-conjunction": "Serious, commitment-oriented. One person is the grounding force for the other, which can feel stable or constraining.",
  "Sun-Saturn-square": "Duty, criticism, or authority-figure dynamics can surface. Real maturity required.",
  "Sun-Saturn-trine": "A steady, adult bond. Builds slowly, lasts.",

  // --- Moon ↔ * ---
  "Moon-Moon-conjunction": "You feel at home with each other from the start. The emotional frequency matches.",
  "Moon-Moon-trine": "Emotional ease — you can be quiet together without distance.",
  "Moon-Moon-square": "Emotional needs differ in rhythm — one wants depth when the other wants space. Solvable with care.",
  "Moon-Moon-opposition": "Your emotional poles are opposite. Can complete each other or perpetually pass in the night.",
  "Moon-Venus-conjunction": "Tender, loving feeling. Soft aspect — very romantic.",
  "Moon-Venus-trine": "Easy affection. Natural tenderness between you.",
  "Moon-Mars-conjunction": "Passion but volatility. Emotion and drive tangle — powerful sexually, tricky in argument.",
  "Moon-Mars-square": "Emotional flare-ups. Anger and feeling get confused. Requires boundary work.",
  "Moon-Saturn-conjunction": "One person provides emotional structure, sometimes at the cost of warmth. Watch for parent-child dynamic.",
  "Moon-Saturn-square": "Feelings feel restricted. One partner is emotionally available; the other struggles to receive.",

  // --- Venus ↔ * ---
  "Venus-Venus-conjunction": "Shared values around love, pleasure, beauty. Easy shared taste.",
  "Venus-Venus-trine": "You enjoy the same things. Dates come naturally.",
  "Venus-Venus-square": "Different love languages — you express affection in ways the other doesn't always receive.",
  "Venus-Mars-conjunction": "Classic chemistry aspect. Sexual attraction with real staying power when present.",
  "Venus-Mars-trine": "Easy flow of desire. Each ignites the other without friction.",
  "Venus-Mars-square": "Hot-and-cold. Pursuit and withdrawal dynamics.",
  "Venus-Saturn-conjunction": "Commitment-ready love. Slow to warm but stays.",
  "Venus-Saturn-square": "Love feels effortful. One partner's caution dampens the other's warmth.",

  // --- Mars ↔ * ---
  "Mars-Mars-conjunction": "Shared drive — can be a power couple or a power struggle depending on whether the goals are aligned.",
  "Mars-Mars-square": "Competing energy. Watch for repeated arguments about who goes first.",
  "Mars-Saturn-square": "Drive meets delay. One pushes, the other brakes — can create chronic frustration.",

  // --- Saturn ↔ * ---
  "Saturn-Saturn-conjunction": "You share the same life-lesson teacher. Parallel development.",
  "Saturn-Saturn-square": "Your life-structures pressure each other. Good work possible if both commit to maturing.",

  // --- Outer planets — generational; we surface only Pluto ↔ personal for intensity ---
  "Pluto-Sun-conjunction": "Transformation through the relationship. One person will change profoundly here.",
  "Pluto-Moon-conjunction": "Emotional depth bordering on obsession. Healing or consuming depending on self-awareness.",
  "Pluto-Venus-conjunction": "Intense love — fated-feeling, all-consuming, potentially controlling. Handle with care.",
};

function interpretationFor(myPlanet: string, partnerPlanet: string, type: AspectType, flavour: AspectFlavour): string {
  // Try canonical pairing first (sorted alphabetically for a stable key)
  const pair = [myPlanet, partnerPlanet].sort();
  const key = `${pair[0]}-${pair[1]}-${type}`;
  if (ASPECT_INTERPRETATIONS[key]) return ASPECT_INTERPRETATIONS[key];
  // Reversed key
  const revKey = `${pair[1]}-${pair[0]}-${type}`;
  if (ASPECT_INTERPRETATIONS[revKey]) return ASPECT_INTERPRETATIONS[revKey];

  // Generic fallback based on flavour
  const generic: Record<AspectFlavour, string> = {
    harmonious: `Your ${myPlanet} and their ${partnerPlanet} flow together — this aspect supports easy cooperation in the life-area they each rule.`,
    challenging: `Your ${myPlanet} and their ${partnerPlanet} pull against each other. Growth edge, not deal-breaker.`,
    intense: `Your ${myPlanet} and their ${partnerPlanet} press on each other directly. Amplifies whatever energy is alive between you.`,
  };
  return generic[flavour];
}

// ─── Aspect compute ───────────────────────────────────────────────
function computeCrossAspects(me: Position[], partner: Position[]): CrossAspect[] {
  const out: CrossAspect[] = [];
  for (const a of me) {
    for (const b of partner) {
      const sep = Math.abs(shortArc(a.longitude - b.longitude));
      for (const asp of ASPECTS) {
        const orb = Math.abs(sep - asp.angle);
        if (orb <= asp.maxOrb) {
          out.push({
            myPlanet: a.planet,
            partnerPlanet: b.planet,
            type: asp.type,
            flavour: asp.flavour,
            orb: Math.round(orb * 100) / 100,
            interpretation: interpretationFor(a.planet, b.planet, asp.type, asp.flavour),
          });
          break; // a given pair only counts one aspect type (tightest)
        }
      }
    }
  }
  // Sort by tightness (smaller orb = more exact) + boost Sun/Moon/Venus/Mars pairs
  const importantBodies = new Set(["Sun", "Moon", "Venus", "Mars"]);
  out.sort((x, y) => {
    const xImp = importantBodies.has(x.myPlanet) || importantBodies.has(x.partnerPlanet) ? 0 : 1;
    const yImp = importantBodies.has(y.myPlanet) || importantBodies.has(y.partnerPlanet) ? 0 : 1;
    if (xImp !== yImp) return xImp - yImp;
    return x.orb - y.orb;
  });
  return out.slice(0, 18); // cap to avoid overwhelm
}

// ─── Score derivation ─────────────────────────────────────────────
function deriveScore(cross: CrossAspect[]): { score: number; harmonious: number; challenging: number; intense: number } {
  let harmonious = 0;
  let challenging = 0;
  let intense = 0;
  for (const a of cross) {
    if (a.flavour === "harmonious") harmonious++;
    else if (a.flavour === "challenging") challenging++;
    else intense++;
  }
  // Score logic — harmonious adds points, challenging subtracts (less than adding),
  // intense is neutral-to-positive since it shows energetic engagement.
  const raw = 60 + harmonious * 5 - challenging * 3 + intense * 2;
  const score = Math.max(20, Math.min(95, raw));
  return { score, harmonious, challenging, intense };
}

function elementalBlend(me: Position[], partner: Position[]): { fire: number; earth: number; air: number; water: number } {
  const counts = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
  const weight = (planet: string) =>
    planet === "Sun" || planet === "Moon" ? 3 : planet === "Venus" || planet === "Mars" ? 2 : 1;
  for (const p of [...me, ...partner]) {
    const el = SIGN_ELEMENTS[p.sign];
    counts[el] += weight(p.planet);
  }
  const total = counts.Fire + counts.Earth + counts.Air + counts.Water || 1;
  return {
    fire: Math.round((counts.Fire / total) * 100),
    earth: Math.round((counts.Earth / total) * 100),
    air: Math.round((counts.Air / total) * 100),
    water: Math.round((counts.Water / total) * 100),
  };
}

// ─── Handler ──────────────────────────────────────────────────────
Deno.serve(handler<Req, Resp>({
  fn: "partner-synastry-adhoc",
  auth: "optional",
  methods: ["POST"],
  rateLimit: { max: 20, windowMs: 60_000 },
  ai: true,
  requestSchema: RequestSchema,
  run: (_ctx, body) => {
    const myUtc = localToUTC(body.myBirthDate, body.myBirthTime, body.myTimezone);
    const pUtc = localToUTC(body.partnerBirthDate, body.partnerBirthTime, body.partnerTimezone);

    const me = computePositions(myUtc, !body.myBirthTime);
    const partner = computePositions(pUtc, !body.partnerBirthTime);
    const crossAspects = computeCrossAspects(me, partner);
    const { score, harmonious, challenging, intense } = deriveScore(crossAspects);
    const blend = elementalBlend(me, partner);

    return {
      me,
      partner,
      crossAspects,
      overallScore: score,
      harmoniousCount: harmonious,
      challengingCount: challenging,
      intenseCount: intense,
      elementalBlend: blend,
    };
  },
}));
