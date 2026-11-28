// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/*
 * p12 premium-12 (WP-P0-06): the portal's 404 NO_ACTIVE_SUBSCRIPTION used to
 * reach the member as "Check your connection". openCustomerPortal() now says
 * what happened, and reads an HTML 5xx as text instead of throwing on .json().
 */

vi.mock('@revenuecat/purchases-capacitor', () => ({ Purchases: {}, LOG_LEVEL: {}, PURCHASES_ERROR_CODE: {} }));
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } }, error: null }) },
  },
}));
vi.mock('./billingGuard', () => ({ preventDoubleBilling: async () => ({ allowed: true }) }));
vi.mock('../utils/platform', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../utils/platform')>()),
  isNative: () => false,
  isAndroid: () => false,
  isIOS: () => false,
  getPlatform: () => 'web',
}));

import { parseFunctionError, getBillingService, type PortalResult } from './billing';

type Portal = { openCustomerPortal: () => Promise<PortalResult> };
const portal = () => getBillingService() as unknown as Portal;

describe('parseFunctionError', () => {
  it.each([
    ['{"error":{"code":"A","message":"B"}}', { code: 'A', detail: 'A: B' }],
    ['{"error":"flat"}', { code: null, detail: 'flat' }],
    ['{"message":"m","code":"c"}', { code: 'c', detail: 'm' }],
    ['<html>502</html>', { code: null, detail: '<html>502</html>' }],
    ['null', { code: null, detail: 'null' }],
  ])('%s', (raw, want) => {
    expect(parseFunctionError(raw)).toEqual(want);
  });
});

describe('openCustomerPortal on the web', () => {
  const fetchMock = vi.fn();
  let href = '';
  const realLocation = window.location;

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    href = '';
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        origin: 'https://tarotlife.app',
        get href() {
          return href;
        },
        set href(v: string) {
          href = v;
        },
      },
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
  });

  it('404 with the handler envelope → its code', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ error: { code: 'NO_ACTIVE_SUBSCRIPTION', message: 'No active Stripe subscription found', correlationId: 'x' } }),
        { status: 404 },
      ),
    );
    expect(await portal().openCustomerPortal()).toEqual({ ok: false, code: 'NO_ACTIVE_SUBSCRIPTION' });
  });

  it('502 with an HTML page → HTTP_502', async () => {
    fetchMock.mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 }));
    expect(await portal().openCustomerPortal()).toEqual({ ok: false, code: 'HTTP_502' });
  });

  it('a rejected fetch → NETWORK', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await portal().openCustomerPortal()).toEqual({ ok: false, code: 'NETWORK' });
  });

  it('200 with a url → ok, and the page goes there', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ url: 'https://billing.stripe.com/p/session/test' }), { status: 200 }));
    expect(await portal().openCustomerPortal()).toEqual({ ok: true });
    expect(href).toBe('https://billing.stripe.com/p/session/test');
  });

  it('200 without a url → NO_URL', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
    expect(await portal().openCustomerPortal()).toEqual({ ok: false, code: 'NO_URL' });
  });
});
