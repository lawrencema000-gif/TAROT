import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handler, AppError } from "../_shared/handler.ts";

/**
 * Bazi AI interpretation — turns the user's structured Bazi chart
 * into a comprehensive narrative reading via Gemini 2.5 Flash.
 *
 * The client computes the chart locally (deterministic — no LLM needed
 * for that part) and sends the full structured data here. We then
 * prompt Gemini with an authoritative Bazi-reader system prompt and
 * return the narrative, structured into 14 sections that mirror what
 * a master practitioner would cover:
 *   - core_summary, personality, elements (useful + risky),
 *     career, wealth, relationships, family, hidden_stems,
 *     branch_relations, health, luck_pillar, annual, strategy, closing
 *
 * Cached per (user_id, year) — the chart is static but the annual
 * section is year-specific, so we refresh annually. Cached row is
 * returned immediately when it exists; re-generation requires a
 * `force=true` body flag (admin / debug only).
 *
 * AI provider chain (OpenAI primary, Gemini fallback):
 *   1. OPENAI_API_KEY → gpt-5 (3 attempts, then gpt-5-mini)
 *   2. GEMINI_API_KEY → gemini-2.5-flash → 2.0-flash-exp → 1.5-flash
 *   At least one of the two API keys must be set; both is best.
 *
 * Auth: required (subscription gate enforced inline).
 */

// Provider chain — quality-first. gpt-5 produces noticeably stronger
// 14-section Bazi narratives (better Ten-Gods reasoning, richer luck-
// pillar analysis) than 4o-mini, with much more reliable JSON-mode
// adherence. gpt-5-mini covers retries; Gemini covers OpenAI outages.
const OPENAI_MODELS = ["gpt-5", "gpt-5-mini"];
const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash-exp", "gemini-1.5-flash"];

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface BaziInput {
  // Pillars
  pillars: {
    year: { stem: string; branch: string };
    month: { stem: string; branch: string };
    day: { stem: string; branch: string };
    hour: { stem: string; branch: string };
  };
  dayMaster: string; // e.g. "Ren Water"
  birthDate: string;
  birthTime: string | null;
  gender: "male" | "female";
  // Computed structures from baziDeep.ts
  chartStrength?: { rating: string; explanation: string };
  favorableElement?: { useful: string[]; risky: string[]; explanation: string };
  hiddenStems?: Record<string, string[]>;
  branchRelations?: Array<{ kind: string; branches: string[]; meaning: string }>;
  climate?: { reading: string; advice: string };
  tenGods?: Record<string, string>; // pillar position → ten god label
  luckPillars?: Array<{ ageStart: number; ageEnd: number; stem: string; branch: string; theme?: string }>;
  currentLuckPillar?: { ageStart: number; ageEnd: number; stem: string; branch: string };
  annualLuck?: { year: number; stem: string; branch: string };
  force?: boolean; // bypass cache
}

