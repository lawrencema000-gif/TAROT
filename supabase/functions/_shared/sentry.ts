/**
 * Edge-function Sentry capture via direct HTTP.
 *
 * Supabase edge functions run on Deno. The official `@sentry/deno` SDK is
 * heavy and not always compatible with the Supabase runtime, so we POST
 * straight to Sentry's store endpoint with a hand-rolled event envelope.
 *
 * Why bother:
 *   Without this, server-side errors (Gemini timeouts, DB constraint
 *   violations, malformed payloads) only land in Supabase function logs.
 *   Nobody reads those reactively. With Sentry capture, ops sees server
 *   errors in the same dashboard as client errors — single inbox.
 *
 * Auth is best-effort: if SENTRY_DSN env is missing we silently no-op so
 * a misconfiguration never breaks the function itself.
 */

interface SentryDsnParts {
  protocol: string;
  host: string;
  projectId: string;
  publicKey: string;
}

interface CaptureContext {
  fn: string;
  correlationId?: string;
  userId?: string | null;
  release?: string | null;
  level?: "error" | "warning" | "fatal";
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

function parseDsn(dsn: string): SentryDsnParts | null {
  // DSN format: https://<key>@<host>/<projectId>
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/^\//, "");
    const publicKey = url.username;
    if (!projectId || !publicKey) return null;
    return {
      protocol: url.protocol.replace(":", ""),
      host: url.host,
      projectId,
      publicKey,
    };
  } catch {
    return null;
  }
}

function makeEventId(): string {
  // Sentry expects a 32-char lowercase hex (UUID v4 without hyphens).
  const u = crypto.randomUUID().replace(/-/g, "");
  return u;
}

function frameFromStack(stack: string | undefined): Array<Record<string, unknown>> {
  if (!stack) return [];
  // Take up to 20 frames, skip the first line if it's the message.
  const lines = stack.split("\n").map((s) => s.trim());
  const startIdx = lines[0]?.startsWith("at ") ? 0 : 1;
  return lines
    .slice(startIdx, startIdx + 20)
    .filter((l) => l.startsWith("at "))
    .map((line) => {
      // Format examples:
      //   at functionName (file:///path/to/file.ts:LINE:COL)
      //   at file:///path/to/file.ts:LINE:COL
      const match = line.match(/at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?$/);
      if (!match) return { function: line.replace(/^at\s+/, "") };
      const [, fn, file, lineno, colno] = match;
      return {
        function: fn ?? "<anonymous>",
        filename: file,
        lineno: Number(lineno) || 0,
        colno: Number(colno) || 0,
        in_app: !file?.includes("node_modules") && !file?.includes("npm:"),
      };
    });
}

export function captureEdgeException(error: unknown, ctx: CaptureContext): void {
  const dsn = Deno.env.get("SENTRY_DSN");
  if (!dsn) return; // not configured — silently noop

  const parts = parseDsn(dsn);
  if (!parts) return;

  const err = error instanceof Error ? error : new Error(String(error));
  const event = {
    event_id: makeEventId(),
    timestamp: new Date().toISOString(),
    platform: "javascript",
    level: ctx.level ?? "error",
    logger: "edge-function",
    server_name: ctx.fn,
    environment: Deno.env.get("ENVIRONMENT") ?? "production",
    release: ctx.release ?? Deno.env.get("RELEASE_SHA") ?? "unknown",
    tags: {
      fn: ctx.fn,
      runtime: "deno",
      ...(ctx.tags ?? {}),
    },
    user: ctx.userId ? { id: ctx.userId } : undefined,
    contexts: {
      runtime: { name: "deno", version: Deno.version?.deno ?? "unknown" },
      trace: ctx.correlationId ? { trace_id: ctx.correlationId.slice(0, 32) } : undefined,
    },
    extra: {
      correlation_id: ctx.correlationId,
      ...(ctx.extra ?? {}),
    },
    exception: {
      values: [
        {
          type: err.name || "Error",
          value: err.message?.slice(0, 1000) || "Unknown error",
          stacktrace: { frames: frameFromStack(err.stack).reverse() },
        },
      ],
    },
  };

  // Fire-and-forget: don't await, don't block the request response.
  const url = `${parts.protocol}://${parts.host}/api/${parts.projectId}/store/`;
  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Sentry-Auth":
        `Sentry sentry_version=7, sentry_client=arcana-edge/1.0, sentry_key=${parts.publicKey}`,
    },
    body: JSON.stringify(event),
  }).catch(() => {
    // Sentry itself failed — there's nothing useful to do. Log to stderr
    // so we'd at least see it in `supabase functions logs`.
    console.warn("[sentry] capture failed");
  });
}
