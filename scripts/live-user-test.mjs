// Live user test — walks through every major user surface in all 4 locales.
// Uses credentials passed via env: TAROT_EMAIL + TAROT_PASSWORD.
import { chromium } from 'playwright';
import fs from 'fs';

const EMAIL = process.env.TAROT_EMAIL;
const PASSWORD = process.env.TAROT_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error('Set TAROT_EMAIL + TAROT_PASSWORD in env');
  process.exit(1);
}

const REPORT = [];
const log = (s) => { console.log(s); REPORT.push(s); };

const browser = await chromium.launch({ headless: true });

async function runLocaleTour(lang) {
  log(`\n══════════════════════════════════════════`);
  log(`LOCALE: ${lang}`);
  log(`══════════════════════════════════════════`);

  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const page = await ctx.newPage();

  const consoleErrs = [];
  const netFails = [];
  const untranslatedKeys = [];
  page.on('console', m => {
    if (m.type() === 'error') {
      const t = m.text();
      // Filter out known ad noise
      if (!/adtrafficquality|doubleclick|pagead2|google-analytics.*collect|www\.google.*collect/i.test(t)) {
        consoleErrs.push(t.slice(0, 300));
      }
    }
    // i18next missingKey logger
    if (/missingKey|i18nextify|i18next::translator/i.test(m.text())) {
      untranslatedKeys.push(m.text().slice(0, 300));
    }
  });
  page.on('requestfailed', r => {
    const u = r.url();
    if (!/adtrafficquality|doubleclick|pagead2|google-analytics|collect/i.test(u)) {
      netFails.push(`${r.failure()?.errorText} ${u.slice(0, 150)}`);
    }
  });
  page.on('response', async r => {
    if (r.status() >= 500) {
      log(`  [${lang}] SERVER ERROR ${r.status()} ${r.url().slice(0, 120)}`);
    }
  });

  // Flag: are we picking up bare translation keys in UI?
  async function scanBareKeys() {
    const keys = await page.evaluate(() => {
      const bodyText = document.body.innerText || '';
      const matches = bodyText.match(/\b[a-z][a-zA-Z]+\.[a-z][a-zA-Z]+(\.[a-z][a-zA-Z]+)*/g) || [];
      return matches.filter(m => /^(readings|horoscope|premium|settings|auth|home|journal|achievements|compatibility|celebration|tarot|common|nav|actions|library|profile)\./.test(m)).slice(0, 15);
    });
    return keys;
  }

  async function snap(name) {
    try {
      await page.screenshot({ path: `.audit/screens/${lang}-${name}.png`, fullPage: false });
    } catch {}
  }

  try {
    // 1. Landing
    log(`\n[${lang}] 1. Landing page`);
    await page.goto(`https://tarotlife.app/?lang=${lang}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    const landingBare = await scanBareKeys();
    if (landingBare.length) log(`  ⚠ Bare keys on landing: ${landingBare.join(', ')}`);
    const htmlLang = await page.evaluate(() => document.documentElement.lang);
    log(`  html[lang] = "${htmlLang}" (expected: ${lang})`);
    await snap('01-landing');

    // 2. Click sign-in
    log(`\n[${lang}] 2. Navigate to sign-in`);
    await page.evaluate(() => {
      const el = [...document.querySelectorAll('a,button')].find(e => /sign ?in|ログイン|로그인|登录/i.test(e.innerText));
      el?.click();
    });
    await page.waitForTimeout(2000);
    await snap('02-auth-page');

    // 3. Email/password sign-in
    log(`\n[${lang}] 3. Email sign-in`);
    await page.evaluate((em) => {
      const emailInput = document.querySelector('input[type="email"]');
      if (emailInput) { emailInput.focus(); }
    }, EMAIL);
    await page.fill('input[type="email"]', EMAIL).catch(e => log(`  ✗ email input not found: ${e.message}`));
    await page.fill('input[type="password"]', PASSWORD).catch(e => log(`  ✗ password input not found: ${e.message}`));
    await snap('03-form-filled');

    // Click Sign In button
    await page.evaluate(() => {
      const submit = [...document.querySelectorAll('button[type="submit"], button')].find(b => /sign ?in|continue|ログイン|로그인|登录/i.test(b.innerText) && !/google|facebook|apple/i.test(b.innerText));
      if (submit) submit.click();
    });
    await page.waitForTimeout(5000);
    const urlAfterSignIn = page.url();
    log(`  URL after sign-in: ${urlAfterSignIn}`);
    const signedIn = await page.evaluate(() => {
      return !!document.querySelector('[role="tab"], nav[aria-label="Main navigation"], [class*="bottom"]') ||
             /home|tarot|horoscope/i.test(document.body.innerText);
    });
    log(`  Signed in = ${signedIn}`);
    await snap('04-after-signin');

    if (!signedIn) {
      log(`  ✗ SIGN-IN FAILED for ${lang} — abandoning rest of tour`);
      await ctx.close();
      return;
    }

    // 4. Home tab content scan
    log(`\n[${lang}] 4. Home tab`);
    await page.waitForTimeout(1500);
    const homeBare = await scanBareKeys();
    if (homeBare.length) log(`  ⚠ Bare keys on Home: ${homeBare.join(', ')}`);
    await snap('05-home');

    // 5. Navigate to each bottom-nav tab
    const tabs = [
      { name: 'readings', match: /リーディング|리딩|牌阵|readings/i },
      { name: 'horoscope', match: /星占い|별자리|星座|horoscope/i },
      { name: 'quizzes', match: /診断|퀴즈|测试|quizzes/i },
    ];
    for (const t of tabs) {
      log(`\n[${lang}] 5. Tab: ${t.name}`);
      try {
        await page.evaluate((re) => {
          const btns = [...document.querySelectorAll('button, a')];
          const tgt = btns.find(b => new RegExp(re, 'i').test(b.innerText) || new RegExp(re, 'i').test(b.getAttribute('aria-label') || ''));
          tgt?.click();
        }, t.match.source);
        await page.waitForTimeout(2500);
        const bare = await scanBareKeys();
        if (bare.length) log(`  ⚠ Bare keys on ${t.name}: ${bare.slice(0, 5).join(', ')}`);
        await snap(`06-${t.name}`);
      } catch (e) {
        log(`  ✗ Failed to navigate to ${t.name}: ${e.message}`);
      }
    }

    // 6. Open More menu → Profile
    log(`\n[${lang}] 6. More menu → Profile`);
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button, a')].find(b => /more|その他|더보기|更多/i.test(b.innerText) || /more/i.test(b.getAttribute('aria-label') || ''));
      btn?.click();
    });
    await page.waitForTimeout(1200);
    await snap('07-more-menu');

    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button, a')].find(b => /profile|プロフィール|프로필|个人资料/i.test(b.innerText));
      btn?.click();
    });
    await page.waitForTimeout(2000);
    const profileBare = await scanBareKeys();
    if (profileBare.length) log(`  ⚠ Bare keys on Profile: ${profileBare.slice(0, 5).join(', ')}`);
    await snap('08-profile');

    // 7. Summary for this locale
    log(`\n[${lang}] Console errors (non-ad): ${consoleErrs.length}`);
    consoleErrs.slice(0, 8).forEach(e => log(`   - ${e}`));
    log(`[${lang}] Untranslated key warnings: ${untranslatedKeys.length}`);
    untranslatedKeys.slice(0, 5).forEach(u => log(`   - ${u}`));
    log(`[${lang}] Failed network (non-ad): ${netFails.length}`);
    netFails.slice(0, 5).forEach(f => log(`   - ${f}`));
  } catch (err) {
    log(`[${lang}] FATAL: ${err.message}`);
  } finally {
    await ctx.close();
  }
}

fs.mkdirSync('.audit/screens', { recursive: true });
for (const l of ['en', 'ja', 'ko', 'zh']) {
  await runLocaleTour(l);
}

await browser.close();
fs.writeFileSync('.audit/live-user-test.log', REPORT.join('\n'));
log('\n\n✓ Report saved to .audit/live-user-test.log');
