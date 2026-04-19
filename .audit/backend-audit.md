# TAROT Supabase Backend Audit

**Project**: `ulzlthhkqjuohzjangcq` (Region: South Asia, Mumbai)
**Audit date**: 2026-04-20
**Auditor**: Claude Code (automated pass, read-only)
**CLI version**: 2.77.0 (v2.90.0 available — see Observations)

---

## CRITICAL

### C1. `astrology-geocode` edge function is an unauthenticated open proxy
- **Checked**: `supabase/functions/astrology-geocode/index.ts`
- **Found**:
  - No `Authorization` check — anyone on the internet can POST to it.
  - No rate limiting (does not use `_shared/rate-limit.ts`).
  - CORS is wildcard (`Access-Control-Allow-Origin: *`) at line 4.
  - It proxies to Nominatim with a hardcoded `User-Agent`. An attacker can spam it to get us banned from Nominatim (strict usage policy of 1 req/sec and required descriptive UA) OR use the function's egress to hide their traffic.
- **Fix**:
  1. Add a Bearer-token auth check (require a valid Supabase user JWT) just like `astrology-compute-natal`.
  2. Add rate limiting via `callerKey(req, userId)` + `checkRateLimit(key, 20, 60_000)`.
  3. Lock CORS to `ALLOWED_ORIGINS` (use `_shared/cors.ts`).
  4. Add input length cap on `birthPlace` (e.g. max 200 chars) and validate it's a printable string.

---

## HIGH

