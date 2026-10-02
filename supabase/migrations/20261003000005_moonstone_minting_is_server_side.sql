/*
  # Moonstones are minted by the server, not by the client's say-so

  Two client-callable SECURITY DEFINER RPCs credited Moonstones with no
  server-side check of the claimed event (p7-ai-audit §0.1, proved live:
  three REST calls with fabricated ad-event ids and one fabricated quiz id
  took a QA balance from 100 to 710 with zero ads watched):

    moonstone_credit_for_ad(p_ad_event_id, p_amount)   20260601000000:52
      any 8+ character id, any amount up to 200, GRANT TO authenticated
    moonstone_award_quiz_completion(p_quiz_id, p_amount) 20260519000000:45
      any id, up to 10 per call, GRANT TO authenticated

  Every AI reading costs 50, so the spend side (server-authoritative since
  20260630060000) was moot: earning was free.

  (a) Quizzes. The credit moves to an AFTER INSERT trigger on quiz_results,
      the row the client already writes when a quiz is finished. 2 stones,
      once per (user, quiz_id) through the existing partial unique index
      (user_id, reference) WHERE kind = 'quiz-complete' (ON CONFLICT DO
      NOTHING, so quizzes credited by the old RPC are not credited twice),
      and at most 10 quiz credits per user per UTC day — quiz_results is
      client-insertable with any quiz_id, so without a daily bound the hole
      would just have moved one table over. Bounded exposure: 20 stones/day.
      moonstone_award_quiz_completion keeps running for service_role only.

  (b) Rewarded ads. moonstone_credit_for_ad is revoked from clients. The
      credit goes through the new edge function ad-reward, which calls
      moonstone_credit_for_ad_srv(p_user_id, p_ad_event_id) as service_role.
      The _srv function fixes the amount at 50 and enforces, under a per-user
      advisory lock: at most 6 credits per UTC day, at least 20 s since the
      last credit, idempotency on the client's ad_event_id (a replay returns
      the existing outcome and does not count against the caps). Bounded
      exposure without AdMob server-side verification: 300 stones per user
      per day. True verification — the AdMob SSV callback with its signed
      query — is an AdMob console task for the owner; the edge function is
      where that callback would land.
*/

-- ── (a) Quiz credit is a consequence of the quiz_results row ───────────────
CREATE OR REPLACE FUNCTION public.moonstone_credit_quiz_result()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_today_credits integer;
  v_utc_midnight  timestamptz := (date_trunc('day', now() AT TIME ZONE 'UTC')) AT TIME ZONE 'UTC';
BEGIN
  IF NEW.user_id IS NULL OR NEW.quiz_id IS NULL
     OR length(NEW.quiz_id) < 1 OR length(NEW.quiz_id) > 64 THEN
    RETURN NULL;
  END IF;

  SELECT count(*) INTO v_today_credits
    FROM public.moonstone_transactions t
   WHERE t.user_id = NEW.user_id
     AND t.kind = 'quiz-complete'
     AND t.created_at >= v_utc_midnight;
  IF v_today_credits >= 10 THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.moonstone_transactions (user_id, amount, kind, reference, note)
  VALUES (NEW.user_id, 2, 'quiz-complete', NEW.quiz_id, 'Quiz completed')
  ON CONFLICT (user_id, reference) WHERE kind = 'quiz-complete' DO NOTHING;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.moonstone_credit_quiz_result() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS quiz_results_credit_moonstones ON public.quiz_results;
CREATE TRIGGER quiz_results_credit_moonstones
  AFTER INSERT ON public.quiz_results
  FOR EACH ROW EXECUTE FUNCTION public.moonstone_credit_quiz_result();

