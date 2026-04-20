# API / Edge Function Scalability Audit

**Scope:** 16 Supabase edge functions at `supabase/functions/*/index.ts` + 4 shared modules in `supabase/functions/_shared/` + client callers in `src/hooks/useAstrology.ts` and `src/services/{adConfig,billing,readingInterpretation}.ts`.

**Note:** task brief says 17 functions; directory actually contains 16 (no `_shared` counted). All 16 were audited.

**Finding-to-function matrix (for cross-reference in each item below):**

| Function | verify_jwt | CORS source | Internal auth | Input validator | Rate limit | Error shape |
|---|---|---|---|---|---|---|
| ad-config | off | inline `ALLOWED_ORIGINS` L9-21 | anon-client soft `getUser` L48-54 | none (typeof check only, L82) | in-mem `checkRateLimit` L57 | `{error}` |
| ad-events | off | inline `ALLOWED_ORIGINS` L9-21 | anon-client soft `getUser` L70-77 | custom `isValid*` L175-185 | in-mem `checkRateLimit` L80 | `{error}` |
| astrology-compute-natal | off | `corsHeaders = {* }` L5-9 | service-role + `getUser(token)` L266 | `await req.json()` no validation | none | mixed (throws + `Error.message`) |
| astrology-daily | off | `corsHeaders = {* }` L20-25 | service-role + `getUser(token)` L316 | `normalizeLocale` only, L323-327 | none | `{error}` |
| astrology-geocode | off | `_shared/cors.ts` L2 | none (public) | `sanitizeBirthPlace` L20-25 | in-mem `checkRateLimit` L39 | `{error, results:[]}` |
| astrology-get-chart | off | `corsHeaders = {* }` L4-8 | service-role + `getUser(token)` L32 | none (pure GET) | none | `{error}` |
| astrology-monthly | off | `corsHeaders = {* }` L7-11 | service-role + `getUser(token)` L204 | none on body | none | `{error}` |
| astrology-transit-calendar | off | `corsHeaders = {* }` L5-9 | service-role + `getUser(token)` L93 | `Math.min(body.days, 90)` only, L100 | none | `{error, events:[]}` |
| astrology-weekly | off | `corsHeaders = {* }` L7-11 | service-role + `getUser(token)` L202 | none on body | none | `{error}` |
| blog-webhook | DEFAULT (on) | `corsHeaders = {* }` L3-7 | custom header `x-webhook-secret` L94-99 | `title`/`content` presence only, L122 | none | `{error}` |
| create-checkout-session | off | inline `ALLOWED_ORIGINS` L14-26 | `getUser()` via pass-through L83 | field presence + `isAllowedRedirectUrl` L111-123 | in-mem `checkRateLimit` L93 | `{error}` |
| create-portal-session | off | inline `ALLOWED_ORIGINS` L14-26 | `getUser()` via pass-through L79 | field presence + redirect allowlist | in-mem `checkRateLimit` L89 | `{error}` |
| generate-reading | off | inline `ALLOWED_ORIGINS` L9-21 | `getUser()` via pass-through L315 | `cards.length>0 && <=MAX_CARDS` only, L391 + `sanitizeUserInput` | in-mem burst L330 + DB daily quota L349-387 | `{error}` mostly; some 500 leak `Error.message` |
| revenuecat-webhook | DEFAULT (on) | **none** (server-to-server) L9 | `Bearer ${REVENUECAT_WEBHOOK_SECRET}` L54-63 | `JSON.parse` try/catch only, L71-78 | none | `{error}` |
| send-welcome-email | off | inline `ALLOWED_ORIGINS` L5-17 | service-role + `getUser(token)` L183 + self-only check L210 | `user_id` identity check only, L208 | in-mem `checkRateLimit` L193 | `{error}` |
| stripe-webhook | DEFAULT (on) | `corsHeaders = {* }` L16-20 | `stripe.webhooks.constructEvent` (HMAC sig) L114 | Stripe SDK typing | none | `{error}` |

