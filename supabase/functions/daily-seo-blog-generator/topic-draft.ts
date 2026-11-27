/**
 * When the curated queue (public.seo_blog_topics) is empty, draft one topic
 * with the AI chain (Claude first) so the daily blog keeps publishing.
 *
 * Why: the queue ran dry twice (2026-04-26 and 2026-09-21) and each time the
 * 09:00 UTC cron answered 400 QUEUE_EMPTY every day, unnoticed, until someone
 * refilled it (two months of silence the second time). Curated rows still go
 * first; a drafted row is saved to the queue like any other (priority 100), so
 * it can be read, edited or deleted afterwards.
 */

import { callAIJson } from "../_shared/ai-providers.ts";

export const TOPIC_CATEGORIES = [
  "tarot-card", "tarot-spread", "cartomancy", "zodiac", "horoscope", "lunar", "numerology",
  "dream", "crystals", "mbti", "human-design", "bazi", "feng-shui", "general",
] as const;

export interface DraftedTopic {
  category: string;
  topic: string;
  brief: string;
  keyword: string;
  related_keywords: string[];
}

const SYSTEM = `You plan the editorial calendar for Arcana, a tarot, cartomancy, astrology, dream and self-knowledge app. Propose ONE new evergreen blog topic that people actually search for.

Rules:
- "keyword": a real search phrase of 2 to 6 words, lowercase. Never repeat or closely paraphrase one of the existing keywords you are given.
- "category": exactly one of: ${TOPIC_CATEGORIES.join(", ")}.
- "topic": the working title, under 100 characters.
- "brief": 2 or 3 sentences telling the writer what the article must cover. Concise, keyword-honest, evergreen; no hype.
- "related_keywords": 3 real search phrases close to the keyword, lowercase.

Content rules (the owner's decision D34; every one is binding):
- No topic on illness, diagnosis or treatment, pregnancy or fertility, mental-health conditions, trauma or nightmares as symptoms, self-harm or suicide, money or investment outcomes, gambling or legal questions. Dream topics stay symbolic.
- No competitor app or brand and no real living person.
- No claim that a reading predicts events with certainty; money cards and numbers are described as what the tradition holds, never as a money result.
- Prefer a topic the app has a page for: tarot cards and spreads, cartomancy, horoscopes and astrology, dreams, numerology, crystals, the journal.

Return JSON: {"category": "...", "topic": "...", "brief": "...", "keyword": "...", "related_keywords": ["...", "...", "..."]}`;

/**
 * D34 rule 4 and 5 as words a drafted topic may not contain (keyword, title or
 * brief; a related keyword that contains one is dropped). Deliberately broad:
 * a refused draft only means the cron answers QUEUE_EMPTY that day. Not
 * "cancer" (a zodiac sign).
 */
const BLOCKED = new RegExp(
  [
    "suicid", "self[- ]?harm", "kill(?:s|ing)?\\b", "illness", "disease", "diagnos", "symptom", "treatment", "therap",
    "medic(?:al|ine|ation)", "\\bcures?\\b", "pregnan", "fertil", "miscarr", "depress", "anxiety", "ptsd", "trauma",
    "bipolar", "adhd", "autis", "insomnia", "nightmare", "invest", "stock market", "crypto", "bitcoin", "forex",
    "lotter", "gambl", "casino", "betting", "lawsuit", "legal advice", "lawyer", "attorney",
    "co-?star", "the pattern app", "labyrinthos", "nebula app", "chani app", "kasamba", "psychic source",
  ].join("|"),
  "i",
);

/** True when a topic's words fall under D34 rules 4 and 5. */
export function breaksContentRules(text: string): boolean {
  return BLOCKED.test(text);
}

const clean = (s: unknown, min: number, max: number): string | null => {
  if (typeof s !== "string") return null;
  const t = s.replace(/\s+/g, " ").trim();
  return t.length >= min && t.length <= max ? t : null;
};

/** The model's JSON → a topic row, or null when anything is missing, malformed or already in the queue. */
export function validateDraftedTopic(raw: unknown, existingKeywords: string[]): DraftedTopic | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const category = clean(r.category, 2, 40)?.toLowerCase() ?? null;
  if (!category || !(TOPIC_CATEGORIES as readonly string[]).includes(category)) return null;

  const topic = clean(r.topic, 8, 140);
  const brief = clean(r.brief, 40, 700);
  const keyword = clean(r.keyword, 3, 80)?.toLowerCase() ?? null;
  if (!topic || !brief || !keyword) return null;
  if (/["\n<>]/.test(keyword)) return null;
  if (breaksContentRules(`${keyword} ${topic} ${brief}`)) return null;

  const taken = new Set(existingKeywords.map((k) => k.trim().toLowerCase()));
  if (taken.has(keyword)) return null;

  const related = Array.isArray(r.related_keywords)
    ? r.related_keywords
      .map((k) => clean(k, 3, 80)?.toLowerCase() ?? null)
      .filter((k): k is string => k !== null && k !== keyword && !breaksContentRules(k))
    : [];

  return { category, topic, brief, keyword, related_keywords: [...new Set(related)].slice(0, 5) };
}

/**
 * Ask the AI chain for one new topic, up to `attempts` times (a refused draft
 * would otherwise leave the blog silent that day); null if none is usable.
 */
export async function draftTopic(existingKeywords: string[], attempts = 3): Promise<DraftedTopic | null> {
  const list = existingKeywords.slice(-400).join(" | ");
  const refused: string[] = [];
  for (let i = 0; i < attempts; i++) {
    try {
      const raw = await callAIJson<unknown>({
        system: SYSTEM,
        userPrompt: `Existing keywords (do not repeat or paraphrase any of them):\n${list}\n\n` +
          (refused.length ? `Already refused for breaking the rules, do not propose again: ${refused.join(" | ")}\n\n` : "") +
          "Propose one new topic.",
        maxOutputTokens: 600,
      });
      const topic = validateDraftedTopic(raw, existingKeywords);
      if (topic) return topic;
      const k = (raw as { keyword?: unknown } | null)?.keyword;
      if (typeof k === "string" && k.trim()) refused.push(k.trim().toLowerCase().slice(0, 80));
    } catch {
      // every provider failed this round; try again
    }
  }
  return null;
}
