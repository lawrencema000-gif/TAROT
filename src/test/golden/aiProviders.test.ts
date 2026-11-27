// @vitest-environment node
// (node: the server modules below import npm: specifiers, which only the node transform lets vi.mock answer)
/**
 * WP-P5-07 (health-status-07): the OpenAI fallback after OpenAI shuts down
 * gpt-5 and gpt-5-mini on 2026-12-11, the request body each model gets, and
 * a price for every model the app can call.
 *
 * Goldens come from OpenAI's deprecations, pricing and GPT-6 migration pages
 * (read 2026-11-14/15) and the plan's own computation
 * (p12/plan/scratch/p507/costs.mjs), not from the app's code.
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

vi.mock('npm:@anthropic-ai/sdk@1.12.0', async () => ({ default: (await import('./fakeAnthropicSdk')).FakeAnthropic }));
vi.mock('../../../supabase/functions/_shared/handler.ts', () => ({
  AppError: class AppError extends Error {
    constructor(public code: string, message: string, public status = 500) {
      super(message);
    }
  },
}));

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
interface Providers {
  OPENAI_GPT5_SUNSET_UTC: number;
  OPENAI_POST_SUNSET_MODELS: readonly string[];
  OPENAI_IMAGE_MODELS: string[];
  GEMINI_MODELS: string[];
  openAIModels: (now?: number) => string[];
  isReasoningModel: (model: string) => boolean;
  reasoningEffortFor: (model: string) => string;
  completionBudgetFor: (model: string, maxTokens: number) => number;
  openAIRequestBody: (
    model: string,
    system: string,
    history: ChatMessage[],
    temperature: number,
    maxTokens: number,
    jsonMode: boolean,
  ) => Record<string, unknown>;
}
interface Usage {
  COST_PER_1K_TOKENS: Record<string, { input: number; output: number }>;
  GEMINI_38_FLASH_PRICE_RISE_UTC: number;
  estimateCost: (model: string, promptTokens: number, completionTokens: number, now?: number) => number;
}

// Loaded at run time: the app's tsc must not follow these modules' npm: imports.
const PROVIDERS = '../../../supabase/functions/_shared/ai-providers.ts';
const USAGE = '../../../supabase/functions/_shared/ai-usage.ts';
const ai = (await import(/* @vite-ignore */ PROVIDERS)) as Providers;
const usage = (await import(/* @vite-ignore */ USAGE)) as Usage;

/** D38 (answers.md): readings A, the OpenAI fallback behind Claude from 2026-12-11. */
const EXPECTED_POST_SUNSET = ['gpt-6.1-terra', 'gpt-6.1-sol'];
/** D38 images C: gpt-image-2.6-flare first, gpt-image-2.5-flare second (gpt-image-2 shuts down 2027-02-10). */
const EXPECTED_IMAGE_MODELS = ['gpt-image-2.6-flare', 'gpt-image-2.5-flare'];

describe('openAIModels around the gpt-5 sunset (2026-12-11T00:00Z)', () => {
  const before = ai.openAIModels(Date.UTC(2026, 11, 10, 23, 59, 59));
  const after = ai.openAIModels(Date.UTC(2026, 11, 11));

  it('keeps gpt-5 first until the sunset, with the successor as the third rung', () => {
    expect(ai.OPENAI_GPT5_SUNSET_UTC).toBe(Date.UTC(2026, 11, 11));
    expect(before).toEqual(['gpt-5', 'gpt-5-mini', EXPECTED_POST_SUNSET[0]]);
  });

  it('switches to the D38 pair at the sunset, with no dead id', () => {
    expect(after).toEqual(EXPECTED_POST_SUNSET);
    expect([...ai.OPENAI_POST_SUNSET_MODELS]).toEqual(EXPECTED_POST_SUNSET);
    expect(after).not.toContain('gpt-5');
    expect(after).not.toContain('gpt-5-mini');
  });

  it('hands out a copy, so a caller cannot change the constant', () => {
    after.push('x');
    expect(ai.openAIModels(Date.UTC(2026, 11, 11))).toEqual(EXPECTED_POST_SUNSET);
  });
});

