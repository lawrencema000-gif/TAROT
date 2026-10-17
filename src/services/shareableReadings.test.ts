import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import i18n, { getLocale, LOCALE_STORAGE_KEY } from '../i18n/config';
import jaCommon from '../i18n/locales/ja/common.json';
import jaApp from '../i18n/locales/ja/app.json';
import jaOnboarding from '../i18n/locales/ja/onboarding.json';
import jaLanding from '../i18n/locales/ja/landing.json';
import jaTarot from '../i18n/locales/ja/tarot.json';
import { buildShareUrl, decodeReading, encodeReading, sharedReadingLocale, showVisitIn, SHARE_LOCALE_PARAM } from './shareableReadings';

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
  });
});
