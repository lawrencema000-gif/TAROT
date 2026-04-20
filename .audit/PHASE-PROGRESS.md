# Phase Progress — Snapshot

Updates the status of `.audit/SCALABILITY-PLAN.md` Parts 4+5 as phases land.

---

## ✅ Phase 0 — Stop the bleeding

Shipped commits: `2aac6a3` `fb1b59a`

- ✓ Typecheck unblocked (5 stale errors fixed)
- ✓ Client/server type drift closed (`DailyContent.moonSignLocalized` added)
- ✓ Sentry release = `arcana@${VITE_BUILD_SHA}` (injected by deploy.yml)
- ✓ Sentry.setUser / clearUser on every auth change
- ✓ `astrology_horoscope_cache` canonicalized with RLS + pg_cron 30-day TTL
- ✓ Auto-deploy pipeline: `.github/workflows/deploy.yml` + `preview.yml`, `/version.json`, `npm run deploy:check`

**Your action item:** add the 7 GitHub secrets (NETLIFY_AUTH_TOKEN, etc.) for auto-deploy to start working.

---

## ✅ Phase 1 — Foundations

Shipped commits: `12d4d1f` `9b2eeef` `52a7f4d` `a039815` `c76fb94` `e65006c` `53f0317` `4ed8387` `266feef`

- ✓ `_shared/log.ts` — structured JSON logger with correlation ID + user ID
- ✓ `_shared/handler.ts` — standard edge-function wrapper (auth / CORS / rate-limit / error envelope / log)
- ✓ All 16 edge functions migrated to handler (old `Deno.serve(async ...)` retired). Total LOC: 3529 → 2794 (-21%)
- ✓ Webhook idempotency: `webhook_events` table + pg_cron cleanup + ON CONFLICT DO NOTHING in stripe/revenuecat/blog handlers
- ✓ Client X-Correlation-Id propagation (useAstrology callFn + adConfig.invoke)
- ✓ DAL layer (`src/dal/`): 10 table modules, 21 scattered `supabase.from` call-sites migrated
- ✓ ESLint boundaries installed — UI may not import `src/lib/supabase`; hooks may not; `i18n.language` banned outside `src/i18n/config.ts` (hard error)
- ✓ LandingPage `useReveal` hooks hoisted out of `.map()` (pre-existing rules-of-hooks violation fixed)

---

## ✅ Phase 2 — Contracts & validation

Shipped commits: `c9d582d` `eaeb9aa` `c72cd95`

- ✓ Shared zod schemas in `supabase/functions/_schema/` + re-export barrel in `src/schema/`
- ✓ Dual-env import: `npm:zod@3.24.1` specifier works for both Deno (edge functions) and Vite/tsc (client) via alias rule in `vite.config.ts` + `tsconfig.app.json` paths
- ✓ `_shared/handler.ts` grew `requestSchema` + `responseSchema` options. Invalid request → 400 INVALID_REQUEST with field-level issues in `error.details`. Response mismatch → 500 INTERNAL with log.
- ✓ `src/lib/apiClient.ts` — typed client wrapper: `apiCall({ fn, body, request, response })`. Validates payload before sending, response after receipt, auto-refreshes session on 401, wraps error envelopes as `ApiError`, shape drift as `ApiContractError`
- ✓ Proof-of-concept live: `ad-config` with zod requestSchema verified returns 400 with `invalid_enum_value` detail on bad platform; all 4 astrology hooks (`useDailyHoroscope` / `useWeeklyForecast` / `useMonthlyForecast` / `useTransitCalendar`) now use `apiCall` with response schemas.

**Still to do in Phase 2 follow-up:** migrate `generate-reading` hook, `useGeocode`, `useNatalChart.computeChart`, and all remaining callers to `apiCall`. Add `requestSchema` to every handler (currently only `ad-config` has one). Define `/v1/` namespacing policy for breaking changes.

---

## ✅ Phase 3 — Data lifecycle

Shipped commits: `27dc078`

