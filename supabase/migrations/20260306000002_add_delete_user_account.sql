-- ============================================================
-- Full account deletion RPC (deletes all user data + auth record)
-- Must be SECURITY DEFINER to access auth.users
-- ============================================================

CREATE OR REPLACE FUNCTION delete_user_account(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the caller is deleting their own account
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'You can only delete your own account';
  END IF;

  -- Delete child tables first (order matters for FK constraints)
  DELETE FROM achievement_shares WHERE user_id = p_user_id;
  DELETE FROM user_achievements WHERE user_id = p_user_id;
  DELETE FROM xp_activities WHERE user_id = p_user_id;
  DELETE FROM rewarded_ad_unlocks WHERE user_id = p_user_id;
  DELETE FROM ad_impressions WHERE user_id = p_user_id;
  DELETE FROM subscriptions WHERE user_id = p_user_id;
  DELETE FROM user_badges WHERE user_id = p_user_id;
  DELETE FROM user_preferences WHERE user_id = p_user_id;
  DELETE FROM content_interactions WHERE user_id = p_user_id;
  DELETE FROM daily_rituals WHERE user_id = p_user_id;
  DELETE FROM horoscope_history WHERE user_id = p_user_id;
  DELETE FROM premium_readings WHERE user_id = p_user_id;
  DELETE FROM saved_highlights WHERE user_id = p_user_id;
  DELETE FROM quiz_results WHERE user_id = p_user_id;
  -- journal_attachments cascade from journal_entries FK
  DELETE FROM journal_entries WHERE user_id = p_user_id;
  DELETE FROM tarot_readings WHERE user_id = p_user_id;
  DELETE FROM audit_events WHERE user_id = p_user_id;

  -- Delete profile last (parent record)
  DELETE FROM profiles WHERE id = p_user_id;

  -- Delete the auth.users record (requires SECURITY DEFINER)
  DELETE FROM auth.users WHERE id = p_user_id;

  RETURN true;
END;
$$;
