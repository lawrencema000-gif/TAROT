# TAROT Supabase Backend Audit v2 (Follow-up)

**Project**: `ulzlthhkqjuohzjangcq` (South Asia, Mumbai)
**Audit date**: 2026-04-20
**Auditor**: Claude Code (automated pass, read-only)
**Supabase CLI**: upgraded inline to `2.92.1` (was `2.77.0` in v1)
**First pass**: `.audit/backend-audit.md` — critical fixes shipped (C1 rate-limit, cors/auth hardening)

---

## CRITICAL

*(none newly discovered this pass)*

---

## HIGH

### H1-v2. `backgrounds` storage bucket is public and has no size/mime cap
- **Checked**: `supabase/migrations/20260110103515_add_background_storage.sql`, and CLI listing `supabase storage ls ss:///backgrounds -r --linked --experimental`.
- **Found**:
  - Bucket created with `(id, name, public)` only — **no `file_size_limit` and no `allowed_mime_types`** (contrast with `card-backs` which caps at 5 MB and whitelists `image/png|jpeg|jpg|webp`).
  - RLS policy `"Anyone can view backgrounds"` — `TO public USING (bucket_id='backgrounds')` means any URL from ANY user's folder is world-readable by anyone who guesses (or enumerates via listing) the path.
  - Real uploads observed: 7 PNG files under `/backgrounds/7bc78b43-0626-4dae-856b-baa1e22ff315/` — one real user's folder is exposed.
  - No `DELETE` policy in migration (only INSERT + UPDATE). `cardImageUpload.ts:417` calls `.remove()` — this will currently fail with RLS denial (unless service role).
