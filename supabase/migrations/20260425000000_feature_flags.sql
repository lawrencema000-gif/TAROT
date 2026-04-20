-- ============================================================================
-- Feature flags
-- ============================================================================
-- Why: SCALABILITY-PLAN.md Part 4 Phase 5 and Part 6 (feature-addition
-- playbook) both require being able to ship a feature dark, flip it on
-- for admins first, then roll it out by percentage. A bad feature should
-- be killable without a deploy. We roll our own rather than pulling in
-- LaunchDarkly / GrowthBook — small table, small hook, full control.
--
-- Evaluation rule (deterministic — same user always gets the same answer
-- for a given flag state):
--   1. If user id is in `allowed_user_ids` -> ON
--   2. If `rollout_percent` > 0 and (hash(user_id, flag_key) % 100) < rollout_percent -> ON
--   3. If `enabled` is true and rollout_percent = 100 -> ON
--   4. Otherwise OFF
--
-- Anonymous callers get the deterministic bucket for their localStorage
-- anon-id (SSR pages + landing). The client-side hook also accepts overrides
-- via `?ff_<flag_key>=on|off` query string for local testing.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.feature_flags (
  key              text PRIMARY KEY,
  description      text,
  enabled          boolean NOT NULL DEFAULT false,
  rollout_percent  smallint NOT NULL DEFAULT 0 CHECK (rollout_percent BETWEEN 0 AND 100),
  allowed_user_ids uuid[]  NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Keep updated_at fresh on every UPDATE.
CREATE OR REPLACE FUNCTION public.feature_flags_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS feature_flags_touch_updated_at ON public.feature_flags;
CREATE TRIGGER feature_flags_touch_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.feature_flags_touch_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────────────
-- Read: all authenticated + anon users can read all flags (client-side
-- evaluation). No sensitive info lives in this table.
-- Write: service_role only (admin UI or migrations).
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feature_flags public read" ON public.feature_flags;
CREATE POLICY "feature_flags public read"
  ON public.feature_flags FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS feature_flags_allowed_user_ids_idx
  ON public.feature_flags USING GIN (allowed_user_ids);

-- ─── Seed the Gemini Flash flag ─────────────────────────────────────────────
-- `gemini-flash-default` — when ON, generate-reading uses gemini-2.0-flash
-- by default instead of gemini-1.5-flash/2.5-pro. Starts OFF until we roll
-- it out. Premium users can still opt into higher models via request params.
INSERT INTO public.feature_flags (key, description, enabled, rollout_percent)
VALUES (
  'gemini-flash-default',
  'Use Gemini 2.0 Flash in generate-reading (10-20x cheaper than 2.5 Pro).',
  false,
  0
)
ON CONFLICT (key) DO NOTHING;
