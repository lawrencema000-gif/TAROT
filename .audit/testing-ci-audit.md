# Testing + CI/CD + Release Engineering Audit

_TAROT / Arcana — audited 2026-04-20 against `master @ a40212b`_

---

## Inventory (facts, citations)

**Tests that exist** (`src/**/*.test.ts`, per `vitest.config.ts:11`):
- `src/services/billingGuard.test.ts` — 4 cases, pure function tests on `getPlatformWarning`
- `src/services/deepLink.test.ts` — URL parsing / share-url tests
- `src/services/premium.test.ts` — gating helpers (`canAccessFeature`, `canSaveMore`, etc.)
- `src/utils/validation.test.ts` — email / password / birthdate validators
- Total: **4 files, ~30 cases, all pure-function unit tests. Zero component, zero integration, zero e2e.**
- Setup: `src/test/setup.ts` only imports `@testing-library/jest-dom/vitest` — no Supabase mock, no i18next mock, no router mock.

**Test runner**: vitest 4.0.18 (`package.json:15`), jsdom env (`vitest.config.ts:9`). Scripts `test`, `test:watch`, `test:coverage`.

**CI**: single workflow `.github/workflows/ci.yml`
- Triggers on push + PR to `main` (lines 3-7)
- Jobs: `lint-test-build` (typecheck, lint, test, build) and `android` (AAB bundle, main only)
- Node 20, JDK 17
- No deploy step, no preview deploy, no Netlify integration, no Supabase migration step.

**Audit scripts** (`scripts/`): audit-i18n, audit-signin, audit-signin-deep, audit-web, language-audit, live-user-test, live-user-test-urls, migrate-blog-covers, verify-signin, patch-i18n-phase{2,3,4}, patch-readings-i18n, patch-settings-i18n. **None are wired into `package.json` scripts and none run in CI** (`package.json:9-26`).

**Deploy**: `netlify.toml` declares build command + headers + redirects, but no GitHub Action invokes Netlify. Per user memory + commit history the site requires manual `netlify deploy`.

**Branch protection**: repo is private, GH Pro required for the protection API — API returned 403. 25+ `feature/i18n-*` branches exist and commit history shows both `Merge: ...` commits and plenty of direct pushes to main (e.g. `a40212b`, `634109b`, `119729c`, `2384b1b` are all direct). **No PRs have been opened on the remote** (`gh pr list --state all` returned empty).

**Typecheck health**: `npm run typecheck` currently **fails** with 5 errors (LibrarySection.tsx:713, BlogPostPage.tsx:29-32, TarotMeaningsPage.tsx:22). Since CI runs `npm run typecheck` before build, **main is currently red — or CI has not run for these commits** (consistent with no Netlify auto-deploy observed).

**npm audit --production**: 0 vulnerabilities. Deps caret-ranged, not pinned (`package.json:27-75`).

**Env + local dev**:
- `.env.example` exists and is comprehensive (83 lines, covers Supabase, RevenueCat, Stripe, AdSense, admin list)
- `README.md` exists but is 90% diagnostics doc; only 12 lines actually describe how to run dev (lines 96-110). **No mention of Supabase local, seed data, or `supabase start`.**
- `supabase/` has `config.toml`, 59 migrations, 17 edge functions. No seed file.

**Observability**: Sentry installed (`@sentry/react@10.42.0`). No version endpoint / build manifest / deploy notification hook.

---

## Critical

### C1. Typecheck is broken on main and CI is effectively silent
- **What's missing**: `ci.yml:23` runs `tsc --noEmit` which fails with 5 TS errors today. Either CI is red and nobody is watching, or CI never ran on these commits. Either way there is no enforcement.
- **Concrete scenario**: The `BlogPostPage.tsx` null-vs-undefined bugs could easily crash the admin blog upload flow; nobody would know until a user reports a white screen.
- **Smallest viable fix**: (a) fix the 5 TS errors, (b) add a required status check on main (needs GH Pro or making repo public), (c) add Slack/email notification on workflow failure.