---

## Critical

### C1. Webhooks have no idempotency — Stripe and RevenueCat can double-charge entitlements on retry
- **Functions:** `supabase/functions/stripe-webhook/index.ts` L125-245, `supabase/functions/revenuecat-webhook/index.ts` L102-220
- **Current behavior:** Both webhooks write to `profiles`, `subscriptions`, and `audit_events` every time a payload arrives. Stripe identifies each delivery by `event.id` (available at L111 as `event.id`) but it is never persisted. RevenueCat provides `webhookData.event.id` (L17) but it is likewise ignored. `subscriptions.upsert` is idempotent on `transaction_id`, but `audit_events.insert` at stripe-webhook L68-75 and revenuecat-webhook L156-166 / L207-215 is **not** — every retry appends a duplicate audit row. Grep for `event.id`, `event_id`, `processed_event`, `idempot` across the entire functions tree returns **zero matches**.
- **Failure mode at scale:** Stripe retries on 5xx (and occasionally on client transient errors) up to ~3 days. At 100k users with ~1% webhook retries, the `audit_events` table drifts from reality: premium counts, churn reports, and revenue dashboards will overcount activations and cancellations. Worse: if `profiles.is_premium` was manually toggled off by support, an out-of-order replayed `RENEWAL` event silently re-enables premium.
- **Fix:** Add a `webhook_events(provider, event_id PRIMARY KEY, received_at)` table. First line of each handler: `INSERT ... ON CONFLICT DO NOTHING RETURNING *` — if no row returned, return 200 immediately without side-effects. Stripe's `event.created` timestamp should also gate out-of-order updates (compare against `subscriptions.updated_at`).

### C2. In-memory rate limit is per-isolate, not global — DDoS-able at scale
- **Functions using `_shared/rate-limit.ts`:** ad-config L57, ad-events L80, astrology-geocode L39, create-checkout-session L93, create-portal-session L89, generate-reading L330, send-welcome-email L193 (7 functions)
- **Functions with NO rate limiting at all:** all 7 astrology-compute-natal/daily/weekly/monthly/transit-calendar/get-chart, stripe-webhook, revenuecat-webhook, blog-webhook (9 functions)
- **Current behavior:** `_shared/rate-limit.ts` L16 stores buckets in a per-isolate `Map`. The file's own comment at L7-9 admits this is a "first-line defense" only. Supabase autoscales isolates; at 10k concurrent users each new isolate starts with an empty map so the effective limit is `limit × isolate_count`.
- **Failure mode at scale:** `generate-reading` is the canonical example — 5 req/60s "burst limit" at L330 becomes 5×N req/60s where N is the number of warm isolates. With Gemini at ~$0.00075 per 1k input tokens + $0.003 per 1k output tokens and `maxOutputTokens: 1024` (L247), a coordinated attacker spinning up isolates via cold request bursts can burn multi-hundred-dollar/hr in Gemini costs. The DB-backed daily quota at L349-387 still catches them eventually, but only after the LLM call has already been billed.
- **Fix:** Move rate-limit counters to a Supabase Postgres table `rate_limit_buckets(key, window_start, count)` with an atomic upsert RPC, OR use Supabase's built-in `edge_runtime` Redis integration. Apply to **every** authenticated function. For `generate-reading` specifically, the daily-quota DB check should run **before** the Gemini call, not just at L369.

