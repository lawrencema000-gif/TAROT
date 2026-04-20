# Database Scalability Audit — TAROT / Arcana

_Project: `ulzlthhkqjuohzjangcq` · 58 migrations · ~35 public tables · audit date 2026-04-20_

Read-only inspection via `supabase db lint`, `supabase inspect db {table-stats,index-stats,bloat,locks}`, `supabase migration list`. Source of truth: `supabase/migrations/*.sql` + `src/**` + `supabase/functions/**`.

---

## Critical (breaks at 100k+ users)

### C1. `astrology_horoscope_cache` has no TTL and is per-user-per-day-per-type — unbounded growth
- **Tables**: `astrology_horoscope_cache` (not in any migration file; table was created ad-hoc by the Edge Functions — see `supabase/functions/astrology-daily/index.ts:453`, `astrology-weekly/index.ts:334`, `astrology-monthly/index.ts:380`).
- **Current behavior**: Edge functions `upsert` one row per `(user_id, date, type)` where `type ∈ {daily, weekly, monthly, daily:ja, daily:ko, daily:zh, weekly:ja, …}`. No DELETE anywhere. Only index is `astrology_horoscope_cache_user_id_date_type_key` (the unique key) and `idx_horoscope_cache_user_date`.
- **Projected problem at 1M users**:
  - 1M DAU × ~3 cache types × 365 days = **1.1B rows/year**. Per-row ~4 KB JSON → ~**4–5 TB/year**. Supabase Micro tops at 500 GB; Pro-XL still blows up by month 4.
  - Every page load hits this with `.select().eq(user_id).eq(date).eq(type)` — fine while the table is small; RLS + index lookups will still be OK on a properly maintained table, but vacuum / autovacuum churn will dominate.
  - The table was created outside migration history, so there is **no reversible schema artifact**. The next engineer cannot recreate it on a fresh project.
- **Fix (draft SQL)**:
  ```sql
  -- 1. Canonicalize schema in a migration
  CREATE TABLE IF NOT EXISTS public.astrology_horoscope_cache (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date date NOT NULL,
    type text NOT NULL CHECK (type ~ '^(daily|weekly|monthly)(:[a-z]{2})?$'),
    content_json jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL GENERATED ALWAYS AS (
      CASE
        WHEN type LIKE 'daily%'   THEN (date + interval '7 days')
        WHEN type LIKE 'weekly%'  THEN (date + interval '30 days')
        WHEN type LIKE 'monthly%' THEN (date + interval '90 days')
      END
    ) STORED,
    UNIQUE (user_id, date, type)
  );
  CREATE INDEX astrology_horoscope_cache_expires_idx
    ON public.astrology_horoscope_cache (expires_at);

  -- 2. Nightly cleanup via pg_cron (Supabase exposes this)
  SELECT cron.schedule(
    'astrology_cache_cleanup',
    '15 3 * * *',
    $$DELETE FROM public.astrology_horoscope_cache WHERE expires_at < now()$$);

  -- 3. RLS
  ALTER TABLE public.astrology_horoscope_cache ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "own cache" ON public.astrology_horoscope_cache
    FOR ALL TO authenticated
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));
  ```
- **Long-term**: daily horoscopes for a sign are not user-specific content — move to `daily_readings_cache`-style keyed by `(sign, date)` and share across users. Only natal/transit personalization needs per-user rows.

### C2. `on_auth_user_created` trigger performs synchronous work on a hot path + can orphan signups
- **File**: `supabase/migrations/20260111140819_add_oauth_user_profile_trigger.sql`, updated at `20260112113637_enhance_oauth_profile_creation.sql`.
- **Behavior**: `AFTER INSERT ON auth.users` → `handle_new_user()` inserts into `profiles`. Then `on_newsletter_subscribe_send_welcome` on `profiles` fires (migration `20260130214743_add_welcome_email_trigger.sql`) which makes a **synchronous `net.http_post()`** to `/functions/v1/send-welcome-email` for every signup.
- **Projected problem at 100k+ signups/day**: every auth signup blocks on an HTTP round-trip to an Edge Function inside a DB trigger. pg_net has a single queue; failures only `RAISE WARNING` so silently drop emails, but latency spikes will stall signup bursts (ad campaign spike = 500ms+ auth latency).
- **Fix**: Split. Keep `handle_new_user()` synchronous (fast INSERT only). Move welcome email to a `pg_cron` job polling `profiles WHERE subscribed_to_newsletter AND welcome_sent_at IS NULL`, or trigger from the Edge Function that processes signups. Add `welcome_sent_at timestamptz` column.

