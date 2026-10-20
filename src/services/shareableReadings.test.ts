import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import i18n, { getLocale, setLocale, LOCALE_STORAGE_KEY } from '../i18n/config';
import jaCommon from '../i18n/locales/ja/common.json';
import jaApp from '../i18n/locales/ja/app.json';
import jaOnboarding from '../i18n/locales/ja/onboarding.json';
import jaLanding from '../i18n/locales/ja/landing.json';
import jaTarot from '../i18n/locales/ja/tarot.json';
import {
  buildShareUrl,
  decodeReading,
  encodeReading,
  endVisit,
  keepVisitLanguage,
  shareLocaleQuery,
  sharedReadingLocale,
  showVisitIn,
  SHARE_LOCALE_PARAM,
} from './shareableReadings';

/*
 * p8 F76: a reading shared in Japanese opened in English for the friend it
 * was sent to — the link carried no language, and the detector ignores the
 * browser's on purpose. The link now names it (`?hl=`), outside the token.
 */

const TOKEN = encodeReading({ spreadSlug: 'three-card', cards: [{ id: 19, reversed: true }], question: '仕事はうまくいく？', date: '2026-10-07T00:05:00.000Z' });

beforeAll(() => {
  // The ja bundles in the store, so changing language needs no lazy chunk.
  i18n.addResourceBundle('ja', 'common', jaCommon, true, true);
  i18n.addResourceBundle('ja', 'app', jaApp, true, true);
  i18n.addResourceBundle('ja', 'onboarding', jaOnboarding, true, true);
  i18n.addResourceBundle('ja', 'landing', jaLanding, true, true);
  i18n.addResourceBundle('ja', 'tarot', jaTarot, true, true);
});

/*
 * A Map-backed localStorage (the test runner's global one is not usable),
 * and the language detector's cache emulated on it: i18next stores every
 * language it changes to, which is what showVisitIn has to undo.
 */
const store = new Map<string, string>();
const cacheLikeTheDetector = (lng: string) => store.set(LOCALE_STORAGE_KEY, lng);
beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  });
  i18n.on('languageChanged', cacheLikeTheDetector);
});

afterEach(async () => {
  i18n.off('languageChanged', cacheLikeTheDetector);
  await i18n.changeLanguage('en');
  vi.unstubAllGlobals();
});

describe('share links name their language (p8 F76)', () => {
  it('a ja / ko / zh link carries ?hl=, an English one nothing; the token is untouched', () => {
    for (const lng of ['ja', 'ko', 'zh'] as const) {
      const url = buildShareUrl(TOKEN, lng);
      expect(url.endsWith(`/reading/${TOKEN}?${SHARE_LOCALE_PARAM}=${lng}`)).toBe(true);
      expect(new URL(url).pathname).toBe(`/reading/${TOKEN}`);
    }
    expect(buildShareUrl(TOKEN, 'en').endsWith(`/reading/${TOKEN}`)).toBe(true);
    // The default is the language the sharer reads in.
    expect(getLocale()).toBe('en');
    expect(buildShareUrl(TOKEN)).toBe(buildShareUrl(TOKEN, 'en'));
    // Not `lang`: that is the app-wide preference the detector stores.
    expect(buildShareUrl(TOKEN, 'ja')).not.toMatch(/[?&]lang=/);
    // The tarot token is still v1 and decodes as before.
    expect(decodeReading(TOKEN)).toMatchObject({ v: 1, s: 'three-card', c: [[19, 1]] });
  });

  it('reads the language back from the link', () => {
    expect(sharedReadingLocale('?hl=ja')).toBe('ja');
    expect(sharedReadingLocale('?hl=zh-CN')).toBe('zh');
    expect(sharedReadingLocale('?foo=1&hl=ko')).toBe('ko');
    expect(sharedReadingLocale('?hl=en')).toBeNull();
    expect(sharedReadingLocale('?hl=fr')).toBeNull();
    expect(sharedReadingLocale('?lang=ja')).toBeNull();
    expect(sharedReadingLocale('')).toBeNull();
  });

  it('shows the visit in the link’s language and leaves the stored choice as it was', async () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    await showVisitIn('ja');
    expect(getLocale()).toBe('ja');
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en');

    await i18n.changeLanguage('en');
    localStorage.removeItem(LOCALE_STORAGE_KEY);
    await showVisitIn('ja');
    expect(getLocale()).toBe('ja');
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBeNull();
  });

  it('overlapping calls (a remount) put back what the first one found', async () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    await Promise.all([showVisitIn('ja'), showVisitIn('ja')]);
    expect(getLocale()).toBe('ja');
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en');
    await endVisit();
  });
});

/*
 * p9 R12: the link's language stayed for the rest of the session. The
 * public nav's Sign in opened the form and the signed-in app in Japanese,
 * and AuthContext — which pushes getLocale() to profiles.locale whenever a
 * stored choice exists, and the detector stores 'en' on every first visit —
 * wrote 'ja' into an English reader's account.
 */
describe('the link’s language ends with the visit (p9 R12)', () => {
  it('leaving the page puts the reader’s own language back, stored as it was', async () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    await showVisitIn('ja');
    expect(getLocale()).toBe('ja');
    await endVisit();
    expect(getLocale()).toBe('en');
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en');

    // Nothing stored before the visit: nothing stored after it.
    localStorage.removeItem(LOCALE_STORAGE_KEY);
    await showVisitIn('ko');
    await endVisit();
    expect(getLocale()).toBe('en');
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBeNull();
  });

  it('leaving while the language is still loading does not leave the app in it', async () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    const arriving = showVisitIn('ja');
    const leaving = endVisit();
    await Promise.all([arriving, leaving]);
    expect(getLocale()).toBe('en');
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en');
  });

  it('a remount (StrictMode: mount, cleanup, mount) keeps the visit', async () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    const first = showVisitIn('ja');
    const cleanup = endVisit();
    const second = showVisitIn('ja');
    await Promise.all([first, cleanup, second]);
    expect(getLocale()).toBe('ja');
    await endVisit();
    expect(getLocale()).toBe('en');
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en');
  });

  it('the page’s own invitation keeps the language: then it is the reader’s choice', async () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    await showVisitIn('ja');
    await keepVisitLanguage();
    await endVisit();
    expect(getLocale()).toBe('ja');
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('ja');
  });

  it('a language the reader picks meanwhile is theirs, and stays', async () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    await showVisitIn('ja');
    await setLocale('ko');
    await endVisit();
    expect(getLocale()).toBe('ko');
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('ko');
  });

  it('ending with no visit open changes nothing', async () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    await i18n.changeLanguage('en');
    await endVisit();
    expect(getLocale()).toBe('en');
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en');
  });
});

/* p9 R13: a card shared from a ja reading linked an English card page. */
describe('every shared link names its language', () => {
  it('?hl= for ja, ko and zh, nothing for English', () => {
    expect(shareLocaleQuery('ja')).toBe(`?${SHARE_LOCALE_PARAM}=ja`);
    expect(shareLocaleQuery('ko')).toBe('?hl=ko');
    expect(shareLocaleQuery('zh')).toBe('?hl=zh');
    expect(shareLocaleQuery('en')).toBe('');
    expect(sharedReadingLocale(shareLocaleQuery('ja'))).toBe('ja');
  });
});
