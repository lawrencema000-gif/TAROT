// Deno tests for the Claude-first provider (./anthropic.ts) and its place at
// the head of the shared AI chain (./ai-providers.ts).
//
// Run from the repo root:
//   npx -y deno@2.9.6 test --allow-env --allow-net --allow-read supabase/functions/_shared/anthropic.test.ts
//
// No real API is called: Claude is a fake client and OpenAI is a stubbed
// fetch. vitest, eslint and tsc never see this file (they cover src/ only).

import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import Anthropic from "npm:@anthropic-ai/sdk@1.12.0";
import {
  __setClaudeClientForTests,
  callClaude,
  CLAUDE_MODEL,
  claudeAvailable,
  claudeMaxTokens,
} from "./anthropic.ts";
import { callAIJson, callAIText } from "./ai-providers.ts";

type Params = Record<string, unknown>;
type Opts = Record<string, unknown> | undefined;

interface FakeCall {
  params: Params;
  opts: Opts;
}

/** A client whose beta.messages.create runs `impl` and records every call. */
function fakeClient(impl: (params: Params) => unknown) {
  const calls: FakeCall[] = [];
  const client = {
    beta: {
      messages: {
        create: (params: Params, opts?: Record<string, unknown>) => {
          calls.push({ params, opts });
          return Promise.resolve().then(() => impl(params));
        },
      },
    },
  };
  return { client: client as unknown as Anthropic, calls };
}

function reply(text: string, stop_reason = "end_turn", model = CLAUDE_MODEL) {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model,
    stop_reason,
    stop_details: stop_reason === "refusal" ? { category: "cyber" } : null,
    content: text ? [{ type: "text", text }] : [],
    usage: {
      input_tokens: 100,
      cache_creation_input_tokens: 20,
      cache_read_input_tokens: 5,
      output_tokens: 40,
    },
  };
}

/** An SDK error exactly as the SDK builds it from an HTTP response. */
function apiError(status: number, type: string, errorCode?: string) {
  const body = {
    type: "error",
    error: { type, message: `${type} (test)`, ...(errorCode ? { details: { error_code: errorCode } } : {}) },
  };
  return Anthropic.APIError.generate(status, body, undefined, new Headers());
}

function withKeys(keys: { anthropic?: string; openai?: string; gemini?: string }) {
  const set = (name: string, value?: string) => (value ? Deno.env.set(name, value) : Deno.env.delete(name));
  set("ANTHROPIC_API_KEY", keys.anthropic);
  set("OPENAI_API_KEY", keys.openai);
  set("GEMINI_API_KEY", keys.gemini);
}

const realFetch = globalThis.fetch;

