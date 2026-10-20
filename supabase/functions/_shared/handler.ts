/**
 * Standard request handler for edge functions.
 *
 * Eliminates the ad-hoc auth / CORS / rate-limit / error-shape / logging
 * boilerplate that used to appear at the top of every function. A new
 * function is:
 *
 *   import { handler } from "../_shared/handler.ts";
 *   export default handler({
 *     fn: "my-feature",
 *     auth: "required",
 *     rateLimit: { max: 20, window: 60_000 },
 *     run: async (ctx, body) => {
 *       // ctx.log, ctx.userId, ctx.correlationId, ctx.supabase available
 *       return { ok: true };
 *     },
 *   });
 *
 * Phase 1 scope: everything EXCEPT zod validation. Schema/response zod plugs
 * in during Phase 2 via the same `handler()` shape.
 */

import { createClient, SupabaseClient, User } from "npm:@supabase/supabase-js@2.57.4";
import { z } from "npm:zod@3.24.1";
import { getCorsHeaders, handleCorsPreFlight } from "./cors.ts";
import { callerKey, checkRateLimit, rateLimitHeaders } from "./rate-limit.ts";
import { createLogger, getOrCreateCorrelationId, type Logger } from "./log.ts";
import { captureEdgeException } from "./sentry.ts";
import { AI_DEFAULT_CEILING, checkAiAccess } from "./ai-ceiling.ts";
import {
  chargedByThisCall,
  extractRequestId,
  isStoredResponse,
  replayStoreKey,
  requestKeyAfterRefunds,
  requestKeyBase,
  sessionKeyBase,
  sessionKeyFromLedger,
  type SpendLedgerRow,
  type StoredResponse,
} from "./spend-replay.ts";

type AuthMode = "required" | "optional" | "webhook";

export interface HandlerContext {
  /** Always present. */
  correlationId: string;
  /** The function name — used in logs + error envelopes. */
  fn: string;
  /** Authenticated user — null if auth is "optional" and no token, or "webhook". */
  user: User | null;
  /** Shorthand: user id if authed, else null. */
  userId: string | null;
  /** Structured logger bound to correlationId + userId + fn. */
  log: Logger;
  /**
   * Service-role supabase client — bypasses RLS. Use this for writes the
   * function itself owns (cache rows, ledger rows, etc). For user-scoped
   * reads, make the user-authenticated call via `ctx.userSupabase`.
   */
  supabase: SupabaseClient;
  /** User-scoped supabase client — subject to RLS. Null for "webhook" mode. */
  userSupabase: SupabaseClient | null;
  /** The raw request, in case a function needs headers we didn't lift. */
  req: Request;
  /**
   * The raw request body TEXT, exactly as received. The handler consumes
   * the request body once (for JSON parsing) before `run` is invoked, so
   * `ctx.req.clone()` THROWS inside `run` (the body is already used —
   * fetch-spec behavior). Functions that need the raw payload for HMAC
   * verification (stripe-webhook, revenuecat-webhook) MUST read this
   * instead of re-reading/cloning the request. Empty string for GET/HEAD.
   */
  rawBody: string;
  /**
   * The Moonstone spend of this request, when the function has `spend` and
   * the caller is signed in: `charged` — this call debited (or, for Premium,
   * took a soft-cap slot); `continuing` — a session request (see
   * `spend.session`) inside a session that was already paid for. Null
   * otherwise, and null when the spend RPC could not be reached.
   */
  spend: { charged: boolean; continuing: boolean } | null;
  /**
   * Give this request's charge back without failing the request — for a
   * function that serves something other than what was paid for (a
   * template reading when every AI provider failed). Refunds the debit (or
   * frees the Premium soft-cap slot) once; the response is then not stored
   * for replays, so a retry is a new, charged request. Resolves true when
   * something was given back.
   */
  waiveSpend: (reason: string) => Promise<boolean>;
}

export interface AppErrorShape {
  code: string;
  message: string;
  status: number;
  details?: Record<string, unknown>;
}

