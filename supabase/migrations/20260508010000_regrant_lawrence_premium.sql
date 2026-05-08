DO $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM auth.users WHERE email = 'lawrence.ma000@gmail.com';
  UPDATE public.profiles SET is_premium = TRUE, is_ad_free = TRUE, updated_at = now() WHERE id = v_id;
  RAISE NOTICE '[regrant] lawrence is_premium=true is_ad_free=true';
END $$;
