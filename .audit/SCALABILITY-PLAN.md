# TAROT — Scalability Architecture & Migration Plan

**Generated:** 2026-04-20 from five parallel audits.
**Companion reports** (keep — each one has the file:line evidence):
- `arch-audit.md` — frontend code architecture
- `db-audit.md` — Postgres schema, indexes, growth projections
- `api-audit.md` — edge functions and API contracts
- `testing-ci-audit.md` — tests, CI/CD, release engineering
- `obs-audit.md` — logging, metrics, capacity math

---

## Part 1 — Current state in one paragraph

TAROT works today for ~hundreds of users. At 100k it will become expensive and noisy; at 1M it will break in four specific places (Gemini bill, Netlify bandwidth, edge-function rate-limit bypass, cache-table row explosion). Features are being added directly inside god-object pages (QuizzesPage 1412 LOC, TarotSection 1166, SettingsSheet 1166) because there is no layering — 21 `supabase.from()` calls are scattered across pages and contexts. 16 edge functions don't share auth, CORS, validation, or logging helpers even though `_shared/auth.ts` and `_shared/response.ts` exist (zero importers). Observability stops at the browser — no correlation IDs reach edge functions or the DB, Sentry release is hardcoded, no Core Web Vitals collection. CI runs on every push but **typecheck is currently red** from 5 stale type errors so it silently passes nothing. Every production deploy is a manual `netlify deploy`. There is no staging, no rollback runbook, no feature flags, and no webhook idempotency. The *good* news: the core patterns (contexts, RLS with `(SELECT auth.uid())` in most places, i18n infrastructure, 0 npm audit vulnerabilities, clean migration numbering) are workable foundations — we don't need to burn it down.

---

## Part 2 — The fragility ledger (what's already biting or about to)

Ranked by user-visible blast radius × probability.

| # | Fragility | Evidence | Blast radius | How soon |
|---|---|---|---|---|
| 1 | **Cache table `astrology_horoscope_cache` has no migration file, no TTL** | Ad-hoc CREATE in 3 edge functions; ~1.1B rows / 4–5TB projected at 1M DAU | Site-wide slowness, DB bill balloon | @500k users |
| 2 | **Gemini cost is unobservable** | `generate-reading` discards `data.usage`, no ledger, no ceiling | Runaway bill ($10–15k/day at 100k premium) | Any viral day |
| 3 | **Rate limit is per-isolate in-memory** | `_shared/rate-limit.ts` uses `Map`; 9/16 functions have none at all | Abuse + burst bypass → hits #2 | Any deliberate abuser |
| 4 | **Webhooks are not idempotent** | Stripe & RevenueCat never persist event.id; zero matches for `idempot\|event_id\|processed_event` | Duplicate entitlements, charge disputes | First retry storm |
| 5 | **CI typecheck is red** | `npm run typecheck` fails at LibrarySection:713, BlogPostPage:29-32, TarotMeaningsPage:22 | CI is silently green on garbage → new bugs ship | Already active |
| 6 | **No correlation ID past browser** | 15 edge functions, 0 refs to correlation IDs; unstructured `console.error` only | Debugging prod = guess + grep | Already active |
| 7 | **Synchronous HTTP inside DB trigger** | `on_auth_user_created` calls `net.http_post()` to welcome-email inline | Signups block on edge-function health | Any edge incident |
| 8 | **Client/server type drift** | `DailyContent` client type missing `moonSignLocalized` that server returns | Silent UI breakage on schema changes | Next shape change |
| 9 | **83 silent `catch {}` across 38 files** | `rewardedAds.ts` (9), `AuthContext.tsx` (6), `offline.ts` (4) | "Random bugs that don't appear in Sentry" | Already active |
| 10 | **Manual deploy, no rollback, no staging** | No GitHub Action invokes Netlify; every prod push = `netlify deploy --prod` | Bad deploy = minutes of downtime, no revert | Next bad merge |
| 11 | **Unused indexes + partition-blind heavy tables** | `ad_impressions` → 3.65B rows/yr, `xp_activities` → 1.8B, `user_achievements` → 48M rows on backfill | Write amplification, vacuum pain | @250k users |
| 12 | **30 unit tests, 0 integration, 0 E2E** | Auth, OAuth, Stripe/RC webhooks, `generate-reading`, daily-horoscope cache, paywall — all uncovered | Refactors blind; regressions ship | Every refactor |
| 13 | **No Sentry.setUser / no release tagging** | Sentry release hardcoded `arcana@1.1.0` | Cannot pivot errors to users or builds | Every incident |
| 14 | **No feature flags** | No growthbook/launchdarkly/etc. | All-or-nothing releases → bad feature affects 100% | Every risky launch |
| 15 | **`handle_new_user()` + `send_welcome_email_trigger()` use `SET search_path = public`** | Path hijack risk | Security posture | Anytime |