### C3. `generate-reading` has no per-IP cap on pre-auth burst, and Gemini cost ceiling is undocumented
- **Function:** `supabase/functions/generate-reading/index.ts` L223-261
- **Current behavior:** `callGemini` at L223 has a 30s timeout (L231) and `maxOutputTokens: 1024` (L247), but no token accounting, no daily $ ceiling, no per-tenant quota visible to ops. Free tier: 3/day (L366). Premium: 20/day (L366). Worst case: 100k premium users × 20 readings = 2M calls/day. At ~1500 input tokens per call (system prompt + card excerpts) + 1024 output, that's ~5B tokens/day → ~$10k–$15k/day in Gemini cost at current rates with zero alarm.
- **Fix:** (a) Log `usage.totalTokenCount` from the Gemini response (the code discards `data.usage` at L259-260); (b) insert into a `llm_cost_ledger(user_id, prompt_tokens, completion_tokens, model, cost_cents_est)` table; (c) PG `cron` job that rolls up daily cost and emits an alert when above threshold; (d) hard monthly $ cap per project via a feature flag the function checks before calling Gemini.

### C4. Astrology endpoints accept unvalidated user input — prototype-pollution / DoS via `days`, unchecked `locale`
- **Functions:** `supabase/functions/astrology-transit-calendar/index.ts` L96-102, `supabase/functions/astrology-daily/index.ts` L319-327, `astrology-weekly`, `astrology-monthly`, `astrology-compute-natal`
- **Current behavior:** `transit-calendar` L100 does `days = Math.min(body.days, 90)`. An attacker sending `{ days: -99999 }` passes the typeof check; `Math.min(-99999, 90) = -99999`; the loop `for (let d = 0; d < days; d++)` at L131 doesn't execute — returns an empty array silently (no crash, but also no error told to client). Sending `{ days: NaN }` → `Math.min(NaN, 90) = NaN`, loop body never enters. `{ locale: "'; DROP TABLE--" }` hitting `astrology-daily` passes through `normalizeLocale` which falls back to `en` (safe), but the locale is then concatenated into the cache key `` `daily:${locale}` `` at L350 and persisted — no SQL risk because Supabase client uses parameter binding, but a maliciously large string would blow up the cache index.
- **Failure mode at scale:** Adding a new feature tomorrow that forgets to re-sanitize (e.g., reusing the locale string inside a logged metric) becomes a trivial log-injection or cache-bloat vector. No shared validator means every new endpoint author re-invents, imperfectly.
- **Fix:** Add `supabase/functions/_shared/validate.ts` using Zod (or Valibot — both work in Deno). One schema per endpoint, called at request entry. Return `400` with a structured `{ error: "ValidationError", issues: [...] }` on failure.

---

## High

### H1. `ALLOWED_ORIGINS` duplicated across 6 files — the v1 audit was right, duplicate has NOT been eliminated
- **Duplicated in:** `ad-config/index.ts` L9-21, `ad-events/index.ts` L9-21, `create-checkout-session/index.ts` L14-26, `create-portal-session/index.ts` L14-26, `generate-reading/index.ts` L9-21, `send-welcome-email/index.ts` L5-17 — **6 copies, confirmed.**
- **Current behavior:** `_shared/cors.ts` already exists (L1-14) and has a 13-entry canonical list that is a **superset** of the inline copies. Only `astrology-geocode` (L2) actually imports it. Meanwhile the 7 astrology functions (daily/weekly/monthly/compute-natal/get-chart/transit-calendar) use the looser `Access-Control-Allow-Origin: "*"` — no allowlist at all.
- **Failure mode at scale:** Adding `https://tarotlife.jp` (locale microsite) tomorrow = editing 7 files. Guaranteed drift. Already drifted: `_shared/cors.ts` L13 includes `"https://localhost"` for Capacitor HTTPS; the 6 inline copies do not (e.g., `generate-reading/index.ts` L9-21 missing line). Any iOS TestFlight build on https://localhost is already broken against `generate-reading`.
- **Fix:** Rip every inline `ALLOWED_ORIGINS` + `getCorsHeaders` and `import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts"` everywhere. Delete the 7 `Access-Control-Allow-Origin: "*"` cases entirely — any authenticated endpoint with `*` CORS is a CSRF vector for any origin that can acquire a user token (e.g., via the Supabase JS client loaded on a malicious site).

