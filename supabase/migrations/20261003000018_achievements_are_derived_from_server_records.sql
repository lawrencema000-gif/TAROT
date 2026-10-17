/*
  # Achievements are derived from what the server recorded, not from what a
  # session says (p7 #113, p8 recheck O#113 + K1)

  check_achievement_progress(p_user_id, p_activity_type, p_increment, p_value)
  is client-callable, and 20261003000004 still let the session pick the
  activity and its value: every unlock pays xp_reward through
  achievement_pay_xp. Proved in production on a fresh account (non-premium,
  streak 0, no activity): about 115 bare RPC calls unlocked Premium Patron,
  Cosmic Birthday, Full Moon Reader, New Beginnings, Night Seeker, Joker's
  Laugh, Romany Table, Wish Card, Quiz Master, Spread Explorer, Zodiac
  Scholar, Library Scholar and Full Deck Explorer; check_level_milestones then
  added Rising Star and Apprentice Awakened — xp 565 -> 3215, level 6. The
  released Android build (v1.2.0) still reports bare counters, some twice per
  activity.

  ## The rule
  A call is only a trigger. p_increment is ignored. Every call re-derives the
  progress of the member's locked badges from server records, so repeating a
  call changes nothing, and an unlock happens (and pays) once:

    level_reached / total_xp / streak_achieved / rank_achieved
        profiles (server-written), as in 20261003000004.
    reading_complete, reading_saved, journal_entry, quiz_complete,
    horoscope_viewed, ritual_complete
        the XP ledger (xp_activities, written only by award_xp under its
        per-day ceilings), counted with those ceilings per UTC day so a
        pre-ceiling flood cannot count either (ritual: 2 a day, 017).
    weekend_ritual
        distinct weekends among the dates of the ritual rows the ritual awards
        were paid for (each ritual_complete row paired with the member's latest
        server-dated daily_rituals row created before it).
    full_moon_reading
        a reading_complete ledger row written within 1.5 days of a full moon
        (the client's isFullMoon(), on the server's clock).
    premium_upgrade
        is_user_premium() now — any later call unlocks it once the webhook has
        landed.
    birthday_login
        the profile's birth date is today in the profile's time zone, or this
        call reports birthday_login and the UTC date is within a day of it
        (every local date is within a day of UTC).
    quiz_types_complete
        the member's quiz_results rows: distinct quiz_type among the listed
        types.

  Two kinds of activity leave no server record of their own, so the client's
  report is kept as a claim (public.achievement_reports, server-only):

    Reading facts — spread_types_used (the spread id), celtic_cross_complete,
    specific_card_drawn (the card's canonical English name),
    cartomancy_reading_complete, cartomancy_spread_types_used (the spread
    slug), cartomancy_romany_complete, cartomancy_wish_card_drawn,
    cartomancy_joker_drawn, new_year_reading, witching_hour_reading — and
    ritual facts — morning_ritual, evening_ritual. A claim counts only once it
    is matched to the ledger row of the reading (or ritual) it describes: a
    reading_complete (ritual_complete) row written within 5 minutes of it,
    each row matched at most once per badge slot (one spread per reading; one
    count per card per reading; a ritual is morning OR evening). The claim and
    the award are separate requests in either order; claims wait 10 minutes
    for their row. So progress is bounded by readings and rituals the ledger
    saw (20 readings, 2 rituals a UTC day), and a bare call matches nothing.
    new_year_reading is also checked against the row's time: some time zone
    must be on 1 January then.

    Views — cards_explored (card id 0-77), zodiac_signs_viewed (sign id),
    cartomancy_lesson_complete (lesson slug). Nothing but the device sees a
    view, so the server can only bound the rate: each distinct, valid value
    counts once, and at most one fewer than the smallest target of its badges
    is accepted per UTC day (21 cards, 11 signs, 11 lessons) — later values
    wait and are accepted on later days, so honest progress is only delayed.

  Invalid values are ignored without error. Unknown activity types run a
  full re-derivation and change nothing else. Old clients (v1.2.0 passes
  three arguments) keep working: the signature and result are unchanged.

  ## What was earned stays
  Unlocked badges are left as they are. For a badge still locked whose
  progress came only from client reports (the claim and view kinds), this
  migration freezes that progress as a credit (metadata.legacy, and
  metadata.legacy_seen for sets) and turns 20261003000004's recorded view
  values (metadata.seen) into accepted views, so no honest member's progress
  drops. Server-derived badges show the true count on the next call.

  check_level_milestones keeps its signature and is now one re-derivation.
  Every REVOKE names PUBLIC, anon and authenticated (20260817020000).
*/

