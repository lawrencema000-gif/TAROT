/*
  # One report per member per post or comment (social-ai-01 companion)

  community_reports had only its pkey and community_reports_status_idx. Each
  insert adds 1 to community_posts.reported_count and hides the post at 5
  (community_update_report_count, 20260427000000_community_feed.sql:183-203).
  Reporting never worked on a phone before WP-P0-01, so the table is empty
  (0 rows, 0 duplicate pairs on 2026-11-15). Once it works, one member could
  hide any post or whisper alone by reporting it five times. The client reads
  a second report (23505) as "already reported".
*/

-- Defensive: keep each member's earliest report per target (deletes 0 rows today).
DELETE FROM public.community_reports r
USING public.community_reports k
WHERE r.post_id IS NOT NULL
  AND k.post_id = r.post_id AND k.reporter_id = r.reporter_id
  AND (k.created_at, k.id) < (r.created_at, r.id);

DELETE FROM public.community_reports r
USING public.community_reports k
WHERE r.comment_id IS NOT NULL
  AND k.comment_id = r.comment_id AND k.reporter_id = r.reporter_id
  AND (k.created_at, k.id) < (r.created_at, r.id);

CREATE UNIQUE INDEX IF NOT EXISTS community_reports_one_per_post
  ON public.community_reports (reporter_id, post_id) WHERE post_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS community_reports_one_per_comment
  ON public.community_reports (reporter_id, comment_id) WHERE comment_id IS NOT NULL;