### H2. Authentication pattern is not uniform — 3 distinct patterns across 12 authed functions
- **Pattern A (service-role + manual token):** `astrology-compute-natal/index.ts` L261-267, `astrology-daily/index.ts` L311-317, `astrology-weekly/index.ts` L197-202, `astrology-monthly/index.ts` L199-204, `astrology-get-chart/index.ts` L27-35, `astrology-transit-calendar/index.ts` L88-94, `send-welcome-email/index.ts` L180-183 — uses service role key with `persistSession: false` and passes token to `getUser(token)`.
- **Pattern B (anon-client pass-through):** `create-checkout-session/index.ts` L74-83, `create-portal-session/index.ts` L72-79, `generate-reading/index.ts` L305-315 — uses anon key with `global.headers.Authorization` then `getUser()` with no arg.
- **Pattern C (optional soft auth):** `ad-config/index.ts` L47-54, `ad-events/index.ts` L67-77 — authed if header present, else anonymous, always succeeds.
- **Failure mode:** Pattern A leaks the `SUPABASE_SERVICE_ROLE_KEY`-scoped client into the request handler even for routes that only need user-scoped queries — if a future developer adds `supabase.from("subscriptions").select("*")` below L317 in astrology-daily, RLS is bypassed. Pattern B is safer but incompatible with Pattern A's caching logic (anon-client can't read service-role-only rows). `_shared/auth.ts` already exports `getAuthenticatedUser` and `createServiceClient` (L3-30) but **zero functions import it** (grep confirms).
- **Fix:** Adopt `_shared/auth.ts` everywhere. Helpers needed: `requireUser(req)` returning `{ user, userClient }` where `userClient` is the anon-key-backed RLS-enforcing client, plus a separate `adminClient()` for service-role writes. Force callers to name which they want.

### H3. No correlation / request ID propagation — production triage will be guesswork
- **Functions:** all 16
- **Current behavior:** Client generates correlation IDs (`src/utils/telemetry.ts` L8, L23, L30 and AuthContext L735, L773, L797) but `src/hooks/useAstrology.ts` `callFn` L34-89 does **not** attach them as a header. Edge functions do their own `console.error("[Stripe] Webhook error:", err)` (stripe-webhook L252) / `console.error("Daily horoscope error:", error)` (astrology-daily L468) — no correlation ID, no user ID, no function version. 16 different ad-hoc logging styles (`[AdConfig]`, `[Stripe]`, `[RevenueCat]`, bare, etc.).
- **Failure mode at scale:** User reports "my reading failed at 3:42pm". You now need to grep Supabase logs for a 30-minute window with no way to pin the specific invocation. At 100k users, 30 min = tens of thousands of log lines.
- **Fix:** (a) In `callFn` in `useAstrology.ts`, add `headers['X-Correlation-Id'] = currentCorrelationId`. (b) Add `_shared/log.ts` that reads the header and exports `log.info({ fn, corr, userId, ... })` wrapping `console.log(JSON.stringify({...}))` — structured JSON lines that the Supabase logs UI indexes.

### H4. Zero API versioning — any response-shape change is an instant Android-app breakage
- **Functions:** all 16 — nothing lives under `/functions/v1/v1/` or equivalent namespace.
- **Current behavior:** `src/services/readingInterpretation.ts` L49 hits `${supabaseUrl}/functions/v1/generate-reading` directly. `supabase/functions/generate-reading/index.ts` L464-469 returns `{ interpretation, usedLlm, cardCount }`. If you rename `interpretation` to `text` tomorrow, every Play-Store Android user not on the latest APK breaks silently (Android users may not auto-update for weeks/months — MEMORY.md notes TAROT is live on com.arcana.app).
- **Failure mode:** Native apps block on user-driven updates; a breaking change ships and the support queue fills with "reading screen is blank" with no graceful degradation.
- **Fix:** (a) Version in function path (`generate-reading-v2`) OR support a `?v=2` query param and branch inside the handler. (b) Never remove fields — only add. (c) Client sends `X-Client-Version` so server can tailor response if needed. (d) A `deprecations` array in every response so stale clients can nag the user to update.

