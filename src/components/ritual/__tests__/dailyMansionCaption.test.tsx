import { describe, it, expect, vi, afterAll, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/*
 * p9 Q14: on Home at 360 px the mansion card's caption, truncated beside the
 * "TODAY'S MANSION" eyebrow, read "Dī · Sa…": the planet was cut. The row
 * wraps now, so the caption sits beside the eyebrow where it fits and under
 * it where it does not, and it is never truncated. (jsdom has no layout:
 * this pins the classes that make the layout, the browser did the rest.)
 */

vi.mock('../../../lib/supabase', () => ({ supabase: {} }));
vi.mock('../../../utils/telemetry', () => ({ captureException: () => {} }));
// The 氐 (Dī) mansion's day, whatever today is: the caption the QA run saw cut.
vi.mock('../../../data/lunarMansions', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../../data/lunarMansions')>();
  return { ...real, mansionForDate: () => real.MANSIONS.find((m) => m.cn === '氐') ?? null };
});

import i18n from '../../../i18n/config';
import { DailyMansionCard } from '../DailyMansionCard';

afterEach(() => cleanup());
afterAll(async () => {
  await i18n.changeLanguage('en');
});

describe('the mansion caption is never truncated (p9 Q14)', () => {
  for (const [lng, caption] of [
    ['en', 'Dī · Saturn'],
    ['ko', 'Dī · 토성'],
    ['ja', '氐土貉'],
  ] as const) {
    it(`${lng}: "${caption}" in full, on a row that wraps`, async () => {
      await i18n.changeLanguage(lng);
      render(<MemoryRouter><DailyMansionCard /></MemoryRouter>);
      const el = screen.getByText(caption);
      expect(el.className).not.toMatch(/\btruncate\b|\btext-ellipsis\b|\boverflow-hidden\b|\bline-clamp-/);
      expect(el.className).not.toMatch(/\bwhitespace-nowrap\b/);
      const row = el.parentElement!;
      expect(row.className).toMatch(/\bflex-wrap\b/);
      // The eyebrow keeps its own line whole.
      expect(row.firstElementChild!.className).toMatch(/\bwhitespace-nowrap\b/);
    });
  }
});
