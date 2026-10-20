import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { render, screen, act, waitFor, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/*
 * The Library after the p10 live QA:
 *  - d2-ja-03: an AI reading's row printed its focus as stored ("career",
 *    capitalized to "Career") in the Japanese Library, where the same
 *    reading's saved row said キャリア;
 *  - d2-ja-04: the row's pills sit beside a truncating title, and must stay
 *    one unbroken pill each (they broke as A/I and キャリ/ア at 390px);
 *  - d1-en-06: the AI reading's first section heading sat flush under the
 *    opening paragraph, with the 20px every later heading has above it
 *    missing.
 */

const USER = { id: '00000000-0000-4000-8000-0000000000a3', email: 'qa@example.com' };
const listHighlights = vi.fn();
const listSaved = vi.fn();
const listPremium = vi.fn();

vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: USER, profile: { isPremium: false } }) }));
vi.mock('../../../dal', () => ({
  savedHighlights: { listRawForUser: (...a: unknown[]) => listHighlights(...a), deleteById: vi.fn() },
  tarotReadings: { listSaved: (...a: unknown[]) => listSaved(...a), deleteById: vi.fn() },
  premiumReadings: { listRawForUser: (...a: unknown[]) => listPremium(...a), deleteByIdOnly: vi.fn() },
}));

import i18n from '../../../i18n/config';
import { LibrarySection } from '../LibrarySection';

const CONTENT = [
  '1) Overview',
  'Your network carries you toward the place you hoped for.',
  '',
  '2) Past — Knight of Swords (Upright)',
  'You moved fast and cut through.',
  '',
  '3) Present — The Empress (Upright)',
  'Something is growing.',
].join('\n');

/** The same reading, saved (focus as TarotSection stores it) and bought (focus as the AI request sent it). */
const SAVED = {
  id: 's1', date: '2026-10-20', spread_type: 'three-card', focus_area: 'Career',
  cards: [{ cardId: 61, cardName: 'Knight of Swords', reversed: false, position: 'Past' }, { cardId: 3, cardName: 'The Empress', reversed: false, position: 'Present' }],
  interpretation: null, question: null, created_at: '2026-10-20T03:00:00Z',
};
const BOUGHT = {
  id: 'p1', reading_type: 'three-card', content: CONTENT,
  context: { usedLlm: true, focusArea: 'career' },
  cards: [{ id: 61, name: 'Knight of Swords', reversed: false }, { id: 3, name: 'The Empress', reversed: false }],
  created_at: '2026-10-20T03:00:00Z',
};

const aiTab = () => screen.findByRole('tab', { name: i18n.t('app:library.tabs.aiReadings') });

function renderLibrary() {
  return render(<MemoryRouter><LibrarySection /></MemoryRouter>);
}

describe('the Library’s reading rows and AI reading (p10)', () => {
  beforeEach(async () => {
    cleanup();
    listHighlights.mockReset().mockResolvedValue({ ok: true, data: [] });
    listSaved.mockReset().mockResolvedValue({ ok: true, data: [SAVED] });
    listPremium.mockReset().mockResolvedValue({ ok: true, data: [BOUGHT] });
    await act(async () => { await i18n.changeLanguage('en'); });
  });
  afterAll(async () => {
    await i18n.changeLanguage('en');
  });

  it.each([
    ['ja', 'キャリア'],
    ['ko', '커리어'],
    ['zh', '事业'],
    ['en', 'Career'],
  ])('d2-ja-03 %s: the AI reading’s focus reads as the saved spread’s does — %s', async (lng, career) => {
    await act(async () => { await i18n.changeLanguage(lng); });
    expect(i18n.t('app:readings.focusAreas.career')).toBe(career);
    renderLibrary();
    // The saved row, as it always read.
    await waitFor(() => expect(screen.getByText(career)).toBeInTheDocument());
    fireEvent.click(await aiTab());
    const rows = await screen.findAllByText(career);
    expect(rows).toHaveLength(1);
    const tag = rows[0];
    expect(tag.className).not.toContain('capitalize');
    if (lng !== 'en') expect(document.body.textContent).not.toMatch(/\b[Cc]areer\b/);
  });

  it('d2-ja-04: the AI row’s badge and focus tag never shrink; the title beside them truncates', async () => {
    await act(async () => { await i18n.changeLanguage('ja'); });
    renderLibrary();
    fireEvent.click(await aiTab());
    // The row: title, AI badge, focus tag.
    const badge = await screen.findByText('AI');
    const row = badge.parentElement!;
    expect(row.className.split(/\s+/)).toEqual(expect.arrayContaining(['flex', 'min-w-0']));
    const [title, ...pills] = [...row.children];
    expect(pills).toHaveLength(2);
    expect(pills[0]).toBe(badge);
    for (const pill of pills) expect(pill.className.split(/\s+/), pill.textContent ?? '').toContain('shrink-0');
    expect(badge.className.split(/\s+/)).toContain('whitespace-nowrap');
    expect(title.className.split(/\s+/)).toContain('truncate');
  });

  it('d1-en-06: the first section heading is spaced from the opening paragraph as the later ones are from each other', async () => {
    renderLibrary();
    fireEvent.click(await aiTab());
    fireEvent.click(await screen.findByText('Knight of Swords, The Empress'));
    const sheet = await screen.findByRole('dialog', { name: 'AI reading' });
    const lede = within(sheet).getByText('Your network carries you toward the place you hoped for.').closest('.reading-copy')!;
    const column = lede.parentElement!;
    expect(column.className.split(/\s+/)).toContain('space-y-5');
    // The sections follow the lede in that column, so the first heading gets
    // the column's 20px, as each section after it gets its list's.
    const sections = lede.nextElementSibling!;
    expect(sections.className.split(/\s+/)).toContain('space-y-5');
    const headings = within(sections as HTMLElement).getAllByRole('heading', { level: 5 }).map((el) => el.textContent);
    expect(headings).toEqual(['Past — Knight of Swords (Upright)', 'Present — The Empress (Upright)']);
  });
});
