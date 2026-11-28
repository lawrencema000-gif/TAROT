import { describe, it, expect, vi, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, act, fireEvent, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/*
 * p12 premium-12 (WP-P0-06): "Premium is on" said "Billing: Card, through
 * Stripe" to every web viewer however Premium was obtained, and its only
 * Manage button answered 404 and then blamed the connection. The sheet now
 * reads the member's own subscription.
 */

type Row = {
  provider: string;
  status: string;
  period: string;
  productId: string;
  expiresAt: string | null;
  cancelledAt: string | null;
};
let answer: { ok: true; data: Row | null } | { ok: false; error: string } = { ok: true, data: null };
let platform: 'web' | 'android' | 'ios' = 'web';
const openCustomerPortal = vi.fn();
const getCurrentForUser = vi.fn(async () => answer);

vi.mock('../../../dal', () => ({
  subscriptions: { getCurrentForUser: (...a: unknown[]) => getCurrentForUser(...(a as [])) },
}));
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1' },
    profile: { id: 'u1', displayName: 'Ada', is_premium: true, isPremium: true },
    refreshProfile: async () => {},
  }),
}));
vi.mock('../../../services/billing', () => ({
  PRODUCT_IDS: {
    PREMIUM_MONTHLY: 'arcana_premium_monthly',
    PREMIUM_YEARLY: 'arcana_premium_yearly',
    PREMIUM_LIFETIME: 'arcana_premium_lifetime',
  },
  getBillingService: () => ({
    getCustomerInfo: async () => null,
    restorePurchases: async () => [],
    openCustomerPortal,
  }),
}));
vi.mock('../../../utils/platform', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../utils/platform')>()),
  getPlatform: () => platform,
  isNative: () => platform !== 'web',
}));

import i18n from '../../../i18n/config';
import { ToastContainer, dismissToasts } from '../../ui';
import { SubscriptionSheet } from '../SubscriptionSheet';

const read = (lng: string, ns: string) =>
  JSON.parse(readFileSync(join(process.cwd(), 'src', 'i18n', 'locales', lng, `${ns}.json`), 'utf8'));
const row = (r: Partial<Row>): Row => ({
  provider: 'stripe',
  status: 'active',
  period: 'yearly',
  productId: 'arcana_premium_yearly',
  expiresAt: null,
  cancelledAt: null,
  ...r,
});

async function open(lng = 'en') {
  await act(async () => {
    await i18n.changeLanguage(lng);
  });
  render(
    <>
      <SubscriptionSheet open onClose={() => {}} />
      <ToastContainer />
    </>,
  );
  // The source renders once the member's row has been read.
  await waitFor(() => expect(getCurrentForUser).toHaveBeenCalled());
  await act(async () => {});
}

const manageButton = () => screen.queryByRole('button', { name: /Manage/ });

beforeAll(() => {
  for (const lng of ['ja', 'ko', 'zh']) for (const ns of ['app', 'common']) i18n.addResourceBundle(lng, ns, read(lng, ns), true, true);
});
beforeEach(() => {
  answer = { ok: true, data: null };
  platform = 'web';
  openCustomerPortal.mockReset();
  getCurrentForUser.mockClear();
  vi.stubGlobal('open', vi.fn());
});
afterEach(() => {
  act(() => dismissToasts());
  cleanup();
  vi.unstubAllGlobals();
});
afterAll(async () => {
  await i18n.changeLanguage('en');
});

