-- Fix get_user_achievement_stats: nested aggregate error
DROP FUNCTION IF EXISTS get_user_achievement_stats(uuid);

CREATE OR REPLACE FUNCTION get_user_achievement_stats(
  p_user_id uuid
) RETURNS TABLE (
  total_achievements bigint,
  unlocked_achievements bigint,
  completion_percentage numeric,
  total_xp_from_achievements bigint,
  category_stats jsonb,
  rarity_stats jsonb
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total bigint;
  v_unlocked bigint;
  v_total_xp bigint;
  v_cat_stats jsonb;
  v_rar_stats jsonb;
BEGIN
  SELECT
    COUNT(a.id),
    COUNT(ua.unlocked_at),
    COALESCE(SUM(CASE WHEN ua.unlocked_at IS NOT NULL THEN a.xp_reward ELSE 0 END), 0)
  INTO v_total, v_unlocked, v_total_xp
  FROM achievements a
  LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = p_user_id
  WHERE a.is_active = true;

  SELECT COALESCE(jsonb_object_agg(cat, obj), '{}'::jsonb)
  INTO v_cat_stats
  FROM (
    SELECT
      a.category::text AS cat,
      jsonb_build_object('total', COUNT(a.id), 'unlocked', COUNT(ua.unlocked_at)) AS obj
    FROM achievements a
    LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = p_user_id
    WHERE a.is_active = true
    GROUP BY a.category
  ) sub;

  SELECT COALESCE(jsonb_object_agg(rar, obj), '{}'::jsonb)
  INTO v_rar_stats
  FROM (
    SELECT
      a.rarity::text AS rar,
      jsonb_build_object('total', COUNT(a.id), 'unlocked', COUNT(ua.unlocked_at)) AS obj
    FROM achievements a
    LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = p_user_id
    WHERE a.is_active = true
    GROUP BY a.rarity
  ) sub;

  RETURN QUERY SELECT
    v_total,
    v_unlocked,
    CASE WHEN v_total > 0 THEN ROUND((v_unlocked::numeric / v_total::numeric) * 100, 1) ELSE 0::numeric END,
    v_total_xp,
    v_cat_stats,
    v_rar_stats;
END;
$$;