### C3. Hardcoded admin email string still referenced in 4 migrations — single-admin bottleneck
- **Grep hits**: `20260115165705_add_ad_analytics_schema.sql:80,113` (RLS subqueries), `20260130215127_fix_tarot_images_storage_security.sql:32`, `20260130215525_unify_admin_authorization.sql:36`, `20260305000000_fix_admin_authorization_security.sql:44`.
- **Current state**: `20260305000000` finally introduced `user_roles` + a policy-free RLS shell, which is correct. But the hardcoded `lawrence.ma000@gmail.com` email remains inside `is_admin()` seeding logic and the two pre-306 RLS policies. If the seed user is deleted (or email changes), admin access silently breaks.
- **Fix (draft SQL)**:
  ```sql
  -- Idempotent admin seeding moved to env, not migration body
  -- In migration: read from vault, not from email literal
  INSERT INTO public.user_roles (user_id, role, granted_by)
  SELECT id, 'admin', 'bootstrap'
  FROM auth.users
  WHERE email = current_setting('app.settings.bootstrap_admin_email', true)
  ON CONFLICT (user_id, role) DO NOTHING;
  ```
- **Also**: Purge legacy policies that still reference `profiles.email = 'lawrence.ma000@gmail.com'` — grep shows they were fixed in 20260305 but the migration history still contains the string; add a final sweep migration dropping any remaining ones from `pg_policies`.

### C4. `ad_impressions` + `user_achievements` grow linearly with DAU × events and have no retention
- **Tables**: `ad_impressions` (`supabase/migrations/20260115165705_add_ad_analytics_schema.sql`), `user_achievements` (`supabase/migrations/20260127070336_add_achievements_system.sql`), `xp_activities` (`20260126150608`).
- **Projected volume at 1M DAU**:
  - `ad_impressions`: ~10 impressions/DAU/day = **3.65B rows/year**, ~200 GB with indexes.
  - `xp_activities`: ~5 rows/DAU/day = **1.8B/year**.
  - `user_achievements`: 1M users × 48 achievements = **48M rows just from backfill** (see `initialize_user_achievements()` which inserts all achievements per user on first interaction).
- **Fix**: 
  1. Add `created_at` monthly partitions on `ad_impressions` and `xp_activities` once they exceed 10M rows. Native `PARTITION BY RANGE (created_at)` is cleanest. Draft:
     ```sql
     CREATE TABLE ad_impressions_new (LIKE ad_impressions INCLUDING ALL)
       PARTITION BY RANGE (created_at);
     CREATE TABLE ad_impressions_2026_04 PARTITION OF ad_impressions_new
       FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
     ```
  2. `xp_activities`: keep only last 90 days; aggregate older rows into `profiles.xp` (already done) and delete source.
  3. `user_achievements`: stop eager-initializing all 48 per user; only INSERT-on-first-progress. Current behavior makes the table N × 48 instead of N × (avg_unlocked).

---

## High (performance degrades at scale)

