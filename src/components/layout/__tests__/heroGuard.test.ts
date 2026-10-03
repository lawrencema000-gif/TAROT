// @vitest-environment node
// scripts/seo-body.mjs imports esbuild, which refuses to load under jsdom; the
// guard is run here against a stub page instead.
import { describe, it, expect } from 'vitest';
// @ts-expect-error — a plain .mjs build script, no types
import { landingHeroBody } from '../../../../scripts/seo-body.mjs';

const HTML: string = landingHeroBody({
  badge: 'B',
  headlineTop: 'Know yourself.',
  headlineBottom: 'One ritual a day.',
  sub: 'S',
  cta: 'Create my free account',
  note: 'N',
});
const GUARD = HTML.slice(HTML.indexOf('<script>') + 8, HTML.indexOf('</script>'));

/** Run the guard for `url` with `store` in localStorage: did the hero stay, was <html> marked? */
function run(url: string, store: Record<string, string> = {}, extra: Record<string, unknown> = {}) {
  const u = new URL(url, 'https://tarotlife.app');
  let removed = false;
  let marked = false;
  const keys = Object.keys(store);
  const hero = { parentNode: { removeChild: () => { removed = true; } } };
  const location = { pathname: u.pathname, search: u.search, hash: u.hash, hostname: u.hostname, port: '' };
  const localStorage = { getItem: (k: string) => store[k] ?? null, key: (i: number) => keys[i] ?? null, get length() { return keys.length; } };
  const document = {
    querySelector: (sel: string) => (sel === '.seo-landing' ? hero : null),
    documentElement: { setAttribute: (k: string, v: string) => { if (k === 'data-prerendered' && v === 'landing') marked = true; } },
  };
  const window = { ...extra };
  new Function('window', 'location', 'localStorage', 'document', GUARD)(window, location, localStorage, document);
  return { hero: !removed, marked };
}

describe('prerendered hero guard (P7 #38, #122)', () => {
  it('keeps the hero only for a cold visitor at /', () => {
    expect(run('/')).toEqual({ hero: true, marked: true });
    expect(run('/?lang=en')).toEqual({ hero: true, marked: true });
  });

  it('drops it on every other path the same file may answer (vite preview, a host without app.html)', () => {
    for (const u of ['/reading/abc123', '/reset-password?code=abc', '/unsubscribe?token=x', '/invite/XYZ', '/journal', '/cartomancy/reading']) {
      expect(run(u), u).toEqual({ hero: false, marked: false });
    }
  });

  it('drops it on an auth return at /, for a signed-in visitor, for ja/ko/zh and in the app', () => {
    expect(run('/?code=abc')).toEqual({ hero: false, marked: false });
    expect(run('/?lang=en#access_token=x&type=signup')).toEqual({ hero: false, marked: false });
    expect(run('/?error=access_denied')).toEqual({ hero: false, marked: false });
    expect(run('/', { 'sb-ulzlthhkqjuohzjangcq-auth-token': '{}' })).toEqual({ hero: false, marked: false });
    expect(run('/', { arcana_locale: 'ja' })).toEqual({ hero: false, marked: false });
    expect(run('/?lang=zh-TW')).toEqual({ hero: false, marked: false });
    expect(run('/', {}, { Capacitor: {} })).toEqual({ hero: false, marked: false });
  });

  it('a PKCE code verifier alone is not a session', () => {
    expect(run('/', { 'sb-ulzlthhkqjuohzjangcq-auth-token-code-verifier': 'x' })).toEqual({ hero: true, marked: true });
  });
});
