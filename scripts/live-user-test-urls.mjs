// Deeper live test: capture exact URLs returning 4xx/5xx after sign-in
import { chromium } from 'playwright';

const EMAIL = process.env.TAROT_EMAIL;
const PASSWORD = process.env.TAROT_PASSWORD;

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

const failures = [];
page.on('response', async r => {
  const u = r.url();
  const st = r.status();
  if (st >= 400 && st < 600 && !/adtrafficquality|doubleclick|pagead2|google-analytics|google\.com\/g\/collect|google\.com\/pagead/i.test(u)) {
    let body = '';
    try { body = (await r.text()).slice(0, 200); } catch {}
    failures.push({ status: st, method: r.request().method(), url: u.slice(0, 250), body: body.replace(/\s+/g, ' ') });
  }
});

console.log('═══ Navigate to sign-in ═══');
await page.goto('https://tarotlife.app/?lang=en', { waitUntil: 'networkidle' });
await page.evaluate(() => [...document.querySelectorAll('a,button')].find(e => /sign ?in/i.test(e.innerText))?.click());
await page.waitForTimeout(2000);

await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.evaluate(() => {
  const submit = [...document.querySelectorAll('button')].find(b => /sign ?in/i.test(b.innerText) && !/google|facebook|apple/i.test(b.innerText));
  submit?.click();
});
await page.waitForTimeout(6000);
console.log('Signed in, URL:', page.url());

// Reset failures after sign-in so we capture post-auth errors
console.log(`\n═══ Pre-auth failures: ${failures.length} ═══`);
failures.forEach(f => console.log(`  ${f.status} ${f.method} ${f.url}`));
failures.length = 0;

// Wait more — let post-auth loads settle
await page.waitForTimeout(3000);

// Visit each tab and capture URL failures
const tabs = [
  { name: 'home', match: /home/i },
  { name: 'readings', match: /readings/i },
  { name: 'horoscope', match: /horoscope/i },
  { name: 'quizzes', match: /quizzes/i },
];

for (const t of tabs) {
  console.log(`\n═══ Tab: ${t.name} ═══`);
  await page.evaluate((re) => {
    const btn = [...document.querySelectorAll('button, a')].find(b => new RegExp(re, 'i').test(b.innerText) || new RegExp(re, 'i').test(b.getAttribute('aria-label') || ''));
    btn?.click();
  }, t.match.source);
  await page.waitForTimeout(2500);

  const myFailures = failures.splice(0);
  if (myFailures.length === 0) console.log('  ✓ no failures');
  else myFailures.forEach(f => console.log(`  ${f.status} ${f.method} ${f.url.slice(0, 180)}\n    body: ${f.body.slice(0, 150)}`));
}

// Profile
console.log('\n═══ More menu → Profile ═══');
await page.evaluate(() => [...document.querySelectorAll('button, a')].find(b => /more/i.test(b.innerText) || /more/i.test(b.getAttribute('aria-label') || ''))?.click());
await page.waitForTimeout(1000);
await page.evaluate(() => [...document.querySelectorAll('button, a')].find(b => /profile/i.test(b.innerText))?.click());
await page.waitForTimeout(2500);
const myFailures = failures.splice(0);
if (myFailures.length === 0) console.log('  ✓ no failures');
else myFailures.forEach(f => console.log(`  ${f.status} ${f.method} ${f.url.slice(0, 180)}\n    body: ${f.body.slice(0, 150)}`));

await browser.close();
