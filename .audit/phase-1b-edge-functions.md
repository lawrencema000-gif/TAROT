# Phase 1B — Edge Function Audit

**Scope:** 31 functions at `supabase/functions/*/index.ts`
**Verdict:** 🔴 Two functions are **broken at runtime**. Multiple others lack input validation. Webhook signature handling is correct.

---

## Structural summary

| Pattern | Count | Functions |
|---|---|---|
| `Deno.serve(handler({opts}))` (current, opts-object) | 29 | astrology-*, ad-events, ad-config, blog-webhook, create-checkout-session, create-portal-session, generate-reading, revenuecat-webhook, send-welcome-email, stripe-webhook + all newer ones via `export default handler({...})` |
| `Deno.serve(handler(async (req, { user }) => ...))` (**BROKEN**) | 2 | `account-delete`, `account-export` |

Both broken-pattern functions pass a callback as if `handler()` were a higher-order middleware. The current `handler()` in `_shared/handler.ts` expects a `HandlerOptions` object:

```ts
// _shared/handler.ts:114
export function handler<TBody, TResp>(opts: HandlerOptions<TBody, TResp>) {
  const authMode: AuthMode = opts.auth ?? "required";  // opts is a function → undefined → falls back to "required"
  ...
  return async (req: Request) => {
    ...
    const result = await opts.run(ctx, body);  // opts.run is undefined → TypeError
```

So `account-delete` and `account-export` will throw `TypeError: opts.run is not a function` at runtime. Confirming: the GDPR export and Apple-required account deletion — the two compliance features we shipped in Session A — are currently dead code.

---

## Findings

### F1 🔴 P0 — `account-delete` and `account-export` are broken at runtime
**Files:** [account-delete/index.ts](../supabase/functions/account-delete/index.ts), [account-export/index.ts](../supabase/functions/account-export/index.ts)

**Symptom:** runtime TypeError — `opts.run is not a function`, emitted before any user code runs.

**Impact:**
- GDPR data export request from Settings → 500
- Apple-compliance account deletion request from Settings → 500
- This is a **legal compliance failure** for Apple App Store (required since iOS 14.5) and EU GDPR Article 17/20

**Fix:** rewrite both on the current handler pattern with an explicit `run` function, Zod schema, rate limit, and auth: "required".

### F2 🔴 P0 — No rate limit or schema on `account-delete` / `account-export`
Even once they're fixed structurally, both functions currently ship with:
- No `rateLimit` → a spammer can fire 1000 delete requests per second
- No `requestSchema` → no input validation (deletion takes no body, export takes none either, so the surface is limited, but still wrong)

These functions talk to `auth.admin.deleteUser()` via service-role. They MUST have tight limits.

**Fix:** add `rateLimit: { max: 3, windowMs: 60 * 60_000 }` (3/hour — nobody should need more) and an empty/strict Zod schema.

### F3 🟡 P1 — Several older functions lack Zod schemas
Functions that do manual validation instead of declarative `requestSchema`:
- `astrology-compute-natal` — takes birth date / time / lat / lon / timezone. Manual validation inside.
- `astrology-daily`, `astrology-monthly`, `astrology-weekly`, `astrology-transit-calendar`, `astrology-get-chart`, `astrology-geocode` — same
- `generate-reading` — the most complex input of all (draw, spread, context, persona) and no schema
- `ad-events` — 100-event batch input, hand-rolled type guards
- `create-checkout-session`, `create-portal-session` — billing inputs without schema
- `send-welcome-email` — takes email payloads without schema

**Risk:** not critical in itself, but drift is likely. Any future schema change can leak through without a single source of truth.

**Fix priority:** `generate-reading` and `create-checkout-session` first (highest user-facing impact).

### F4 🟡 P1 — `astrology-compute-natal` lacks rate limiting in audit, but has `max: 10, windowMs: 60_000`
On second look, rate limit is present. No issue.

### F5 🟢 OK — Webhook signature verification
- `stripe-webhook`: explicit `stripe.webhooks.constructEvent` with `STRIPE_WEBHOOK_SECRET` — correct
- `revenuecat-webhook`: `webhookSecretEnv: "REVENUECAT_WEBHOOK_SECRET"` via handler — correct
- `blog-webhook`: `webhookSecretEnv: "BLOG_WEBHOOK_SECRET"` — correct

All three use constant-time comparison via the handler's built-in `constantTimeEq`.

### F6 🟢 OK — Error messages don't leak secrets
Grepped for `console.log`/`log.info` patterns with `apiKey` / `SECRET` / `Bearer` — no matches. The `error.message` patterns that do exist are logged via `ctx.log.error` which routes to structured telemetry, not a user-visible surface.

### F7 🟡 P2 — `stripe-webhook` is 360 LOC of nested switch cases
Long-term maintainability issue. The `checkout.session.completed` case now forks into 3 paths (report / subscription / lifetime). Any new purchase_type adds more branches.

**Fix:** split into per-event handlers. Not urgent — works today.

### F8 🟢 OK — CORS is handled centrally
All new handlers rely on `_shared/handler.ts` which handles preflight + CORS headers uniformly. Nothing leaks.

### F9 🟢 OK — Rate limits are reasonable
Spot-checked:
- `advisor-cashout`: 3 per hour — appropriate (money movement)
- `ai-*`: 20-30 per minute — matches client-side gating
- `astrology-current-positions`: 60/min — OK since cachable
- `create-report-checkout`: 10 per 10 minutes — tight, good for a paid flow
- Webhooks: 300/min — plenty for event bursts

---

## Recommended fixes (Phase 2C)

### Priority: rewrite `account-delete` and `account-export` on current handler pattern

```ts
// account-delete (new pattern)
import { handler, AppError } from "../_shared/handler.ts";
import { z } from "npm:zod@3.24.1";

const RequestSchema = z.object({}).strict();
type Req = z.infer<typeof RequestSchema>;

export default handler<Req, { deleted: true }>({
  fn: "account-delete",
  auth: "required",
  methods: ["POST"],
  rateLimit: { max: 3, windowMs: 60 * 60_000 },
  requestSchema: RequestSchema,
  run: async (ctx) => {
    // existing body, but using ctx.supabase (already service-role) + ctx.userId
    ...
    return { deleted: true };
  },
});
```

Same pattern for `account-export`, but with a strict empty schema and the response shape it already returns.

### Priority 2: add Zod schemas to older functions over time (not P0)

- Start with `generate-reading` (most complex input, user-visible errors)
- Then `astrology-compute-natal` (birth data — bad input produces bad chart forever)
- Then `create-checkout-session` and `create-portal-session` (billing surface)
- The astrology-* read-only endpoints are lower priority since they take simple numeric dates

---

## Summary for Phase 2 priority

| ID | Priority | Blocks Play release? | Effort |
|----|----------|----------------------|--------|
| F1 | P0 | NO (reports 500; but app's Settings UI thinks deletion worked — legal + Apple risk) | S |
| F2 | P0 | NO, same caveat | XS (bundled with F1) |
| F3 | P1 | No | M (spread across ~10 functions) |
| F7 | P2 | No | M |

**Recommendation:** Phase 2C must rewrite `account-delete` + `account-export` (F1 + F2 bundle) before we claim GDPR/Apple compliance. Others are nice-to-haves over the next few releases.
