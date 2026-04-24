/**
 * community-moderate — server-side moderation pipeline for community posts
 * and comments.
 *
 * Runs two checks in parallel:
 *   1. OpenAI Moderation API (omni-moderation-latest) — catches harassment,
 *      hate, sexual content, self-harm ideation, violence. Free. Authoritative
 *      for hard blocks (sexual/minors, hate/threatening, harassment/threatening,
 *      violence/graphic).
 *   2. Crisis keyword detection — a targeted self-harm / suicide regex pass.
 *      This runs BEFORE the verdict, because a crisis post should never be
 *      blocked (we surface Crisis Text Line + 988 resources instead). The post
 *      is soft-flagged for moderator review rather than hard-rejected.
 *
 * Returns:
 *   verdict: "allow" | "review" | "block"
 *     - allow  → post can be written as usual
 *     - review → post is written with moderation_status='flagged', hidden
 *                from non-admin feeds, admin dashboard gets it
 *     - block  → post is refused, client shows a content-guidelines message
 *   crisis:  boolean — surface the Crisis Text Line banner on the client
 *   categories: string[] — which OpenAI categories tripped (empty if none)
 *
 * Also logs every non-allow verdict into public.moderation_events for audit.
 * Crisis detections also insert into public.crisis_flags so we can alert on
 * spikes (future: Supabase pg_cron → Slack webhook).
 *
 * Why edge function not client-side: (a) API key must stay server-side,
 * (b) the verdict table drifts — we want one canonical moderation policy,
 * (c) audit trail needs service-role write.
 */

import { handler, AppError } from "../_shared/handler.ts";
import { z } from "npm:zod@3.24.1";

const RequestSchema = z.object({
  content: z.string().min(1).max(5000),
  surface: z.enum(["post", "comment", "whispering-well"]),
});

type Request = z.infer<typeof RequestSchema>;

interface ModerationResponse {
  verdict: "allow" | "review" | "block";
  crisis: boolean;
  categories: string[];
  crisisResources?: {
    us: { name: string; number: string };
    textLine: { name: string; instructions: string };
    international: string;
  };
}

// ---------------------------------------------------------------
// Crisis keywords — curated to catch self-harm ideation with low
// false-positive rate. Tuned for short community posts.
// ---------------------------------------------------------------
const CRISIS_PATTERNS: RegExp[] = [
  /\b(i\s+(want|am\s+going|plan|need|have\s+to)\s+(to\s+)?(kill|end|hurt|harm)\s+(myself|me))\b/i,
  /\b(suicid(e|al))\b/i,
  /\b(end\s+(my|it\s+all|everything))\b/i,
  /\b(no\s+(reason|point)\s+(to\s+)?(live|living|be\s+here))\b/i,
  /\b(better\s+off\s+(dead|without\s+me|gone))\b/i,
  /\b(can't\s+(do\s+this|go\s+on|keep\s+going)\s+anymore)\b/i,
  /\b(want\s+to\s+die)\b/i,
  /\b(ending\s+my\s+life)\b/i,
  /\b(take\s+my\s+(own\s+)?life)\b/i,
  /\b(not\s+worth\s+living)\b/i,
  /\b(self[- ]?harm)\b/i,
  /\b(cutting\s+myself)\b/i,
];

function detectCrisis(text: string): boolean {
  for (const re of CRISIS_PATTERNS) if (re.test(text)) return true;
  return false;
}

// OpenAI categories that ALWAYS block regardless of score — zero-tolerance.
const HARD_BLOCK_CATEGORIES = new Set([
  "sexual/minors",
  "hate/threatening",
  "harassment/threatening",
  "violence/graphic",
  "self-harm/instructions",
]);

// Categories that trigger "review" (allow with flag, not block).
const REVIEW_CATEGORIES = new Set([
  "sexual",
  "hate",
  "harassment",
  "violence",
  "self-harm",
  "self-harm/intent",
]);

interface OpenAIModerationResult {
  flagged: boolean;
  categories: Record<string, boolean>;
  category_scores: Record<string, number>;
}

async function runOpenAIModeration(text: string): Promise<OpenAIModerationResult | null> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return null; // soft-fail: if no key, fall back to crisis-only screening

  try {
    const res = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "omni-moderation-latest",
        input: text,
      }),
    });
    if (!res.ok) return null;
    const json = await res.json() as { results?: OpenAIModerationResult[] };
    return json.results?.[0] ?? null;
  } catch {
    return null;
  }
}