### C2. Zero tests on every critical path that touches money or auth
- **What's missing**: no test covers sign-in (email or Google OAuth callback), paywall purchase (Stripe web or RevenueCat native), `generate-reading` edge function, `stripe-webhook` / `revenuecat-webhook` idempotency, daily-horoscope cache, admin blog upload, or locale switch. The only premium code tested is the pure gating helper `canAccessFeature`.
- **Concrete scenario**: A refactor to `src/services/premium.ts` that accidentally lets free users hit Celtic Cross would ship to prod — the existing test passes because it only tests the boolean helper, not the UI wiring or RPC call.
- **Smallest viable fix**: 1 integration test per critical flow using Supabase test project + `@testing-library/react`:
  - OAuth callback handler parses `code`, calls `exchangeCodeForSession`, creates profile row
  - Stripe webhook updates `profiles.is_premium`
  - RevenueCat webhook likewise
  - `generate-reading` returns locale-appropriate content for `ja/ko/zh`
  - Paywall gates (`canAccessSpread(false, 'celtic-cross') === false`) at the UI level, not just the helper

### C3. No auto-deploy + no rollback path
- **What's missing**: Netlify is not triggered by git. Every main push needs a human to run `netlify deploy`. There is no "what's currently on prod vs what's on main" indicator. No `netlify rollback` runbook.
- **Concrete scenario**: A bad commit merges, someone runs `netlify deploy --prod` without realizing, there is no fast way to pin the last-known-good build or even identify which commit is live.
- **Smallest viable fix**: link Netlify to GitHub (or add a deploy step in `ci.yml` using `netlify-cli` with `NETLIFY_AUTH_TOKEN` secret), enable Netlify deploy previews per PR, expose `/version.json` at build time containing `{ sha, built_at }`.

### C4. No PR culture — direct pushes to main
- **What's missing**: `gh pr list --state all` returns empty on `lawrencema000-gif/TAROT`. 25+ feature branches exist locally but were merged via `git merge` on the dev machine, not via PR. There is no code review gate, no PR description, no CI-enforced merge-via-PR.
- **Concrete scenario**: A direct push that breaks the paywall lands on main with no review, no test run, no preview deploy, and no artifact of what changed and why.
- **Smallest viable fix**: enable branch protection ("require PR before merge", "require status checks to pass"). Requires GH Pro on a private repo or making the repo public.

---

## High

### H1. No staging environment
Only prod (`tarotlife.app`) exists. No `staging.tarotlife.app`, no separate Supabase project for staging. Migrations go straight to the production DB.
**Fix**: create second Supabase project + Netlify branch deploy on a `staging` branch with separate `VITE_SUPABASE_*` env.

### H2. Migrations apply manually, no drift detection
59 migrations in `supabase/migrations/` but nothing runs `supabase db push` in CI. Someone editing a table in the dashboard would diverge silently.
**Fix**: GitHub Action step `supabase db diff --linked` on PR; fail if drift detected. Real `supabase db push` on main merge.

### H3. Audit scripts orphaned
`scripts/audit-i18n.mjs`, `scripts/audit-signin.mjs`, `scripts/verify-signin.mjs`, `scripts/language-audit.mjs`, `scripts/audit-web.mjs` are not in `package.json` scripts and not in CI. A new engineer has no way to discover them.
**Fix**: expose as `npm run audit:i18n`, `npm run verify`, and add `npm run verify` as a CI step (or at minimum a pre-push hook).

### H4. No feature-flag infrastructure
Premium features, ads, language packs all ship as a big-bang build. No way to roll out to 10% of users, no kill-switch for the Gemini reading flow if it starts costing too much.
**Fix**: either a lightweight `profiles.feature_flags jsonb` column checked client-side, or Supabase Edge Config / a `feature_flags` table with RLS.

### H5. No coverage threshold
`vitest.config.ts:11-16` configures coverage reporters but no threshold. Coverage can drop to 0% without CI failing.
**Fix**: add `thresholds: { lines: 40, functions: 40 }` (grow over time) and run `test:coverage` in CI.

### H6. README doesn't tell a new engineer how to run the stack
`README.md` is 95% OAuth diagnostics docs, 12 lines of "run npm install / npm run dev." No mention of `.env.example` copy, Supabase local, Capacitor setup, seed data.
**Fix**: add a "Getting Started" section with the `.env.example` copy step, `supabase start`, and optional `supabase db reset` for seed.

