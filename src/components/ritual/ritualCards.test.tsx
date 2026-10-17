import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/*
 * The ritual's cards in the reader's language (p8):
 *  - F87: the prompt's quotation marks are the language's own (「」 in ja);
 *  - F16-tile: the day's mansion tile writes its character as the title
 *    beside it does — 参 in zh and ja, the traditional 參 (marked) in en/ko.
 */

vi.mock('../../lib/supabase', () => ({ supabase: {} }));
vi.mock('../../utils/telemetry', () => ({ captureException: () => {} }));
// The 參 (Shēn) mansion's day, whatever today is.
vi.mock('../../data/lunarMansions', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../data/lunarMansions')>();
  return { ...real, mansionForDate: () => real.MANSIONS.find((m) => m.cn === '參') ?? null };
});

import i18n from '../../i18n/config';
import { PromptCard } from './PromptCard';
import { DailyMansionCard } from './DailyMansionCard';
import '@testing-library/jest-dom/vitest';

afterEach(() => cleanup());
afterAll(async () => {
  await i18n.changeLanguage('en');
});

describe('the prompt card quotes the question in the reader’s language (F87)', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('ja');
  });

  it('ja: 「」, never Latin curly quotes', async () => {
    await i18n.changeLanguage('ja');
    render(<PromptCard prompt="延期してきた夢は何ですか？" onWrite={() => {}} />);
    expect(screen.getByText('「延期してきた夢は何ですか？」')).toBeInTheDocument();
  });

  it('en: curly quotes', async () => {
    await i18n.changeLanguage('en');
    render(<PromptCard prompt="What dream have you been postponing?" onWrite={() => {}} />);
    expect(screen.getByText('“What dream have you been postponing?”')).toBeInTheDocument();
  });
});

describe('the mansion tile writes its character as the reader’s script does (F16-tile)', () => {
  const tile = () => document.querySelector('[role="link"] span[aria-hidden]');

  for (const [lng, glyph, lang] of [
    ['zh', '参', null],
    ['ja', '参', null],
    ['en', '參', 'zh-Hant'],
    ['ko', '參', 'zh-Hant'],
  ] as const) {
    it(`${lng}: ${glyph}`, async () => {
      await i18n.changeLanguage(lng);
      render(<MemoryRouter><DailyMansionCard /></MemoryRouter>);
      expect(tile()).toHaveTextContent(glyph);
      expect(tile()?.getAttribute('lang')).toBe(lang);
    });
  }
});
