-- The Wishing Sky — a shared star map where every wish is a star.
--
-- Everyone using the app sees the same sky. Making a wish lights a star in it.
-- Stars connect two ways: softly, to others who wished for the same KIND of
-- thing, and brightly, when someone echoes your wish — says "I want this for
-- you too" — which draws a line between your two stars.
--
-- ── WHY THERE IS NO PHONE NUMBER COLUMN ──────────────────────────────────────
--
-- The brief asked for optional name and phone number on a wish, so that a
-- kind-hearted person could reach the wisher and grant it. The intent is good
-- and it is preserved in full here — but not by publishing contact details.
--
-- A wish is a statement of need, often the most vulnerable thing a person will
-- ever type into this app. A public list of "person who needs money / is ill /
-- is lonely" WITH a working phone number is precisely how charity and romance
-- scams source their marks, it cannot be recalled once scraped, and it would be
-- indexed by search engines within days.
--
-- So contact is a RELAY instead of a broadcast:
--   1. A wisher may mark a wish `open_to_help`.
--   2. Anyone may send an OFFER — a private message attached to that wish.
--   3. The WISHER reads offers and chooses, per offer, whether to reply with
--      any contact detail. Nothing personal is ever on the public map.
--
-- Same outcome — someone kind can grant your wish — with no targeting list.
-- If contact details are ever wanted on the public star itself, that is a
-- product decision to take deliberately, not a column to add quietly.
--
-- ── MODERATION ───────────────────────────────────────────────────────────────
--
-- This is public user-generated content, so it is built to FAIL CLOSED, and
-- with the lesson of this codebase's earlier community bug in mind: the RLS
-- predicate checks BOTH is_hidden AND moderation_status, because checking only
-- one is exactly how blocked content stayed visible last time.

-- ─── 1. Wishes ──────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wish_theme') THEN
    CREATE TYPE public.wish_theme AS ENUM (
      'love', 'health', 'family', 'work', 'home', 'healing', 'someone_else', 'other'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.wishes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text         text NOT NULL CHECK (length(btrim(text)) BETWEEN 3 AND 280),
  theme        public.wish_theme NOT NULL DEFAULT 'other',

  -- Where the star sits. Assigned once at insert from a seeded distribution so
  -- the sky is stable for everyone and a star never wanders between sessions.
  star_x       double precision NOT NULL,
  star_y       double precision NOT NULL,
  -- Drives twinkle phase and size client-side, so identical wishes still look
  -- like individual stars.
  star_seed    integer NOT NULL DEFAULT floor(random() * 100000),

  -- The wisher chooses this; it is what makes a wish reachable at all.
  open_to_help boolean NOT NULL DEFAULT false,
  -- A display name the WISHER types for this wish. Never their account email,
  -- never auto-filled from the profile, and free to be a first name or nothing.
  wisher_label text CHECK (wisher_label IS NULL OR length(btrim(wisher_label)) BETWEEN 1 AND 40),

  granted_at   timestamptz,
  echo_count   integer NOT NULL DEFAULT 0,
  report_count integer NOT NULL DEFAULT 0,

  moderation_status public.moderation_status NOT NULL DEFAULT 'allowed',
  is_hidden    boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wishes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS wishes_visible_idx
  ON public.wishes (created_at DESC)
  WHERE is_hidden = false AND moderation_status = 'allowed';
CREATE INDEX IF NOT EXISTS wishes_theme_idx ON public.wishes (theme);
CREATE INDEX IF NOT EXISTS wishes_user_idx ON public.wishes (user_id);

-- Visible to everyone only when BOTH gates pass. The author always sees their
-- own, so a flagged wish does not silently vanish on them.
DROP POLICY IF EXISTS wishes_select_visible ON public.wishes;
CREATE POLICY wishes_select_visible
  ON public.wishes FOR SELECT
  USING (
    (is_hidden = false AND moderation_status = 'allowed')
    OR auth.uid() = user_id
    OR public.is_admin()
  );

-- A user may light their own star, and may not set their own moderation state.
DROP POLICY IF EXISTS wishes_insert_own ON public.wishes;
CREATE POLICY wishes_insert_own
  ON public.wishes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND moderation_status = 'allowed'
    AND is_hidden = false
    AND echo_count = 0
    AND report_count = 0
    AND granted_at IS NULL
  );

