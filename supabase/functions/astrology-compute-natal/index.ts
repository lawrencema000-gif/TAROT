import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import * as Astronomy from "npm:astronomy-engine@2.1.19";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;

const SIGN_ELEMENTS: Record<string, string> = {
  Aries: "Fire", Taurus: "Earth", Gemini: "Air", Cancer: "Water",
  Leo: "Fire", Virgo: "Earth", Libra: "Air", Scorpio: "Water",
  Sagittarius: "Fire", Capricorn: "Earth", Aquarius: "Air", Pisces: "Water",
};

const SIGN_MODALITIES: Record<string, string> = {
  Aries: "Cardinal", Taurus: "Fixed", Gemini: "Mutable", Cancer: "Cardinal",
  Leo: "Fixed", Virgo: "Mutable", Libra: "Cardinal", Scorpio: "Fixed",
  Sagittarius: "Mutable", Capricorn: "Cardinal", Aquarius: "Fixed", Pisces: "Mutable",
};

const SIGN_RULERS: Record<string, string> = {
  Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon",
  Leo: "Sun", Virgo: "Mercury", Libra: "Venus", Scorpio: "Pluto",
  Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Uranus", Pisces: "Neptune",
};

function normDeg(d: number): number {
  return ((d % 360) + 360) % 360;
}

function lonToSign(lon: number) {
  const n = normDeg(lon);
  const idx = Math.floor(n / 30);
  return { sign: SIGNS[idx], degree: Math.round((n % 30) * 100) / 100 };
}

function localToUTC(
  birthDate: string,
  birthTime: string | null,
  timezone: string
): Date {
  const timeStr = birthTime || "12:00:00";
  const dtStr = `${birthDate}T${timeStr}`;
  const tempUtc = new Date(dtStr + "Z");

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

function computeAscendant(utcDate: Date, lat: number, lon: number): number {
  const gst = Astronomy.SiderealTime(utcDate);
  const lst = ((gst + lon / 15) % 24 + 24) % 24;
  const ramc = lst * 15;

  const obliquity = 23.4393;
  const latRad = (lat * Math.PI) / 180;
  const oblRad = (obliquity * Math.PI) / 180;
  const ramcRad = (ramc * Math.PI) / 180;

  const y = -Math.cos(ramcRad);
  const x =
    Math.sin(ramcRad) * Math.cos(oblRad) +
    Math.tan(latRad) * Math.sin(oblRad);
  const asc = (Math.atan2(y, x) * 180) / Math.PI;
  return normDeg(asc);
}

function computeEqualHouses(ascendant: number): number[] {
  return Array.from({ length: 12 }, (_, i) => normDeg(ascendant + i * 30));
}

function findHouse(lon: number, cusps: number[]): number {
  const n = normDeg(lon);
  for (let i = 0; i < 12; i++) {
    const curr = cusps[i];
    const next = cusps[(i + 1) % 12];
    if (curr <= next) {
      if (n >= curr && n < next) return i + 1;
    } else {
      if (n >= curr || n < next) return i + 1;
    }
  }
  return 1;
}

interface PlanetData {
  planet: string;
  sign: string;
  degree: number;
  longitude: number;
  house: number | null;
  retrograde: boolean;
}

function isRetrograde(body: Astronomy.Body, utcDate: Date): boolean {
  const dayMs = 86400000;
  const before = new Date(utcDate.getTime() - dayMs);
  const after = new Date(utcDate.getTime() + dayMs);
  const lonBefore = Astronomy.EclipticLongitude(body, before);
  const lonAfter = Astronomy.EclipticLongitude(body, after);
  let diff = lonAfter - lonBefore;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff < 0;
}

function computePlanets(
  utcDate: Date,
  houseCusps: number[] | null
): PlanetData[] {
  const planets: PlanetData[] = [];

  const sunPos = Astronomy.SunPosition(utcDate);
  const sunLon = sunPos.elon;
  const sunSign = lonToSign(sunLon);
  planets.push({
    planet: "Sun",
    longitude: sunLon,
    ...sunSign,
    house: houseCusps ? findHouse(sunLon, houseCusps) : null,
    retrograde: false,
  });

  const moonPos = Astronomy.EclipticGeoMoon(utcDate);
  const moonLon = moonPos.lon;
  const moonSign = lonToSign(moonLon);
  planets.push({
    planet: "Moon",
    longitude: moonLon,
    ...moonSign,
    house: houseCusps ? findHouse(moonLon, houseCusps) : null,
    retrograde: false,
  });

  const bodyMap: [string, Astronomy.Body][] = [
    ["Mercury", Astronomy.Body.Mercury],
    ["Venus", Astronomy.Body.Venus],
    ["Mars", Astronomy.Body.Mars],
    ["Jupiter", Astronomy.Body.Jupiter],
    ["Saturn", Astronomy.Body.Saturn],
    ["Uranus", Astronomy.Body.Uranus],
    ["Neptune", Astronomy.Body.Neptune],
    ["Pluto", Astronomy.Body.Pluto],
  ];

  for (const [name, body] of bodyMap) {
    const lon = Astronomy.EclipticLongitude(body, utcDate);
    const signData = lonToSign(lon);
    planets.push({
      planet: name,
      longitude: lon,
      ...signData,
      house: houseCusps ? findHouse(lon, houseCusps) : null,
      retrograde: isRetrograde(body, utcDate),
    });
  }

  return planets;
}

function computeAspects(planets: PlanetData[]) {
  const aspectDefs = [
    { type: "conjunction", angle: 0, maxOrb: 8 },
    { type: "opposition", angle: 180, maxOrb: 8 },
    { type: "trine", angle: 120, maxOrb: 8 },
    { type: "square", angle: 90, maxOrb: 7 },
    { type: "sextile", angle: 60, maxOrb: 6 },
  ];

  const aspects: {
    planet1: string;
    planet2: string;
    type: string;
    orb: number;
    applying: boolean;
  }[] = [];

  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      let diff = Math.abs(planets[i].longitude - planets[j].longitude);
      if (diff > 180) diff = 360 - diff;

      for (const def of aspectDefs) {
        const orb = Math.abs(diff - def.angle);
        if (orb <= def.maxOrb) {
          aspects.push({
            planet1: planets[i].planet,
            planet2: planets[j].planet,
            type: def.type,
            orb: Math.round(orb * 10) / 10,
            applying: diff < def.angle,
          });
          break;
        }
      }
    }
  }
  return aspects;
}

