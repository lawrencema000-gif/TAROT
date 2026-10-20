import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

/*
 * p9 R13 (RQA-4): a card shared from a Japanese reading is linked with its
 * language (`/tarot-meanings/the-devil?hl=ja`, TarotSection), and the card
 * page now reads it as the shared reading page does (p8 F76, p9 R12): a
 * signed-out visitor in English — every first visit starts in English, the
 * detector ignores the browser's language — sees the page in Japanese, on
 * that page only. A signed-in member, or a visitor who reads the app in a
 * language of their own, keeps theirs; leaving the page puts the app back
 * in the visitor's own language; the page's own invitation ("Try a free
 * reading") takes the language into the app, since that is a choice. An
 * older slug moves to the canonical one with its query (it used to drop it,
 * `?hl` with it).
 */

const USER = { id: '00000000-0000-4000-8000-0000000000e4', email: 'qa@example.com' };
const auth: { user: typeof USER | null } = { user: null };
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: auth.user, profile: null }) }));
vi.mock('../../lib/supabase', () => ({
  supabase: { from: () => ({ insert: async () => ({ error: null }) }) },
}));
// Members only, and not under test.
vi.mock('../../components/oracle/AskOracleButton', () => ({ AskOracleButton: () => null }));

import i18n, { getLocale, LOCALE_STORAGE_KEY } from '../../i18n/config';
import { TarotCardMeaningPage } from '../TarotCardMeaningPage';

function Where() {
  const { pathname, search } = useLocation();
  return <output data-testid="where">{`${pathname}${search}`}</output>;
}

function renderCard(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/tarot-meanings/:slug" element={<><Where /><TarotCardMeaningPage /></>} />
        <Route path="/tarot-meanings" element={<p>all-cards</p>} />
      </Routes>
    </MemoryRouter>,
  );
}
const cardName = async () => (await screen.findByRole('heading', { level: 1 })).textContent;

/*
 * A Map-backed localStorage (the runner's global one is not usable), and the
 * language detector's cache emulated on it: i18next stores every language it
 * changes to, which is what the visit has to undo.
 */
const store = new Map<string, string>();
const cacheLikeTheDetector = (lng: string) => store.set(LOCALE_STORAGE_KEY, lng);
/** jsdom does not navigate: the invitation's full-page load is not under test. */
const noNavigation = (e: Event) => { if ((e.target as Element | null)?.closest?.('a[href="/"]')) e.preventDefault(); };

beforeAll(() => {
  window.scrollTo = (() => {}) as typeof window.scrollTo;
});
beforeEach(async () => {
  cleanup();
  auth.user = null;
  store.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  });
  await act(async () => { await i18n.changeLanguage('en'); });
  i18n.on('languageChanged', cacheLikeTheDetector);
  // The detector stored English on the first visit.
  store.set(LOCALE_STORAGE_KEY, 'en');
  document.addEventListener('click', noNavigation, true);
});
afterEach(async () => {
  cleanup();
  document.removeEventListener('click', noNavigation, true);
  i18n.off('languageChanged', cacheLikeTheDetector);
  await act(async () => { await i18n.changeLanguage('en'); });
  vi.unstubAllGlobals();
});

describe('TarotCardMeaningPage: a card link shared with ?hl opens in its language (p9 R13)', () => {
  it('a signed-out English visitor reads the card in Japanese; leaving the page, the app is theirs again', async () => {
    renderCard('/tarot-meanings/the-fool?hl=ja');
    // 3 s, not waitFor's 1 s: a language switch loads a corpus, and the full
    // suite on a loaded machine has taken longer than a second (p10).
    await waitFor(async () => expect(await cardName()).toBe('愚者'), { timeout: 3000 });
    expect(screen.getByText('クイックリファレンス')).toBeInTheDocument();
    expect(getLocale()).toBe('ja');
    // Opening a link is not a choice: nothing is stored.
    expect(store.get(LOCALE_STORAGE_KEY)).toBe('en');

    fireEvent.click(screen.getByRole('link', { name: 'すべてのカード' }));
    await screen.findByText('all-cards');
    await waitFor(() => expect(getLocale()).toBe('en'), { timeout: 3000 });
    expect(store.get(LOCALE_STORAGE_KEY)).toBe('en');
  });

  it('a signed-in member keeps their language', async () => {
    auth.user = USER;
    renderCard('/tarot-meanings/the-fool?hl=ja');
    expect(await cardName()).toBe('The Fool');
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    expect(getLocale()).toBe('en');
    expect(store.get(LOCALE_STORAGE_KEY)).toBe('en');
  });

  it('a visitor who reads the app in a language of their own keeps it', async () => {
    await act(async () => { await i18n.changeLanguage('ko'); });
    store.set(LOCALE_STORAGE_KEY, 'ko');
    renderCard('/tarot-meanings/the-fool?hl=ja');
    await waitFor(async () => expect(await cardName()).toBe('바보'));
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    expect(getLocale()).toBe('ko');
    expect(store.get(LOCALE_STORAGE_KEY)).toBe('ko');
  });

  it('an older slug moves to the canonical one with its query, and the page is still in the link’s language', async () => {
    renderCard('/tarot-meanings/wheel-of-fortune?hl=ja&utm_source=line');
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/tarot-meanings/the-wheel-of-fortune?hl=ja&utm_source=line'));
    await waitFor(async () => expect(await cardName()).toBe('運命の輪'));
    expect(getLocale()).toBe('ja');
  });

  it('the page’s own invitation (“Try a free reading”) takes the language into the app: the visitor chose it', async () => {
    renderCard('/tarot-meanings/the-fool?hl=ja');
    fireEvent.click(await screen.findByRole('link', { name: '無料リーディングを試す' }));
    await waitFor(() => expect(store.get(LOCALE_STORAGE_KEY)).toBe('ja'));
    cleanup();
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    expect(getLocale()).toBe('ja');
    expect(store.get(LOCALE_STORAGE_KEY)).toBe('ja');
  });
});