const SYSTEM_PROMPT = `You are a master practitioner of BaZi (八字) — Chinese Four Pillars of Destiny astrology — with thirty years of practice. You read in the lineage of classical texts (子平真诠, 滴天髓, 穷通宝鉴) but speak modern English fluently. You combine traditional rigour with practical wisdom for a contemporary reader.

Your job: write a long-form, deeply personalised BaZi reading from the structured chart data the user provides. The data is already computed correctly — do NOT recompute pillars, luck pillars, or branch relations. Trust the input; your job is interpretation, not arithmetic.

WRITING STYLE
- Direct, warm, considered. Like a thoughtful older friend who happens to be an expert.
- Use specific Chinese terms (壬水 / Ren Water, 食神 / Eating God, 寅申冲 / Tiger-Monkey clash) followed by English translation on first mention. Drop the Chinese after.
- Quote one or two short Chinese phrases inline where they add gravitas (e.g. "杀印相生").
- No emojis, no exclamation marks, no horoscope-magazine fluff ("✨ amazing energy babes ✨"). Authentic, not performative.
- Be opinionated. Take a clear view. The user wants insight, not hedging.
- Vary sentence length. Short punches between longer ideas.
- When you give advice, be concrete. "Hire an accountant who is good with international tax structures" beats "consider seeking professional help."

OUTPUT FORMAT
Return a JSON object with exactly these 14 keys, each containing 2-6 plain-text paragraphs (no markdown headers inside the values; the client renders the sections):

{
  "core_summary": "1 punchy paragraph naming the Day Master, the season, and the chart's central thesis. ~80 words.",
  "personality": "2-3 paragraphs. Inner drives, surface presentation, shadow side. ~250 words.",
  "elements": "3-4 paragraphs. The five-element distribution, useful elements, risky elements, the golden formula in one quotable sentence at the end. ~350 words.",
  "career": "3-4 paragraphs. Best-fit fields, business style, scaling pattern, what kind of partner/co-founder profile they need. ~400 words.",
  "wealth": "3-4 paragraphs. How money shows up for them, what works, what to avoid. Include the principle 'never confuse opportunity with readiness' or its equivalent if it fits. ~350 words.",
  "relationships": "3-4 paragraphs. Romantic patterns, what they attract, what they need from a partner, any clash dynamics in the chart. Be honest about both gifts and pitfalls. ~350 words.",
  "family": "2 paragraphs. Year + month pillar reading on early life, parental dynamics, expectations around them. ~200 words.",
  "hidden_stems": "2 paragraphs. What the hidden stems reveal about the inner game vs outer presentation. ~200 words.",
  "branch_relations": "2-3 paragraphs. Walk through the chart's clashes, penalties, harmonies, combinations. What each one means in real life — career, relationships, health. ~300 words.",
  "health": "2 paragraphs. Body-system tendencies based on hot/dry vs cool/wet patterns. Concrete lifestyle suggestions. Note this is symbolic, not medical. ~200 words.",
  "luck_pillar": "2-3 paragraphs. The current 10-year luck pillar — what it favours, what to watch for, the most important move to make in this decade. ~300 words.",
  "annual": "2-3 paragraphs. The current calendar year's pillar — what it brings, what's risky, where to push and where to slow down. ~280 words.",
  "strategy": "1 paragraph + a numbered list of 5-7 specific principles for this person to live by. ~250 words total.",
  "closing_summary": "1 paragraph. Resolve into one honest, encouraging sentence at the end that they could pin to their wall. ~120 words."
}

CRITICAL RULES
1. The chart data is ground truth. Do not invent pillars, branches, or relations not in the input.
2. Use the user's actual gender from input — luck-pillar direction is gender-dependent (yang-year males / yin-year females go forward; yin-year males / yang-year females go backward). The input already accounts for this; use the data as given.
3. If the chart shows a 七杀 / Seven Killings or 食神制杀 / Eating God controls Seven Killings pattern, name it explicitly — these are the founder/leader signatures.
4. If 寅申冲 / 卯酉冲 / 巳亥冲 / 子午冲 (the four major clashes) appear, walk through what each ACTUALLY means for this person's life, not generic clash language.
5. If branches form a 三刑 / triple penalty (寅巳申, 丑戌未, 子卯, 辰午酉亥 self-penalty), explain the internal-engine vs external-friction dynamic.
6. The luck-pillar section should focus on the CURRENT 10-year cycle the user is in — find it from the input data, not the youngest one.
7. The annual section should focus on the CURRENT year from the input, with concrete advice for the next 12 months.
8. Return PURE JSON. No prose preamble, no markdown code fences, no trailing commentary. Just the object.`;