/**
 * Throw this from inside a `run` handler to return a clean, structured error
 * instead of a 500 stack trace. `code` is stable and machine-readable;
 * `message` is safe to show the user.
 */
export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, status = 400, details?: Record<string, unknown>) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export interface HandlerOptions<TBody, TResp> {
  /** Stable function name, lowercased kebab. Used for logs and error envelopes. */
  fn: string;
  /** `"required"` rejects with 401 if no valid session; `"optional"` passes
   *  null user through; `"webhook"` skips user JWT entirely. Default required. */
  auth?: AuthMode;
  /** Shared webhook secret (header `X-Webhook-Secret`) if auth="webhook". */
  webhookSecretEnv?: string;
  /** Allowed HTTP methods. Default ["POST"]. OPTIONS always allowed. */
  methods?: string[];
  /** If provided, enforces per-isolate rate limit. Keyed by userId or IP. */
  rateLimit?: { max: number; windowMs: number };
  /**
   * AI gate: when set (truthy), the handler applies the global AI killswitch
   * (`feature_flags.ai-enabled`) and a hard daily ceiling per user before
   * the `run` callback fires. Use `true` for default (200/day) or pass an
   * object to override. Per-function response caching stays at the function
   * level since cache keys differ across functions — see _shared/ai-gate.ts.
   */
  ai?: boolean | { ceiling?: number };
  /**
   * Server-authoritative Moonstone spend. When set, the handler debits the
   * user BEFORE `run` (after the AI killswitch/ceiling) and REFUNDS the debit
   * if `run` throws. This is what makes the economy tamper-proof: the client
   * can no longer self-refund a delivered reading because it never holds the
   * refund capability.
   *
   * Only authenticated users are charged — anonymous callers of optional-auth
   * functions pass through free (matching the daily-ceiling behaviour).
   * `cost` defaults to 50.
   *
   * Replays: when the body carries a UUID `requestId`, the debit is keyed on
   * (requestId, body). A repeat of that key — a retry after a dropped
   * connection, or a deliberate replay — is never charged, never runs `run`
   * again and never refunds: it gets the stored response of the first run
   * (waiting up to ~20 s while that run is in flight), else 409
   * REQUEST_IN_FLIGHT / REQUEST_ALREADY_USED. A different body under the
   * same id is a new, charged request. See _shared/spend-replay.ts.
   *
   * Sessions: with `session`, one charge covers every request whose
   * `session.key(body)` is the same, for `ttlHours` (default 24). Requests
   * after the first run free (still under the AI daily ceiling); a failed
   * free request refunds nothing. `key` returning null means "no session":
   * the request is charged on its own.
   */
  spend?: {
    actionKey: string;
    cost?: number;
    session?: { key: (body: TBody) => string | null; ttlHours?: number };
  };
  /**
   * Zod schema for the request body. When set, the body is parsed + validated
   * before `run` is called. Invalid bodies return 400 INVALID_REQUEST with
   * the field-level issues under error.details.
   *
   * Optional in Phase 1/2 to let unmigrated functions keep running; new
   * functions SHOULD provide one.
   */
  requestSchema?: z.ZodType<TBody>;
  /**
   * Zod schema for the response body. When set AND `run` returns a plain
   * object (not a Response), the object is validated before being returned
   * to the client. Mismatches throw an INTERNAL 500 (the client would've
   * failed anyway — fail loudly server-side too).
   */
  responseSchema?: z.ZodType<TResp>;
  /** The business logic. Return plain JSON (wrapped in `{data}` automatically)
   *  or throw `AppError`. */
  run: (ctx: HandlerContext, body: TBody) => Promise<TResp | Response | unknown>;
}