function classifyFromOpenAI(result: OpenAIModerationResult | null): {
  verdict: "allow" | "review" | "block";
  categories: string[];
} {
  if (!result) return { verdict: "allow", categories: [] };
  const flagged = Object.entries(result.categories)
    .filter(([, v]) => v === true)
    .map(([k]) => k);
  if (flagged.length === 0) return { verdict: "allow", categories: [] };
  for (const cat of flagged) {
    if (HARD_BLOCK_CATEGORIES.has(cat)) {
      return { verdict: "block", categories: flagged };
    }
  }
  for (const cat of flagged) {
    if (REVIEW_CATEGORIES.has(cat)) {
      return { verdict: "review", categories: flagged };
    }
  }
  return { verdict: "allow", categories: flagged };
}

const CRISIS_RESOURCES = {
  us: { name: "988 Suicide & Crisis Lifeline", number: "988" },
  textLine: {
    name: "Crisis Text Line",
    instructions: "Text HOME to 741741 (US/UK/CA/IE)",
  },
  international: "https://findahelpline.com",
};

export default handler<Request, ModerationResponse>({
  fn: "community-moderate",
  auth: "required",
  methods: ["POST"],
  rateLimit: { max: 60, windowMs: 60_000 },
  requestSchema: RequestSchema,
  run: async (ctx, body) => {
    const { content, surface } = body;

    // Detect crisis first — this result is independent of OpenAI and
    // determines whether we surface resources regardless of other signals.
    const crisis = detectCrisis(content);

    // Run OpenAI Moderation (soft-fail on network error).
    const openAIResult = await runOpenAIModeration(content);
    const { verdict: openAIVerdict, categories } = classifyFromOpenAI(openAIResult);

    // Final verdict:
    //   - Crisis post never blocks — we route to resources instead.
    //     If OpenAI said "block" for another reason, respect it (crisis
    //     overlaid with explicit violence, e.g.), but default crisis→review.
    //   - Otherwise, OpenAI verdict wins.
    let verdict: "allow" | "review" | "block" = openAIVerdict;
    if (crisis && verdict !== "block") verdict = "review";

    // Audit trail — write every non-allow verdict.
    if (verdict !== "allow" || crisis) {
      const { error: auditErr } = await ctx.supabase.from("moderation_events").insert({
        user_id: ctx.userId,
        surface,
        content_hash: await hash(content),
        verdict,
        categories,
        crisis_flagged: crisis,
      });
      if (auditErr) {
        ctx.log.warn("moderation.audit_insert_failed", { err: auditErr.message });
      }
    }

    // Crisis log — separate table for alert pipelines.
    if (crisis) {
      const { error: crisisErr } = await ctx.supabase.from("crisis_flags").insert({
        user_id: ctx.userId,
        surface,
        content_excerpt: content.slice(0, 300),
      });
      if (crisisErr) {
        ctx.log.warn("crisis_flag.insert_failed", { err: crisisErr.message });
      }
    }

    if (verdict === "block") {
      throw new AppError(
        "CONTENT_BLOCKED",
        "This content goes against our community guidelines.",
        422,
        { categories },
      );
    }

    return {
      verdict,
      crisis,
      categories,
      ...(crisis ? { crisisResources: CRISIS_RESOURCES } : {}),
    };
  },
});

async function hash(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
