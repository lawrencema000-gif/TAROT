// @vitest-environment node
/**
 * Stripe sends the member back only into the app, and CORS answers only the
 * app's origins (p10 fix2).
 *
 * create-checkout-session, create-portal-session, create-moonstone-checkout,
 * create-report-checkout and advisor-stripe-onboard each checked the URL
 * Stripe redirects to afterwards against a host list of their own, with a
 * subdomain rule (host.endsWith('.' + allowed)). Every list carried
 * arcana.app, a domain that is not ours, so it and any subdomain of it were
 * accepted: an open redirect from our checkout. _shared/cors.ts allowed its
 * origins as well. The five now share isAppRedirectUrl(), which matches a
 * whole origin from the app's own list.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getCorsHeaders, isAppRedirectUrl } from '../../../supabase/functions/_shared/cors';

const FUNCTIONS = join(__dirname, '..', '..', '..', 'supabase', 'functions');

describe('isAppRedirectUrl', () => {
  it('accepts every URL the app builds (window.location.origin + a route)', () => {
    for (const url of [
      'https://tarotlife.app/?payment=success', // billing.ts checkout
      'https://tarotlife.app/?payment=cancelled',
      'https://tarotlife.app', // billing.ts portal return
      'https://www.tarotlife.app/reports/career?unlock=success', // reportCheckout.ts
      'https://arcana-ritual-app.netlify.app/advisors/dashboard?stripe=return', // AdvisorDashboardPage
      'https://localhost/advisors/dashboard?stripe=return', // the Android app (androidScheme https)
      'http://localhost:5173/?payment=success', // dev servers, any port
      'http://127.0.0.1:5199/reports/year-ahead?unlock=cancelled',
    ]) {
      expect(isAppRedirectUrl(url), url).toBe(true);
    }
  });

  it('refuses arcana.app and every subdomain of it', () => {
    for (const url of [
      'https://arcana.app/?payment=success',
      'https://www.arcana.app/',
      'https://pay.arcana.app/reports/career?unlock=success',
      'http://arcana.app/',
    ]) {
      expect(isAppRedirectUrl(url), url).toBe(false);
    }
  });

  it('matches a whole origin: no subdomain, suffix, look-alike or other scheme', () => {
    for (const url of [
      'https://shop.tarotlife.app/',
      'https://tarotlife.app.evil.example/',
      'https://eviltarotlife.app/',
      'https://tarotlife.app@evil.example/',
      'https://evil.example/?next=https://tarotlife.app/',
      'https://x.arcana-ritual-app.netlify.app/',
      'https://deploy-preview-12--arcana-ritual-app.netlify.app/', // previews stay out, as before
      'http://tarotlife.app/',
      'https://localhost:8443/',
    ]) {
      expect(isAppRedirectUrl(url), url).toBe(false);
    }
  });

  it('refuses what is not an absolute http(s) URL', () => {
    for (const url of ['javascript:alert(1)', 'capacitor://localhost/', '//tarotlife.app/', '/?payment=success', 'not a url', '']) {
      expect(isAppRedirectUrl(url), url).toBe(false);
    }
  });
});

describe('CORS answers the app and only the app', () => {
  const allowed = (origin: string) =>
    getCorsHeaders(new Request('https://example.supabase.co/functions/v1/x', { headers: { Origin: origin } }))['Access-Control-Allow-Origin'];

  it('echoes production, the Netlify site and its previews, local dev and the Capacitor app', () => {
    for (const origin of [
      'https://tarotlife.app',
      'https://www.tarotlife.app',
      'https://arcana-ritual-app.netlify.app',
      'https://deploy-preview-12--arcana-ritual-app.netlify.app',
      'http://localhost:5173',
      'http://127.0.0.1:5199',
      'capacitor://localhost',
      'https://localhost',
      'http://localhost',
    ]) {
      expect(allowed(origin), origin).toBe(origin);
    }
  });

  it('answers null to arcana.app, which is not ours', () => {
    for (const origin of ['https://arcana.app', 'https://www.arcana.app', 'https://pay.arcana.app', 'https://evil.example']) {
      expect(allowed(origin), origin).toBe('null');
    }
  });
});

describe('every URL handed to Stripe is checked with isAppRedirectUrl', () => {
  const sources = readdirSync(FUNCTIONS, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_') && existsSync(join(FUNCTIONS, d.name, 'index.ts')))
    .map((d) => ({ name: d.name, src: readFileSync(join(FUNCTIONS, d.name, 'index.ts'), 'utf8') }));
  const redirecting = sources.filter((f) => /\b(?:success|cancel|return|refresh)_url\s*:/.test(f.src));

  it('finds the five functions that redirect', () => {
    expect(redirecting.map((f) => f.name).sort()).toEqual([
      'advisor-stripe-onboard',
      'create-checkout-session',
      'create-moonstone-checkout',
      'create-portal-session',
      'create-report-checkout',
    ]);
  });

  it('checks each redirect with the shared rule and keeps no host list of its own', () => {
    for (const { name, src } of redirecting) {
      expect(src, name).toContain('import { isAppRedirectUrl } from "../_shared/cors.ts";');
      for (const m of src.matchAll(/\b(?:success|cancel|return|refresh)_url\s*:\s*([\w.]+)/g)) {
        expect(src, `${name}: ${m[0]}`).toContain(`isAppRedirectUrl(${m[1]})`);
      }
      expect(src, name).not.toMatch(/\.endsWith\(|\bhostname\b|ALLOWED_HOSTS|allowedHosts/);
    }
  });
});
