# Observability + Performance + Capacity Audit

**Scope:** TAROT / Arcana app (web at tarotlife.app, Android Capacitor wrapper, Supabase edge functions, Netlify hosting).
**Read-only audit, 2026-04-20.**
**Question answered:** When something breaks in prod at 100k users, can the team see it in 60s, know who's affected, and identify the fix? **Short answer: no.**

---

## Executive summary

The app has a thoughtful **client-side telemetry module** (`src/utils/telemetry.ts`) with correlation IDs, sanitization, span timing, and diagnostics export. It is the best single piece of this observability story. Everything around it is thin: Sentry is wired but bare-bones; edge functions use plain `console.error` with no correlation ID, no structured fields, no user ID; there is no metrics pipeline, no Core Web Vitals reporting, no uptime check, no runbook, no alerts documented in repo, no Android crash reporting beyond what Play Console gives automatically, and no billing/data reconciliation jobs.

At 100k DAU, a broken Gemini key or a bad Supabase migration will be **invisible to the team until users complain in the Play Store**. MTTD today is effectively infinite — MTTR is bounded by how long the user stares at a blank screen before opening the diagnostics sheet.

---

## Critical (if this breaks, you won't know)

### C1. No correlation ID propagation past the browser
- **Current state:** `generateCorrelationId()` in `src/utils/telemetry.ts:56` creates a client-only ID. `AuthContext.tsx` uses it for OAuth flow (confirmed `generateCorrelationId('oauth')`). **Zero files in `supabase/functions/**` reference `correlationId`, `x-correlation`, or `correlation_id`** (grep confirmed 0 matches). No `X-Correlation-ID` header is attached when the SPA calls edge functions; edge functions do not log one.
- **What you can't see today:** Given a Sentry error "Gemini 500 in `generate-reading`", you cannot pivot to the matching DB row, the matching Supabase edge-function log line, or the matching client session trace. Every incident is a manual time-window search across three tools.
- **Smallest fix:** (a) Attach `X-Correlation-ID: <id>` on every `supabase.functions.invoke()` call (wrap the client or use a global fetch interceptor). (b) In each edge function, read `req.headers.get('x-correlation-id')` and include it in every `console.log/error` as a JSON field. (c) If present, call `Sentry.setTag('correlation_id', id)` before `captureException`.

### C2. Edge function logging is unstructured `console.error` text
- **Current state:** 15 edge functions, 58 `console.log/error` calls (grep counts). Example: `supabase/functions/generate-reading/index.ts:476 → console.error("Error in generate-reading:", error);`. No JSON, no level field, no userId, no correlationId, no timing. `stripe-webhook` has 17 such calls, `revenuecat-webhook` 14 — the two most business-critical functions.
- **What you can't see today:** Supabase Logs UI can only text-grep. You cannot answer "how many 5xx did `generate-reading` emit in the last hour, grouped by error code" without exporting logs and parsing them manually.
- **Smallest fix:** Add a 20-line `log()` helper in `supabase/functions/_shared/` that emits `JSON.stringify({ ts, level, fn, correlation_id, user_id, msg, err, duration_ms })`. Replace `console.error` calls. Supabase Logs automatically indexes JSON fields.

### C3. No Core Web Vitals reporting
- **Current state:** The brief says `web-vitals` is in package.json — **it is not** (verified; no `web-vitals` dependency, and grep for `onCLS|onLCP|onINP|onFID|reportWebVitals` returns zero matches anywhere in `src/` or `package.json`). The only perf signal is Sentry's `browserTracingIntegration()` at 0.2 sample rate (`src/main.tsx:18-20`).
- **What you can't see today:** LCP, CLS, INP distributions across real users. The earlier web-audit flagged that the LCP element isn't detectable — you cannot tell whether a deploy made it worse.
- **Smallest fix:** `npm i web-vitals`, then in `main.tsx`: `onLCP(m => Sentry.captureMessage('web-vital', { extra: m }))` for LCP/CLS/INP/TTFB. Or ship to Google Analytics 4 via `gtag('event', 'web_vitals', …)` — `G-6V3H9HV31V` is already loaded.

