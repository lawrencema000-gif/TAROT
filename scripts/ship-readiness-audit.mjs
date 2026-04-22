// Ship-readiness end-to-end audit — walks EVERY major logged-in flow on tarotlife.app
// Captures per-flow: screenshots, body.innerText, console errors, network failures, pageerrors.
// Usage: TAROT_EMAIL=... TAROT_PASSWORD=... node scripts/ship-readiness-audit.mjs
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const EMAIL = process.env.TAROT_EMAIL;
const PASSWORD = process.env.TAROT_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error('Set TAROT_EMAIL + TAROT_PASSWORD');
  process.exit(1);
}

const BASE = 'https://tarotlife.app';
const OUT_ROOT = path.resolve('.audit/ship-readiness');
fs.mkdirSync(OUT_ROOT, { recursive: true });

const globalEvents = {
  consoleErrors: [],
  pageErrors: [],
  netFailures: [],
  httpErrors: [],
};

const flowResults = []; // { id, title, verdict, notes[], errors[], netFailures[], pageErrors[] }

// noise filter
const NOISE = /adtrafficquality|doubleclick|pagead2|googlesyndication|google-analytics|googletagmanager|www\.google\.com\/(pagead|ads|adsid)|fundingchoicesmessages|gstatic\.com\/cv\/js|analytics\.google|admob|collect\?v=|beacon\.min|sentry_key|ingest\.sentry|o[0-9]+\.ingest/i;

