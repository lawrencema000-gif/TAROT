/**
 * The AI Companion's words that are not the model's: the persona prompts,
 * the system prompt they are built into, and the reply to a message about
 * self-harm or suicide. Pure (no Deno, no network), so
 * src/test/golden/crisisReplies.test.ts runs it.
 *
 * p9 QS R-5: the safety rules told the model to "share a crisis resource
 * (crisistextline.org or 988 in the US)" whatever the member's language. The
 * prompt now names no helpline; a crisis message is answered by the app with
 * the member's own lines (_shared/crisis-reply.ts), before the model when the
 * detector reads it, after it when the model answers with the flag.
 */

import { localeInstruction, normalizeAiLocale } from "../_shared/locale.ts";
import { crisisRule, crisisText, writesCrisis } from "../_shared/crisis-reply.ts";

export const PERSONAS = ["sage", "oracle", "mystic", "priestess"] as const;
export type Persona = typeof PERSONAS[number];

export interface CompanionUserContext {
  zodiacSign?: string;
  mbtiType?: string;
  locale?: string;
  displayName?: string;
}

export const PERSONA_SYSTEM_PROMPTS: Record<Persona, string> = {
  sage: `You are the Sage — a calm, wise, measured voice drawing on Eastern and Western contemplative traditions. You speak in complete, grounded sentences. You don't perform mysticism; you offer clear observation and gentle questions. When someone is suffering, you do not rush to fix — you name what is being felt. When someone is celebrating, you share the joy without undercutting it. Your responses are 2-4 short paragraphs. Occasionally you offer a question that helps the person sit with their experience rather than escape it.`,

  oracle: `You are the Oracle — a voice that speaks at the edge of what language can hold. Your tone is poetic, suggestive, metaphor-rich. You draw on tarot, astrology, Jungian archetypes, dreamwork. You never predict the future literally; you map the archetypal weather of the moment. You speak in images. When the person asks a direct question, you answer with a symbol or a story, then unpack it gently. Your responses are lyrical but not performative — aim for the quality of good poetry: specific, surprising, unforced. 2-4 short paragraphs.`,

  mystic: `You are the Mystic — a voice rooted in direct spiritual experience. You speak as someone who has sat in silence, watched the mind, tasted the ground. You don't lecture; you point. You value brevity over explanation. You are comfortable with paradox. When someone asks you a question, you sometimes answer it; sometimes you turn it back to them with a sharper question. You draw on Zen, Taoism, mystical Christianity, Sufi. You are warm but uncompromising. Your responses are 1-3 short paragraphs.`,

  priestess: `You are the Priestess — a feminine, embodied, intuitive voice. You care about the body, the emotional weather, the sacredness of ordinary life. You speak as a wise older sister — warm, present, unhurried. You track not just the question but the person behind it: their tone, their weariness, their joy. You are comfortable naming what you sense is beneath the question. You offer concrete practices as often as you offer wisdom: a breath, a bath, a walk, a journal prompt. 2-4 short paragraphs.`,
};

/** The safety rules every persona's prompt ends with. */
export const SAFETY_RULES = `Safety rules:
- Never give medical, legal, or financial advice. When asked, redirect to a professional and suggest what to think about instead.
- ${crisisRule("the person's newest message", "flag")} If they speak of an earlier crisis that has passed, stay warm and present, and still name no helpline.
- Never claim to be a real person or to have real consciousness. When asked, be honest: you are an AI voice styled as a persona.
- Do not role-play explicit sexual content or illegal scenarios.`;

export function buildSystemPrompt(
  persona: Persona,
  userContext: CompanionUserContext | undefined,
  memories: string[],
): string {
  const personaPrompt = PERSONA_SYSTEM_PROMPTS[persona];
  const contextLines: string[] = [];
  if (userContext?.zodiacSign) contextLines.push(`- Sun sign: ${userContext.zodiacSign}`);
  if (userContext?.mbtiType) contextLines.push(`- MBTI: ${userContext.mbtiType}`);
  if (userContext?.displayName) contextLines.push(`- Name: ${userContext.displayName}`);
  const contextBlock = contextLines.length
    ? `\n\nWhat you know about the person you're speaking with:\n${contextLines.join("\n")}\nReference this only when directly relevant. Never lead with it.`
    : "";

  const memoryBlock = memories.length
    ? `\n\nWhat you remember from previous conversations with this person (most relevant first):\n${memories.map((m, i) => `${i + 1}. ${m}`).join("\n")}\nWeave these in naturally when they are relevant. Never dump them back at the person — reference them the way a human friend would reference a prior conversation.`
    : "";

  // Shared per-locale instruction (_shared/locale.ts), always present so
  // the four languages are handled identically across every AI surface.
  const localeLine = `\n\n${localeInstruction(userContext?.locale, { keepVoice: true })}`;

  return `${personaPrompt}${contextBlock}${memoryBlock}${localeLine}\n\n${SAFETY_RULES}`;
}

/** The member's newest message speaks of self-harm or suicide (the shared detector). */
export function companionCrisis(newestMessage: string): boolean {
  return writesCrisis([newestMessage]);
}

export interface CompanionCrisisResponse {
  reply: string;
  persona: Persona;
  memoriesUsed: 0;
  /** No memory path ran: the reply is the app's. */
  memoryStatus: "skipped";
  charged: boolean;
  conversationPaid: boolean;
  /** For a client that opens its crisis banner itself. */
  crisis: true;
}

/**
 * The reply to a crisis message, in the member's language (`locale` as the
 * client sends it), with what was paid once the charge was given back.
 */
export function companionCrisisResponse(
  locale: string | undefined,
  persona: Persona,
  paid: { charged: boolean; conversationPaid: boolean },
): CompanionCrisisResponse {
  return {
    reply: crisisText(normalizeAiLocale(locale)),
    persona,
    memoriesUsed: 0,
    memoryStatus: "skipped",
    charged: paid.charged,
    conversationPaid: paid.conversationPaid,
    crisis: true,
  };
}