/** Factory: returns a `Deno.serve`-compatible request handler. */
export function handler<TBody = unknown, TResp = unknown>(opts: HandlerOptions<TBody, TResp>) {
  const authMode: AuthMode = opts.auth ?? "required";
  const allowedMethods = opts.methods ?? ["POST"];

  return async (req: Request): Promise<Response> => {
    // ── CORS preflight ──
    if (req.method === "OPTIONS") return handleCorsPreFlight(req);

    let correlationId = getOrCreateCorrelationId(req);
    const cors = getCorsHeaders(req);
    const pathname = (() => {
      try { return new URL(req.url).pathname; } catch { return ""; }
    })();
    const baseLogCtx = {
      fn: opts.fn,
      correlationId,
      method: req.method,
      path: pathname,
    };

    try {
      // ── Method check ──
      if (!allowedMethods.includes(req.method)) {
        return errorEnvelope({
          code: "METHOD_NOT_ALLOWED",
          message: `Method ${req.method} not allowed`,
          status: 405,
        }, cors, correlationId);
      }

      // ── Auth ──
      let user: User | null = null;
      let userSupabase: SupabaseClient | null = null;

      if (authMode === "webhook") {
        const expected = opts.webhookSecretEnv ? Deno.env.get(opts.webhookSecretEnv) : "";
        const provided = req.headers.get("X-Webhook-Secret") ||
          req.headers.get("x-webhook-secret") ||
          req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ||
          "";
        if (!expected || !constantTimeEq(expected, provided)) {
          return errorEnvelope({
            code: "UNAUTHORIZED",
            message: "Invalid webhook signature",
            status: 401,
          }, cors, correlationId);
        }
      } else {
        // required or optional — try to resolve user
        const authHeader = req.headers.get("Authorization");
        if (authHeader?.startsWith("Bearer ")) {
          const token = authHeader.slice(7);
          const anonClient = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_ANON_KEY")!,
            { global: { headers: { Authorization: `Bearer ${token}` } } },
          );
          const { data, error } = await anonClient.auth.getUser(token);
          if (!error && data?.user) {
            user = data.user;
            userSupabase = anonClient;
          }
        }
        if (authMode === "required" && !user) {
          return errorEnvelope({
            code: "UNAUTHORIZED",
            message: "Authentication required",
            status: 401,
          }, cors, correlationId);
        }
      }

      // ── Service-role client for function-owned writes ──
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { persistSession: false } },
      );

      // ── Logger with full context ──
      let log = createLogger({
        ...baseLogCtx,
        userId: user?.id ?? null,
      });

      // ── Rate limit ──
      if (opts.rateLimit) {
        const rl = checkRateLimit(
          callerKey(req, user?.id ?? null),
          opts.rateLimit.max,
          opts.rateLimit.windowMs,
        );
        if (!rl.allowed) {
          log.warn("rate_limit.exceeded", { max: opts.rateLimit.max, windowMs: opts.rateLimit.windowMs });
          return new Response(
            JSON.stringify({
              error: { code: "RATE_LIMITED", message: "Too many requests", correlationId },
            }),
            {
              status: 429,
              headers: {
                ...cors,
                ...rateLimitHeaders(rl),
                "Content-Type": "application/json",
                "X-Correlation-Id": correlationId,
              },
            },
          );
        }
      }

      // ── Body parse + optional schema validation ──
      // NOTE: this consumes the Request body. After this point,
      // `req.clone()` THROWS ("Body is unusable", per fetch spec).
      // Functions needing the raw payload (webhook HMAC verification)
      // must read ctx.rawBody — set below from this single read.
      let body: TBody = {} as TBody;
      let rawBody = "";
      if (req.method !== "GET" && req.method !== "HEAD") {
        try {
          rawBody = await req.text();
          body = (rawBody ? JSON.parse(rawBody) : {}) as TBody;
        } catch {
          return errorEnvelope({
            code: "INVALID_JSON",
            message: "Request body is not valid JSON",
            status: 400,
          }, cors, correlationId);
        }
      }
      // Read the request id BEFORE the schema: a zod object strips keys it
      // does not list, and a function that forgot `requestId` in its schema
      // would otherwise treat every retry as a new, charged request.
      const requestId = extractRequestId(body);
      if (opts.requestSchema) {
        const parsed = opts.requestSchema.safeParse(body);
        if (!parsed.success) {
          return errorEnvelope({
            code: "INVALID_REQUEST",
            message: "Request body failed validation",
            status: 400,
            details: {
              issues: parsed.error.issues.map((i) => ({
                path: i.path.join("."),
                message: i.message,
                code: i.code,
              })),
            },
          }, cors, correlationId);
        }
        body = parsed.data as TBody;
      }

      // ── Client request id → correlation id ──
      // A client that retries after a dropped connection sends the same
      // `requestId` (uuid). It becomes the correlation id so the logs of
      // both attempts are found together, and it feeds the spend
      // idempotency key below (bound to the body, never used alone).
      // Anything that is not a UUID is ignored.
      if (requestId && requestId !== correlationId) {
        correlationId = requestId;
        baseLogCtx.correlationId = correlationId;
        log = createLogger({ ...baseLogCtx, userId: user?.id ?? null });
        log.info("request.correlation_from_body");
      }

      // ── Run user code ──
      const started = performance.now();
      // Spend state, filled in by the spend block below. `refundKey` is the
      // key a failure (or a waiver) refunds — set only when THIS call
      // charged; `replayKey` is where this run's response is stored for
      // replays of the same request.
      let refundKey: string | null = null;
      let replayKey: string | null = null;
      let waived = false;
      // The claim on this request's key; released when the charge is given
      // back, so a retry of the same request runs (and is charged) again.
      let activeClaim: Claim | null = null;
      const refundSpend = async (key: string, why: string): Promise<boolean> => {
        const { data, error: refundErr } = await supabase.rpc("refund_action_spend_srv", {
          p_user_id: user!.id,
          p_idempotency_key: key,
        });
        if (refundErr) {
          log.error("spend.refund_failed", { err: refundErr.message, key, why });
          return false;
        }
        const row = Array.isArray(data) ? data[0] : data;
        log.info("spend.refunded", { key, why, refunded: row?.refunded ?? null });
        return row?.refunded !== false;
      };
      const ctx: HandlerContext = {
        correlationId,
        fn: opts.fn,
        user,
        userId: user?.id ?? null,
        log,
        supabase,
        userSupabase,
        req,
        rawBody,
        spend: null,
        waiveSpend: async (reason: string) => {
          if (!refundKey || waived) return false;
          waived = true;
          replayKey = null;
          const refunded = await refundSpend(refundKey, `waived:${reason}`);
          if (activeClaim) await releaseClaim(supabase, activeClaim);
          return refunded;
        },
      };
      log.info("request.start");

      // ── AI gate (killswitch + per-user daily ceiling) ──
      // One implementation, shared with functions that gate themselves via
      // ai-gate.ts — see _shared/ai-ceiling.ts.
      if (opts.ai) {
        const aiOpts = typeof opts.ai === "object" ? opts.ai : {};
        const access = await checkAiAccess(supabase, log, ctx.userId, aiOpts.ceiling ?? AI_DEFAULT_CEILING);
        if (access.allowed === false) {
          return errorEnvelope({
            code: access.reason,
            message: access.message,
            status: access.status,
          }, cors, correlationId);
        }
      }

      // ── Server-authoritative Moonstone spend ──
      // Debit AFTER the AI gate (don't charge if AI is paused/over-ceiling)
      // and BEFORE run. We refund below if run throws — but only a debit
      // THIS call made. The idempotency key is NOT the correlation id: that
      // comes from the client (X-Correlation-Id header or the body's
      // requestId), and a constant one would make every later debit a
      // "duplicate" — i.e. free. See planSpendKey().
      if (opts.spend && ctx.userId) {
        const sessionScope = opts.spend.session ? opts.spend.session.key(body) : null;
        const plan = await planSpendKey(supabase, {
          userId: ctx.userId,
          fn: opts.fn,
          actionKey: opts.spend.actionKey,
          requestId,
          body,
          sessionScope,
          sessionTtlMs: (opts.spend.session?.ttlHours ?? 24) * 3_600_000,
          log,
        });
        // A request key is CLAIMED before it is charged: the first call to
        // insert the claim runs; a concurrent or later call with the same key
        // is a replay and never reaches the model (closes the race the
        // ledger read in planSpendKey cannot, also before 20261003000011).
        let claim: Claim | null = null;
        if (plan.mode === "request") {
          claim = await claimRequest(supabase, log, ctx.userId, plan.key, opts.fn);
          if (claim.state === "taken") {
            log.info("spend.replay_claimed", { key: plan.key });
            return await replayResponse(supabase, log, {
              userId: ctx.userId,
              key: plan.key,
              chargedAt: plan.chargedAt ?? claim.claimedAt,
              cors,
              correlationId,
            });
          }
        }
        const { data: spendRows, error: spendErr } = await supabase.rpc(
          "spend_moonstones_for_action_srv",
          {
            p_user_id: ctx.userId,
            p_action_key: opts.spend.actionKey,
            p_cost: opts.spend.cost ?? 50,
            p_idempotency_key: plan.key,
          },
        );
        if (spendErr) {
          // Fail-open on a transient spend error (mirrors the daily-ceiling
          // fail-open) — never block a paying user because the ledger is
          // briefly unreachable. Nothing to refund since the debit didn't land.
          log.error("spend.rpc_failed", { err: spendErr.message, actionKey: opts.spend.actionKey });
          if (claim) await releaseClaim(supabase, claim);
        } else {
          const row = (Array.isArray(spendRows) ? spendRows[0] : spendRows) as Record<string, unknown> | null;
          if (row && row.allowed === false) {
            // Nothing was charged: let a retry of this request run.
            if (claim) await releaseClaim(supabase, claim);
            if (row.soft_cap_reached) {
              return errorEnvelope({
                code: "AI_SOFT_CAP",
                message: "You've reached today's AI limit. It resets in a few hours.",
                status: 429,
                details: { resetAt: row.reset_at ?? null },
              }, cors, correlationId);
            }
            return errorEnvelope({
              code: "INSUFFICIENT_BALANCE",
              message: "You don't have enough Moonstones for this reading.",
              status: 402,
              details: { balance: row.new_balance ?? null },
            }, cors, correlationId);
          }
          const charged = chargedByThisCall(row, plan.preexisting);
          if (!charged && plan.mode === "request") {
            // A replay of a request that was already charged: the stored
            // response of the first run, never a second run, never a refund.
            log.info("spend.replay", { key: plan.key });
            return await replayResponse(supabase, log, {
              userId: ctx.userId,
              key: plan.key,
              chargedAt: plan.chargedAt,
              cors,
              correlationId,
            });
          }
          ctx.spend = { charged, continuing: !charged && plan.mode === "session" };
          if (charged) {
            refundKey = plan.key;
            activeClaim = claim;
            if (plan.mode === "request") replayKey = await replayStoreKey(ctx.userId, plan.key);
          }
          if (!charged) log.info("spend.session_continues", { key: plan.key });
        }
      }

      let result: unknown;
      try {
        result = await opts.run(ctx, body);
      } catch (runErr) {
        // The AI (or any run-stage work) failed after we charged — refund so
        // the user isn't billed for a reading they never received.
        if (refundKey && !waived) {
          await refundSpend(refundKey, "run_failed");
          if (activeClaim) await releaseClaim(supabase, activeClaim);
        }
        throw runErr;
      }
      const durationMs = Math.round(performance.now() - started);
      log.info("request.end", { durationMs, status: 200 });

      // If the handler returned a full Response, pass through after tagging
      // the correlation ID + CORS headers. Without re-applying CORS here,
      // functions that hand back a pre-built Response (astrology-daily,
      // astrology-weekly, astrology-get-chart etc.) end up with responses
      // missing Access-Control-Allow-Origin, and the browser blocks the
      // payload even though the preflight succeeded.
      if (result instanceof Response) {
        if (replayKey && result.ok) {
          await storeReplay(supabase, log, opts.fn, replayKey, {
            kind: "raw",
            status: result.status,
            contentType: result.headers.get("Content-Type") ?? "application/json",
            body: await result.clone().text(),
          });
        }
        for (const [k, v] of Object.entries(cors)) {
          if (!result.headers.has(k)) result.headers.set(k, v);
        }
        result.headers.set("X-Correlation-Id", correlationId);
        return result;
      }

      // Optional response-shape validation. Catches server-side drift:
      // if a handler starts returning a new shape without updating its
      // schema, we log + fail loudly rather than silently leaking.
      if (opts.responseSchema) {
        const parsed = opts.responseSchema.safeParse(result);
        if (!parsed.success) {
          log.error("handler.response_shape_mismatch", {
            issues: parsed.error.issues.map((i) => ({
              path: i.path.join("."),
              message: i.message,
            })),
          });
          return errorEnvelope({
            code: "INTERNAL",
            message: "Internal server error",
            status: 500,
          }, cors, correlationId);
        }
      }

      if (replayKey) {
        await storeReplay(supabase, log, opts.fn, replayKey, { kind: "data", value: result ?? null });
      }

      // Otherwise wrap in {data} envelope. Callers that want a different
      // shape (edge cases, partial responses) can return a Response directly.
      return new Response(
        JSON.stringify({ data: result, correlationId }),
        {
          status: 200,
          headers: {
            ...cors,
            "Content-Type": "application/json",
            "X-Correlation-Id": correlationId,
          },
        },
      );
    } catch (err) {
      // AppError → structured envelope; anything else → 500.
      const log = createLogger({ ...baseLogCtx, userId: null });
      if (err instanceof AppError) {
        log.warn("handler.app_error", { code: err.code, status: err.status, details: err.details });
        // Only forward AppErrors with status >= 500 to Sentry — 4xx
        // AppErrors are intentional client-input rejections, not bugs.
        if (err.status >= 500) {
          captureEdgeException(err, {
            fn: opts.fn,
            correlationId,
            level: "error",
            tags: { app_error_code: err.code },
            extra: { status: err.status, details: err.details },
          });
        }
        return errorEnvelope({
          code: err.code,
          message: err.message,
          status: err.status,
          details: err.details,
        }, cors, correlationId);
      }
      log.error("handler.unexpected", { err });
      // Unexpected throws are always real bugs — capture every one.
      captureEdgeException(err, {
        fn: opts.fn,
        correlationId,
        level: "fatal",
      });
      return errorEnvelope({
        code: "INTERNAL",
        message: "Internal server error",
        status: 500,
      }, cors, correlationId);
    }
  };
}