### H5. Four distinct response shapes for errors
- **Shape 1 `{error: string}`:** ad-config, ad-events, create-checkout-session, create-portal-session, generate-reading, send-welcome-email, stripe-webhook (error at L105, L118, L254), astrology-get-chart (errors only, success shape varies)
- **Shape 2 `{error, events: []}` / `{error, results: []}`:** astrology-transit-calendar L112-114, astrology-geocode L59-64 — returns partial data on error so callers don't need null checks. Inconsistent with shape 1.
- **Shape 3 includes `message`:** revenuecat-webhook L83 returns `{success: true, message: "Test webhook received"}`. send-welcome-email L241 returns `{success, message, email, name}`. No other function uses `message`.
- **Shape 4: leak `err.message` into user-facing error:** generate-reading L456 `error: "Database error: ${saveError.message}"` and L479 `error: "Server error: ${errorMessage}"` — internal DB errors exposed to callers.
- **Fix:** Freeze one shape: `{ ok: false, error: { code: string, message: string, correlationId: string, details?: unknown } }`. Move `errorResponse` in `_shared/response.ts` L27-39 to produce it; update all functions to use the helper (currently only `_shared/cors.ts` is imported by just 1 function; `_shared/response.ts` is imported by **zero** — verified via grep).

---

## Medium

### M1. Client/server type drift — `DailyContent` already has silent drift
- **Client type:** `src/types/astrology.ts` L58-71 defines `DailyContent` with 10 fields.
- **Server response:** `supabase/functions/astrology-daily/index.ts` L437-451 returns 12 fields — adds `moonSignLocalized` (L442) and `moonSign` is typed `ZodiacSign` on client but is the raw `.sign` value from `lonToSign()` on server (`as ZodiacSign` assertion, no validation). No localized sign name type on client — the feature exists but is unused/unvalidated.
- **Fix:** Move type definitions to a single source (`packages/shared-contracts/astrology.ts` or equivalent) imported by both `src/` and `supabase/functions/`. Zod schemas would give runtime validation for free on both sides.

### M2. No dedupe on concurrent reads — cache race in astrology-daily
- **Function:** `astrology-daily/index.ts` L351-362 reads cache; L453-462 writes cache with `onConflict: "user_id,date,type"`. Between read and write (hundreds of ms of Gemini + compute), two parallel requests from the same user (e.g., fast tab-switch) both miss the cache and both run the compute. Upsert collapses the row, but the compute cost doubled.
- **Fix:** Add a lightweight in-memory `inflight: Map<key, Promise<Response>>` within the isolate, and/or a DB-advisory-lock via `pg_try_advisory_xact_lock(hash(user_id, date, type))` inside a short SELECT-FOR-UPDATE transaction.

### M3. `blog-webhook` accepts any `title`+`content` — no length caps, no HTML sanitization depth
- **Function:** `blog-webhook/index.ts` L122-133
- Missing: MAX_TITLE_LEN, MAX_CONTENT_LEN, tag array cap, and `formatContent` at L10-15 trusts `post.raw` to mean "already safe HTML" — an attacker with `BLOG_WEBHOOK_SECRET` can inject `<script>` via `raw: true`. Secret rotation matters but is not the only defense.
- **Fix:** DOMPurify (server-side) or explicit allowlist of HTML tags. Cap content at ~100KB.

### M4. Stripe webhook has `Access-Control-Allow-Origin: "*"`
- **Function:** `stripe-webhook/index.ts` L16-20. Stripe never sends preflight, so the CORS header is ornamental — but it encodes the wrong message to whoever edits this file next ("oh, public endpoint"). Clean up: `revenuecat-webhook/index.ts` L9 comment correctly states no CORS needed.