---

## Part 3 — The target architecture

Not "ideal" — **adequate for 1M users + weekly feature work by a small team without fragility**.

### Layering (strict — enforced by lint)

```
┌─────────────────────────────────────────────────────────────┐
│  UI (components, pages)                                     │
│  - MUST NOT import: supabase client, fetch(), i18n.language │
│  - MAY import: hooks, i18n/useT, design-system components   │
├─────────────────────────────────────────────────────────────┤
│  Hooks (React bindings)                                     │
│  - MUST NOT import: supabase client directly                │
│  - MAY import: services, i18n/config                        │
├─────────────────────────────────────────────────────────────┤
│  Services (business logic, framework-agnostic)              │
│  - MUST NOT import: React                                   │
│  - MAY import: DAL, schema (zod)                            │
├─────────────────────────────────────────────────────────────┤
│  DAL (data access layer — the ONLY file-group that imports  │
│        supabase client)                                     │
│  - One module per table: src/dal/dailyRituals.ts, etc.      │
│  - Each export is a typed, validated function               │
│  - Every call emits a structured log line with correlation  │
├─────────────────────────────────────────────────────────────┤
│  @repo/schema (shared types + zod schemas — client AND      │
│                 edge functions import from this)            │
└─────────────────────────────────────────────────────────────┘
```

An ESLint rule (`eslint-plugin-boundaries` or `no-restricted-imports`) enforces the arrows above. A single violation = red PR.

### Edge-function anatomy (every function, no exceptions)

```ts
import { handler } from "../_shared/handler.ts";
import { z } from "zod";
import { MyRequest, MyResponse } from "../_shared/contracts/my-feature.ts";

export default handler({
  schema: MyRequest,        // zod — validates req body
  response: MyResponse,     // zod — validated at cache key + before return
  auth: "required" | "optional" | "webhook-secret",
  rateLimit: { key: "user" | "ip", window: "60s", max: 10 },
  cost: { budget: "gemini.daily" }, // optional cost ledger tag
  handler: async (ctx, body) => {
    // ctx = { userId, correlationId, log, supabase, secrets }
    // body = validated MyRequest
    // throw new AppError("NOT_FOUND", "chart missing") for known errors
    return { ... } satisfies z.infer<typeof MyResponse>;
  }
});
```

This removes **every** ad-hoc auth/CORS/validation/log/error-shape in the codebase. A new function is a schema + handler body.

### Observability contract (every request, every function)

```
Client              Edge                DB
─────               ────                ──
[X-Correlation-Id]  log.with({corrId})  statement_comment corrId
      ▲                  │                       │
      └──────────────────┴───────────────────────┘
              single trace in Sentry
```

- `X-Correlation-Id` header set on every client request (already have `generateCorrelationId`).
- Edge handler extracts it, puts it on every log line.
- DB writes from edge functions use `/*corrId:...*/` comment for pg_stat_statements pivot.
- `Sentry.setUser({ id: userId })` after auth.
- `Sentry.release` = `import.meta.env.VITE_BUILD_SHA` (injected at build).
- Sourcemaps uploaded on deploy.
- Structured logs shipped to Logtail/Axiom/Better Stack → single query surface.

### Data lifecycle policy (every table)

Every new table must declare **at migration time**:
- **Partition key** if row count at 1M users > 100M/yr → native Postgres range partitioning by month
- **TTL** (`expires_at` GENERATED column + nightly `pg_cron` DELETE) if it's a cache
- **RLS** using the template (below)
- **Indexes** for every `.eq()`/`.order()`/`.filter()` that runs it
- **Estimated rows/yr** in the migration comment at 1M DAU

