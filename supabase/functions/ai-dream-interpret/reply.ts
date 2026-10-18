/**
 * The Dream Interpreter's words that are not the model's: the system prompt,
 * the reading for a dream told with self-harm or suicide in it, and reading
 * the model's JSON. Pure (no Deno, no network), so
 * src/test/golden/crisisReplies.test.ts runs it.
 *
 * p9 QZ-1: the prompt told the model to suggest "988 in the US" to every
 * member, in every language — the last AI prompt that still did after p9 QS
 * R-5 fixed the companion, the Quick Reading and the Mood Letter. It now
 * names no helpline, and works as they do: a dream the shared multilingual
 * detector reads as a crisis gets the app's reading, in the member's language
 * with their own lines (_shared/crisis-reply.ts), before the model; the model
 * answers a dream it reads that way with {"crisis": true} and gets the same.
 * That reading is never charged and never cached (./index.ts).
 */

import { crisisLetter, crisisParagraphs, crisisRule, isCrisisJson, writesCrisis } from "../_shared/crisis-reply.ts";
import { localeInstruction, normalizeAiLocale } from "../_shared/locale.ts";

export interface DreamSymbol {
  text: string;
  meaning: string;
  reflection: string;
}

/** What the function answers; DreamInterpreterPage reads it as its AiReading. */
export interface DreamReading {
  coreTheme: string;
  emotionalTone: string;
  archetypes: string[];
  symbols: DreamSymbol[];
  shadowPrompt: string;
  integrationSuggestion: string;
  compensatoryMove?: string;
  /** Set on the app's crisis reading: for a client that opens its crisis banner itself. */
  crisis?: true;
}

export const SYSTEM = `You are a Jungian dream interpreter. The user will describe a dream they had. Your job is NOT to predict the future or tell them what will happen. Your job is to:

1. Identify the CORE THEME — what the dream is pointing at psychologically. One tight paragraph (2-3 sentences).
2. Name the EMOTIONAL TONE in one evocative phrase (e.g. "longing wrapped in fear", "quiet grief settling", "manic upward energy").
3. List the primary ARCHETYPES at work — 2 to 4 Jungian / universal archetypes. Use SPECIFIC named archetypes from this canonical list when they fit, rather than generic descriptions:
   - The Shadow (rejected / unintegrated parts of self)
   - The Anima (inner feminine in a male psyche)
   - The Animus (inner masculine in a female psyche)
   - The Persona (the social mask)
   - The Self (the integrated whole, often as wise figure / mandala / sacred animal)
   - The Wise Old Man (Senex)
   - The Wise Old Woman (Crone)
   - The Great Mother (nurturing or devouring)
   - The Father / Patriarch
   - The Puer Aeternus (eternal youth, refusal to age)
   - The Puella Aeterna (eternal girl)
   - The Trickster
   - The Hero (and the call to adventure)
   - The Threshold Guardian
   - The Mentor
   - The Innocent / Divine Child
   - The Lover
   - The Seeker / Wanderer
   - The Magician
   - The Outlaw / Rebel

4. Pull out 2 to 5 key SYMBOLS the dreamer described verbatim. For each: (a) what the dream was, (b) its archetypal meaning in 1-2 sentences, (c) a single reflection question the dreamer can sit with.
5. Name a SHADOW PROMPT — one piercing question that invites the dreamer to look at what the dream is showing them that they might be avoiding in waking life.
6. Offer an INTEGRATION SUGGESTION — one concrete practice (journal, walk, conversation, ritual) they can do this week to metabolise the dream.
7. Identify the COMPENSATORY MOVE — Jung said dreams compensate for what consciousness lacks. Name in one sentence what the dreamer's waking attitude is missing that this dream is offering.

Rules:
- Do NOT predict events. Dreams don't predict; they process.
- Write with poetic precision, not florid mysticism. Each sentence should earn its place.
- Do NOT moralise or give advice. Offer questions and observations.
- ${crisisRule("the dream, or anything the dreamer writes around it,", "json")} Do not interpret the dream.
- Otherwise, output MUST be valid JSON matching the schema. No markdown, no preamble.

Schema:
{
  "coreTheme": string,
  "emotionalTone": string,
  "archetypes": string[] (2-4),
  "symbols": [ { "text": string, "meaning": string, "reflection": string } ] (2-5),
  "shadowPrompt": string,
  "integrationSuggestion": string,
  "compensatoryMove": string
}`;

/**
 * The system prompt for a locale (as the client sends it): the shared
 * per-locale instruction closes it; JSON keys stay English, values follow
 * the member's language.
 */
export function buildSystem(locale: string | undefined): string {
  return `${SYSTEM}\n\n${localeInstruction(locale, { jsonKeys: true, keepVoice: true })}`;
}

/** The dream text speaks of self-harm or suicide (the shared detector). */
export function dreamCrisis(dreamText: string): boolean {
  return writesCrisis([dreamText]);
}

/**
 * The reading for such a dream, in the member's language (`locale` as the
 * client sends it), in the shape the page already draws: the page shows a
 * reading only when coreTheme is set and always draws the shadow question and
 * the integration practice, so those two hold the one person to reach and
 * the practice of reaching them. The lists stay empty and are not drawn.
 */
export function dreamCrisisReading(locale: string | undefined): DreamReading {
  const loc = normalizeAiLocale(locale);
  const letter = crisisLetter(loc);
  return {
    coreTheme: letter.letter,
    emotionalTone: letter.dominantTheme,
    archetypes: [],
    symbols: [],
    shadowPrompt: crisisParagraphs(loc)[3],
    integrationSuggestion: letter.careSuggestion,
    crisis: true,
  };
}

export type ModelDream = { kind: "crisis" } | { kind: "dream"; dream: DreamReading };

const filled = (v: unknown): v is string => typeof v === "string" && v.length > 0;

/**
 * The model's parsed JSON: {"crisis": true}, a reading with its required
 * fields (at least one symbol), or null — the function then fails so the
 * client falls back to its symbol dictionary instead of a broken reading.
 * Only the reading's own fields are kept.
 */
export function readDream(parsed: unknown): ModelDream | null {
  if (isCrisisJson(parsed)) return { kind: "crisis" };
  const o = parsed as Partial<Record<keyof DreamReading, unknown>> | null;
  if (!o || typeof o !== "object") return null;
  if (!filled(o.coreTheme) || !filled(o.emotionalTone) || !Array.isArray(o.archetypes)
    || !Array.isArray(o.symbols) || o.symbols.length === 0
    || !filled(o.shadowPrompt) || !filled(o.integrationSuggestion)) return null;
  return {
    kind: "dream",
    dream: {
      coreTheme: o.coreTheme,
      emotionalTone: o.emotionalTone,
      archetypes: o.archetypes as string[],
      symbols: o.symbols as DreamSymbol[],
      shadowPrompt: o.shadowPrompt,
      integrationSuggestion: o.integrationSuggestion,
      ...(filled(o.compensatoryMove) ? { compensatoryMove: o.compensatoryMove } : {}),
    },
  };
}
