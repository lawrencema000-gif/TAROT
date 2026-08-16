-- Quick read-only verification of lawrence's premium state across the
-- three places it can be read: profiles.is_premium (what the app
-- gates on), user_roles (admin role for the reconcile exemption),
-- and subscriptions (paid history).
DO $$
DECLARE
  v_user_id uuid;
  v_email text;
  v_is_premium boolean;
  v_is_ad_free boolean;
  v_updated_at timestamptz;
  v_is_admin boolean;
  v_sub_count integer;
BEGIN
  SELECT u.id, u.email, p.is_premium, p.is_ad_free, p.updated_at
  INTO v_user_id, v_email, v_is_premium, v_is_ad_free, v_updated_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.email = 'lawrence.ma000@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE NOTICE '[verify] user not found';
    RETURN;
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user_id AND role = 'admin')
  INTO v_is_admin;

  SELECT count(*) INTO v_sub_count FROM public.subscriptions WHERE user_id = v_user_id;

  RAISE NOTICE '[verify] user_id     = %', v_user_id;
  RAISE NOTICE '[verify] email       = %', v_email;
  RAISE NOTICE '[verify] is_premium  = %', v_is_premium;
  RAISE NOTICE '[verify] is_ad_free  = %', v_is_ad_free;
  RAISE NOTICE '[verify] updated_at  = %', v_updated_at;
  RAISE NOTICE '[verify] is_admin    = %', v_is_admin;
  RAISE NOTICE '[verify] sub_rows    = %', v_sub_count;
END $$;
