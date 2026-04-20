import { supabase } from '../lib/supabase';
import { captureException } from '../utils/telemetry';

export interface FeatureFlag {
  key: string;
  description: string | null;
  enabled: boolean;
  rolloutPercent: number;
  allowedUserIds: string[];
  updatedAt: string;
}

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Fetch all feature flags. Public-read via RLS so anon callers get them too.
 * Called once at app boot via FeatureFlagProvider and cached; the provider
 * refreshes every 5 minutes in the background.
 */
export async function fetchAll(): Promise<Result<FeatureFlag[]>> {
  const { data, error } = await supabase
    .from('feature_flags')
    .select('key, description, enabled, rollout_percent, allowed_user_ids, updated_at');

  if (error) {
    captureException('dal.featureFlags.fetchAll', error);
    return { ok: false, error: error.message };
  }
  return {
    ok: true,
    data: (data ?? []).map((r) => ({
      key: r.key,
      description: r.description,
      enabled: !!r.enabled,
      rolloutPercent: Number(r.rollout_percent ?? 0),
      allowedUserIds: Array.isArray(r.allowed_user_ids) ? r.allowed_user_ids : [],
      updatedAt: r.updated_at,
    })),
  };
}