function errorEnvelope(e: AppErrorShape, cors: Record<string, string>, correlationId: string): Response {
  const body: Record<string, unknown> = {
    error: {
      code: e.code,
      message: e.message,
      correlationId,
    },
  };
  if (e.details) (body.error as Record<string, unknown>).details = e.details;
  return new Response(JSON.stringify(body), {
    status: e.status,
    headers: {
      ...cors,
      "Content-Type": "application/json",
      "X-Correlation-Id": correlationId,
    },
  });
}

/** How long a replay waits for the first run of its request to finish. */
const REPLAY_WAIT_MS = 20_000;
const REPLAY_POLL_MS = 1_000;
/** A charge older than this has finished (or died); a replay does not wait for it. */
const REPLAY_IN_FLIGHT_MS = 5 * 60_000;
/** How long a response is kept for replays of its request. */
const REPLAY_TTL_DAYS = 2;

interface SpendPlan {
  /** The idempotency key the debit is made under. */
  key: string;
  /** request — keyed on (requestId, body); session — `spend.session`; single — a fresh key, never a duplicate. */
  mode: "request" | "session" | "single";
  /** The ledger already held a charge under `key` before this call. */
  preexisting: boolean;
  /** When that charge was made (ISO), if known. */
  chargedAt: string | null;
}