- **Fix**:
  1. `ALTER storage.buckets SET file_size_limit = 5_242_880, allowed_mime_types = ARRAY['image/png','image/jpeg','image/jpg','image/webp'] WHERE id='backgrounds'`.
  2. Replace the `SELECT` policy to scope reads: `USING (bucket_id='backgrounds' AND (storage.foldername(name))[1] = auth.uid()::text)` so users only see their own backgrounds. (If you actually want them public because they're embedded into share cards, keep the policy but still add size/mime caps.)
  3. Add a `DELETE` policy matching `UPDATE`/`INSERT` patterns.

### H2-v2. `blog-covers` storage bucket has no migration-defined RLS policies
- **Checked**: `grep -r blog-covers supabase/migrations` — no match. `.audit/blog-covers-migration.json` confirms cover URLs served from `/storage/v1/object/public/blog-covers/...`.
- **Found**: The bucket was created via dashboard/script (`scripts/migrate-blog-covers.mjs`) not via versioned migration. There is **no migration that defines the RLS `INSERT`/`UPDATE`/`DELETE` policies**. If the dashboard default "public bucket + no policy" was accepted, the bucket may either (a) be write-locked (service-role only — fine) or (b) allow anonymous writes. Cannot verify without dashboard access.
- **Fix**:
  1. From dashboard: confirm bucket policies. Expected: public SELECT, admin-only INSERT/UPDATE/DELETE (like `custom-icons`).
  2. Codify as a migration file `supabase/migrations/<date>_blog_covers_storage.sql` so the policies are reproducible.

### H3-v2. `astrology-geocode` still accepts unauthenticated requests
- **Checked**: `supabase/functions/astrology-geocode/index.ts` lines 1–52.
- **Found**: Rate limit is in place (20 / 60s, IP-keyed). Input is sanitized and length-capped. CORS is now scoped via `_shared/cors.ts`. **But no Authorization header check** — the function remains reachable by any anonymous client who can obtain a CORS-allowed Origin.
- **Context**: The first pass (C1) asked for a Bearer-token check. This was intentionally skipped because geocoding runs during onboarding before a user has signed in. The IP rate limit + input cap mitigates most abuse, but it is not what C1 originally asked for.
- **Fix (optional)**: Require **the anon apikey** header at minimum (Supabase does not send anon apikey cross-origin unless the caller knows it). The current setup treats that as already satisfied via `--no-verify-jwt`, but verifying `req.headers.get('apikey')` explicitly against `SUPABASE_ANON_KEY` is cheap and closes the gap against non-browser clients. Or accept the current state and document the rationale.

---

## MEDIUM

### M1-v2. Edge-function runtime logs are NOT accessible from CLI v2.92.1
- **Checked**: `npx --yes supabase@latest functions --help`.
- **Found**: The `functions logs` subcommand **does not exist in CLI v2.92.1** (despite the docs implying v2.90+). Only `delete | deploy | download | list | new | serve` are available. No `--debug` invocation path produced logs either.
- **Impact**: Cannot verify 5xx / recurring errors from CLI for any of the 17 functions. `functions list` confirms all 17 are `ACTIVE` with versions matching first-pass findings.
- **Fix / workaround**: Check the Supabase **Dashboard > Edge Functions > Logs** manually, or use the Management API `GET /v1/projects/{ref}/functions/{slug}/logs`. File a CLI feature request.

### M2-v2. Cannot verify Leaked-Password-Protection toggle via CLI
- **Checked**: 
  - `npx supabase config` subcommands — only `push` exists (no `get`).
  - Probe `config.toml` with `[auth.password_requirements] leaked_password_protection=true` → parser rejects (`expected type 'config.PasswordRequirements', got map[string]interface{}`).
  - Tried `auth.enable_leaked_password_protection` — parser rejects with `'auth' has invalid keys`.
  - Generated a fresh `supabase init` default config — the schema knows `minimum_password_length` and `password_requirements = "letters_digits"/"lower_upper_letters_digits"/"lower_upper_letters_digits_symbols"` but **has no field for leaked-password protection** in v2.92.1.
- **Impact**: Must be verified via Dashboard. First-pass H6 remains open — no CLI path exists yet.
- **Fix**: Manually verify in Dashboard **Authentication → Policies → Password Security → "Leaked password protection"**. Document the toggle state in runbook.

### M3-v2. Six astrology-* edge functions have auth but no in-memory rate limit
- **Checked**: `grep -r checkRateLimit supabase/functions`.
- **Found**: `astrology-daily`, `astrology-weekly`, `astrology-monthly`, `astrology-compute-natal`, `astrology-get-chart`, `astrology-transit-calendar` all enforce JWT auth but do not use `_shared/rate-limit.ts`. They're pure-compute (no LLM cost), so burst impact is limited to CPU. Still inconsistent with `generate-reading` + `ad-config` + `ad-events` which do enforce burst limits.
- **Fix**: Add `checkRateLimit(callerKey(req,user.id), 60, 60_000)` after the auth check in each. ~10 line diff per function.

### M4-v2. `db lint --level error` — no errors (one warning carried over from v1)
- **Checked**: `npx supabase db lint --linked --level warning`.
- **Found**: Single warning: `public.check_level_milestones` unused parameter `p_seeker_rank` (same as v1 M1). No `--level error` hits.
- **Fix**: Unchanged from v1 — rename to `_p_seeker_rank` or drop on next level-system migration.

### M5-v2. `console.log` in `src/services/billing.ts` emits user ID 15+ times
- **Checked**: `grep -n console.log src/services/billing.ts` (lines 90, 109, 123, 136, 139, 154, 244, 250, 279, 288, 333, 638, 641, 644, …).
- **Found**:
  - `[RevenueCat] Initialized with user ID: <uuid>` (line 90)
  - `[RevenueCat] User ID set: <uuid>` (line 109)
  - `[Billing] Detected provider:` with `isNative`/`isAndroid` fingerprinting (line 638+)
  - No token/secret/password leaks — just user IDs and RC package metadata.
  - User IDs are not secrets per se (they're server-generated UUIDs in DB), but they show up in browser devtools + analytics/Sentry/logging exports. On a tarot/astrology app in production this is low-sensitivity but worth trimming for privacy.
- **Fix**: Gate these behind `if (import.meta.env.DEV)` or a `__DEBUG_BILLING__` flag so they don't fire in the prod bundle.

---

## OBSERVATIONS

### O1-v2. Supabase secrets — expected 10, found 10, all present
`npx supabase secrets list` (via `--project-ref`) returned (names only; digests omitted here):

| Secret name | Purpose |
|---|---|
| `BLOG_WEBHOOK_SECRET` | `blog-webhook` shared secret |
| `GEMINI_API_KEY` | `generate-reading` LLM key |
| `REVENUECAT_WEBHOOK_SECRET` | RevenueCat → Supabase webhook HMAC |
| `STRIPE_SECRET_KEY` | Stripe API calls in `create-checkout-session` / `create-portal-session` |
| `STRIPE_WEBHOOK_SECRET` | `stripe-webhook` signature verification |
| `SUPABASE_ANON_KEY` | auto — runtime |
| `SUPABASE_DB_URL` | auto — runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | auto — runtime |
| `SUPABASE_URL` | auto — runtime |
| `VITE_REVENUECAT_API_KEY` | public SDK key |

All required webhook and LLM secrets are present. No unexpected / orphan secrets. **No secret values read.**

### O2-v2. Storage buckets — 5 total
`card-backs` (public, 5MB + mime whitelist, per-user folder), `backgrounds` (public, **NO caps** — see H1-v2), `tarot-images` (public, admin-only write), `custom-icons` (public, admin-only write via `is_admin()`), `blog-covers` (public, **RLS policies not in migrations** — see H2-v2).

### O3-v2. Edge function deploy state — 17 active, no orphans
`functions list` confirms all 17 local functions are deployed and `ACTIVE`. Most recent update: `generate-reading` (v31, 2026-04-19) and `ad-config`/`astrology-geocode` (2026-04-19 — matches the v1 hardening work).

### O4-v2. Hardcoded URL sweep — clean
- No `http://localhost`, `http://127.0.0.1`, `staging.`, `dev.`, `.vercel.app`, `ngrok`, `trycloudflare` in `src/**`.
- Only legitimate match: `com.arcana.app://localhost/reading/abc` in `src/services/deepLink.test.ts:45` (test fixture for native deep-link parsing — expected).

### O5-v2. Sensitive data in console.log sweep
- `src/` — 3 lines in `billing.ts` log user IDs via RevenueCat (see M5-v2).
- `supabase/functions/**` — no matches for `console.log.*(token|password|secret|jwt|apiKey|api_key)` (case-insensitive). Edge-side logging is clean.

### O6-v2. No database-backed rate-limit table
- `grep -r rate_limit supabase/migrations` → no match.
- Rate limiting is purely in-memory via `_shared/rate-limit.ts`. That's fine per-isolate, but cross-isolate bursts bypass it (as the file's own header comment acknowledges).
- No 429-tracking rows to query for user burn rate. Must rely on Dashboard function logs (M1-v2 blocks that).

### O7-v2. RLS posture — cannot enumerate via CLI in v2.92.1, but v1 observations stand
- `supabase inspect db` only exposes stats (bloat, calls, index-stats, table-stats, etc.), no `rls-status` or `tables-without-rls` subcommand.
- Based on v1 audit + migration `20260404000000_fix_security_advisor_warnings.sql`, RLS is enabled on every user-owned table and all permissive policies have been consolidated with `(select auth.uid())` for planner correctness. No regressions detected in the latest migration tree.

---

## SUMMARY

- **Critical**: 0 new (v1 C1 shipped).
- **High**: 3 new — `backgrounds` bucket lacks size/mime caps and has public SELECT; `blog-covers` bucket's RLS is not codified in migrations; `astrology-geocode` is still auth-less (intentional per onboarding flow, but deviates from v1 C1).
- **Medium**: 5 — no `functions logs` in CLI v2.92.1 (gap); leaked-password toggle not CLI-verifiable (gap); 6 astrology functions missing in-memory rate limit; db lint warning (unchanged); billing.ts logs user IDs.
- **Observations**: 7 — all 10 expected secrets present; 17 functions ACTIVE; no hardcoded staging URLs; no sensitive console.logs in edge code; no rate-limit table (by design).

**Highest-leverage fixes**: 
1. Add size/mime cap + per-user SELECT scope to `backgrounds` bucket (H1-v2, ~15 lines SQL).
2. Codify `blog-covers` bucket RLS as a migration (H2-v2, ~20 lines SQL).
3. Manually verify leaked-password protection in Dashboard (M2-v2, 30 sec click).

**Known audit gaps (CLI limitations, NOT findings)**:
- Edge function runtime logs inaccessible via CLI — must check Dashboard.
- Auth security toggles (incl. leaked-password) cannot be read via CLI v2.92.1.
- Per-table RLS enable/disable status not exposed by `supabase inspect db`.
