// URL-shareable tarot readings.
//
// Encodes a reading (cards + reversed flags + spread + optional question)
// into a compact URL-safe string so users can share their reading via a
// link instead of a screenshot. The decoder reconstructs the reading
// state on the recipient's device.
//
// Format: base64url(JSON.stringify(payload))
// Payload schema versioned with `v` so the decoder can evolve safely.
//
// Inspired by Labyrinthos's URL-shareable readings — every shared reading
// is an organic acquisition surface, since the recipient lands on
// tarotlife.app already inside a meaningful experience.

const VERSION = 1;

export interface SharedReadingPayload {
  v: number;                          // schema version
  s: string;                          // spread slug (e.g. "three-card-past-present-future")
  c: Array<[number, 0 | 1]>;          // [cardId, reversedFlag] pairs in position order
  q?: string;                         // optional question (truncated to 200 chars)
  d?: string;                         // optional ISO date the reading was created
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
}): string {
  const payload: SharedReadingPayload = {
    v: VERSION,
    s: input.spreadSlug,
    c: input.cards.map((c) => [c.id, c.reversed ? 1 : 0]),
    ...(input.question ? { q: input.question.slice(0, 200) } : {}),
    ...(input.date ? { d: input.date } : {}),
  };
  return toBase64Url(JSON.stringify(payload));
}

export function decodeReading(token: string): SharedReadingPayload | null {
  try {
    const json = fromBase64Url(token);
    const parsed = JSON.parse(json) as SharedReadingPayload;
    if (parsed.v !== VERSION) return null;
    if (typeof parsed.s !== 'string') return null;
    if (!Array.isArray(parsed.c)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function buildShareUrl(token: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://tarotlife.app';
  return `${origin}/reading/${token}`;
}
