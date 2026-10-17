import { describe, it, expect, vi, afterAll, beforeEach } from 'vitest';
import { render, screen, act, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/*
 * The header ☆ sheet lists what the member saved, from the Library's
 * records, with dates in the reader's language (p8 F69). It used to render
 * three made-up rows dated "Dec 28, 2025".
 */

const USER = { id: '00000000-0000-4000-8000-0000000000d2', email: 'qa@example.com' };
const listSaved = vi.fn();
const listRawForUser = vi.fn();

vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: USER, profile: { isPremium: false } }) }));
vi.mock('../../../dal', () => ({
  tarotReadings: { listSaved: (...a: unknown[]) => listSaved(...a) },
  savedHighlights: { listRawForUser: (...a: unknown[]) => listRawForUser(...a) },
}));

import i18n from '../../../i18n/config';
import { SavedSheet } from '../SavedSheet';

const READING = {
  id: 'r1',
  date: '2026-10-07',
  spread_type: 'three-card',
  focus_area: null,
  cards: [
    { cardId: 0, cardName: 'The Fool', reversed: false, position: 'Past' },
    { cardId: 1, cardName: 'The Magician', reversed: true, position: 'Present' },
    { cardId: 2, cardName: 'The High Priestess', reversed: false, position: 'Future' },
  ],
  interpretation: 'A beginning.',
  question: null,
  created_at: '2026-10-07T03:00:00Z',
};
const HOROSCOPE = { id: 'h1', date: '2026-10-08', highlight_type: 'horoscope', content: { zodiacSign: 'pisces', period: 'daily' }, created_at: '2026-10-08T01:00:00Z' };
const CARD = { id: 'c1', date: '2026-10-09', highlight_type: 'tarot', content: { card: { name: 'The Star' }, reversed: false }, created_at: '2026-10-09T01:00:00Z' };

function renderSheet(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SavedSheet open onClose={() => {}} />
    </MemoryRouter>,
  );
}

describe('SavedSheet', () => {
  beforeEach(() => {
    cleanup();
    listSaved.mockReset();
    listRawForUser.mockReset();
  });
  afterAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('lists the saved reading, card and horoscope with local dates, and nothing made up', async () => {
    await act(async () => { await i18n.changeLanguage('ja'); });
    listSaved.mockResolvedValue({ ok: true, data: [READING] });
    listRawForUser.mockResolvedValue({ ok: true, data: [CARD, HOROSCOPE] });
    renderSheet();
    await waitFor(() => expect(screen.getByText('保存したスプレッド')).toBeTruthy());
    const text = document.body.textContent ?? '';
    expect(text).toContain('保存したカード');
    expect(text).toContain('保存した星占い');
    expect(text).toContain('10月7日');
    expect(text).toContain('10月9日');
    expect(text).toContain('魚座 - デイリー');
    expect(text).toContain('愚者');
    expect(text).toContain('星');
    // Nothing from the old demo rows, and no English date.
    expect(text).not.toMatch(/Dec \d+, 2025|朝のリフレクション|ラブランゲージ/);
    expect(listSaved).toHaveBeenCalledWith(USER.id, { limit: 20 });
    expect(screen.getByRole('button', { name: 'ライブラリを開く' })).toBeTruthy();
  });

  it('opens the reading the Library shows when its row is tapped', async () => {
    await act(async () => { await i18n.changeLanguage('en'); });
    listSaved.mockResolvedValue({ ok: true, data: [READING] });
    listRawForUser.mockResolvedValue({ ok: true, data: [] });
    renderSheet();
    const row = await screen.findByRole('button', { name: /^Open .+ from Oct 7$/ });
    fireEvent.click(row);
    await waitFor(() => expect(screen.getAllByRole('dialog').length).toBe(2));
  });

  it('says so when nothing is saved, and offers a retry when nothing loads', async () => {
    await act(async () => { await i18n.changeLanguage('en'); });
    listSaved.mockResolvedValue({ ok: true, data: [] });
    listRawForUser.mockResolvedValue({ ok: true, data: [] });
    renderSheet();
    await waitFor(() => expect(screen.getByText('No saved items yet')).toBeTruthy());
    expect(screen.getByText('Readings, cards and horoscopes you save appear here.')).toBeTruthy();
    cleanup();

    listSaved.mockResolvedValue({ ok: false, error: 'offline' });
    listRawForUser.mockResolvedValue({ ok: false, error: 'offline' });
    renderSheet();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy());
  });

  it('has no Library link on the Readings screen, where the Library is a tab', async () => {
    await act(async () => { await i18n.changeLanguage('en'); });
    listSaved.mockResolvedValue({ ok: true, data: [READING] });
    listRawForUser.mockResolvedValue({ ok: true, data: [] });
    renderSheet('/readings');
    await screen.findByRole('button', { name: /^Open / });
    expect(screen.queryByRole('button', { name: 'Open your Library' })).toBeNull();
  });
});
