/*
  # Reading badges count each reading once (p7 #18 follow-up)

  From 2026-02-08 (7389fce6) until Phase 7, TarotSection and
  CartomancySection reported every finished reading and every save twice:
  awardXP() reports its activity to check_achievement_progress() itself
  (services/levelSystem.ts), and the section then called
  checkAchievementProgress(user, 'reading_complete' | 'reading_saved') again.
  So Apprentice Reader ("10 readings") unlocked at the fifth reading, Card
  Collector ("25 saved") at the thirteenth save, and every locked reading
  badge shows about twice the readings the member has done. Phase 7 removed
  the second report (d5344cad); this migration repairs the rows it left
  behind. It belongs with the Phase 7 client: a client that still reports
  twice re-inflates the rows after it has run.

  The ledger is the truth. award_xp() has written one xp_activities row per
  call for both types since the first report (the reporters and
  'reading_complete' in the ledger's CHECK arrived together, in 7389fce6 and
  20260207195928; 'reading_saved' was in it from the start), and awardXP()
  reports only after award_xp() has succeeded. So for every
  user_achievements row whose condition is reading_complete or
  reading_saved:

    true count = count(xp_activities) of that user and activity type
    a row unlocked with a true count below its target is re-locked
      (unlocked_at NULL, notified false, progress = the true count);
    every other locked row: progress = LEAST(target, true count);
    every row that stays unlocked: progress = target.

  One exception. Since 20261003000012 (live from 2026-10-03) a session's
  21st reading, or save, of a UTC day is capped: it still counts toward the
  badges but writes no ledger row, so for a member with such a day the
  ledger undercounts. A (member, type) with 20 or more ledger rows on one
  UTC day since 2026-10-02 is never re-locked; its locked rows still move
  to the ledger count, which can only understate.

  cartomancy_reading_complete is NOT touched: it has one reporter
  (cartoAchievementEvents, once per table behind rewardedRef), was never
  counted twice, and has no ledger to count from.

  XP. What a re-locked badge paid depends on when it unlocked:
    - since 20261003000004: achievement_pay_xp() wrote an 'achievement_unlock'
      row in the unlock's transaction (same now(), same amount). That row is
      deleted and its amount taken back from profiles.xp.
    - before 2026-03-06 03:47:40 UTC (27e8aa02, the commit of
      20260306000000, whose check_achievement_progress stopped paying; it
      cannot have run earlier): 20260127 / 20260207 paid it without a ledger
      row. As 20261003000004 did, only XP the ledger cannot explain is taken
      back: LEAST(those rewards, GREATEST(0, xp - ledger)).
    - in between: nothing was paid, so nothing is taken. (20261003000004's
      bound applied to these too would take the XP that other, rightly
      unlocked February badges paid.)
  level and seeker_rank are recomputed from level_thresholds inside the
  app.server_write marker (20260928000001). A lower level can leave a
  comparing badge (level_reached / total_xp / rank_achieved) the profile no
  longer satisfies; those are re-locked by 20261003000004's rule and their
  payments reversed the same way, round after round until a round changes
  nothing.

  Idempotent: a second run finds every progress at its true value and
  nothing to re-lock. Counts are RAISE NOTICEd.
*/

DO $$
DECLARE
  -- 20260306000000's check_achievement_progress (no payment) cannot have run before its commit.
  c_paid_unlogged_before CONSTANT timestamptz := '2026-03-06 03:47:40+00';
  -- 20261003000012's per-UTC-day ceiling for both types, and the earliest it can have been live.
  c_daily_cap            CONSTANT integer     := 20;
  c_caps_from            CONSTANT timestamptz := '2026-10-02 00:00:00+00';
  r              record;
  v_round        integer := 0;
  v_n            integer;
  v_rescaled     integer := 0;
  v_relocked     integer := 0;
  v_capped_kept  integer := 0;
  v_cascade      integer := 0;
  v_at_target    integer := 0;
  v_logged       integer := 0;
  v_users        integer := 0;
  v_xp_removed   bigint  := 0;
  v_xp           integer;
  v_new          integer;
  v_ledger       bigint;
  v_excess       bigint;
  v_take_unlog   integer;
  v_level        integer;
  v_rank         text;
