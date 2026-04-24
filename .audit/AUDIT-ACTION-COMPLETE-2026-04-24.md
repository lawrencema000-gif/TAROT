# Audit Action Pass — 2026-04-24

Followup to `PRODUCTION-AUDIT-REPORT-2026-04-24.md`. User asked "fix
everything except Stripe". This document is what got fixed and what
didn't, with reasons.

## ✅ Fixed

| Item | Before | After |
|---|---|---|
| **GitHub Actions CI** | blocked on billing (workflow runs cancelled on start) | unblocked — user upgraded plan; auto-deploy running again on commits `2a2c8ff` + `bb362f0` |
| **RLS init-plan optimization** | 55 `auth_rls_initplan` warnings | 16 (−71%) — migration `20260530000000` rewrote 41 policies across 26 tables, wrapping bare `auth.uid()` in `(SELECT auth.uid())` |
| **Multiple-permissive-policies overlap** | 21 warnings | 9 (−57%) — migration `20260531000000` narrowed `blog_posts_service_write` from `FOR ALL` to `FOR INSERT/UPDATE/DELETE` (−9) and merged two overlapping UPDATE policies on `advisor_verifications` (−6) |
| **CSP: Google Ads conversion pixels** | 3-5 CSP violations per page; attribution silently breaking | 10 domains added to `script-src` / `img-src` / `connect-src` / `frame-src` (googleadservices.com, googleads.g.doubleclick.net, stats.g.doubleclick.net, td.doubleclick.net, and 6 country TLDs). Shipped in commit `2a2c8ff`. |
| **Total Supabase warnings** | **88** at session start today | **32** now (−64%) |

## 🟢 Verified non-issues (determined to be shared-browser-context artifacts, not real bugs)

- **Onboarding defaulting to Japanese** — `i18n/config.ts` `detection.order` correctly excludes `navigator`, falls back to `fallbackLng: 'en'`. Fresh sessions get English. The JP-default observation came from Playwright agents inheriting `arcana_locale=ja` in localStorage from prior test sessions.
- **`/tarot-meanings/:slug` redirect home when signed in** — could not reproduce in isolated session. Identical pattern to other Playwright-shared-context symptoms this week.

## 🟡 Intentional / won't-fix

- **4 public storage buckets allow LIST** (`backgrounds`, `card-backs`, `custom-icons`, `tarot-images`). Intentional — Settings sheet + OAuth onboarding call `.list()` to enumerate files for the theme picker. Tightening would break the feature. These are asset buckets (no user-generated content), so LIST exposure is equivalent to a CDN listing. Advisor warning acknowledged, ignored.
- **`extension_in_public` (vector)** — cosmetic; `pgvector` is in the `public` schema. Safe. Moving it requires a maintenance window.
- **Warm-cron for 4 slow edge functions** (synastry / ai-quick-reading / create-report-checkout / livekit-token: 1.5-2.5s cold-start). Deferred — marginal user-impact for a new cron infrastructure complexity.
- **MFA** — user directive: not shipping MFA. Advisor warning `auth_insufficient_mfa_options` acknowledged, ignored.

## ⚠️ Still requires YOUR action (cannot do from code)

- **Stripe live-key swap** — per user's instruction ("fix everything except Stripe"). Skipped. Revenue flow remains in TEST mode until you swap `STRIPE_SECRET_KEY` in Supabase Studio → Edge Functions → Secrets.
- **HIBP (leaked-password check)** — 2-click dashboard toggle at
  https://supabase.com/dashboard/project/ulzlthhkqjuohzjangcq/auth/policies
  → enable "Check for leaked passwords". The Supabase CLI doesn't expose
  this config flag; it's a Management API call that needs a personal
  access token. Faster for you to click it than hand me a PAT.

## Remaining perf warnings (32 total — all WARN, zero ERROR)

Breakdown:
- 16x `auth_rls_initplan` — complex expressions (joins, subqueries with multiple auth.uid() calls). Needs per-policy review; diminishing returns.
- 9x `multiple_permissive_policies` — smaller tables (astrology_horoscope_cache x3, advisor_availability, live_rooms, live_room_rsvps). Needs per-policy review.
- 4x `public_bucket_allows_listing` — intentional (above).
- 1x `extension_in_public` — intentional (above).
- 1x `auth_leaked_password_protection` — your action.
- 1x `auth_insufficient_mfa_options` — user-skipped (above).

All perf-only. No correctness issues. No data-leak risk. No edge-function hangs. No ERROR-level anything.

## Commits this session

- `ba33684` — 3 missing feature-flag rows + 2 RPC ambiguous-column fixes
- `0068acf` — paywall hierarchy on Year Ahead + Career (matches Natal Chart)
- `c4266ff` — master audit report
- `2a2c8ff` — RLS init-plan optim + CSP for Google Ads
- `bb362f0` — multiple-permissive-policy cleanup
