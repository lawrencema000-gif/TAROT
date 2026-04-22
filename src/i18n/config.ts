/**
 * i18next configuration — bundled namespaces + lazy-loaded HTTP backend.
 *
 * Resolution order for the active language:
 *   1. ?lang=XX URL param (debug / deep-link override)
 *   2. profiles.locale (authenticated user — set via setLocale())
 *   3. localStorage 'arcana_locale' (anonymous user preference)
 *   4. navigator.language (browser default)
 *   5. 'en' fallback
 *
 * Static namespaces (bundled into main chunk):
 *   - common    — navigation, buttons, toasts, errors, validation
 *   - onboarding
 *   - landing
 *
 * Lazy namespaces (fetched from /locales/{lang}/{ns}.json when first used):
 *   - tarot, meanings, horoscope, quizzes, journal, premium, admin, blog
 *
 * Fallback chain: all non-en locales fall back to en for missing keys so
 * an unfinished translation never surfaces a bare key to the user.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

// Bundled (shipped in main JS) — always available at boot
import enCommon from './locales/en/common.json';
import jaCommon from './locales/ja/common.json';
import koCommon from './locales/ko/common.json';
import zhCommon from './locales/zh/common.json';
import enOnboarding from './locales/en/onboarding.json';
import jaOnboarding from './locales/ja/onboarding.json';
import koOnboarding from './locales/ko/onboarding.json';
import zhOnboarding from './locales/zh/onboarding.json';
import enLanding from './locales/en/landing.json';
import jaLanding from './locales/ja/landing.json';
import koLanding from './locales/ko/landing.json';
import zhLanding from './locales/zh/landing.json';
import enApp from './locales/en/app.json';
import jaApp from './locales/ja/app.json';
import koApp from './locales/ko/app.json';
import zhApp from './locales/zh/app.json';

export const SUPPORTED_LOCALES = ['en', 'ja', 'ko', 'zh'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const LAZY_NAMESPACES = [
  'tarot',
  'meanings',
  'horoscope',
  'quizzes',
  'journal',
  'premium',
  'admin',
  'blog',
] as const;

export const LOCALE_STORAGE_KEY = 'arcana_locale';

function isSupported(code: string): code is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(code);
}

/**
 * Normalise a candidate locale string ('ja-JP', 'zh-Hans-CN', 'en-US', …)
 * to one of our supported codes, or null if unsupported.
 */
export function normalizeLocale(code: string | null | undefined): SupportedLocale | null {
  if (!code) return null;
  const lower = code.toLowerCase();
  if (isSupported(lower)) return lower;
  const primary = lower.split('-')[0];
  if (isSupported(primary)) return primary;
  // Chinese variants all map to zh-CN for v1
  if (primary === 'zh') return 'zh';
  return null;
}

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon, onboarding: enOnboarding, landing: enLanding, app: enApp },
      ja: { common: jaCommon, onboarding: jaOnboarding, landing: jaLanding, app: jaApp },
      ko: { common: koCommon, onboarding: koOnboarding, landing: koLanding, app: koApp },
      zh: { common: zhCommon, onboarding: zhOnboarding, landing: zhLanding, app: zhApp },
    },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LOCALES as unknown as string[],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    ns: ['common'],
    defaultNS: 'common',
    partialBundledLanguages: true,

    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    detection: {
      // Intentionally excludes 'navigator' — users on Japanese-locale phones
      // would otherwise see a Japanese UI before they get a chance to pick.
      // English is the fallback (fallbackLng above); users opt into ja/ko/zh
      // via the onboarding language picker or settings sheet.
      order: ['querystring', 'localStorage'],
      lookupQuerystring: 'lang',
      lookupLocalStorage: LOCALE_STORAGE_KEY,
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false, // React already escapes
    },

    react: {
      useSuspense: false, // safer default — components decide per-hook
    },

    // Enable the missingKey event in DEV only. In production the HttpBackend
    // would POST to loadPath and log 404s in the console, spooking users.
    // The missingKey listener below still fires in all modes.
    saveMissing: import.meta.env.DEV,
    saveMissingTo: 'current',
    updateMissing: false,
    missingKeyHandler: undefined,
  });

/** Change language at runtime + persist to localStorage. */
export async function setLocale(locale: SupportedLocale): Promise<void> {
  await i18n.changeLanguage(locale);
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // localStorage may be unavailable (private mode); i18next state still changes
  }
}

/** Current locale, normalised. */
export function getLocale(): SupportedLocale {
  const current = normalizeLocale(i18n.language);
  return current ?? 'en';
}

// Expose a minimal i18n reference on globalThis so non-React modules
// (e.g. src/utils/authErrors.ts) can translate without import cycles.
(globalThis as unknown as {
  __arcanaI18n?: { t: (key: string, opts?: Record<string, unknown>) => string };
}).__arcanaI18n = i18n as unknown as { t: (key: string, opts?: Record<string, unknown>) => string };

// Keep <html lang="..."> in sync with the active locale so screen readers,
// Chrome's translate bar, and the browser's built-in spellcheck behave
// correctly. Runs once on init and on every language change.
function syncDocumentLang(lng: string) {
  if (typeof document === 'undefined') return;
  const normalized = normalizeLocale(lng) ?? 'en';
  document.documentElement.lang = normalized;
}
syncDocumentLang(i18n.language);
i18n.on('languageChanged', syncDocumentLang);

// Emit a GA4 event every time the user switches language so we can measure
// real-world adoption by locale. Fires once per change, regardless of how
// the change was initiated (LanguageDropdown click, programmatic setLocale,
// URL ?lang= param).
i18n.on('languageChanged', (lng: string) => {
  if (typeof window === 'undefined') return;
  try {
    const w = window as unknown as {
      gtag?: (...args: unknown[]) => void;
      dataLayer?: unknown[];
    };
    const payload = { locale: normalizeLocale(lng) ?? 'en' };
    if (typeof w.gtag === 'function') w.gtag('event', 'language_changed', payload);
    if (Array.isArray(w.dataLayer)) w.dataLayer.push({ event: 'language_changed', ...payload });
  } catch {
    // never let analytics errors interrupt the locale change
  }
});

// Log any i18next missing-key event in development + surface to Sentry in
// production so we catch untranslated strings before users do. In the wild
// the most common cause is a new UI string added in code without a
// corresponding entry in the JA/KO/ZH bundles.
i18n.on('missingKey', (lngs: readonly string[], namespace: string, key: string) => {
  const lngList = Array.from(lngs).join(',');
  const message = `[i18n] missing key: ns="${namespace}" key="${key}" lng=${lngList}`;
  if (import.meta.env.DEV) {
    console.warn(message);
  }
  // Non-blocking Sentry hook — only runs if Sentry is loaded
  try {
    const w = window as unknown as {
      Sentry?: { captureMessage: (msg: string, level?: string) => void };
    };
    w.Sentry?.captureMessage(message, 'warning');
  } catch {
    /* ignore */
  }
});

export { LAZY_NAMESPACES };
export default i18n;
