/**
 * Stand-in for `npm:@anthropic-ai/sdk@1.12.0` in the golden tests that load an
 * edge function through vitest: vitest resolves `npm:` specifiers only through
 * vi.mock, and the web app does not depend on the SDK.
 *
 *   vi.mock('npm:@anthropic-ai/sdk@1.12.0', async () =>
 *     ({ default: (await import('./fakeAnthropicSdk')).FakeAnthropic }));
 *
 * Claude is asked first only when ANTHROPIC_API_KEY is in the test's fake Deno
 * env (supabase/functions/_shared/anthropic.ts); without it the fake is never
 * called. With it, `fakeClaude.create` decides the reply and `fakeClaude.calls`
 * keeps every request. The error classes carry the fields anthropic.ts reads
 * (status, type, errorCode) and the subclasses it tells apart.
 */

type Params = Record<string, unknown>;

class APIError extends Error {
  readonly status: number | undefined;
  readonly type: string | null;
  readonly errorCode: string | null;

  constructor(status: number | undefined, type: string | null = null, errorCode: string | null = null) {
    super(`${status ?? ''} ${type ?? 'error'}`.trim());
    this.status = status;
    this.type = type;
    this.errorCode = errorCode;
  }
}
class AuthenticationError extends APIError {}
class PermissionDeniedError extends APIError {}
class APIUserAbortError extends APIError {
  constructor() {
    super(undefined);
  }
}
class APIConnectionError extends APIError {
  constructor() {
    super(undefined);
  }
}
class APIConnectionTimeoutError extends APIConnectionError {}

const noReply = async (): Promise<unknown> => {
  throw new Error('fake Claude: no reply configured for this test');
};

export const fakeClaude = {
  create: noReply as (params: Params) => Promise<unknown>,
  calls: [] as Params[],
  reset(): void {
    this.create = noReply;
    this.calls.length = 0;
  },
};

/** A Messages API reply, shaped as anthropic.ts reads it. */
export function claudeReply(text: string, stopReason = 'end_turn'): unknown {
  return {
    model: 'claude-opus-5-5',
    stop_reason: stopReason,
    stop_details: null,
    content: [{ type: 'text', text }],
    usage: { input_tokens: 50, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 90 },
  };
}

export class FakeAnthropic {
  static APIError = APIError;
  static AuthenticationError = AuthenticationError;
  static PermissionDeniedError = PermissionDeniedError;
  static APIUserAbortError = APIUserAbortError;
  static APIConnectionError = APIConnectionError;
  static APIConnectionTimeoutError = APIConnectionTimeoutError;

  readonly beta = {
    messages: {
      create: (params: Params): Promise<unknown> => {
        fakeClaude.calls.push(params);
        return fakeClaude.create(params);
      },
    },
  };
}
