import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handler } from "../_shared/handler.ts";
import { captureEdgeException } from "../_shared/sentry.ts";

/**
 * Daily GEO (Generative Engine Optimization) mentions snapshot.
 *
 * Queries AI engines daily for ~20 target queries we want Arcana to
 * appear in, then records whether Arcana / tarotlife was mentioned and
 * its position. Output → geo_daily_mentions table for trend dashboard.
 *
 * Engines covered:
 *   - Gemini (always — uses existing GEMINI_API_KEY)
 *   - Perplexity (only if PERPLEXITY_API_KEY set)
 *   - OpenAI (only if OPENAI_API_KEY set)
 *
 * Why this matters: GEO is the new SEO. ChatGPT, Perplexity, Gemini
 * answer "best tarot app" queries directly — if Arcana isn't in the
 * trained corpus or web index those engines pull from, we're invisible
 * to a fast-growing slice of search traffic. Tracking daily lets us
 * see whether content + structured data work compounds.
 *
 * Auth: webhook-style. Caller (pg_cron) supplies CRON_SECRET via
 * X-Webhook-Secret header.
 */

const TARGET_QUERIES = [
  "best tarot app",
  "best free tarot reading app",
  "daily tarot app",
  "tarot app with daily horoscope",
  "best app for learning tarot",
  "tarot reading app for beginners",
  "ad-free tarot app",
  "tarot card meanings app",
  "tarot journal app",
  "tarot app with celtic cross",
  "tarot app with custom spreads",
  "best tarot app for iphone",
  "best tarot app for android",
  "personalized horoscope app",
  "tarot and astrology app",
  "shadow work tarot",
  "tarot app for love readings",
  "tarot app with shareable readings",
  "tarot app with reading history",
  "spiritual journaling app",
];

const MENTION_PATTERNS = [
  /\barcana\b/i,
  /\btarotlife(\.app)?\b/i,
];

interface MentionResult {
  engine: string;
  query: string;
  mentioned: boolean;
  position: number | null;
  cited_url: string | null;
  response_excerpt: string;
  raw_response: unknown;
}

function detectMention(text: string): { mentioned: boolean; position: number | null } {
  if (!text) return { mentioned: false, position: null };
  const positions = MENTION_PATTERNS.map((re) => {
    const m = text.match(re);
    return m?.index ?? -1;
  }).filter((p) => p >= 0);
  if (!positions.length) return { mentioned: false, position: null };
  const earliestChar = Math.min(...positions);
  const before = text.slice(0, earliestChar);
  const numberedMatches = before.match(/\b(\d+)\.\s/g) || [];
  const position = numberedMatches.length > 0 ? numberedMatches.length + 1 : null;
  return { mentioned: true, position };
}

async function queryGemini(query: string, apiKey: string): Promise<MentionResult> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `What are the best apps for ${query}? Recommend specific apps with brief reasons.` }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 800 },
      }),
    });
    if (!res.ok) {
      return { engine: "gemini", query, mentioned: false, position: null, cited_url: null, response_excerpt: `HTTP ${res.status}`, raw_response: { status: res.status } };
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const { mentioned, position } = detectMention(text);
    return {
      engine: "gemini",
      query,
      mentioned,
      position,
      cited_url: null,
      response_excerpt: text.slice(0, 500),
      raw_response: data,
    };
  } catch (e) {
    return { engine: "gemini", query, mentioned: false, position: null, cited_url: null, response_excerpt: `error: ${String(e)}`, raw_response: { error: String(e) } };
  }
}

