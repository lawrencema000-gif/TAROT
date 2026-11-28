// Where a member's Premium is billed, and where (if anywhere) it can be
// managed — decided by the member's own subscription, not by the device
// they are holding (p12 premium-12, WP-P0-06). Pure; type-only imports.

import type { Platform } from '../../utils/platform';
import type { SubscriptionProvider, SubscriptionPeriod } from '../../dal';

export type BillingVia = 'stripe' | 'googlePlay' | 'appStore' | 'included';
export type ManageTarget = { kind: 'portal' } | { kind: 'url'; url: string; label: 'googlePlay' | 'appStore' };
export type StoreNote = 'stripe' | 'stripeInApp' | 'stripeLifetime' | 'googlePlay' | 'appStore' | 'included';
export interface BillingSource {
  via: BillingVia | null;
  manage: ManageTarget | null;
  note: StoreNote | null;
}
export interface SourceInput {
  provider: SubscriptionProvider;
  period: SubscriptionPeriod;
  productId: string;
}

/** Android application id (android/app/build.gradle). */
export const ANDROID_PACKAGE = 'com.arcana.app';
export const APP_STORE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';
const PLAY_SUBSCRIPTIONS_URL = 'https://play.google.com/store/account/subscriptions';

/** Google Play's documented link to one subscription; the bare list when the product is unknown. */
export function playSubscriptionsUrl(productId: string): string {
  const sku = productId.split(':')[0]; // RevenueCat sends "<product>:<base plan>"
  return sku
    ? `${PLAY_SUBSCRIPTIONS_URL}?sku=${encodeURIComponent(sku)}&package=${ANDROID_PACKAGE}`
    : PLAY_SUBSCRIPTIONS_URL;
}

/** Client copy of supabase/functions/_shared/billing-provider.ts providerForStore (parity pinned by billingLedger.test.ts). */
export function providerFromStore(store: string | null | undefined): SubscriptionProvider | null {
  switch ((store ?? '').toUpperCase()) {
    case 'PLAY_STORE': return 'google';
    case 'APP_STORE':
    case 'MAC_APP_STORE': return 'apple';
    case 'STRIPE': return 'stripe';
    case 'PROMOTIONAL': return 'promo';
    default: return null;
  }
}

const PORTAL: ManageTarget = { kind: 'portal' };
const playTarget = (productId: string): ManageTarget => ({ kind: 'url', url: playSubscriptionsUrl(productId), label: 'googlePlay' });
const APP_STORE_TARGET: ManageTarget = { kind: 'url', url: APP_STORE_SUBSCRIPTIONS_URL, label: 'appStore' };

/**
 * `sub`: the live subscription (or the native entitlement's store when no row
 * has arrived); null = Premium with no subscription (a grant); undefined =
 * unknown (the read failed).
 */
export function billingSourceFor(sub: SourceInput | null | undefined, platform: Platform): BillingSource {
  if (sub === undefined) {
    // The read failed: keep the device-based path, so a network blip never
    // hides the only cancel route. No Billing row — we do not know it.
    if (platform === 'android') return { via: null, manage: playTarget(''), note: 'googlePlay' };
    if (platform === 'ios') return { via: null, manage: APP_STORE_TARGET, note: 'appStore' };
    return { via: null, manage: PORTAL, note: 'stripe' };
  }
  if (sub === null || sub.provider === 'promo' || sub.provider === 'web') {
    return { via: 'included', manage: null, note: 'included' };
  }
  switch (sub.provider) {
    case 'stripe':
      if (sub.period === 'lifetime') return { via: 'stripe', manage: null, note: 'stripeLifetime' };
      // No link or button to a card payment page inside a store app.
      return platform === 'web'
        ? { via: 'stripe', manage: PORTAL, note: 'stripe' }
        : { via: 'stripe', manage: null, note: 'stripeInApp' };
    case 'google':
      return { via: 'googlePlay', manage: playTarget(sub.productId), note: 'googlePlay' };
    case 'apple':
      return { via: 'appStore', manage: APP_STORE_TARGET, note: 'appStore' };
    default:
      // samsung: allowed by the CHECK, written by nothing — no invented fact.
      return { via: null, manage: null, note: null };
  }
}
