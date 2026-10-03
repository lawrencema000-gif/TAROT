// @vitest-environment node
/**
 * generate-reading's card lines and template reading
 * (supabase/functions/generate-reading/reading-text.ts):
 *  - p7 #13: a reversed card is read from its reversed meaning, whatever the
 *    focus — the upright focus/advice lines ride along as context only;
 *  - p7 #34: the template served when every AI provider fails says, in the
 *    reader's language, that it is not an AI reading and was not charged.
 */
import { describe, expect, it } from 'vitest';
import {
  cardPromptLines,
  fallbackReadingText,
  FALLBACK_STRINGS,
  type ReadingTextCard,
} from '../../../supabase/functions/generate-reading/reading-text';
import { PLAYING_CARDS_EN as playingCards } from '../../data/cartomancy/cards.en';

const nineOfHearts: ReadingTextCard = {
  id: 108,
  name: 'Nine of Hearts',
  reversed: true,
  meaningUpright: 'The wish card. What you hope for is within reach.',
  meaningReversed: 'A wish that has been postponed, not refused.',
  loveMeaning: 'A wished-for love answers.',
  adviceMeaning: 'Name the wish precisely. Vague wishes come true vaguely.',
};

const canonical = (lines: string[]) => lines.find((l) => l.startsWith('Canonical meaning excerpt:')) ?? '';

describe('cardPromptLines (p7 #13)', () => {
  for (const focus of ['general', 'love', 'career', undefined] as const) {
    it(`reversed card, focus ${focus ?? 'none'}: canonical is the reversed meaning`, () => {
      const lines = cardPromptLines(nineOfHearts, focus, 320);
      expect(canonical(lines)).toContain('postponed');
      expect(canonical(lines)).not.toContain('Name the wish');
    });
  }

  it('the upright advice line rides along, marked as upright', () => {
    const lines = cardPromptLines(nineOfHearts, 'general', 320);
    const advice = lines.find((l) => l.startsWith('Advice line'));
    expect(advice).toContain('Name the wish precisely');
    expect(advice).toContain('upright');
  });

  it('upright card, love focus: canonical is the love meaning', () => {
    const lines = cardPromptLines({ ...nineOfHearts, reversed: false }, 'love', 320);
    expect(canonical(lines)).toContain('wished-for love');
  });

  it('upright card, general focus: canonical is the upright meaning, advice is extra', () => {
    const lines = cardPromptLines({ ...nineOfHearts, reversed: false }, 'general', 320);
    expect(canonical(lines)).toContain('within reach');
    expect(lines.some((l) => l.startsWith('Advice line: Name the wish'))).toBe(true);
  });

  it('every reversed playing card reaches the prompt with its own reversed meaning', () => {
    for (const card of playingCards) {
      if (!card.meaningReversed) continue;
      const lines = cardPromptLines(
        {
          id: card.id,
          name: card.name,
          reversed: true,
          meaningUpright: card.meaningUpright,
          meaningReversed: card.meaningReversed,
          loveMeaning: card.loveMeaning,
          careerMeaning: card.careerMeaning,
          adviceMeaning: card.adviceMeaning,
        },
        'general',
        320,
      );
      const head = card.meaningReversed.replace(/\s+/g, ' ').trim().slice(0, 40);
      expect(canonical(lines), card.name).toContain(head);
    }
  });
});

describe('fallbackReadingText (p7 #34)', () => {
  const cards: ReadingTextCard[] = [nineOfHearts, { id: 0, name: 'The Fool', reversed: false, meaningUpright: 'A leap.' }];

  it('opens with a non-AI notice in each locale and says nothing was charged', () => {
    for (const locale of ['en', 'ja', 'ko', 'zh'] as const) {
      const text = fallbackReadingText({ cards, positions: ['A', 'B'], locale, notCharged: true });
      const s = FALLBACK_STRINGS[locale];
      expect(text.startsWith(`${s.notice} ${s.notCharged}`), locale).toBe(true);
      expect(text).toContain(`(${s.reversed})`);
      expect(text).toContain('postponed');
    }
  });

  it('drops the not-charged clause when the refund did not land', () => {
    const text = fallbackReadingText({ cards, positions: ['A', 'B'], locale: 'en', notCharged: false });
    expect(text).toContain(FALLBACK_STRINGS.en.notice);
    expect(text).not.toContain(FALLBACK_STRINGS.en.notCharged);
  });

  it('falls back to English for an unknown locale, and ja-JP is Japanese', () => {
    expect(fallbackReadingText({ cards, positions: [], locale: 'fr', notCharged: true })).toContain(FALLBACK_STRINGS.en.notice);
    expect(fallbackReadingText({ cards, positions: [], locale: 'ja-JP', notCharged: true })).toContain(FALLBACK_STRINGS.ja.notice);
  });

  it('copy has no exclamation marks', () => {
    for (const s of Object.values(FALLBACK_STRINGS)) {
      for (const v of Object.values(s)) expect(v).not.toMatch(/[!！]/);
    }
  });
});