### C4. No user identity on Sentry events
- **Current state:** Grep for `Sentry.setUser(` in `src/`: **zero matches**. `AuthContext.tsx` has 8 `setUser()` calls but they are all React state setters, not Sentry. Config: `src/main.tsx:12-23` never calls `Sentry.setUser`.
- **What you can't see today:** "How many unique users hit this error?" and "Is it this premium user who DM'd you, or 10k anonymous installs?" — unanswerable. Cannot reach out to affected users.
- **Smallest fix:** In `AuthContext.tsx` onAuthStateChange, call `Sentry.setUser({ id: session.user.id })` on sign-in and `Sentry.setUser(null)` on sign-out. Anonymized IDs only — no email needed.

### C5. No alerts wired to a human channel
- **Current state:** No alert rules in repo (has to be verified in Sentry/Supabase dashboards, mark as gap). No Slack webhook, no PagerDuty, no email-alert config in `netlify.toml` or `supabase/config.toml`. No uptime monitor config file (Pingdom/UptimeRobot/BetterStack/Checkly/StatusCake — none found).
- **What you can't see today:** Nobody is paged when error rate spikes. 100% reliance on users complaining or the solo operator opening the dashboard.
- **Smallest fix:** (a) Free UptimeRobot on `https://tarotlife.app` + the 3 edge-function health URLs, alerts to lawrence.ma000@gmail.com and WhatsApp. (b) Sentry alert rule: "new issue in production" + "error rate >5x baseline". (c) Supabase → Log drain → Slack or email.

---

## High

### H1. No release/commit tag on Sentry events
- **Current state:** `src/main.tsx:16` hardcodes `release: 'arcana@1.1.0'`. This never changes between deploys.
- **Fix:** Inject commit SHA at build time: `release: \`arcana@${import.meta.env.VITE_COMMIT_SHA}\`` with Netlify env var `COMMIT_REF` (auto-populated). Netlify build command: `VITE_COMMIT_SHA=$COMMIT_REF npm run build`.

### H2. No sourcemap upload to Sentry
- **Current state:** No `@sentry/vite-plugin` or `sentryVitePlugin` found in `vite.config.ts` or `package.json`. Production JS stack traces will be obfuscated. No Netlify Sentry plugin in `netlify.toml`.
- **Fix:** Add `@sentry/vite-plugin` and configure `authToken` from a Netlify secret. ~10 lines in `vite.config.ts`.

### H3. No metrics / SLOs
- **Current state:** No custom metrics. No SLO doc. No dashboard links anywhere in repo. Supabase built-in dashboards exist but are generic.
- **Target SLOs to define:**
  - Sign-in success rate (≥99% over 1h, computed from `oauth` correlation IDs)
  - `generate-reading` p95 latency (<5s), error rate (<1%)
  - `astrology-get-chart` p95 (<2s)
  - Gemini call error rate (<0.5% including retries) — track inside `generate-reading`
  - Stripe/RevenueCat webhook success rate (=100%, any failure is a paid-user incident)
- **Fix:** Add a Grafana Cloud free tier (10k series free) or just a Supabase view `v_ops_slo` that aggregates edge function logs by hour.

### H4. No runbook / incident response docs
- **Current state:** `docs/` contains only `PAYMENT_TESTING_*.md`. No `RUNBOOK.md`, `INCIDENT_RESPONSE.md`, or on-call rotation (solo operator — note that as a **finding**, not a gap to close immediately). No post-incident review template.
- **Fix:** Single `docs/RUNBOOK.md` with: "Site down → check Netlify status, Supabase status, Gemini status, RevenueCat status. Payment failing → stripe-webhook logs + reconciliation query. Auth broken → correlation ID lookup in Sentry + telemetry logs."

