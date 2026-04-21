/**
 * Live user audit for two reported-broken surfaces:
 *  1. Card meanings page — /tarot-meanings (deck index) + /tarot-meanings/<slug>
 *  2. Horoscope (astrology) tab in the authed app
 *
 * For each page: navigate, snapshot, dump body.innerText, capture console
 * errors + network failures + any blank-screen signal. Dumps everything
 * into .audit/audit-meanings-horoscope/ for forensics.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';

const EMAIL = process.env.TAROT_EMAIL ?? 'lawrence.ma000@gmail.com';
const PASSWORD = process.env.TAROT_PASSWORD ?? 'Mmd208608!';

const OUT = '.audit/audit-meanings-horoscope';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

const findings = {};
let currentLabel = 'boot';
const errorsByLabel = {};

function ensureBucket(label) {
  if (!errorsByLabel[label]) errorsByLabel[label] = { console: [], pageerror: [], networkFail: [], statusFail: [] };
  return errorsByLabel[label];
}

page.on('pageerror', (e) => ensureBucket(currentLabel).pageerror.push(e.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') ensureBucket(currentLabel).console.push(msg.text().slice(0, 300));
});
page.on('requestfailed', (req) => {
  ensureBucket(currentLabel).networkFail.push(`${req.failure()?.errorText ?? '?'} ${req.method()} ${req.url().slice(0, 120)}`);
});
page.on('response', (res) => {
  if (res.status() >= 400) {
    ensureBucket(currentLabel).statusFail.push(`${res.status()} ${res.request().method()} ${res.url().slice(0, 120)}`);
  }
});

async function snapshot(label) {
  currentLabel = label;
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${OUT}/${label}.png`, fullPage: true });
  const body = await page.evaluate(() => document.body.innerText);
  const html = await page.evaluate(() => document.documentElement.outerHTML.length);
  findings[label] = {
    url: page.url(),
    bodyChars: body.length,
    htmlBytes: html,
    firstLines: body.split('\n').slice(0, 12).join(' | '),
  };
  fs.writeFileSync(`${OUT}/${label}.txt`, body);
}

async function clickByText(re) {
  return await page.evaluate((src) => {
    const r = new RegExp(src, 'i');
    const els = [...document.querySelectorAll('button, a, [role="tab"], [role="button"], div[class*="cursor-pointer"]')];
    const b = els.find((el) => r.test(el.innerText) || r.test(el.getAttribute('aria-label') || ''));
    if (b) { b.click(); return b.innerText.trim().slice(0, 60); }
    return null;
  }, re.source);
}

try {
  // ─── 1. PUBLIC /tarot-meanings deck index ────────────────────────────────
  await page.goto('https://tarotlife.app/tarot-meanings', { waitUntil: 'networkidle', timeout: 30000 });
  await snapshot('1-tarot-meanings-index');

  // ─── 2. A specific card: The Fool ─────────────────────────────────────────
  await page.goto('https://tarotlife.app/tarot-meanings/the-fool', { waitUntil: 'networkidle', timeout: 30000 });
  await snapshot('2-tarot-meanings-the-fool');

  // ─── 3. The Tower ────────────────────────────────────────────────────────
  await page.goto('https://tarotlife.app/tarot-meanings/the-tower', { waitUntil: 'networkidle', timeout: 30000 });
  await snapshot('3-tarot-meanings-the-tower');

  // ─── 4. Three of Cups (minor arcana) ─────────────────────────────────────
  await page.goto('https://tarotlife.app/tarot-meanings/three-of-cups', { waitUntil: 'networkidle', timeout: 30000 });
  await snapshot('4-tarot-meanings-three-of-cups');

  // ─── 5. Sign in for horoscope tab ────────────────────────────────────────
  await page.goto('https://tarotlife.app/', { waitUntil: 'networkidle', timeout: 30000 });
  await clickByText(/sign ?in/);
  await page.waitForTimeout(1500);
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(
      (b) => /sign ?in/i.test(b.innerText) && !/google|facebook|apple/i.test(b.innerText),
    );
    btn?.click();
  });
  await page.waitForTimeout(10000);
  await snapshot('5-post-signin-home');

  // ─── 6. Horoscope tab (bottom nav) ────────────────────────────────────────
  await clickByText(/^horoscope$/i);
  await page.waitForTimeout(3000);
  await snapshot('6-horoscope-today');

  // ─── 7. Horoscope → Chart sub-tab ────────────────────────────────────────
  await clickByText(/chart|birth chart/i);
  await page.waitForTimeout(2500);
  await snapshot('7-horoscope-chart');

  // ─── 8. Horoscope → Forecast ─────────────────────────────────────────────
  await clickByText(/forecast/i);
  await page.waitForTimeout(2500);
  await snapshot('8-horoscope-forecast');

  // ─── 9. Horoscope → Explore ──────────────────────────────────────────────
  await clickByText(/explore/i);
  await page.waitForTimeout(2500);
  await snapshot('9-horoscope-explore');

  // ─── 10. Readings → Horoscope sub-tab (different surface) ────────────────
  await clickByText(/readings/i);
  await page.waitForTimeout(1500);
  await clickByText(/^horoscope$/i);
  await page.waitForTimeout(2500);
  await snapshot('10-readings-horoscope-subtab');

} catch (e) {
  findings['_fatal'] = String(e instanceof Error ? e.message : e);
}

fs.writeFileSync(`${OUT}/findings.json`, JSON.stringify(findings, null, 2));
fs.writeFileSync(`${OUT}/errors.json`, JSON.stringify(errorsByLabel, null, 2));

console.log('\n=== AUDIT SUMMARY ===');
for (const [label, data] of Object.entries(findings)) {
  if (label.startsWith('_')) { console.log(`\n!!! ${label}: ${data}`); continue; }
  const errs = errorsByLabel[label] || { console: [], pageerror: [], networkFail: [], statusFail: [] };
  const totalErrs = errs.console.length + errs.pageerror.length + errs.networkFail.length + errs.statusFail.length;
  const flag = data.bodyChars < 200 ? ' [BLANK?]' : '';
  console.log(`\n[${label}]${flag} url=${data.url}`);
  console.log(`  body=${data.bodyChars} chars, html=${data.htmlBytes} bytes`);
  console.log(`  first lines: ${data.firstLines.slice(0, 200)}`);
  if (totalErrs > 0) {
    console.log(`  errors: console=${errs.console.length} pageerror=${errs.pageerror.length} net=${errs.networkFail.length} 4xx5xx=${errs.statusFail.length}`);
    errs.pageerror.slice(0, 3).forEach((e) => console.log(`    ! pageerror: ${e.slice(0, 200)}`));
    errs.console.slice(0, 3).forEach((e) => console.log(`    ! console: ${e}`));
    errs.statusFail.slice(0, 3).forEach((e) => console.log(`    ! status: ${e}`));
  }
}

await browser.close();
