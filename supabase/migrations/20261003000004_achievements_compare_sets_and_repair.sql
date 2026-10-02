/*
  # Achievements compare, sets are sets, and the wrongly minted badges come back

  20260404000000:209-234 rewrote check_level_milestones() to call
  check_achievement_progress(p_user_id, 'level_reached', p_new_level) and
  (…, 'rank_achieved', 1), and check_achievement_progress() adds its third
  argument to progress for every activity type. So the level was treated as
  an increment: one quiz at level 1 pushed "Reach Level 5" and "Reach Level
  10" to 1 + 1 … and every rank badge (target 1) unlocked on the first XP
  award — a fresh account got Apprentice Awakened, Adept Ascended, Master
  Manifestor and Oracle Achieved in the same second while seeker_rank was
  still "Novice Seeker" (R6 A1, R5 M-4). Set achievements were counters too:
  Spread Explorer ("single, three-card and Celtic Cross") unlocked after
  three single-card readings, its `types` list ignored.

  Three more defects sit underneath:
    - the old comparing code (20260207195928) compared the seed's `rank` key
      against unlock_condition->>'rank_name', so rank badges could never
      unlock legitimately;
    - check_level_milestones checked 'xp_earned' while the seed stores
      'total_xp', so XP Collector / XP Legend never moved;
    - HomePage passes the streak as the increment for 'streak_achieved'.

  What this migration does:

  1. check_achievement_progress(p_user_id, p_activity_type, p_increment,
     p_value) — a fourth, optional argument carries the value for set and
     per-card badges. Semantics by activity type:
       level_reached / total_xp / streak_achieved — comparing. The server
         reads profiles.level / .xp / .streak itself (they are server-written
         truths); progress = the value, unlock when value >= target.
       rank_achieved — unlock when the user's level has reached the badge's
         rank (seeker_ranks.min_level); progress 1/0. A user who jumps two
         ranks in one award gets both badges; equality alone would skip one.
       conditions with a `types` list (spread_types_used,
         quiz_types_complete) — a SET. p_value must be one of the listed
         types; the seen values live in user_achievements.metadata->'seen',
         progress = how many listed types were seen, unlock when all of them
         were. No value → no progress (a bare call cannot advance a set).
       conditions with a `card` (specific_card_drawn) — count only when
         p_value is that card.
       any other type with a value (cards_explored, zodiac_signs_viewed …) —
         distinct count: metadata->'seen' again, progress = cardinality.
       everything else — a counter. For a user session the increment is
         clamped to 1 (the client never legitimately sends more).
     Only badges unlocked by THIS call are returned as newly_unlocked.
     An unlock pays the badge's xp_reward: the modal has always promised
     "+N XP", 20260207 paid it, 20260306 silently stopped. The payment is
     recorded in xp_activities as 'achievement_unlock' so the ledger stays
     reconcilable, and level/seeker_rank are recomputed inside the
     app.server_write marker (20260928000001).
  2. check_level_milestones keeps its four-argument signature for the client
     but ignores the values — the server has them.
  3. initialize_user_achievements / check_* assert that p_user_id is the
     caller (assert_acting_for, 20261003000003); EXECUTE is revoked from
     PUBLIC and anon.
  4. DATA REPAIR: every unlocked level_reached / total_xp / rank_achieved
     row whose condition the user's profile does not satisfy, and every
     unlocked set-type row without metadata proving all types were seen, is
     re-locked (unlocked_at NULL, notified false, progress = the true value).
     XP: badge unlocks have paid nothing since 20260306 (verified on the QA
     account: profiles.xp 220 vs 230 in xp_activities), so the only XP that
     can be reclaimed is XP the activity ledger does not explain:
       removed = LEAST(sum of re-locked xp_reward, GREATEST(0, xp − ledger))
     and level / seeker_rank are recomputed from level_thresholds inside the
     marker. Counts are RAISE NOTICEd.
*/

-- ── 0. The ledger accepts the achievement payment ───────────────────────────
ALTER TABLE public.xp_activities DROP CONSTRAINT IF EXISTS xp_activities_activity_type_check;
ALTER TABLE public.xp_activities ADD CONSTRAINT xp_activities_activity_type_check
  CHECK (activity_type = ANY (ARRAY[
    'ritual_complete'::text, 'reading_saved'::text, 'reading_complete'::text,
    'journal_entry'::text, 'quiz_complete'::text, 'horoscope_viewed'::text,
    'streak_milestone_7'::text, 'streak_milestone_30'::text,
    'streak_milestone_100'::text, 'streak_milestone_365'::text,
    'community_post'::text, 'community_comment'::text,
    'achievement_unlock'::text
  ]));