### H1. 30+ unused indexes today (index-stats shows them with 0 scans)
From `supabase inspect db index-stats --linked`, the following have **0 scans**, but add write cost to hot tables:
- `public.user_achievements_pkey` (88 kB, unused despite being the PK — because all lookups use the unique key)
- `public.user_roles_pkey`, `public.idx_user_roles_role`, `public.user_roles_user_id_role_key` pair — one is redundant.
- `public.idx_rewarded_ad_unlocks_spread_type`, `_user_feature`, `_daily`, `_expires` — all 4 show 0 scans. Table has 38 rows total, but at scale 4 unused indexes on a write-heavy table = 4× write amplification.
- `public.idx_achievements_rarity`, `public.idx_achievements_category` (category used once) — marginal.
- `public.profiles_locale_idx`, `public.profiles_utm_campaign_idx` — 0 scans, both were just added (20260418, 20260419); leave them but monitor.
- `public.blog_posts_pkey`, `public.idx_blog_posts_published` — 0 scans; public reads go via `slug`, confirm before dropping.
- `public.unique_sign_date` (on `daily_readings_cache`), `public.idx_ad_analytics_daily_date` (6 scans) — keep.
- **Fix**: after 30 days of production traffic, drop ones that remain unused. Do it in a dedicated migration so it's reversible:
  ```sql
  -- 20260501_prune_unused_indexes.sql
  DROP INDEX IF EXISTS public.idx_rewarded_ad_unlocks_spread_type;
  DROP INDEX IF EXISTS public.idx_rewarded_ad_unlocks_user_feature;
  DROP INDEX IF EXISTS public.idx_rewarded_ad_unlocks_daily;
  DROP INDEX IF EXISTS public.idx_rewarded_ad_unlocks_expires;
  -- ...
  ```

### H2. `profiles` is a god table — 30+ columns, many should be separate
- **File**: Grown across `20260101101526`, `20260101115738`, `20260101125316`, `20260111112300`, `20260111123945`, `20260126150608`, `20260208153543`, `20260418000000`, `20260419000000`.
- Current columns mix identity (`email`, `display_name`), demographics (`birth_date`, `birth_place`, `birth_latitude`, `birth_longitude`, `timezone`), preferences (`theme`, `tone_preference`, `notifications_enabled`, `notification_time`, `locale`), subscription state (`is_premium`, `is_ad_free`, `subscribed_to_newsletter`), gamification (`xp`, `level`, `seeker_rank`, `streak`, `last_ritual_date`, `total_readings`, `total_journal_entries`), personality results (`enneagram_type`, `enneagram_wing`, `attachment_style`, `big_five_scores`), attribution (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `first_referrer`).
- **Problem**: every write touches the whole row. With 17k seq scans / 17k index scans, this table is the **hottest** object in the DB. The `protect_profile_premium_fields` trigger fires on every UPDATE — even `locale = 'ja'`. At 100k updates/sec the trigger path becomes the bottleneck.
- **Fix**: split into `profiles_core` (id, email, display_name, birth_*, timezone, locale, created_at), `profiles_gamification` (xp, level, seeker_rank, streak, counters), `profiles_attribution` (utm_*, first_referrer), `profiles_preferences` (theme, tone, notifications, newsletter). Keep a view `profiles` for backwards compatibility during migration. Trigger only fires on `profiles_core`.

### H3. RLS policies mostly use `(select auth.uid())` but some don't — inconsistent
- **Good**: `20260101142055_fix_security_performance_issues.sql` wrapped most. `20260404000000_fix_security_advisor_warnings.sql` caught more.
- **Bare `auth.uid()` still present in**:
  - `supabase/migrations/20260126150608_add_xp_and_level_system.sql:116,120` (`xp_activities` SELECT + INSERT)
  - `supabase/migrations/20260126201639_add_rewarded_ads_tracking.sql:41,47,53` (`rewarded_ad_unlocks` all 3 policies)
  - `supabase/migrations/20260127070336_add_achievements_system.sql` (check — `user_achievements`/`achievement_shares`)
  - `supabase/migrations/20260101101526_create_initial_schema.sql:85,90,95,116…` — those were later replaced, but only for tables explicitly listed in 20260101142055. `horoscope_history` INSERT was wrapped but SELECT wasn't explicitly re-checked.
- **Fix**: single migration that re-creates every policy with `(select auth.uid())`:
  ```sql
  DROP POLICY "Users can view own XP activities" ON public.xp_activities;
  CREATE POLICY "Users can view own XP activities" ON public.xp_activities
    FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
  -- repeat for xp_activities INSERT, rewarded_ad_unlocks SELECT/INSERT/UPDATE,
  -- user_achievements, achievement_shares, horoscope_history SELECT
  ```