### H5. No Android crash reporting
- **Current state:** `android/app/build.gradle` only applies `com.google.gms.google-services` conditionally if `google-services.json` exists (line 89). No `firebase-crashlytics` dependency, no `@sentry/capacitor`. Only source of Android crash data is Play Console's automatic ANR/crash dashboard — which only fires for native crashes, not JS errors inside the WebView.
- **Fix:** `@sentry/capacitor` wraps `@sentry/react` + adds native crash capture. One-line install, shares DSN.

---

## Medium

### M1. Telemetry logs stay client-side — nowhere to ship
- `src/utils/telemetry.ts:199-210` persists to `localStorage` / Capacitor `Preferences` (max 50 entries). User must manually open the diagnostics sheet, click "copy to clipboard", and send to support. Only errors forward to Sentry (line 254-264). Info/warn logs never leave the device.
- **Fix (if needed):** Optional `/log-ingest` edge function that batches telemetry logs server-side. Only if support volume warrants.

### M2. No bundle-size trend tracking
- No `size-limit`, no Bundlemon, no CI check on the `dist/` output. Regressions invisible.
- **Fix:** GitHub Actions step with `size-limit` or just `ls -la dist/assets/*.js` in CI and compare to main.

### M3. No DB query observability
- `pg_stat_statements` grep = 0 matches. No long-running-query job. No index-bloat monitor.
- **Fix:** Enable `pg_stat_statements` extension in Supabase (one SQL statement). Check `supabase inspect db long-running-queries` in CI nightly.

### M4. No cost alerts
- Gemini, Supabase, Netlify, RevenueCat all have spend dashboards but no budget alerts in repo config. A bug that loops `generate-reading` could rack up $1000s before notice.
- **Fix:** (a) Gemini quota cap per project. (b) Supabase Pro billing alerts. (c) Netlify bandwidth alert at 80% of plan. (d) GCP project budget alert email.

### M5. No data-integrity reconciliation
- No scheduled job compares Stripe/RevenueCat subscription state vs `profiles.is_premium` (or equivalent). A webhook-failure edge case leaves paid users without entitlements **forever** with no auto-detection.
- **Fix:** Daily Supabase cron: join RevenueCat export API + profiles table, flag rows where premium-in-one != premium-in-other. Email report.

---

## Capacity model

**Assumptions:** Supabase Pro plan ($25/mo, Team $599/mo), Netlify Pro ($19/mo). Gemini 1.5 Flash ($0.075/1M input, $0.30/1M output tokens). RevenueCat free ≤$10k MTR, then 1% above. Avg user: 2 AI readings/day (each ~2k in + 1k out tokens = ~$0.00045), 20 page views, 5 edge-function calls/day.

| Scale (DAU) | Supabase $ | Gemini $ | Netlify $ | RevenueCat $ | Total $/mo | Breaks first |
|---|---|---|---|---|---|---|
| 10k | $25 (Pro) | ~$270 (10k × 2 × $0.00045 × 30) | $19 | $0 (below MTR cap) | **~$314** | Nothing — well within limits |
| 100k | $599 (Team: need IP allowlist, more compute add-ons likely +$200) | ~$2,700 | ~$99 (higher tier; 100k × 20 pv × 1MB = 60TB+/mo, over plan) | ~$50–150 (1% of MTR if paid convert) | **~$3,650+** | **Netlify bandwidth** and **Supabase DB connections** (default pool 60; needs pgBouncer/Supavisor tuning). Edge function 150s duration cap hits on slow Gemini responses. |
| 1M | Team + compute add-ons ~$2–5k | ~$27,000 | ~$1,000+ (custom Netlify contract territory) | ~$500–5k (scales with MTR) | **~$30k–40k** | **Gemini cost** dominates; **Supabase 500 concurrent DB connections** even on Team, need PgBouncer transaction mode + replica reads; **Netlify requires Enterprise**; **Sentry event quota** — default 50k errors/mo, will blow past. |