function buildUserPrompt(input: BaziInput): string {
  const lines: string[] = [];
  lines.push("CHART DATA");
  lines.push(`Birth: ${input.birthDate}${input.birthTime ? ` ${input.birthTime}` : " (time unknown)"}`);
  lines.push(`Gender: ${input.gender}`);
  lines.push(`Day Master: ${input.dayMaster}`);
  lines.push("");
  lines.push("FOUR PILLARS");
  lines.push(`Year:  ${input.pillars.year.stem} / ${input.pillars.year.branch}`);
  lines.push(`Month: ${input.pillars.month.stem} / ${input.pillars.month.branch}`);
  lines.push(`Day:   ${input.pillars.day.stem} / ${input.pillars.day.branch}`);
  lines.push(`Hour:  ${input.pillars.hour.stem} / ${input.pillars.hour.branch}`);
  lines.push("");

  if (input.tenGods) {
    lines.push("TEN GODS");
    for (const [pos, god] of Object.entries(input.tenGods)) {
      lines.push(`  ${pos}: ${god}`);
    }
    lines.push("");
  }

  if (input.chartStrength) {
    lines.push(`CHART STRENGTH: ${input.chartStrength.rating}`);
    lines.push(`  ${input.chartStrength.explanation}`);
    lines.push("");
  }

  if (input.favorableElement) {
    lines.push("FAVOURABLE / UNFAVOURABLE ELEMENTS");
    lines.push(`  Useful elements: ${input.favorableElement.useful.join(", ")}`);
    lines.push(`  Risky elements: ${input.favorableElement.risky.join(", ")}`);
    lines.push(`  ${input.favorableElement.explanation}`);
    lines.push("");
  }

  if (input.hiddenStems) {
    lines.push("HIDDEN STEMS");
    for (const [branch, stems] of Object.entries(input.hiddenStems)) {
      lines.push(`  ${branch}: ${stems.join(", ")}`);
    }
    lines.push("");
  }

  if (input.branchRelations && input.branchRelations.length > 0) {
    lines.push("BRANCH RELATIONS");
    for (const rel of input.branchRelations) {
      lines.push(`  ${rel.kind} (${rel.branches.join(" + ")}): ${rel.meaning}`);
    }
    lines.push("");
  }

  if (input.climate) {
    lines.push(`CLIMATE: ${input.climate.reading}`);
    lines.push(`  Advice: ${input.climate.advice}`);
    lines.push("");
  }

  if (input.luckPillars && input.luckPillars.length > 0) {
    lines.push("LUCK PILLARS (10-year cycles)");
    for (const lp of input.luckPillars) {
      lines.push(`  age ${lp.ageStart}-${lp.ageEnd}: ${lp.stem} ${lp.branch}${lp.theme ? ` — ${lp.theme}` : ""}`);
    }
    lines.push("");
  }

  if (input.currentLuckPillar) {
    lines.push(`CURRENT LUCK PILLAR: age ${input.currentLuckPillar.ageStart}-${input.currentLuckPillar.ageEnd}, ${input.currentLuckPillar.stem} ${input.currentLuckPillar.branch}`);
    lines.push("");
  }

  if (input.annualLuck) {
    lines.push(`CURRENT YEAR (${input.annualLuck.year}): ${input.annualLuck.stem} ${input.annualLuck.branch}`);
    lines.push("");
  }

  lines.push("Now generate the full 14-section reading as JSON. Be specific to THIS chart, not generic.");
  return lines.join("\n");
}

// Bumped on every model upgrade so the next request regenerates with
// the new model rather than returning a stale 4o-mini cached reading.
const MODEL_GENERATION = "v2-gpt5";

function inputSignature(input: BaziInput): string {
  // Hash that invalidates the cache when ANY of these change:
  //   - user details (birthDate, birthTime, gender)
  //   - calendar year (annual section is year-specific)
  //   - chart computation result (pillars, ten gods, branch relations,
  //     luck pillars). This means future chart-algorithm fixes
  //     auto-invalidate stale cached readings without manual cleanup.
  //   - MODEL_GENERATION — bumping the constant invalidates every cached
  //     reading the next time the user opens the page, so model upgrades
  //     are visible immediately without manual cache clears.
  const parts = [
    MODEL_GENERATION,
    input.birthDate,
    input.birthTime || "",
    input.gender,
    new Date().getFullYear().toString(),
    `${input.pillars.year.stem}${input.pillars.year.branch}`,
    `${input.pillars.month.stem}${input.pillars.month.branch}`,
    `${input.pillars.day.stem}${input.pillars.day.branch}`,
    `${input.pillars.hour.stem}${input.pillars.hour.branch}`,
    input.dayMaster,
    input.currentLuckPillar
      ? `${input.currentLuckPillar.stem}${input.currentLuckPillar.branch}`
      : "",
  ];
  return parts.join("|");
}

interface ReadingShape {
  core_summary: string;
  personality: string;
  elements: string;
  career: string;
  wealth: string;
  relationships: string;
  family: string;
  hidden_stems: string;
  branch_relations: string;
  health: string;
  luck_pillar: string;
  annual: string;
  strategy: string;
  closing_summary: string;
}

// gpt-5 and other reasoning models have different API constraints than
// gpt-4o: no custom temperature, reasoning tokens consume the completion
// budget. We pad max_completion_tokens and switch to reasoning_effort.
function isReasoningModel(model: string): boolean {
  return model.startsWith("gpt-5") || model.startsWith("o1") || model.startsWith("o3") || model.startsWith("o4");
}

// Per-call wall-clock cap. Real successful gpt-5 calls land in 60-90s. We
// abort at 90s so a single slow call doesn't eat the whole edge-function
// budget — Supabase's wall-clock limit is 150s, and we need headroom for
// fallback to gpt-5-mini and Gemini.
const PER_CALL_TIMEOUT_MS = 90_000;

