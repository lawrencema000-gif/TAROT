// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  providerForStore,
  stripeLedgerStatus,
  stripeKeepsPremium,
} from '../../../supabase/functions/_shared/billing-provider';
import { PORTAL_STATUSES, PORTAL_EXCLUDED_PERIOD } from '../../../supabase/functions/_shared/portal';
import { providerFromStore } from '../../components/premium/billingSource';

/*
 * p12 premium-12 (WP-P0-06): what the payment webhooks write into
 * public.subscriptions must fit its CHECK constraints and its unique key, or
 * the write fails and is only logged; the sheet, the portal and the Android
 * reconcile all read those rows.
 */

const ROOT = join(__dirname, '..', '..', '..');
const FUNCTIONS = join(ROOT, 'supabase', 'functions');
const MIGRATIONS = join(ROOT, 'supabase', 'migrations');

/** The source without // and block comments. */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}
const fn = (name: string) => code(readFileSync(join(FUNCTIONS, name, 'index.ts'), 'utf8'));

function checkSet(name: string): string[] {
  const sql = readFileSync(join(MIGRATIONS, '20260101111354_add_quiz_definitions_subscriptions_audit.sql'), 'utf8');
  const m = new RegExp(`CONSTRAINT ${name} CHECK \\(\\w+ IN \\(([^)]*)\\)\\)`).exec(sql);
  if (!m) throw new Error(`no ${name} CHECK`);
  return m[1].split(',').map((v) => v.trim().replace(/'/g, ''));
}

const STORES = [
  'PLAY_STORE', 'APP_STORE', 'STRIPE', 'MAC_APP_STORE', 'PROMOTIONAL', 'AMAZON',
  'RC_BILLING', 'EXTERNAL', 'PADDLE', 'TEST_STORE', 'UNKNOWN_STORE',
];

describe('providerForStore (RevenueCat store → ledger provider)', () => {
  it.each([
    ['PLAY_STORE', 'google'],
    ['APP_STORE', 'apple'],
    ['MAC_APP_STORE', 'apple'],
    ['STRIPE', 'stripe'],
    ['PROMOTIONAL', 'promo'],
    ['play_store', 'google'],
  ])('%s → %s', (store, provider) => {
    expect(providerForStore(store)).toBe(provider);
  });

  it.each(['AMAZON', 'RC_BILLING', 'EXTERNAL', 'PADDLE', 'TEST_STORE', 'UNKNOWN_STORE', '', undefined])(
    '%s → null (no row; the entitlement stays)',
    (store) => {
      expect(providerForStore(store)).toBeNull();
    },
  );

  it('every provider it writes is inside valid_provider', () => {
    const allowed = checkSet('valid_provider');
    for (const s of STORES) {
      const p = providerForStore(s);
      if (p) expect(allowed).toContain(p);
    }
  });

  it('the client copy providerFromStore agrees for every store', () => {
    for (const s of STORES) expect(providerFromStore(s)).toBe(providerForStore(s));
  });
});

describe('stripeLedgerStatus (Stripe status → ledger status)', () => {
  it.each([
    ['trialing', 'trial'],
    ['active', 'active'],
    ['past_due', 'grace_period'],
    ['unpaid', 'grace_period'],
    ['canceled', 'cancelled'],
    ['incomplete_expired', 'expired'],
    ['incomplete', 'pending'],
    ['paused', 'pending'],
    ['something_new', 'pending'],
  ])('%s → %s, inside valid_status', (stripe, ledger) => {
    expect(stripeLedgerStatus(stripe)).toBe(ledger);
    expect(checkSet('valid_status')).toContain(stripeLedgerStatus(stripe));
  });
});

describe('stripeKeepsPremium (D50 C: Premium through Stripe’s retries)', () => {
  it('active and trialing keep Premium', () => {
    expect(stripeKeepsPremium('active', null)).toBe(true);
    expect(stripeKeepsPremium('trialing', undefined)).toBe(true);
  });
  it('past_due keeps Premium only while a retry is scheduled', () => {
    expect(stripeKeepsPremium('past_due', 1_765_000_000)).toBe(true);
    expect(stripeKeepsPremium('past_due', null)).toBe(false);
    expect(stripeKeepsPremium('past_due', undefined)).toBe(false);
  });
  it.each(['unpaid', 'canceled', 'paused', 'incomplete', 'incomplete_expired'])('%s ends Premium', (s) => {
    expect(stripeKeepsPremium(s, 1_765_000_000)).toBe(false);
  });
});

describe('create-portal-session row filter', () => {
  it('serves active, trial and grace_period, which include what the webhook writes for a live subscription', () => {
    expect([...PORTAL_STATUSES]).toEqual(['active', 'trial', 'grace_period']);
    expect(PORTAL_STATUSES).toContain(stripeLedgerStatus('trialing'));
    expect(PORTAL_STATUSES).toContain(stripeLedgerStatus('active'));
    expect(PORTAL_STATUSES).toContain(stripeLedgerStatus('past_due'));
    expect(PORTAL_EXCLUDED_PERIOD).toBe('lifetime');
  });

  it('the function filters with them, newest first, and no longer demands status active', () => {
    const src = fn('create-portal-session');
    expect(src).toContain('.in("status", [...PORTAL_STATUSES])');
    expect(src).toContain('.neq("period", PORTAL_EXCLUDED_PERIOD)');
    expect(src).toContain('.order("updated_at", { ascending: false })');
    expect(src).toContain('.limit(1)');
    expect(src).not.toContain('.eq("status", "active")');
    expect(src).toContain('isAppRedirectUrl(returnUrl)');
  });
});

describe('the webhooks write rows the table accepts', () => {
  it('revenuecat-webhook records the real store and clears cancelled_at on purchase', () => {
    const src = fn('revenuecat-webhook');
    expect(src).toContain('providerForStore(');
    expect(src).toContain('cancelled_at: null');
    expect(src).not.toContain('provider: "google"');
    expect(src).not.toContain('.eq("provider", "google")');
    expect(src).toContain('.eq("transaction_id", body.event.original_transaction_id)');
  });

  it('stripe-webhook maps every status into the CHECK and keeps Premium through retries', () => {
    const src = fn('stripe-webhook');
    expect(src).toContain('stripeLedgerStatus(');
    expect(src).not.toContain('? "trial" : subscription.status');
    expect(src).toContain('stripeKeepsPremium(');
    expect(src).toContain('cancelled_at: subscriptionData.cancelledAt');
  });

  it('a migration adds the unique key the upserts name in ON CONFLICT (transaction_id)', () => {
    const hit = readdirSync(MIGRATIONS)
      .filter((f) => f.endsWith('.sql'))
      .some((f) =>
        /ADD CONSTRAINT subscriptions_transaction_id_key UNIQUE \(transaction_id\)/.test(
          readFileSync(join(MIGRATIONS, f), 'utf8'),
        ),
      );
    expect(hit).toBe(true);
  });
});
