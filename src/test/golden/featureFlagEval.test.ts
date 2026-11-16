// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { evalContextFor, evaluate, overridesAllowed, userBucket, type EvalContext } from '../../utils/featureFlagEval';
import type { FeatureFlag } from '../../dal/featureFlags';

/*
 * social-ai-02: `?ff_<key>=on|off` overrides are for the dev server and the
 * VITE_AUDIT_SMOKE builds only. A production build never parses them:
 * evalContextFor() hands evaluate() overrides only when overridesAllowed().
 * evaluate() itself is unchanged, so dev and smoke builds behave as before.
 *
 * The bucket goldens are the numbers the SQL mirror
 * (public.feature_bucket in *_advisor_surfaces_follow_the_flag.sql) must give
 * too, so that the server and the UI agree on a partial rollout. They were
 * computed independently (Python, and a recursive-CTE FNV-1a on the
 * production database, read-only).
 */

const flag = (
  key: string,
  enabled: boolean,
  rolloutPercent: number,
  allowedUserIds: string[] = [],
): FeatureFlag => ({
  key,
  description: null,
  enabled,
  rolloutPercent,
  allowedUserIds,
  updatedAt: '2026-11-15T00:00:00.000Z',
});

const SEARCH = '?ff_advisors=on&ff_cartomancy=off';

describe('overridesAllowed: which builds honour ?ff_', () => {
  it('a production build does not', () => {
    expect(overridesAllowed({ dev: false, smoke: false })).toBe(false);
  });
  it('the dev server does', () => {
    expect(overridesAllowed({ dev: true, smoke: false })).toBe(true);
  });
  it('an audit-smoke / preview build (VITE_AUDIT_SMOKE=true) does', () => {
    expect(overridesAllowed({ dev: false, smoke: true })).toBe(true);
  });
});

describe('evalContextFor: the evaluation context for this visit', () => {
  it('a production build parses no overrides and is not in smoke mode', () => {
    const ctx = evalContextFor({ userId: 'u', anonymousId: null, search: SEARCH, dev: false, smoke: false });
    expect(ctx.queryOverrides).toBeUndefined();
    expect(ctx.smokeMode).toBe(false);
    expect(ctx.userId).toBe('u');
    expect(ctx.anonymousId).toBeNull();
  });

  it('the dev server parses them', () => {
    const ctx = evalContextFor({ userId: 'u', anonymousId: null, search: SEARCH, dev: true, smoke: false });
    expect(ctx.queryOverrides).toEqual({ ff_advisors: 'on', ff_cartomancy: 'off' });
    expect(ctx.smokeMode).toBe(false);
  });

  it('a smoke build parses them and is in smoke mode', () => {
    const ctx = evalContextFor({ userId: 'u', anonymousId: 'a', search: SEARCH, dev: false, smoke: true });
    expect(ctx.queryOverrides).toEqual({ ff_advisors: 'on', ff_cartomancy: 'off' });
    expect(ctx.smokeMode).toBe(true);
    expect(ctx.anonymousId).toBe('a');
  });

  it('in production the URL changes nothing, in either direction', () => {
    const ctx = evalContextFor({ userId: 'u', anonymousId: null, search: SEARCH, dev: false, smoke: false });
    expect(evaluate(flag('advisors', false, 0), ctx)).toBe(false);
    expect(evaluate(flag('cartomancy', true, 100), ctx)).toBe(true);
  });
});

describe('evaluate(): the order is unchanged (first match wins)', () => {
  const ctx = (over: Partial<EvalContext> = {}): EvalContext => ({ userId: 'u', ...over });

  it("1. override 'on' beats a switched-off flag", () => {
    expect(evaluate(flag('advisors', false, 0), ctx({ queryOverrides: { ff_advisors: 'on' } }))).toBe(true);
  });
  it("1. override 'off' beats a flag that is on for everyone", () => {
    expect(evaluate(flag('cartomancy', true, 100), ctx({ queryOverrides: { ff_cartomancy: 'off' } }))).toBe(false);
  });
  it("1. override 'off' beats smoke mode", () => {
    expect(evaluate(flag('cartomancy', true, 100), ctx({ queryOverrides: { ff_cartomancy: 'off' }, smokeMode: true }))).toBe(false);
  });
  it('smoke mode turns every flag on', () => {
    expect(evaluate(flag('advisors', false, 0), ctx({ smokeMode: true }))).toBe(true);
  });
  it('2. a member on the allow-list', () => {
    expect(evaluate(flag('live-rooms', false, 0, ['u']), ctx())).toBe(true);
  });
  it('3. enabled at 100 %', () => {
    expect(evaluate(flag('cartomancy', true, 100), ctx())).toBe(true);
  });
  it('5. switched off', () => {
    expect(evaluate(flag('advisors', false, 0), ctx())).toBe(false);
  });
});

describe('userBucket: 32-bit FNV-1a of `${subject}:${key}` % 100 (public.feature_bucket must agree)', () => {
  it.each([
    ['00000000-0000-4000-8000-000000000001', 'advisors', 65], // hash 1332332065
    ['00000000-0000-4000-8000-000000000001', 'live-rooms', 7], // hash 2595704107
    ['00000000-0000-4000-8000-000000000002', 'advisors', 6], // hash 2250752406
    ['11111111-2222-4333-8444-555555555555', 'advisors', 5], // hash 3171055105
  ])('userBucket(%s, %s) = %i', (subject, key, bucket) => {
    expect(userBucket(subject, key)).toBe(bucket);
  });
});

describe('4. a partial rollout (the case public.feature_on_for_me mirrors)', () => {
  const advisorsAt10 = flag('advisors', false, 10);
  it.each([
    ['00000000-0000-4000-8000-000000000002', true], // bucket 6 < 10
    ['00000000-0000-4000-8000-000000000001', false], // bucket 65
    ['11111111-2222-4333-8444-555555555555', true], // bucket 5 < 10
  ])('member %s -> %s', (userId, on) => {
    expect(evaluate(advisorsAt10, { userId })).toBe(on);
  });
});