### H4. RLS expressions doing cross-table `EXISTS` subqueries
- `journal_attachments` policies (`20260101142055:244-275`) do `EXISTS (SELECT 1 FROM journal_entries WHERE …)` on every row. At 100k journal_attachments/day this adds a subquery per row read. 
- Admin policies on `ad_impressions` / `ad_analytics_daily` currently use `is_admin()` (post-20260305), which is STABLE + SECURITY DEFINER — good. But the old `EXISTS (SELECT 1 FROM profiles WHERE …)` version is still in the migration history at `20260115165705:77-82,109-115`. Verify via `pg_policies` that those were fully dropped.
- **Fix**: add `user_id` denormalization on `journal_attachments` so the RLS can be a simple `user_id = (select auth.uid())`. Migration adds column + backfill + changes policy.

### H5. Missing index for hot `.order()` patterns
- `saved_highlights`: `idx_saved_highlights_user_date` covers `ORDER BY date DESC`. Good (16k scans). 
- `premium_readings`: `idx_premium_readings_created_at` was **dropped** in `20260111141903_fix_rls_security_issues.sql:168` as "unused". Code at `src/services/storage.ts` (and `LibrarySection.tsx:205`) queries `.eq('user_id').order('created_at', { desc: true })` — this now uses only `idx_premium_readings_user_id` then sorts. OK at 7 rows, will bite at 1M.
- **Fix**: recreate covering index, but only once table exceeds 100k rows:
  ```sql
  CREATE INDEX CONCURRENTLY idx_premium_readings_user_created
    ON public.premium_readings (user_id, created_at DESC);
  DROP INDEX IF EXISTS public.idx_premium_readings_user_id; -- redundant
  ```

### H6. `ad_impressions` FK uses `auth.users(id)` instead of `profiles(id)` — inconsistent
- `20260115165705:49` → `user_id uuid REFERENCES auth.users(id)`, while every other user-owned table references `profiles(id)`.
- **Problem**: if we ever want to `JOIN profiles` for analytics (and we will — platform × segment analysis), this is an inner-database-boundary join across schemas. Also `auth.users` is managed by Supabase and some admin dashboards hide it.
- **Fix**: repoint to `profiles(id) ON DELETE CASCADE` (profiles itself cascades from auth.users).

---

## Medium / tech debt

### M1. `daily_rituals.tarot_viewed` — naming drift
- Column named `tarot_viewed` (migration `20260101102111:87`) but past code used `tarot_drawn`. Currently consistent across `src/pages/HomePage.tsx:88,107,112,186`. Keep.
- **Other inconsistent pairs**:
  - `profiles.last_ritual_date` vs `daily_rituals.date` (not a bug, but two sources of truth for "when did user last do a ritual" — a denormalization risk. Today `last_ritual_date` is written from client code, never from trigger).
  - `profiles.total_readings` vs `COUNT(*) FROM tarot_readings` — denormalized counter, no trigger keeping them in sync. Guaranteed drift.
  - `profiles.total_journal_entries` vs `COUNT(*) FROM journal_entries` — same.
  - `profiles.streak` vs computed value from `daily_rituals` — three places define streak logic (`20260126150608`, `20260207195928`, client).
- **Fix**: either add triggers to keep denorm counters in sync, or drop the columns and compute on read (cheap with indexes already in place). Recommend dropping — 1 row in profiles × 1 update per reading is more expensive than a count query.

### M2. Migration hygiene
- **Mixed schema + seed + RLS in one file**: `20260127070447_seed_achievement_definitions.sql` (192 lines of INSERTs), `20260127070336_add_achievements_system.sql` (454 lines — schema + functions + policies + triggers). Rolling back one achievement requires editing the migration.
- **Non-reversible `DROP INDEX` in security fixes**: `20260111141903:128-171` drops 15 indexes. No `-- down` section, and the security fix migration both hardens RLS AND removes indexes — if we need to roll the security hardening back we lose schema changes.
- **Idempotent DO-block inserts**: most migrations use `DO $$ ... IF NOT EXISTS ... $$`. Good. But the pattern is inconsistent — some use `CREATE TABLE IF NOT EXISTS`, some use DO-blocks, some plain `ALTER`.
- **Six temporary policy migrations** (`20260104*`) for a card-upload workflow left drift in `pg_policies`. Confirm they were all reverted.
- **Fix**: adopt convention:
  - One DDL concern per migration (schema OR data OR RLS).
  - Every migration has a `-- ROLLBACK` comment block documenting the reverse SQL.
  - Seed data goes to `supabase/seed.sql`, not migrations.

