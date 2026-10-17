import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { render, screen, act, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const USER = { id: '00000000-0000-4000-8000-0000000000e2', email: 'qa@example.com' };
const listHighlights = vi.fn();
const listSaved = vi.fn();
const listPremium = vi.fn();

vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: USER, profile: { isPremium: true } }) }));
vi.mock('../../../dal', () => ({
  savedHighlights: { listRawForUser: (...a: unknown[]) => listHighlights(...a), deleteById: vi.fn() },
  tarotReadings: { listSaved: (...a: unknown[]) => listSaved(...a), deleteById: vi.fn() },
  premiumReadings: { listRawForUser: (...a: unknown[]) => listPremium(...a), deleteByIdOnly: vi.fn() },
}));

import i18n from '../../../i18n/config';
import { LibrarySection } from '../LibrarySection';

const row = (id: string, spread_type: string, cards: unknown[], date = '2026-10-06') => ({
  id, date, spread_type, focus_area: null, cards, interpretation: null, question: null, created_at: `${date}T03:00:00Z`,
});

/*
 * Rows as the pre-Phase-7 client and the Android v1.2.0 app saved them: the
 * card's id, and its name and position as they were on screen (seed-legacy).
 */
const LEGACY_JA = [
  row('l1', 'three-card', [
    { cardId: 3, cardName: '女帝', reversed: false, position: '過去' },
    { cardId: 30, cardName: 'ワンドの9', reversed: true, position: '現在' },
    { cardId: 64, cardName: 'ペンタクルのエース', reversed: false, position: '未来' },
  ]),
  row('l2', 'celtic-cross', [
    { cardId: 0, cardName: '愚者', reversed: false, position: '現状' },
    { cardId: 1, cardName: '魔術師', reversed: true, position: '障害' },
    { cardId: 2, cardName: '女教皇', reversed: false, position: '目標' },
    ...[3, 4, 5, 6, 7, 8, 9].map((id) => ({ cardId: id, cardName: '—', reversed: false, position: '—' })),
  ]),
  row('l3', 'single', [{ cardId: 19, cardName: '太陽', reversed: true, position: '今日' }]),
];

const REVERSED = row('r1', 'three-card', [
  { cardId: 0, cardName: 'The Fool', reversed: true, position: 'Past' },
  { cardId: 1, cardName: 'The Magician', reversed: false, position: 'Present' },
  { cardId: 2, cardName: 'The High Priestess', reversed: true, position: 'Future' },
]);
const TOWER = { id: 'c1', date: '2026-10-09', highlight_type: 'tarot', content: { card: { id: 16, name: 'The Tower' }, reversed: true }, created_at: '2026-10-09T01:00:00Z' };
const SUN_JA = { id: 'c2', date: '2026-10-09', highlight_type: 'tarot', content: { card: { id: 19, name: '太陽' }, reversed: false }, created_at: '2026-10-09T01:00:00Z' };
const ARIES = { id: 'h1', date: '2026-10-08', highlight_type: 'horoscope', content: { zodiacSign: 'aries', period: 'daily' }, created_at: '2026-10-08T01:00:00Z' };
/** An AI reading as generate-reading stores it: `{ id, name, reversed }`, the name as the client sent it. */
const PREMIUM = {
  id: 'p1', reading_type: 'three-card', content: 'A reading.', context: { usedLlm: true },
  cards: [{ id: 0, name: '愚者', reversed: true }, { id: 1, name: '魔術師', reversed: false }, { id: 2, name: '女教皇', reversed: true }],
  created_at: '2026-10-07T03:00:00Z',
};

function renderLibrary() {
  return render(
    <MemoryRouter>
      <LibrarySection />
    </MemoryRouter>,
  );
}