/** Stub fetch with an OpenAI chat completion that says `text`; records the URLs it was called with. */
function stubOpenAI(text: string): string[] {
  const urls: string[] = [];
  globalThis.fetch = ((input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    urls.push(url);
    return Promise.resolve(
      new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
  }) as typeof fetch;
  return urls;
}

function restore() {
  globalThis.fetch = realFetch;
  __setClaudeClientForTests(null);
}

const USER = [{ role: "user" as const, content: "Draw me one card." }];

// ─── callClaude ──────────────────────────────────────────────────────────

Deno.test("callClaude: success returns the text, the model and summed usage", async () => {
  withKeys({ anthropic: "test-key" });
  const { client, calls } = fakeClient(() => reply("The Star: hope returns."));
  __setClaudeClientForTests(client);
  try {
    const r = await callClaude({ system: "You are a tarot reader.", messages: USER, maxOutputTokens: 600 });
    assert(r.ok);
    assertEquals(r.text, "The Star: hope returns.");
    assertEquals(r.model, CLAUDE_MODEL);
    assertEquals(r.inputTokens, 125); // input + cache writes + cache reads
    assertEquals(r.outputTokens, 40);

    assertEquals(calls.length, 1);
    const p = calls[0].params;
    assertEquals(p.model, "claude-opus-5-5");
    assertEquals(p.max_tokens, claudeMaxTokens(600));
    assertEquals(p.system, "You are a tarot reader.");
    assertEquals(p.output_config, { effort: "low" });
    assertEquals(p.fallbacks, "default");
    assertEquals(p.betas, ["server-side-fallback-2026-07-01"]);
    assertEquals(p.cache_control, { type: "ephemeral" });
    assert(!("temperature" in p), "this model rejects temperature");
    assertEquals(calls[0].opts?.timeout, 45_000);
    assert(calls[0].opts?.signal instanceof AbortSignal, "an overall deadline bounds retries too");
  } finally {
    restore();
  }
});

Deno.test("callClaude: JSON mode adds the one-object rule; effort and timeout pass through", async () => {
  withKeys({ anthropic: "test-key" });
  const { client, calls } = fakeClient(() => reply('{"a":1}'));
  __setClaudeClientForTests(client);
  try {
    const r = await callClaude({
      system: "Return JSON.",
      messages: USER,
      maxOutputTokens: 5000,
      json: true,
      effort: "medium",
      timeoutMs: 120_000,
    });
    assert(r.ok);
    assertStringIncludes(String(calls[0].params.system), "Reply with one JSON object only");
    assertEquals(calls[0].params.output_config, { effort: "medium" });
    assertEquals(calls[0].params.max_tokens, 15_000);
    assertEquals(calls[0].opts?.timeout, 120_000);
  } finally {
    restore();
  }
});

Deno.test("claudeMaxTokens: pads for thinking, with a floor and a ceiling", () => {
  assertEquals(claudeMaxTokens(100), 2048);
  assertEquals(claudeMaxTokens(1024), 3072);
  assertEquals(claudeMaxTokens(4500), 13_500);
  assertEquals(claudeMaxTokens(9000), 16_000);
});

Deno.test("callClaude: no key configured → fails without calling the API", async () => {
  withKeys({});
  const { client, calls } = fakeClient(() => reply("never"));
  __setClaudeClientForTests(client);
  try {
    const r = await callClaude({ system: "s", messages: USER, maxOutputTokens: 100 });
    assert(!r.ok);
    assertEquals(r.paused, false);
    assertEquals(calls.length, 0);
    assertEquals(claudeAvailable(), false);
  } finally {
    restore();
  }
});

for (
  const [name, err] of [
    ["out of credit (402 billing_error)", () => apiError(402, "billing_error")],
    ["monthly spend cap (429 enforced_spend_limit_reached)", () =>
      apiError(429, "rate_limit_error", "enforced_spend_limit_reached")],
    ["revoked key (401)", () => apiError(401, "authentication_error")],
    ["key not permitted (403)", () => apiError(403, "permission_error")],
  ] as const
) {
  Deno.test(`callClaude: ${name} → fails AND pauses Claude so later calls skip it`, async () => {
    withKeys({ anthropic: "test-key" });
    const { client, calls } = fakeClient(() => {
      throw err();
    });
    __setClaudeClientForTests(client);
    try {
      const r = await callClaude({ system: "s", messages: USER, maxOutputTokens: 100 });
      assert(!r.ok);
      assertEquals(r.paused, true);
      assertEquals(claudeAvailable(), false);

      const again = await callClaude({ system: "s", messages: USER, maxOutputTokens: 100 });
      assert(!again.ok);
      assertEquals(again.paused, true);
      assertEquals(calls.length, 1, "the paused call must not reach the API");

      // The pause lifts by itself (CLAUDE_PAUSE_MS = 10 minutes).
      assertEquals(claudeAvailable(Date.now() + 11 * 60_000), true);
    } finally {
      restore();
    }
  });
}

for (
  const [name, err] of [
    ["plain rate limit (429)", () => apiError(429, "rate_limit_error")],
    ["overloaded (529)", () => apiError(529, "overloaded_error")],
    ["server error (500)", () => apiError(500, "api_error")],
    ["timeout", () => new Anthropic.APIConnectionTimeoutError()],
    ["overall deadline reached", () => new Anthropic.APIUserAbortError()],
    ["network error", () => new Anthropic.APIConnectionError({ message: "socket hang up" })],
    ["anything else", () => new Error("boom")],
  ] as const
) {
  Deno.test(`callClaude: ${name} → fails WITHOUT pausing (the next call tries Claude again)`, async () => {
    withKeys({ anthropic: "test-key" });
    const { client, calls } = fakeClient(() => {
      throw err();
    });
    __setClaudeClientForTests(client);
    try {
      const r = await callClaude({ system: "s", messages: USER, maxOutputTokens: 100 });
      assert(!r.ok);
      assertEquals(r.paused, false);
      assertEquals(claudeAvailable(), true);
      await callClaude({ system: "s", messages: USER, maxOutputTokens: 100 });
      assertEquals(calls.length, 2);
    } finally {
      restore();
    }
  });
}

for (
  const [name, response, reason] of [
    ["refusal", reply("", "refusal"), "refused"],
    ["cut off at max_tokens", reply("The Tower means", "max_tokens"), "max_tokens"],
    ["empty reply", reply("", "end_turn"), "empty reply"],
  ] as const
) {
  Deno.test(`callClaude: ${name} → a failure, so the chain moves on`, async () => {
    withKeys({ anthropic: "test-key" });
    const { client } = fakeClient(() => response);
    __setClaudeClientForTests(client);
    try {
      const r = await callClaude({ system: "s", messages: USER, maxOutputTokens: 100 });
      assert(!r.ok);
      assertStringIncludes(r.reason, reason);
      assertEquals(r.paused, false);
    } finally {
      restore();
    }
  });
}

Deno.test("callClaude: the deadline aborts a hung call and reports a timeout", async () => {
  withKeys({ anthropic: "test-key" });
  // A create() that only settles when its abort signal fires, as the SDK does.
  const client = {
    beta: {
      messages: {
        create: (_p: Params, opts?: { signal?: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            opts?.signal?.addEventListener("abort", () => reject(new Anthropic.APIUserAbortError()), { once: true });
          }),
      },
    },
  } as unknown as Anthropic;
  __setClaudeClientForTests(client);
  try {
    const started = Date.now();
    const r = await callClaude({ system: "s", messages: USER, maxOutputTokens: 100, timeoutMs: 50 });
    assert(!r.ok);
    assertStringIncludes(r.reason, "timeout");
    assertEquals(r.paused, false);
    assert(Date.now() - started < 2_000);
  } finally {
    restore();
  }
});

// ─── The shared chain: Claude first, then OpenAI ─────────────────────────

Deno.test("callAIText: Claude answers → OpenAI is never called", async () => {
  withKeys({ anthropic: "test-key", openai: "test-openai" });
  const { client } = fakeClient(() => reply("Claude's reading."));
  __setClaudeClientForTests(client);
  const urls = stubOpenAI("OpenAI's reading.");
  try {
    const text = await callAIText({ system: "s", history: USER });
    assertEquals(text, "Claude's reading.");
    assertEquals(urls.length, 0);
  } finally {
    restore();
  }
});

Deno.test("callAIText: Claude out of credit → OpenAI serves the call", async () => {
  withKeys({ anthropic: "test-key", openai: "test-openai" });
  const { client } = fakeClient(() => {
    throw apiError(402, "billing_error");
  });
  __setClaudeClientForTests(client);
  const urls = stubOpenAI("OpenAI's reading.");
  try {
    const text = await callAIText({ system: "s", history: USER });
    assertEquals(text, "OpenAI's reading.");
    assertEquals(urls.length, 1);
    assertStringIncludes(urls[0], "api.openai.com");
  } finally {
    restore();
  }
});

Deno.test("callAIText: only the Claude key set, Claude fails → AI_FAILED (no silent empty reply)", async () => {
  withKeys({ anthropic: "test-key" });
  const { client } = fakeClient(() => {
    throw apiError(529, "overloaded_error");
  });
  __setClaudeClientForTests(client);
  try {
    let code = "";
    try {
      await callAIText({ system: "s", history: USER });
    } catch (e) {
      code = (e as { code?: string }).code ?? String(e);
    }
    assertEquals(code, "AI_FAILED");
  } finally {
    restore();
  }
});

Deno.test("callAIJson: Claude's valid JSON is parsed and returned", async () => {
  withKeys({ anthropic: "test-key", openai: "test-openai" });
  const { client } = fakeClient(() => reply('{"card":"The Sun","meaning":"joy"}'));
  __setClaudeClientForTests(client);
  const urls = stubOpenAI('{"card":"wrong"}');
  try {
    const out = await callAIJson<{ card: string; meaning: string }>({ system: "s", userPrompt: "u" });
    assertEquals(out, { card: "The Sun", meaning: "joy" });
    assertEquals(urls.length, 0);
  } finally {
    restore();
  }
});

Deno.test("callAIJson: Claude's reply is not JSON → OpenAI's JSON is used instead", async () => {
  withKeys({ anthropic: "test-key", openai: "test-openai" });
  const { client } = fakeClient(() => reply("Here is your reading: the Sun!"));
  __setClaudeClientForTests(client);
  const urls = stubOpenAI('{"card":"The Sun"}');
  try {
    const out = await callAIJson<{ card: string }>({ system: "s", userPrompt: "u" });
    assertEquals(out, { card: "The Sun" });
    assertEquals(urls.length, 1);
  } finally {
    restore();
  }
});