### M5. `send-welcome-email` silently claims success when `RESEND_API_KEY` is missing
- **Function:** `send-welcome-email/index.ts` L237-252 returns `{ success: true, message: "Email queued..." }` with `status: 200` when secret is absent. Caller cannot distinguish "sent" from "not configured."
- **Fix:** Return `{ ok: true, sent: false, reason: "email_provider_not_configured" }` or 503; never lie about success. Secret `RESEND_API_KEY` was not in the supabase secrets list (verified); welcome-email has been silently no-op in prod since deploy.

---

## Low

### L1. `_shared/response.ts` is unused (zero imports — verified via grep).
### L2. `_shared/auth.ts` is unused (zero imports — verified via grep); duplicate inline auth in every function.
### L3. `stripe-webhook` does not rate-limit — OK in practice since Stripe itself backs off, but a misconfigured third-party forwarding webhook could DoS the DB.
### L4. `ad-events` accepts 50-event batches (L104) but does `for...of ... await supabaseAdmin.rpc(...)` serially (L114-149). At 50 RPCs × ~30ms each = 1.5s per request. Parallelize with `Promise.all`.
### L5. `astrology-compute-natal` and `astrology-daily` call `Astronomy` library (L78-101) on every request; heavy math, no memoization across the isolate for common dates.
### L6. Both Stripe handlers call `stripe.subscriptions.retrieve()` (L138, L224) for data already available on `event.data.object` — extra Stripe API round-trips at rate-limited cost.

---

## Positive findings

- P1. **Webhook secret handling** in `revenuecat-webhook/index.ts` L46-52 correctly fails closed when the secret is unset. Also refuses to log raw body (L66-67) — good hygiene.
- P2. **Stripe signature verification** at `stripe-webhook/index.ts` L114 uses the official `stripe.webhooks.constructEvent`; no roll-your-own HMAC.
- P3. **Redirect URL allowlisting** at `create-checkout-session/index.ts` L39-50 prevents open-redirect via `successUrl` / `cancelUrl`.
- P4. **Prompt injection defense** at `generate-reading/index.ts` L216-221 — `SYSTEM_INSTRUCTION` explicitly tells Gemini to ignore embedded instructions, and `sanitizeUserInput` L132-139 strips backticks + angle brackets.
- P5. `generate-reading` L330-343 layers in-memory burst limit **before** DB queries — the correct order even though the limit itself is broken (see C2).
- P6. `send-welcome-email` L210 enforces self-only (`user_id !== user.id` → 403) — a nice zero-trust touch.
- P7. `astrology-daily` L349-350 key-scopes the cache by locale so language switches don't bleed.
- P8. `astrology-geocode` correctly IP-rate-limits since it runs pre-auth (L37-52); many teams forget.
- P9. Supabase `config.toml` L60-91 documents *why* `verify_jwt = false` is set (ES256 vs HS256 token issue) — good institutional memory.

---

## Secret inventory (names only — values never printed)

From `supabase secrets list --project-ref ulzlthhkqjuohzjangcq`:

1. `BLOG_WEBHOOK_SECRET` — `blog-webhook` L81, L99
2. `GEMINI_API_KEY` — `generate-reading` L224
3. `REVENUECAT_WEBHOOK_SECRET` — `revenuecat-webhook` L6, L46
4. `STRIPE_SECRET_KEY` — `create-checkout-session` L6, `create-portal-session` L6, `stripe-webhook` L5 (3 places)
5. `STRIPE_WEBHOOK_SECRET` — `stripe-webhook` L12
6. `SUPABASE_ANON_KEY` — `ad-config` L6, `ad-events` L6, `generate-reading` L307, `_shared/auth.ts` L20 (4 places)
7. `SUPABASE_DB_URL` — not referenced by any function body (admin-only; keep)
8. `SUPABASE_SERVICE_ROLE_KEY` — `astrology-compute-natal` L?, `astrology-daily` L28, `astrology-weekly`, `astrology-monthly`, `astrology-geocode`(via `_shared`), `astrology-get-chart` L11, `astrology-transit-calendar` L13, `ad-config` L7, `ad-events` L7, `blog-webhook` L111, `generate-reading`(implicit), `revenuecat-webhook` L5, `send-welcome-email` L179, `stripe-webhook` L11 (**13 call sites of the same secret** — extract into a singleton factory)
9. `SUPABASE_URL` — same 13 call sites
10. `VITE_REVENUECAT_API_KEY` — leaked into edge-function env even though prefix `VITE_` implies client-bundled. Rename and remove; this is a misconfiguration smell.

