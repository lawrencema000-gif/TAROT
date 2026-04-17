/**
 * Lightweight in-memory rate limiter for edge functions.
 * Uses a sliding-window counter keyed by caller identity (user id or IP).
 *
 * Note: Supabase edge functions run as isolates. State is shared within an
 * isolate but not across them — so this is a first-line defense against burst
 * attacks on a single isolate, layered on top of Supabase's global platform
 * limits. For cross-isolate enforcement, use a DB-backed counter.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Periodic cleanup of expired buckets to cap memory growth. */
function sweep(now: number): void {
  if (buckets.size < 5000) return;
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key);
  }
}

/** Best-effort caller identity — user id if authed, otherwise client IP. */
export function callerKey(req: Request, userId?: string | null): string {
  if (userId) return `u:${userId}`;
  const fwd = req.headers.get("x-forwarded-for") || "";
  const ip = fwd.split(",")[0].trim() || req.headers.get("cf-connecting-ip") || "anon";
  return `ip:${ip}`;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number;
  retryAfterSeconds: number;
}

/**
 * Fixed-window rate limit check.
 * @param key   caller identity (user id or IP)
 * @param limit max requests per window
 * @param windowMs window length in ms
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;
  const remaining = Math.max(0, limit - bucket.count);
  const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);

  return {
    allowed: bucket.count <= limit,
    remaining,
    limit,
    resetAt: bucket.resetAt,
    retryAfterSeconds,
  };
}

/** Build 429 response headers from a rate-limit result. */
export function rateLimitHeaders(r: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(r.limit),
    "X-RateLimit-Remaining": String(r.remaining),
    "X-RateLimit-Reset": String(Math.ceil(r.resetAt / 1000)),
    "Retry-After": String(r.retryAfterSeconds),
  };
}
