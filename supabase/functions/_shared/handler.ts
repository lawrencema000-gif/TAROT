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

    const correlationId = getOrCreateCorrelationId(req);
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
      const log = createLogger({
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
      let body: TBody = {} as TBody;
      if (req.method !== "GET" && req.method !== "HEAD") {
        try {
          const text = await req.text();
          body = (text ? JSON.parse(text) : {}) as TBody;
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
      };
      log.info("request.start");

      // ── AI gate (killswitch + per-user daily ceiling) ──
      if (opts.ai) {
        const aiOpts = typeof opts.ai === "object" ? opts.ai : {};
        const ceiling = aiOpts.ceiling ?? 200;

        // Killswitch — instant pause via dashboard, no redeploy.
        const { data: flag } = await supabase
          .from("feature_flags")
          .select("enabled")
          .eq("key", "ai-enabled")
          .maybeSingle();
        if (flag && flag.enabled === false) {
          return errorEnvelope({
            code: "AI_DISABLED",
            message: "AI is temporarily paused. Try again in a few minutes.",
            status: 503,
          }, cors, correlationId);
        }

        // Hard daily ceiling — only enforced for authenticated users.
        if (ctx.userId) {
          const { data: usageRow, error: usageErr } = await supabase.rpc(
            "ai_check_and_record_usage",
            { p_user_id: ctx.userId, p_ceiling: ceiling },
          );
          if (!usageErr) {
            const row = Array.isArray(usageRow) ? usageRow[0] : usageRow;
            if (row && row.allowed === false) {
              return errorEnvelope({
                code: "AI_DAILY_LIMIT",
                message: `You've reached today's AI limit (${row.ceiling}/day). It resets at midnight UTC.`,
                status: 429,
              }, cors, correlationId);
            }
          } else {
            // Fail-open on usage check errors — don't block legitimate users
            // because the ceiling table is briefly unreachable.
            log.warn("ai_gate.usage_check_failed", { err: usageErr.message });
          }
        }
      }

      const result = await opts.run(ctx, body);
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
        return errorEnvelope({
          code: err.code,
          message: err.message,
          status: err.status,
          details: err.details,
        }, cors, correlationId);
      }
      log.error("handler.unexpected", { err });
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

/** Timing-safe string comparison. Avoids short-circuit leak. */
function constantTimeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