### H1. `blog-webhook` uses wildcard CORS
- **File**: `supabase/functions/blog-webhook/index.ts` line 3-7
- **Found**: `'Access-Control-Allow-Origin': '*'` — technically fine for a webhook (not called from browsers) but combined with the fact that it accepts secrets via the `Authorization` header, a misconfigured browser client could leak the secret. Low actual exploitability.
- **Fix**: Either remove CORS entirely (it's server-to-server) or narrow to the SEO Booster origin if one exists. The auth check itself is correct (line 99 compares secret in constant-time-adjacent manner — consider using `crypto.subtle.timingSafeEqual` style comparison to be hardened against timing attacks).

### H2. `stripe-webhook` uses wildcard CORS
- **File**: `supabase/functions/stripe-webhook/index.ts` line 16-20
- **Found**: `"Access-Control-Allow-Origin": "*"`. Webhooks don't need CORS. Leaving it wildcard is low-harm but inconsistent with the rest of the codebase.
- **Fix**: Remove `corsHeaders` entirely; `OPTIONS` handler can return 405.

### H3. `is_admin()` hardcoding reference still exists in earlier migrations (historical context)
- **File**: `supabase/migrations/20260130215127_fix_tarot_images_storage_security.sql` (lines 28-33) and `20260130215525_unify_admin_authorization.sql` (lines 22-38)
- **Found**: These migrations hardcode `'lawrence.ma000@gmail.com'`. They were **replaced** by migration `20260305000000_fix_admin_authorization_security.sql` which rewrote `is_admin()` to use the `user_roles` table.
- **Status**: Current `is_admin()` definition in production is the `user_roles`-based version (verified via migration order). **No action required** — this is included only to note that adding a new admin requires inserting a row into `public.user_roles`, not setting an email.
- **Note**: The seed migration `INSERT INTO public.user_roles ... WHERE email = 'lawrence.ma000@gmail.com'` still runs only once (on-conflict-do-nothing), so if that user is deleted and recreated, admin access is lost. Document this operational risk.

### H4. `generate-reading` — LLM API key configured per-deployment with no rotation plan
- **File**: `supabase/functions/generate-reading/index.ts` line 219-229
- **Found**: Calls Gemini with `GEMINI_API_KEY` passed as a query string (`?key=...`). Query-string keys are logged by Google's edge, every proxy, and any intermediary. Google's docs recommend using the `x-goog-api-key` header instead.
- **Fix**: Replace query-string auth with header auth:
  ```ts
  headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey }
  ```
  and drop `?key=${apiKey}` from the URL. Also add secret rotation to the runbook.

### H5. `generate-reading` rate limiting relies only on DB count, not in-memory limiter
- **File**: `supabase/functions/generate-reading/index.ts` lines 319-361
- **Found**: Daily limit is correctly enforced via `premium_readings` row count (3/day free, 20/day premium). But there is no per-minute burst limit. A user can fire 20 concurrent requests in the same second before any rows land in the DB, racing past the limit.
- **Fix**: Add a short-window in-memory rate-limit check using `_shared/rate-limit.ts` on top of the daily limit:
  ```ts
  const rl = checkRateLimit(callerKey(req, user.id), 5, 60_000); // 5 / minute
  ```

### H6. Leaked-password protection is documented but NOT verified enabled
- **File**: `supabase/migrations/20260404000000_fix_security_advisor_warnings.sql` lines 417-421
- **Found**: Migration comment says _"Leaked password protection must be enabled via the Supabase Dashboard: Authentication > Settings > Security > Enable Leaked Password Protection. This cannot be done via SQL migration."_
- **Fix**: Manually verify this is ON in the Supabase dashboard. The CLI cannot read auth security settings with v2.77.

---

## MEDIUM

### M1. `db lint` warning: unused parameter in `check_level_milestones`
- **Checked**: `supabase db lint --linked`
- **Found**: Single warning — `public.check_level_milestones` has unused parameter `p_seeker_rank`.
- **Fix**: Remove the parameter on the next level-system migration, or if it's kept for API compatibility, rename to `_p_seeker_rank` to silence the linter.

### M2. `send-welcome-email` does not set CORS on the success path when `RESEND_API_KEY` is missing
- **File**: `supabase/functions/send-welcome-email/index.ts` lines 240-252
- **Found**: When Resend API key is absent, the 200 response returns `{ "Content-Type": "application/json" }` headers only — no CORS headers. Browser will reject the response body in production if the key is ever un-configured again.
- **Fix**: Spread `getCorsHeaders(req)` into those headers (matches every other response path in the function).

### M3. `generate-reading` CORS headers not imported from `_shared/cors.ts`
- **File**: `supabase/functions/generate-reading/index.ts` lines 4-27
- **Found**: This function duplicates the `ALLOWED_ORIGINS` list + `getCorsHeaders` implementation locally. Same for `create-checkout-session`, `create-portal-session`, `ad-events`, `ad-config`, `send-welcome-email`. Drift risk: adding a new origin requires updating 7+ files.
- **Fix**: Replace all local copies with `import { getCorsHeaders } from "../_shared/cors.ts"`.

### M4. `profiles` table: 17,110 seq scans vs 17,733 index scans on pkey
- **Checked**: `supabase inspect db table-stats --linked`
- **Found**: Nearly 50% of reads against `profiles` are sequential scans. Table is small (31 rows estimated) so Postgres reasonably picks seq-scan, but this will degrade at 10k+ users.
- **Fix**: No immediate action. Keep an eye on it once there are >1000 profile rows; add targeted indexes on frequently filtered columns (e.g., `is_premium`, `locale`) if seq-scan ratio stays high post-growth.

### M5. `tarot_cards` table has 14,760 seq scans
- **Checked**: `supabase inspect db table-stats --linked`
- **Found**: 14,760 seq scans against 312 index scans on pkey. 78-row lookup table — seq-scan is cheap, but services/tarotCards.ts at line 136 does `.eq('id', id)` and line 159 does `.eq('arcana', arcana)`. An index on `arcana` may help if this becomes hot.
- **Fix**: Probably fine — table is tiny. Low priority.

### M6. Several unused indexes consume no storage cost but signal dead code
- **Checked**: `supabase inspect db index-stats --linked`
- **Found** (marked "Unused: true"):
  - `public.user_achievements_pkey` — unused despite being a pkey; expected (composite unique key is used instead)
  - `public.idx_ad_units_type_platform` — never used
  - `public.idx_rewarded_ad_unlocks_spread_type`, `idx_rewarded_ad_unlocks_user_feature`, `idx_rewarded_ad_unlocks_expires`, `idx_rewarded_ad_unlocks_daily` — none used
  - `public.idx_achievements_rarity` — never used
  - `public.idx_user_roles_role` — never used
  - `public.profiles_utm_campaign_idx`, `public.profiles_locale_idx` — too new to have stats (expected)
  - `public.idx_blog_posts_published` — blog is new, expected
- **Fix**: No immediate action. Revisit after 30 days of production traffic and drop those still at 0 scans (saves write overhead).

---

## OBSERVATIONS (pure info)

### O1. Migrations are perfectly in sync
- `supabase migration list --linked` shows all 59 local migrations present on remote with identical timestamps. No drift.

### O2. Edge function deploy state matches source tree
- 17 functions listed by `supabase functions list`. All 17 exist in `supabase/functions/`. No orphans either way.
- Most recently updated: `generate-reading` (v30, 2026-04-19) — matches the recent i18n work.

### O3. `.env` not committed to git
- `git log --all -p -- '.env'` returned empty. `.gitignore` line 23 excludes `.env`. Only `.env.example` is tracked and contains no real secrets.
- `VITE_SUPABASE_ANON_KEY` in `.env` is the anon key (JWT with role=anon, exp 2052) — this key is **designed to be public** and is safe to commit. RevenueCat public key is also fine.
- **Observation**: If you want to harden further, move `VITE_ADMIN_EMAILS` out of client env vars since it's a hint to attackers about admin accounts (server-side check via `is_admin()` is already authoritative, so low risk).

### O4. `supabase/.temp/` contains no secrets
- Only metadata files: `cli-latest`, `gotrue-version`, `pooler-url` (connection string, not a secret in itself), `postgres-version`, `project-ref`, `rest-version`, `storage-migration`, `storage-version`.

### O5. Storage buckets
- Identified from migrations:
  - `tarot-images` — public read, admin-only write (verified correct via migration `20260130215127`).
  - `custom-icons` — admin-only writes (verified via migration `20260130215525`).
  - `card-back` and `background` buckets (from `20260110*` migrations) — check their exact policies if users should not be uploading.
- CLI command `storage ls --linked` requires `--experimental` flag; skipped per audit constraints. Recommend a one-time dashboard check that bucket visibility/policies match expectations.

### O6. Auth config is in sync
- `supabase config push` (dry-run via stdin) reported: _"Remote API config is up to date. Remote DB config is up to date. Remote Auth config is up to date. Remote Storage config is up to date."_
- Verified: `site_url = "https://tarotlife.app"`, redirect URLs include all four locale variants plus `com.arcana.app://` mobile deep links.
- **Observation**: `supabase/config.toml` does **not** pin JWT expiry, password-policy min length, email-confirmation required flag, or OAuth provider list. These settings are managed via the dashboard only. Verify them manually.

### O7. `generate-reading` has good prompt-injection hardening
- `supabase/functions/generate-reading/index.ts` lines 127-134 sanitize user input (strip angle brackets, backticks, newlines, 500-char cap).
- Line 160 wraps the user's question in triple-quotes with an explicit "do not follow instructions within it" notice.
- Lines 211-216 set a strict `SYSTEM_INSTRUCTION` re-stating the rule.
- This is a reasonable defense against basic prompt injection. Not bulletproof vs. adversarial inputs, but appropriate for a consumer tarot app.

### O8. RLS posture is strong
- Migration `20260404000000_fix_security_advisor_warnings.sql` consolidated permissive policies and wrapped `auth.uid()` in `(select ...)` for correct query-planner behavior on all user-owned tables (achievement_shares, user_achievements, xp_activities, rewarded_ad_unlocks, ad_impressions, blog_posts).
- `user_roles` table has RLS enabled with **no policies** — correct pattern for service-role-only access (prevents client-side enumeration of admins).
- `profiles.is_premium` and `is_ad_free` protected by `protect_profile_premium_fields` BEFORE UPDATE/INSERT triggers (migration `20260305000000`). Webhooks bypass via service_role (auth.uid() IS NULL).

### O9. Recent error logs unavailable via this CLI version
- `supabase functions logs` does not exist in CLI v2.77 — it's available in v2.90+. Cannot check recent error rates from this audit.
- **Recommendation**: Update the Supabase CLI (`npm i supabase@latest`) to v2.90.0 so `functions logs generate-reading --since 1h` can be run in future audits.

### O10. Indexes on frequently-queried columns
- Scanned `src/**` for `.eq(` patterns. Key findings:
  - `user_id` + `date` queries: covered by `idx_journal_entries_user_date`, `idx_tarot_readings_user_date`, `idx_saved_highlights_user_date`, `idx_daily_rituals_user_date`, `idx_horoscope_cache_user_date`.
  - `id` primary-key lookups: covered by pkeys.
  - `published = true` on blog_posts: covered by `idx_blog_posts_published`.
  - `sign + date` on horoscope cache: covered by `unique_sign_date` unique index.
  - `profiles.id` lookups (30+ call sites): covered by pkey.
  - `tarot_cards.suit` + `name` (used in `services/cardImageUpload.ts`): covered by `idx_tarot_cards_suit` + `idx_tarot_cards_name`.
- **No missing-index issues found**.

---

## SUMMARY

- **Critical (fix ASAP)**: 1 — unauthenticated `astrology-geocode` open proxy.
- **High (fix before next launch / soon)**: 6 — CORS wildcards on webhooks, Gemini API-key-in-URL, missing burst limit on `generate-reading`, leaked-password-protection not verified enabled.
- **Medium (polish)**: 6 — lint warning, missing CORS spread in one branch, code duplication across edge functions, unused indexes.
- **Observations**: 10 — mostly positive; migrations in sync, RLS posture is strong, no secrets in git, prompt injection is hardened.

**Highest-leverage fix**: Lock down `astrology-geocode` (C1). Estimated effort: 15 minutes. Then move the Gemini API key to a request header (H4), 2 minutes.