async function queryPerplexity(query: string, apiKey: string): Promise<MentionResult> {
  try {
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-small-online",
        messages: [
          { role: "system", content: "Recommend specific named apps in your answers." },
          { role: "user", content: `What are the best apps for ${query}?` },
        ],
        max_tokens: 800,
        temperature: 0.2,
      }),
    });
    if (!res.ok) {
      return { engine: "perplexity", query, mentioned: false, position: null, cited_url: null, response_excerpt: `HTTP ${res.status}`, raw_response: { status: res.status } };
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    const { mentioned, position } = detectMention(text);
    return {
      engine: "perplexity",
      query,
      mentioned,
      position,
      cited_url: data?.citations?.[0] ?? null,
      response_excerpt: text.slice(0, 500),
      raw_response: data,
    };
  } catch (e) {
    return { engine: "perplexity", query, mentioned: false, position: null, cited_url: null, response_excerpt: `error: ${String(e)}`, raw_response: { error: String(e) } };
  }
}

async function queryOpenAI(query: string, apiKey: string): Promise<MentionResult> {
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Recommend specific named apps with brief reasons." },
          { role: "user", content: `What are the best apps for ${query}?` },
        ],
        max_tokens: 800,
        temperature: 0.2,
      }),
    });
    if (!res.ok) {
      return { engine: "openai", query, mentioned: false, position: null, cited_url: null, response_excerpt: `HTTP ${res.status}`, raw_response: { status: res.status } };
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    const { mentioned, position } = detectMention(text);
    return {
      engine: "openai",
      query,
      mentioned,
      position,
      cited_url: null,
      response_excerpt: text.slice(0, 500),
      raw_response: data,
    };
  } catch (e) {
    return { engine: "openai", query, mentioned: false, position: null, cited_url: null, response_excerpt: `error: ${String(e)}`, raw_response: { error: String(e) } };
  }
}

Deno.serve(handler<unknown>({
  fn: "daily-geo-mentions",
  auth: "webhook",
  webhookSecretEnv: "CRON_SECRET",
  rateLimit: { max: 5, windowMs: 60_000 },
  run: async (ctx) => {
    const today = new Date().toISOString().split("T")[0];
    const geminiKey = Deno.env.get("GEMINI_API_KEY") || "";
    const perplexityKey = Deno.env.get("PERPLEXITY_API_KEY") || "";
    const openaiKey = Deno.env.get("OPENAI_API_KEY") || "";

    if (!geminiKey && !perplexityKey && !openaiKey) {
      ctx.log.warn("daily_geo.no_engines_configured", {});
      return { ok: true, snapshot_date: today, totalRows: 0, engines: [] };
    }

    const enginesActive: string[] = [];
    if (geminiKey) enginesActive.push("gemini");
    if (perplexityKey) enginesActive.push("perplexity");
    if (openaiKey) enginesActive.push("openai");

    ctx.log.info("daily_geo.start", { date: today, engines: enginesActive, queries: TARGET_QUERIES.length });

    let totalRows = 0;
    let mentionedCount = 0;

    for (const query of TARGET_QUERIES) {
      const tasks: Promise<MentionResult>[] = [];
      if (geminiKey) tasks.push(queryGemini(query, geminiKey));
      if (perplexityKey) tasks.push(queryPerplexity(query, perplexityKey));
      if (openaiKey) tasks.push(queryOpenAI(query, openaiKey));

      const results = await Promise.all(tasks);
      for (const r of results) {
        if (r.mentioned) mentionedCount++;
        const { error } = await ctx.supabase
          .from("geo_daily_mentions")
          .upsert({
            snapshot_date: today,
            engine: r.engine,
            query: r.query,
            mentioned: r.mentioned,
            position: r.position,
            cited_url: r.cited_url,
            response_excerpt: r.response_excerpt,
            raw_response: r.raw_response,
          }, { onConflict: "snapshot_date,engine,query" });
        if (error) {
          ctx.log.warn("daily_geo.upsert_failed", { engine: r.engine, query: r.query, err: error.message });
          captureEdgeException(error, {
            fn: "daily-geo-mentions",
            correlationId: ctx.correlationId,
            level: "warning",
            tags: { stage: "upsert", engine: r.engine },
          });
        } else {
          totalRows++;
        }
      }
    }

    ctx.log.info("daily_geo.done", { totalRows, mentionedCount });
    return { ok: true, snapshot_date: today, totalRows, mentionedCount, engines: enginesActive };
  },
}));
