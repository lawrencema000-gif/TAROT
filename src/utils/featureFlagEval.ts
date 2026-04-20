import type { FeatureFlag } from '../dal/featureFlags';

/**
 * Deterministic feature-flag evaluator. Lives outside the hook so it can
 * be unit-tested cheaply and reused by any non-React caller (a service,
 * a CLI audit script, or the edge-function equivalent in Deno).
 *
 * Evaluation order (first match wins):
 *   1. URL query-string override `?ff_<key>=on|off` (local testing)
 *   2. User is in `allowed_user_ids` -> ON
 *   3. Flag is globally `enabled` AND `rollout_percent` >= 100 -> ON
 *   4. `rollout_percent` > 0 AND deterministic bucket(user, key) < percent -> ON
 *   5. Otherwise OFF
 *
 * The bucket is a stable 32-bit FNV-1a hash of `${userId}:${key}` mod 100.
 * Same user + same flag = same bucket across sessions, so a user won't flip
 * in and out of a 10% rollout between page loads.
 */

/** 32-bit FNV-1a. Stable; no crypto import. */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function userBucket(userId: string, flagKey: string): number {
  return fnv1a(`${userId}:${flagKey}`) % 100;
}

export interface EvalContext {
  /** Authenticated user id, or null for anon visitors. */
  userId: string | null;
  /** Stable visitor id for anon callers. */
  anonymousId?: string | null;
  /** URL query-string overrides, e.g. `?ff_new-paywall=on`. */
  queryOverrides?: Record<string, string>;
}

export function evaluate(flag: FeatureFlag, ctx: EvalContext): boolean {
  const override = ctx.queryOverrides?.[`ff_${flag.key}`];
  if (override === 'on') return true;
  if (override === 'off') return false;

  if (ctx.userId && flag.allowedUserIds.includes(ctx.userId)) return true;

  if (flag.enabled && flag.rolloutPercent >= 100) return true;

  if (flag.rolloutPercent > 0) {
    const subject = ctx.userId ?? ctx.anonymousId ?? '';
    if (!subject) return false;
    return userBucket(subject, flag.key) < flag.rolloutPercent;
  }

  return false;
}

/** Parse `?ff_<key>=on|off` pairs out of a URL search string. */
export function parseQueryOverrides(search: string): Record<string, string> {
  const out: Record<string, string> = {};
  const params = new URLSearchParams(search);
  params.forEach((value, key) => {
    if (key.startsWith('ff_')) out[key] = value.toLowerCase();
  });
  return out;
}