async function callOpenAIOnce(model: string, prompt: string, apiKey: string): Promise<{ ok: true; text: string } | { ok: false; status: number; body: string }> {
  const reasoning = isReasoningModel(model);
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    // Bazi readings are ~3000-4000 tokens of structured JSON. Reasoning
    // models need extra headroom so internal reasoning doesn't eat the
    // budget before the JSON is emitted. With reasoning_effort=minimal,
    // 10k completion budget comfortably covers reasoning + 4k output.
    max_completion_tokens: reasoning ? 10000 : 8000,
    response_format: { type: "json_object" },
  };
  if (reasoning) {
    body.reasoning_effort = "minimal";
  } else {
    body.temperature = 0.7;
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PER_CALL_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const errBody = await res.text();
      return { ok: false, status: res.status, body: errBody };
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) return { ok: false, status: 0, body: "no text in OpenAI response" };
    return { ok: true, text };
  } catch (e) {
    // AbortError → status 0 (treat as transient so we fall through to
    // gpt-5-mini). Any other network error → also status 0.
    const msg = String(e).slice(0, 200);
    const isAbort = (e as { name?: string })?.name === "AbortError";
    return { ok: false, status: 0, body: isAbort ? `openai timeout (${PER_CALL_TIMEOUT_MS}ms): ${msg}` : `openai network: ${msg}` };
  } finally {
    clearTimeout(timer);
  }
}

async function callGeminiOnce(model: string, prompt: string, apiKey: string): Promise<{ ok: true; text: string } | { ok: false; status: number; body: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PER_CALL_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8000,
          responseMimeType: "application/json",
        },
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const errBody = await res.text();
      return { ok: false, status: res.status, body: errBody };
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return { ok: false, status: 0, body: "no text in response" };
    return { ok: true, text };
  } catch (e) {
    const msg = String(e).slice(0, 200);
    const isAbort = (e as { name?: string })?.name === "AbortError";
    return { ok: false, status: 0, body: isAbort ? `gemini timeout (${PER_CALL_TIMEOUT_MS}ms): ${msg}` : `gemini network: ${msg}` };
  } finally {
    clearTimeout(timer);
  }
}

function fillMissingSections(parsed: ReadingShape): ReadingShape {
  const required: (keyof ReadingShape)[] = [
    "core_summary", "personality", "elements", "career", "wealth",
    "relationships", "family", "hidden_stems", "branch_relations",
    "health", "luck_pillar", "annual", "strategy", "closing_summary",
  ];
  for (const k of required) {
    if (typeof parsed[k] !== "string" || !parsed[k].trim()) {
      parsed[k] = "(This section was not generated. Try regenerating the reading.)";
    }
  }
  return parsed;
}

// Validate the AI returned a complete, non-empty reading. Returns true
// only if every required section is a real string (not a placeholder).
// Used after parsing to decide whether to accept the call or fall through
// to the next model/provider.
function isReadingComplete(parsed: ReadingShape): boolean {
  const required: (keyof ReadingShape)[] = [
    "core_summary", "personality", "elements", "career", "wealth",
    "relationships", "family", "hidden_stems", "branch_relations",
    "health", "luck_pillar", "annual", "strategy", "closing_summary",
  ];
  // We need at least 12 of 14 sections to consider the reading usable.
  // The 2-section slack lets a model that omits a niche section still
  // succeed; fillMissingSections will paper over the gap. But if 6+ are
  // missing/empty, treat the response as unusable.
  let nonEmpty = 0;
  for (const k of required) {
    if (typeof parsed[k] === "string" && parsed[k].trim().length > 20) {
      nonEmpty++;
    }
  }
  return nonEmpty >= 12;
}

