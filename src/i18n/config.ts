/**
 * i18next configuration — English bundled, every other locale lazy.
 *
 * Resolution order for the active language:
 *   1. ?lang=XX URL param (debug / deep-link override)
 *   2. profiles.locale (authenticated user — set via setLocale())
 *   3. localStorage 'arcana_locale' (anonymous user preference)
 *   4. 'en' fallback
 *
 * Namespaces (all five load for the active locale before the app renders):
 *   - common     — navigation, buttons, toasts, errors, validation
 *   - app        — every screen
 *   - onboarding
 *   - landing
 *   - tarot      — the translated tarot corpus (card names and meanings)
 *                  that `localizeCard.ts` reads; English needs none
 *
 * English ships in the main chunk, because it is the fallback for every
 * key in every locale and the first render must never wait for it. The
 * Japanese, Korean and Chinese bundles are dynamic imports — each is its
 * own hashed chunk (`assets/i18n-<lng>-<ns>-<hash>.js`, see vite.config.ts)
 * that only a visitor reading that language downloads. i18next asks the
 * `lazyBundleBackend` below for them: at init for the detected language
 * (main.tsx waits for `i18nReady` before mounting) and inside
 * `changeLanguage`, which emits `languageChanged` only once every
 * namespace has landed, so no screen renders a half-translated state.
 *
 * Fallback chain: all non-en locales fall back to en for missing keys so
 * an unfinished translation never surfaces a bare key to the user.
 */

import i18n, { type BackendModule, type ReadCallback, type ResourceKey } from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Bundled (shipped in main JS) — always available at boot, and the fallback
// for every other locale.
import enCommon from './locales/en/common.json';
import enOnboarding from './locales/en/onboarding.json';
import enLanding from './locales/en/landing.json';
import enApp from './locales/en/app.json';

export const SUPPORTED_LOCALES = ['en', 'ja', 'ko', 'zh'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/** The namespaces screens read with `useT()` / `t()`. */
export const UI_NAMESPACES = ['common', 'app', 'onboarding', 'landing'] as const;
/** The translated tarot corpus. Not a `t()` namespace: `localizeCard.ts` reads the bundle whole. */
export const TAROT_CORPUS_NS = 'tarot';
const NAMESPACES: string[] = [...UI_NAMESPACES, TAROT_CORPUS_NS];

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

// ---------------------------------------------------------------------------
// Lazy bundles. Each arrow is a literal `import()` so Vite can see the file
// and emit it as its own chunk; a template-string import would glob the whole
// locales folder. English is deliberately absent: it is bundled above.
// ---------------------------------------------------------------------------

type LazyLocale = Exclude<SupportedLocale, 'en'>;
type BundleLoader = () => Promise<{ default: ResourceKey }>;

const LAZY_BUNDLES: Record<LazyLocale, Record<string, BundleLoader>> = {
  ja: {
    common: () => import('./locales/ja/common.json'),
    app: () => import('./locales/ja/app.json'),
    onboarding: () => import('./locales/ja/onboarding.json'),
    landing: () => import('./locales/ja/landing.json'),
    [TAROT_CORPUS_NS]: () => import('./locales/ja/tarot.json'),
  },
  ko: {
    common: () => import('./locales/ko/common.json'),
    app: () => import('./locales/ko/app.json'),
    onboarding: () => import('./locales/ko/onboarding.json'),
    landing: () => import('./locales/ko/landing.json'),
    [TAROT_CORPUS_NS]: () => import('./locales/ko/tarot.json'),
  },
  zh: {
    common: () => import('./locales/zh/common.json'),
    app: () => import('./locales/zh/app.json'),
    onboarding: () => import('./locales/zh/onboarding.json'),
    landing: () => import('./locales/zh/landing.json'),
    [TAROT_CORPUS_NS]: () => import('./locales/zh/tarot.json'),
  },
};

/** The signatures main.tsx's stale-chunk guard reloads on. */
const STALE_CHUNK_RE = /dynamically imported module|Importing a module script failed|not a valid JavaScript MIME type/;

/**
 * An i18next backend that resolves a (language, namespace) pair to the
 * dynamic import above. i18next calls it only for bundles the store does not
 * already hold (`partialBundledLanguages`), so English never reaches it.
 */
const lazyBundleBackend: BackendModule = {
  type: 'backend',
  init() {
    /* nothing to configure */
  },
  read(language: string, namespace: string, callback: ReadCallback) {
    const locale = normalizeLocale(language);
    if (!locale || locale === 'en') {
      callback(null, {});
      return;
    }
    const load = LAZY_BUNDLES[locale][namespace];
    if (!load) {
      // Not retryable: nothing will appear for a namespace we do not ship.
      callback(new Error(`[i18n] no bundle for ${locale}/${namespace}`), false);
      return;
    }
    load().then(
      (mod) => callback(null, mod.default),
      (err: unknown) => {
        const error = err instanceof Error ? err : new Error(String(err));
        // `true` asks i18next to retry (a transient network failure).
        callback(error, true);
        // A chunk that no longer exists means this tab is on an obsolete
        // bundle. Surface it as an unhandled rejection so the stale-chunk
        // guard in main.tsx can do its one-shot reload, as it would for any
        // other missing chunk.
        if (STALE_CHUNK_RE.test(error.message)) void Promise.reject(error);
      },
    );
  },
};

const initPromise = i18n
  .use(lazyBundleBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      // The empty tarot corpus marks the namespace as present for English,
      // so i18next never asks the backend for it.
      en: { common: enCommon, onboarding: enOnboarding, landing: enLanding, app: enApp, [TAROT_CORPUS_NS]: {} },
    },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LOCALES as unknown as string[],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    ns: NAMESPACES,
    defaultNS: 'common',
    partialBundledLanguages: true,
    // One quick retry, not i18next's five with doubling waits: a chunk that
    // failed once is in the browser's module map as failed anyway, and the
    // app must not sit on a blank screen for eleven seconds before English.
    maxRetries: 1,
    retryTimeout: 300,

    detection: {
      // Intentionally excludes 'navigator' — users on Japanese-locale phones
      // would otherwise see a Japanese UI before they get a chance to pick.
      // English is the fallback (fallbackLng above); users opt into ja/ko/zh
      // via the onboarding language picker or settings sheet.
      //
      // The inline preload script vite.config.ts injects into index.html
      // mirrors this order (?lang, then localStorage) to start fetching the
      // locale chunks before the main bundle has even parsed.
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

    // Enable the missingKey event in DEV only; the listener below logs it.
    // The backend has no `create`, so nothing is ever POSTed anywhere.
    saveMissing: import.meta.env.DEV,
    saveMissingTo: 'current',
    updateMissing: false,
    missingKeyHandler: undefined,
  });

