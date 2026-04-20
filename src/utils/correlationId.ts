/**
 * Correlation ID generation for outbound requests.
 *
 * Every client → server call should include an X-Correlation-Id header so
 * we can pivot from a Sentry event to the edge-function log line that
 * produced it, and from there to the DB row that got written.
 *
 * `telemetry.ts` already generates per-flow IDs (e.g. `oauth:abc123`) via
 * `generateCorrelationId(prefix)`. This module adds a small per-request ID
 * for callers that don't have a flow ID to hand — prefer the flow ID when
 * one is available.
 */

/** Short base36 timestamp + random suffix. Opaque; safe in headers/logs. */
export function newCorrelationId(prefix?: string): string {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 10);
  return prefix ? `${prefix}:${ts}-${rnd}` : `${ts}-${rnd}`;
}

/** Standard header name. Edge handler (`_shared/log.ts`) accepts this first. */
export const CORRELATION_ID_HEADER = "X-Correlation-Id";
