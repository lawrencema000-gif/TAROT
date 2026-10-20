import { describe, it, expect, vi, afterAll, beforeEach } from 'vitest';
import { render, screen, act, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';

/*
 * p10 d3-ko-13: the header search never returned a result ("results for
 * “바보” will appear here"), showed a member who had never searched three
 * made-up recent searches, and its quick links did nothing. Now it finds
 * cards, playing cards, signs and the member's journal in the language the
 * app is in, a result opens its page and closes the sheet, the recent
 * searches are the member's own, and the quick links go where they say.
 */

const USER = { id: '00000000-0000-4000-8000-0000000000d3', email: 'qa@example.com' };
const flags: Record<string, boolean> = {};
const listForUser = vi.fn();

vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: USER, profile: { isPremium: false } }) }));
vi.mock('../../../context/FeatureFlagContext', () => ({ useFeatureFlag: (key: string) => flags[key] ?? false }));
vi.mock('../../../dal', () => ({ journalEntries: { listForUser: (...a: unknown[]) => listForUser(...a) } }));

import i18n from '../../../i18n/config';
import { recentSearchesKey } from '../../../services/search';
import { SearchSheet } from '../SearchSheet';

/** Node 25 ships its own (file-less, broken) localStorage over jsdom's; give the code a real one. */
function memoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() { return store.size; },
    key: (i: number) => [...store.keys()][i] ?? null,
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  } as Storage;
}

function Where() {
  const { pathname, state } = useLocation();
  return <output data-testid="where">{`${pathname}${state ? ` ${JSON.stringify(state)}` : ''}`}</output>;
}

function renderSheet() {
  const onClose = vi.fn();
  render(
    <MemoryRouter initialEntries={['/readings']}>
      <Where />
      <SearchSheet open onClose={onClose} />
    </MemoryRouter>,
  );
  return { onClose };
}

const inLanguage = async (lng: string) => {
  await act(async () => {
    await i18n.changeLanguage(lng);
  });
};
const type = (text: string) => fireEvent.change(screen.getByRole('searchbox'), { target: { value: text } });
/** Under the test's own 5 s, so a miss fails on its assertion. The first search loads the deck. */
const WAIT = { timeout: 3000 };
/** The row a result is drawn in, by its name. */
const resultRow = async (name: string) => (await screen.findByText(name, {}, WAIT)).closest('button')!;
const recentStored = () => JSON.parse(localStorage.getItem(recentSearchesKey(USER.id)) ?? '[]');

