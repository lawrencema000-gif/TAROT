/*
  # Fix achievements, XP, and streak system

  1. Schema Changes
    - Add `last_ritual_date` column to `profiles` table (date, nullable)
    - Expand `xp_activities.activity_type` CHECK constraint to include `reading_complete` and `horoscope_viewed`

  2. Function Changes
    - Replace `check_achievement_progress` to fix streak increment bug
      (now uses SET instead of ADD for streak_achieved activity type)
    - Update `check_achievement_progress` to recalculate level after awarding XP
    - Add `check_level_milestones` function to check level/rank/xp achievements

  3. Security
    - No RLS changes needed (existing policies cover new column)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_ritual_date'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_ritual_date date;
  END IF;
END $$;

ALTER TABLE xp_activities DROP CONSTRAINT IF EXISTS xp_activities_activity_type_check;

ALTER TABLE xp_activities ADD CONSTRAINT xp_activities_activity_type_check
  CHECK (activity_type = ANY (ARRAY[
    'ritual_complete'::text,
    'reading_saved'::text,
    'reading_complete'::text,
    'journal_entry'::text,
    'quiz_complete'::text,
    'horoscope_viewed'::text,
    'streak_milestone_7'::text,
    'streak_milestone_30'::text,
    'streak_milestone_100'::text,
    'streak_milestone_365'::text
  ]));

CREATE OR REPLACE FUNCTION public.check_achievement_progress(
  p_user_id uuid,
  p_activity_type text,
  p_increment integer DEFAULT 1
)
RETURNS TABLE(
  achievement_id uuid,
  achievement_name text,
  xp_reward integer,
  rarity achievement_rarity,
  newly_unlocked boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_achievement RECORD;
  v_current_progress integer;
  v_target integer;
  v_new_xp integer;
  v_new_level integer;
  v_new_rank text;
BEGIN
  FOR v_achievement IN
    SELECT a.*
    FROM achievements a
    WHERE a.is_active = true
    AND (
      a.unlock_condition->>'activity_type' = p_activity_type
      OR a.unlock_condition->>'trigger' = p_activity_type
    )
  LOOP
    INSERT INTO user_achievements (user_id, achievement_id, target)
    VALUES (
      p_user_id,
      v_achievement.id,
      COALESCE((v_achievement.unlock_condition->>'target')::integer, 1)
    )
    ON CONFLICT (user_id, achievement_id) DO NOTHING;

    SELECT ua.progress, ua.target INTO v_current_progress, v_target
    FROM user_achievements ua
    WHERE ua.user_id = p_user_id AND ua.achievement_id = v_achievement.id;

    IF EXISTS (
      SELECT 1 FROM user_achievements ua
      WHERE ua.user_id = p_user_id
      AND ua.achievement_id = v_achievement.id
      AND ua.unlocked_at IS NOT NULL
    ) THEN
      CONTINUE;
    END IF;

    IF p_activity_type = 'streak_achieved' THEN
      UPDATE user_achievements
      SET progress = p_increment, updated_at = now()
      WHERE user_id = p_user_id AND achievement_id = v_achievement.id;

      IF p_increment >= v_target THEN
        UPDATE user_achievements
        SET unlocked_at = now(), progress = v_target
        WHERE user_id = p_user_id AND achievement_id = v_achievement.id;

        UPDATE profiles
        SET xp = COALESCE(xp, 0) + v_achievement.xp_reward
        WHERE id = p_user_id
        RETURNING xp INTO v_new_xp;

        v_new_level := calculate_level_from_xp(v_new_xp);
        v_new_rank := get_seeker_rank(v_new_level);
        UPDATE profiles SET level = v_new_level, seeker_rank = v_new_rank WHERE id = p_user_id;

        achievement_id := v_achievement.id;
        achievement_name := v_achievement.name;
        xp_reward := v_achievement.xp_reward;
        rarity := v_achievement.rarity;
        newly_unlocked := true;
        RETURN NEXT;
      END IF;
    ELSE
      UPDATE user_achievements
      SET
        progress = LEAST(progress + p_increment, target),
        updated_at = now()
      WHERE user_id = p_user_id AND achievement_id = v_achievement.id;

      IF v_current_progress + p_increment >= v_target THEN
        UPDATE user_achievements
        SET unlocked_at = now(), progress = target
        WHERE user_id = p_user_id AND achievement_id = v_achievement.id;

        UPDATE profiles
        SET xp = COALESCE(xp, 0) + v_achievement.xp_reward
        WHERE id = p_user_id
        RETURNING xp INTO v_new_xp;

        v_new_level := calculate_level_from_xp(v_new_xp);
        v_new_rank := get_seeker_rank(v_new_level);
        UPDATE profiles SET level = v_new_level, seeker_rank = v_new_rank WHERE id = p_user_id;

        achievement_id := v_achievement.id;
        achievement_name := v_achievement.name;
        xp_reward := v_achievement.xp_reward;
        rarity := v_achievement.rarity;
        newly_unlocked := true;
        RETURN NEXT;
      END IF;
    END IF;
  END LOOP;

  RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_level_milestones(
  p_user_id uuid,
  p_new_level integer,
  p_total_xp integer,
  p_seeker_rank text
)
RETURNS TABLE(
  achievement_id uuid,
  achievement_name text,
  xp_reward integer,
  rarity achievement_rarity,
  newly_unlocked boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_achievement RECORD;
  v_target integer;
BEGIN
  FOR v_achievement IN
    SELECT a.*
    FROM achievements a
    WHERE a.is_active = true
    AND (
      a.unlock_condition->>'activity_type' = 'level_reached'
      OR a.unlock_condition->>'activity_type' = 'total_xp'
      OR a.unlock_condition->>'activity_type' = 'rank_achieved'
    )
  LOOP
    INSERT INTO user_achievements (user_id, achievement_id, target)
    VALUES (
      p_user_id,
      v_achievement.id,
      COALESCE((v_achievement.unlock_condition->>'target')::integer, 1)
    )
    ON CONFLICT (user_id, achievement_id) DO NOTHING;

    IF EXISTS (
      SELECT 1 FROM user_achievements ua
      WHERE ua.user_id = p_user_id
      AND ua.achievement_id = v_achievement.id
      AND ua.unlocked_at IS NOT NULL
    ) THEN
      CONTINUE;
    END IF;

    v_target := COALESCE((v_achievement.unlock_condition->>'target')::integer, 1);

    IF v_achievement.unlock_condition->>'activity_type' = 'level_reached' THEN
      UPDATE user_achievements
      SET progress = p_new_level, updated_at = now()
      WHERE user_id = p_user_id AND achievement_id = v_achievement.id;

      IF p_new_level >= v_target THEN
        UPDATE user_achievements
        SET unlocked_at = now(), progress = v_target
        WHERE user_id = p_user_id AND achievement_id = v_achievement.id;

        UPDATE profiles SET xp = COALESCE(xp, 0) + v_achievement.xp_reward WHERE id = p_user_id;

        achievement_id := v_achievement.id;
        achievement_name := v_achievement.name;
        xp_reward := v_achievement.xp_reward;
        rarity := v_achievement.rarity;
        newly_unlocked := true;
        RETURN NEXT;
      END IF;

    ELSIF v_achievement.unlock_condition->>'activity_type' = 'total_xp' THEN
      UPDATE user_achievements
      SET progress = p_total_xp, updated_at = now()
      WHERE user_id = p_user_id AND achievement_id = v_achievement.id;

      IF p_total_xp >= v_target THEN
        UPDATE user_achievements
        SET unlocked_at = now(), progress = v_target
        WHERE user_id = p_user_id AND achievement_id = v_achievement.id;

        UPDATE profiles SET xp = COALESCE(xp, 0) + v_achievement.xp_reward WHERE id = p_user_id;

        achievement_id := v_achievement.id;
        achievement_name := v_achievement.name;
        xp_reward := v_achievement.xp_reward;
        rarity := v_achievement.rarity;
        newly_unlocked := true;
        RETURN NEXT;
      END IF;

    ELSIF v_achievement.unlock_condition->>'activity_type' = 'rank_achieved' THEN
      IF p_seeker_rank = v_achievement.unlock_condition->>'rank_name' THEN
        UPDATE user_achievements
        SET progress = 1, unlocked_at = now(), updated_at = now()
        WHERE user_id = p_user_id AND achievement_id = v_achievement.id
        AND unlocked_at IS NULL;

        IF FOUND THEN
          UPDATE profiles SET xp = COALESCE(xp, 0) + v_achievement.xp_reward WHERE id = p_user_id;

          achievement_id := v_achievement.id;
          achievement_name := v_achievement.name;
          xp_reward := v_achievement.xp_reward;
          rarity := v_achievement.rarity;
          newly_unlocked := true;
          RETURN NEXT;
        END IF;
      END IF;
    END IF;
  END LOOP;

  RETURN;
END;
$function$;
