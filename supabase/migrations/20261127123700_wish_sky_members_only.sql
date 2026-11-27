/*
  # The Wishing Sky is for members only (D01 = A; WS-25 option a; social-ai-11)

  20261127122751_wish_authors_private_moderation_server_owned kept an interim
  anon SELECT on the id-free sky views until the owner answered D01. The answer
  is "members only": signed-out visitors are already sent to sign-in by the
  route, so the grants now say the same. The earlier intent of
  20260817050000_wish_offers_lock_anon.sql ("the public sky keeps its anon
  SELECT so the map can be admired before signing up") is withdrawn; anon
  already lost every base-table privilege in 20261127122751.

  Grantees that lose access, named so the revoke is not decorative: anon (the
  interim grant) and PUBLIC (none expected; named in case one was added in the
  dashboard). authenticated keeps SELECT, restated so this file is complete on
  its own; service_role and the owner are untouched.

  Undo: GRANT SELECT ON public.wish_sky, public.wish_sky_links TO anon;
*/

REVOKE ALL ON public.wish_sky, public.wish_sky_links FROM PUBLIC, anon;
GRANT SELECT ON public.wish_sky, public.wish_sky_links TO authenticated;

NOTIFY pgrst, 'reload schema';