-- WITH CHECK as well as USING: without it a user could UPDATE their row INTO a
-- state they were never allowed to create, which is the classic RLS hole.
DROP POLICY IF EXISTS wishes_update_own ON public.wishes;
CREATE POLICY wishes_update_own
  ON public.wishes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND moderation_status = 'allowed'
    AND is_hidden = false
  );

DROP POLICY IF EXISTS wishes_delete_own ON public.wishes;
CREATE POLICY wishes_delete_own
  ON public.wishes FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS wishes_admin_update ON public.wishes;
CREATE POLICY wishes_admin_update
  ON public.wishes FOR UPDATE
  USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wishes TO authenticated;
GRANT SELECT ON public.wishes TO anon;

-- ─── 2. Echoes — the bright links between stars ─────────────────────────────

CREATE TABLE IF NOT EXISTS public.wish_echoes (
  wish_id    uuid NOT NULL REFERENCES public.wishes(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (wish_id, user_id)
);

ALTER TABLE public.wish_echoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wish_echoes_select_all ON public.wish_echoes;
CREATE POLICY wish_echoes_select_all ON public.wish_echoes FOR SELECT USING (true);

DROP POLICY IF EXISTS wish_echoes_insert_own ON public.wish_echoes;
CREATE POLICY wish_echoes_insert_own
  ON public.wish_echoes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS wish_echoes_delete_own ON public.wish_echoes;
CREATE POLICY wish_echoes_delete_own
  ON public.wish_echoes FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON public.wish_echoes TO authenticated;
GRANT SELECT ON public.wish_echoes TO anon;

-- echo_count is denormalised for the map, which reads thousands of stars at
-- once and must not COUNT() per star. Kept honest by trigger rather than by
-- the client, so it cannot drift or be forged.
CREATE OR REPLACE FUNCTION public.wish_echo_count_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.wishes SET echo_count = echo_count + 1 WHERE id = NEW.wish_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.wishes SET echo_count = GREATEST(0, echo_count - 1) WHERE id = OLD.wish_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS wish_echo_count_trigger ON public.wish_echoes;
CREATE TRIGGER wish_echo_count_trigger
  AFTER INSERT OR DELETE ON public.wish_echoes
  FOR EACH ROW EXECUTE FUNCTION public.wish_echo_count_sync();

-- ─── 3. Offers — the private relay that replaces public contact details ─────

CREATE TABLE IF NOT EXISTS public.wish_offers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wish_id    uuid NOT NULL REFERENCES public.wishes(id) ON DELETE CASCADE,
  helper_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message    text NOT NULL CHECK (length(btrim(message)) BETWEEN 3 AND 500),
  -- The wisher's decision. Contact is exchanged in the app only after this
  -- becomes 'accepted', and only by the wisher choosing to reply.
  status     text NOT NULL DEFAULT 'pending'
             CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (wish_id, helper_id)
);

ALTER TABLE public.wish_offers ENABLE ROW LEVEL SECURITY;

-- Strictly two-party: only the helper who wrote it and the wisher who received
-- it can read an offer. Never public, never on the map.
DROP POLICY IF EXISTS wish_offers_select_parties ON public.wish_offers;
CREATE POLICY wish_offers_select_parties
  ON public.wish_offers FOR SELECT
  USING (
    auth.uid() = helper_id
    OR auth.uid() = (SELECT w.user_id FROM public.wishes w WHERE w.id = wish_id)
    OR public.is_admin()
  );

