/*
  # Spend keys the server reserves stay the server's; ritual XP is paid per ritual

  ## 1. A session cannot be pre-paid through the client spend RPC (p8 F03)
  The edge handler (functions/_shared/handler.ts) keys its Moonstone debits
  on `ss:<fn>:<scope>[:n]` (one charge per companion conversation for 24 h)
  and `rq:<requestId>:<digest>[:n]` (one charge per request, replays served
  from the store). spend_moonstones_for_action_srv treated ANY 'pay-per-action'
  row under the key as the charge — and spend_moonstones_for_action, still
  granted to `authenticated` for WatchAdSheet, accepts any cost from 1 to 1000
  under any key. Proved in production: a 1-Moonstone client debit under
  'ss:ai-companion-chat:sage:<uuid>' made every companion message on that
  conversation free for 24 hours (charged:false, conversationPaid:true).

    a. spend_moonstones_for_action (client) refuses an idempotency key that
       starts with 'ss:' or 'rq:' in any letter case (22023). WatchAdSheet's
       keys are '<actionKey>_<ms>_<random>', so it is unaffected. It also takes
       the per-user advisory lock the server spend takes (it never did,
       though 20260630060000 said both share it), so a client spend and a
       server spend cannot interleave their balance checks.
    b. spend_moonstones_for_action_srv counts as already paid only ITS OWN
       debit: kind 'pay-per-action', note 'AI action: <actionKey>', and at
       least the cost (amount <= -cost). Any other row under the key — a
       pre-planted client debit — is not a payment: the call charges the real
       cost under the same key (charged=true), so the handler runs it as a
       new, paid request or session. Premium soft-cap slots count only for
       the same action key.
    c. refund_action_spend_srv gives back the server's own debit under the key
       (not a planted client row that happens to share it).
  The handler needs no change and no redeploy: it already trusts the
  `charged` column (20261003000011).

  ## 2. Ritual XP is paid once per ritual, not once per UTC day (p8 F05)
  20261003000012 capped 'ritual_complete' at one award per UTC day. A ritual
  is dated by the member's local day (the guard accepts any date within a day
  of UTC), so two honest rituals on consecutive local days often fall in one
  UTC day — Los Angeles at 17:44 and 06:30 the next morning, Tokyo at 10:00
  and 07:00 the next morning — and the second earned nothing.
  Now, for a user session, ritual_complete pays when
    - the member has a server-dated daily_rituals row for a date within a day
      of UTC (the guard's window; the row need not be marked completed — the
      released Android build v1.2.0 upserts on the primary key, so only its
      ritual's first step ever persists), and
    - no ritual_complete award was made since that row was created (the most
      recently created such row: one award per ritual row, so per ritual
      date), and
    - fewer than two ritual awards were made this UTC day (any fixed time
      zone meets at most two local dates in one UTC day).
  Everything else in award_xp is 20261003000012's, unchanged.

  Every REVOKE names PUBLIC, anon and authenticated (20260817020000).
*/

