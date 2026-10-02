import { isNative } from '../utils/platform';
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
//   v1  tarot only: s (spread), c (cards), q, d
//   v2  adds `k` — the deck the ids belong to. 'p' is the playing deck
//       (ids 100..153, src/data/cartomancy); absent means tarot. A v1 link
//       still decodes: the recipient's page reads the deck from `k`, or
//       from a `carto-` spread slug for a link made before `k` existed.
//
// Inspired by Labyrinthos's URL-shareable readings — every shared reading
// is an organic acquisition surface, since the recipient lands on
// tarotlife.app already inside a meaningful experience.

const VERSION = 2;
const ACCEPTED_VERSIONS: ReadonlySet<number> = new Set([1, 2]);

export type SharedDeckKind = 'p';

export interface SharedReadingPayload {
  v: number;                          // schema version
  s: string;                          // spread slug (e.g. "three-card-past-present-future", "carto-wish")
  c: Array<[number, 0 | 1]>;          // [cardId, reversedFlag] pairs in position order
  q?: string;                         // optional question (truncated to 200 chars)
  d?: string;                         // optional ISO date the reading was created
  k?: SharedDeckKind;                 // 'p' = playing deck; absent = tarot (v2)
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
  const payload: SharedReadingPayload = {
    v: VERSION,
    s: input.spreadSlug,
    c: input.cards.map((c) => [c.id, c.reversed ? 1 : 0]),
    ...(input.question ? { q: input.question.slice(0, 200) } : {}),
    ...(input.date ? { d: input.date } : {}),
    ...(input.kind === 'playing' ? { k: 'p' as const } : {}),
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
 * The link a reading is shared under. Inside the Android app the page's
 * origin is the Capacitor shell (https://localhost), which used to leak
 * into the share text now that native sharing exists; only a public
 * tarotlife.app origin (or a local dev server) is trusted, everything else
 * gets the canonical domain.
 */
export function buildShareUrl(token: string): string {
  const here = typeof window !== 'undefined' ? window.location.origin : '';
  const trusted = !isNative() && /^(https:\/\/(www\.)?tarotlife\.app|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/.test(here);
  return `${trusted ? here : CANONICAL_ORIGIN}/reading/${token}`;
}