-- ── 1. Paying a badge ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.achievement_pay_xp(p_user_id uuid, p_xp integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_xp    integer;
  v_level integer;
  v_rank  text;
BEGIN
  IF p_xp IS NULL OR p_xp <= 0 THEN RETURN; END IF;

  SELECT COALESCE(p.xp, 0) + p_xp INTO v_xp
    FROM public.profiles p WHERE p.id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT COALESCE(MAX(lt.level), 1) INTO v_level
    FROM public.level_thresholds lt WHERE lt.xp_required <= v_xp;
  SELECT COALESCE(sr.rank_name, 'Novice Seeker') INTO v_rank
    FROM public.seeker_ranks sr WHERE v_level BETWEEN sr.min_level AND sr.max_level LIMIT 1;

  PERFORM set_config('app.server_write', 'on', true);
  UPDATE public.profiles p
     SET xp = v_xp, level = v_level, seeker_rank = COALESCE(v_rank, 'Novice Seeker'), updated_at = now()
   WHERE p.id = p_user_id;
  PERFORM set_config('app.server_write', 'off', true);

  INSERT INTO public.xp_activities (user_id, activity_type, xp_earned, created_at)
  VALUES (p_user_id, 'achievement_unlock', p_xp, now());
END;
$$;

REVOKE ALL ON FUNCTION public.achievement_pay_xp(uuid, integer) FROM PUBLIC, anon, authenticated;

-- ── 2. initialize_user_achievements ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.initialize_user_achievements(
  p_user_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  PERFORM public.assert_acting_for(p_user_id);
  INSERT INTO user_achievements (user_id, achievement_id, progress, target, notified, metadata, created_at, updated_at)
  SELECT
    p_user_id,
    a.id,
    0,
    GREATEST(COALESCE((a.unlock_condition->>'target')::int, 1), 1),
    false,
    '{}'::jsonb,
    now(),
    now()
  FROM achievements a
  WHERE a.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM user_achievements ua
      WHERE ua.user_id = p_user_id AND ua.achievement_id = a.id
    );
END;
$$;

REVOKE ALL ON FUNCTION public.initialize_user_achievements(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.initialize_user_achievements(uuid) TO authenticated, service_role;

-- ── 3. check_achievement_progress ───────────────────────────────────────────
DROP FUNCTION IF EXISTS public.check_achievement_progress(uuid, text, integer);

CREATE OR REPLACE FUNCTION public.check_achievement_progress(
  p_user_id uuid,
  p_activity_type text,
  p_increment integer DEFAULT 1,
  p_value text DEFAULT NULL
) RETURNS TABLE (
  achievement_id uuid,
  achievement_name text,
  xp_reward int,
  rarity text,
  newly_unlocked boolean
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  -- The seed stores total_xp; an old caller may still say xp_earned.
  v_type     text := CASE WHEN p_activity_type = 'xp_earned' THEN 'total_xp' ELSE p_activity_type END;
  v_session  boolean := (auth.uid() IS NOT NULL AND NOT COALESCE(public.is_admin(), false));
  v_inc      integer;
  v_profile  record;
  v_a        record;
  v_row      record;
  v_target   integer;
  v_progress integer;
  v_unlock   boolean;
  v_types    jsonb;
  v_seen     jsonb;
  v_meta     jsonb;
BEGIN
  PERFORM public.assert_acting_for(p_user_id);
  IF v_type IS NULL OR length(v_type) = 0 THEN RETURN; END IF;

  PERFORM public.initialize_user_achievements(p_user_id);

  SELECT COALESCE(p.level, 1) AS level, COALESCE(p.xp, 0) AS xp,
         COALESCE(p.streak, 0) AS streak, p.seeker_rank
    INTO v_profile
    FROM public.profiles p WHERE p.id = p_user_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- A session counts one at a time; the service role may batch.
  v_inc := GREATEST(COALESCE(p_increment, 1), 0);
  IF v_session THEN v_inc := LEAST(v_inc, 1); END IF;

  FOR v_a IN
    SELECT a.*
      FROM public.achievements a
     WHERE a.is_active = true
       AND a.unlock_condition->>'activity_type' = v_type
     ORDER BY a.sort_order, a.id
  LOOP
    SELECT ua.* INTO v_row
      FROM public.user_achievements ua
     WHERE ua.user_id = p_user_id AND ua.achievement_id = v_a.id
     FOR UPDATE;
    IF NOT FOUND OR v_row.unlocked_at IS NOT NULL THEN CONTINUE; END IF;

    v_target := GREATEST(COALESCE((v_a.unlock_condition->>'target')::int, 1), 1);
    v_meta   := COALESCE(v_row.metadata, '{}'::jsonb);
    v_unlock := false;

    IF v_type = 'level_reached' THEN
      v_progress := v_profile.level;
      v_unlock   := v_progress >= v_target;

    ELSIF v_type = 'total_xp' THEN
      v_progress := v_profile.xp;
      v_unlock   := v_progress >= v_target;

    ELSIF v_type = 'streak_achieved' THEN
      v_progress := v_profile.streak;
      v_unlock   := v_progress >= v_target;

    ELSIF v_type = 'rank_achieved' THEN
      -- Reached when the user's level is at or past the rank's first level.
      v_unlock := EXISTS (
        SELECT 1 FROM public.seeker_ranks sr
         WHERE sr.rank_name = v_a.unlock_condition->>'rank'
           AND v_profile.level >= sr.min_level
      );
      v_progress := CASE WHEN v_unlock THEN 1 ELSE 0 END;

    ELSIF v_a.unlock_condition ? 'types' THEN
      -- A set: only a listed value counts, and every listed value must be seen.
      v_types := v_a.unlock_condition->'types';
      IF p_value IS NULL OR NOT (v_types ? p_value) THEN CONTINUE; END IF;
      v_seen := COALESCE(v_meta->'seen', '[]'::jsonb);
      IF NOT (v_seen ? p_value) THEN v_seen := v_seen || to_jsonb(p_value); END IF;
      v_meta := jsonb_set(v_meta, '{seen}', v_seen, true);
      SELECT count(*)::int INTO v_progress
        FROM jsonb_array_elements_text(v_types) t WHERE v_seen ? t;
      v_unlock := v_progress >= jsonb_array_length(v_types);

    ELSIF v_a.unlock_condition ? 'card' THEN
      IF p_value IS NULL OR p_value <> v_a.unlock_condition->>'card' THEN CONTINUE; END IF;
      v_progress := LEAST(v_row.progress + v_inc, v_target);
      v_unlock   := v_progress >= v_target;

    ELSIF p_value IS NOT NULL THEN
      -- Distinct values (cards explored, signs viewed …).
      v_seen := COALESCE(v_meta->'seen', '[]'::jsonb);
      IF NOT (v_seen ? p_value) THEN v_seen := v_seen || to_jsonb(p_value); END IF;
      v_meta := jsonb_set(v_meta, '{seen}', v_seen, true);
      v_progress := LEAST(jsonb_array_length(v_seen), v_target);
      v_unlock   := v_progress >= v_target;

    ELSE
      v_progress := LEAST(v_row.progress + v_inc, v_target);
      v_unlock   := v_progress >= v_target;
    END IF;

    UPDATE public.user_achievements ua
       SET progress    = LEAST(GREATEST(v_progress, 0), v_target),
           metadata    = v_meta,
           unlocked_at = CASE WHEN v_unlock THEN now() ELSE NULL END,
           notified    = CASE WHEN v_unlock THEN false ELSE ua.notified END,
           updated_at  = now()
     WHERE ua.id = v_row.id;

    IF v_unlock THEN
      PERFORM public.achievement_pay_xp(p_user_id, v_a.xp_reward);
      achievement_id   := v_a.id;
      achievement_name := v_a.name;
      xp_reward        := v_a.xp_reward;
      rarity           := v_a.rarity::text;
      newly_unlocked   := true;
      RETURN NEXT;
    END IF;
  END LOOP;

  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.check_achievement_progress(uuid, text, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_achievement_progress(uuid, text, integer, text) TO authenticated, service_role;

-- ── 4. check_level_milestones ───────────────────────────────────────────────
-- 20260207195928 returned rarity as achievement_rarity, 20260306 as text;
-- DROP first so this runs on either history.
DROP FUNCTION IF EXISTS public.check_level_milestones(uuid, integer, integer, text);
CREATE OR REPLACE FUNCTION public.check_level_milestones(
  p_user_id uuid,
  p_new_level int,
  p_total_xp int,
  p_seeker_rank text
) RETURNS TABLE (
  achievement_id uuid,
  achievement_name text,
  xp_reward int,
  rarity text,
  newly_unlocked boolean
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  PERFORM public.assert_acting_for(p_user_id);
  -- The arguments are the client's view; the server reads the profile.
  RETURN QUERY SELECT * FROM public.check_achievement_progress(p_user_id, 'level_reached', 0, NULL);
  RETURN QUERY SELECT * FROM public.check_achievement_progress(p_user_id, 'total_xp', 0, NULL);
  RETURN QUERY SELECT * FROM public.check_achievement_progress(p_user_id, 'rank_achieved', 0, NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.check_level_milestones(uuid, int, int, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_level_milestones(uuid, int, int, text) TO authenticated, service_role;

-- ── 5. DATA REPAIR ──────────────────────────────────────────────────────────
DO $$
DECLARE
  r            record;
  v_relocked   integer := 0;
  v_users      integer := 0;
  v_xp_removed bigint  := 0;
  v_xp         integer;
  v_ledger     bigint;
  v_excess     bigint;
  v_remove     integer;
  v_level      integer;
  v_rank       text;
BEGIN
  CREATE TEMP TABLE repair_relocked (user_id uuid, xp_reward integer) ON COMMIT DROP;

  -- 5a. Comparing types the profile does not satisfy.
  WITH bad AS (
    UPDATE public.user_achievements ua
       SET unlocked_at = NULL,
           notified    = false,
           updated_at  = now(),
           progress    = LEAST(GREATEST(ua.target, 1),
                         CASE a.unlock_condition->>'activity_type'
                           WHEN 'level_reached' THEN COALESCE(p.level, 1)
                           WHEN 'total_xp'      THEN COALESCE(p.xp, 0)
                           ELSE 0
                         END)
      FROM public.achievements a, public.profiles p
     WHERE a.id = ua.achievement_id
       AND p.id = ua.user_id
       AND ua.unlocked_at IS NOT NULL
       AND (
            (a.unlock_condition->>'activity_type' = 'level_reached'
             AND COALESCE(p.level, 1) < COALESCE((a.unlock_condition->>'target')::int, 1))
         OR (a.unlock_condition->>'activity_type' = 'total_xp'
             AND COALESCE(p.xp, 0) < COALESCE((a.unlock_condition->>'target')::int, 1))
         OR (a.unlock_condition->>'activity_type' = 'rank_achieved'
             AND NOT EXISTS (
               SELECT 1 FROM public.seeker_ranks sr
                WHERE sr.rank_name = a.unlock_condition->>'rank'
                  AND COALESCE(p.level, 1) >= sr.min_level))
       )
    RETURNING ua.user_id, a.xp_reward
  )
  INSERT INTO repair_relocked SELECT user_id, xp_reward FROM bad;

  -- 5b. Set types without proof that every listed type was seen.
  WITH bad AS (
    UPDATE public.user_achievements ua
       SET unlocked_at = NULL,
           notified    = false,
           updated_at  = now(),
           progress    = (SELECT count(*)::int
                            FROM jsonb_array_elements_text(a.unlock_condition->'types') t
                           WHERE COALESCE(ua.metadata->'seen', '[]'::jsonb) ? t)
      FROM public.achievements a
     WHERE a.id = ua.achievement_id
       AND ua.unlocked_at IS NOT NULL
       AND a.unlock_condition ? 'types'
       AND EXISTS (
         SELECT 1 FROM jsonb_array_elements_text(a.unlock_condition->'types') t
          WHERE NOT (COALESCE(ua.metadata->'seen', '[]'::jsonb) ? t))
    RETURNING ua.user_id, a.xp_reward
  )
  INSERT INTO repair_relocked SELECT user_id, xp_reward FROM bad;

  SELECT count(*) INTO v_relocked FROM repair_relocked;

  -- 5c. Reclaim XP the ledger cannot explain, bounded by what was re-locked.
  FOR r IN SELECT rr.user_id, sum(rr.xp_reward)::int AS wrong
             FROM repair_relocked rr GROUP BY rr.user_id
  LOOP
    SELECT COALESCE(p.xp, 0) INTO v_xp FROM public.profiles p WHERE p.id = r.user_id FOR UPDATE;
    IF NOT FOUND THEN CONTINUE; END IF;
    SELECT COALESCE(sum(x.xp_earned), 0) INTO v_ledger
      FROM public.xp_activities x WHERE x.user_id = r.user_id;
    v_excess := GREATEST(0, v_xp - v_ledger);
    v_remove := LEAST(r.wrong, v_excess)::int;
    IF v_remove > 0 THEN
      v_xp := GREATEST(0, v_xp - v_remove);
      SELECT COALESCE(MAX(lt.level), 1) INTO v_level
        FROM public.level_thresholds lt WHERE lt.xp_required <= v_xp;
      SELECT COALESCE(sr.rank_name, 'Novice Seeker') INTO v_rank
        FROM public.seeker_ranks sr WHERE v_level BETWEEN sr.min_level AND sr.max_level LIMIT 1;
      PERFORM set_config('app.server_write', 'on', true);
      UPDATE public.profiles p
         SET xp = v_xp, level = v_level, seeker_rank = COALESCE(v_rank, 'Novice Seeker'), updated_at = now()
       WHERE p.id = r.user_id;
      PERFORM set_config('app.server_write', 'off', true);
      v_users      := v_users + 1;
      v_xp_removed := v_xp_removed + v_remove;
    END IF;
  END LOOP;

  RAISE NOTICE 'achievements repair: % rows re-locked, % users had XP adjusted, % XP removed',
    v_relocked, v_users, v_xp_removed;
END $$;
