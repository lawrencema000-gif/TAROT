import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';

/*
 * p9 R12: a reading shared in Japanese opens in Japanese for a signed-out
 * English visitor (`?hl=ja`, p8 F76) — on that page only. The language used
 * to stay for the rest of the session: the public nav's Sign in opened the
 * form and the signed-in app in Japanese, and AuthContext's locale sync,
 * which pushes getLocale() to profiles.locale whenever a stored choice
 * exists (the detector stores 'en' on every first visit), wrote 'ja' into
 * the English reader's account.
 */

vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null }) }));

import i18n, { getLocale, LOCALE_STORAGE_KEY } from '../../i18n/config';
import { encodeReading } from '../../services/shareableReadings';
import { SharedReadingPage } from '../SharedReadingPage';

const TOKEN = encodeReading({
  spreadSlug: 'three-card',
  cards: [{ id: 0, reversed: false }, { id: 19, reversed: true }, { id: 16, reversed: false }],
  date: '2026-10-07T00:05:00.000Z',
});

/** The public nav's Sign in: an in-app navigation away from the shared page. */
function PublicNavSignIn() {
  const navigate = useNavigate();
  return <button type="button" onClick={() => navigate('/signin')}>public-nav-sign-in</button>;
}

function renderShared() {
  return render(
    <MemoryRouter initialEntries={[`/reading/${TOKEN}?hl=ja`]}>
      <Routes>
        <Route path="/reading/:token" element={<><PublicNavSignIn /><SharedReadingPage /></>} />
        <Route path="/signin" element={<p>sign-in-form</p>} />
        <Route path="/" element={<p>home</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

/*
 * A Map-backed localStorage (the runner's global one is not usable), and the
 * language detector's cache emulated on it: i18next stores every language it
 * changes to, which is what the visit has to undo.
 */
const store = new Map<string, string>();
const cacheLikeTheDetector = (lng: string) => store.set(LOCALE_STORAGE_KEY, lng);

describe('SharedReadingPage: the link’s language is for the page (p9 R12)', () => {
  beforeEach(async () => {
    cleanup();
    store.clear();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    });
    await act(async () => { await i18n.changeLanguage('en'); });
    i18n.on('languageChanged', cacheLikeTheDetector);
    // The detector stored English on the first visit: an explicit choice to AuthContext.
    store.set(LOCALE_STORAGE_KEY, 'en');
  });
  afterEach(async () => {
    cleanup();
    i18n.off('languageChanged', cacheLikeTheDetector);
    await act(async () => { await i18n.changeLanguage('en'); });
    vi.unstubAllGlobals();
  });

  it('shows the page in the link’s language, and Sign in leaves it for the reader’s own', async () => {
    renderShared();
    await screen.findByText('共有されたリーディング');
    expect(getLocale()).toBe('ja');
    expect(store.get(LOCALE_STORAGE_KEY)).toBe('en');

    fireEvent.click(screen.getByRole('button', { name: 'public-nav-sign-in' }));
    await screen.findByText('sign-in-form');
    // The sign-in form, and the account the reader signs in to, are in their language:
    // getLocale() is what AuthContext writes to profiles.locale.
    await waitFor(() => expect(getLocale()).toBe('en'));
    expect(store.get(LOCALE_STORAGE_KEY)).toBe('en');
  });

  it('“Get your own reading” takes the language into the app: the reader chose it', async () => {
    renderShared();
    fireEvent.click(await screen.findByRole('button', { name: 'Arcanaで、自分のリーディングをしてみる' }));
    await screen.findByText('home');
    await act(async () => {});
    expect(getLocale()).toBe('ja');
    expect(store.get(LOCALE_STORAGE_KEY)).toBe('ja');
  });
});
