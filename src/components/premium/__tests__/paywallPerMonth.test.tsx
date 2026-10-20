import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/*
 * p10 d3-ko-07: the Korean paywall quoted the yearly plan's monthly figure as
 * 「월 US$1.67」 under a 「$19.99 /년」 plan. The plan prices are the store's
 * own strings and the monthly figure went through Intl's currency style,
 * which writes USD as "US$" in ko and zh. The figure now borrows the yearly
 * price's notation: its symbol and where it sits, its separators, its
 * decimals.
 */

type StoreProduct = { id: string; title: string; description: string; price: string; priceAmount: number; currency: string; period?: 'month' | 'year' };
let products: StoreProduct[] = [];

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, optimisticallyMarkPremium: () => {}, pollProfileUntilPremium: async () => true }),
}));
vi.mock('../../../services/billing', () => ({
  PRODUCT_IDS: {
    PREMIUM_MONTHLY: 'arcana_premium_monthly',
    PREMIUM_YEARLY: 'arcana_premium_yearly',
    PREMIUM_LIFETIME: 'arcana_premium_lifetime',
  },
  getBillingService: () => ({ initialize: async () => true, getProducts: async () => products }),
}));
vi.mock('../../../utils/platform', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../utils/platform')>()),
  isNative: () => false,
}));

import i18n from '../../../i18n/config';
import { PaywallSheet } from '../PaywallSheet';

const read = (lng: string, ns: string) => JSON.parse(readFileSync(join(process.cwd(), 'src', 'i18n', 'locales', lng, `${ns}.json`), 'utf8'));
const plan = (period: 'month' | 'year', price: string, priceAmount: number, currency: string): StoreProduct => ({
  id: period === 'month' ? 'arcana_premium_monthly' : 'arcana_premium_yearly',
  title: '',
  description: '',
  price,
  priceAmount,
  currency,
  period,
});

async function open(lng: string) {
  await act(async () => {
    await i18n.changeLanguage(lng);
  });
  render(<PaywallSheet open onClose={() => {}} />);
  // The plans render once the store has answered.
  return screen.findByRole('radiogroup');
}

beforeAll(() => {
  for (const lng of ['ja', 'ko', 'zh']) for (const ns of ['app', 'common']) i18n.addResourceBundle(lng, ns, read(lng, ns), true, true);
});
afterEach(() => {
  cleanup();
  products = [];
});
afterAll(async () => {
  await i18n.changeLanguage('en');
});

describe('p10 d3-ko-07 — the per-month figure is written like the plan prices', () => {
  it.each([
    ['ko', '월 $1.67'],
    ['zh', '每月 $1.67'],
    ['ja', '月あたり$1.67'],
    ['en', '$1.67 per month'],
  ])('%s, the web prices ($19.99 a year): %s, and no "US$" on the sheet', async (lng, line) => {
    const plans = await open(lng);
    expect(plans.textContent).toContain('$19.99');
    expect(screen.getByText(line)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/US\$/);
  });

  it('a store price in euros, written the European way, keeps its comma and its trailing symbol', async () => {
    products = [plan('month', '3,99 €', 3.99, 'EUR'), plan('year', '19,99 €', 19.99, 'EUR')];
    await open('en');
    expect(screen.getByText('1,67 € per month')).toBeInTheDocument();
  });

  it('won and yen have no minor unit: the figure is rounded to a whole one and grouped as the price is', async () => {
    products = [plan('month', '₩4,400', 4400, 'KRW'), plan('year', '₩29,000', 29000, 'KRW')];
    await open('ko');
    expect(screen.getByText('월 ₩2,417')).toBeInTheDocument();
    cleanup();
    products = [plan('month', '￥500', 500, 'JPY'), plan('year', '￥2,400', 2400, 'JPY')];
    await open('ja');
    expect(screen.getByText('月あたり￥200')).toBeInTheDocument();
  });

  it('a store that writes its own "US$" keeps it on both lines', async () => {
    products = [plan('month', 'US$3.99', 3.99, 'USD'), plan('year', 'US$19.99', 19.99, 'USD')];
    await open('ko');
    expect(screen.getByText('월 US$1.67')).toBeInTheDocument();
  });
});
