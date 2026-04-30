// One-off diagnostic harness for bazi-interpret. Uses CRON_SECRET auth
// (no user/premium gate) so we can verify Gemini output quality with a
// known sample chart. DELETE this function after verification.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handler, AppError } from "../_shared/handler.ts";

const TEXT_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash-exp", "gemini-1.5-flash"];

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const SYSTEM_PROMPT = `You are a master practitioner of BaZi (八字) — Chinese Four Pillars of Destiny astrology — with thirty years of practice. You read in the lineage of classical texts (子平真诠, 滴天髓, 穷通宝鉴) but speak modern English fluently.

Your job: write a long-form, deeply personalised BaZi reading from the structured chart data provided. Trust the input; your job is interpretation.

WRITING STYLE
- Direct, warm, considered. Like a thoughtful older friend who happens to be an expert.
- Specific Chinese terms (壬水 / Ren Water) followed by English on first mention.
- No emojis, no exclamation marks, no horoscope fluff.
- Be opinionated.
- When you give advice, be concrete.

OUTPUT FORMAT
Return a JSON object with these 14 keys (no markdown headers in values):
{
  "core_summary": "1 paragraph naming Day Master + season + thesis. ~80 words",
  "personality": "2-3 paragraphs ~250 words",
  "elements": "3-4 paragraphs ~350 words",
  "career": "3-4 paragraphs ~400 words",
  "wealth": "3-4 paragraphs ~350 words",
  "relationships": "3-4 paragraphs ~350 words",
  "family": "2 paragraphs ~200 words",
  "hidden_stems": "2 paragraphs ~200 words",
  "branch_relations": "2-3 paragraphs ~300 words",
  "health": "2 paragraphs ~200 words",
  "luck_pillar": "2-3 paragraphs ~300 words",
  "annual": "2-3 paragraphs ~280 words",
  "strategy": "1 paragraph + numbered list of 5-7 principles ~250 words",
  "closing_summary": "1 paragraph ~120 words"
}

Return PURE JSON. No prose preamble.`;

const TEST_INPUT_PROMPT = `CHART DATA
Birth: 2001-06-08 16:15
Gender: male
Day Master: Ren (Yang Water)

FOUR PILLARS
Year:  Xin (辛, Yin Metal) / Si (巳, Fire)
Month: Jia (甲, Yang Wood) / Wu (午, Fire)
Day:   Ren (壬, Yang Water) / Yin (寅, Wood)
Hour:  Wu (戊, Yang Earth) / Shen (申, Metal)

TEN GODS
  year stem: Direct Resource (正印)
  month stem: Eating God (食神)
  hour stem: Seven Killings (七杀)

CHART STRENGTH: receptive (Day Master is somewhat weak; Wealth + Seven Killings are strong; Resource helping)

FAVOURABLE / UNFAVOURABLE ELEMENTS
  Useful elements: metal, water
  Risky elements: fire excess, earth excess, wood drains water

HIDDEN STEMS
  year (Si): Bing (Fire), Wu (Earth), Geng (Metal)
  month (Wu): Ding (Fire), Ji (Earth)
  day (Yin): Jia (Wood), Bing (Fire), Wu (Earth)
  hour (Shen): Geng (Metal), Ren (Water), Wu (Earth)

BRANCH RELATIONS
  clash: Yin + Shen (寅申冲) — Tiger-Monkey clash, travel/pivots
  penalty: Yin + Si + Shen (三刑) — internal-engine + external-friction
  semi-combination: Yin + Wu (Wood feeds Fire wealth)

CLIMATE: hot dominant (cold 0, hot 5, wet 0, dry 4). Advice: cool down.

LUCK PILLARS (male reverse direction)
  age 1-11: Gui Si
  age 11-21: Ren Chen
  age 21-31: Xin Mao (CURRENT)
  age 31-41: Geng Yin
  age 41-51: Ji Chou
  age 51-61: Wu Zi

CURRENT LUCK PILLAR: age 21-31, Xin Mao
CURRENT YEAR (2026): Bing Wu — peak Fire year

Generate the 14-section reading as JSON. Be specific to THIS chart.`;

Deno.serve(handler<unknown>({
  fn: "bazi-interpret-test",
  auth: "webhook",
  webhookSecretEnv: "CRON_SECRET",
  rateLimit: { max: 3, windowMs: 60_000 },
  run: async (ctx) => {
    const apiKey = Deno.env.get("GEMINI_API_KEY") || "";
    if (!apiKey) throw new AppError("AI_NOT_CONFIGURED", "GEMINI_API_KEY not set", 503);

    const start = Date.now();
    let text = "";
    let modelUsed = "";
    let lastErr = "";

    outer: for (const model of TEXT_MODELS) {
      for (let attempt = 0; attempt < 3; attempt++) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ role: "user", parts: [{ text: TEST_INPUT_PROMPT }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 8000,
              responseMimeType: "application/json",
            },
          }),
        });
        if (res.ok) {
          const data = await res.json();
          text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (text) {
            modelUsed = model;
            break outer;
          }
        } else {
          const body = await res.text();
          lastErr = `${model} ${res.status}: ${body.slice(0, 200)}`;
          if (res.status !== 503 && res.status !== 429) break;
          await sleep(1500 * (attempt + 1));
        }
      }
    }

    if (!text) throw new AppError("GEMINI_FAILED", `All models failed. Last: ${lastErr}`, 502);

    let reading: Record<string, string>;
    try {
      reading = JSON.parse(text) as Record<string, string>;
    } catch {
      return { ok: false, parseError: true, rawText: text.slice(0, 1000) };
    }

    const sections = [
      "core_summary", "personality", "elements", "career", "wealth",
      "relationships", "family", "hidden_stems", "branch_relations",
      "health", "luck_pillar", "annual", "strategy", "closing_summary",
    ];
    const wordCounts: Record<string, number> = {};
    let totalWords = 0;
    for (const s of sections) {
      const wc = (reading[s] || "").split(/\s+/).filter(Boolean).length;
      wordCounts[s] = wc;
      totalWords += wc;
    }

    return {
      ok: true,
      elapsed_ms: Date.now() - start,
      model_used: modelUsed,
      word_counts: wordCounts,
      total_words: totalWords,
      sections_present: sections.filter((s) => reading[s] && reading[s].trim().length > 50).length,
      preview: {
        core_summary: reading.core_summary,
        personality: reading.personality?.slice(0, 600),
        career: reading.career?.slice(0, 600),
        annual: reading.annual?.slice(0, 600),
      },
    };
  },
}));