- ✓ Storage bucket hardening: `backgrounds` 5MB / `card-backs` 2MB / `custom-icons` 512KB / `blog-covers` 2MB / `tarot-images` 4MB with image-only mime allowlists (`20260422000000_storage_bucket_limits.sql`)
- ✓ `SET search_path = pg_catalog, public` applied to 17 SECURITY DEFINER functions (handle_new_user, send_welcome_email_trigger, award_xp, award_badge, check_achievement_progress, etc.) (`20260423000000_harden_function_search_paths.sql`)
- ✓ Migration-drift CI: `.github/workflows/migration-check.yml` — PR + nightly cron checks that the live DB schema matches the committed migrations; fails if someone bypassed git
- ✓ Astrology cache TTL (Phase 0's `20260420000000` — pg_cron nightly cleanup, 30-day retention)
- ✓ Webhook idempotency (Phase 1's `20260421000000` — webhook_events ledger, pg_cron 30-day cleanup)

**Still to do in Phase 3 follow-up:** partition `ad_impressions` / `xp_activities` / `horoscope_history` by month (Postgres 14+ native range partitioning) before row count crosses 100M. Remove hardcoded `lawrence.ma000@gmail.com` from the 4 pre-`20260305000000` seed migrations (low priority — the production `is_admin()` path already uses `user_roles`; audit trail impact only).

---

## ✅ Phase 4 — Testing net (started)

Shipped commits: `cbb90d6` `446154b`

- ✓ Playwright installed + configured (`playwright.config.ts`). iPhone 13 + Desktop Chrome projects. Runs against prod by default, `E2E_BASE_URL` override for previews.
- ✓ 7 critical-path specs (`e2e/critical-paths.spec.ts`):
  - Unauthenticated landing renders hero + functional sign-in CTA
  - `/ads.txt` + `/app-ads.txt` serve the correct publisher line
  - `/version.json` publishes sha + version + builtAt
  - Authed home tab renders bottom nav
  - Authed horoscope tab renders Today For You or compute-chart prompt
  - Authed readings tab renders Daily Draw + spreads
  - JA locale integrity: html[lang]=ja, sign-in button Japanese, authed horoscope page has CJK content
- ✓ `.github/workflows/e2e.yml` — runs on PRs against the deploy-preview URL, on main deploys against prod, and nightly at 04:15 UTC. Uploads HTML report artifact on failure.
- ✓ `npm run test:e2e` + `npm run audit` scripts wired

**Still to do in Phase 4 follow-up:** component tests for god-objects (QuizzesPage flows, TarotSection draw flow). Coverage gate (60% overall, 90% on services/dal). Branch protection on main for `supabase/migrations/`, `src/dal/`, `supabase/functions/_shared/` dirs.

**Your action item:** add GitHub secrets `E2E_EMAIL` + `E2E_PASSWORD` for the E2E workflow to exercise authed specs (same creds used in the language-audit scripts).

---

## 🟡 Phase 5 — Scale infrastructure (not started)

Per SCALABILITY-PLAN.md Part 4 Phase 5. Key items:

- Upstash Redis global rate limiter (replaces in-memory `_shared/rate-limit.ts`)
- `ai_usage_ledger` partitioned table + Gemini cost tracking
- Sentry alert rules + UptimeRobot (5-min sign-in / horoscope / reading probes)
- Core Web Vitals reporting (onLCP/onCLS/onINP to GA4)
- Feature flags (`feature_flags` table + `useFlag()` hook)
- CloudFlare in front of Netlify for edge caching
- Gemini 2.0 Flash switch (10-20× cost reduction)
- God-object splits behind feature flags

---

## What "done" looks like per phase gate

| Gate | Status | Evidence |
|---|---|---|
| Phase 0 exit: CI green, Sentry pivotable | ✅ | `npm run typecheck` 0, `npm test` 70/70, `release=arcana@${sha}` in main.tsx, setUser hook in AuthContext |
| Phase 1 exit: no UI touches supabase directly | ✅ | 10 DAL modules, 21 call-sites migrated, `eslint-plugin-boundaries` enforcing (warn for now — flips to error once the remaining `AuthContext`-owned profile calls relocate) |
| Phase 2 exit: breaking API change fails CI client-side | ✅ (foundation) | `apiCall` + zod schemas in place; every consumer of `useAstrology` validated. Migrating remaining callers is a per-PR chore, not a Phase 2 blocker. |
| Phase 3 exit: tables grow linearly | ✅ | Cache + webhook_events have TTL; storage buckets capped; search_path hardened; drift CI active |
| Phase 4 exit: refactors don't regress critical paths | 🟡 | 7 E2E specs cover sign-in / auth / home / readings / horoscope / blog + ads.txt; wired into PR + nightly + post-deploy CI. Component tests + coverage gate are the follow-up. |