/**
 * Resolves once the detected language's bundles are in the store. For
 * English that is already true when this module finishes evaluating
 * (`i18n.isInitialized`), so main.tsx mounts synchronously; for ja/ko/zh it
 * waits for the lazy chunks. Never rejects: a failed bundle falls back to
 * English and the app still renders.
 */
export const i18nReady: Promise<void> = initPromise.then(
  () => undefined,
  () => undefined,
);

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

// CJK faces load per locale, not for everyone. The Latin faces are
// self-hosted (see index.css); Noto Sans / Serif JP, KR and SC are large,
// so each is fetched from Google Fonts only once the user is actually
// reading in that language. Offline Android falls back to the system's
// own Noto CJK, which is what the stacks name anyway.
const CJK_FONTS: Record<string, string> = {
  ja: 'family=Noto+Sans+JP:wght@400;500;600&family=Noto+Serif+JP:wght@500;600',
  ko: 'family=Noto+Sans+KR:wght@400;500;600&family=Noto+Serif+KR:wght@500;600',
  zh: 'family=Noto+Sans+SC:wght@400;500;600&family=Noto+Serif+SC:wght@500;600',
};
function loadCjkFonts(lng: string) {
  if (typeof document === 'undefined') return;
  const locale = normalizeLocale(lng) ?? 'en';
  const query = CJK_FONTS[locale];
  if (!query) return;
  const id = `arcana-font-${locale}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?${query}&display=swap`;
  document.head.appendChild(link);
}
loadCjkFonts(i18n.language);
i18n.on('languageChanged', loadCjkFonts);

// Emit a GA4 event every time the user switches language so we can measure
// real-world adoption by locale. Fires once per change, regardless of how
// the change was initiated (LanguageDropdown click, programmatic setLocale,
// URL ?lang= param).
//
// Not on the language i18next settles on at init. i18next emits
// `languageChanged` from inside init too, before it flips `isInitialized`
// (changeLanguage's `done` emits, then the init callback sets the flag).
// While every locale was bundled, init finished synchronously and that
// first event had no listener yet; now that ja/ko/zh wait for their lazy
// chunks it arrives here — and a returning Japanese reader would otherwise
// log a "language change" on every cold start.
i18n.on('languageChanged', (lng: string) => {
  if (typeof window === 'undefined') return;
  if (!i18n.isInitialized) return;
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

export default i18n;
