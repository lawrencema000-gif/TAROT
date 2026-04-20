import { supabase } from '../lib/supabase';
import { captureException } from '../utils/telemetry';
import type { Result } from './dailyRituals';

export interface RewardedAdUnlockInsert {
  userId: string;
  feature: string;
  spreadType: string | null;
  adUnitId: string;
}

export async function insert(input: RewardedAdUnlockInsert): Promise<Result<void>> {
  const { error } = await supabase.from('rewarded_ad_unlocks').insert({
    user_id: input.userId,
    feature: input.feature,
    spread_type: input.spreadType,
    ad_unit_id: input.adUnitId,
  });
  if (error) {
    captureException('dal.rewardedAdUnlocks.insert', error, {
      userId: input.userId,
      feature: input.feature,
    });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: undefined };
}

export async function hasActiveUnused(
  userId: string,
  feature: string,
  spreadType?: string,
): Promise<Result<boolean>> {
  let query = supabase
    .from('rewarded_ad_unlocks')
    .select('id')
    .eq('user_id', userId)
    .eq('feature', feature)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString());

  if (spreadType) {
    query = query.eq('spread_type', spreadType);
  }

  const { data, error } = await query.limit(1).maybeSingle();
  if (error) {
    captureException('dal.rewardedAdUnlocks.hasActiveUnused', error, {
      userId,
      feature,
      spreadType,
    });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: !!data };
}

export async function findOldestUnused(
  userId: string,
  feature: string,
  spreadType?: string,
): Promise<Result<{ id: string } | null>> {
  let query = supabase
    .from('rewarded_ad_unlocks')
    .select('id')
    .eq('user_id', userId)
    .eq('feature', feature)
    .eq('used', false);

  if (spreadType) {
    query = query.eq('spread_type', spreadType);
  }

  const { data, error } = await query
    .order('unlocked_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    captureException('dal.rewardedAdUnlocks.findOldestUnused', error, {
      userId,
      feature,
      spreadType,
    });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: data ? { id: data.id as string } : null };
}

export async function markUsed(id: string): Promise<Result<void>> {
  const { error } = await supabase
    .from('rewarded_ad_unlocks')
    .update({ used: true })
    .eq('id', id);
  if (error) {
    captureException('dal.rewardedAdUnlocks.markUsed', error, { id });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: undefined };
}