RLS template (mandatory):
```sql
ALTER TABLE foo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own rows select" ON foo FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "own rows insert" ON foo FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "own rows update" ON foo FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
```

Note the parens around `(SELECT auth.uid())` — planner optimization.

### Release pipeline (what "deploy" means)

```
branch: feature/x → PR to main
  ├─ CI: lint, typecheck, unit, integration, e2e-critical-path, boundary-lint, migration-drift
  ├─ Preview: Netlify deploy preview (unique URL per PR)
  ├─ Supabase: db diff vs remote → must match
  ├─ Manual approval (you) → merge
  └─ main auto-deploys to prod via GitHub Action

Feature rollout:
  1. Ship dark (feature flag OFF in FeatureFlagContext)
  2. Canary: flip flag for admin accounts only (user_roles.role = 'admin')
  3. 10% rollout via user_id hash
  4. 100%

Rollback:
  - Netlify: `netlify rollback` one command (previous build is cached)
  - Supabase: every migration has an ascending and descending form
  - Feature flag: flip to OFF (no deploy needed)
```

### Cost guardrails (mandatory at every API boundary)

| External service | Daily cap per user | Global monthly alarm |
|---|---|---|
| Gemini | 20 premium / 3 free (already enforced in DB) | Billing alert @ 80% of budget |
| Nominatim (geocode) | IP rate-limit 20/min (done) | — |
| Resend (welcome email) | — | 10k/day before fallback |
| Stripe webhook retries | — | — (idempotent handler) |

Every Gemini call writes to `ai_usage_ledger` with `{user_id, model, prompt_tokens, completion_tokens, cost_cents, request_id}`. A `pg_cron` job aggregates daily and fires a Sentry alert if > threshold.

---

## Part 4 — Phased migration plan

Each phase is 1–2 weeks, stands alone, and has a **"what breaks if you skip"** line so you can reorder if priorities change.

### Phase 0 — Stop the bleeding (2–3 days)

Non-negotiable gates before any feature work.

| Task | Evidence | What breaks if skipped |
|---|---|---|
| Fix 5 typecheck errors (LibrarySection:713, BlogPostPage:29-32, TarotMeaningsPage:22) | testing-ci-audit C1 | CI silently passes garbage; new TS bugs ship |
| Add `ads.txt`/`app-ads.txt` idempotency migration + fix schema drift (`astrology_horoscope_cache` missing migration) | db-audit C1 | First column rename or column addition triggers 500s everywhere |
| Unblock client/server type drift: add `moonSignLocalized` to `DailyContent` | arch-audit C3 | Locked into current shape; refactor is scary |
| Auto-deploy from main via GitHub Action (Netlify deploy + Supabase migration push) | testing-ci-audit C2 | Manual deploys keep being skipped, divergence grows |
| `Sentry.release = VITE_BUILD_SHA`, `Sentry.setUser(userId)` | obs-audit C4 | Every incident is a bisection hunt |

**Exit criteria:** green CI. Every deploy tagged. Every Sentry event has a user + a release.

### Phase 1 — Foundations (1 week)

The shared helpers + DAL that make everything downstream cheap.

| Task | Touches | Notes |
|---|---|---|
| Create `src/dal/` — one module per table. Rewrite the 21 scattered `supabase.from(...)` call sites to go through DAL | arch-audit C1 | Start with `daily_rituals`, `saved_highlights`, `blog_posts`, `profiles` — the hot ones |
| Add `eslint-plugin-boundaries` rule: UI may not import `supabase` | arch-audit C1 | One-time cleanup, permanent guard |
| Wire up 3 shared edge-function helpers that ALREADY EXIST but aren't used: `_shared/auth.ts`, `_shared/cors.ts`, `_shared/response.ts` | api-audit H1/H2 | Reduces boilerplate 70%, fixes error-shape drift |
| Introduce `_shared/handler.ts` wrapper (see target arch). Migrate 3 functions as proof (ad-config, astrology-daily, generate-reading) | api-audit C4 | Remaining 13 follow the template in Phase 3 |
| Add `X-Correlation-Id` propagation: client sends, every edge handler reads, every log includes | obs-audit C1 | Untangles debugging immediately |
| Replace unstructured `console.error` in edge functions with `log.error({corrId, userId, span, err})` | obs-audit C2 | JSON logs unlock dashboards |

