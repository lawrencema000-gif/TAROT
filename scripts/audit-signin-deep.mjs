import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

const allConsole = [];
const failed = [];
const reqs = [];

page.on('console', m => allConsole.push(`[${m.type()}] ${m.text().slice(0, 300)}`));
page.on('requestfailed', r => failed.push(`${r.failure()?.errorText} ${r.url().slice(0, 180)}`));
page.on('request', r => {
  const u = r.url();
  if (/supabase\.co|accounts\.google|oauth|auth/i.test(u)) reqs.push(`${r.method()} ${u.slice(0, 180)}`);
});
page.on('response', r => {
  const u = r.url();
  if (/supabase\.co|accounts\.google|oauth|auth/i.test(u)) {
    const st = r.status();
    if (st >= 400 || (st >= 300 && st < 400)) reqs.push(`  ↳ ${st} ${u.slice(0, 180)}`);
  }
});

await page.addInitScript(() => {
  window.__csp = [];
  document.addEventListener('securitypolicyviolation', e => {
    window.__csp.push({ dir: e.violatedDirective, uri: e.blockedURI });
  });
});

console.log('═══ 1. Landing page ═══');
await page.goto('https://tarotlife.app/?lang=en', { waitUntil: 'networkidle', timeout: 30000 });

// Go to sign-in
console.log('\n═══ 2. Click Sign In ═══');
await page.evaluate(() => {
  const el = [...document.querySelectorAll('a, button')].find(e => /sign ?in/i.test(e.innerText));
  el?.click();
});
await page.waitForTimeout(2500);
console.log('URL now:', page.url());
console.log('Page has Google btn?', await page.evaluate(() => !!document.querySelector('button')));

console.log('\n═══ 3. Click Continue with Google ═══');
// Listen for navigation target
const navPromise = page.waitForURL(u => /accounts\.google\.com/.test(u.toString()), { timeout: 10000 }).catch(() => null);
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button, a')].find(e => /continue with google|sign in with google/i.test(e.innerText));
  btn?.click();
});
await navPromise;
await page.waitForTimeout(3000);
console.log('After Google click URL:', page.url().slice(0, 200));

console.log('\n═══ AUTH-RELATED NETWORK ═══');
reqs.slice(0, 30).forEach(r => console.log(r));

console.log('\n═══ CONSOLE (auth-related) ═══');
allConsole.filter(l => /auth|session|code|supabase|oauth|google/i.test(l)).slice(0, 25).forEach(l => console.log(l));

console.log('\n═══ ALL ERRORS ═══');
allConsole.filter(l => l.startsWith('[error]')).slice(0, 15).forEach(l => console.log(l));

console.log('\n═══ FAILED REQUESTS ═══');
failed.slice(0, 10).forEach(f => console.log(f));

const csp = await page.evaluate(() => window.__csp).catch(() => []);
console.log('\n═══ CSP violations ═══');
console.log(JSON.stringify(csp, null, 2));

await browser.close();