describe('SearchSheet', () => {
  beforeEach(() => {
    cleanup();
    vi.stubGlobal('localStorage', memoryStorage());
    for (const k of Object.keys(flags)) delete flags[k];
    listForUser.mockReset();
    listForUser.mockResolvedValue({ ok: true, data: [] });
  });
  afterAll(async () => {
    await i18n.changeLanguage('en');
    vi.unstubAllGlobals();
  });

  it('shows a member who never searched no recent searches — nothing made up — and the quick links', async () => {
    await inLanguage('ko');
    renderSheet();
    expect(screen.getByRole('button', { name: '오늘의 운세' })).toBeInTheDocument();
    const text = document.body.textContent ?? '';
    expect(text).not.toContain('최근 검색');
    expect(text).not.toMatch(/타워 카드 의미|양자리 연애 궁합|세 장 스프레드/);
  });

  it('finds 바보 in Korean; the result opens the card’s page, closes the sheet and is kept as a recent search', async () => {
    await inLanguage('ko');
    const { onClose } = renderSheet();
    type('바보');
    const fool = await resultRow('바보');
    expect(fool).toHaveTextContent('메이저 아르카나');
    expect(document.body.textContent).not.toContain('검색 결과가 여기에 표시됩니다');
    fireEvent.click(fool);
    expect(onClose).toHaveBeenCalled();
    expect(screen.getByTestId('where')).toHaveTextContent('/tarot-meanings/the-fool');
    expect(recentStored()).toEqual(['바보']);
  });

  it.each([
    ['ja', '愚者'],
    ['zh', '愚人'],
  ])('%s: “%s” finds The Fool', async (lng, query) => {
    await inLanguage(lng);
    renderSheet();
    type(query);
    fireEvent.click(await resultRow('愚者'));
    expect(screen.getByTestId('where')).toHaveTextContent('/tarot-meanings/the-fool');
  });

  it('opens the quick links’ screens and closes the sheet', async () => {
    await inLanguage('ko');
    const first = renderSheet();
    fireEvent.click(screen.getByRole('button', { name: '오늘의 운세' }));
    expect(first.onClose).toHaveBeenCalled();
    expect(screen.getByTestId('where')).toHaveTextContent('/horoscope');
    cleanup();

    await inLanguage('en');
    renderSheet();
    fireEvent.click(screen.getByRole('button', { name: 'Journal prompts' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/journal {"tab":"templates"}');
    cleanup();

    renderSheet();
    fireEvent.click(screen.getByRole('button', { name: 'Personality quiz' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/quizzes');
  });

  it('lists this member’s recent searches newest first; one fills the box, and Clear empties the list', async () => {
    await inLanguage('en');
    localStorage.setItem(recentSearchesKey(USER.id), JSON.stringify(['tower', 'the fool']));
    renderSheet();
    expect(screen.getByText('Recent searches')).toBeInTheDocument();
    const rows = screen.getAllByRole('button').filter((b) => ['tower', 'the fool'].includes(b.textContent ?? ''));
    expect(rows.map((b) => b.textContent)).toEqual(['tower', 'the fool']);

    fireEvent.click(rows[1]);
    expect(screen.getByRole('searchbox')).toHaveValue('the fool');
    await resultRow('The Fool');

    type('');
    fireEvent.click(screen.getByRole('button', { name: 'Clear recent searches' }));
    expect(screen.queryByText('Recent searches')).toBeNull();
    expect(localStorage.getItem(recentSearchesKey(USER.id))).toBeNull();
  });

  it('keeps a search when the search key is pressed', async () => {
    await inLanguage('en');
    renderSheet();
    type('pisces');
    fireEvent.submit(screen.getByRole('search'));
    expect(recentStored()).toEqual(['pisces']);
    fireEvent.click(await resultRow('Pisces'));
    expect(screen.getByTestId('where')).toHaveTextContent('/astrology/pisces');
  });

  it('says plainly when nothing matches', async () => {
    await inLanguage('en');
    renderSheet();
    type('qqqzzz');
    expect(await screen.findByText('Nothing matches ‘qqqzzz’', {}, WAIT)).toBeInTheDocument();
    expect(screen.getByText('Try a card’s name, a zodiac sign or a word from your journal.')).toBeInTheDocument();
  });

  it('shows the playing cards only while their section is on', async () => {
    await inLanguage('en');
    renderSheet();
    type('ace');
    await resultRow('Ace of Cups');
    expect(screen.queryByText('Ace of Hearts')).toBeNull();
    cleanup();

    flags.cartomancy = true;
    renderSheet();
    type('ace');
    fireEvent.click(await resultRow('Ace of Hearts'));
    expect(screen.getByTestId('where')).toHaveTextContent('/cartomancy/cards/ace-of-hearts');
  });

  it('finds the member’s journal entries, and opens one in the journal', async () => {
    await inLanguage('en');
    listForUser.mockResolvedValue({
      ok: true,
      data: [{ id: 'e1', user_id: USER.id, title: 'Promotion day', content: 'Spoke up in the meeting.', tags: null, prompt: null, date: '2026-10-07' }],
    });
    renderSheet();
    type('promotion');
    const entry = await resultRow('Promotion day');
    expect(entry).toHaveTextContent('Oct 7, 2026');
    expect(listForUser).toHaveBeenCalledTimes(1);
    fireEvent.click(entry);
    expect(screen.getByTestId('where')).toHaveTextContent('/journal {"entryId":"e1"}');
  });

  it('says so when the journal cannot be read, and tries again on request', async () => {
    await inLanguage('en');
    listForUser.mockResolvedValueOnce({ ok: false, error: 'offline' });
    renderSheet();
    type('tower');
    await resultRow('The Tower');
    expect(await screen.findByText('Couldn’t search your journal — check your connection.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.queryByText('Couldn’t search your journal — check your connection.')).toBeNull());
    expect(listForUser).toHaveBeenCalledTimes(2);
  });

  // Needs the p10 locale delta (search.noResults, search.noResultsHint, search.groups.* in ja/ko/zh).
  it.each([
    ['ja', '「qqqzzz」に一致するものはありません', 'カードの名前、星座、ジャーナルに書いた言葉で探してみてください。', '星座'],
    ['ko', '‘qqqzzz’에 맞는 결과가 없어요', '카드 이름, 별자리, 저널에 쓴 단어로 찾아보세요.', '별자리'],
    ['zh', '没有与“qqqzzz”匹配的结果', '试试搜索牌名、星座或日记里的词语。', '星座'],
  ])('%s: the empty result and the group headings read in the reader’s language', async (lng, none, hint, signs) => {
    await inLanguage(lng);
    renderSheet();
    type('qqqzzz');
    expect(await screen.findByText(none, {}, WAIT)).toBeInTheDocument();
    expect(screen.getByText(hint)).toBeInTheDocument();
    type('pisces');
    expect(await screen.findByRole('heading', { name: signs }, WAIT)).toBeInTheDocument();
  });
});