**Exit criteria:** pages have zero direct supabase imports. Any edge function can be debugged end-to-end with one correlation ID.

### Phase 2 — Contracts & validation (1–1.5 weeks)

Kill drift between client and server. Zod at every boundary.

| Task | Notes |
|---|---|
| Add `@repo/schema` — a single folder with zod schemas for every request/response shape. Share it between client and edge functions via relative import (or a small workspace if you want the real monorepo) | — |
| Wrap every `callFn()` client side with zod parsing on the way back | arch-audit C3 |
| Every edge handler declares `schema:` and `response:`; malformed input → 400 with structured error; unknown response shape = runtime error in dev, Sentry error in prod | api-audit C4 |
| Add API versioning: `/functions/v1/...` stays stable; new breaking changes go to `/functions/v2/...` with a 30-day deprecation window announced in Sentry | api-audit H4 |
| Move duplicated `ALLOWED_ORIGINS` from 6 functions into single `_shared/cors.ts` | api-audit H1 |
| Replace 4 distinct error response shapes with `{ error: { code, message, correlationId } }` everywhere | api-audit H5 |

**Exit criteria:** `npx tsc` passes. A breaking edge-function response shape change fails CI on the client side before merge.

### Phase 3 — Data lifecycle (1–2 weeks)

Make the DB partition-ready and write-amplification-lean before it bites.

| Task | Evidence |
|---|---|
| Canonicalize `astrology_horoscope_cache` schema in a real migration. Add `expires_at` GENERATED col. Add `pg_cron` nightly `DELETE WHERE expires_at < now()` | db-audit C1 |
| Partition `ad_impressions`, `xp_activities`, `horoscope_history` by month using native Postgres 14+ range partitioning. Keep 90 days hot, archive older to a `*_archive` table | db-audit C4 |
| Remove hardcoded `lawrence.ma000@gmail.com` from 4 migrations; replace with a `seed_admin_role.sql` runbook step that's not part of schema history | db-audit C3 |
| Add webhook idempotency: `webhook_events (id UUID PK, source TEXT, event_id TEXT UNIQUE, processed_at)`. Stripe/RC handlers INSERT first; on conflict → 200 no-op | api-audit C1 |
| Wrap `handle_new_user()` welcome-email call in `pg_notify` instead of synchronous `net.http_post()`. Separate edge function listens and sends | db-audit C2 |
| Harden `SET search_path = pg_catalog, public` on `handle_new_user`, `send_welcome_email_trigger`, and `check_level_milestones` | db-audit M3 |
| Drop 30+ unused indexes after verifying pg_stat_user_indexes `idx_scan = 0` for 30 days | db-audit H1 |
| Add storage-bucket `file_size_limit` (2 MB images) + `allowed_mime_types` on `backgrounds`, `tarot-images`, `card-backs`, `custom-icons`, `blog-covers` | db-audit M4 |
| Migration-drift check in CI: `supabase db diff --schema public` must be empty | testing-ci-audit H4 |

**Exit criteria:** cache + impressions + achievements tables grow linearly with active users, not users ever. Duplicate webhook deliveries are no-ops.

### Phase 4 — Testing net (2 weeks)

Catches regressions the god-objects keep hiding.

| Task | Notes |
|---|---|
| E2E tests for critical paths: sign-in (email + Google), OAuth callback, premium purchase (Stripe + RC), daily horoscope fetch, paywall trigger, admin role check. Playwright; runs in CI | testing-ci-audit C4 |
| Component tests for god-objects-to-be-split: QuizzesPage flows, TarotSection draw flow, SettingsSheet sections | — |
| Test coverage gate: 60% overall, 90% on `src/services` and `src/dal` | — |
| Wire `scripts/audit-*.mjs` + `language-audit.mjs` into `npm run audit`; add to nightly CI cron | testing-ci-audit H5 |
| Require PRs (branch protection via GitHub) for any change to `supabase/migrations/`, `src/dal/`, `supabase/functions/_shared/` | testing-ci-audit H2 |

**Exit criteria:** refactoring god-objects becomes safe. A merge-to-main is gated by ~8 minutes of tests.

### Phase 5 — Scale infrastructure (2 weeks)

What you'll actually need at 100k → 1M.

