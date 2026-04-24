-- ============================================================================
-- Advisor verification pipeline
-- ============================================================================
-- First-pass self-serve verification flow. Replaces ad-hoc "email us and
-- we'll hand-approve" with a structured submission:
--   1. Advisor uploads a government ID image AND a short selfie video to
--      a private Storage bucket.
--   2. Submits a verification row (status='pending').
--   3. Admin reviews in the AdminPage moderation panel and flips to
--      'approved' or 'rejected' with optional notes.
--   4. Approval automatically sets advisor_profiles.is_hidden=false so the
--      advisor appears in the public directory.
--
-- Storage policies are intentionally strict — private bucket, only the
-- uploader + admins can read their own row.
-- ============================================================================

-- Ensure the storage bucket exists (Supabase-specific).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'advisor-verification',
  'advisor-verification',
  false,
  50 * 1024 * 1024,   -- 50 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: user can upload/read/update files under their own user_id/
-- path prefix; admins can read all.
DROP POLICY IF EXISTS "verification upload own" ON storage.objects;
CREATE POLICY "verification upload own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'advisor-verification'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "verification read own" ON storage.objects;
CREATE POLICY "verification read own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'advisor-verification'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
  );

DROP POLICY IF EXISTS "verification delete own" ON storage.objects;
CREATE POLICY "verification delete own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'advisor-verification'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── Verification rows ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.advisor_verifications (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id_document_path   text NOT NULL,  -- path within advisor-verification bucket
  selfie_video_path  text NOT NULL,
  legal_name         text NOT NULL CHECK (char_length(legal_name) BETWEEN 2 AND 120),
  country            text NOT NULL CHECK (char_length(country) = 2),
  status             text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'rejected'
  )),
  admin_notes        text,
  reviewed_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at        timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS advisor_verifications_status_idx
  ON public.advisor_verifications (status, created_at DESC);

ALTER TABLE public.advisor_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS advisor_verifications_select_own ON public.advisor_verifications;
CREATE POLICY advisor_verifications_select_own
  ON public.advisor_verifications FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS advisor_verifications_insert_own ON public.advisor_verifications;
CREATE POLICY advisor_verifications_insert_own
  ON public.advisor_verifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS advisor_verifications_update_own_pending ON public.advisor_verifications;
CREATE POLICY advisor_verifications_update_own_pending
  ON public.advisor_verifications FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

DROP POLICY IF EXISTS advisor_verifications_admin_update ON public.advisor_verifications;
CREATE POLICY advisor_verifications_admin_update
  ON public.advisor_verifications FOR UPDATE
  USING (public.is_admin());

GRANT SELECT, INSERT, UPDATE ON public.advisor_verifications TO authenticated;

-- ─── RPC: admin decides a verification ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.advisor_verification_decide(
  p_verification_id uuid,
  p_decision        text,
  p_notes           text DEFAULT NULL
)
RETURNS TABLE (status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_row RECORD;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF p_decision NOT IN ('approved', 'rejected') THEN RAISE EXCEPTION 'Invalid decision'; END IF;

  SELECT * INTO v_row FROM public.advisor_verifications WHERE id = p_verification_id;
  IF v_row IS NULL THEN RAISE EXCEPTION 'Verification not found'; END IF;

  UPDATE public.advisor_verifications
    SET status = p_decision,
        admin_notes = p_notes,
        reviewed_by = v_admin,
        reviewed_at = now()
    WHERE id = p_verification_id;

  IF p_decision = 'approved' THEN
    -- Surface the advisor in the public directory.
    UPDATE public.advisor_profiles
      SET is_hidden = false
      WHERE user_id = v_row.user_id;
  END IF;

  RETURN QUERY SELECT p_decision;
END;
$$;

GRANT EXECUTE ON FUNCTION public.advisor_verification_decide(uuid, text, text) TO authenticated;
