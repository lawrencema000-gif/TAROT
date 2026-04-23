/**
 * Typed edge-function client with zod validation and correlation-ID
 * propagation. Replaces ad-hoc `supabase.functions.invoke(...)` + bespoke
 * retry logic scattered across `useAstrology.ts` and `services/adConfig.ts`.
 *
 * Why this layer:
 *   - Response shape drift is detected at the call site (see API audit C3:
 *     DailyContent was missing moonSignLocalized client-side, silently ignored).
 *   - Every request carries an X-Correlation-Id the edge handler logs, so
 *     Sentry events can pivot to the exact edge-function log line.
 *   - One place to refresh sessions on 401 instead of duplicating the dance
 *     in every caller.
 *
 * Usage:
 *   const daily = await apiCall({
 *     fn: 'astrology-daily',
 *     body: { date, locale: getLocale() },
 *     request: DailyRequest,  // validates outgoing payload
 *     response: DailyResponse, // validates incoming body
 *   });
 *   // daily: z.infer<typeof DailyResponse> — fully typed
 */

import { z } from 'zod';
import { supabase } from './supabase';
import { newCorrelationId, CORRELATION_ID_HEADER } from '../utils/correlationId';
import { captureException } from '../utils/telemetry';
import { ErrorEnvelope } from '../schema';

const API_BASE = import.meta.env.VITE_SUPABASE_URL + '/functions/v1';
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Error thrown when the server returned a structured error envelope. */
export class ApiError extends Error {
  readonly code: string;
  readonly correlationId: string;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, status: number, correlationId: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.correlationId = correlationId;
    this.status = status;
    this.details = details;
  }
}

/** Error thrown when the server's response fails zod validation. Indicates
 *  client/server drift that should be investigated. */
export class ApiContractError extends Error {
  readonly fn: string;
  readonly issues: z.ZodIssue[];
  readonly correlationId: string | null;

  constructor(fn: string, issues: z.ZodIssue[], correlationId: string | null) {
    super(`Response from ${fn} did not match expected schema (${issues.length} issue(s))`);
    this.name = 'ApiContractError';
    this.fn = fn;
    this.issues = issues;
    this.correlationId = correlationId;
  }
}

export interface ApiCallOptions<TReq, TRes> {
  /** Edge function name (no leading slash). */
  fn: string;
  /** Request body (optional for GET-style calls). */
  body?: TReq;
  /** Schema for the request body. Validated BEFORE sending so bad client
   *  payloads fail fast with readable errors. */
  request?: z.ZodType<TReq>;
  /** Schema for the response body. Validated AFTER receipt; contract
   *  mismatches throw ApiContractError. */
  response: z.ZodType<TRes>;
  /** Whether authentication is required. Default true. When false, the
   *  call proceeds without a bearer token (for pre-sign-in endpoints). */
  requireAuth?: boolean;
  /** Timeout in ms. Default 30s — Gemini-backed endpoints can take 10–20s
   *  server-side, which leaves little budget for slow 3G round-trips under
   *  the old 15s default. */
  timeoutMs?: number;
  /** Override correlation ID (otherwise auto-generated). */
  correlationId?: string;
}

export interface ApiCallResult<TRes> {
  data: TRes;
  correlationId: string;
  durationMs: number;
}

/**
 * Core fetch + parse. Returns the validated data + correlation ID. Throws
 * `ApiError` for 4xx/5xx with a structured envelope, and `ApiContractError`
 * if the response doesn't match `options.response`.
 */
export async function apiCall<TReq, TRes>(options: ApiCallOptions<TReq, TRes>): Promise<ApiCallResult<TRes>> {
  const {
    fn,
    body,
    request,
    response,
    requireAuth = true,
    timeoutMs = 30_000,
    correlationId = newCorrelationId(fn),
  } = options;

  // Validate outgoing payload. Catches "I passed the wrong shape" bugs
  // before we hit the network.
  if (request && body !== undefined) {
    const parsed = request.safeParse(body);
    if (!parsed.success) {
      throw new Error(
        `apiCall(${fn}): request body failed validation — ${parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
      );
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': ANON_KEY,
    [CORRELATION_ID_HEADER]: correlationId,
  };

  if (requireAuth) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new ApiError(
        'NO_SESSION',
        'You must be signed in to perform this action.',
        401,
        correlationId,
      );
    }
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();

  try {
    let res = await fetch(`${API_BASE}/${fn}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body ?? {}),
      signal: controller.signal,
    });

    // One-shot session refresh on 401 for authed calls (covers expired
    // access tokens that Supabase refreshed in the background).
    if (res.status === 401 && requireAuth) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      if (refreshed.session?.access_token) {
        headers['Authorization'] = `Bearer ${refreshed.session.access_token}`;
        res = await fetch(`${API_BASE}/${fn}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body ?? {}),
          signal: controller.signal,
        });
      }
    }

    const respCorrelationId = res.headers.get(CORRELATION_ID_HEADER) ?? correlationId;
    const text = await res.text();

    if (!res.ok) {
      // Try to parse the structured error envelope. Fall back to a raw error
      // if the server returned an unstructured body (e.g. from a pre-handler
      // function that hasn't been migrated yet).
      const envelope = safeJson(text);
      const parsed = ErrorEnvelope.safeParse(envelope);
      if (parsed.success) {
        throw new ApiError(
          parsed.data.error.code,
          parsed.data.error.message,
          res.status,
          parsed.data.error.correlationId,
          parsed.data.error.details,
        );
      }
      const rawError = (envelope && typeof envelope === 'object' && 'error' in envelope)
        ? (envelope as { error: unknown }).error
        : undefined;
      throw new ApiError(
        `HTTP_${res.status}`,
        typeof rawError === 'string' ? rawError : (text || 'Request failed'),
        res.status,
        respCorrelationId,
      );
    }

    const parsed = response.safeParse(safeJson(text));
    if (!parsed.success) {
      captureException(`apiClient.contractMismatch.${fn}`, new Error('response schema mismatch'), {
        fn,
        correlationId: respCorrelationId,
        issues: parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '),
      });
      throw new ApiContractError(fn, parsed.error.issues, respCorrelationId);
    }

    return {
      data: parsed.data,
      correlationId: respCorrelationId,
      durationMs: Math.round(performance.now() - started),
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError(
        'TIMEOUT',
        `Request to ${fn} timed out after ${timeoutMs}ms.`,
        504,
        correlationId,
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function safeJson(text: string): unknown {
  try { return text ? JSON.parse(text) : null; } catch { return null; }
}