| Task | Notes |
|---|---|
| Move rate limiter to Upstash Redis (global, per-user, per-IP). Every edge function has a decorator | api-audit C2 |
| Add `ai_usage_ledger` (user_id, model, prompt_tokens, completion_tokens, cost_cents, corr_id, created_at) partitioned by day. `generate-reading` writes after every call | api-audit C3 |
| Sentry alert rules + UptimeRobot (5-min sign-in, 5-min horoscope fetch, 5-min generate-reading) | obs-audit C5 |
| Core Web Vitals: add `web-vitals` to `package.json`, report `onLCP/onCLS/onINP` to GA4 as custom events | obs-audit C3 |
| Feature flags: small table `feature_flags (key TEXT PK, enabled BOOL, rollout_percent INT, allowed_user_ids UUID[])` + client hook `useFlag('new-reading-flow')` | — |
| CloudFlare in front of Netlify for edge caching of `/tarot-meanings/*`, `/blog/*`, locale JSONs | — |
| Switch `generate-reading` default to Gemini 2.0 Flash (-90% cost); keep 2.5 Pro as premium-tier opt-in | — |
| Split god-objects behind feature flags: QuizzesPage → QuizzesPage + QuizFlow + QuizResults + individual quiz types; TarotSection → TarotHome + SpreadPicker + ReadingDetail | arch-audit H1 |

**Exit criteria:** a deliberate user can't burn your Gemini budget. A bad feature can be killed without a deploy. Regional latency P95 < 300ms.

### Phase 6 — Feature velocity machine (ongoing)

Once Phases 0–5 are in, adding a feature is mechanical. This is the playbook (see Part 6).

---

## Part 5 — Cost / capacity model

Assumptions: average user = 1 horoscope/day, 1 reading/day (3 free, 20 premium cap), 3 page views, 2 edge function calls. 10% premium conversion. Gemini 2.0 Flash ($0.0001/1K input, $0.0004/1K output, ~2K tokens/reading = $0.001/call).

| Scale | Supabase | Netlify | Gemini | Sentry | Upstash | **Total/mo** | First thing to break |
|---|---|---|---|---|---|---|---|
| **10k DAU** | $25 (Pro) | $19 (Pro) | ~$30 | $26 (Team) | $10 | **$110** | nothing |
| **100k DAU** | $599 (Team) | $300 (bw + fn) | ~$300 | $80 | $25 | **$1.3k** | Supabase DB connections (needs PgBouncer or Team+) |
| **500k DAU** | $2.5k+ | $1.5k+ | ~$1.5k | $200 | $50 | **$6k+** | Netlify bandwidth (CDN caching required) |
| **1M DAU** | $5k+ | $3k+ | ~$3k (Flash) / $30k (Pro) | $500 | $100 | **$12–40k** | Gemini cost (if still on Pro); DB read replicas needed |

Two notes on the math:
1. **If you stay on Gemini 2.5 Pro, the 1M DAU bill is dominated by Gemini at ~$30k/mo.** Flash is 10-20× cheaper at imperceptibly worse quality for tarot prose.
2. **Supabase Pro → Team jump happens at ~60k DAU** when you exceed Pro's 500 connections. Team is $599 base + usage.

Budget: plan for **$4k/mo at 100k DAU** once you factor in logging, monitoring, CloudFlare, and 20% cost headroom. That's $48k/yr for infrastructure — fine if ARPU > $0.50/mo.

---

## Part 6 — The feature-addition playbook (keep this short, use it every time)

When anyone (you, future team, or me) ships a new feature, this is the exact checklist. If you skip steps, the feature grows the god-objects and adds another silent `catch {}`.