-- ── 1a. The client spend RPC: no server-reserved keys ──────────────────────
CREATE OR REPLACE FUNCTION public.spend_moonstones_for_action(
  p_action_key      text,
  p_cost            integer DEFAULT 50,
  p_idempotency_key text DEFAULT NULL
)
RETURNS TABLE (
  allowed          boolean,
  new_balance      integer,
  premium_bypass   boolean,
  soft_cap_reached boolean,
  reset_at         timestamptz,
  daily_used       integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id   uuid := auth.uid();
  v_premium   boolean;
  v_balance   integer;
  v_cap       integer := 50;
  v_used      integer;
  v_oldest    timestamptz;
  v_dup_count integer;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_action_key IS NULL OR length(p_action_key) = 0 THEN RAISE EXCEPTION 'Missing action_key'; END IF;
  IF p_cost <= 0 OR p_cost > 1000 THEN RAISE EXCEPTION 'Invalid cost: %', p_cost; END IF;
  -- The edge handler's session ('ss:') and request ('rq:') keys are the
  -- server's: a client debit under one would read as that session's charge.
  IF p_idempotency_key IS NOT NULL AND lower(btrim(p_idempotency_key)) ~ '^(ss|rq):' THEN
    RAISE EXCEPTION 'This idempotency key is reserved for the server'
      USING ERRCODE = '22023';
  END IF;

  -- Serialize this user's spends with the server's (same advisory key).
  PERFORM pg_advisory_xact_lock(hashtext('moonstone_spend'), hashtext(v_user_id::text));

  v_premium := public.is_user_premium(v_user_id);

  -- Idempotency: if a transaction OR premium log entry already exists for
  -- this user + idempotency_key, return current state without re-charging.
  IF p_idempotency_key IS NOT NULL THEN
    SELECT count(*) INTO v_dup_count
      FROM public.moonstone_transactions
      WHERE user_id = v_user_id AND reference = p_idempotency_key AND kind = 'pay-per-action';
    IF v_dup_count = 0 THEN
      SELECT count(*) INTO v_dup_count
        FROM public.premium_action_log
        WHERE user_id = v_user_id AND idempotency_key = p_idempotency_key;
    END IF;
    IF v_dup_count > 0 THEN
      SELECT COALESCE(balance, 0) INTO v_balance
        FROM public.moonstone_balances WHERE user_id = v_user_id;
      RETURN QUERY SELECT true, COALESCE(v_balance, 0), v_premium, false, NULL::timestamptz, 0;
      RETURN;
    END IF;
  END IF;

  -- Premium path: log the action (with idem key), check the soft cap.
  IF v_premium THEN
    SELECT count(*), MIN(performed_at) INTO v_used, v_oldest
      FROM public.premium_action_log
      WHERE user_id = v_user_id AND performed_at > now() - interval '24 hours';

    IF v_used >= v_cap THEN
      RETURN QUERY SELECT false, NULL::integer, true, true,
                          (v_oldest + interval '24 hours'),
                          v_used;
      RETURN;
    END IF;

    INSERT INTO public.premium_action_log (user_id, action_key, idempotency_key)
      VALUES (v_user_id, p_action_key, p_idempotency_key);
    RETURN QUERY SELECT true, NULL::integer, true, false, NULL::timestamptz, (v_used + 1);
    RETURN;
  END IF;

  -- Free path: balance check + debit.
  SELECT COALESCE(balance, 0) INTO v_balance
    FROM public.moonstone_balances WHERE user_id = v_user_id;
  v_balance := COALESCE(v_balance, 0);

  IF v_balance < p_cost THEN
    RETURN QUERY SELECT false, v_balance, false, false, NULL::timestamptz, 0;
    RETURN;
  END IF;

  INSERT INTO public.moonstone_transactions (user_id, amount, kind, reference, note)
    VALUES (v_user_id, -p_cost, 'pay-per-action',
            COALESCE(p_idempotency_key, p_action_key),
            'Action: ' || p_action_key);

  RETURN QUERY SELECT true, (v_balance - p_cost), false, false, NULL::timestamptz, 0;
END;
$$;

REVOKE ALL ON FUNCTION public.spend_moonstones_for_action(text, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.spend_moonstones_for_action(text, integer, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.spend_moonstones_for_action(text, integer, text) IS
  'Client Moonstone spend (WatchAdSheet unlocks). Idempotent on '
  'p_idempotency_key; keys starting with ss: or rq: are the edge handler''s '
  'and are refused (22023).';

-- ── 1b. The server spend RPC: only its own debit is a payment ──────────────
-- Same signature and OUT columns as 20261003000011, so the deployed handler
-- keeps working unchanged.
CREATE OR REPLACE FUNCTION public.spend_moonstones_for_action_srv(
  p_user_id         uuid,
  p_action_key      text,
  p_cost            integer DEFAULT 50,
  p_idempotency_key text DEFAULT NULL
)
RETURNS TABLE (
  allowed          boolean,
  new_balance      integer,
  premium_bypass   boolean,
  soft_cap_reached boolean,
  reset_at         timestamptz,
  daily_used       integer,
  charged          boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_premium   boolean;
  v_balance   integer;
  v_cap       integer := 50;
  v_used      integer;
  v_oldest    timestamptz;
  v_paid      boolean := false;
BEGIN
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'Missing user_id'; END IF;
  IF p_action_key IS NULL OR length(p_action_key) = 0 THEN RAISE EXCEPTION 'Missing action_key'; END IF;
  IF p_cost <= 0 OR p_cost > 1000 THEN RAISE EXCEPTION 'Invalid cost: %', p_cost; END IF;

  -- Serialize this user's spends (the client RPC takes the same key).
  PERFORM pg_advisory_xact_lock(hashtext('moonstone_spend'), hashtext(p_user_id::text));

  v_premium := public.is_user_premium(p_user_id);

  -- Idempotency: the key was already paid by an earlier call of THIS
  -- function — its own debit for this action, for at least the cost, or a
  -- Premium soft-cap slot for this action. Report it allowed but NOT charged;
  -- the caller serves the stored result and must not refund it. Any other
  -- row under the key (a client debit of any size) is not a payment.
  IF p_idempotency_key IS NOT NULL THEN
    SELECT EXISTS (
             SELECT 1 FROM public.moonstone_transactions t
              WHERE t.user_id = p_user_id
                AND t.reference = p_idempotency_key
                AND t.kind = 'pay-per-action'
                AND t.note = 'AI action: ' || p_action_key
                AND t.amount <= -p_cost)
        OR EXISTS (
             SELECT 1 FROM public.premium_action_log l
              WHERE l.user_id = p_user_id
                AND l.idempotency_key = p_idempotency_key
                AND l.action_key = p_action_key)
      INTO v_paid;
    IF v_paid THEN
      SELECT COALESCE(balance, 0) INTO v_balance
        FROM public.moonstone_balances WHERE user_id = p_user_id;
      RETURN QUERY SELECT true, COALESCE(v_balance, 0), v_premium, false, NULL::timestamptz, 0, false;
      RETURN;
    END IF;
  END IF;

  -- Premium path: log for the soft cap, no debit.
  IF v_premium THEN
    SELECT count(*), MIN(performed_at) INTO v_used, v_oldest
      FROM public.premium_action_log
      WHERE user_id = p_user_id AND performed_at > now() - interval '24 hours';
    IF v_used >= v_cap THEN
      RETURN QUERY SELECT false, NULL::integer, true, true, (v_oldest + interval '24 hours'), v_used, false;
      RETURN;
    END IF;
    INSERT INTO public.premium_action_log (user_id, action_key, idempotency_key)
      VALUES (p_user_id, p_action_key, p_idempotency_key);
    RETURN QUERY SELECT true, NULL::integer, true, false, NULL::timestamptz, (v_used + 1), true;
    RETURN;
  END IF;

  -- Free path: balance check + debit (race-free under the advisory lock).
  SELECT COALESCE(balance, 0) INTO v_balance
    FROM public.moonstone_balances WHERE user_id = p_user_id;
  v_balance := COALESCE(v_balance, 0);

  IF v_balance < p_cost THEN
    RETURN QUERY SELECT false, v_balance, false, false, NULL::timestamptz, 0, false;
    RETURN;
  END IF;

  INSERT INTO public.moonstone_transactions (user_id, amount, kind, reference, note)
    VALUES (p_user_id, -p_cost, 'pay-per-action',
            COALESCE(p_idempotency_key, p_action_key),
            'AI action: ' || p_action_key);

  RETURN QUERY SELECT true, (v_balance - p_cost), false, false, NULL::timestamptz, 0, true;
END;
$$;

REVOKE ALL ON FUNCTION public.spend_moonstones_for_action_srv(uuid, text, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.spend_moonstones_for_action_srv(uuid, text, integer, text) TO service_role;

COMMENT ON FUNCTION public.spend_moonstones_for_action_srv(uuid, text, integer, text) IS
  'Service-role Moonstone debit for an AI action (Premium: a soft-cap slot). '
  'Idempotent on p_idempotency_key: when this function already debited the key '
  'for this action (note ''AI action: <key>'', at least the cost) it returns '
  'allowed=true, charged=false. Any other row under the key is not a payment.';

-- ── 1c. The server refund gives back the server's own debit ────────────────
CREATE OR REPLACE FUNCTION public.refund_action_spend_srv(
  p_user_id         uuid,
  p_idempotency_key text
)
RETURNS TABLE (refunded boolean, new_balance integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_spend_id       uuid;
  v_amount         integer;
  v_dup_id         uuid;
  v_premium_log_id uuid;
  v_balance        integer;
  v_did            boolean := false;
BEGIN
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'Missing user_id'; END IF;
  IF p_idempotency_key IS NULL OR length(p_idempotency_key) = 0 THEN
    RAISE EXCEPTION 'Missing idempotency_key';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('moonstone_spend'), hashtext(p_user_id::text));

  -- Free-user debit -> credit it back. The server's own debit first (note
  -- 'AI action: …'), the latest one: a client row under the same key is not
  -- what the server charged.
  SELECT t.id, t.amount INTO v_spend_id, v_amount
    FROM public.moonstone_transactions t
    WHERE t.user_id = p_user_id
      AND t.reference = p_idempotency_key
      AND t.kind = 'pay-per-action'
    ORDER BY (t.note LIKE 'AI action: %') DESC, t.created_at DESC
    LIMIT 1;

  IF v_spend_id IS NOT NULL THEN
    SELECT t.id INTO v_dup_id
      FROM public.moonstone_transactions t
      WHERE t.user_id = p_user_id
        AND t.reference = p_idempotency_key
        AND t.kind = 'refund'
      LIMIT 1;
    IF v_dup_id IS NULL THEN
      INSERT INTO public.moonstone_transactions (user_id, amount, kind, reference, note)
        VALUES (p_user_id, ABS(v_amount), 'refund', p_idempotency_key, 'AI action failed - server refund');
    END IF;
    v_did := true;
  END IF;

  -- Premium soft-cap log -> remove so the failed call doesn't count.
  SELECT l.id INTO v_premium_log_id
    FROM public.premium_action_log l
    WHERE l.user_id = p_user_id AND l.idempotency_key = p_idempotency_key
    ORDER BY l.performed_at DESC
    LIMIT 1;
  IF v_premium_log_id IS NOT NULL THEN
    DELETE FROM public.premium_action_log WHERE id = v_premium_log_id;
    v_did := true;
  END IF;

  SELECT COALESCE(balance, 0) INTO v_balance
    FROM public.moonstone_balances WHERE user_id = p_user_id;

  RETURN QUERY SELECT v_did, COALESCE(v_balance, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.refund_action_spend_srv(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_action_spend_srv(uuid, text) TO service_role;

-- ── 2. award_xp: ritual XP once per ritual ─────────────────────────────────
-- The body of 20261003000012 with one change: the 'ritual_complete' ceiling.
CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id uuid,
  p_activity_type text,
  p_xp_amount int
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_profile      profiles%ROWTYPE;
  v_session      boolean := (auth.uid() IS NOT NULL AND NOT COALESCE(public.is_admin(), false));
  v_amount       int;
  v_cap          int;
  v_today        int;
  v_rung         int;
  v_utc_midnight timestamptz := (date_trunc('day', now() AT TIME ZONE 'UTC')) AT TIME ZONE 'UTC';
  v_utc_today    date := (now() AT TIME ZONE 'UTC')::date;
  v_ritual_at    timestamptz;
  v_new_xp       int;
  v_old_level    int;
  v_new_level    int;
  v_seeker_rank  text;
  v_level_up     boolean := false;
BEGIN
  PERFORM public.assert_acting_for(p_user_id);

  -- A user session gets the server's XP table; the request's amount is only
  -- honoured for the service role and admins.
  IF v_session THEN
    v_amount := CASE p_activity_type
      WHEN 'ritual_complete'      THEN 50
      WHEN 'reading_saved'        THEN 10
      WHEN 'reading_complete'     THEN 5
      WHEN 'journal_entry'        THEN 15
      WHEN 'quiz_complete'        THEN 25
      WHEN 'horoscope_viewed'     THEN 5
      WHEN 'streak_milestone_7'   THEN 100
      WHEN 'streak_milestone_30'  THEN 500
      WHEN 'streak_milestone_100' THEN 2000
      WHEN 'streak_milestone_365' THEN 5000
      WHEN 'community_post'       THEN 15
      WHEN 'community_comment'    THEN 5
      ELSE NULL
    END;
    IF v_amount IS NULL THEN
      RAISE EXCEPTION 'Unknown activity type: %', p_activity_type
        USING ERRCODE = 'check_violation';
    END IF;
  ELSE
    v_amount := p_xp_amount;
  END IF;
  IF v_amount IS NULL OR v_amount <= 0 THEN
    RAISE EXCEPTION 'XP amount must be positive' USING ERRCODE = 'check_violation';
  END IF;

  -- Lock the profile first: the ceilings below are read-then-write.
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'User not found');
  END IF;
  v_old_level := COALESCE(v_profile.level, 1);

  IF v_session THEN
    IF p_activity_type LIKE 'streak_milestone_%' THEN
      -- Only a rung the server recorded (it checked profiles.streak), once.
      v_rung := substring(p_activity_type FROM 'streak_milestone_([0-9]+)')::int;
      IF NOT EXISTS (
           SELECT 1 FROM public.moonstone_streak_milestones m
            WHERE m.user_id = p_user_id AND m.streak_day = v_rung
         )
         OR EXISTS (
           SELECT 1 FROM public.xp_activities x
            WHERE x.user_id = p_user_id AND x.activity_type = p_activity_type
         ) THEN
        v_amount := 0;
      END IF;
    ELSIF p_activity_type = 'ritual_complete' THEN
      -- One award per ritual: the member's most recently created ritual row
      -- (server-dated, for a date within a day of UTC) must have had no
      -- ritual award since it was created; and two a UTC day at most.
      SELECT d.created_at INTO v_ritual_at
        FROM public.daily_rituals d
       WHERE d.user_id = p_user_id
         AND d.date BETWEEN v_utc_today - 1 AND v_utc_today + 1
         AND (d.created_at AT TIME ZONE 'UTC')::date BETWEEN d.date - 1 AND d.date + 1
       ORDER BY d.created_at DESC
       LIMIT 1;
      SELECT count(*) INTO v_today
        FROM public.xp_activities x
       WHERE x.user_id = p_user_id
         AND x.activity_type = 'ritual_complete'
         AND x.created_at >= v_utc_midnight;
      IF v_ritual_at IS NULL
         OR v_today >= 2
         OR EXISTS (
           SELECT 1 FROM public.xp_activities x
            WHERE x.user_id = p_user_id
              AND x.activity_type = 'ritual_complete'
              AND x.created_at >= v_ritual_at
         ) THEN
        v_amount := 0;
      END IF;
    ELSE
      v_cap := CASE p_activity_type
        WHEN 'reading_complete'  THEN 20
        WHEN 'reading_saved'     THEN 20
        WHEN 'journal_entry'     THEN 10
        WHEN 'quiz_complete'     THEN 10
        WHEN 'horoscope_viewed'  THEN 3
        WHEN 'community_post'    THEN 10
        WHEN 'community_comment' THEN 30
        ELSE 0
      END;
      SELECT count(*) INTO v_today
        FROM public.xp_activities x
       WHERE x.user_id = p_user_id
         AND x.activity_type = p_activity_type
         AND x.created_at >= v_utc_midnight;
      IF v_today >= v_cap THEN
        v_amount := 0;
      END IF;
    END IF;

    IF v_amount = 0 THEN
      RETURN jsonb_build_object(
        'xp_earned', 0,
        'total_xp', COALESCE(v_profile.xp, 0),
        'old_level', v_old_level,
        'new_level', v_old_level,
        'level_up', false,
        'seeker_rank', COALESCE(v_profile.seeker_rank, 'Novice Seeker'),
        'capped', true
      );
    END IF;
  END IF;

  v_new_xp := COALESCE(v_profile.xp, 0) + v_amount;

  SELECT COALESCE(MAX(level), v_old_level) INTO v_new_level
  FROM level_thresholds
  WHERE xp_required <= v_new_xp;

  v_level_up := v_new_level > v_old_level;

  SELECT COALESCE(rank_name, 'Novice Seeker') INTO v_seeker_rank
  FROM seeker_ranks
  WHERE v_new_level BETWEEN min_level AND max_level
  LIMIT 1;

  PERFORM set_config('app.server_write', 'on', true);
  UPDATE profiles
  SET xp = v_new_xp, level = v_new_level, seeker_rank = v_seeker_rank, updated_at = now()
  WHERE id = p_user_id;
  PERFORM set_config('app.server_write', 'off', true);

  INSERT INTO xp_activities (user_id, activity_type, xp_earned, created_at)
  VALUES (p_user_id, p_activity_type, v_amount, now());

  RETURN jsonb_build_object(
    'xp_earned', v_amount,
    'total_xp', v_new_xp,
    'old_level', v_old_level,
    'new_level', v_new_level,
    'level_up', v_level_up,
    'seeker_rank', v_seeker_rank,
    'capped', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.award_xp(uuid, text, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_xp(uuid, text, int) TO authenticated, service_role;
