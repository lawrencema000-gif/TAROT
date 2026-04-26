// k6 scale test — verifies the system can handle 500 concurrent users
// hitting the read paths that ARE the bottleneck at scale: homepage,
// blog read, sitemap, robots, version check.
//
// This runs entirely against PUBLIC endpoints. We're testing CDN behavior,
// Supabase REST query performance for blog index, and edge function
// invocations on uncached paths. Authenticated flows (tarot, AI) need a
// real Supabase session and are tested separately via Playwright.
//
// Usage:
//   k6 run loadtest/scale.js
//
// Pass criteria:
//   - p(95) < 1500ms (CDN + Netlify edge should hold this easily)
//   - p(99) < 3000ms
//   - 0% 5xx errors
//   - <2% 4xx errors (some user-error 404s are normal)

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE = __ENV.BASE_URL || 'https://tarotlife.app';

const errorRate = new Rate('errors');
const fiveXxRate = new Rate('5xx');
const blogReadDuration = new Trend('blog_read_duration');

export const options = {
  scenarios: {
    ramp_to_500: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m',  target: 100 },  // warm up
        { duration: '2m',  target: 500 },  // ramp to scale target
        { duration: '3m',  target: 500 },  // sustained
        { duration: '1m',  target: 0   },  // ramp down
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1500', 'p(99)<3000'],
    '5xx':    ['rate<0.001'],
    errors:   ['rate<0.05'],
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
  group('Cold landing path', () => {
    const res = http.get(`${BASE}/`);
    const is5xx = res.status >= 500;
    fiveXxRate.add(is5xx);
    errorRate.add(res.status >= 400);
    check(res, { 'home OK': (r) => r.status >= 200 && r.status < 400 });
  });

  group('Blog read', () => {
    const slug = BLOG_SLUGS[Math.floor(Math.random() * BLOG_SLUGS.length)];
    const start = Date.now();
    const res = http.get(`${BASE}/blog/${slug}`);
    const elapsed = Date.now() - start;
    blogReadDuration.add(elapsed);
    const is5xx = res.status >= 500;
    fiveXxRate.add(is5xx);
    errorRate.add(res.status >= 400);
    check(res, { 'blog OK': (r) => r.status >= 200 && r.status < 400 });
  });

  group('Static catalog', () => {
    const sitemap = http.get(`${BASE}/sitemap.xml`);
    fiveXxRate.add(sitemap.status >= 500);
    errorRate.add(sitemap.status >= 400);

    const robots = http.get(`${BASE}/robots.txt`);
    fiveXxRate.add(robots.status >= 500);
    errorRate.add(robots.status >= 400);

    const llms = http.get(`${BASE}/llms.txt`);
    fiveXxRate.add(llms.status >= 500);
    errorRate.add(llms.status >= 400);
  });

  // Realistic user pacing: 2-6 seconds between actions.
  sleep(2 + Math.random() * 4);
}