### M3. Function inventory — functions exist, not all have SET search_path
- `calculate_daily_ad_revenue()` — SECURITY DEFINER, has `SET search_path`, good.
- `handle_new_user()` — SECURITY DEFINER, `SET search_path = public` (should be `pg_catalog, public` per recent hardening pattern).
- `send_welcome_email_trigger()` — SECURITY DEFINER, `SET search_path = public` (same issue; + does HTTP — see C2).
- `has_active_subscription()` (original `20260101111354:214`) — SECURITY DEFINER, **no search_path set**. Hardened in `20260101142055:352`, but then other function `20260101111354:227 sync_premium_status()` also lacked it originally.
- `check_level_milestones` — `db lint` flagged unused parameter `p_seeker_rank`.
- **Fix**: Run `SELECT proname, prosecdef, proconfig FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND prosecdef` and add `SET search_path = pg_catalog, public` to any row where `proconfig IS NULL`.

### M4. Storage buckets — no size / mime restrictions in any migration
- Buckets: `tarot-images/`, `card-backs/`, `backgrounds/`, `custom-icons/`, `blog-covers/`.
- **Risk**: `backgrounds` is writable by authenticated users (`20260110103515_add_background_storage.sql`, subsequent `20260110120727`). No `file_size_limit` set on the bucket in any migration; no mime-type allow-list in the storage policy. A 100 MB PNG upload will succeed. With 1M users, a bad actor + a small percentage of misuse = 100s of GB of garbage.
- **Fix (draft SQL)**:
  ```sql
  UPDATE storage.buckets
    SET file_size_limit = 2 * 1024 * 1024,              -- 2 MB
        allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp']
    WHERE id IN ('backgrounds','card-backs','tarot-images','blog-covers','custom-icons');
  ```
  Plus add a per-user storage quota via a policy-side check or nightly audit.

### M5. `connection_limit` / pooler strategy
- Neither `20260101142055` nor `20260111141903` implemented the "change from fixed 10 to percentage-based 10-15%" recommendation (both migrations call it out in comments, say **Manual Configuration Required**, and defer to dashboard). Status today: unknown — not queryable via SQL. **Action**: verify via Supabase dashboard → Project Settings → Database → Connection Pooling.
- **Edge function behavior**: all 15 functions use `createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)` per-invocation. At 1M DAU × ~5 function calls = 5M invocations/day, each opens a fresh connection via the PostgREST transaction pooler. Mitigation: use the session pooler only for long transactions; make sure all edge functions keep their work short and use `{ db: { schema: 'public' } }` defaults.

### M6. Volume projections snapshot (for planning partitioning thresholds)
| Table | Per-user-per-day | 100k DAU / yr | 1M DAU / yr | TTL today | Recommend |
|---|---|---|---|---|---|
| `astrology_horoscope_cache` | ~3 | 110M | 1.1B | **none** | C1 fix + pg_cron |
| `daily_rituals` | 1 (upsert) | 36M | 365M | none | ok for 1yr, partition at 500M |
| `saved_highlights` | 0.2 | 7M | 73M | none | ok |
| `premium_readings` | 0.05 | 1.8M | 18M | none | add H5 index |
| `journal_entries` | 0.5 | 18M | 183M | none | partition by `user_id` hash at 100M |
| `tarot_readings` | 0.3 | 11M | 110M | none | same |
| `horoscope_history` | 0.3 | 11M | 110M | none | unclear duplication with cache — consolidate |
| `ad_impressions` | 10 | 365M | 3.65B | none | **C4 / partition mandatory** |
| `xp_activities` | 5 | 183M | 1.83B | none | **C4 / 90-day retention** |
| `user_achievements` | init + 5 | 5M + churn | 50M + churn | none | stop eager-init (C4) |
| `rewarded_ad_unlocks` | 3 | 110M | 1.1B | `expires_at` col exists, no cleanup | add cron delete where used = true AND unlocked_at < now() - '30 days' |
| `audit_events` | ~1 | 36M | 365M | none | retain 90 days |
| `content_interactions` | 5 | 183M | 1.83B | none | retain 30 days |
| `ad_analytics_daily` | aggregate | 365 | 365 | — | ok |
| `daily_readings_cache` | (sign, date) | 4380 | 4380 | none | shared, fine |

