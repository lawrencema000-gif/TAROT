import { describe, it, expect, afterAll } from 'vitest';
import i18n from '../i18n/config';
import { dailyPrompts, getDailyPrompt, localizedDailyPrompts } from './dailyPrompts';

/**
 * The daily prompt is the copy Home's ritual card and the Journal editor
 * render (src/data/dailyPrompts.ts; the horoscopes.json prompts are not
 * read). Its ja and zh lists ended in ASCII "?" and one zh line used an
 * ASCII comma: 「延期してきた夢は何ですか?」 beside full-width text (p8 F87).
 * Japanese and Chinese take the full-width ？ and ，; Korean and English
 * keep the ASCII marks.
 */
async function promptsIn(lng: string): Promise<string[]> {
  await i18n.changeLanguage(lng);
  return localizedDailyPrompts();
}

describe('daily prompt punctuation', () => {
  afterAll(async () => {
    await i18n.changeLanguage('en');
  });

  it.each(['ja', 'zh'])('%s: twelve prompts, full-width marks only, each ends in ？ or 。', async (lng) => {
    const prompts = await promptsIn(lng);
    expect(prompts).toHaveLength(12);
    expect(prompts).not.toBe(dailyPrompts);
    for (const p of prompts) {
      expect(p, p).not.toMatch(/[?,!:;]/);
      expect(p, p).toMatch(/[？。]$/);
    }
    expect(prompts.filter((p) => p.endsWith('？'))).toHaveLength(11);
  });

  it('zh: the one comma inside a prompt is full-width', async () => {
    const prompts = await promptsIn('zh');
    expect(prompts).toContain('如果你可以告诉过去的自己一件事，那会是什么？');
  });

  it('ko and en keep their ASCII question marks', async () => {
    const ko = await promptsIn('ko');
    expect(ko.filter((p) => p.endsWith('?'))).toHaveLength(11);
    expect(ko.join('')).not.toMatch(/[？，]/);
    expect(dailyPrompts.filter((p) => p.endsWith('?'))).toHaveLength(11);
  });

  it('the prompt Home and the Journal show for a date comes from that list', async () => {
    const ja = await promptsIn('ja');
    const prompt = getDailyPrompt('2026-10-17');
    expect(ja).toContain(prompt);
    expect(prompt).not.toMatch(/\?/);
  });
});
