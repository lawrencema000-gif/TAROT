import { isNative } from '../utils/platform';
import i18n, { getLocale, normalizeLocale, LOCALE_STORAGE_KEY, type SupportedLocale } from '../i18n/config';
// URL-shareable readings.
//
// Encodes a reading (cards + reversed flags + spread + optional question)
// into a compact URL-safe string so users can share their reading via a
// link instead of a screenshot. The decoder reconstructs the reading
// state on the recipient's device.
//
// Format: base64url(JSON.stringify(payload))
// Payload schema versioned with `v` so the decoder can evolve safely.
//
//   v1  tarot: s (spread), c (cards), q, d. Every tarot reading is still
//       emitted as v1, byte for byte the shape the app has always made:
//       an installed Android build owns tarotlife.app/reading through App
//       Links, and its decoder returns null for any `v` other than 1. Raising
//       the version for a payload that did not change would break every link
//       opened in an app that has not updated yet.
//   v2  a playing-card reading: v1's fields plus `k: 'p'` — the ids are the
//       playing deck's (100..153, src/data/cartomancy). An older app cannot
//       draw those cards, so it is meant to refuse them as "from a newer
//       version" rather than lay tarot cards for them.
//   The decoder accepts both, and tells a playing-card link made before `k`
//   existed by its `carto-` spread slug.
//
// Inspired by Labyrinthos's URL-shareable readings — every shared reading
// is an organic acquisition surface, since the recipient lands on
// tarotlife.app already inside a meaningful experience.

/** The version a tarot payload carries: the shape every app build reads. */
export const TAROT_SHARE_VERSION = 1;
/** The version a playing-card payload carries (adds `k`). */
export const PLAYING_SHARE_VERSION = 2;
const ACCEPTED_VERSIONS: ReadonlySet<number> = new Set([TAROT_SHARE_VERSION, PLAYING_SHARE_VERSION]);

export type SharedDeckKind = 'p';

export interface SharedReadingPayload {
  v: number;                          // schema version
  s: string;                          // spread slug (e.g. "three-card-past-present-future", "carto-wish")
  c: Array<[number, 0 | 1]>;          // [cardId, reversedFlag] pairs in position order
  q?: string;                         // optional question (truncated to 200 chars)
  d?: string;                         // optional ISO date the reading was created
  k?: SharedDeckKind;                 // 'p' = playing deck (v2 only); absent = tarot (v1)
}

function toBase64Url(s: string): string {
  if (typeof window === 'undefined') return '';
  const b64 = window.btoa(unescape(encodeURIComponent(s)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): string {
  if (typeof window === 'undefined') return '';
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  return decodeURIComponent(escape(window.atob(b64)));
}

export function encodeReading(input: {
  spreadSlug: string;
  cards: Array<{ id: number; reversed: boolean }>;
  question?: string;
  date?: string;
  /** 'playing' marks the ids as the playing deck's. Default tarot. */
  kind?: 'tarot' | 'playing';
}): string {
  const playing = input.kind === 'playing';
  // Key order is part of the contract: a tarot token must stay identical to
  // what pre-Phase-7 builds emitted (v, s, c, q?, d?).
  const payload: SharedReadingPayload = {
    v: playing ? PLAYING_SHARE_VERSION : TAROT_SHARE_VERSION,
    s: input.spreadSlug,
    c: input.cards.map((c) => [c.id, c.reversed ? 1 : 0]),
    ...(input.question ? { q: input.question.slice(0, 200) } : {}),
    ...(input.date ? { d: input.date } : {}),
    ...(playing ? { k: 'p' as const } : {}),
  };
  return toBase64Url(JSON.stringify(payload));
}

export function decodeReading(token: string): SharedReadingPayload | null {
  try {
    const json = fromBase64Url(token);
    const parsed = JSON.parse(json) as SharedReadingPayload;
    if (!ACCEPTED_VERSIONS.has(parsed.v)) return null;
    if (typeof parsed.s !== 'string') return null;
    if (!Array.isArray(parsed.c)) return null;
    if (parsed.k !== undefined && parsed.k !== 'p') return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Which deck a shared reading's ids belong to. A pre-`k` playing-card link is told by its spread slug. */
export function sharedDeck(payload: SharedReadingPayload): 'tarot' | 'playing' {
  return payload.k === 'p' || payload.s.startsWith('carto-') ? 'playing' : 'tarot';
}

const CANONICAL_ORIGIN = 'https://tarotlife.app';

/**
 * The query parameter a share link names its reading's language with
 * (`?hl=ja`). Outside the token, so the token stays byte for byte what
 * every app build decodes. Not `lang`: `?lang=` is the app-wide language
 * preference — the language detector reads it at boot and stores it — and
 * opening a friend's link must not switch the reader's own app, nor (in an
 * installed build, which reads `lang` the same way) their profile.
 */
export const SHARE_LOCALE_PARAM = 'hl';

/**
 * The link a reading is shared under. Inside the Android app the page's
 * origin is the Capacitor shell (https://localhost), which used to leak
 * into the share text now that native sharing exists; only a public
 * tarotlife.app origin (or a local dev server) is trusted, everything else
 * gets the canonical domain.
 *
 * A reading shared in Japanese, Korean or Chinese names its language
 * (`?hl=`), so the shared page can open in it for a visitor who has not
 * chosen one (SharedReadingPage): the i18n detector ignores the browser's
 * language by design, and the link was the only place left to carry it
 * (p8 F76). English needs no parameter; it is the default.
 */
export function buildShareUrl(token: string, locale: SupportedLocale = getLocale()): string {
  const here = typeof window !== 'undefined' ? window.location.origin : '';
  const trusted = !isNative() && /^(https:\/\/(www\.)?tarotlife\.app|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/.test(here);
  const query = locale !== 'en' ? `?${SHARE_LOCALE_PARAM}=${locale}` : '';
  return `${trusted ? here : CANONICAL_ORIGIN}/reading/${token}${query}`;
}

/** The language a share link was made in (`?hl=`), when it names one other than English. */
export function sharedReadingLocale(search: string): SupportedLocale | null {
  let raw: string | null = null;
  try {
    raw = new URLSearchParams(search).get(SHARE_LOCALE_PARAM);
  } catch {
    return null;
  }
  const locale = normalizeLocale(raw);
  return locale && locale !== 'en' ? locale : null;
}

/** Calls of showVisitIn still running, and the stored language the first of them found. */
let visitSwitches = 0;
let storedBeforeVisit: string | null = null;

/**
 * Show the rest of this visit in `locale` without making it the reader's
 * language. i18next stores every language it changes to (the detector's
 * localStorage cache), so the stored choice is put back as it was: a reload,
 * or the next visit, opens in the reader's own language again. Overlapping
 * calls (a remount) put back what the first one found, not each other's.
 */
export async function showVisitIn(locale: SupportedLocale): Promise<void> {
  if (visitSwitches === 0) {
    storedBeforeVisit = null;
    try {
      storedBeforeVisit = localStorage.getItem(LOCALE_STORAGE_KEY);
    } catch {
      // Storage blocked: nothing is stored either way.
    }
  }
  visitSwitches++;
  try {
    await i18n.changeLanguage(locale);
  } finally {
    visitSwitches--;
    try {
      if (storedBeforeVisit === null) localStorage.removeItem(LOCALE_STORAGE_KEY);
      else localStorage.setItem(LOCALE_STORAGE_KEY, storedBeforeVisit);
    } catch {
      // Storage blocked.
    }
  }
}