describe('image chain', () => {
  it('follows D38 images', () => {
    expect(ai.OPENAI_IMAGE_MODELS).toEqual(EXPECTED_IMAGE_MODELS);
  });
});

describe('prices (cents per 1K tokens)', () => {
  it('has a price for every model the app can call', () => {
    const ids = new Set([
      ...ai.openAIModels(Date.UTC(2026, 11, 10)),
      ...ai.openAIModels(Date.UTC(2026, 11, 11)),
      ...ai.OPENAI_IMAGE_MODELS,
      ...ai.GEMINI_MODELS,
      'gpt-6.1-sol',
      'gpt-6.1-terra',
      'gpt-6-luna',
      'gpt-5.6-sol',
      'gpt-5.6-terra',
      'gpt-4o-mini',
      'gpt-image-2.6-flare',
      'gpt-image-2.6-sunburst',
    ]);
    for (const id of ids) expect(usage.estimateCost(id, 1000, 1000), id).toBeGreaterThan(0);
  });

  it('prices the named replacements from the pricing page', () => {
    expect(usage.estimateCost('gpt-6.1-terra', 1000, 1000)).toBeCloseTo(0.6, 4);
    expect(usage.estimateCost('gpt-6.1-sol', 1000, 1000)).toBeCloseTo(1.2, 4);
    expect(usage.estimateCost('gpt-6-luna', 1000, 1000)).toBeCloseTo(0.06, 4);
    expect(usage.estimateCost('gpt-image-2.6-flare', 1000, 1000)).toBeCloseTo(3.5, 4);
    expect(usage.estimateCost('gpt-image-2.6-sunburst', 1000, 1000)).toBeCloseTo(3.5, 4);
  });

  it('gives the 30-day ledger sample (18,039 in / 13,992 out) the plan\'s costs', () => {
    expect(usage.estimateCost('gpt-5', 18039, 13992)).toBeCloseTo(16.2469, 4);
    expect(usage.estimateCost('gpt-6.1-terra', 18039, 13992)).toBeCloseTo(8.7999, 4);
    expect(usage.estimateCost('gpt-6.1-sol', 18039, 13992)).toBeCloseTo(17.5998, 4);
    expect(usage.estimateCost('gpt-5.6-terra', 18039, 13992)).toBeCloseTo(20.3982, 4);
    expect(usage.estimateCost('gpt-5.6-sol', 18039, 13992)).toBeCloseTo(35.1996, 4);
  });

  it('a date-suffixed gpt-6.1 id is priced as its base id', () => {
    expect(usage.estimateCost('gpt-6.1-terra-2026-11-01', 1000, 1000)).toBeCloseTo(0.6, 4);
  });

  it('doubles gemini-3.8-flash from 2027-01-01T00:00Z (FWP-12)', () => {
    expect(usage.GEMINI_38_FLASH_PRICE_RISE_UTC).toBe(Date.UTC(2027, 0, 1));
    // $0.75 / $3.75 per 1M through 2026-12-31, then $1.50 / $7.50.
    expect(usage.estimateCost('gemini-3.8-flash', 1000, 1000, Date.UTC(2026, 11, 31, 23, 59))).toBeCloseTo(0.45, 4);
    expect(usage.estimateCost('gemini-3.8-flash', 1000, 1000, Date.UTC(2027, 0, 1))).toBeCloseTo(0.9, 4);
    // Other models do not change on that date.
    expect(usage.estimateCost('gpt-5', 1000, 1000, Date.UTC(2027, 0, 1))).toBeCloseTo(1.125, 4);
  });

  it('an unknown model still costs 0 (the ledger keeps its tokens)', () => {
    expect(usage.estimateCost('no-such-model', 1000, 1000)).toBe(0);
  });
});

