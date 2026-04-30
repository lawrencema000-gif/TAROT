/**
 * End-to-end test of the Bazi AI interpretation pipeline.
 *
 * Bypasses auth + premium gate by calling Gemini directly with the same
 * structured input + system prompt the deployed edge function uses.
 * Lets us verify the AI output quality before the user manually tests.
 *
 * Run: GEMINI_API_KEY=xxx node scripts/test-bazi-interpret.mjs
 *
 * Sample input: 8 June 2001, 4:15 pm Sydney (matches the ChatGPT 5.4
 * reading the user shared).
 */

const TEXT_MODEL = "gemini-2.5-flash";

const SYSTEM_PROMPT = `You are a master practitioner of BaZi (八字) — Chinese Four Pillars of Destiny astrology — with thirty years of practice. You read in the lineage of classical texts (子平真诠, 滴天髓, 穷通宝鉴) but speak modern English fluently. You combine traditional rigour with practical wisdom for a contemporary reader.

Your job: write a long-form, deeply personalised BaZi reading from the structured chart data the user provides. The data is already computed correctly — do NOT recompute pillars, luck pillars, or branch relations. Trust the input; your job is interpretation, not arithmetic.

WRITING STYLE
- Direct, warm, considered. Like a thoughtful older friend who happens to be an expert.
- Use specific Chinese terms (壬水 / Ren Water, 食神 / Eating God, 寅申冲 / Tiger-Monkey clash) followed by English translation on first mention. Drop the Chinese after.
- Quote one or two short Chinese phrases inline where they add gravitas (e.g. "杀印相生").
- No emojis, no exclamation marks, no horoscope-magazine fluff.
- Be opinionated. Take a clear view.
- Vary sentence length. Short punches between longer ideas.
- When you give advice, be concrete.

OUTPUT FORMAT
Return a JSON object with exactly these 14 keys, each containing 2-6 plain-text paragraphs (no markdown headers inside the values):

{
  "core_summary": "1 punchy paragraph naming the Day Master, the season, and the chart's central thesis. ~80 words.",
  "personality": "2-3 paragraphs. Inner drives, surface presentation, shadow side. ~250 words.",
  "elements": "3-4 paragraphs. The five-element distribution, useful elements, risky elements, the golden formula in one quotable sentence at the end. ~350 words.",
  "career": "3-4 paragraphs. Best-fit fields, business style, scaling pattern, what kind of partner/co-founder profile they need. ~400 words.",
  "wealth": "3-4 paragraphs. How money shows up for them, what works, what to avoid. ~350 words.",
  "relationships": "3-4 paragraphs. Romantic patterns, what they attract, what they need from a partner, any clash dynamics in the chart. ~350 words.",
  "family": "2 paragraphs. Year + month pillar reading on early life, parental dynamics, expectations around them. ~200 words.",
  "hidden_stems": "2 paragraphs. What the hidden stems reveal about the inner game vs outer presentation. ~200 words.",
  "branch_relations": "2-3 paragraphs. Walk through the chart's clashes, penalties, harmonies, combinations. What each one means in real life. ~300 words.",
  "health": "2 paragraphs. Body-system tendencies based on hot/dry vs cool/wet patterns. Concrete lifestyle suggestions. Note this is symbolic, not medical. ~200 words.",
  "luck_pillar": "2-3 paragraphs. The current 10-year luck pillar — what it favours, what to watch for, the most important move to make in this decade. ~300 words.",
  "annual": "2-3 paragraphs. The current calendar year's pillar — what it brings, what's risky, where to push and where to slow down. ~280 words.",
  "strategy": "1 paragraph + a numbered list of 5-7 specific principles for this person to live by. ~250 words total.",
  "closing_summary": "1 paragraph. Resolve into one honest, encouraging sentence at the end. ~120 words."
}

CRITICAL RULES
1. The chart data is ground truth. Do not invent pillars or relations.
2. Use the user's actual gender from input.
3. If 七杀 / Seven Killings or 食神制杀 patterns appear, name them.
4. If 寅申冲 / 卯酉冲 / 巳亥冲 / 子午冲 appear, walk through what each means.
5. If 三刑 (triple penalty) appears, explain the internal-engine vs external-friction dynamic.
6. Luck-pillar section: focus on the CURRENT 10-year cycle.
7. Annual section: focus on the CURRENT year.
8. Return PURE JSON. No prose preamble, no markdown code fences.`;