-- ── 1. The claims the server keeps ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.achievement_reports (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind        text NOT NULL,
  -- What one ledger row may be matched to once: the kind, 'card:<name>' for
  -- specific_card_drawn, 'ritual_time' for morning/evening.
  slot        text NOT NULL,
  value       text NOT NULL DEFAULT '',
  reported_at timestamptz NOT NULL DEFAULT now(),
  -- Reading and ritual facts: the xp_activities row the claim was matched to.
  event_id    uuid,
  -- Views: the UTC day the value was accepted (NULL = waiting).
  accepted_on date
);

CREATE INDEX IF NOT EXISTS achievement_reports_user_slot_idx
  ON public.achievement_reports (user_id, slot, reported_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS achievement_reports_event_once
  ON public.achievement_reports (user_id, slot, event_id) WHERE event_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS achievement_reports_view_once
  ON public.achievement_reports (user_id, kind, value)
  WHERE kind IN ('cards_explored', 'zodiac_signs_viewed', 'cartomancy_lesson_complete');

ALTER TABLE public.achievement_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.achievement_reports FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.achievement_reports TO service_role;

COMMENT ON TABLE public.achievement_reports IS
  'Client reports the achievements cannot derive on their own (reading/ritual '
  'facts, views). Written only by check_achievement_progress(); a reading or '
  'ritual fact counts once matched to its xp_activities row (event_id); a view '
  'counts once accepted (accepted_on).';

-- ── 2. Re-derivation ───────────────────────────────────────────────────────
-- Same signature and result as 20261003000004, so CREATE OR REPLACE keeps
-- every caller (and v1.2.0's three-argument call) working.
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
  c_new_moon   CONSTANT timestamptz := '2000-01-06 18:14:00+00';
  c_synodic    CONSTANT numeric     := 29.53059;
  c_carto_spreads CONSTANT text[] := ARRAY['carto-single', 'carto-three-timeline', 'carto-three-action',
    'carto-horseshoe', 'carto-nine-square', 'carto-romany', 'carto-wish', 'carto-yes-no', 'carto-relationship'];
  c_lessons    CONSTANT text[] := ARRAY['the-deck-in-your-hand', 'the-four-suits', 'numbers-ace-to-ten',
    'the-court-cards', 'red-and-black', 'the-jokers', 'asking-a-good-question', 'reading-one-and-three',
    'reading-combinations', 'timing-with-cards', 'the-big-spreads', 'reading-for-yourself-and-others'];
  c_signs      CONSTANT text[] := ARRAY['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra',
    'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
  c_event_kinds CONSTANT text[] := ARRAY['spread_types_used', 'celtic_cross_complete', 'specific_card_drawn',
    'cartomancy_reading_complete', 'cartomancy_spread_types_used', 'cartomancy_romany_complete',
    'cartomancy_wish_card_drawn', 'cartomancy_joker_drawn', 'new_year_reading', 'witching_hour_reading',
    'morning_ritual', 'evening_ritual'];
  c_view_kinds CONSTANT text[] := ARRAY['cards_explored', 'zodiac_signs_viewed', 'cartomancy_lesson_complete'];

  v_type      text := CASE WHEN p_activity_type = 'xp_earned' THEN 'total_xp'
                           ELSE btrim(COALESCE(p_activity_type, '')) END;
  v_value     text := NULLIF(btrim(COALESCE(p_value, '')), '');
  v_class     text;      -- 'event' | 'view' | NULL (anything else)
  v_valid     boolean := true;
  v_slot      text;
  v_utc_today date := (now() AT TIME ZONE 'UTC')::date;
  v_profile   record;
  v_local     date;
  v_bday      text;
  v_premium   boolean;
  v_counts    jsonb := '{}'::jsonb;
  v_weekends  integer := 0;
  v_full_moon boolean := false;
  v_quiz      text[] := ARRAY[]::text[];
  v_c         record;
  v_ev        uuid;
  v_k         text;
  v_limit     integer;
  v_taken     integer;
  v_a         record;
  v_t         text;
  v_target    integer;
  v_progress  integer;
  v_unlock    boolean;
  v_legacy    integer;
  v_seen      text[];
  v_types     text[];
  v_pass      integer;
  v_paid      boolean;
BEGIN
  PERFORM public.assert_acting_for(p_user_id);
  IF length(v_type) = 0 THEN RETURN; END IF;

  -- ── What this call reports ──
  IF v_type = ANY (c_event_kinds) THEN
    v_class := 'event';
    IF v_type = 'spread_types_used' THEN
      v_valid := v_value IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.achievements a
         WHERE a.is_active AND a.unlock_condition->>'activity_type' = 'spread_types_used'
           AND a.unlock_condition->'types' ? v_value);
    ELSIF v_type = 'specific_card_drawn' THEN
      v_valid := v_value IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.achievements a
         WHERE a.is_active AND a.unlock_condition->>'activity_type' = 'specific_card_drawn'
           AND a.unlock_condition->>'card' = v_value);
    ELSIF v_type = 'cartomancy_spread_types_used' THEN
      v_valid := v_value = ANY (c_carto_spreads);
    ELSE
      v_value := '';   -- a counter: the value means nothing
    END IF;
    v_slot := CASE
      WHEN v_type = 'specific_card_drawn' THEN 'card:' || v_value
      WHEN v_type IN ('morning_ritual', 'evening_ritual') THEN 'ritual_time'
      ELSE v_type END;
  ELSIF v_type = ANY (c_view_kinds) THEN
    v_class := 'view';
    v_valid := CASE
      WHEN v_value IS NULL THEN false
      WHEN v_type = 'cards_explored' THEN
        CASE WHEN v_value ~ '^[0-9]{1,2}$' THEN v_value::int BETWEEN 0 AND 77 ELSE false END
      WHEN v_type = 'zodiac_signs_viewed' THEN lower(v_value) = ANY (c_signs)
      ELSE v_value = ANY (c_lessons) END;
    IF v_valid AND v_type = 'cards_explored' THEN v_value := (v_value::int)::text; END IF;
    IF v_valid AND v_type = 'zodiac_signs_viewed' THEN v_value := lower(v_value); END IF;
    v_slot := v_type;
  END IF;
  -- A report that cannot count changes nothing (and costs nothing).
  IF v_class IS NOT NULL AND NOT COALESCE(v_valid, false) THEN RETURN; END IF;

  -- One re-derivation at a time per member: a claim and the award it
  -- describes arrive as separate requests, in either order; whichever runs
  -- second sees both.
  PERFORM pg_advisory_xact_lock(hashtext('achievements'), hashtext(p_user_id::text));
  PERFORM public.initialize_user_achievements(p_user_id);

  SELECT COALESCE(p.level, 1) AS level, COALESCE(p.xp, 0) AS xp, COALESCE(p.streak, 0) AS streak,
         p.birth_date, p.timezone
    INTO v_profile
    FROM public.profiles p WHERE p.id = p_user_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- ── Keep the claim ──
  IF v_class = 'event' THEN
    IF EXISTS (
         -- some badge it could still move is locked
         SELECT 1 FROM public.achievements a
           JOIN public.user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = p_user_id
          WHERE a.is_active AND ua.unlocked_at IS NULL
            AND a.unlock_condition->>'activity_type' = v_type
            AND (v_type <> 'specific_card_drawn' OR a.unlock_condition->>'card' = v_value))
       -- the same report twice in 30 s is one report (a retry, a double tap)
       AND NOT EXISTS (
         SELECT 1 FROM public.achievement_reports r
          WHERE r.user_id = p_user_id AND r.kind = v_type AND r.value = v_value
            AND r.reported_at > now() - interval '30 seconds')
       -- a loop of reports with nothing to match is not stored without bound
       AND (SELECT count(*) FROM public.achievement_reports r
             WHERE r.user_id = p_user_id AND r.kind = v_type AND r.event_id IS NULL) < 50
    THEN
      INSERT INTO public.achievement_reports (user_id, kind, slot, value)
      VALUES (p_user_id, v_type, v_slot, v_value);
    END IF;
  ELSIF v_class = 'view' THEN
    INSERT INTO public.achievement_reports (user_id, kind, slot, value)
    VALUES (p_user_id, v_type, v_slot, v_value)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ── Settle the claims ──
  -- Reading and ritual facts: match each waiting claim to the closest ledger
  -- row of its activity within 5 minutes that its slot has not used yet.
  FOR v_c IN
    SELECT r.id, r.kind, r.slot, r.reported_at
      FROM public.achievement_reports r
     WHERE r.user_id = p_user_id AND r.event_id IS NULL AND r.kind = ANY (c_event_kinds)
     ORDER BY r.reported_at, r.id
  LOOP
    SELECT x.id INTO v_ev
      FROM public.xp_activities x
     WHERE x.user_id = p_user_id
       AND x.activity_type = CASE WHEN v_c.kind IN ('morning_ritual', 'evening_ritual')
                                  THEN 'ritual_complete' ELSE 'reading_complete' END
       AND x.created_at BETWEEN v_c.reported_at - interval '5 minutes' AND v_c.reported_at + interval '5 minutes'
       AND NOT EXISTS (
         SELECT 1 FROM public.achievement_reports o
          WHERE o.user_id = p_user_id AND o.slot = v_c.slot AND o.event_id = x.id)
       -- some time zone must be on 1 January when the reading was recorded
       AND (v_c.kind <> 'new_year_reading'
            OR '01-01' IN (to_char((x.created_at AT TIME ZONE 'UTC') - interval '12 hours', 'MM-DD'),
                           to_char(x.created_at AT TIME ZONE 'UTC', 'MM-DD'),
                           to_char((x.created_at AT TIME ZONE 'UTC') + interval '14 hours', 'MM-DD')))
     ORDER BY abs(extract(epoch FROM (x.created_at - v_c.reported_at))), x.created_at
     LIMIT 1;
    IF v_ev IS NOT NULL THEN
      UPDATE public.achievement_reports SET event_id = v_ev WHERE id = v_c.id;
    END IF;
  END LOOP;
  -- A claim whose 5 minutes have long passed without a row never counts.
  DELETE FROM public.achievement_reports r
   WHERE r.user_id = p_user_id AND r.event_id IS NULL AND r.kind = ANY (c_event_kinds)
     AND r.reported_at < now() - interval '10 minutes';

  -- Views: accept waiting values, oldest first, up to the day's limit.
  FOREACH v_k IN ARRAY c_view_kinds LOOP
    SELECT GREATEST(MIN(GREATEST(COALESCE((a.unlock_condition->>'target')::int, 1), 1)) - 1, 1)
      INTO v_limit
      FROM public.achievements a
     WHERE a.is_active AND a.unlock_condition->>'activity_type' = v_k;
    CONTINUE WHEN v_limit IS NULL;
    SELECT count(*) INTO v_taken FROM public.achievement_reports r
     WHERE r.user_id = p_user_id AND r.kind = v_k AND r.accepted_on = v_utc_today;
    IF v_taken < v_limit THEN
      UPDATE public.achievement_reports r SET accepted_on = v_utc_today
       WHERE r.id IN (SELECT w.id FROM public.achievement_reports w
                       WHERE w.user_id = p_user_id AND w.kind = v_k AND w.accepted_on IS NULL
                       ORDER BY w.reported_at, w.id
                       LIMIT v_limit - v_taken);
    END IF;
  END LOOP;

  -- ── Server facts (a claim or view report re-derives only its own kinds) ──
  IF v_class IS NULL THEN
    v_premium := public.is_user_premium(p_user_id);
    BEGIN
      v_local := (now() AT TIME ZONE COALESCE(NULLIF(v_profile.timezone, ''), 'UTC'))::date;
    EXCEPTION WHEN OTHERS THEN
      v_local := v_utc_today;
    END;
    v_bday := to_char(v_profile.birth_date, 'MM-DD');

    SELECT COALESCE(jsonb_object_agg(z.t, z.n), '{}'::jsonb) INTO v_counts
      FROM (
        SELECT s.activity_type AS t, sum(LEAST(s.n, c.cap))::int AS n
          FROM (SELECT x.activity_type, (x.created_at AT TIME ZONE 'UTC')::date AS d, count(*)::int AS n
                  FROM public.xp_activities x
                 WHERE x.user_id = p_user_id
                   AND x.activity_type IN ('reading_complete', 'reading_saved', 'journal_entry',
                                           'quiz_complete', 'horoscope_viewed', 'ritual_complete')
                 GROUP BY 1, 2) s
          JOIN (VALUES ('reading_complete', 20), ('reading_saved', 20), ('journal_entry', 10),
                       ('quiz_complete', 10), ('horoscope_viewed', 3), ('ritual_complete', 2)) AS c(t, cap)
            ON c.t = s.activity_type
         GROUP BY s.activity_type) z;

    SELECT count(DISTINCT date_trunc('week', r.date::timestamp))::int INTO v_weekends
      FROM public.xp_activities x
      CROSS JOIN LATERAL (
        SELECT d.date
          FROM public.daily_rituals d
         WHERE d.user_id = p_user_id
           AND d.created_at <= x.created_at
           AND d.created_at > x.created_at - interval '2 days'
           AND (d.created_at AT TIME ZONE 'UTC')::date BETWEEN d.date - 1 AND d.date + 1
         ORDER BY d.created_at DESC
         LIMIT 1) r
     WHERE x.user_id = p_user_id
       AND x.activity_type = 'ritual_complete'
       AND extract(isodow FROM r.date) IN (6, 7);

    SELECT EXISTS (
      SELECT 1 FROM public.xp_activities x
       WHERE x.user_id = p_user_id AND x.activity_type = 'reading_complete'
         AND abs(mod(mod((extract(epoch FROM (x.created_at - c_new_moon)) / 86400.0)::numeric, c_synodic)
                     + c_synodic, c_synodic) - c_synodic / 2) < 1.5)
      INTO v_full_moon;

    SELECT COALESCE(array_agg(DISTINCT q.quiz_type), ARRAY[]::text[]) INTO v_quiz
      FROM public.quiz_results q WHERE q.user_id = p_user_id;
  END IF;

  -- ── Re-derive the locked badges; unlock and pay once ──
  -- Pass 1 covers every badge this call may move; the XP an unlock pays can
  -- reach a level, so later passes re-check the comparing badges.
  FOR v_pass IN 1..4 LOOP
    v_paid := false;
    IF v_pass > 1 THEN
      SELECT COALESCE(p.level, 1) AS level, COALESCE(p.xp, 0) AS xp, COALESCE(p.streak, 0) AS streak,
             p.birth_date, p.timezone
        INTO v_profile
        FROM public.profiles p WHERE p.id = p_user_id;
    END IF;

    FOR v_a IN
      SELECT a.id, a.name, a.xp_reward, a.rarity, a.unlock_condition, ua.id AS ua_id,
             ua.progress AS cur_progress, COALESCE(ua.metadata, '{}'::jsonb) AS meta
        FROM public.achievements a
        JOIN public.user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = p_user_id
       WHERE a.is_active
         AND ua.unlocked_at IS NULL
         AND CASE
               WHEN v_pass > 1 THEN a.unlock_condition->>'activity_type' IN ('level_reached', 'total_xp', 'rank_achieved')
               WHEN v_class IS NULL THEN true
               ELSE a.unlock_condition->>'activity_type' = ANY (c_event_kinds || c_view_kinds)
             END
       ORDER BY a.sort_order, a.id
       FOR UPDATE OF ua
    LOOP
      v_t        := v_a.unlock_condition->>'activity_type';
      v_target   := GREATEST(COALESCE((v_a.unlock_condition->>'target')::int, 1), 1);
      v_legacy   := GREATEST(COALESCE((v_a.meta->>'legacy')::int, 0), 0);
      v_progress := NULL;
      v_unlock   := false;

      IF v_t = 'level_reached' THEN
        v_progress := v_profile.level;
      ELSIF v_t = 'total_xp' THEN
        v_progress := v_profile.xp;
      ELSIF v_t = 'streak_achieved' THEN
        v_progress := v_profile.streak;
      ELSIF v_t = 'rank_achieved' THEN
        v_progress := CASE WHEN EXISTS (
            SELECT 1 FROM public.seeker_ranks sr
             WHERE sr.rank_name = v_a.unlock_condition->>'rank'
               AND v_profile.level >= sr.min_level) THEN v_target ELSE 0 END;
      ELSIF v_t IN ('reading_complete', 'reading_saved', 'journal_entry', 'quiz_complete',
                    'horoscope_viewed', 'ritual_complete') THEN
        v_progress := COALESCE((v_counts->>v_t)::int, 0);
      ELSIF v_t = 'weekend_ritual' THEN
        v_progress := v_weekends;
      ELSIF v_t = 'full_moon_reading' THEN
        v_progress := CASE WHEN v_full_moon THEN v_target ELSE v_legacy END;
      ELSIF v_t = 'premium_upgrade' THEN
        v_progress := CASE WHEN v_premium THEN v_target ELSE 0 END;
      ELSIF v_t = 'birthday_login' THEN
        v_progress := CASE
          WHEN v_bday IS NOT NULL
               AND (to_char(v_local, 'MM-DD') = v_bday
                    OR (v_type = 'birthday_login'
                        AND v_bday IN (to_char(v_utc_today - 1, 'MM-DD'), to_char(v_utc_today, 'MM-DD'),
                                       to_char(v_utc_today + 1, 'MM-DD'))))
          THEN v_target ELSE 0 END;
      ELSIF v_t = 'quiz_types_complete' THEN
        SELECT COALESCE(array_agg(t), ARRAY[]::text[]) INTO v_types
          FROM jsonb_array_elements_text(COALESCE(v_a.unlock_condition->'types', '[]'::jsonb)) t;
        v_progress := (SELECT count(*)::int FROM unnest(v_types) t WHERE t = ANY (v_quiz));
        v_target   := GREATEST(cardinality(v_types), 1);
      ELSIF v_t = ANY (c_view_kinds) THEN
        SELECT count(*)::int INTO v_progress FROM public.achievement_reports r
         WHERE r.user_id = p_user_id AND r.kind = v_t AND r.accepted_on IS NOT NULL;
        v_progress := v_progress + v_legacy;
      ELSIF v_t = ANY (c_event_kinds) THEN
        IF v_a.unlock_condition ? 'types' OR v_t = 'cartomancy_spread_types_used' THEN
          -- a set or a distinct count of the values its matched claims carry
          SELECT COALESCE(array_agg(DISTINCT s), ARRAY[]::text[]) INTO v_seen
            FROM (SELECT r.value AS s FROM public.achievement_reports r
                   WHERE r.user_id = p_user_id AND r.kind = v_t AND r.event_id IS NOT NULL
                  UNION
                  SELECT jsonb_array_elements_text(COALESCE(v_a.meta->'legacy_seen', '[]'::jsonb))) u;
          IF v_a.unlock_condition ? 'types' THEN
            SELECT COALESCE(array_agg(t), ARRAY[]::text[]) INTO v_types
              FROM jsonb_array_elements_text(v_a.unlock_condition->'types') t;
            v_progress := (SELECT count(*)::int FROM unnest(v_types) t WHERE t = ANY (v_seen));
            v_target   := GREATEST(cardinality(v_types), 1);
          ELSE
            v_progress := cardinality(v_seen);
          END IF;
        ELSE
          -- a counter: readings (rituals) the claims were matched to
          SELECT count(DISTINCT r.event_id)::int INTO v_progress FROM public.achievement_reports r
           WHERE r.user_id = p_user_id AND r.kind = v_t AND r.event_id IS NOT NULL
             AND (v_t <> 'specific_card_drawn' OR r.value = v_a.unlock_condition->>'card');
          v_progress := v_progress + v_legacy;
        END IF;
      END IF;

      -- A type the server cannot derive keeps its row as it is.
      CONTINUE WHEN v_progress IS NULL;
      v_unlock   := v_progress >= v_target;
      v_progress := LEAST(GREATEST(v_progress, 0), v_target);

      IF v_unlock THEN
        UPDATE public.user_achievements ua
           SET progress = v_progress, unlocked_at = now(), notified = false, updated_at = now()
         WHERE ua.id = v_a.ua_id;
        PERFORM public.achievement_pay_xp(p_user_id, v_a.xp_reward);
        v_paid := v_paid OR COALESCE(v_a.xp_reward, 0) > 0;
        achievement_id   := v_a.id;
        achievement_name := v_a.name;
        xp_reward        := v_a.xp_reward;
        rarity           := v_a.rarity::text;
        newly_unlocked   := true;
        RETURN NEXT;
      ELSIF v_a.cur_progress IS DISTINCT FROM v_progress THEN
        UPDATE public.user_achievements ua
           SET progress = v_progress, updated_at = now()
         WHERE ua.id = v_a.ua_id;
      END IF;
    END LOOP;

    EXIT WHEN NOT v_paid;
  END LOOP;

  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.check_achievement_progress(uuid, text, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_achievement_progress(uuid, text, integer, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.check_achievement_progress(uuid, text, integer, text) IS
  'Re-derives the caller''s locked badges from server records and unlocks (and '
  'pays) each once. p_increment is ignored; p_activity_type/p_value only add a '
  'claim for facts the server cannot see (achievement_reports), which counts once '
  'matched to its ledger row (reading/ritual facts) or accepted (views). '
  'Idempotent: repeating a call changes nothing.';

-- ── 3. check_level_milestones: one re-derivation ──────────────────────────
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
END;
$$;

REVOKE ALL ON FUNCTION public.check_level_milestones(uuid, int, int, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_level_milestones(uuid, int, int, text) TO authenticated, service_role;

-- ── 4. What was earned stays ───────────────────────────────────────────────
DO $$
DECLARE
  v_views   integer;
  v_credits integer;
BEGIN
  -- 4a. 20261003000004's recorded view values become accepted views (valid
  --     values only; accepted on a day that counts toward no limit).
  WITH seen AS (
    SELECT DISTINCT ua.user_id, a.unlock_condition->>'activity_type' AS kind, btrim(s.v) AS v, ua.updated_at
      FROM public.user_achievements ua
      JOIN public.achievements a ON a.id = ua.achievement_id
      CROSS JOIN LATERAL jsonb_array_elements_text(
        CASE WHEN jsonb_typeof(ua.metadata->'seen') = 'array' THEN ua.metadata->'seen' ELSE '[]'::jsonb END) s(v)
     WHERE a.unlock_condition->>'activity_type' IN ('cards_explored', 'zodiac_signs_viewed', 'cartomancy_lesson_complete')
       AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = ua.user_id)
  ), normal AS (
    SELECT user_id, kind, updated_at,
           CASE
             WHEN kind = 'cards_explored' THEN
               CASE WHEN v ~ '^[0-9]{1,2}$' AND length(v) <= 2 THEN (v::int)::text END
             WHEN kind = 'zodiac_signs_viewed' THEN lower(v)
             ELSE v
           END AS v
      FROM seen
  ), valid AS (
    SELECT user_id, kind, v, min(updated_at) AS at
      FROM normal
     WHERE (kind = 'cards_explored' AND v IN (SELECT g::text FROM generate_series(0, 77) g))
        OR (kind = 'zodiac_signs_viewed' AND v IN ('aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
              'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'))
        OR (kind = 'cartomancy_lesson_complete' AND v IN ('the-deck-in-your-hand', 'the-four-suits',
              'numbers-ace-to-ten', 'the-court-cards', 'red-and-black', 'the-jokers', 'asking-a-good-question',
              'reading-one-and-three', 'reading-combinations', 'timing-with-cards', 'the-big-spreads',
              'reading-for-yourself-and-others'))
     GROUP BY 1, 2, 3
  )
  INSERT INTO public.achievement_reports (user_id, kind, slot, value, reported_at, accepted_on)
  SELECT user_id, kind, kind, v, COALESCE(at, now()), DATE '2000-01-01' FROM valid
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_views = ROW_COUNT;

  -- 4b. Locked badges whose progress came only from client reports keep it as
  --     a credit. Views: what the counter held beyond the recorded values.
  --     Sets: the values seen. Counters: the count.
  UPDATE public.user_achievements ua
     SET metadata = COALESCE(ua.metadata, '{}'::jsonb) || jsonb_build_object(
           'legacy', CASE
             WHEN a.unlock_condition->>'activity_type' IN ('cards_explored', 'zodiac_signs_viewed', 'cartomancy_lesson_complete')
               THEN GREATEST(0, COALESCE(ua.progress, 0) - COALESCE(
                      CASE WHEN jsonb_typeof(ua.metadata->'seen') = 'array'
                           THEN jsonb_array_length(ua.metadata->'seen') END, 0))
             WHEN a.unlock_condition ? 'types'
               OR a.unlock_condition->>'activity_type' = 'cartomancy_spread_types_used'
               THEN 0
             ELSE GREATEST(0, COALESCE(ua.progress, 0)) END,
           'legacy_seen', CASE
             WHEN (a.unlock_condition ? 'types'
                   OR a.unlock_condition->>'activity_type' = 'cartomancy_spread_types_used')
                  AND jsonb_typeof(ua.metadata->'seen') = 'array'
               THEN ua.metadata->'seen'
             ELSE '[]'::jsonb END),
         updated_at = now()
    FROM public.achievements a
   WHERE a.id = ua.achievement_id
     AND ua.unlocked_at IS NULL
     AND NOT (COALESCE(ua.metadata, '{}'::jsonb) ? 'legacy')
     AND a.unlock_condition->>'activity_type' IN (
           'cards_explored', 'zodiac_signs_viewed', 'cartomancy_lesson_complete',
           'spread_types_used', 'celtic_cross_complete', 'specific_card_drawn',
           'cartomancy_reading_complete', 'cartomancy_spread_types_used', 'cartomancy_romany_complete',
           'cartomancy_wish_card_drawn', 'cartomancy_joker_drawn', 'new_year_reading',
           'witching_hour_reading', 'morning_ritual', 'evening_ritual');
  GET DIAGNOSTICS v_credits = ROW_COUNT;

  RAISE NOTICE 'achievements derived: % recorded view values kept, % locked client-reported badges credited',
    v_views, v_credits;
END $$;