REVOKE ALL ON FUNCTION public.moonstone_award_quiz_completion(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.moonstone_award_quiz_completion(text, integer) TO service_role;

-- ── (b) Rewarded-ad credit: service role, fixed amount, bounded ───────────
CREATE OR REPLACE FUNCTION public.moonstone_credit_for_ad_srv(
  p_user_id     uuid,
  p_ad_event_id text
)
RETURNS TABLE (
  amount_credited  integer,
  new_balance      integer,
  already_credited boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_amount       CONSTANT integer  := 50;
  v_daily_cap    CONSTANT integer  := 6;
  v_min_gap      CONSTANT interval := interval '20 seconds';
  v_utc_midnight timestamptz := (date_trunc('day', now() AT TIME ZONE 'UTC')) AT TIME ZONE 'UTC';
  v_inserted     uuid;
  v_balance      integer;
  v_today        integer;
  v_last         timestamptz;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id required' USING ERRCODE = 'null_value_not_allowed';
  END IF;
  IF p_ad_event_id IS NULL OR length(p_ad_event_id) < 8 OR length(p_ad_event_id) > 128 THEN
    RAISE EXCEPTION 'Invalid ad event id' USING ERRCODE = 'check_violation';
  END IF;

  -- One credit at a time per user: the caps below are read-then-write.
  PERFORM pg_advisory_xact_lock(hashtext('moonstone_credit_for_ad:' || p_user_id::text));

  -- A replay of an event already credited returns the outcome; it is not
  -- another ad and does not count against the caps.
  IF EXISTS (
    SELECT 1 FROM public.moonstone_transactions t
     WHERE t.user_id = p_user_id AND t.kind = 'rewarded-ad' AND t.reference = p_ad_event_id
  ) THEN
    SELECT COALESCE(mb.balance, 0) INTO v_balance
      FROM public.moonstone_balances mb WHERE mb.user_id = p_user_id;
    RETURN QUERY SELECT 0, COALESCE(v_balance, 0), true;
    RETURN;
  END IF;

  SELECT count(*) INTO v_today
    FROM public.moonstone_transactions t
   WHERE t.user_id = p_user_id AND t.kind = 'rewarded-ad' AND t.created_at >= v_utc_midnight;
  IF v_today >= v_daily_cap THEN
    RAISE EXCEPTION 'AD_DAILY_CAP: % rewarded ads already credited today', v_daily_cap;
  END IF;

  SELECT max(t.created_at) INTO v_last
    FROM public.moonstone_transactions t
   WHERE t.user_id = p_user_id AND t.kind = 'rewarded-ad';
  IF v_last IS NOT NULL AND v_last > now() - v_min_gap THEN
    RAISE EXCEPTION 'AD_TOO_SOON: at least % between rewarded ads', v_min_gap;
  END IF;

  INSERT INTO public.moonstone_transactions (user_id, amount, kind, reference, note)
  VALUES (p_user_id, v_amount, 'rewarded-ad', p_ad_event_id, 'Rewarded ad')
  ON CONFLICT (user_id, kind, reference) WHERE kind = 'rewarded-ad' AND reference IS NOT NULL
  DO NOTHING
  RETURNING id INTO v_inserted;

  SELECT COALESCE(mb.balance, 0) INTO v_balance
    FROM public.moonstone_balances mb WHERE mb.user_id = p_user_id;

  RETURN QUERY SELECT
    (CASE WHEN v_inserted IS NULL THEN 0 ELSE v_amount END)::integer,
    COALESCE(v_balance, 0),
    (v_inserted IS NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.moonstone_credit_for_ad_srv(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.moonstone_credit_for_ad_srv(uuid, text) TO service_role;

REVOKE ALL ON FUNCTION public.moonstone_credit_for_ad(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.moonstone_credit_for_ad(text, integer) TO service_role;

COMMENT ON FUNCTION public.moonstone_credit_for_ad_srv(uuid, text) IS
  'Service-role credit for a completed rewarded ad: 50 Moonstones, at most 6 '
  'per user per UTC day, at least 20 s apart, idempotent per ad_event_id. '
  'Called by the ad-reward edge function; never by a client.';
