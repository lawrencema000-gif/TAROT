-- WP-P5-03 (health-status-02). The welcome trigger (20260130214743) called pg_net with a
-- URL and key from app.settings that were never set; every opt-in failed inside the
-- trigger with a swallowed WARNING. Opt-ins now only enqueue; a cron drain sends
-- through send-welcome-email (webhook auth, WP-P0-04) with retries and a recorded
-- result. Nothing is backfilled: only opt-ins after this migration are enqueued (D35 A).
-- The drain's schedule is a later migration (release 2, after the owner confirms the
-- sender); until then queued rows wait, unsent.

CREATE TABLE IF NOT EXISTS public.email_outbox (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind            text NOT NULL CHECK (kind IN ('welcome')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  attempts        integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error      text,                 -- 'resend 429', 'not_subscribed', … never an address
  sent_at         timestamptz,
  provider_id     text,
  UNIQUE (user_id, kind)                -- one welcome per member, ever
);
CREATE INDEX IF NOT EXISTS email_outbox_due_idx
  ON public.email_outbox (next_attempt_at) WHERE sent_at IS NULL AND attempts < 5;
ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_outbox FROM PUBLIC, anon, authenticated;

-- A separate table, not a profiles column: a member's own session can read their profile row.
CREATE TABLE IF NOT EXISTS public.newsletter_profile_tokens (
  user_id    uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  token      uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.newsletter_profile_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.newsletter_profile_tokens FROM PUBLIC, anon, authenticated;

-- The trigger only enqueues: no pg_net, no settings, no key.
CREATE OR REPLACE FUNCTION public.send_welcome_email_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.subscribed_to_newsletter IS TRUE
     AND (TG_OP = 'INSERT' OR OLD.subscribed_to_newsletter IS DISTINCT FROM TRUE) THEN
    BEGIN
      INSERT INTO public.email_outbox (user_id, kind) VALUES (NEW.id, 'welcome')
      ON CONFLICT (user_id, kind) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      -- Never block a sign-up or a Settings change over an email.
      RAISE WARNING 'welcome outbox insert failed for %: %', NEW.id, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;
-- The trigger on_newsletter_subscribe_send_welcome (AFTER INSERT OR UPDATE OF
-- subscribed_to_newsletter ON profiles) is unchanged and now calls this body.

-- Every opt-in gets a server-side consent time (the client value is overwritten).
CREATE OR REPLACE FUNCTION public.profiles_stamp_newsletter_consent()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.subscribed_to_newsletter IS TRUE
     AND (TG_OP = 'INSERT' OR OLD.subscribed_to_newsletter IS DISTINCT FROM TRUE) THEN
    NEW.newsletter_subscribed_at := now();
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS profiles_stamp_newsletter_consent ON public.profiles;
CREATE TRIGGER profiles_stamp_newsletter_consent
  BEFORE INSERT OR UPDATE OF subscribed_to_newsletter ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_stamp_newsletter_consent();

-- Unsubscribe: the course's tokens first (unchanged), then a member's profile token.
-- Same signature, so the anon/authenticated grants of 20260629150000:50 carry over.
CREATE OR REPLACE FUNCTION public.newsletter_unsubscribe(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_email text;
  v_user  uuid;
BEGIN
  UPDATE public.newsletter_signups
     SET unsubscribed_at = now()
   WHERE unsubscribe_token = p_token
     AND unsubscribed_at IS NULL
  RETURNING email INTO v_email;
  IF v_email IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'email', v_email);
  END IF;

  UPDATE public.profiles p
     SET subscribed_to_newsletter = false
    FROM public.newsletter_profile_tokens t
   WHERE t.token = p_token
     AND p.id = t.user_id
     AND p.subscribed_to_newsletter IS TRUE
  RETURNING p.id INTO v_user;
  IF v_user IS NOT NULL THEN
    -- UnsubscribePage shows success only with an address; profiles.email is nullable.
    SELECT COALESCE(NULLIF(p.email, ''), u.email) INTO v_email
      FROM public.profiles p LEFT JOIN auth.users u ON u.id = p.id
     WHERE p.id = v_user;
    RETURN jsonb_build_object('ok', true, 'email', COALESCE(v_email, ''));
  END IF;

  -- p12 gap-1-17: a token that exists but is already unsubscribed is not the
  -- same answer as a token that belongs to nobody. Tokens are v4 UUIDs (122
  -- random bits), so telling the two apart reveals nothing guessable.
  IF EXISTS (SELECT 1 FROM public.newsletter_signups WHERE unsubscribe_token = p_token)
     OR EXISTS (SELECT 1 FROM public.newsletter_profile_tokens WHERE token = p_token) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_unsubscribed');
  END IF;
  RETURN jsonb_build_object('ok', false, 'reason', 'unknown_token');
END;
$$;

-- The landing course: stop retrying a row that keeps failing (send-newsletter-course).
ALTER TABLE public.newsletter_signups ADD COLUMN IF NOT EXISTS send_failures integer NOT NULL DEFAULT 0;
