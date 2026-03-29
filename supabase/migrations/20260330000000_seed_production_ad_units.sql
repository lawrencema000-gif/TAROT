-- Seed production Android ad unit IDs into ad_units table
-- These are the real AdMob ad unit IDs for production use

-- Remove any existing production (is_test=false) Android entries to avoid duplicates
DELETE FROM ad_units WHERE is_test = false AND platform = 'android';

-- Insert production Android ad units
INSERT INTO ad_units (ad_type, platform, ad_unit_id, is_test, is_enabled, settings)
VALUES
  ('banner', 'android', 'ca-app-pub-9489106590476826/2642443652', false, true, '{}'),
  ('interstitial', 'android', 'ca-app-pub-9489106590476826/1903436420', false, true, '{}'),
  ('rewarded', 'android', 'ca-app-pub-9489106590476826/7730478171', false, true, '{}'),
  ('app_open', 'android', 'ca-app-pub-9489106590476826/4248827925', false, true, '{}');

-- Update get_ad_config to use production ad units (is_test = false)
CREATE OR REPLACE FUNCTION get_ad_config(
  p_platform text,
  p_user_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_is_premium boolean := false;
  v_is_ad_free boolean := false;
  v_ad_units jsonb := '{}'::jsonb;
BEGIN
  -- Check user premium/ad-free status
  IF p_user_id IS NOT NULL THEN
    SELECT
      COALESCE(is_premium, false),
      COALESCE(is_ad_free, false)
    INTO v_is_premium, v_is_ad_free
    FROM profiles
    WHERE id = p_user_id;
  END IF;

  -- If user is premium or ad-free, return no ads
  IF v_is_premium OR v_is_ad_free THEN
    RETURN jsonb_build_object(
      'showAds', false,
      'isPremium', v_is_premium,
      'isAdFree', v_is_ad_free,
      'adUnits', '{}'::jsonb
    );
  END IF;

  -- Get production ad units for the platform
  SELECT COALESCE(jsonb_object_agg(
    au.ad_type,
    jsonb_build_object(
      'adUnitId', au.ad_unit_id,
      'isEnabled', au.is_enabled,
      'settings', COALESCE(au.settings, '{}'::jsonb)
    )
  ), '{}'::jsonb)
  INTO v_ad_units
  FROM ad_units au
  WHERE au.platform = p_platform
    AND au.is_test = false
    AND au.is_enabled = true;

  RETURN jsonb_build_object(
    'showAds', true,
    'isPremium', v_is_premium,
    'isAdFree', v_is_ad_free,
    'adUnits', v_ad_units
  );
END;
$$;
