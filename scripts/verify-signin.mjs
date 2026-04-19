// Final verify: no CSP errors on the sign-in page, OAuth redirect still works.
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });

await page.goto('https://tarotlife.app/?lang=en', { waitUntil: 'networkidle', timeout: 30000 });
await page.evaluate(() => [...document.querySelectorAll('a, button')].find(e => /sign ?in/i.test(e.innerText))?.click());
await page.waitForTimeout(2500);

// Snapshot console errors on the sign-in page
console.log('═══ Sign-in page URL ═══');
console.log(page.url());

console.log('\n═══ Console errors on sign-in page ═══');
if (errs.length === 0) console.log('✓ none');
else errs.slice(0, 15).forEach(e => console.log('  -', e));

// Now click Google
console.log('\n═══ Clicking Google ═══');
errs.length = 0;
const navPromise = page.waitForURL(u => /accounts\.google/.test(u.toString()), { timeout: 10000 }).catch(() => null);
await page.evaluate(() => [...document.querySelectorAll('button, a')].find(e => /continue with google|sign in with google/i.test(e.innerText))?.click());
await navPromise;
await page.waitForTimeout(2000);
console.log('Landed at:', page.url().slice(0, 150));
const onGoogle = /accounts\.google\.com/.test(page.url());
console.log(onGoogle ? '✓ successfully handed off to Google OAuth' : '✗ did not reach Google');

// Also check for PKCE challenge in the handoff
const hasPkce = page.url().includes('code_challenge') || (await page.evaluate(() => performance.getEntries().map(e => e.name).some(n => n.includes('code_challenge'))));
console.log(`PKCE flow: ${hasPkce ? '✓ code_challenge passed through' : '(handed off before PKCE logged)'}`);

await browser.close();
