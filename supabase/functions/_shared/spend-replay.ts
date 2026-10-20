/**
 * The pure half of the handler's Moonstone spend: how a request maps to the
 * key its debit is idempotent on, and what a replay of that key gets back.
 * No Deno, no network — exercised from Node by src/test/golden/spend-replay.test.ts.
 *
 * Two kinds of key:
 *
 *  - REQUEST keys (`rq:<requestId>:<body digest>[:n]`). A client that retries
 *    after a dropped connection sends the same requestId and body. A
 *    duplicate key is a REPLAY of a request that was already charged: it is
 *    never charged again, never runs the model again and never refunds — it
 *    gets the stored response of the first run, or 409 while that run is
 *    still in flight. (Before 2026-10-03 a replay re-ran `run` for free, and
 *    a replay that failed refunded the reading already delivered — p7 #31.)
 *    `:n` is the n-th retry after n refunded attempts: a refunded attempt
 *    delivered nothing, so the next one is a new, charged request.
 *
 *  - SESSION keys (`ss:<scope>[:n]`). One charge covers every request in the
 *    same session for `ttlMs` — the companion charges once per conversation.
 *    A duplicate session key is a CONTINUATION: it runs, free, and a failed
 *    continuation refunds nothing (it was never charged). A session whose
 *    charge was refunded, or is older than the TTL, starts a new charge.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `body.requestId` when it is a UUID; anything else is ignored, never used as a key. */
export function extractRequestId(body: unknown): string | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const v = (body as Record<string, unknown>).requestId;
  return typeof v === "string" && UUID_RE.test(v) ? v.toLowerCase() : null;
}

/** JSON with object keys sorted, so the same request always hashes the same. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj).sort()
    .filter((k) => obj[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",")}}`;
}

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** `rq:<requestId>:<first 32 hex of sha256(fn, action, body)>`. */
export async function requestKeyBase(
  requestId: string,
  fn: string,
  actionKey: string,
  body: unknown,
): Promise<string> {
  // The request id is already in the key; leave it out of the digest so a
  // schema that strips it and one that keeps it hash the same body.
  const rest = body && typeof body === "object" && !Array.isArray(body)
    ? Object.fromEntries(Object.entries(body as Record<string, unknown>).filter(([k]) => k !== "requestId"))
    : body;
  const digest = await sha256Hex(`${fn}\n${actionKey}\n${stableStringify(rest)}`);
  return `rq:${requestId}:${digest.slice(0, 32)}`;
}

/** After `refunds` refunded attempts under `base`, the next attempt's key. */
export function requestKeyAfterRefunds(base: string, refunds: number): string {
  return refunds > 0 ? `${base}:${refunds}` : base;
}

/** Session scope → the base of its key. Bounded and free of LIKE wildcards. */
export function sessionKeyBase(fn: string, scope: string): string {
  const clean = scope.replace(/[^A-Za-z0-9:._-]/g, "").slice(0, 120);
  return `ss:${fn}:${clean}`;
}

/** One row of what the ledger knows about a key family. */
export interface SpendLedgerRow {
  /** The idempotency key (moonstone_transactions.reference / premium_action_log.idempotency_key). */
  key: string;
  /** 'charge' — a pay-per-action debit or a premium soft-cap log; 'refund' — its compensating credit. */
  kind: "charge" | "refund";
  /** When the row was written (ISO). */
  at: string;
}

function suffixOf(base: string, key: string): number | null {
  if (key === base) return 0;
  if (!key.startsWith(`${base}:`)) return null;
  const n = Number(key.slice(base.length + 1));
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * The key a session request is charged under, and whether it continues a
 * live session (already charged, not refunded, younger than `ttlMs`).
 */
export function sessionKeyFromLedger(
  base: string,
  rows: SpendLedgerRow[],
  now: number,
  ttlMs: number,
): { key: string; continuing: boolean } {
  let latest = -1;
  for (const r of rows) {
    const n = suffixOf(base, r.key);
    if (n !== null && n > latest) latest = n;
  }
  if (latest < 0) return { key: base, continuing: false };
  const key = latest === 0 ? base : `${base}:${latest}`;
  const charge = rows.find((r) => r.key === key && r.kind === "charge");
  const refunded = rows.some((r) => r.key === key && r.kind === "refund");
  const age = charge ? now - Date.parse(charge.at) : Infinity;
  if (charge && !refunded && age >= 0 && age < ttlMs) return { key, continuing: true };
  return { key: `${base}:${latest + 1}`, continuing: false };
}

/** Where a request key's response is stored for replays (shared ai_response_cache, namespaced). */
export async function replayStoreKey(userId: string, spendKey: string): Promise<string> {
  return `spend-replay:${await sha256Hex(`${userId}\n${spendKey}`)}`;
}

/** What a replay gets back: the first run's envelope payload or its raw Response. */
export type StoredResponse =
  | { kind: "data"; value: unknown }
  | { kind: "raw"; status: number; contentType: string; body: string };

export function isStoredResponse(v: unknown): v is StoredResponse {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (o.kind === "data") return "value" in o;
  return o.kind === "raw" && typeof o.status === "number" && typeof o.body === "string";
}

/**
 * Was this call the one that charged? The spend RPC says so in `charged`
 * (20261003000011). Against a database without that column, fall back to
 * what the ledger held before the call: a key that already had a charge
 * row is a duplicate.
 */
export function chargedByThisCall(row: Record<string, unknown> | null | undefined, preexisting: boolean): boolean {
  if (row && typeof row.charged === "boolean") return row.charged;
  return !preexisting;
}