function computeDominants(planets: PlanetData[], ascSign: string | null) {
  const elements: Record<string, number> = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
  const modalities: Record<string, number> = { Cardinal: 0, Fixed: 0, Mutable: 0 };

  for (const p of planets) {
    const el = SIGN_ELEMENTS[p.sign];
    const mod = SIGN_MODALITIES[p.sign];
    if (el) elements[el]++;
    if (mod) modalities[mod]++;
  }

  const chartRuler = ascSign ? (SIGN_RULERS[ascSign] || null) : null;

  const dominantPlanets: string[] = ["Sun", "Moon"];
  if (chartRuler && !dominantPlanets.includes(chartRuler)) {
    dominantPlanets.push(chartRuler);
  }

  return { elements, modalities, chartRuler, dominantPlanets };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { birthDate, birthTime, lat, lon, timezone, chartMode } =
      await req.json();

    if (!birthDate || lat === undefined || lon === undefined) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const tz = timezone || "UTC";
    const utcDate = localToUTC(birthDate, birthTime || null, tz);
    const hasBirthTime = !!birthTime && chartMode !== "unknown";

    let ascendant: number | null = null;
    let houseCusps: number[] | null = null;

    if (hasBirthTime) {
      ascendant = computeAscendant(utcDate, lat, lon);
      houseCusps = computeEqualHouses(ascendant);
    }

    const planets = computePlanets(utcDate, houseCusps);
    const aspects = computeAspects(planets);

    const sunData = planets.find((p) => p.planet === "Sun")!;
    const moonData = planets.find((p) => p.planet === "Moon")!;
    const ascSign = ascendant !== null ? lonToSign(ascendant) : null;

    const dominants = computeDominants(planets, ascSign?.sign || null);

    const bigThree = {
      sun: { sign: sunData.sign, degree: sunData.degree, house: sunData.house },
      moon: {
        sign: moonData.sign,
        degree: moonData.degree,
        house: moonData.house,
      },
      rising: ascSign
        ? { sign: ascSign.sign, degree: ascSign.degree }
        : null,
    };

    const natalChart = {
      planets: planets.map((p) => ({
        planet: p.planet,
        sign: p.sign,
        degree: p.degree,
        longitude: p.longitude,
        house: p.house,
      })),
      houses: houseCusps || [],
      ascendant,
      bigThree,
      aspects,
      dominants,
      chartMode: chartMode || (hasBirthTime ? "exact" : "unknown"),
      computedAt: new Date().toISOString(),
    };

    const { error: insertError } = await supabase
      .from("astrology_natal_charts")
      .upsert(
        {
          user_id: user.id,
          chart_version: 1,
          natal_json: natalChart,
          big_three_json: bigThree,
          dominants_json: dominants,
          aspects_json: aspects,
          computed_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (insertError) {
      console.error("Error saving chart:", insertError);
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        natalChart,
        bigThree: natalChart.bigThree,
        dominants: natalChart.dominants,
        aspects: natalChart.aspects,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Chart computation error:", error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Failed to compute chart",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
