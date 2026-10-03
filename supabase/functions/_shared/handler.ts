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
   * When the body carries a UUID `requestId`, a client retry after a dropped
   * connection (same requestId, same body) is not charged twice and finds
   * the same cached result; a different body under the same id is charged
   * as a new request (see spendIdempotencyKey). `cost` defaults to 50.
   */
  spend?: { actionKey: string; cost?: number };
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
      const requestId = extractRequestId(body);
      if (requestId && requestId !== correlationId) {
        correlationId = requestId;
        baseLogCtx.correlationId = correlationId;
        log = createLogger({ ...baseLogCtx, userId: user?.id ?? null });
        log.info("request.correlation_from_body");
      }

      // ── Run user code ──
      const started = performance.now();
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
      // and BEFORE run. We refund below if run throws. Only authenticated
      // users are charged. The idempotency key is NOT the correlation id:
      // that comes from the client (X-Correlation-Id header or the body's
      // requestId), and a constant one would make every later debit a
      // "duplicate" — i.e. free. See spendIdempotencyKey().
      let spendIdem: string | null = null;
      if (opts.spend && ctx.userId) {
        spendIdem = await spendIdempotencyKey(supabase, {
          userId: ctx.userId,
          fn: opts.fn,
          actionKey: opts.spend.actionKey,
          requestId,
          body,
          log,
        });
        const { data: spendRows, error: spendErr } = await supabase.rpc(
          "spend_moonstones_for_action_srv",
          {
            p_user_id: ctx.userId,
            p_action_key: opts.spend.actionKey,
            p_cost: opts.spend.cost ?? 50,
            p_idempotency_key: spendIdem,
          },
        );
        if (spendErr) {
          // Fail-open on a transient spend error (mirrors the daily-ceiling
          // fail-open) — never block a paying user because the ledger is
          // briefly unreachable. Nothing to refund since the debit didn't land.
          log.error("spend.rpc_failed", { err: spendErr.message, actionKey: opts.spend.actionKey });
          spendIdem = null;
        } else {
          const row = Array.isArray(spendRows) ? spendRows[0] : spendRows;
          if (row && row.allowed === false) {
            spendIdem = null; // nothing was debited
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
          // allowed (incl. premium bypass) — keep spendIdem so a run failure
          // refunds the debit / clears the premium soft-cap log entry.
        }
      }

      let result: unknown;
      try {
        result = await opts.run(ctx, body);
      } catch (runErr) {
        // The AI (or any run-stage work) failed after we charged — refund so
        // the user isn't billed for a reading they never received.
        if (spendIdem && ctx.userId) {
          const { error: refundErr } = await supabase.rpc("refund_action_spend_srv", {
            p_user_id: ctx.userId,
            p_idempotency_key: spendIdem,
          });
          if (refundErr) {
            log.error("spend.refund_failed", { err: refundErr.message, spendIdem });
          } else {
            log.info("spend.refunded", { spendIdem });
          }
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `body.requestId` when it is a UUID; anything else is ignored, never used as a key. */
function extractRequestId(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const v = (body as Record<string, unknown>).requestId;
  return typeof v === "string" && UUID_RE.test(v) ? v.toLowerCase() : null;
}

/** JSON with object keys sorted, so the same request always hashes the same. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj).sort()
    .filter((k) => obj[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",")}}`;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * The key the Moonstone debit is idempotent on.
 *
 *  - No `requestId` → a fresh server-side UUID: every request is charged.
 *    (The client-supplied X-Correlation-Id is deliberately not used — a
 *    constant header would otherwise make every later debit a free
 *    "duplicate".)
 *  - `requestId` → requestId + a hash of (function, action, request body).
 *    A genuine retry (same id, same body) maps to the same key, so it is
 *    not charged twice and the function's response cache returns the same
 *    result. Re-using the id for a different request (another question,
 *    other cards) changes the hash, so that request is charged normally.
 *  - If an earlier attempt under that key was refunded (the run failed),
 *    the retry gets a fresh suffix and is charged again — otherwise the
 *    refunded debit would wave the retry through for free.
 */
async function spendIdempotencyKey(
  supabase: SupabaseClient,
  p: { userId: string; fn: string; actionKey: string; requestId: string | null; body: unknown; log: Logger },
): Promise<string> {
  if (!p.requestId) return crypto.randomUUID();
  const digest = await sha256Hex(`${p.fn}\n${p.actionKey}\n${stableStringify(p.body)}`);
  const base = `rq:${p.requestId}:${digest.slice(0, 32)}`;
  const { count, error } = await supabase
    .from("moonstone_transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", p.userId)
    .eq("kind", "refund")
    .like("reference", `${base}%`);
  if (error) {
    // Can't tell whether an earlier attempt was refunded — charge as a new
    // request rather than risk a free retry.
    p.log.warn("spend.refund_lookup_failed", { err: error.message });
    return crypto.randomUUID();
  }
  return count ? `${base}:${count}` : base;
}

/** Timing-safe string comparison. Avoids short-circuit leak. */
function constantTimeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