/**
 * The key the Moonstone debit is idempotent on (see _shared/spend-replay.ts).
 *
 *  - A session scope → the live session's key (continuing) or the next one.
 *  - A `requestId` → `rq:<requestId>:<body digest>`, with `:n` after n
 *    refunded attempts (a refunded attempt delivered nothing, so the retry
 *    is a new, charged request).
 *  - Neither → a fresh server-side UUID: every request is charged. (The
 *    client-supplied X-Correlation-Id is deliberately not used — a constant
 *    header would otherwise make every later debit a free "duplicate".)
 *
 * If the ledger cannot be read, the request is charged under a fresh key
 * rather than risk a free one.
 */
async function planSpendKey(
  supabase: SupabaseClient,
  p: {
    userId: string;
    fn: string;
    actionKey: string;
    requestId: string | null;
    body: unknown;
    sessionScope: string | null;
    sessionTtlMs: number;
    log: Logger;
  },
): Promise<SpendPlan> {
  const fresh: SpendPlan = { key: crypto.randomUUID(), mode: "single", preexisting: false, chargedAt: null };
  let base: string;
  let mode: "request" | "session";
  if (p.sessionScope) {
    base = sessionKeyBase(p.fn, p.sessionScope);
    mode = "session";
  } else if (p.requestId) {
    base = await requestKeyBase(p.requestId, p.fn, p.actionKey, p.body);
    mode = "request";
  } else {
    return fresh;
  }

  const rows = await readSpendLedger(supabase, p.userId, base, p.log);
  if (!rows) return fresh;

  if (mode === "session") {
    const { key, continuing } = sessionKeyFromLedger(base, rows, Date.now(), p.sessionTtlMs);
    const charge = rows.find((r) => r.key === key && r.kind === "charge");
    return { key, mode, preexisting: continuing, chargedAt: charge?.at ?? null };
  }

  const refunds = new Set(rows.filter((r) => r.kind === "refund").map((r) => r.key)).size;
  const key = requestKeyAfterRefunds(base, refunds);
  const charge = rows.find((r) => r.key === key && r.kind === "charge");
  const refunded = rows.some((r) => r.key === key && r.kind === "refund");
  return { key, mode, preexisting: !!charge && !refunded, chargedAt: charge?.at ?? null };
}