---

## Proposed schema evolution strategy

### Naming
- **Tables**: `snake_case`, plural for collections (`tarot_readings`), singular for per-user scalar state (`user_preferences` is fine, keep plural since it's a table of many preference rows per user → today it's one row per user; consider renaming to `user_preference` or collapsing into `profiles`).
- **Columns**: `snake_case`, `created_at`/`updated_at` on all mutable rows, FKs named `<table>_id`.
- **Booleans**: prefix with state verb — `is_premium`, `has_completed_onboarding`, `notifications_enabled`. Avoid ambiguous `_viewed` vs `_drawn` (see M1) — pick one per domain and document in CLAUDE.md.
- **Timestamps**: always `timestamptz`, never `timestamp`. Always default `now()` at DB layer, not at client.

### Default RLS template (copy for every new user-owned table)
```sql
-- Enable
ALTER TABLE public.<t> ENABLE ROW LEVEL SECURITY;

-- Always wrap auth.uid() in (select ...) — 10x faster at scale
CREATE POLICY "<t>_select_own" ON public.<t>
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "<t>_insert_own" ON public.<t>
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "<t>_update_own" ON public.<t>
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "<t>_delete_own" ON public.<t>
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- Admin override (optional)
CREATE POLICY "<t>_admin_all" ON public.<t>
  FOR ALL TO authenticated
  USING (public.is_admin());
```

### Index-on-write discipline
1. Every FK gets an index — `journal_entries.linked_horoscope_id` and `quiz_results.quiz_definition_id` were originally missed and caught in 20260101142055. Enforce via migration template.
2. Every `.order(X).eq(Y)` query pattern in code gets a composite index `(Y, X DESC)`, not two separate indexes.
3. Run `supabase inspect db index-stats --linked` monthly; indexes with 0 scans after 30 days of prod traffic get dropped (H1).
4. Use partial indexes whenever `WHERE` is consistent in queries (example: `profiles_locale_idx WHERE locale <> 'en'` in `20260419000000`).

### Partition thresholds
- Single-table capacity limit before partitioning: **50M rows** or **25 GB** (PG rule-of-thumb where autovacuum starts to lag).
- Partitioning scheme by default: **RANGE on `created_at`, monthly**. Drop old partitions rather than DELETE. Candidates today (C4): `ad_impressions`, `xp_activities`, `content_interactions`, `audit_events`, `astrology_horoscope_cache`.
- Hot per-user tables (`journal_entries`, `tarot_readings`, `premium_readings`, `saved_highlights`) — consider **HASH on user_id, 16 partitions** once any exceeds 50M rows. User locality means most reads still hit one partition.

### Migration template
```
supabase/migrations/YYYYMMDDHHMMSS_<verb>_<object>.sql
```
Top-of-file header with:
- **Purpose** (1-2 lines)
- **Scope**: SCHEMA / DATA / RLS / FUNCTION / INDEX (one of, not multiple)
- **Reversibility**: drop-SQL that would undo the change
- **Projected row impact**: which tables will be written and how many rows

Seed data lives in `supabase/seed.sql`, not migrations. Test data lives in `supabase/tests/*.sql`.

### Cleanup queue (draft migration names — not yet written)
1. `20260501000000_canonicalize_astrology_horoscope_cache.sql` — C1
2. `20260502000000_split_welcome_email_off_trigger.sql` — C2
3. `20260503000000_partition_ad_impressions_by_month.sql` — C4
4. `20260504000000_ttl_astrology_and_ads_via_pg_cron.sql` — C1 + C4 retention
5. `20260505000000_rewrap_auth_uid_in_subquery.sql` — H3
6. `20260506000000_prune_unused_indexes.sql` — H1 (after 30 days observation)
7. `20260507000000_add_storage_bucket_limits.sql` — M4
8. `20260508000000_drop_denormalized_profile_counters.sql` — M1
