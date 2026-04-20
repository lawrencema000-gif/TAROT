/**
 * Structured JSON logger for edge functions.
 *
 * One line per event, emitted to stdout (picked up by Supabase's log sink).
 * Every line includes a correlation ID + function name + level + any custom
 * fields, so you can pivot from a Sentry event → edge function log → DB row.
 *
 * Why not use a library? Supabase Edge (Deno) bundles are size-sensitive and
 * the logger surface we need is small enough to keep as plain code.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  /** Correlation ID propagated from the client's X-Correlation-Id header. */
  correlationId: string;
  /** Authenticated user id when available. */
  userId?: string | null;
  /** The edge function name, e.g. "astrology-daily". */
  fn: string;
  /** Request method (GET/POST/...). */
  method?: string;
  /** Request URL path only (no query — may contain secrets). */
  path?: string;
}

export interface Logger {
  debug(msg: string, fields?: Record<string, unknown>): void;
  info(msg: string, fields?: Record<string, unknown>): void;
  warn(msg: string, fields?: Record<string, unknown>): void;
  error(msg: string, fields?: Record<string, unknown>): void;
  /** Return a child logger that inherits context + merges extra fields. */
  child(extra: Record<string, unknown>): Logger;
}

function emit(
  level: LogLevel,
  ctx: LogContext,
  extra: Record<string, unknown>,
  msg: string,
  fields?: Record<string, unknown>
): void {
  const line: Record<string, unknown> = {
    t: new Date().toISOString(),
    level,
    msg,
    fn: ctx.fn,
    correlationId: ctx.correlationId,
    userId: ctx.userId ?? undefined,
    method: ctx.method,
    path: ctx.path,
    ...extra,
    ...(fields ?? {}),
  };
  // Strip undefined so the log lines stay tidy.
  for (const k of Object.keys(line)) if (line[k] === undefined) delete line[k];
  // Error objects don't JSON-stringify well by default — unwrap them.
  if (line.err instanceof Error) {
    const e = line.err as Error;
    line.err = {
      name: e.name,
      message: e.message,
      stack: e.stack?.split("\n").slice(0, 6).join("\n"),
    };
  }
  const serialized = JSON.stringify(line);
  // Route to the correct console method so Supabase's log UI tags severity.
  if (level === "error") console.error(serialized);
  else if (level === "warn") console.warn(serialized);
  else console.log(serialized);
}

export function createLogger(ctx: LogContext, base: Record<string, unknown> = {}): Logger {
  return {
    debug: (msg, fields) => emit("debug", ctx, base, msg, fields),
    info: (msg, fields) => emit("info", ctx, base, msg, fields),
    warn: (msg, fields) => emit("warn", ctx, base, msg, fields),
    error: (msg, fields) => emit("error", ctx, base, msg, fields),
    child: (extra) => createLogger(ctx, { ...base, ...extra }),
  };
}

/** Extract or mint a correlation ID for the request. Preferred header is
 * `X-Correlation-Id`; we also accept `traceparent` if it's already there. */
export function getOrCreateCorrelationId(req: Request): string {
  const fromHeader =
    req.headers.get("X-Correlation-Id") ||
    req.headers.get("x-correlation-id") ||
    req.headers.get("traceparent");
  if (fromHeader && /^[\w.:\-]{6,128}$/.test(fromHeader)) return fromHeader;
  // `crypto.randomUUID` is available in Deno runtime.
  return crypto.randomUUID();
}