BEGIN
  -- Every reading-counter row, with the member's true count from the ledger
  -- and whether a capped day may have hidden readings from it.
  CREATE TEMP TABLE rc_truth ON COMMIT DROP AS
  SELECT ua.id                                                          AS ua_id,
         ua.user_id,
         COALESCE(a.xp_reward, 0)                                       AS xp_reward,
         GREATEST(COALESCE((a.unlock_condition->>'target')::int, 1), 1) AS target,
         ua.unlocked_at,
         (SELECT count(*)::int
            FROM public.xp_activities x
           WHERE x.user_id = ua.user_id
             AND x.activity_type = a.unlock_condition->>'activity_type') AS true_count,
         EXISTS (
           SELECT 1
             FROM public.xp_activities x
            WHERE x.user_id = ua.user_id
              AND x.activity_type = a.unlock_condition->>'activity_type'
              AND x.created_at >= c_caps_from
            GROUP BY (x.created_at AT TIME ZONE 'UTC')::date
           HAVING count(*) >= c_daily_cap)                               AS maybe_capped
    FROM public.user_achievements ua
    JOIN public.achievements a ON a.id = ua.achievement_id
   WHERE a.unlock_condition->>'activity_type' IN ('reading_complete', 'reading_saved');

  -- Re-locked badges whose payment is still to be taken back.
  CREATE TEMP TABLE rc_relocked (
    id          serial PRIMARY KEY,
    user_id     uuid NOT NULL,
    xp_reward   integer NOT NULL,
    unlocked_at timestamptz NOT NULL,
    logged      boolean NOT NULL DEFAULT false,
    settled     boolean NOT NULL DEFAULT false
  ) ON COMMIT DROP;
  -- Members whose XP changed: in this round, and in any round.
  CREATE TEMP TABLE rc_round_users (user_id uuid PRIMARY KEY) ON COMMIT DROP;
  CREATE TEMP TABLE rc_all_users (user_id uuid PRIMARY KEY) ON COMMIT DROP;

  -- 1. Unlocked below the true count: re-lock.
  WITH bad AS (
    UPDATE public.user_achievements ua
       SET unlocked_at = NULL,
           notified    = false,
           progress    = t.true_count,
           updated_at  = now()
      FROM rc_truth t
     WHERE ua.id = t.ua_id
       AND t.unlocked_at IS NOT NULL
       AND t.true_count < t.target
       AND NOT t.maybe_capped
    RETURNING t.user_id, t.xp_reward, t.unlocked_at
  )
  INSERT INTO rc_relocked (user_id, xp_reward, unlocked_at)
  SELECT user_id, xp_reward, unlocked_at FROM bad;
  GET DIAGNOSTICS v_relocked = ROW_COUNT;

  SELECT count(*)::int INTO v_capped_kept
    FROM rc_truth t
   WHERE t.unlocked_at IS NOT NULL AND t.true_count < t.target AND t.maybe_capped;

  -- 2. Every other row: a locked row holds the true count, capped at the
  --    target; a row that stays unlocked holds its target.
  UPDATE public.user_achievements ua
     SET progress   = CASE WHEN t.unlocked_at IS NOT NULL THEN t.target
                           ELSE LEAST(t.target, t.true_count) END,
         updated_at = now()
    FROM rc_truth t
   WHERE ua.id = t.ua_id
     AND NOT (t.unlocked_at IS NOT NULL AND t.true_count < t.target AND NOT t.maybe_capped)
     AND ua.progress IS DISTINCT FROM CASE WHEN t.unlocked_at IS NOT NULL THEN t.target
                                           ELSE LEAST(t.target, t.true_count) END;
  GET DIAGNOSTICS v_rescaled = ROW_COUNT;

  -- Locked rows whose true count already meets the target unlock (and pay)
  -- on the member's next counted activity, through the normal path.
  SELECT count(*)::int INTO v_at_target
    FROM rc_truth t WHERE t.unlocked_at IS NULL AND t.true_count >= t.target;

  -- 3. Take the badges' XP back; re-lock what the lower level no longer
  --    satisfies; repeat until a round re-locks nothing.
  LOOP
    EXIT WHEN NOT EXISTS (SELECT 1 FROM rc_relocked WHERE NOT settled);
    v_round := v_round + 1;
    TRUNCATE rc_round_users;

    -- 3a. A payment achievement_pay_xp wrote (the unlock's transaction: same
    --     now(), same amount) is deleted, one ledger row per badge.
    FOR r IN SELECT rr.id, rr.user_id, rr.xp_reward, rr.unlocked_at
               FROM rc_relocked rr WHERE NOT rr.settled AND rr.xp_reward > 0
    LOOP
      DELETE FROM public.xp_activities x
       WHERE x.id = (
         SELECT x2.id FROM public.xp_activities x2
          WHERE x2.user_id = r.user_id
            AND x2.activity_type = 'achievement_unlock'
            AND x2.xp_earned = r.xp_reward
            AND x2.created_at = r.unlocked_at
          LIMIT 1);
      IF FOUND THEN
        UPDATE rc_relocked SET logged = true WHERE id = r.id;
        v_logged := v_logged + 1;
      END IF;
    END LOOP;

    -- 3b. Per member: logged payments come back in full; unlogged ones from
    --     the paying era only out of XP the ledger cannot explain
    --     (20261003000004's bound); the rest were never paid.
    FOR r IN SELECT rr.user_id,
                    COALESCE(sum(rr.xp_reward) FILTER (WHERE rr.logged), 0)::int AS logged_sum,
                    COALESCE(sum(rr.xp_reward) FILTER (
                      WHERE NOT rr.logged AND rr.unlocked_at < c_paid_unlogged_before), 0)::int AS unlogged_sum
               FROM rc_relocked rr
              WHERE NOT rr.settled
              GROUP BY rr.user_id
    LOOP
      SELECT COALESCE(p.xp, 0) INTO v_xp FROM public.profiles p WHERE p.id = r.user_id FOR UPDATE;
      IF NOT FOUND THEN CONTINUE; END IF;
      SELECT COALESCE(sum(x.xp_earned), 0) INTO v_ledger
        FROM public.xp_activities x WHERE x.user_id = r.user_id;

      v_new        := GREATEST(0, v_xp - r.logged_sum);
      v_excess     := GREATEST(0, v_new - v_ledger);
      v_take_unlog := LEAST(r.unlogged_sum, v_excess)::int;
      v_new        := v_new - v_take_unlog;

      IF v_new <> v_xp THEN
        SELECT COALESCE(MAX(lt.level), 1) INTO v_level
          FROM public.level_thresholds lt WHERE lt.xp_required <= v_new;
        SELECT COALESCE(sr.rank_name, 'Novice Seeker') INTO v_rank
          FROM public.seeker_ranks sr WHERE v_level BETWEEN sr.min_level AND sr.max_level LIMIT 1;
        PERFORM set_config('app.server_write', 'on', true);
        UPDATE public.profiles p
           SET xp = v_new, level = v_level, seeker_rank = COALESCE(v_rank, 'Novice Seeker'), updated_at = now()
         WHERE p.id = r.user_id;
        PERFORM set_config('app.server_write', 'off', true);
        INSERT INTO rc_round_users VALUES (r.user_id) ON CONFLICT DO NOTHING;
        INSERT INTO rc_all_users VALUES (r.user_id) ON CONFLICT DO NOTHING;
        v_xp_removed := v_xp_removed + (v_xp - v_new);
      END IF;
    END LOOP;

    UPDATE rc_relocked SET settled = true WHERE NOT settled;

    -- 3c. Comparing badges the adjusted profile no longer satisfies
    --     (20261003000004 §5a), for the members adjusted this round. The
    --     old unlocked_at is read before the UPDATE clears it: it is the key
    --     to that badge's payment row and its era.
    WITH cand AS (
      SELECT ua.id,
             ua.user_id,
             ua.unlocked_at AS old_unlocked_at,
             COALESCE(a.xp_reward, 0) AS xp_reward,
             LEAST(GREATEST(ua.target, 1),
                   CASE a.unlock_condition->>'activity_type'
                     WHEN 'level_reached' THEN COALESCE(p.level, 1)
                     WHEN 'total_xp'      THEN COALESCE(p.xp, 0)
                     ELSE 0
                   END) AS new_progress
        FROM public.user_achievements ua
        JOIN public.achievements a ON a.id = ua.achievement_id
        JOIN public.profiles p     ON p.id = ua.user_id
        JOIN rc_round_users ru     ON ru.user_id = ua.user_id
       WHERE ua.unlocked_at IS NOT NULL
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
    ), upd AS (
      UPDATE public.user_achievements ua
         SET unlocked_at = NULL,
             notified    = false,
             progress    = c.new_progress,
             updated_at  = now()
        FROM cand c
       WHERE ua.id = c.id
      RETURNING c.user_id, c.xp_reward, c.old_unlocked_at
    )
    INSERT INTO rc_relocked (user_id, xp_reward, unlocked_at)
    SELECT user_id, xp_reward, old_unlocked_at FROM upd;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_cascade := v_cascade + v_n;

    -- A guard, not a limit anyone should meet: each round lowers XP.
    EXIT WHEN v_round >= 20;
  END LOOP;

  SELECT count(*)::int INTO v_users FROM rc_all_users;

  RAISE NOTICE 'reading counters repair: % rows re-scaled, % re-locked, % kept unlocked (a capped day may hide readings), % locked rows already at target, % logged payments reversed, % comparing badges re-locked after the XP change, % users had XP adjusted, % XP removed, % rounds',
    v_rescaled, v_relocked, v_capped_kept, v_at_target, v_logged, v_cascade, v_users, v_xp_removed, v_round;
END $$;
