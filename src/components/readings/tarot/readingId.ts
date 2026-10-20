/**
 * One id per drawn reading, sent as its AI interpretation's `requestId`.
 *
 * generate-reading debits a free reader under (requestId, request body): a
 * second request for the same reading — a double tap that got past the
 * button, a retry after a dropped connection — is a replay of the first.
 * It is never charged again; it gets the first run's text, or waits for it
 * while that run is still going (supabase/functions/_shared/spend-replay.ts).
 * `generatePremiumReading` mints a fresh id on every call it is given none,
 * so each tap was a new, charged request: a double tap bought two
 * interpretations of one reading (p8 F09).
 *
 * Mint one when the cards are dealt and pass it with every request for
 * that reading. The server takes RFC 4122 UUIDs only.
 */
export function newReadingId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  // WebViews without randomUUID (it needs Chrome 92): a v4 UUID by hand.
  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === 'function') c.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
