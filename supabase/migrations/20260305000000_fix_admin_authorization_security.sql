/*
  # Fix Admin Authorization Security (BUG-01)

  ## Problem
  - Admin check is a hardcoded email comparison (client-side only)
  - tarot_cards RLS policies check raw_user_meta_data->>'role' which is never set (BROKEN)
  - ad_impressions/ad_analytics_daily use profiles.email check (inconsistent)
  - updateProfile can write is_premium directly (any user can self-promote)

  ## Fix
  1. Create user_roles table (RLS with no policies = invisible to client SDK)
  2. Rewrite is_admin() to check user_roles instead of hardcoded email
  3. Fix all broken/inconsistent RLS policies to use is_admin()
  4. Add trigger to protect profiles.is_premium and is_ad_free from client writes
  5. Add check_is_admin() RPC for safe client-side verification
*/

-- ============================================================
-- 1. Create user_roles table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'moderator')),
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by text,
  UNIQUE(user_id, role)
);

-- Enable RLS with NO policies = only service_role (bypasses RLS) can access
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- ============================================================
-- 2. Seed admin role
-- ============================================================

INSERT INTO public.user_roles (user_id, role, granted_by)
SELECT id, 'admin', 'migration:20260305000000_fix_admin_authorization_security'
FROM auth.users
WHERE email = 'lawrence.ma000@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================================
-- 3. Rewrite is_admin() to check user_roles table
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
END;
$$;

-- ============================================================
-- 4. Fix tarot_cards policies (currently broken — checks raw_user_meta_data)
-- ============================================================

DROP POLICY IF EXISTS "Admin users can insert tarot cards" ON public.tarot_cards;
DROP POLICY IF EXISTS "Admin users can update tarot cards" ON public.tarot_cards;

CREATE POLICY "Admin users can insert tarot cards"
  ON public.tarot_cards
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin users can update tarot cards"
  ON public.tarot_cards
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- 5. Fix ad_impressions admin policy (currently checks profiles.email)
-- ============================================================

DROP POLICY IF EXISTS "Admin can read all ad impressions" ON public.ad_impressions;

CREATE POLICY "Admin can read all ad impressions"
  ON public.ad_impressions
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- 6. Fix ad_analytics_daily admin policy (currently checks profiles.email)
-- ============================================================

DROP POLICY IF EXISTS "Admin can read all daily analytics" ON public.ad_analytics_daily;

CREATE POLICY "Admin can read all daily analytics"
  ON public.ad_analytics_daily
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- 7. Protect profiles.is_premium and is_ad_free from client writes
-- ============================================================

-- UPDATE trigger: silently revert protected fields for non-admin client calls
CREATE OR REPLACE FUNCTION public.protect_profile_premium_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Allow service_role / server-side calls (webhooks, subscription triggers)
  -- When service_role makes requests, auth.uid() is NULL
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Non-admin users cannot modify these fields
  IF NOT public.is_admin() THEN
    NEW.is_premium := OLD.is_premium;
    NEW.is_ad_free := OLD.is_ad_free;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_premium_fields ON public.profiles;
CREATE TRIGGER protect_premium_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_premium_fields();

-- INSERT trigger: force false for non-admin client calls
CREATE OR REPLACE FUNCTION public.protect_profile_premium_fields_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Allow service_role / server-side calls
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Non-admin users always start with false
  IF NOT public.is_admin() THEN
    NEW.is_premium := false;
    NEW.is_ad_free := false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_premium_fields_insert ON public.profiles;
CREATE TRIGGER protect_premium_fields_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_premium_fields_insert();

-- ============================================================
-- 8. Add check_is_admin() RPC for client-side verification
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT public.is_admin();
$$;
