import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { render, screen, act, waitFor, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/*
 * p9 Q02: every AI interpretation a member buys is stored in
 * premium_readings, and the Library loads those rows for every member — but
 * its "AI readings" tab was added only for Premium. A free member who paid
 * 50 Moonstones for "Get AI insight" and then tapped "Start a new reading"
 * (nothing saved) could not reach the paid text anywhere in the app: the
 * Library showed "No saved items yet" and the Saved and Guides tabs only.
 */

const USER = { id: '00000000-0000-4000-8000-0000000000f2', email: 'qa@example.com' };
const PROFILE = { isPremium: false };
const listHighlights = vi.fn();
const listSaved = vi.fn();
const listPremium = vi.fn();
const deletePremium = vi.fn();

vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: USER, profile: PROFILE }) }));
vi.mock('../../../dal', () => ({
  savedHighlights: { listRawForUser: (...a: unknown[]) => listHighlights(...a), deleteById: vi.fn() },
  tarotReadings: { listSaved: (...a: unknown[]) => listSaved(...a), deleteById: vi.fn() },
  premiumReadings: { listRawForUser: (...a: unknown[]) => listPremium(...a), deleteByIdOnly: (...a: unknown[]) => deletePremium(...a) },
}));

import i18n from '../../../i18n/config';
import { LibrarySection } from '../LibrarySection';

/** A free member's bought interpretation, as generate-reading stores it. */
const BOUGHT = {
  id: 'p-free-1', reading_type: 'three-card',
  content: 'Your path is opening.\n\nThe cards ask for patience.',
  context: { usedLlm: true, focusArea: 'Career' },
  cards: [{ id: 64, name: 'Ace of Pentacles', reversed: true }, { id: 26, name: 'Five of Wands', reversed: false }, { id: 58, name: 'Nine of Swords', reversed: false }],
  created_at: '2026-10-17T03:00:00Z',
};

const aiTab = () => screen.queryByRole('tab', { name: i18n.t('app:library.tabs.aiReadings') });

function renderLibrary() {
  return render(<MemoryRouter><LibrarySection /></MemoryRouter>);
}

describe('p9 Q02 — a free member reaches the AI interpretations they bought', () => {
  beforeEach(async () => {
    cleanup();
    PROFILE.isPremium = false;
    listHighlights.mockReset().mockResolvedValue({ ok: true, data: [] });
    listSaved.mockReset().mockResolvedValue({ ok: true, data: [] });
    listPremium.mockReset().mockResolvedValue({ ok: true, data: [] });
    deletePremium.mockReset().mockResolvedValue({ ok: true, data: null });
    await act(async () => { await i18n.changeLanguage('en'); });
  });
  afterAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('with one bought interpretation and nothing saved: the AI readings tab is there, and the paid text opens', async () => {
    listPremium.mockResolvedValue({ ok: true, data: [BOUGHT] });
    renderLibrary();
    await waitFor(() => expect(aiTab()).not.toBeNull());
    fireEvent.click(aiTab()!);
    const row = await screen.findByText('Ace of Pentacles (R), Five of Wands, Nine of Swords');
    fireEvent.click(row);
    const sheet = await screen.findByRole('dialog', { name: 'AI reading' });
    expect(sheet.textContent).toContain('Your path is opening.');
    expect(sheet.textContent).toContain('The cards ask for patience.');
  });

  it('with none: the tab stays away, as before', async () => {
    renderLibrary();
    await waitFor(() => expect(listPremium).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole('tab', { name: i18n.t('app:library.tabs.saved') })).toBeInTheDocument());
    expect(aiTab()).toBeNull();
  });

  it('deleting the last one on the tab leaves the tab and its empty state, not a missing tab', async () => {
    listPremium.mockResolvedValue({ ok: true, data: [BOUGHT] });
    renderLibrary();
    await waitFor(() => expect(aiTab()).not.toBeNull());
    fireEvent.click(aiTab()!);
    fireEvent.click(await screen.findByRole('button', { name: /^Delete / }));
    const confirm = await screen.findByRole('dialog', { name: i18n.t('app:library.deleteConfirmTitle') });
    fireEvent.click(within(confirm).getByRole('button', { name: i18n.t('common:actions.delete') }));
    await waitFor(() => expect(deletePremium).toHaveBeenCalledWith('p-free-1'));
    await screen.findByText(i18n.t('app:library.empty.noAIReadings'));
    expect(aiTab()).not.toBeNull();
    expect(aiTab()!.getAttribute('aria-selected')).toBe('true');
  });

  it('ja: the tab is named in Japanese for a free member too', async () => {
    await act(async () => { await i18n.changeLanguage('ja'); });
    listPremium.mockResolvedValue({ ok: true, data: [BOUGHT] });
    renderLibrary();
    await waitFor(() => expect(aiTab()).not.toBeNull());
    expect(aiTab()!.textContent).toBe(i18n.t('app:library.tabs.aiReadings'));
    expect(aiTab()!.textContent).not.toBe('AI readings');
  });
});

/* p9 Q10, the sibling surface: the AI readings sheet printed the stored text raw too. */
describe('p9 Q10 — the Library’s AI reading sheet reads the reading’s shape', () => {
  beforeEach(async () => {
    cleanup();
    PROFILE.isPremium = false;
    listHighlights.mockReset().mockResolvedValue({ ok: true, data: [] });
    listSaved.mockReset().mockResolvedValue({ ok: true, data: [] });
    await act(async () => { await i18n.changeLanguage('en'); });
  });

  it('the row previews the opening paragraph; the sheet has the lede, numberless headings and the actions as a list', async () => {
    const content = [
      '1) Overview', 'Your path is opening.', '',
      '2) Past — Ace of Pentacles (Reversed)', 'A chance slipped by.', '',
      '3 Practical Actions', '- Write it down.', '- Ask once.', '- Set a date.', '',
      'Closing', 'Steady on.',
    ].join('\n');
    listPremium.mockReset().mockResolvedValue({ ok: true, data: [{ ...BOUGHT, content }] });
    renderLibrary();
    await waitFor(() => expect(aiTab()).not.toBeNull());
    fireEvent.click(aiTab()!);
    const row = await screen.findByText('Ace of Pentacles (R), Five of Wands, Nine of Swords');
    expect(document.body.textContent).toContain('Your path is opening.…');
    expect(document.body.textContent).not.toContain('1) Overview');
    fireEvent.click(row);
    const sheet = await screen.findByRole('dialog', { name: 'AI reading' });
    expect(within(sheet).getByRole('heading', { name: 'Past — Ace of Pentacles (Reversed)' })).toBeInTheDocument();
    expect(within(sheet).getByRole('heading', { name: 'Practical Actions' })).toBeInTheDocument();
    expect(within(within(sheet).getByRole('list')).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Write it down.', 'Ask once.', 'Set a date.']);
    expect(sheet.textContent).not.toMatch(/\d\) |- Write/);
  });
});