---

## Medium

### M1. No e2e framework
Playwright / Cypress absent from devDependencies. Even one smoke test (open landing, click "Get Started", land on auth) would catch CSP regressions, router regressions, 404s — the exact things `a40212b`, `4db4e9b`, `cdacffe` were fixing reactively.

### M2. No seed data / dev DB bootstrap
`supabase/seed.sql` does not exist. New dev gets an empty DB and can't exercise reading history, premium gating, or horoscope flows.

### M3. Deps caret-ranged, no Renovate/Dependabot
`^8.0.0` for Capacitor, `^26.0.5` for i18next etc. A lockfile-only install is reproducible but `npm install` by a teammate may drift. No Dependabot config in `.github/`.

### M4. Sentry installed but no release tagging
`@sentry/react` is a dep but I see no `Sentry.init` release/environment wiring tied to the build SHA. Errors aggregate across versions with no way to bisect.

### M5. No pre-commit hook
No `.husky/`, no `lint-staged`. Broken TS commits (like the current 5 errors) get all the way to CI before anyone notices.

---

## Proposed release-engineering target

**CI pipeline stages (required on PR, blocking merge):**
1. `install` — `npm ci`
2. `lint` — `npm run lint`
3. `typecheck` — `npm run typecheck` (**must be green first** — fix C1)
4. `unit` — `npm test` with coverage threshold
5. `verify` — new `npm run verify` that chains `audit-signin`, `audit-i18n`, `audit-web`
6. `e2e-smoke` — Playwright: landing → auth → paywall render (1 happy-path test, <60s)
7. `build` — `npm run build`
8. `deploy-preview` — Netlify deploy preview, URL posted to PR comment
9. `migrations-diff` — `supabase db diff --linked` must be empty

**On merge to main**: same as above + `netlify deploy --prod` + `supabase db push` + Sentry release create with `GITHUB_SHA`.

**Staging environment**:
- Branch: `staging` (long-lived)
- Supabase: second project (free tier), seeded from prod sanitized snapshot weekly
- Netlify: branch deploy → `staging.tarotlife.app`
- RevenueCat: sandbox offering
- Stripe: test mode keys
- Every PR auto-deploys a Netlify preview; merging to `staging` promotes to staging site; merging `staging → main` promotes to prod.

**Rollback runbook** (add to `docs/RUNBOOK.md`):
1. `netlify api listSiteDeploys --site-id <id>` — pick last known good
2. `netlify api restoreSiteDeploy --deploy-id <id>`
3. If DB migration was part of the bad deploy: `supabase db reset --linked` is destructive — instead, hand-write inverse SQL and apply as new migration (never delete migrations)
4. Post to #incidents Slack with SHA + deploy-id + user impact

**Feature flag strategy**:
- Table `public.feature_flags(key text primary key, enabled_global bool, rollout_pct int, allowlist_emails text[])`
- RLS: read-only to all authed users
- Client helper `useFlag('premium_v2')` checks user id % 100 < rollout_pct
- Kill-switch flags: `gemini_readings_enabled`, `ads_sidebar_enabled`, `newsletter_signup_enabled`

**Required tests before merging to main** (minimum bar):
1. All existing vitest passes
2. OAuth callback → profile-row creation integration test
3. Stripe webhook → `is_premium=true` integration test
4. RevenueCat webhook → `is_premium=true` integration test
5. `generate-reading` edge function returns locale-appropriate body for at least `en/ja/ko/zh`
6. Playwright smoke: landing renders, language switcher changes text, auth modal opens
7. Migration drift check passes (supabase db diff is empty)
8. `npm run verify` (audit-signin + audit-i18n + audit-web) passes

---

## Summary — what a new engineer would hit today

Clone repo → `npm install` → `npm run dev` works. `npm test` passes (30 tiny tests). `npm run typecheck` **fails immediately** (5 errors). `npm run build` probably works because Vite ignores TS errors. `npm run lint` works. They will not discover the 20+ audit scripts under `scripts/` because nothing points to them. They will not know Netlify needs manual deploy. They will not know there's no staging. They can push straight to main.

This is a **moderate-risk** setup for a live app with paying users and an Android Play-Store listing.