describe('the Premium sheet names the real billing source (en, web)', () => {
  it('no subscription row → "Included with your account", no Manage, no portal call', async () => {
    await open();
    expect(screen.getByText('Included with your account')).toBeInTheDocument();
    expect(screen.getByText('Premium comes with your account, so there is nothing to bill, renew or cancel.')).toBeInTheDocument();
    expect(manageButton()).toBeNull();
    expect(screen.queryByText('Card, through Stripe')).toBeNull();
    expect(openCustomerPortal).not.toHaveBeenCalled();
  });

  it('a Google Play row → "Google Play", Manage opens Play, never the portal', async () => {
    answer = { ok: true, data: row({ provider: 'google', period: 'monthly', productId: 'arcana_premium_monthly:monthly-base' }) };
    await open();
    expect(screen.getByText('Google Play')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Manage on Google Play' }));
    expect(window.open).toHaveBeenCalledWith(
      'https://play.google.com/store/account/subscriptions?sku=arcana_premium_monthly&package=com.arcana.app',
      '_blank',
      'noopener',
    );
    expect(openCustomerPortal).not.toHaveBeenCalled();
  });

  it('a Stripe trial → "Free trial", its end date, and Manage opens the portal once', async () => {
    answer = { ok: true, data: row({ status: 'trial', expiresAt: '2026-11-18T12:00:00Z' }) };
    openCustomerPortal.mockResolvedValue({ ok: true });
    await open();
    expect(screen.getByText('Free trial')).toBeInTheDocument();
    expect(screen.getByText('Trial ends Nov 18, 2026')).toBeInTheDocument();
    expect(screen.getByText('Card, through Stripe')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Manage subscription' }));
    });
    expect(openCustomerPortal).toHaveBeenCalledTimes(1);
  });

  it('a past-due Stripe row → "Payment problem" and the portal (D50 C)', async () => {
    answer = { ok: true, data: row({ status: 'grace_period', expiresAt: '2026-11-18T12:00:00Z' }) };
    await open();
    expect(screen.getByText('Payment problem')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Manage subscription' })).toBeInTheDocument();
  });

  it('the portal answers NO_ACTIVE_SUBSCRIPTION → the no-card line, not the connection error', async () => {
    answer = { ok: true, data: row({}) };
    openCustomerPortal.mockResolvedValue({ ok: false, code: 'NO_ACTIVE_SUBSCRIPTION' });
    await open();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Manage subscription' }));
    });
    expect(
      await screen.findByText(
        'There’s no card subscription on this account to manage here. If you subscribed in an app store, manage it there.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Check your connection/)).toBeNull();
  });

  it('the portal fails on the network → the connection error', async () => {
    answer = { ok: true, data: row({}) };
    openCustomerPortal.mockResolvedValue({ ok: false, code: 'NETWORK' });
    await open();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Manage subscription' }));
    });
    expect(await screen.findByText('Couldn’t open the billing portal. Check your connection and try again.')).toBeInTheDocument();
  });

  it('the read fails → no Billing value, and the device’s Manage path stays', async () => {
    answer = { ok: false, error: 'boom' };
    await open();
    expect(screen.queryByText('Billing')).toBeNull();
    expect(screen.queryByText('Card, through Stripe')).toBeNull();
    expect(screen.queryByText('Included with your account')).toBeNull();
    expect(screen.getByRole('button', { name: 'Manage subscription' })).toBeInTheDocument();
  });

  it('a Stripe row in the Android app → no Manage button, the in-app note', async () => {
    platform = 'android';
    answer = { ok: true, data: row({}) };
    await open();
    expect(manageButton()).toBeNull();
    expect(
      screen.getByText(
        'You pay by card on our website, so this subscription can’t be changed in the app. To cancel or change it, sign in at tarotlife.app in a browser.',
      ),
    ).toBeInTheDocument();
  });
});

describe('the Premium sheet in Japanese (web)', () => {
  it('a Stripe row → 「カード（Stripe経由）」', async () => {
    answer = { ok: true, data: row({}) };
    await open('ja');
    expect(screen.getByText('カード（Stripe経由）')).toBeInTheDocument();
  });

  it('no row → 「アカウントに含まれています」 and no 「サブスクリプションを管理」', async () => {
    await open('ja');
    expect(screen.getByText('アカウントに含まれています')).toBeInTheDocument();
    expect(screen.queryByText(/サブスクリプションを管理/)).toBeNull();
  });
});
