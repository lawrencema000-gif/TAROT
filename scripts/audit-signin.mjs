// Live audit: navigate to /auth, click Google sign-in, capture all console/network/errors.
import { chromium } from 'playwright';

const URL = 'https://tarotlife.app/?lang=en';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, // mobile portrait
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
});
const page = await ctx.newPage();

const consoleMessages = [];
const netFails = [];
const cspViolations = [];
const pageErrors = [];

page.on('console', m => consoleMessages.push({ type: m.type(), text: m.text().slice(0, 500) }));
page.on('pageerror', e => pageErrors.push(String(e).slice(0, 500)));
page.on('requestfailed', r => netFails.push({ url: r.url().slice(0, 200), failure: r.failure()?.errorText }));

// CSP violations surface as securitypolicyviolation events — capture via JS
await page.addInitScript(() => {
  document.addEventListener('securitypolicyviolation', (e) => {
    const entry = { blockedURI: e.blockedURI, violatedDirective: e.violatedDirective, originalPolicy: e.originalPolicy.slice(0, 200) };
    window.__cspViolations = window.__cspViolations || [];
    window.__cspViolations.push(entry);
  });
});

console.log(`Navigating to ${URL}`);
await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });

console.log('Looking for sign-in entry');
// Try clicking "Sign In" link on landing
const clicked = await page.evaluate(() => {
  const candidates = [...document.querySelectorAll('a, button')].filter(el => /sign ?in|get started|start|log ?in/i.test(el.innerText));
  if (candidates.length) { candidates[0].click(); return candidates[0].innerText.trim(); }
  return null;
});
console.log('Clicked:', clicked);
await page.waitForTimeout(1500);

// On auth/onboarding page — find Google button
const googleBtn = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button, a')].find(el => /continue with google|sign in with google|google/i.test(el.innerText));
  if (!btn) return null;
  return { text: btn.innerText.trim(), outer: btn.outerHTML.slice(0, 400) };
});
console.log('Google button:', googleBtn);

if (googleBtn) {
  console.log('\n--- Clicking Google button ---');
  // Listen for the navigation (Supabase redirect)
  const [popup] = await Promise.all([
    page.waitForEvent('popup', { timeout: 5000 }).catch(() => null),
    page.evaluate(() => {
      const btn = [...document.querySelectorAll('button, a')].find(el => /continue with google|sign in with google|google/i.test(el.innerText));
      btn?.click();
    }),
  ]);
  await page.waitForTimeout(4000);
  console.log('After click, main page URL:', page.url());
  if (popup) console.log('Popup URL:', popup.url());
}

const csp = await page.evaluate(() => window.__cspViolations || []);

console.log('\n═══ CONSOLE ERRORS/WARNINGS ═══');
consoleMessages.filter(m => m.type === 'error' || m.type === 'warning').slice(0, 20).forEach(m => console.log(`[${m.type}]`, m.text));
console.log('\n═══ CSP VIOLATIONS ═══');
csp.slice(0, 20).forEach(v => console.log(JSON.stringify(v)));
console.log('\n═══ FAILED NETWORK REQUESTS ═══');
netFails.slice(0, 15).forEach(f => console.log(`${f.failure} | ${f.url}`));
console.log('\n═══ PAGE ERRORS ═══');
pageErrors.slice(0, 10).forEach(e => console.log(e));

await browser.close();