**Sources / assumptions (verify before acting):**
- Supabase pricing: https://supabase.com/pricing — Free 60 DB conn, Pro 60 + pooler 200, Team scales; Edge function limits https://supabase.com/docs/guides/functions/limits (150s duration, CPU per-invocation).
- Gemini pricing: https://ai.google.dev/pricing — Flash-1.5 numbers used above, subject to change.
- Netlify: https://www.netlify.com/pricing — Pro includes 1TB bandwidth, then $55/100GB. 100k DAU × 20 pv × modest 500KB = 30TB/mo ≫ Pro.
- RevenueCat: https://www.revenuecat.com/pricing — free ≤$10k MTR, then 1%.
- Sentry: https://sentry.io/pricing — Team $26/mo for 50k events; Business scales.
- **Assumption** Gemini-Flash-1.5 is the model; if Pro is used, multiply Gemini column by ~10×.
- **Assumption** users convert at ~3% paid, so RevenueCat MTR at 100k DAU ≈ $12k-ish → modest fee.
- **Not modeled:** Stripe fees (2.9% + 30¢), Play Store 15% cut, Google Ads spend, DNS, domain.

**First things to break in practice:** (1) Supabase DB connections before PgBouncer tuning. (2) Edge-function 150s timeout on Gemini slowness (no retry/timeout wrapper visible in `generate-reading`). (3) Sentry event quota (silent sampling = blind spots).

---

## Proposed observability target (12-step checklist)

1. Correlation ID attached to every `supabase.functions.invoke`, read in every edge function, put on every log line and Sentry tag. *(fixes C1)*
2. `supabase/functions/_shared/log.ts` helper → structured JSON. *(fixes C2)*
3. `web-vitals` package → CLS/LCP/INP/TTFB → Sentry or GA4. *(fixes C3)*
4. `Sentry.setUser({id})` in AuthContext onAuthStateChange. *(fixes C4)*
5. UptimeRobot + Sentry alert rules + Slack or WhatsApp webhook. *(fixes C5)*
6. Netlify `COMMIT_REF` → Sentry `release`. *(H1)*
7. `@sentry/vite-plugin` sourcemap upload. *(H2)*
8. 4–5 SLOs in `docs/SLOS.md` with error budget. *(H3)*
9. `docs/RUNBOOK.md`. *(H4)*
10. `@sentry/capacitor` on Android. *(H5)*
11. `docs/OPS.md` with single page linking Supabase / Netlify / Sentry / RevenueCat / Stripe / GCP billing dashboards. One-click for incidents.
12. Nightly reconciliation cron: Stripe ↔ Supabase ↔ RevenueCat. *(M5)*

**Time to MTTD ≤60s goal:** items 1, 2, 4, 5 are the minimum.

---

## File references (audit evidence)
- `C:\Users\lmao\TAROT\src\utils\telemetry.ts` — client telemetry module, well built
- `C:\Users\lmao\TAROT\src\main.tsx:12-23` — Sentry init (no release SHA, no sourcemap plugin, no setUser)
- `C:\Users\lmao\TAROT\src\context\AuthContext.tsx` — generateCorrelationId('oauth') user; no Sentry.setUser
- `C:\Users\lmao\TAROT\src\lib\supabase.ts` — no header injection for correlation
- `C:\Users\lmao\TAROT\supabase\functions\**` — 15 functions, 58 console.* calls, 0 correlation references
- `C:\Users\lmao\TAROT\supabase\functions\generate-reading\index.ts:356,431,454,476` — string-interpolated console.error
- `C:\Users\lmao\TAROT\supabase\functions\_shared\` — has cors/rate-limit/response/auth; **no log helper**
- `C:\Users\lmao\TAROT\netlify.toml` — no Sentry plugin, no build env for commit SHA
- `C:\Users\lmao\TAROT\package.json` — `@sentry/react@10.42.0` only; no `web-vitals`, no `@sentry/vite-plugin`, no `@sentry/capacitor`
- `C:\Users\lmao\TAROT\android\app\build.gradle:87-92` — no Crashlytics
- `C:\Users\lmao\TAROT\docs\` — no runbook, no SLOs, no ops doc