describe('LibrarySection', () => {
  beforeEach(() => {
    cleanup();
    listHighlights.mockReset().mockResolvedValue({ ok: true, data: [] });
    listSaved.mockReset().mockResolvedValue({ ok: true, data: [] });
    listPremium.mockReset().mockResolvedValue({ ok: true, data: [] });
  });
  afterAll(async () => {
    await i18n.changeLanguage('en');
  });

  /* p9 R14: the list printed a legacy row's names in the language they were saved in. */
  it('names legacy rows’ cards by id in the reader’s language', async () => {
    await act(async () => { await i18n.changeLanguage('en'); });
    listSaved.mockResolvedValue({ ok: true, data: LEGACY_JA });
    listHighlights.mockResolvedValue({ ok: true, data: [SUN_JA] });
    renderLibrary();
    await waitFor(() => expect(document.body.textContent).toContain('The Empress, Nine of Wands (R), Ace of Pentacles'));
    const text = document.body.textContent ?? '';
    expect(text).toContain('The Fool, The Magician (R), The High Priestess +7');
    expect(text).toContain('The Sun (R)');
    expect(text).toContain('The Sun');
    expect(text).not.toMatch(/女帝|ワンド|ペンタクル|愚者|魔術師|女教皇|太陽/);
  });

  /* p9 R16: the Library's lists marked a reversal "(R)" and joined with ", " in every language. */
  it.each([
    ['ja', '愚者（逆位置）、魔術師、女教皇（逆位置）', '塔（逆位置）', '牡羊座・デイリー'],
    ['zh', '愚者（逆位）、魔术师、女祭司（逆位）', '塔（逆位）', '白羊座 · 每日'],
    ['ko', '바보(역방향), 마법사, 여사제(역방향)', '탑(역방향)', '양자리 · 데일리'],
  ])('%s: the Saved tab marks a reversal and joins names in the reader’s language', async (lng, line, card, horoscope) => {
    await act(async () => { await i18n.changeLanguage(lng); });
    listSaved.mockResolvedValue({ ok: true, data: [REVERSED] });
    listHighlights.mockResolvedValue({ ok: true, data: [TOWER, ARIES] });
    renderLibrary();
    await waitFor(() => expect(document.body.textContent).toContain(line));
    const text = document.body.textContent ?? '';
    expect(text).toContain(card);
    expect(text).toContain(horoscope);
    expect(text).not.toContain('(R)');
    expect(text).not.toContain(' - ');
  });

  it('ja: an AI reading’s cards are named by id, with the reversal in Japanese, in the list and its sheet', async () => {
    await act(async () => { await i18n.changeLanguage('en'); });
    listPremium.mockResolvedValue({ ok: true, data: [PREMIUM] });
    renderLibrary();
    fireEvent.click(await screen.findByRole('tab', { name: /AI readings/ }));
    await waitFor(() => expect(document.body.textContent).toContain('The Fool (R), The Magician, The High Priestess (R)'));

    cleanup();
    await act(async () => { await i18n.changeLanguage('ja'); });
    renderLibrary();
    const tab = await screen.findByRole('tab', { name: i18n.t('app:library.tabs.aiReadings') });
    fireEvent.click(tab);
    await waitFor(() => expect(document.body.textContent).toContain('愚者（逆位置）、魔術師、女教皇（逆位置）'));
    fireEvent.click(screen.getByText('愚者（逆位置）、魔術師、女教皇（逆位置）'));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
    const sheet = screen.getByRole('dialog').textContent ?? '';
    expect(sheet).toContain('愚者（逆位置）');
    expect(sheet).toContain('女教皇（逆位置）');
    expect(sheet).not.toContain('(R)');
  });

  it('an AI reading row with no cards or context (nullable jsonb) does not take the Library down', async () => {
    await act(async () => { await i18n.changeLanguage('en'); });
    listSaved.mockResolvedValue({ ok: true, data: [REVERSED] });
    listPremium.mockResolvedValue({ ok: true, data: [{ ...PREMIUM, id: 'p2', cards: null, context: null }] });
    renderLibrary();
    await waitFor(() => expect(document.body.textContent).toContain('The Fool (R), The Magician, The High Priestess (R)'));
  });
});

/*
 * p9 R18: Profile, Compatibility and the quiz name the five love languages
 * alike; the Library's guide called three of them something else in ko and
 * four in zh (服务的行动 in the quiz, 行动的付出 in the guide).
 */
describe('the love-language guide names the languages as the quiz does', () => {
  const ROOT = join(__dirname, '..', '..', '..', 'i18n', 'locales');
  // The guide's sections, in order, and the quiz result each one is.
  const ORDER = ['words', 'acts', 'gifts', 'time', 'touch'] as const;
  it.each(['en', 'ja', 'ko', 'zh'])('%s', (lng) => {
    const app = JSON.parse(readFileSync(join(ROOT, lng, 'app.json'), 'utf8'));
    const titles = (app.library.guides['love-languages'].sections as Array<{ title: string }>).map((s) => s.title);
    const quiz = ORDER.map((k) => app.quizzes.resultCopy.loveLanguage[k].title as string);
    expect(titles).toEqual(quiz);
    const profile = app.profile.loveLanguages as Record<string, string>;
    expect(titles).toEqual([profile['words-of-affirmation'], profile['acts-of-service'], profile['receiving-gifts'], profile['quality-time'], profile['physical-touch']]);
  });
});