**Missing from secret store, referenced in code:**
- `RESEND_API_KEY` — `send-welcome-email/index.ts` L235. Function handles absence gracefully (see M5) but prod currently sends zero welcome emails.

---

## External API dependencies (cost/quota surfaces)

| API | Function | Cost signal available | Currently monitored |
|---|---|---|---|
| Google Gemini | `generate-reading` L223-261 | `data.usage.totalTokenCount` (discarded at L259) | No |
| Stripe | `create-checkout-session`, `create-portal-session`, `stripe-webhook` | Stripe metered billing | Yes, via Stripe dashboard |
| OpenStreetMap Nominatim | `astrology-geocode` L75 | 1 req/sec per IP public policy | No — unauthenticated, uses `User-Agent: "Arcana-Astrology-App/1.0"` which groups ALL users under one quota. At scale this will get **IP-banned**. See L77-81. Must either self-host Nominatim or move to a paid geocoder (Mapbox, Google). |
| Resend | `send-welcome-email` L254 | Resend dashboard | No wiring to alerts |
| RevenueCat | `revenuecat-webhook` (inbound only) | n/a | n/a |

---

## Proposed API layer architecture

**Single-path runtime for every function:**

```
Request
  → _shared/cors.ts        (handleCorsPreFlight + getCorsHeaders)
  → _shared/log.ts         (parse X-Correlation-Id, create structured logger bound to it)
  → _shared/auth.ts        (requireUser | requireWebhookSecret | anonymous)
  → _shared/rate-limit.ts  (DB-backed, not in-memory)
  → _shared/validate.ts    (Zod schema per route)
  → handler(ctx)           (pure: receives typed input, returns typed output)
  → _shared/response.ts    (jsonResponse with uniform envelope)
  → _shared/error.ts       (catches throws, logs with corr id, maps to envelope)
```

**Uniform envelope:**
```ts
{ ok: true,  data: T, correlationId: string, deprecations?: string[] }
{ ok: false, error: { code, message, details? }, correlationId: string }
```

**Shared types:** move `src/types/astrology.ts`, the client's `TarotCard` definition, and the webhook event types into `supabase/functions/_shared/contracts/` and also expose them via a path alias to `src/` — so a grep for field rename surfaces ALL clients.

**Versioning:** introduce a hard rule: every function handler takes `(req, ctx: { version: 1 | 2 })` and the router selects based on either `X-Client-Api-Version` header or path suffix. Never delete a version for ≥ 6 months after release (matches Play Store reality for stale Android installs).

**Cost guardrails:**
- `llm_cost_ledger` table fed by `generate-reading` on every Gemini call.
- `pg_cron` job rolls up daily spend; inserts into `alerts` table when > budget; `alerts` has a webhook to Slack.
- Same pattern for Resend email volume, Nominatim rate.
- Monthly $ hard cap enforced in the function (fail closed when exceeded).

**Concrete next steps in priority order:**
1. Add webhook idempotency table (C1) — **ship this week**.
2. Move rate limits to Postgres (C2).
3. Unify CORS + auth via `_shared/*` (H1, H2) — mechanical.
4. Add Zod validators (C4).
5. Structured logging + correlation IDs (H3).
6. Shared contracts package (M1).
7. API versioning scheme before the next response-shape change (H4).