```
1. Contract first
   [ ] Add request + response zod schemas to @repo/schema/<feature>.ts
   [ ] Write the DB migration (table + RLS template + indexes + TTL if cache)
   [ ] Document estimated rows/yr at 1M DAU in the migration comment

2. Server second
   [ ] New edge function uses handler({ schema, response, auth, rateLimit, handler })
   [ ] No ALLOWED_ORIGINS inline — imports _shared/cors.ts
   [ ] No console.error — uses ctx.log
   [ ] Returns AppError('CODE', 'msg') for known errors
   [ ] If it calls an external API: writes to ai_usage_ledger (or equivalent)
   [ ] Webhook? Write event.id to webhook_events first

3. Data access third
   [ ] New module in src/dal/<table>.ts — the ONLY file that calls supabase.from('<table>')
   [ ] Every exported function validates response with zod
   [ ] Every function emits a structured log line on both success and failure

4. Hooks / services fourth
   [ ] Hook lives in src/hooks/use<Feature>.ts — calls DAL + services, never supabase directly
   [ ] Service (framework-agnostic) in src/services/<feature>.ts if there's business logic
   [ ] Error handling: throw or return { ok: false, error } — no silent catch {}

5. UI fifth
   [ ] Component stays under 300 lines — split by responsibility, not by tab
   [ ] No new top-level page that's > 500 lines — use nested routes or lazy islands
   [ ] i18n: every string goes through useT(); no `i18n.language` — use getLocale()

6. Rollout
   [ ] Add feature_flags row: rollout_percent = 0
   [ ] Deploy via PR → CI runs (lint + typecheck + unit + integration + e2e critical + boundary-lint + migration-drift)
   [ ] After preview approval: merge → main auto-deploys
   [ ] Flip flag for admin users (rollout_percent stays 0, allowed_user_ids = ['admin-uuid'])
   [ ] Watch Sentry + dashboards 24h
   [ ] rollout_percent = 10, watch 24h
   [ ] rollout_percent = 100

7. Rollback path (writes this BEFORE step 1)
   [ ] Flag flip to OFF (instant, no deploy)
   [ ] If data migration harmful: `supabase migration repair` script in the migration folder
   [ ] Known breakage modes documented in feature PR description
```

---

## Part 7 — Decision points for you

Three choices you need to make to unblock Phase 1:

1. **Monorepo or flat?**
   A tiny `packages/schema` workspace makes shared types trivial. Stays flat if you don't want pnpm/Turbo. Either works — I recommend keeping flat until a second deployable exists.

2. **Staging environment?**
   Dedicated Supabase "staging" project + Netlify staging site = $25/mo extra. Lets you test real webhooks without contaminating prod. Recommend yes.

3. **Feature-flag vendor vs rolled?**
   Rolling your own (Postgres table + hook) is 2 hours and free, covers 95% of needs. Growthbook/LaunchDarkly cost $0–50/mo at this scale. Recommend rolled.

---

## Part 8 — What I'm NOT recommending (and why)

To save you time evaluating options:

- **Microservices / splitting edge functions out:** wrong direction. Supabase's surface is fine; the problem is that the existing functions don't share code.
- **Switching off Supabase:** 59 migrations and working RLS is a large investment. No reason to rip it out.
- **React Server Components / Next.js migration:** big rewrite for no user-visible win. Vite SPA is fine.
- **GraphQL:** more weight than it's worth for this size of API. zod + typed RPC is lighter.
- **Kubernetes / self-hosted:** nope. Everything here fits managed services until ≥10M users.
- **Rewrite in Go / Rust / anything:** the bottleneck is architecture discipline, not the runtime.

---

## Appendix A — Scripts to land in Phase 0 (single PR)

```bash
# 1. Fix typecheck
npm run typecheck 2>&1 | head -30     # shows the 5 errors
# … fix each …

# 2. Add GitHub Action for auto-deploy on main
# .github/workflows/deploy.yml
#   - netlify-cli deploy --prod --dir=dist on push to main
#   - supabase db push on push to main (idempotent)
#   - supabase functions deploy <name> on changed function dirs

# 3. Sentry release tag
# vite.config.ts: define VITE_BUILD_SHA from git sha at build
# src/main.tsx: Sentry.init({ release: import.meta.env.VITE_BUILD_SHA })

# 4. Sentry user + correlation ID
# AuthContext.tsx: after session, Sentry.setUser({ id: userId })
# i18n/callFn equivalent: always include X-Correlation-Id header
```

## Appendix B — Red flags to watch during migration

- "Let's add one more thing to SettingsSheet.tsx" → no, split it
- "I'll wrap this in try/catch {}" → no, `ctx.log.error` or rethrow
- "I'll just import `supabase` here because it's simpler" → no, add to DAL first
- "We'll add the test later" → phase 4 is the only phase where "later" is cheaper
- "The migration can hardcode this user ID for now" → never. Every hardcoded ID is paid for 10x in ops later.
