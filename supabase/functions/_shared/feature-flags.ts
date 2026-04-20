/**
 * Server-side feature-flag evaluator for edge functions.
 *
 * Mirrors the client-side evaluator in `src/utils/featureFlagEval.ts` so
 * both environments produce identical bucket results for the same user.
 * Edge functions fetch the flag row once per invocation (cached 60 seconds
 * in-isolate) and evaluate locally; no round-trip per flag-dependent
 * decision.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";

interface FlagRow {
  key: string;
  enabled: boolean;
  rollout_percent: number;
  allowed_user_ids: string[] | null;
}

type CacheEntry = { row: FlagRow | null; expiresAt: number };
const CACHE: Map<string, CacheEntry> = new Map();
const CACHE_TTL_MS = 60 * 1000;

/** Stable 32-bit FNV-1a hash — same algorithm as the client. */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function bucket(userId: string, key: string): number {
  return fnv1a(`${userId}:${key}`) % 100;
}

/**
 * Return true if the named flag is ON for the given user. Safe default
 * (false) on any DB error — flags fail closed server-side so a bad flag
 * fetch never auto-enables an expensive feature.
 */
export async function isFlagEnabled(
  supabase: SupabaseClient,
  key: string,
  userId: string | null,
): Promise<boolean> {
  const now = Date.now();
  let entry = CACHE.get(key);

  if (!entry || entry.expiresAt < now) {
    const { data, error } = await supabase
      .from("feature_flags")
      .select("key, enabled, rollout_percent, allowed_user_ids")
      .eq("key", key)
      .maybeSingle();
    entry = {
      row: (error || !data)
        ? null
        : {
          key: data.key,
          enabled: !!data.enabled,
          rollout_percent: Number(data.rollout_percent ?? 0),
          allowed_user_ids: Array.isArray(data.allowed_user_ids) ? data.allowed_user_ids : [],
        },
      expiresAt: now + CACHE_TTL_MS,
    };
    CACHE.set(key, entry);
  }

  const flag = entry.row;
  if (!flag) return false;
  if (userId && flag.allowed_user_ids?.includes(userId)) return true;
  if (flag.enabled && flag.rollout_percent >= 100) return true;
  if (flag.rollout_percent > 0 && userId) {
    return bucket(userId, key) < flag.rollout_percent;
  }
  return false;
}

/** Test-only helper to bust the cache between test runs. */
export function _clearFlagCache(): void {
  CACHE.clear();
}
