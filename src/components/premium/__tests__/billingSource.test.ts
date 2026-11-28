// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  billingSourceFor,
  playSubscriptionsUrl,
  APP_STORE_SUBSCRIPTIONS_URL,
  type BillingSource,
  type SourceInput,
} from '../billingSource';

/*
 * p12 premium-12 (WP-P0-06): the Premium sheet told every web viewer
 * "Card, through Stripe" and offered a portal that answered 404. The billing
 * source now comes from the member's own subscription; the device decides only
 * whether Stripe's portal may open and the fallback when the read failed.
 */

const PLAY = 'https://play.google.com/store/account/subscriptions';
const sub = (provider: SourceInput['provider'], period: SourceInput['period'] = 'yearly', productId = 'p'): SourceInput => ({
  provider,
  period,
  productId,
});
const INCLUDED: BillingSource = { via: 'included', manage: null, note: 'included' };

describe('billingSourceFor', () => {
  it('no subscription on the web → included, nothing to manage', () => {
    expect(billingSourceFor(null, 'web')).toEqual(INCLUDED);
  });
  it('no subscription on Android → the same', () => {
    expect(billingSourceFor(null, 'android')).toEqual(INCLUDED);
  });
  it('a promo row and a legacy web grant → included', () => {
    expect(billingSourceFor(sub('promo'), 'web')).toEqual(INCLUDED);
    expect(billingSourceFor(sub('web'), 'android')).toEqual(INCLUDED);
  });
  it('Stripe yearly on the web → card, portal, the portal note', () => {
    expect(billingSourceFor(sub('stripe'), 'web')).toEqual({ via: 'stripe', manage: { kind: 'portal' }, note: 'stripe' });
  });
  it('Stripe yearly in the Android app → card, no Manage, the in-app note', () => {
    expect(billingSourceFor(sub('stripe'), 'android')).toEqual({ via: 'stripe', manage: null, note: 'stripeInApp' });
  });
  it('Stripe lifetime on the web → card, no Manage, the lifetime note', () => {
    expect(billingSourceFor(sub('stripe', 'lifetime'), 'web')).toEqual({ via: 'stripe', manage: null, note: 'stripeLifetime' });
  });
  it('Google Play on the web → the Play link to that subscription', () => {
    expect(billingSourceFor(sub('google', 'monthly', 'arcana_premium_monthly:monthly-base'), 'web')).toEqual({
      via: 'googlePlay',
      manage: {
        kind: 'url',
        url: 'https://play.google.com/store/account/subscriptions?sku=arcana_premium_monthly&package=com.arcana.app',
        label: 'googlePlay',
      },
      note: 'googlePlay',
    });
  });
  it('Google Play with no product id on Android → the bare Play list', () => {
    expect(billingSourceFor(sub('google', 'monthly', ''), 'android')).toEqual({
      via: 'googlePlay',
      manage: { kind: 'url', url: PLAY, label: 'googlePlay' },
      note: 'googlePlay',
    });
  });
  it('App Store on the web → the App Store subscriptions page', () => {
    expect(billingSourceFor(sub('apple'), 'web')).toEqual({
      via: 'appStore',
      manage: { kind: 'url', url: 'https://apps.apple.com/account/subscriptions', label: 'appStore' },
      note: 'appStore',
    });
  });
  it('samsung (written by nothing) → nothing invented', () => {
    expect(billingSourceFor(sub('samsung'), 'web')).toEqual({ via: null, manage: null, note: null });
  });
  it('read failed on the web → no Billing row, the portal, the portal note', () => {
    expect(billingSourceFor(undefined, 'web')).toEqual({ via: null, manage: { kind: 'portal' }, note: 'stripe' });
  });
  it('read failed on Android → no Billing row, the bare Play list', () => {
    expect(billingSourceFor(undefined, 'android')).toEqual({
      via: null,
      manage: { kind: 'url', url: PLAY, label: 'googlePlay' },
      note: 'googlePlay',
    });
  });
  it('read failed on iOS → no Billing row, the App Store page', () => {
    expect(billingSourceFor(undefined, 'ios')).toEqual({
      via: null,
      manage: { kind: 'url', url: APP_STORE_SUBSCRIPTIONS_URL, label: 'appStore' },
      note: 'appStore',
    });
  });
  it('playSubscriptionsUrl encodes the sku', () => {
    expect(playSubscriptionsUrl('a b:base')).toBe(`${PLAY}?sku=a%20b&package=com.arcana.app`);
  });
});

describe('the copy behind every source', () => {
  const PROVIDERS: SourceInput['provider'][] = ['stripe', 'google', 'apple', 'samsung', 'web', 'promo'];
  const PERIODS: SourceInput['period'][] = ['weekly', 'monthly', 'yearly', 'lifetime'];
  const vias = new Set<string>();
  const manages = new Set<string>();
  const notes = new Set<string>();
  for (const platform of ['web', 'android', 'ios'] as const) {
    const inputs: Array<SourceInput | null | undefined> = [null, undefined];
    for (const p of PROVIDERS) for (const per of PERIODS) inputs.push(sub(p, per, 'x'), sub(p, per, ''));
    for (const i of inputs) {
      const s = billingSourceFor(i, platform);
      if (s.via) vias.add(s.via);
      if (s.manage) manages.add(s.manage.kind === 'portal' ? 'portal' : s.manage.label);
      if (s.note) notes.add(s.note);
    }
  }

  it.each(['en', 'ja', 'ko', 'zh'])('%s has every key the sheet can ask for, and none of the platform keys', (lng) => {
    const json = JSON.parse(readFileSync(join(process.cwd(), 'src', 'i18n', 'locales', lng, 'app.json'), 'utf8'));
    const s = json.premium.subscription;
    for (const v of vias) expect(s.billingVia[v], `billingVia.${v}`).toBeTruthy();
    for (const m of manages) expect(s.manage[m], `manage.${m}`).toBeTruthy();
    for (const n of notes) expect(s.storeNote[n], `storeNote.${n}`).toBeTruthy();
    for (const k of ['statusTrial', 'statusPaymentIssue']) expect(s[k], k).toBeTruthy();
    expect(s.toasts.noCardSubscription).toBeTruthy();
    expect(s.toasts.portalFailed).toBeTruthy();
    for (const old of ['web', 'android', 'ios']) {
      expect(s.billingVia[old], `billingVia.${old}`).toBeUndefined();
      expect(s.manage[old], `manage.${old}`).toBeUndefined();
      expect(s.storeNote[old], `storeNote.${old}`).toBeUndefined();
    }
  });

  it('the sheet can reach all the provider keys', () => {
    expect([...vias].sort()).toEqual(['appStore', 'googlePlay', 'included', 'stripe']);
    expect([...manages].sort()).toEqual(['appStore', 'googlePlay', 'portal']);
    expect([...notes].sort()).toEqual(['appStore', 'googlePlay', 'included', 'stripe', 'stripeInApp', 'stripeLifetime']);
  });
});