// 8 June 2001, 4:15pm Sydney male → 辛巳 甲午 壬寅 戊申
const TEST_INPUT = `CHART DATA
Birth: 2001-06-08 16:15
Gender: male
Day Master: Ren (Yang Water)

FOUR PILLARS
Year:  Xin (辛, Yin Metal) / Si (巳, Fire)
Month: Jia (甲, Yang Wood) / Wu (午, Fire)
Day:   Ren (壬, Yang Water) / Yin (寅, Wood)
Hour:  Wu (戊, Yang Earth) / Shen (申, Metal)

TEN GODS
  year (Xin → Ren): Direct Resource (正印)
  month (Jia → Ren): Eating God (食神)
  hour (Wu → Ren): Seven Killings (七杀)

CHART STRENGTH: receptive
  Day Master is somewhat weak. Wealth (Fire) and Seven Killings (Earth) are strong, with Resource (Metal) helping.

FAVOURABLE / UNFAVOURABLE ELEMENTS
  Useful elements: metal, water
  Risky elements: fire (excess), earth (excess), wood (excess drains water)
  Most useful element: metal (Resource). Supporting: water (self).
  Career hint: AI, systems, technology, finance, data, contracts, mentorship.

HIDDEN STEMS
  year (Si): Bing (Fire), Wu (Earth), Geng (Metal)
  month (Wu): Ding (Fire), Ji (Earth)
  day (Yin): Jia (Wood), Bing (Fire), Wu (Earth)
  hour (Shen): Geng (Metal), Ren (Water), Wu (Earth)

BRANCH RELATIONS
  clash (Yin + Shen): Tiger-Monkey clash. Movement, travel, sudden pivots.
  penalty (Yin + Si + Shen): Triple penalty / 三刑. Powerful internal engine but self-created friction.
  semi-combination (Yin + Wu): Fire support strengthens Wealth.

CLIMATE: Climate dominant: hot (cold 0, hot 5, wet 0, dry 4).
  Advice: Cool down. Hydration, water-element activities, calm routines.

LUCK PILLARS (10-year cycles, male reverse direction for Yin year)
  age 1-11: Gui Si — water appears, fire still strong
  age 11-21: Ren Chen — self-strengthening, learning
  age 21-31: Xin Mao — Resource + Output (CURRENT)
  age 31-41: Geng Yin — innovation, expansion
  age 41-51: Ji Chou — authority, structure, assets
  age 51-61: Wu Zi — power, water root, high-level influence

CURRENT LUCK PILLAR: age 21-31, Xin Mao

CURRENT YEAR (2026): Bing Wu — peak Fire-Wealth year

Now generate the full 14-section reading as JSON. Be specific to THIS chart, not generic.`;

async function callGemini(apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${TEXT_MODEL}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: TEST_INPUT }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8000,
        responseMimeType: "application/json",
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini failed: ${res.status} ${body.slice(0, 500)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No text in response");
  return JSON.parse(text);
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Set GEMINI_API_KEY env var");
  process.exit(1);
}

console.log("Calling Gemini with sample chart (8 June 2001 4:15pm male, matching ChatGPT 5.4 example)...");
console.log("");
const start = Date.now();

try {
  const reading = await callGemini(apiKey);
  const elapsed = Date.now() - start;

  console.log(`✅ Reading generated in ${(elapsed / 1000).toFixed(1)}s`);
  console.log("");

  const sections = [
    "core_summary", "personality", "elements", "career", "wealth",
    "relationships", "family", "hidden_stems", "branch_relations",
    "health", "luck_pillar", "annual", "strategy", "closing_summary",
  ];
  for (const key of sections) {
    const text = reading[key];
    const wc = text ? text.split(/\s+/).filter(Boolean).length : 0;
    console.log(`  ${key.padEnd(20)} → ${wc} words${wc < 50 ? "  ⚠️ short" : wc > 600 ? "  ⚠️ long" : ""}`);
  }

  const total = sections.reduce((s, k) => s + (reading[k]?.split(/\s+/).filter(Boolean).length || 0), 0);
  console.log("");
  console.log(`Total: ${total} words across 14 sections`);
  console.log("");
  console.log("─── First 800 chars of core_summary + personality + elements ───");
  console.log("");
  console.log("CORE SUMMARY:");
  console.log(reading.core_summary?.slice(0, 400));
  console.log("");
  console.log("PERSONALITY (first 400 chars):");
  console.log(reading.personality?.slice(0, 400));
  console.log("");
  console.log("ELEMENTS (first 400 chars):");
  console.log(reading.elements?.slice(0, 400));
} catch (e) {
  console.error("❌ FAILED:", e.message);
  process.exit(1);
}
