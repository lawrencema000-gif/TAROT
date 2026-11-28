// @vitest-environment node
/**
 * social-ai-27: asked "I just reloaded the page. Do you remember my favourite
 * flower…?", the Companion answered that it doesn't retain things between page
 * loads, although the thread holding the facts was sent with the question.
 * Every system prompt now carries CONVERSATION_RULES: the messages the model
 * receives are this person's conversation, kept across reloads; use them and
 * never claim to forget. The block sits after the memories it refers to and
 * before the locale line and the safety rules, which still end the prompt.
 */
import { describe, expect, it } from 'vitest';
import {
  PERSONAS,
  PERSONA_SYSTEM_PROMPTS,
  SAFETY_RULES,
  CONVERSATION_RULES,
  buildSystemPrompt,
  type CompanionUserContext,
} from '../../../supabase/functions/ai-companion-chat/reply';

const LOCALES = ['en', 'ja', 'ko', 'zh'] as const;
const MEMORY = 'Talked about moving to Osaka.';

const VARIANTS: { name: string; context: (locale: string) => CompanionUserContext; memories: string[] }[] = [
  { name: 'no context, no memories', context: (locale) => ({ locale }), memories: [] },
  {
    name: 'context and memories',
    context: (locale) => ({ locale, zodiacSign: 'Scorpio', mbtiType: 'INFJ', displayName: 'Mika' }),
    memories: [MEMORY],
  },
];

describe('companion system prompt: CONVERSATION_RULES (social-ai-27)', () => {
  for (const persona of PERSONAS) {
    for (const locale of LOCALES) {
      for (const variant of VARIANTS) {
        it(`${persona} · ${locale} · ${variant.name}`, () => {
          const prompt = buildSystemPrompt(persona, variant.context(locale), variant.memories);

          expect(prompt.split(CONVERSATION_RULES).length).toBe(2);

          const personaAt = prompt.indexOf(PERSONA_SYSTEM_PROMPTS[persona]);
          const rulesAt = prompt.indexOf(CONVERSATION_RULES);
          const safetyAt = prompt.indexOf(SAFETY_RULES);
          expect(personaAt).toBe(0);
          expect(personaAt).toBeLessThan(rulesAt);
          expect(rulesAt).toBeLessThan(safetyAt);

          if (variant.memories.length) {
            const memoryAt = prompt.indexOf(MEMORY);
            expect(memoryAt).toBeGreaterThan(-1);
            expect(memoryAt).toBeLessThan(rulesAt);
          }

          expect(prompt.endsWith(SAFETY_RULES)).toBe(true);
        });
      }
    }
  }

  it('tells the model the thread is kept across reloads and never to claim it forgets', () => {
    expect(CONVERSATION_RULES).toMatch(/reload the page/);
    expect(CONVERSATION_RULES).toMatch(/Never say that you forget things between page loads/);
    expect(CONVERSATION_RULES).toMatch(/invite them to tell you again/);
  });

  it('names no helpline, number or URL', () => {
    expect(CONVERSATION_RULES).not.toMatch(/\d{3}|https?:|lifeline|crisis/i);
  });

  it('leaves the AI-honesty line of SAFETY_RULES in place', () => {
    expect(SAFETY_RULES).toContain('When asked, be honest: you are an AI voice styled as a persona.');
  });
});