function makeFlowDir(id) {
  const dir = path.join(OUT_ROOT, id);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function newFlow(id, title) {
  const flow = {
    id, title, verdict: 'unknown',
    notes: [], errors: [], netFailures: [], pageErrors: [], httpErrors: [],
    dir: makeFlowDir(id),
  };
  flowResults.push(flow);
  return flow;
}

async function snap(page, flow, name) {
  try {
    await page.screenshot({ path: path.join(flow.dir, `${name}.png`), fullPage: false });
  } catch (e) {
    flow.notes.push(`snap(${name}) failed: ${e.message}`);
  }
}

async function snapText(page, flow, name) {
  try {
    const text = await page.evaluate(() => document.body?.innerText || '');
    fs.writeFileSync(path.join(flow.dir, `${name}.txt`), text);
    return text;
  } catch (e) {
    flow.notes.push(`snapText(${name}) failed: ${e.message}`);
    return '';
  }
}

function attachListeners(page, getFlow) {
  page.on('console', m => {
    if (m.type() === 'error') {
      const text = m.text();
      if (NOISE.test(text)) return;
      const flow = getFlow();
      const entry = text.slice(0, 600);
      globalEvents.consoleErrors.push({ flow: flow?.id, text: entry });
      flow?.errors.push(entry);
    }
  });
  page.on('pageerror', err => {
    const flow = getFlow();
    const entry = `${err.name}: ${err.message}`;
    globalEvents.pageErrors.push({ flow: flow?.id, text: entry, stack: err.stack?.slice(0, 800) });
    flow?.pageErrors.push(entry);
  });
  page.on('requestfailed', r => {
    const u = r.url();
    if (NOISE.test(u)) return;
    const flow = getFlow();
    const entry = `${r.failure()?.errorText || 'failed'} ${r.method()} ${u.slice(0, 200)}`;
    globalEvents.netFailures.push({ flow: flow?.id, text: entry });
    flow?.netFailures.push(entry);
  });
  page.on('response', r => {
    const st = r.status();
    const u = r.url();
    if (st < 400) return;
    if (NOISE.test(u)) return;
    const flow = getFlow();
    const entry = `HTTP ${st} ${r.request().method()} ${u.slice(0, 200)}`;
    globalEvents.httpErrors.push({ flow: flow?.id, text: entry });
    flow?.httpErrors.push(entry);
  });
}

async function clickByText(page, regex, opts = {}) {
  const handle = await page.evaluateHandle((src) => {
    const re = new RegExp(src, 'i');
    const els = [...document.querySelectorAll('button, a, [role="tab"], [role="button"]')];
    return els.find(e => re.test((e.innerText || '').trim()) || re.test(e.getAttribute('aria-label') || '')) || null;
  }, regex.source || regex);
  const el = handle.asElement();
  if (!el) {
    if (opts.throw) throw new Error(`Element not found for regex: ${regex}`);
    return false;
  }
  await el.scrollIntoViewIfNeeded().catch(() => {});
  await el.click({ timeout: 5000 }).catch(() => {});
  return true;
}

async function clickBottomNav(page, label) {
  // Prefer tab role + aria-label match
  const ok = await page.evaluate((lbl) => {
    const re = new RegExp(`^${lbl}$`, 'i');
    const tabs = [...document.querySelectorAll('[role="tab"]')];
    const hit = tabs.find(t => re.test((t.getAttribute('aria-label') || '').trim()));
    if (hit) { hit.click(); return true; }
    return false;
  }, label);
  if (ok) return true;
  return clickByText(page, new RegExp(`^\\s*${label}\\s*$`, 'i'));
}

async function waitIdle(page, ms = 1500) {
  await page.waitForTimeout(ms);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 414, height: 896 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const page = await ctx.newPage();

  let currentFlow = null;
  attachListeners(page, () => currentFlow);

  // ================================================================
  // FLOW 1: Sign-in
  // ================================================================
  {
    const flow = currentFlow = newFlow('01-signin', 'Sign in with email/password + session + home render');
    try {
      await page.goto(`${BASE}/?lang=en`, { waitUntil: 'networkidle', timeout: 45000 });
      await waitIdle(page, 1500);
      await snap(page, flow, '01-landing');

      // Go to auth
      const signInClicked = await clickByText(page, /^sign ?in$/i) || await clickByText(page, /sign ?in/i);
      flow.notes.push(`sign-in button clicked: ${signInClicked}`);
      await waitIdle(page, 2000);
      await snap(page, flow, '02-auth-page');
      const authUrl = page.url();
      flow.notes.push(`auth URL: ${authUrl}`);

      // Fill credentials
      const emailOK = await page.fill('input[type="email"]', EMAIL).then(() => true).catch(() => false);
      const pwOK = await page.fill('input[type="password"]', PASSWORD).then(() => true).catch(() => false);
      flow.notes.push(`email filled: ${emailOK}, password filled: ${pwOK}`);
      await snap(page, flow, '03-form-filled');

      // Submit
      const submitted = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button[type="submit"], button')]
          .find(b => /^sign ?in$|^log ?in$|^continue$/i.test((b.innerText || '').trim()) && !/google|facebook|apple/i.test(b.innerText));
        if (btn) { btn.click(); return true; }
        // fallback: any form submit
        const form = document.querySelector('form');
        if (form) { form.requestSubmit ? form.requestSubmit() : form.submit(); return 'form-submit'; }
        return false;
      });
      flow.notes.push(`submit result: ${submitted}`);
      await page.waitForTimeout(6000);
      await snap(page, flow, '04-after-signin');
      const after = page.url();
      flow.notes.push(`URL after sign-in: ${after}`);

      const text = await snapText(page, flow, 'body');
      const isSignedIn = await page.evaluate(() => !!document.querySelector('nav[aria-label="Main navigation"]') || !!document.querySelector('[role="tab"]'));
      flow.notes.push(`bottom nav present: ${isSignedIn}`);

      flow.verdict = isSignedIn ? 'pass' : 'fail';
      if (!isSignedIn) flow.notes.push(`BODY excerpt: ${text.slice(0, 400)}`);
    } catch (e) {
      flow.verdict = 'fail';
      flow.notes.push(`FATAL: ${e.message}`);
    }
  }

  // If not signed in, bail
  const signedIn = await page.evaluate(() =>
    !!document.querySelector('nav[aria-label="Main navigation"]') || !!document.querySelector('[role="tab"]')
  );
  if (!signedIn) {
    console.log('SIGN-IN FAILED — skipping downstream flows');
  } else {
    // ================================================================
    // FLOW 2: Bottom nav tour
    // ================================================================
    const tabs = [
      { id: '02a-home', label: 'Home' },
      { id: '02b-readings', label: 'Readings' },
      { id: '02c-horoscope', label: 'Horoscope' },
      { id: '02d-quizzes', label: 'Quizzes' },
      { id: '02e-more', label: 'More' },
    ];
    for (const t of tabs) {
      const flow = currentFlow = newFlow(t.id, `Bottom-nav: ${t.label}`);
      try {
        const clicked = await clickBottomNav(page, t.label);
        flow.notes.push(`tab "${t.label}" clicked: ${clicked}`);
        await waitIdle(page, 2500);
        await snap(page, flow, 'screen');
        const text = await snapText(page, flow, 'body');
        if (!text || text.length < 20) flow.notes.push('BLANK OR NEAR-EMPTY BODY');
        if (/loading\.{0,3}$/im.test(text.trim()) && text.trim().length < 50) flow.notes.push('STUCK LOADING');
        flow.verdict = (!text || text.length < 20) ? 'warn' : 'pass';
      } catch (e) {
        flow.verdict = 'fail';
        flow.notes.push(`error: ${e.message}`);
      }
      // close More panel if open
      await page.keyboard.press('Escape').catch(() => {});
      await waitIdle(page, 500);
    }

    // ================================================================
    // FLOW 3: Readings → Tarot → Money → 1-Card Daily → Draw + AI
    // ================================================================
    {
      const flow = currentFlow = newFlow('03-tarot-money', 'Tarot: Money topic → 1-Card Daily → Draw → AI interpret');
      try {
        await clickBottomNav(page, 'Readings');
        await waitIdle(page, 2000);
        await snap(page, flow, '01-readings');
        // Ensure Tarot sub-tab
        await clickByText(page, /^tarot$/i);
        await waitIdle(page, 1500);
        await snap(page, flow, '02-tarot-tab');
        const beforeText = await snapText(page, flow, 'tarot-tab-body');

        // Pick Money topic
        const moneyClicked = await clickByText(page, /money|finance|career.?&?.?money/i);
        flow.notes.push(`Money topic clicked: ${moneyClicked}`);
        await waitIdle(page, 1200);
        await snap(page, flow, '03-money-picked');

        // Pick 1-card daily spread
        const dailyClicked =
          (await clickByText(page, /1.?card.*daily|daily.*1.?card|1.?card/i)) ||
          (await clickByText(page, /daily/i));
        flow.notes.push(`1-card daily clicked: ${dailyClicked}`);
        await waitIdle(page, 1500);
        await snap(page, flow, '04-spread-picked');

        // Draw
        const drew =
          (await clickByText(page, /^\s*draw\s*(card|cards)?\s*$/i)) ||
          (await clickByText(page, /draw/i)) ||
          (await clickByText(page, /shuffle.*draw|begin|start/i));
        flow.notes.push(`Draw clicked: ${drew}`);
        await waitIdle(page, 3000);
        await snap(page, flow, '05-drawn');

        // Reveal (tap the card)
        const revealed =
          (await clickByText(page, /reveal|tap to reveal|flip/i));
        if (!revealed) {
          // try clicking the card element
          await page.evaluate(() => {
            const cards = [...document.querySelectorAll('img, [role="button"], button, [class*="card"]')].filter(e => {
              const r = e.getBoundingClientRect();
              return r.width > 100 && r.height > 150;
            });
            cards[0]?.click();
          });
        }
        flow.notes.push(`Revealed action tried: ${revealed || 'DOM click'}`);
        await waitIdle(page, 2500);
        await snap(page, flow, '06-revealed');
        await snapText(page, flow, 'revealed-body');

        // Request AI interpretation
        const aiClicked =
          (await clickByText(page, /ai interpretation|interpret.*ai|ask.*ai|generate.*interpretation|deeper.*reading|get.*insight/i)) ||
          (await clickByText(page, /interpret/i));
        flow.notes.push(`AI interpret clicked: ${aiClicked}`);
        await waitIdle(page, 8000);
        await snap(page, flow, '07-ai-output');
        const aiText = await snapText(page, flow, 'ai-output-body');

        const aiSuccess = !/error|failed|try again|something went wrong/i.test(aiText.slice(-600)) && aiText.length > 400;
        flow.notes.push(`AI interpretation appears successful: ${aiSuccess}`);
        flow.verdict = aiClicked && aiSuccess ? 'pass' : (aiClicked ? 'warn' : 'fail');
      } catch (e) {
        flow.verdict = 'fail';
        flow.notes.push(`error: ${e.message}`);
      }
    }

    // ================================================================
    // FLOW 4: Readings → Horoscope sub-tab
    // ================================================================
    {
      const flow = currentFlow = newFlow('04-readings-horoscope', 'Readings → Horoscope sub-tab scroll/content');
      try {
        await clickBottomNav(page, 'Readings');
        await waitIdle(page, 1500);
        await clickByText(page, /^horoscope$/i);
        await waitIdle(page, 2000);
        await snap(page, flow, '01-horoscope-subtab');
        // scroll
        for (let i = 0; i < 5; i++) {
          await page.evaluate(() => window.scrollBy(0, 600));
          await waitIdle(page, 400);
        }
        await snap(page, flow, '02-after-scroll');
        const text = await snapText(page, flow, 'body');
        flow.verdict = text.length > 200 ? 'pass' : 'warn';
      } catch (e) { flow.verdict = 'fail'; flow.notes.push(e.message); }
    }

    // ================================================================
    // FLOW 5: Readings → Compatibility → enter partner sign
    // ================================================================
    {
      const flow = currentFlow = newFlow('05-compatibility', 'Readings → Compatibility → partner sign');
      try {
        await clickBottomNav(page, 'Readings');
        await waitIdle(page, 1500);
        await clickByText(page, /^compatibility$/i);
        await waitIdle(page, 2000);
        await snap(page, flow, '01-compat');
        await snapText(page, flow, 'compat-body');

        // Try to pick a partner sign — e.g., click "Leo"
        const picked =
          (await clickByText(page, /\bleo\b/i)) ||
          (await clickByText(page, /\baries\b|\btaurus\b|\bgemini\b/i));
        flow.notes.push(`partner sign clicked: ${picked}`);
        await waitIdle(page, 2500);
        await snap(page, flow, '02-partner-picked');
        // Maybe a Compare/Analyze button
        await clickByText(page, /compare|analy[sz]e|check|go|reveal|generate/i);
        await waitIdle(page, 4000);
        await snap(page, flow, '03-compat-result');
        const t = await snapText(page, flow, 'compat-result-body');
        flow.verdict = picked && t.length > 400 ? 'pass' : (picked ? 'warn' : 'warn');
      } catch (e) { flow.verdict = 'fail'; flow.notes.push(e.message); }
    }

    // ================================================================
    // FLOW 6: Readings → Library → open Tarot Basics guide
    // ================================================================
    {
      const flow = currentFlow = newFlow('06-library', 'Readings → Library → open Tarot Basics');
      try {
        await clickBottomNav(page, 'Readings');
        await waitIdle(page, 1500);
        await clickByText(page, /^library$/i);
        await waitIdle(page, 2000);
        await snap(page, flow, '01-library');
        await snapText(page, flow, 'library-body');

        const opened = await clickByText(page, /tarot basics|basics/i);
        flow.notes.push(`Tarot Basics clicked: ${opened}`);
        await waitIdle(page, 2500);
        await snap(page, flow, '02-guide-opened');
        const t = await snapText(page, flow, 'guide-body');
        flow.verdict = opened && t.length > 500 ? 'pass' : (opened ? 'warn' : 'fail');
      } catch (e) { flow.verdict = 'fail'; flow.notes.push(e.message); }
    }

    // ================================================================
    // FLOW 7: Horoscope tab → Today / Chart / Forecast / Explore
    // ================================================================
    {
      const subtabs = ['Today', 'Chart', 'Forecast', 'Explore'];
      for (let i = 0; i < subtabs.length; i++) {
        const sub = subtabs[i];
        const flow = currentFlow = newFlow(`07${String.fromCharCode(97 + i)}-horoscope-${sub.toLowerCase()}`, `Horoscope → ${sub}`);
        try {
          await clickBottomNav(page, 'Horoscope');
          await waitIdle(page, 1500);
          const c = await clickByText(page, new RegExp(`^\\s*${sub}\\s*$`, 'i'));
          flow.notes.push(`${sub} sub-tab click: ${c}`);
          await waitIdle(page, 2500);
          await snap(page, flow, 'screen');
          const t = await snapText(page, flow, 'body');
          flow.verdict = c && t.length > 200 ? 'pass' : (c ? 'warn' : 'warn');
        } catch (e) { flow.verdict = 'fail'; flow.notes.push(e.message); }
      }
    }

    // ================================================================
    // FLOW 8: Quizzes → start MBTI → 3 questions
    // ================================================================
    {
      const flow = currentFlow = newFlow('08-quizzes-mbti', 'Quizzes → MBTI → answer 3 questions');
      try {
        await clickBottomNav(page, 'Quizzes');
        await waitIdle(page, 2000);
        await snap(page, flow, '01-quizzes-list');
        await snapText(page, flow, 'list-body');

        const started =
          (await clickByText(page, /mbti|myers.?briggs|16.*personalit/i));
        flow.notes.push(`MBTI clicked: ${started}`);
        await waitIdle(page, 1500);
        // click Start button if present
        await clickByText(page, /^start$|begin|start quiz|take.*quiz/i);
        await waitIdle(page, 2500);
        await snap(page, flow, '02-q1');
        await snapText(page, flow, 'q1-body');

        for (let q = 1; q <= 3; q++) {
          // answer: click first answer-like button
          const answered = await page.evaluate(() => {
            const btns = [...document.querySelectorAll('button')].filter(b => {
              const txt = (b.innerText || '').trim();
              return txt.length > 2 && txt.length < 200 &&
                !/^\s*(next|back|skip|start|cancel|close|sign|log|home|readings|horoscope|quizzes|more|settings)\s*$/i.test(txt);
            });
            btns[0]?.click();
            return !!btns[0];
          });
          flow.notes.push(`Q${q} answered: ${answered}`);
          await waitIdle(page, 1500);
          // click Next if visible
          await clickByText(page, /^\s*next\s*$/i);
          await waitIdle(page, 1500);
          await snap(page, flow, `03-after-q${q}`);
        }
        await snapText(page, flow, 'after-3q-body');
        flow.verdict = started ? 'pass' : 'warn';
      } catch (e) { flow.verdict = 'fail'; flow.notes.push(e.message); }
    }

    // ================================================================
    // FLOW 9: More → Profile → XP / streak / rank
    // ================================================================
    {
      const flow = currentFlow = newFlow('09-profile', 'More → Profile: XP / streak / rank');
      try {
        await clickBottomNav(page, 'More');
        await waitIdle(page, 1200);
        await snap(page, flow, '01-more-open');
        await clickByText(page, /^profile$/i);
        await waitIdle(page, 2500);
        await snap(page, flow, '02-profile');
        const t = await snapText(page, flow, 'profile-body');
        const hasXp = /\bxp\b|experience/i.test(t);
        const hasStreak = /streak/i.test(t);
        const hasRank = /rank|level/i.test(t);
        flow.notes.push(`XP present: ${hasXp}, Streak present: ${hasStreak}, Rank/Level present: ${hasRank}`);
        flow.verdict = (hasXp || hasStreak || hasRank) ? 'pass' : 'warn';
      } catch (e) { flow.verdict = 'fail'; flow.notes.push(e.message); }
    }

    // ================================================================
    // FLOW 10: Settings → Language → JA and back
    // ================================================================
    {
      const flow = currentFlow = newFlow('10-language-switch', 'Settings → Language → JA → EN');
      try {
        await clickBottomNav(page, 'More');
        await waitIdle(page, 1000);
        // Settings might be under More or on Profile
        let settingsOpened = await clickByText(page, /^settings$/i);
        if (!settingsOpened) {
          // Try Profile → settings icon
          await clickByText(page, /^profile$/i);
          await waitIdle(page, 1500);
          settingsOpened = await clickByText(page, /^settings$/i);
        }
        flow.notes.push(`Settings opened: ${settingsOpened}`);
        await waitIdle(page, 2000);
        await snap(page, flow, '01-settings');
        await snapText(page, flow, 'settings-body');

        await clickByText(page, /language/i);
        await waitIdle(page, 1500);
        await snap(page, flow, '02-lang-open');
        // Pick Japanese
        const ja = await clickByText(page, /japanese|日本語|にほんご|ja\b/i);
        flow.notes.push(`Japanese clicked: ${ja}`);
        await waitIdle(page, 2500);
        await snap(page, flow, '03-ja-selected');

        // Confirm button if any
        await clickByText(page, /save|apply|confirm|ok|done|完了|保存/i);
        await waitIdle(page, 2000);

        // Go home and verify
        await clickBottomNav(page, 'Home');
        await waitIdle(page, 2500);
        await snap(page, flow, '04-home-ja');
        const jaText = await snapText(page, flow, 'home-ja');
        const htmlLang = await page.evaluate(() => document.documentElement.lang);
        flow.notes.push(`html[lang] after JA switch: ${htmlLang}`);
        const looksJa = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(jaText);
        flow.notes.push(`Japanese chars present on home: ${looksJa}`);

        // Switch back to English
        await clickBottomNav(page, 'More');
        await waitIdle(page, 1000);
        await clickByText(page, /設定|settings/i);
        await waitIdle(page, 2000);
        await clickByText(page, /言語|language/i);
        await waitIdle(page, 1200);
        await clickByText(page, /english|英語|英文|en\b/i);
        await waitIdle(page, 2000);
        await clickByText(page, /save|apply|confirm|ok|done|保存/i);
        await waitIdle(page, 2000);
        await clickBottomNav(page, 'Home');
        await waitIdle(page, 2000);
        await snap(page, flow, '05-home-en-back');
        const enText = await snapText(page, flow, 'home-en-back');
        const backToEn = /Home|Readings|Horoscope/i.test(enText) && !/[\u3040-\u309f\u30a0-\u30ff]/.test(enText.slice(0, 300));
        flow.notes.push(`Back to English: ${backToEn}`);
        flow.verdict = (ja && looksJa && backToEn) ? 'pass' : 'warn';
      } catch (e) { flow.verdict = 'fail'; flow.notes.push(e.message); }
    }

    // ================================================================
    // FLOW 11: Sign out → redirect to landing → no crash
    // ================================================================
    {
      const flow = currentFlow = newFlow('11-signout', 'Sign out from Settings → redirect to landing');
      try {
        await clickBottomNav(page, 'More');
        await waitIdle(page, 1000);
        await clickByText(page, /^settings$/i);
        await waitIdle(page, 2000);
        await snap(page, flow, '01-settings');
        // scroll to bottom
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await waitIdle(page, 600);
        await snap(page, flow, '02-settings-bottom');
        const signedOut = await clickByText(page, /sign ?out|log ?out/i);
        flow.notes.push(`sign-out clicked: ${signedOut}`);
        await waitIdle(page, 1500);
        // confirm if prompted
        await clickByText(page, /confirm|yes|sign ?out|log ?out/i);
        await waitIdle(page, 4000);
        await snap(page, flow, '03-after-signout');
        const url = page.url();
        const text = await snapText(page, flow, 'after-signout');
        flow.notes.push(`URL after sign-out: ${url}`);
        const onLanding = !(await page.evaluate(() => !!document.querySelector('nav[aria-label="Main navigation"]')));
        const hasContent = text.length > 100;
        flow.notes.push(`On landing (no bottom nav): ${onLanding}, body has content: ${hasContent}`);
        flow.verdict = (signedOut && onLanding && hasContent) ? 'pass' : 'warn';
      } catch (e) { flow.verdict = 'fail'; flow.notes.push(e.message); }
    }

    // ================================================================
    // FLOW 12: Sign back in → verify session resumes
    // ================================================================
    {
      const flow = currentFlow = newFlow('12-signin-again', 'Sign back in — session resumes cleanly');
      try {
        await clickByText(page, /^sign ?in$/i) || await clickByText(page, /sign ?in/i);
        await waitIdle(page, 2500);
        await snap(page, flow, '01-auth');
        await page.fill('input[type="email"]', EMAIL).catch(() => {});
        await page.fill('input[type="password"]', PASSWORD).catch(() => {});
        await page.evaluate(() => {
          const btn = [...document.querySelectorAll('button[type="submit"], button')]
            .find(b => /^sign ?in$|^log ?in$|^continue$/i.test((b.innerText || '').trim()) && !/google|facebook|apple/i.test(b.innerText));
          if (btn) { btn.click(); return; }
          const form = document.querySelector('form');
          if (form) form.requestSubmit?.();
        });
        await waitIdle(page, 6000);
        await snap(page, flow, '02-after-signin-again');
        const text = await snapText(page, flow, 'home-again');
        const ok = await page.evaluate(() => !!document.querySelector('nav[aria-label="Main navigation"]'));
        flow.notes.push(`bottom nav present after re-signin: ${ok}`);
        flow.verdict = ok && text.length > 100 ? 'pass' : 'fail';
      } catch (e) { flow.verdict = 'fail'; flow.notes.push(e.message); }
    }
  }

  // Write summary report
  const summary = [];
  summary.push(`# Ship-Readiness Audit — tarotlife.app\n`);
  summary.push(`Run: ${new Date().toISOString()}`);
  summary.push(`Account: ${EMAIL}\n`);

  const icon = v => v === 'pass' ? '✅' : v === 'warn' ? '⚠️' : v === 'fail' ? '❌' : '❓';

  summary.push(`## Verdicts\n`);
  summary.push(`| Flow | Verdict |`);
  summary.push(`|---|---|`);
  for (const f of flowResults) summary.push(`| ${f.id} — ${f.title} | ${icon(f.verdict)} ${f.verdict} |`);

  summary.push(`\n## Global Totals`);
  summary.push(`- Console errors: **${globalEvents.consoleErrors.length}**`);
  summary.push(`- Page errors (uncaught): **${globalEvents.pageErrors.length}**`);
  summary.push(`- Network failures: **${globalEvents.netFailures.length}**`);
  summary.push(`- HTTP 4xx/5xx: **${globalEvents.httpErrors.length}**`);

  summary.push(`\n## Per-Flow Detail\n`);
  for (const f of flowResults) {
    summary.push(`### ${icon(f.verdict)} ${f.id} — ${f.title}`);
    summary.push(`- Verdict: **${f.verdict}**`);
    summary.push(`- Artifacts: \`${f.dir}\``);
    if (f.notes.length) {
      summary.push(`- Notes:`);
      for (const n of f.notes) summary.push(`  - ${n}`);
    }
    if (f.pageErrors.length) {
      summary.push(`- Uncaught page errors:`);
      for (const e of f.pageErrors) summary.push(`  - \`${e}\``);
    }
    if (f.errors.length) {
      summary.push(`- Console errors (${f.errors.length}):`);
      for (const e of f.errors.slice(0, 10)) summary.push(`  - \`${e}\``);
      if (f.errors.length > 10) summary.push(`  - ...and ${f.errors.length - 10} more`);
    }
    if (f.netFailures.length) {
      summary.push(`- Network failures:`);
      for (const e of f.netFailures.slice(0, 10)) summary.push(`  - \`${e}\``);
    }
    if (f.httpErrors.length) {
      summary.push(`- HTTP 4xx/5xx:`);
      for (const e of f.httpErrors.slice(0, 10)) summary.push(`  - \`${e}\``);
    }
    summary.push('');
  }

  summary.push(`\n## All Unique Console Errors`);
  const uniq = [...new Set(globalEvents.consoleErrors.map(e => e.text))];
  for (const e of uniq) summary.push(`- \`${e}\``);

  summary.push(`\n## All Uncaught Page Errors`);
  const uniqP = [...new Set(globalEvents.pageErrors.map(e => e.text))];
  for (const e of uniqP) summary.push(`- \`${e}\``);

  summary.push(`\n## All HTTP 4xx/5xx Responses`);
  const uniqH = [...new Set(globalEvents.httpErrors.map(e => e.text))];
  for (const e of uniqH) summary.push(`- \`${e}\``);

  summary.push(`\n## All Network Failures`);
  const uniqN = [...new Set(globalEvents.netFailures.map(e => e.text))];
  for (const e of uniqN) summary.push(`- \`${e}\``);

  const reportPath = path.join(OUT_ROOT, 'REPORT.md');
  fs.writeFileSync(reportPath, summary.join('\n'));

  // also write JSON
  fs.writeFileSync(path.join(OUT_ROOT, 'events.json'), JSON.stringify({
    flowResults, globalEvents,
  }, null, 2));

  console.log('\n\n==================== SUMMARY ====================');
  for (const f of flowResults) console.log(`${icon(f.verdict)} ${f.id} — ${f.title}`);
  console.log(`\nReport: ${reportPath}`);

  await browser.close();
})();
