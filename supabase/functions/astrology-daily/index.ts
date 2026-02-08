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
type ZodiacSign = typeof SIGNS[number];
type Planet = "Sun" | "Moon" | "Mercury" | "Venus" | "Mars" | "Jupiter" | "Saturn" | "Uranus" | "Neptune" | "Pluto";
type AspectType = "conjunction" | "opposition" | "trine" | "square" | "sextile";

const SIGN_ELEMENTS: Record<string, string> = {
  Aries: "Fire", Taurus: "Earth", Gemini: "Air", Cancer: "Water",
  Leo: "Fire", Virgo: "Earth", Libra: "Air", Scorpio: "Water",
  Sagittarius: "Fire", Capricorn: "Earth", Aquarius: "Air", Pisces: "Water",
};

function normDeg(d: number): number {
  return ((d % 360) + 360) % 360;
}

function lonToSign(lon: number): { sign: ZodiacSign; degree: number } {
  const n = normDeg(lon);
  const idx = Math.floor(n / 30);
  return { sign: SIGNS[idx], degree: Math.round((n % 30) * 100) / 100 };
}

function findHouse(lon: number, cusps: number[]): number {
  if (!cusps || cusps.length === 0) return 0;
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

interface TransitPlanetData {
  planet: Planet;
  longitude: number;
  sign: ZodiacSign;
}

function getCurrentPlanets(now: Date): TransitPlanetData[] {
  const planets: TransitPlanetData[] = [];

  const sunPos = Astronomy.SunPosition(now);
  const sunSign = lonToSign(sunPos.elon);
  planets.push({ planet: "Sun", longitude: sunPos.elon, sign: sunSign.sign });

  const moonPos = Astronomy.EclipticGeoMoon(now);
  const moonSign = lonToSign(moonPos.lon);
  planets.push({ planet: "Moon", longitude: moonPos.lon, sign: moonSign.sign });

  const bodyMap: [Planet, Astronomy.Body][] = [
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
    const lon = Astronomy.EclipticLongitude(body, now);
    const signData = lonToSign(lon);
    planets.push({ planet: name, longitude: lon, sign: signData.sign });
  }

  return planets;
}

interface NatalPlanet {
  planet: string;
  longitude: number;
  sign: string;
  house: number | null;
}

interface TransitHit {
  planet: Planet;
  aspect: AspectType;
  natalPlanet: Planet;
  orb: number;
}

function findTransitHits(
  transitPlanets: TransitPlanetData[],
  natalPlanets: NatalPlanet[]
): TransitHit[] {
  const aspectDefs: { type: AspectType; angle: number; maxOrb: number }[] = [
    { type: "conjunction", angle: 0, maxOrb: 6 },
    { type: "opposition", angle: 180, maxOrb: 6 },
    { type: "trine", angle: 120, maxOrb: 5 },
    { type: "square", angle: 90, maxOrb: 5 },
    { type: "sextile", angle: 60, maxOrb: 4 },
  ];

  const hits: TransitHit[] = [];

  for (const tp of transitPlanets) {
    for (const np of natalPlanets) {
      if (tp.planet === np.planet) continue;
      let diff = Math.abs(tp.longitude - np.longitude);
      if (diff > 180) diff = 360 - diff;

      for (const def of aspectDefs) {
        const orb = Math.abs(diff - def.angle);
        if (orb <= def.maxOrb) {
          hits.push({
            planet: tp.planet,
            aspect: def.type,
            natalPlanet: np.planet as Planet,
            orb: Math.round(orb * 10) / 10,
          });
          break;
        }
      }
    }
  }

  hits.sort((a, b) => a.orb - b.orb);
  return hits.slice(0, 5);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function dateSeed(dateStr: string, extra: number): number {
  let hash = extra;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash + dateStr.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

const THEMES: Record<string, string[]> = {
  Fire: ["Courage & Bold Action", "Creative Spark", "Passionate Pursuit", "Inner Fire", "Brave New Steps"],
  Earth: ["Grounded Stability", "Practical Progress", "Building Foundations", "Material Abundance", "Steady Growth"],
  Air: ["Clear Communication", "Intellectual Curiosity", "Social Connection", "Fresh Perspectives", "Mental Clarity"],
  Water: ["Emotional Depth", "Intuitive Flow", "Inner Healing", "Compassionate Heart", "Soulful Reflection"],
};

const SUMMARIES: Record<string, string[]> = {
  Fire: [
    "Your energy is electric today. Channel your passion into meaningful action and watch doors open that seemed firmly shut.",
    "A surge of confidence carries you forward. Trust your instincts -- they're sharper than usual right now.",
    "Today sparks a desire to lead and take initiative. Others are drawn to your warmth and enthusiasm.",
    "Bold moves are favored today. Your natural charisma is amplified, making this ideal for important conversations.",
  ],
  Earth: [
    "Patience and persistence pay off today. Focus on the details that others overlook -- therein lies your advantage.",
    "Today rewards practical thinking and careful planning. Ground yourself in what you know to be true.",
    "Your steady approach attracts resources and support. Build on foundations you've already laid.",
    "A day for tangible progress. Small, consistent steps create lasting change more reliably than grand gestures.",
  ],
  Air: [
    "Your mind is razor-sharp today. Ideas flow freely, and conversations lead to unexpected insights and opportunities.",
    "Communication channels are wide open. Share your thoughts -- someone needs to hear exactly what you have to say.",
    "Curiosity drives you toward fascinating discoveries. Follow the thread of an interesting idea wherever it leads.",
    "Social connections energize you today. A casual conversation could spark a meaningful collaboration or friendship.",
  ],
  Water: [
    "Trust your intuition today -- it's picking up on undercurrents that logic alone would miss. Pay attention to your dreams.",
    "Emotional honesty opens doors to deeper intimacy. Let yourself be vulnerable with someone you trust.",
    "Your empathy is heightened today. Use it wisely to support others, but remember to protect your own energy too.",
    "A reflective mood settles in, inviting you to explore your inner landscape. Journaling or meditation will feel especially rewarding.",
  ],
};

const CATEGORY_TEMPLATES: Record<string, Record<string, string[]>> = {
  love: {
    Fire: ["Passion ignites in unexpected moments. Be open to playful flirtation.", "Your warmth draws admirers. Express your affection boldly.", "Romantic energy is high. Speak from the heart without hesitation.", "A spark of attraction could surprise you. Stay open to connection."],
    Earth: ["Loyalty and reliability deepen bonds today. Show up consistently.", "Small gestures of care mean more than grand declarations right now.", "A stable presence strengthens your closest relationship.", "Practical acts of love -- cooking, fixing, helping -- speak volumes today."],
    Air: ["Engaging conversation is the pathway to someone's heart today.", "Witty exchanges and shared laughter bring you closer to someone special.", "Intellectual compatibility matters most right now. Connect through ideas.", "A lighthearted approach to love opens doors. Don't overthink it."],
    Water: ["Deep emotional sharing strengthens your most important bond.", "Vulnerability creates intimacy. Let your guard down with someone safe.", "Your intuition guides you toward the right words for a tender moment.", "Compassion and patience heal an old relational pattern today."],
  },
  career: {
    Fire: ["Take the lead on a project that excites you. Your initiative impresses.", "Bold proposals gain traction. Don't hold back your ambitious ideas.", "Your competitive edge is an asset today. Channel it constructively.", "A leadership opportunity presents itself. Step up with confidence."],
    Earth: ["Methodical work produces impressive results. Focus on quality.", "Financial planning and budgeting efforts bear fruit today.", "Your reliability earns trust from higher-ups. Keep delivering.", "A practical solution to a persistent problem elevates your standing."],
    Air: ["Networking and idea-sharing lead to valuable professional connections.", "Your communication skills solve a team challenge today.", "Presenting your ideas clearly wins allies and supporters.", "A creative brainstorm yields an innovative approach to an old problem."],
    Water: ["Reading the room gives you a strategic advantage in meetings.", "Your empathy helps resolve a workplace tension. Others notice your skill.", "Trust your gut feeling about a professional opportunity.", "Collaborative projects thrive when you bring emotional intelligence to the table."],
  },
  money: {
    Fire: ["A bold financial move could pay off, but calculate the risk first.", "Your earning potential increases when you negotiate with confidence.", "Invest energy in passion projects -- they have future monetary value.", "Entrepreneurial impulses are strong. Explore a side venture idea."],
    Earth: ["Careful budgeting and saving create future security. Review your finances.", "A practical investment opportunity deserves your attention today.", "Steady income streams are favored. Focus on sustainable growth.", "Material resources are available -- use them wisely and efficiently."],
    Air: ["Financial insight comes through research and informed decision-making.", "A conversation about money leads to a valuable tip or opportunity.", "Multiple income streams suit your versatile nature. Diversify.", "Intellectual property and digital assets could be lucrative right now."],
    Water: ["Trust your instincts about a financial decision, but verify with facts.", "Generosity returns to you in unexpected ways. Give without attachment.", "Emotional spending may tempt you -- pause before purchasing impulsively.", "A creative endeavor has hidden financial potential. Explore it gently."],
  },
  energy: {
    Fire: ["Physical activity channels your excess energy productively. Move your body.", "Your vitality is at a peak. Use this surge to tackle demanding tasks.", "Avoid burnout by balancing intensity with moments of rest.", "Outdoor activity in sunlight recharges your natural fire."],
    Earth: ["A grounding routine stabilizes your energy. Stick to healthy habits.", "Nature walks or gardening restore your equilibrium today.", "Your body responds well to nourishing, whole foods right now.", "Sleep quality matters more than quantity. Create a restful bedtime ritual."],
    Air: ["Mental stimulation energizes you, but take breaks to avoid overthinking.", "Fresh air and open spaces clear mental fog. Step outside.", "Social interaction boosts your vitality. Connect with uplifting people.", "Breathwork or meditation restores clarity when you feel scattered."],
    Water: ["Emotional processing may drain your energy. Honor the need for solitude.", "Water-related activities -- baths, swimming, rain walks -- deeply restore you.", "Creative expression channels emotional energy into something beautiful.", "Rest is productive today. Let yourself recharge without guilt."],
  },
};

const POWER_MOVES: Record<string, string[]> = {
  Fire: ["Send that bold message you've been drafting in your head.", "Volunteer to lead a project or initiative.", "Set one ambitious goal and take the first step today.", "Express something you've been holding back."],
  Earth: ["Organize one area of your life that's been cluttered.", "Open a savings account or set up automatic transfers.", "Create a concrete plan for a goal you've been vaguely considering.", "Complete a task you've been procrastinating on."],
  Air: ["Reach out to someone you've lost touch with.", "Write down three innovative ideas, no matter how wild.", "Start a meaningful conversation you've been avoiding.", "Learn something new -- a skill, a language, a concept."],
  Water: ["Write an unsent letter to process a complex emotion.", "Practice a 10-minute meditation focused on self-compassion.", "Share a vulnerability with someone you deeply trust.", "Create something artistic, even if it's imperfect."],
};

const DO_LISTS: Record<string, string[][]> = {
  Fire: [["Take initiative", "Express yourself", "Exercise"], ["Start something new", "Be spontaneous", "Embrace challenge"], ["Lead by example", "Try something bold", "Share your enthusiasm"]],
  Earth: [["Organize finances", "Cook a nourishing meal", "Declutter"], ["Plan ahead", "Build routine", "Invest in quality"], ["Connect with nature", "Finish a project", "Practice patience"]],
  Air: [["Call a friend", "Read something inspiring", "Journal"], ["Learn something new", "Share ideas", "Explore freely"], ["Network", "Write your thoughts", "Ask thoughtful questions"]],
  Water: [["Meditate", "Express emotions", "Rest deeply"], ["Create art", "Listen to music", "Be gentle with yourself"], ["Practice gratitude", "Nurture a relationship", "Trust your gut"]],
};

const AVOID_LISTS: Record<string, string[][]> = {
  Fire: [["Impulsive decisions", "Arguments for sport", "Overcommitting"], ["Burning bridges", "Skipping rest", "Dominating conversations"]],
  Earth: [["Stubbornness", "Overworking", "Material excess"], ["Resistance to change", "Overthinking details", "Neglecting play"]],
  Air: [["Gossip", "Overthinking", "Emotional avoidance"], ["Scattered attention", "Breaking commitments", "Cold detachment"]],
  Water: [["People-pleasing", "Escapism", "Emotional overwhelm"], ["Absorbing others' moods", "Avoiding tough truths", "Isolation"]],
};

const RITUALS: Record<string, string[]> = {
  Fire: ["Light a candle and set one clear intention for the day.", "Stand in sunlight for three minutes, breathing deeply and feeling revitalized.", "Write one bold affirmation on a card and carry it with you."],
  Earth: ["Hold a stone or crystal and take five grounding breaths.", "Walk barefoot on earth or grass for three minutes.", "Arrange a small altar with natural objects that bring you peace."],
  Air: ["Open a window and take seven deep breaths of fresh air.", "Write three things you're curious about on separate slips of paper.", "Sit quietly and observe your thoughts without engaging them for five minutes."],
  Water: ["Cup water in your hands and whisper an intention before drinking.", "Take a brief shower and imagine washing away what no longer serves you.", "Close your eyes and visualize yourself floating in calm, healing water."],
};

const JOURNAL_PROMPTS: Record<string, string[]> = {
  Fire: ["What would I do today if I weren't afraid?", "Where in my life am I holding back my true power?", "What passion have I been neglecting that deserves my attention?", "If I could change one thing about my life starting now, what would it be?"],
  Earth: ["What brings me the deepest sense of security and stability?", "What small daily habit would most improve my wellbeing?", "What am I building that future-me will be grateful for?", "Where can I simplify my life to create more space for what matters?"],
  Air: ["What idea has been circling my mind that deserves exploration?", "If I could have a conversation with anyone, who and about what?", "What beliefs am I ready to question and potentially release?", "How can I better communicate what I truly need?"],
  Water: ["What emotion am I carrying that needs acknowledgment?", "When did I last feel truly seen and understood?", "What would healing look like for the part of me that still hurts?", "What does my intuition keep whispering that my mind keeps overriding?"],
};

function getAspectBrief(transitPlanet: string, aspect: AspectType, natalPlanet: string): string {
  const briefs: Record<AspectType, string[]> = {
    conjunction: [
      `${transitPlanet} merges with your natal ${natalPlanet}, intensifying its themes.`,
      `A powerful fusion of ${transitPlanet} energy with your ${natalPlanet} placement.`,
    ],
    opposition: [
      `${transitPlanet} challenges your natal ${natalPlanet}, revealing what needs balancing.`,
      `Tension between ${transitPlanet} and your ${natalPlanet} creates growth through awareness.`,
    ],
    trine: [
      `${transitPlanet} flows harmoniously with your ${natalPlanet}, easing progress.`,
      `Natural support from ${transitPlanet} to your ${natalPlanet} opens doors effortlessly.`,
    ],
    square: [
      `${transitPlanet} creates friction with your ${natalPlanet}, motivating necessary change.`,
      `Pressure from ${transitPlanet} on your ${natalPlanet} pushes you to evolve.`,
    ],
    sextile: [
      `${transitPlanet} offers an opportunity through your ${natalPlanet}. Stay alert.`,
      `A gentle nudge from ${transitPlanet} activates your ${natalPlanet}'s potential.`,
    ],
  };
  const options = briefs[aspect] || briefs.conjunction;
  return options[0];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const authClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    let requestDate: string | undefined;
    try {
      const body = await req.json();
      requestDate = body.date;
    } catch { /* empty body is fine */ }

    const today = requestDate || new Date().toISOString().split("T")[0];

    const { data: cached } = await supabase
      .from("astrology_horoscope_cache")
      .select("content_json")
      .eq("user_id", user.id)
      .eq("date", today)
      .eq("type", "daily")
      .maybeSingle();

    if (cached?.content_json && Object.keys(cached.content_json).length > 0) {
      return new Response(JSON.stringify(cached.content_json), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: chartRow } = await supabase
      .from("astrology_natal_charts")
      .select("natal_json, big_three_json")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!chartRow?.natal_json) {
      return new Response(
        JSON.stringify({ error: "No natal chart found. Please compute your chart first." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const natalChart = chartRow.natal_json;
    const bigThree = chartRow.big_three_json;
    const natalPlanets: NatalPlanet[] = (natalChart.planets || []).map(
      (p: { planet: string; longitude: number; sign: string; house: number | null }) => ({
        planet: p.planet,
        longitude: p.longitude,
        sign: p.sign,
        house: p.house,
      })
    );

    const now = new Date();
    const transitPlanets = getCurrentPlanets(now);

    const moonTransit = transitPlanets.find((p) => p.planet === "Moon")!;
    const moonSign = lonToSign(moonTransit.longitude);
    const houseCusps: number[] = natalChart.houses || [];
    const moonHouse = houseCusps.length > 0 ? findHouse(moonTransit.longitude, houseCusps) : null;

    const hits = findTransitHits(transitPlanets, natalPlanets);

    const sunSign = bigThree?.sun?.sign || "Aries";
    const element = SIGN_ELEMENTS[sunSign] || "Fire";

    const rng = seededRandom(dateSeed(today, sunSign.charCodeAt(0)));

    const theme = pick(THEMES[element], rng);
    const summary = pick(SUMMARIES[element], rng);

    const transitHighlights = hits.map((h) => ({
      planet: h.planet,
      aspect: h.aspect,
      natalPlanet: h.natalPlanet,
      brief: getAspectBrief(h.planet, h.aspect, h.natalPlanet),
    }));

    const categories = {
      love: pick(CATEGORY_TEMPLATES.love[element], rng),
      career: pick(CATEGORY_TEMPLATES.career[element], rng),
      money: pick(CATEGORY_TEMPLATES.money[element], rng),
      energy: pick(CATEGORY_TEMPLATES.energy[element], rng),
    };

    const doList = pick(DO_LISTS[element], rng);
    const avoidList = pick(AVOID_LISTS[element], rng);
    const powerMove = pick(POWER_MOVES[element], rng);
    const ritual = pick(RITUALS[element], rng);
    const journalPrompt = pick(JOURNAL_PROMPTS[element], rng);

    const content = {
      date: today,
      theme,
      summary,
      moonSign: moonSign.sign,
      moonHouse,
      transitHighlights,
      categories,
      doList,
      avoidList,
      powerMove,
      ritual,
      journalPrompt,
    };

    await supabase.from("astrology_horoscope_cache").upsert(
      {
        user_id: user.id,
        date: today,
        type: "daily",
        content_json: content,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,date,type" }
    );

    return new Response(JSON.stringify(content), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Daily horoscope error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to generate daily horoscope",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
