// k6 smoke test — runs a 1-minute traffic shape against tarotlife.app to
// verify nothing is degraded. Use this before any traffic spike (launch,
// PR feature, marketing push) to catch regressions.
//
// Usage:
//   1. Install k6: `winget install k6` or https://k6.io/docs/get-started/installation/
//   2. Run smoke (~1 min, 10 vus): `k6 run loadtest/smoke.js`
//   3. Run scale (~5 min, 500 vus): `k6 run loadtest/scale.js`
//
// What this hits:
//   - Public homepage  (Netlify CDN)
//   - Public blog index (Netlify CDN)
//   - Random blog post (Netlify CDN, server-rendered or hydrated SPA)
//   - /version.json (must be no-store cached)
//   - /sitemap.xml
//
// We DO NOT hit any authenticated endpoints in smoke — that requires a
// real Supabase session. See `scale.js` for the full authenticated flow.
//
// Pass criteria:
//   - p(95) < 800ms across all checks
//   - 0% errors

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate } from 'k6/metrics';

const BASE = __ENV.BASE_URL || 'https://tarotlife.app';

const errorRate = new Rate('errors');

export const options = {
  vus: 10,
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<800'],
    errors: ['rate<0.01'],
  },
};

const BLOG_SLUGS = [
  'how-to-read-tarot-cards-beginners-guide',
  'the-tower-card-when-life-shakes-your-foundation',
  'tarot-card-meanings-complete-guide',
  'daily-horoscope-routine',
  'mbti-zodiac-personality-combination',
  'celtic-cross-tarot-spread-guide',
  'five-love-languages-explained',
];

export default function () {
  group('Static pages', () => {
    const res = http.get(`${BASE}/`);
    const ok = check(res, {
      'home 200': (r) => r.status === 200,
      'home has html': (r) => r.body && r.body.includes('<!DOCTYPE html>'),
    });
    errorRate.add(!ok);
  });

  group('Blog index', () => {
    const res = http.get(`${BASE}/blog`);
    const ok = check(res, { 'blog index 200': (r) => r.status === 200 });
    errorRate.add(!ok);
  });

  group('Blog post', () => {
    const slug = BLOG_SLUGS[Math.floor(Math.random() * BLOG_SLUGS.length)];
    const res = http.get(`${BASE}/blog/${slug}`);
    const ok = check(res, { 'blog post 200': (r) => r.status === 200 });
    errorRate.add(!ok);
  });

  group('Static assets', () => {
    const v = http.get(`${BASE}/version.json`);
    check(v, {
      'version 200': (r) => r.status === 200,
      'version has sha': (r) => r.body && r.body.includes('"sha"'),
      'version no-store': (r) =>
        (r.headers['Cache-Control'] || '').toLowerCase().includes('no-store'),
    });

    const s = http.get(`${BASE}/sitemap.xml`);
    check(s, { 'sitemap 200': (r) => r.status === 200 });
  });

  sleep(1 + Math.random() * 2);
}
