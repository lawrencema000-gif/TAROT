/**
 * The Mood Letter's words that are not the model's: the system prompt, the
 * letter for a log whose notes speak of self-harm or suicide, and reading
 * the model's JSON. Pure (no Deno, no network), so
 * src/test/golden/crisisReplies.test.ts runs it.
 *
 * p9 QS R-5: the prompt told the model to "direct to 988 / a trusted
 * person", whatever the member's language. It now names no helpline: notes
 * the shared detector reads as a crisis get the app's letter, in the
 * member's language with their own lines (_shared/crisis-reply.ts), before
 * the model; the model answers notes it reads that way with
 * {"crisis": true}, and gets the same letter.
 */

import { crisisLetter, crisisRule, isCrisisJson, writesCrisis, type CrisisLetter } from "../_shared/crisis-reply.ts";
import { normalizeAiLocale } from "../_shared/locale.ts";

export interface MoodLetter {
  letter: string;              // full letter (~3 short paragraphs)
  dominantTheme: string;       // 1-phrase theme label
  careSuggestion: string;      // 1 concrete self-care practice
  /** Set on the app's crisis letter. */
  crisis?: true;
}

export const SYSTEM = `You are a warm, grounded emotional companion — like a wise older sibling or a seasoned therapist friend. The user has logged their mood daily for the past week or two. Their log is below.

Write a short letter to them, in second person ("you"). Structure:

PARAGRAPH 1 — "This week I notice…": name the pattern you see honestly. Be specific to THEIR entries (reference specific days if useful, specific category shifts, specific notes they wrote). Don't over-dramatize — if it's been a steady week, say so.

PARAGRAPH 2 — "Underneath the pattern…": gently surface what might be moving beneath the surface. Tie it to what they wrote. Never diagnose. Never say "you are X". Say what you see and offer it back.

PARAGRAPH 3 — "As you move into the next week…": one concrete, tiny, do-able practice. Not a lifestyle overhaul. Something they could actually do this week. Then close with a single sentence of genuine care.

Rules:
- 2-4 sentences per paragraph. Total letter ≤ 500 words.
- ${crisisRule("their notes", "json")} Do not write a letter.
- Never moralize. Never use "should".
- Don't be mystical or woo; this is emotional companionship, not divination.
- Output MUST be valid JSON: { "letter": string, "dominantTheme": string (1 short phrase), "careSuggestion": string (1 sentence) }`;

/** The log's notes speak of self-harm or suicide (the shared detector, note by note). */
export function moodCrisis(entries: ReadonlyArray<{ note?: string }>): boolean {
  return writesCrisis(entries.map((e) => e.note));
}

/** The letter for such a log, in the member's language (`locale` as the client sends it). */
export function moodCrisisLetter(locale: string | undefined): CrisisLetter {
  return crisisLetter(normalizeAiLocale(locale));
}

export type ModelLetter = { kind: "crisis" } | { kind: "letter"; letter: MoodLetter };

/** The model's parsed JSON: {"crisis": true}, a letter with its three fields, or null. */
export function readLetter(parsed: unknown): ModelLetter | null {
  if (isCrisisJson(parsed)) return { kind: "crisis" };
  const o = parsed as Partial<MoodLetter> | null;
  if (!o || typeof o.letter !== "string" || !o.letter || typeof o.dominantTheme !== "string" || !o.dominantTheme
    || typeof o.careSuggestion !== "string" || !o.careSuggestion) return null;
  return { kind: "letter", letter: { letter: o.letter, dominantTheme: o.dominantTheme, careSuggestion: o.careSuggestion } };
}