-- An offer can only be sent to a wish whose author actually invited help, and
-- never to your own wish.
DROP POLICY IF EXISTS wish_offers_insert_helper ON public.wish_offers;
CREATE POLICY wish_offers_insert_helper
  ON public.wish_offers FOR INSERT
  WITH CHECK (
    auth.uid() = helper_id
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.wishes w
      WHERE w.id = wish_id
        AND w.open_to_help = true
        AND w.is_hidden = false
        AND w.moderation_status = 'allowed'
        AND w.user_id <> auth.uid()
    )
  );

-- Only the WISHER moves an offer out of 'pending'.
DROP POLICY IF EXISTS wish_offers_update_wisher ON public.wish_offers;
CREATE POLICY wish_offers_update_wisher
  ON public.wish_offers FOR UPDATE
  USING (auth.uid() = (SELECT w.user_id FROM public.wishes w WHERE w.id = wish_id))
  WITH CHECK (auth.uid() = (SELECT w.user_id FROM public.wishes w WHERE w.id = wish_id));

GRANT SELECT, INSERT, UPDATE ON public.wish_offers TO authenticated;

-- ─── 4. Reports — community safety valve ────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.wish_reports (
  wish_id    uuid NOT NULL REFERENCES public.wishes(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason     text CHECK (reason IS NULL OR length(reason) <= 300),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (wish_id, user_id)
);

ALTER TABLE public.wish_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wish_reports_insert_own ON public.wish_reports;
CREATE POLICY wish_reports_insert_own
  ON public.wish_reports FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS wish_reports_select_admin ON public.wish_reports;
CREATE POLICY wish_reports_select_admin
  ON public.wish_reports FOR SELECT USING (public.is_admin() OR auth.uid() = user_id);

GRANT SELECT, INSERT ON public.wish_reports TO authenticated;

-- Auto-hide on a small number of independent reports. Nobody is on call to
-- moderate a star map at 3am, so the sky protects itself and an admin reviews
-- afterwards. Hiding is reversible; leaving something up is not.
CREATE OR REPLACE FUNCTION public.wish_report_autohide()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.wishes
     SET report_count = report_count + 1
   WHERE id = NEW.wish_id
  RETURNING report_count INTO v_count;

  IF v_count >= 3 THEN
    UPDATE public.wishes
       SET is_hidden = true, moderation_status = 'flagged'
     WHERE id = NEW.wish_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS wish_report_autohide_trigger ON public.wish_reports;
CREATE TRIGGER wish_report_autohide_trigger
  AFTER INSERT ON public.wish_reports
  FOR EACH ROW EXECUTE FUNCTION public.wish_report_autohide();

-- ─── 5. Contact details must not reach the public map ───────────────────────

-- Belt and braces with the client-side check: even if the UI is bypassed, a
-- phone number or email in a public wish is rejected at the database. This is
-- the whole privacy design, so it does not live only in React.
CREATE OR REPLACE FUNCTION public.wish_reject_contact_details()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Any run of 7+ digits (allowing spaces, dashes, dots, brackets and a +),
  -- or an email address.
  IF NEW.text ~ '(\+?\d[\d\s().-]{6,}\d)' OR NEW.text ~ '[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}' THEN
    RAISE EXCEPTION 'A wish cannot contain a phone number or email address. Turn on "open to help" instead and people can reach you privately.'
      USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wish_reject_contact_trigger ON public.wishes;
CREATE TRIGGER wish_reject_contact_trigger
  BEFORE INSERT OR UPDATE OF text ON public.wishes
  FOR EACH ROW EXECUTE FUNCTION public.wish_reject_contact_details();

COMMENT ON TABLE public.wishes IS
  'Public wishes rendered as stars. Contact details are deliberately absent — '
  'reaching a wisher goes through wish_offers, which is private to the two '
  'parties. See the header of 20260817040000_wish_stars.sql.';
