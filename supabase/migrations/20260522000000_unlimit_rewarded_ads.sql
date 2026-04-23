-- ============================================================================
-- Remove the daily 5/day rewarded-ad cap
-- ============================================================================
-- Business decision: unlimited rewarded-ad unlocks. The stats RPC used to
-- compute `rewardedRemaining = 5 - watched_today` — patching to always
-- return a high sentinel (999999) so the client treats ads as always
-- available. A future switch back to a capped model only requires updating
-- this one function.
--
-- `rewardedWatched` stays honest so the admin dashboard can still see
-- actual engagement numbers.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_daily_ad_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_stats jsonb;
  v_sentinel integer := 999999;
BEGIN
  SELECT jsonb_build_object(
    'date', v_today,
    'totalImpressions', COUNT(*),
    'rewardedWatched', COUNT(*) FILTER (WHERE ad_type = 'rewarded' AND completed = true),
    -- Unlimited: client uses `rewardedRemaining > 0` as the gate, so a
    -- high sentinel makes ads always available.
    'rewardedRemaining', v_sentinel,
    'byType', jsonb_build_object(
      'banner', COUNT(*) FILTER (WHERE ad_type = 'banner'),
      'interstitial', COUNT(*) FILTER (WHERE ad_type = 'interstitial'),
      'rewarded', COUNT(*) FILTER (WHERE ad_type = 'rewarded'),
      'app_open', COUNT(*) FILTER (WHERE ad_type = 'app_open')
    )
  ) INTO v_stats
  FROM public.ad_impressions
  WHERE user_id = p_user_id
    AND created_at::date = v_today;

  RETURN COALESCE(v_stats, jsonb_build_object(
    'date', v_today,
    'totalImpressions', 0,
    'rewardedWatched', 0,
    'rewardedRemaining', v_sentinel,
    'byType', jsonb_build_object(
      'banner', 0,
      'interstitial', 0,
      'rewarded', 0,
      'app_open', 0
    )
  ));
END;
$$;