async function callAI(prompt: string): Promise<ReadingShape> {
  // Provider chain: OpenAI primary (better narrative quality), Gemini
  // fallback. With per-call AbortController at 90s and 1 retry per model,
  // worst-case wall-clock is ~360s (4 attempts × 90s) — but that's only
  // hit when EVERY attempt times out. Typical fast-fail on 429/transient
  // settles in 100-180s. Supabase wall-clock cap is 150s, so the chain
  // is sized to land below that for realistic failure modes.
  const openaiKey = Deno.env.get("OPENAI_API_KEY") || "";
  const geminiKey = Deno.env.get("GEMINI_API_KEY") || "";
  let lastErr = "no providers configured";

  // ── OpenAI primary ── 1 retry per model (2 attempts each) instead of 3
  if (openaiKey) {
    for (const model of OPENAI_MODELS) {
      for (let attempt = 0; attempt < 2; attempt++) {
        const r = await callOpenAIOnce(model, prompt, openaiKey);
        if (r.ok) {
          try {
            const parsed = JSON.parse(r.text) as ReadingShape;
            if (!isReadingComplete(parsed)) {
              lastErr = `${model} returned incomplete reading (sections missing)`;
              break;
            }
            return fillMissingSections(parsed);
          } catch (e) {
            lastErr = `${model} returned invalid JSON: ${String(e).slice(0, 200)}`;
            break;
          }
        }
        lastErr = `openai ${model} ${r.status}: ${r.body.slice(0, 200)}`;
        // Retry only on transient: 429 rate limit, 500/502/503 server errors, 0 (network/abort)
        if (r.status !== 429 && r.status !== 500 && r.status !== 502 && r.status !== 503 && r.status !== 0) break;
        await sleep(1500);
      }
    }
  }

  // ── Gemini fallback ── 1 retry per model (2 attempts each) instead of 3
  if (geminiKey) {
    for (const model of GEMINI_MODELS) {
      for (let attempt = 0; attempt < 2; attempt++) {
        const r = await callGeminiOnce(model, prompt, geminiKey);
        if (r.ok) {
          try {
            const parsed = JSON.parse(r.text) as ReadingShape;
            if (!isReadingComplete(parsed)) {
              lastErr = `gemini ${model} returned incomplete reading`;
              break;
            }
            return fillMissingSections(parsed);
          } catch (e) {
            lastErr = `${model} returned invalid JSON: ${String(e).slice(0, 200)}`;
            break;
          }
        }
        lastErr = `gemini ${model} ${r.status}: ${r.body.slice(0, 200)}`;
        if (r.status !== 503 && r.status !== 429 && r.status !== 0) break;
        await sleep(1500);
      }
    }
  }

  throw new AppError("AI_FAILED", `All AI providers failed. Last: ${lastErr}`, 502);
}

Deno.serve(handler<BaziInput>({
  fn: "bazi-interpret",
  auth: "required",
  rateLimit: { max: 5, windowMs: 60_000 },
  run: async (ctx, body) => {
    if (!body) throw new AppError("MISSING_BODY", "Request body required", 400);
    if (!body.pillars || !body.dayMaster || !body.birthDate || !body.gender) {
      throw new AppError("MISSING_FIELDS", "pillars, dayMaster, birthDate, gender required", 400);
    }

    // Premium gate
    const { data: profile } = await ctx.supabase
      .from("profiles")
      .select("is_premium")
      .eq("id", ctx.userId!)
      .maybeSingle();
    if (!profile?.is_premium) {
      throw new AppError("PREMIUM_REQUIRED", "Bazi AI reading requires Premium subscription", 403);
    }

    const signature = inputSignature(body);
    const year = new Date().getFullYear();

    // Cache hit?
    if (!body.force) {
      const { data: cached } = await ctx.supabase
        .from("bazi_readings")
        .select("reading, input_signature")
        .eq("user_id", ctx.userId!)
        .eq("reading_year", year)
        .maybeSingle();
      if (cached && cached.input_signature === signature) {
        ctx.log.info("bazi_interpret.cache_hit", { userId: ctx.userId });
        return { ok: true, reading: cached.reading, cached: true };
      }
    }

    // Cache miss → call AI provider chain (OpenAI primary, Gemini fallback)
    if (!Deno.env.get("OPENAI_API_KEY") && !Deno.env.get("GEMINI_API_KEY")) {
      throw new AppError("AI_NOT_CONFIGURED", "No AI provider configured (OPENAI_API_KEY + GEMINI_API_KEY)", 503);
    }

    ctx.log.info("bazi_interpret.generating", { userId: ctx.userId, year });
    const userPrompt = buildUserPrompt(body);
    const reading = await callAI(userPrompt);

    // Upsert (one row per user per year)
    const { error: upsertErr } = await ctx.supabase
      .from("bazi_readings")
      .upsert(
        {
          user_id: ctx.userId!,
          birth_date: body.birthDate,
          birth_time: body.birthTime,
          gender: body.gender,
          reading_year: year,
          reading,
          input_signature: signature,
        },
        { onConflict: "user_id,reading_year" },
      );
    if (upsertErr) {
      ctx.log.warn("bazi_interpret.cache_write_failed", { err: upsertErr.message });
      // Don't fail the response — user still gets the reading
    }

    return { ok: true, reading, cached: false };
  },
}));