/** Every charge and refund under `base` (and its `:n` retries) for this user, or null if unreadable. */
async function readSpendLedger(
  supabase: SupabaseClient,
  userId: string,
  base: string,
  log: Logger,
): Promise<SpendLedgerRow[] | null> {
  const [tx, premium] = await Promise.all([
    supabase
      .from("moonstone_transactions")
      .select("reference, kind, created_at")
      .eq("user_id", userId)
      .in("kind", ["pay-per-action", "refund"])
      .like("reference", `${base}%`)
      .limit(200),
    supabase
      .from("premium_action_log")
      .select("idempotency_key, performed_at")
      .eq("user_id", userId)
      .like("idempotency_key", `${base}%`)
      .limit(200),
  ]);
  if (tx.error || premium.error) {
    log.warn("spend.ledger_lookup_failed", { err: (tx.error ?? premium.error)?.message });
    return null;
  }
  const rows: SpendLedgerRow[] = [];
  for (const r of (tx.data ?? []) as Array<{ reference: string; kind: string; created_at: string }>) {
    rows.push({ key: r.reference, kind: r.kind === "refund" ? "refund" : "charge", at: r.created_at });
  }
  for (const r of (premium.data ?? []) as Array<{ idempotency_key: string; performed_at: string }>) {
    rows.push({ key: r.idempotency_key, kind: "charge", at: r.performed_at });
  }
  return rows;
}

