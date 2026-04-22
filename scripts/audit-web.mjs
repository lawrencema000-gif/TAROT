#!/usr/bin/env node
/**
 * Web audit for tarotlife.app
 * Produces a JSON report consumed by .audit/web-audit.md
 *
 * Usage: node scripts/audit-web.mjs [--local]
 *   --local  hit http://localhost:4173 (vite preview) instead of production
 */
import { chromium, devices } from 'playwright';
import { writeFileSync, mkdirSync, readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const BASE = process.argv.includes('--local') ? 'http://localhost:4173' : 'https://tarotlife.app';

const OUT_DIR = join(ROOT, '.audit');
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const pages = [
  { path: '/', name: 'landing' },
  { path: '/?lang=ja', name: 'landing-ja' },
  { path: '/tarot-meanings', name: 'tarot-meanings' },
  { path: '/tarot-meanings/the-fool', name: 'the-fool' },
  { path: '/blog', name: 'blog' },
];

const results = {
  meta: { base: BASE, startedAt: new Date().toISOString(), userAgent: null },
  perf: {},
  seo: {},
  a11y: {},
  console: {},
  network: {},
  mobile: {},
  images: {},
  sitemap: { urls: [], broken: [], total: 0 },
  robots: null,
  bundle: {},
};

/* ---------- 1. Bundle analysis (static dist/) ---------- */
function analyseBundle() {
  const distAssets = join(ROOT, 'dist', 'assets');
  if (!existsSync(distAssets)) {
    results.bundle.error = 'dist/assets missing — run `npm run build` first';
    return;
  }
  const files = readdirSync(distAssets)
    .filter((f) => f.endsWith('.js') || f.endsWith('.css'))
    .map((f) => {
      const p = join(distAssets, f);
      const size = statSync(p).size;
      return { file: f, size };
    })
    .sort((a, b) => b.size - a.size);

  const jsTotal = files.filter((f) => f.file.endsWith('.js')).reduce((s, f) => s + f.size, 0);
  const cssTotal = files.filter((f) => f.file.endsWith('.css')).reduce((s, f) => s + f.size, 0);

  results.bundle = {
    jsTotalBytes: jsTotal,
    jsTotalKb: Math.round(jsTotal / 1024),
    cssTotalBytes: cssTotal,
    cssTotalKb: Math.round(cssTotal / 1024),
    largest: files.slice(0, 12),
    fileCount: files.length,
  };
}

/* ---------- 2. Sitemap / robots / link check ---------- */
async function checkSitemap() {
  const url = `${BASE}/sitemap.xml`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      results.sitemap.error = `HTTP ${res.status}`;
      return;
    }
    const xml = await res.text();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    results.sitemap.total = locs.length;
    const sample = locs.slice(0, 25); // limit to keep audit time sane
    results.sitemap.urls = sample;
    for (const u of sample) {
      try {
        const r = await fetch(u, { method: 'HEAD', redirect: 'follow' });
        if (!r.ok) results.sitemap.broken.push({ url: u, status: r.status });
      } catch (e) {
        results.sitemap.broken.push({ url: u, status: 'ERR', error: String(e) });
      }
    }
  } catch (e) {
    results.sitemap.error = String(e);
  }
}

async function checkRobots() {
  try {
    const res = await fetch(`${BASE}/robots.txt`);
    const text = await res.text();
    results.robots = {
      status: res.status,
      hasSitemap: /Sitemap:/i.test(text),
      disallowsAdmin: /Disallow:\s*\/admin/.test(text),
      raw: text.slice(0, 500),
    };
  } catch (e) {
    results.robots = { error: String(e) };
  }
}

