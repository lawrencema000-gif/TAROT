/*
  # Community feed: the author embed needs a foreign key to profiles

  community_posts.user_id and community_comments.user_id reference
  auth.users(id) (20260427000000:23, :52). The DAL embeds the author with
  `profiles:user_id (display_name, avatar_seed)`, and PostgREST can only
  embed across a foreign key it can see — auth.users is not in the exposed
  schema — so every feed, comment and publish-and-reselect query answered
  400 PGRST200 "Could not find a relationship between 'community_posts' and
  'user_id'". Both feeds (Community, Whispering Well) have shown "No posts
  here yet" plus three "Couldn't load the feed" toasts since launch, while
  posts published fine and were invisible to everyone (R7 B1 — live on
  tarotlife.app).

  profiles.id = auth.users.id (handle_new_user creates the row on signup), so
  a second foreign key to public.profiles(id) is sound. It is added NOT VALID
  (PostgREST embeds across an unvalidated constraint) and then validated; if
  a legacy row has no profile the constraint stays NOT VALID with a WARNING
  rather than failing the push. The DAL then names the constraint:
  profiles!community_posts_user_id_profiles_fkey(display_name, avatar_seed).

  Note for the owner: profiles RLS is own-row only ("Users can view own
  profile"), so the embed returns null for other authors until a policy or a
  public-profile view exposes display_name/avatar_seed. That is a product
  decision, not a 400.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'community_posts_user_id_profiles_fkey'
  ) THEN
    ALTER TABLE public.community_posts
      ADD CONSTRAINT community_posts_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'community_comments_user_id_profiles_fkey'
  ) THEN
    ALTER TABLE public.community_comments
      ADD CONSTRAINT community_comments_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  ALTER TABLE public.community_posts VALIDATE CONSTRAINT community_posts_user_id_profiles_fkey;
EXCEPTION WHEN foreign_key_violation THEN
  RAISE WARNING 'community_posts: an author has no profile row; constraint left NOT VALID (embedding still works): %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE public.community_comments VALIDATE CONSTRAINT community_comments_user_id_profiles_fkey;
EXCEPTION WHEN foreign_key_violation THEN
  RAISE WARNING 'community_comments: an author has no profile row; constraint left NOT VALID (embedding still works): %', SQLERRM;
END $$;

-- PostgREST caches relationships; tell it to look again.
NOTIFY pgrst, 'reload schema';