interface Claim {
  state: "claimed" | "taken" | "unknown";
  claimKey: string;
  /** When the existing claim was made (ISO), for a taken one. */
  claimedAt: string | null;
}

/**
 * Claim a request key: one row in ai_response_cache, whose primary key makes
 * the insert succeed for exactly one caller. "unknown" (the table could not
 * be written) falls back to the ledger read — never blocks the request.
 */
async function claimRequest(
  supabase: SupabaseClient,
  log: Logger,
  userId: string,
  key: string,
  fn: string,
): Promise<Claim> {
  const claimKey = `spend-claim:${(await replayStoreKey(userId, key)).slice("spend-replay:".length)}`;
  const { error } = await supabase.from("ai_response_cache").insert({
    cache_key: claimKey,
    model: "spend-claim",
    function_name: fn,
    response: {},
    expires_at: new Date(Date.now() + REPLAY_TTL_DAYS * 86_400_000).toISOString(),
  });
  if (!error) return { state: "claimed", claimKey, claimedAt: null };
  if (error.code === "23505") {
    const { data } = await supabase.from("ai_response_cache").select("created_at").eq("cache_key", claimKey).maybeSingle();
    return { state: "taken", claimKey, claimedAt: (data?.created_at as string | undefined) ?? null };
  }
  log.warn("spend.claim_failed", { err: error.message });
  return { state: "unknown", claimKey, claimedAt: null };
}

