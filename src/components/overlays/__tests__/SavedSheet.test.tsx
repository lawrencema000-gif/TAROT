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

function renderSheet(path = '/', open = true) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SavedSheet open={open} onClose={() => {}} />
    </MemoryRouter>,
  );
}

/** p9 R16: two reversed cards of three, a reversed saved card and a saved horoscope. */
const REVERSED_READING = {
  ...READING,
  id: 'r2',
  cards: [
    { cardId: 0, cardName: 'The Fool', reversed: true, position: 'Past' },
    { cardId: 1, cardName: 'The Magician', reversed: false, position: 'Present' },
    { cardId: 2, cardName: 'The High Priestess', reversed: true, position: 'Future' },
  ],
};
const REVERSED_CARD = { id: 'c2', date: '2026-10-09', highlight_type: 'tarot', content: { card: { id: 16, name: 'The Tower' }, reversed: true }, created_at: '2026-10-09T01:00:00Z' };
const ARIES = { id: 'h2', date: '2026-10-08', highlight_type: 'horoscope', content: { zodiacSign: 'aries', period: 'daily' }, created_at: '2026-10-08T01:00:00Z' };

/** Rows the pre-Phase-7 client and the Android v1.2.0 app saved: the name on screen, in its language. */
const LEGACY_JA_READING = {
  ...READING,
  id: 'r3',
  cards: [
    { cardId: 3, cardName: '女帝', reversed: false, position: '過去' },
    { cardId: 30, cardName: 'ワンドの9', reversed: true, position: '現在' },
    { cardId: 64, cardName: 'ペンタクルのエース', reversed: false, position: '未来' },
  ],
};
const LEGACY_JA_CARD = { id: 'c3', date: '2026-10-09', highlight_type: 'tarot', content: { card: { id: 19, name: '太陽' }, reversed: false }, created_at: '2026-10-09T01:00:00Z' };

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
    expect(text).toContain('魚座・デイリー');
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

  /*
   * p9 R16: a saved spread's card line marked reversed cards with the
   * English "(R)" and joined them with ", " in every language, and a saved
   * horoscope read "牡羊座 - デイリー", while the saved card two rows below
   * said 逆位置: one sheet, two reversal markers.
   */
  it.each([
    ['ja', '愚者（逆位置）、魔術師、女教皇（逆位置）', '塔（逆位置）', '牡羊座・デイリー'],
    ['zh', '愚者（逆位）、魔术师、女祭司（逆位）', '塔（逆位）', '白羊座 · 每日'],
    ['ko', '바보(역방향), 마법사, 여사제(역방향)', '탑(역방향)', '양자리 · 데일리'],
    ['en', 'The Fool (R), The Magician, The High Priestess (R)', 'The Tower (Reversed)', 'Aries · Daily'],
  ])('%s: the reversal marker, the separator and the horoscope label are the reader’s language', async (lng, line, card, horoscope) => {
    await act(async () => { await i18n.changeLanguage(lng); });
    listSaved.mockResolvedValue({ ok: true, data: [REVERSED_READING] });
    listRawForUser.mockResolvedValue({ ok: true, data: [REVERSED_CARD, ARIES] });
    renderSheet();
    await waitFor(() => expect(document.body.textContent).toContain(line));
    const text = document.body.textContent ?? '';
    expect(text).toContain(card);
    expect(text).toContain(horoscope);
    if (lng !== 'en') expect(text).not.toContain('(R)');
    expect(text).not.toContain(' - ');
  });

  /*
   * p9 R14 (the ☆ sheet's half): rows saved by the pre-Phase-7 client and
   * the Android v1.2.0 app hold the name as it was on screen. The id is the
   * card; the stored name is read only for a row without one.
   */
  it('names a legacy row’s cards by id in the reader’s language, not the one they were saved in', async () => {
    await act(async () => { await i18n.changeLanguage('en'); });
    listSaved.mockResolvedValue({ ok: true, data: [LEGACY_JA_READING] });
    listRawForUser.mockResolvedValue({ ok: true, data: [LEGACY_JA_CARD] });
    renderSheet();
    await waitFor(() => expect(document.body.textContent).toContain('The Empress, Nine of Wands (R), Ace of Pentacles'));
    expect(document.body.textContent).toContain('The Sun');
    expect(document.body.textContent).not.toMatch(/女帝|ワンド|ペンタクル|太陽/);
  });

  /*
   * p9 R25: the reading opens in a second Sheet beside the list. Android
   * Back closes the shell's overlay (`open` → false): the list closed and
   * the reading stayed up over whatever was underneath, and the next Back
   * exited the app with it still on screen.
   */
  it('closing the sheet closes the reading opened from it too', async () => {
    await act(async () => { await i18n.changeLanguage('en'); });
    listSaved.mockResolvedValue({ ok: true, data: [READING] });
    listRawForUser.mockResolvedValue({ ok: true, data: [] });
    const view = renderSheet();
    fireEvent.click(await screen.findByRole('button', { name: /^Open .+ from Oct 7$/ }));
    await waitFor(() => expect(screen.getAllByRole('dialog').length).toBe(2));

    view.rerender(
      <MemoryRouter initialEntries={['/']}>
        <SavedSheet open={false} onClose={() => {}} />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.queryAllByRole('dialog').length).toBe(0));

    // Opened again, it shows the list, not the reading left from before.
    view.rerender(
      <MemoryRouter initialEntries={['/']}>
        <SavedSheet open onClose={() => {}} />
      </MemoryRouter>,
    );
    await screen.findByRole('button', { name: /^Open .+ from Oct 7$/ });
    expect(screen.getAllByRole('dialog').length).toBe(1);
  });
});