describe('reasoning models', () => {
  it.each(['gpt-5', 'gpt-5-mini', 'gpt-5.6-terra', 'gpt-6.1-sol', 'gpt-6.1-terra', 'gpt-6-luna', 'o3'])(
    '%s is a reasoning model',
    (m) => expect(ai.isReasoningModel(m)).toBe(true),
  );
  it.each(['gpt-4o-mini', 'gemini-3.8-flash', 'gpt-image-2.6-flare'])('%s is not', (m) =>
    expect(ai.isReasoningModel(m)).toBe(false),
  );

  it('sends the lowest effort each model accepts (GPT-6 migration guide)', () => {
    for (const m of ['gpt-5', 'gpt-5-mini', 'gpt-5-2025-08-07']) expect(ai.reasoningEffortFor(m), m).toBe('minimal');
    for (const m of ['gpt-5.6-terra', 'gpt-5.6-sol', 'gpt-6.1-terra', 'gpt-6-luna'])
      expect(ai.reasoningEffortFor(m), m).toBe('none');
    // gpt-6.1-sol and gpt-6-astra do not support "none".
    expect(ai.reasoningEffortFor('gpt-6.1-sol')).toBe('low');
    expect(ai.reasoningEffortFor('gpt-6.1-sol-2026-11-01')).toBe('low');
    expect(ai.reasoningEffortFor('gpt-6-astra')).toBe('low');
  });
});

describe('openAIRequestBody', () => {
  const history: ChatMessage[] = [{ role: 'user', content: 'U' }];
  const messages = [
    { role: 'system', content: 'S' },
    { role: 'user', content: 'U' },
  ];

  it.each([
    ['gpt-6.1-sol', 3000, 'low'],
    ['gpt-6.1-terra', 1600, 'none'],
    ['gpt-5', 1600, 'minimal'],
  ])('%s: budget %i, effort %s, json mode, no temperature', (model, budget, effort) => {
    const body = ai.openAIRequestBody(model, 'S', history, 0.7, 800, true);
    expect(body.model).toBe(model);
    expect(body.messages).toEqual(messages);
    expect(body.max_completion_tokens).toBe(budget);
    expect(body.reasoning_effort).toBe(effort);
    expect(body.response_format).toEqual({ type: 'json_object' });
    expect(body).not.toHaveProperty('temperature');
  });

  it('gpt-4o-mini: temperature, the budget as asked, no reasoning_effort or response_format', () => {
    const body = ai.openAIRequestBody('gpt-4o-mini', 'S', history, 0.7, 800, false);
    expect(body.messages).toEqual(messages);
    expect(body.max_completion_tokens).toBe(800);
    expect(body.temperature).toBe(0.7);
    expect(body).not.toHaveProperty('reasoning_effort');
    expect(body).not.toHaveProperty('response_format');
  });

  it('keeps the old padding for "minimal"/"none" and gives "low" more headroom', () => {
    expect(ai.completionBudgetFor('gpt-5', 400)).toBe(1500);
    expect(ai.completionBudgetFor('gpt-6.1-terra', 1250)).toBe(2500);
    expect(ai.completionBudgetFor('gpt-6.1-sol', 400)).toBe(3000);
    expect(ai.completionBudgetFor('gpt-6.1-sol', 1250)).toBe(3750);
    expect(ai.completionBudgetFor('gpt-4o-mini', 400)).toBe(400);
  });
});

describe('ai-providers.ts header', () => {
  const src = readFileSync(
    fileURLToPath(new URL('../../../supabase/functions/_shared/ai-providers.ts', import.meta.url)),
    'utf8',
  );

  it('no longer names gpt-5.6-sol as gpt-5\'s replacement, and names gpt-6.1-sol', () => {
    expect(src).not.toContain('gpt-5 -> gpt-5.6-sol');
    expect(src).not.toContain('gpt-5 → gpt-5.6-sol');
    expect(src).toContain('gpt-6.1-sol');
  });

  it('keeps Claude first in runChain', () => {
    const chain = src.slice(src.indexOf('async function runChain'));
    expect(chain.indexOf('callClaude(')).toBeGreaterThan(0);
    expect(chain.indexOf('callClaude(')).toBeLessThan(chain.indexOf('openAIModels()'));
  });
});