async function releaseClaim(supabase: SupabaseClient, claim: Claim): Promise<void> {
  if (claim.state !== "claimed") return;
  await supabase.from("ai_response_cache").delete().eq("cache_key", claim.claimKey);
}

async function storeReplay(
  supabase: SupabaseClient,
  log: Logger,
  fn: string,
  replayKey: string,
  stored: StoredResponse,
): Promise<void> {
  const { error } = await supabase.rpc("ai_cache_set", {
    p_cache_key: replayKey,
    p_model: "spend-replay",
    p_function_name: fn,
    p_response: stored,
    p_ttl_days: REPLAY_TTL_DAYS,
  });
  if (error) log.warn("spend.replay_store_failed", { err: error.message });
}

/**
 * The answer to a replayed request: the first run's stored response, after
 * waiting for it while that run may still be in flight; otherwise 409.
 */
async function replayResponse(
  supabase: SupabaseClient,
  log: Logger,
  p: { userId: string; key: string; chargedAt: string | null; cors: Record<string, string>; correlationId: string },
): Promise<Response> {
  const storeKey = await replayStoreKey(p.userId, p.key);
  const chargedAgo = p.chargedAt ? Date.now() - Date.parse(p.chargedAt) : 0;
  const mayBeInFlight = !(chargedAgo > REPLAY_IN_FLIGHT_MS);
  const deadline = Date.now() + (mayBeInFlight ? REPLAY_WAIT_MS : 0);
  for (;;) {
    const { data, error } = await supabase.rpc("ai_cache_get", { p_cache_key: storeKey });
    if (!error && isStoredResponse(data)) {
      log.info("spend.replay_served", { kind: data.kind });
      const headers = {
        ...p.cors,
        "X-Correlation-Id": p.correlationId,
        "X-Spend-Replay": "1",
      };
      if (data.kind === "raw") {
        return new Response(data.body, { status: data.status, headers: { ...headers, "Content-Type": data.contentType } });
      }
      return new Response(
        JSON.stringify({ data: data.value, correlationId: p.correlationId, replayed: true }),
        { status: 200, headers: { ...headers, "Content-Type": "application/json" } },
      );
    }
    if (Date.now() + REPLAY_POLL_MS > deadline) break;
    await new Promise((r) => setTimeout(r, REPLAY_POLL_MS));
  }
  log.warn("spend.replay_unavailable", { mayBeInFlight });
  return errorEnvelope(
    mayBeInFlight
      ? {
        code: "REQUEST_IN_FLIGHT",
        message: "This request is still being worked on. Try again in a few seconds.",
        status: 409,
        details: { retryAfterMs: 3_000 },
      }
      : {
        code: "REQUEST_ALREADY_USED",
        message: "This request was already answered. Start a new one.",
        status: 409,
      },
    p.cors,
    p.correlationId,
  );
}

/** Timing-safe string comparison. Avoids short-circuit leak. */
function constantTimeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