/* ---------- 3. Per-page Playwright checks ---------- */
async function auditPage(browser, pageDef, viewport = 'desktop') {
  const ctx = await browser.newContext(
    viewport === 'mobile' ? devices['iPhone 13'] : { viewport: { width: 1440, height: 900 } },
  );
  const page = await ctx.newPage();
  const consoleMsgs = [];
  const networkErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') {
      consoleMsgs.push({ type: m.type(), text: m.text().slice(0, 400) });
    }
  });
  page.on('pageerror', (e) => consoleMsgs.push({ type: 'pageerror', text: String(e).slice(0, 400) }));
  page.on('requestfailed', (r) =>
    networkErrors.push({ url: r.url(), failure: r.failure()?.errorText || 'unknown' }),
  );
  page.on('response', (r) => {
    if (r.status() >= 400) networkErrors.push({ url: r.url(), status: r.status() });
  });

  const url = `${BASE}${pageDef.path}`;
  const t0 = Date.now();
  let navErr = null;
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
  } catch (e) {
    navErr = String(e);
  }
  const loadMs = Date.now() - t0;

  // Perf timings
  const perf = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    const fcp = paint.find((p) => p.name === 'first-contentful-paint')?.startTime || null;
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint') || [];
    const lcp = lcpEntries.length ? lcpEntries[lcpEntries.length - 1].startTime : null;
    return {
      domContentLoaded: nav ? nav.domContentLoadedEventEnd - nav.startTime : null,
      loadEvent: nav ? nav.loadEventEnd - nav.startTime : null,
      fcp,
      lcp,
      transferSize: nav ? nav.transferSize : null,
    };
  });

  // SEO meta
  const seo = await page.evaluate(() => {
    const q = (sel) => document.querySelector(sel)?.getAttribute('content') || document.querySelector(sel)?.textContent || null;
    const title = document.querySelector('title')?.textContent || null;
    const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') || null;
    const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href') || null;
    const ogTitle = q('meta[property="og:title"]');
    const ogDesc = q('meta[property="og:description"]');
    const ogImage = q('meta[property="og:image"]');
    const twCard = q('meta[name="twitter:card"]');
    const twTitle = q('meta[name="twitter:title"]');
    const twImage = q('meta[name="twitter:image"]');
    const hreflangs = [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((l) => ({
      hreflang: l.getAttribute('hreflang'),
      href: l.getAttribute('href'),
    }));
    const htmlLang = document.documentElement.getAttribute('lang');
    const h1Count = document.querySelectorAll('h1').length;
    const h1Text = document.querySelector('h1')?.textContent?.trim().slice(0, 120) || null;
    return { title, metaDesc, canonical, ogTitle, ogDesc, ogImage, twCard, twTitle, twImage, hreflangs, htmlLang, h1Count, h1Text };
  });

  // Accessibility
  const a11y = await page.evaluate(() => {
    const main = document.querySelectorAll('main').length;
    const nav = document.querySelectorAll('nav').length;
    const header = document.querySelectorAll('header').length;
    const footer = document.querySelectorAll('footer').length;
    const buttons = [...document.querySelectorAll('button')];
    const buttonsWithoutLabel = buttons.filter((b) => {
      const txt = (b.textContent || '').trim();
      const al = b.getAttribute('aria-label');
      const alb = b.getAttribute('aria-labelledby');
      return !txt && !al && !alb;
    }).length;
    const anchors = [...document.querySelectorAll('a')];
    const anchorsWithoutText = anchors.filter((a) => {
      const txt = (a.textContent || '').trim();
      const al = a.getAttribute('aria-label');
      return !txt && !al;
    }).length;
    // heading hierarchy
    const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) =>
      parseInt(h.tagName[1], 10),
    );
    let skipped = [];
    for (let i = 1; i < headings.length; i++) {
      if (headings[i] - headings[i - 1] > 1) skipped.push({ from: headings[i - 1], to: headings[i], index: i });
    }
    // Images without alt
    const imgs = [...document.querySelectorAll('img')];
    const imgsWithoutAlt = imgs.filter((i) => !i.hasAttribute('alt')).length;
    const imgsLazy = imgs.filter((i) => i.getAttribute('loading') === 'lazy').length;
    const imgsWebp = imgs.filter((i) => /\.webp(\?|$)/i.test(i.currentSrc || i.src || '')).length;
    return {
      landmarks: { main, nav, header, footer },
      buttons: buttons.length,
      buttonsWithoutLabel,
      anchors: anchors.length,
      anchorsWithoutText,
      headingCount: headings.length,
      skippedHeadings: skipped,
      images: { total: imgs.length, withoutAlt: imgsWithoutAlt, lazy: imgsLazy, webp: imgsWebp },
    };
  });

  // Image broken check
  const brokenImages = await page.evaluate(() =>
    [...document.querySelectorAll('img')]
      .filter((i) => i.complete && i.naturalWidth === 0)
      .map((i) => i.currentSrc || i.src)
      .slice(0, 10),
  );

  // Keyboard nav (can we tab to a focusable element?)
  let kbTabbable = 0;
  try {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(50);
    kbTabbable = await page.evaluate(() => {
      const el = document.activeElement;
      return el && el !== document.body ? 1 : 0;
    });
  } catch { /* noop */ }

  // LCP element tag
  const lcpTag = await page.evaluate(() => {
    const entries = performance.getEntriesByType('largest-contentful-paint');
    const last = entries[entries.length - 1];
    if (!last || !last.element) return null;
    const el = last.element;
    return {
      tag: el.tagName,
      src: el.currentSrc || el.src || null,
      text: (el.textContent || '').trim().slice(0, 80),
    };
  });

  const key = `${pageDef.name}-${viewport}`;
  results.perf[key] = { url, loadMs, navErr, ...perf, lcpElement: lcpTag };
  results.seo[key] = seo;
  results.a11y[key] = { ...a11y, keyboardTabReached: kbTabbable };
  results.console[key] = consoleMsgs.slice(0, 25);
  results.network[key] = networkErrors.slice(0, 25);
  results.images[key] = { brokenSample: brokenImages };

  if (viewport === 'mobile') {
    const bug = await page.evaluate(() => {
      const body = document.body;
      const docEl = document.documentElement;
      const horizontalOverflow = docEl.scrollWidth > docEl.clientWidth + 2;
      const widest = [...document.querySelectorAll('*')]
        .map((e) => ({ tag: e.tagName, w: e.getBoundingClientRect().width }))
        .filter((x) => x.w > docEl.clientWidth)
        .slice(0, 5);
      return { horizontalOverflow, widest };
    });
    results.mobile[pageDef.name] = bug;
  }

  await ctx.close();
}

/* ---------- 4. Main ---------- */
(async () => {
  analyseBundle();
  await Promise.all([checkSitemap(), checkRobots()]);

  const browser = await chromium.launch({ headless: true });
  try {
    for (const p of pages) {
      await auditPage(browser, p, 'desktop');
      await auditPage(browser, p, 'mobile');
    }
  } finally {
    await browser.close();
  }

  results.meta.finishedAt = new Date().toISOString();
  writeFileSync(join(OUT_DIR, 'web-audit.json'), JSON.stringify(results, null, 2));
  console.log('Audit complete → .audit/web-audit.json');
})().catch((e) => {
  console.error('FATAL', e);
  writeFileSync(join(OUT_DIR, 'web-audit.json'), JSON.stringify({ ...results, fatal: String(e) }, null, 2));
  process.exit(1);
});
