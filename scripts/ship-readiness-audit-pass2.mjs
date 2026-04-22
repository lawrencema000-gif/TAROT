// Second-pass with corrected selectors informed by pass-1 body captures.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const EMAIL = process.env.TAROT_EMAIL;
const PASSWORD = process.env.TAROT_PASSWORD;
const BASE = 'https://tarotlife.app';
const OUT_ROOT = path.resolve('.audit/ship-readiness/pass2');
fs.mkdirSync(OUT_ROOT, { recursive: true });

const NOISE = /adtrafficquality|doubleclick|pagead2|googlesyndication|google-analytics|googletagmanager|www\.google\.com\/(pagead|ads|adsid)|fundingchoicesmessages|gstatic\.com\/cv\/js|analytics\.google|admob|collect\?v=|beacon\.min|sentry_key|ingest\.sentry|o[0-9]+\.ingest|locales\/add\//i;

const events = { console: [], pageErr: [], net: [], http: [] };
const flows = [];
let current = null;

function flow(id, title) { const f = { id, title, verdict: 'unknown', notes: [], errors: [], pageErrors: [], netFailures: [], httpErrors: [], dir: path.join(OUT_ROOT, id) }; fs.mkdirSync(f.dir, { recursive: true }); flows.push(f); current = f; return f; }
async function snap(page, f, name) { try { await page.screenshot({ path: path.join(f.dir, `${name}.png`) }); } catch {} }
async function snapText(page, f, name) { try { const t = await page.evaluate(() => document.body?.innerText || ''); fs.writeFileSync(path.join(f.dir, `${name}.txt`), t); return t; } catch { return ''; } }

function attach(page) {
  page.on('console', m => { if (m.type() === 'error') { const t = m.text(); if (NOISE.test(t)) return; events.console.push(t); current?.errors.push(t); } });
  page.on('pageerror', e => { const t = `${e.name}: ${e.message}`; events.pageErr.push(t); current?.pageErrors.push(t); });
  page.on('requestfailed', r => { const u = r.url(); if (NOISE.test(u)) return; const t = `${r.failure()?.errorText} ${u.slice(0, 200)}`; events.net.push(t); current?.netFailures.push(t); });
  page.on('response', r => { if (r.status() < 400 || NOISE.test(r.url())) return; const t = `HTTP ${r.status()} ${r.request().method()} ${r.url().slice(0, 200)}`; events.http.push(t); current?.httpErrors.push(t); });
}

async function clickTextExact(page, text) {
  return page.evaluate((t) => {
    const re = new RegExp(`^\\s*${t}\\s*$`, 'i');
    const els = [...document.querySelectorAll('button, a, [role="tab"], [role="button"], div, span, li')];
    const hit = els.find(e => re.test((e.innerText || '').trim()));
    if (hit) { hit.click(); return true; }
    return false;
  }, text);
}
async function clickContains(page, text) {
  return page.evaluate((t) => {
    const re = new RegExp(t, 'i');
    const els = [...document.querySelectorAll('button, a, [role="tab"], [role="button"]')];
    const hit = els.find(e => re.test((e.innerText || '').trim()) || re.test(e.getAttribute('aria-label') || ''));
    if (hit) { hit.click(); return true; }
    return false;
  }, text);
}
async function clickBottomNav(page, label) {
  return page.evaluate((lbl) => {
    const re = new RegExp(`^${lbl}$`, 'i');
    const tabs = [...document.querySelectorAll('[role="tab"]')];
    const hit = tabs.find(t => re.test((t.getAttribute('aria-label') || '').trim()));
    if (hit) { hit.click(); return true; }
    return false;
  }, label);
}

const wait = (p, ms) => p.waitForTimeout(ms);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 414, height: 896 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1' });
  const page = await ctx.newPage();
  attach(page);

  // --- Sign in once ---
  current = flow('00-signin', 'Sign in');
  await page.goto(`${BASE}/?lang=en`, { waitUntil: 'networkidle', timeout: 45000 });
  await wait(page, 1500);
  await clickContains(page, 'sign ?in');
  await wait(page, 2500);
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button[type="submit"], button')].find(b => /^sign ?in$|^continue$/i.test((b.innerText || '').trim()) && !/google|facebook|apple/i.test(b.innerText));
    btn?.click();
  });
  await wait(page, 6000);
  const signedIn = await page.evaluate(() => !!document.querySelector('nav[aria-label="Main navigation"]'));
  current.verdict = signedIn ? 'pass' : 'fail';
  if (!signedIn) { console.log('sign-in failed'); process.exit(1); }

  // ---------- FLOW 3 retry: Tarot → pick 1-Card Daily spread → reveal → AI ----------
  {
    const f = flow('03-tarot-spread-ai', 'Tarot → 1-Card Daily → reveal → AI interpretation (topic picker investigation)');
    await clickBottomNav(page, 'Readings');
    await wait(page, 2000);
    await clickTextExact(page, 'Tarot');
    await wait(page, 1500);
    // "1-Card Daily" is an h3/span inside a tile — use contains
    const spreadClicked = await page.evaluate(() => {
      const tiles = [...document.querySelectorAll('button, [role="button"], div, article')].filter(e => /1.?card daily/i.test(e.innerText || ''));
      // pick the deepest clickable
      const deepest = tiles.sort((a, b) => (a.innerText || '').length - (b.innerText || '').length)[0];
      if (deepest) { deepest.click(); return true; }
      return false;
    });
    f.notes.push(`1-Card Daily tile clicked: ${spreadClicked}`);
    await wait(page, 3000);
    await snap(page, f, '01-after-spread-pick');
    const t1 = await snapText(page, f, 'after-spread-body');
    // Look for topic picker / Money option here
    const hasMoney = /money|finance|wealth/i.test(t1);
    const hasLove = /\blove\b/i.test(t1);
    const hasCareer = /career/i.test(t1);
    f.notes.push(`Topic-picker screen — has "Money": ${hasMoney}, Love: ${hasLove}, Career: ${hasCareer}`);
    // Try to click Money if present, else Love
    const topicPicked = await clickContains(page, 'money') || await clickContains(page, 'love') || await clickContains(page, 'career');
    f.notes.push(`topic picked: ${topicPicked}`);
    await wait(page, 2000);
    await snap(page, f, '02-topic-picked');
    // Draw
    const drew = await clickContains(page, 'draw') || await clickContains(page, 'shuffle');
    f.notes.push(`Draw clicked: ${drew}`);
    await wait(page, 3500);
    await snap(page, f, '03-drawn');
    // Reveal
    await clickContains(page, 'reveal|flip|tap');
    await wait(page, 1500);
    // Tap large card if no reveal button
    await page.evaluate(() => {
      const cards = [...document.querySelectorAll('img, [role="button"], button, [class*="card"]')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 100 && r.height > 150; });
      cards[0]?.click();
    });
    await wait(page, 2500);
    await snap(page, f, '04-revealed');
    await snapText(page, f, 'revealed-body');
    // AI
    const aiClicked = await clickContains(page, 'interpret|ai|generate|deeper|insight|meaning');
    f.notes.push(`AI interpret clicked: ${aiClicked}`);
    await wait(page, 10000);
    await snap(page, f, '05-ai');
    const aiTxt = await snapText(page, f, 'ai-body');
    const aiFailed = /error|failed|try again|something went wrong/i.test(aiTxt.slice(-800));
    const aiLonger = aiTxt.length > 1500;
    f.notes.push(`AI output length: ${aiTxt.length}, contains error words: ${aiFailed}, looks successful: ${!aiFailed && aiLonger}`);
    f.verdict = (spreadClicked && drew && aiClicked && !aiFailed) ? 'pass' : (spreadClicked && drew ? 'warn' : 'fail');
  }

  // ---------- FLOW 5 retry: Compatibility partner sign via zodiac glyph ----------
  {
    const f = flow('05-compat-retry', 'Compatibility — pick partner zodiac via glyph / detect form');
    await clickBottomNav(page, 'Readings');
    await wait(page, 1500);
    await clickTextExact(page, 'Compatibility');
    await wait(page, 2000);
    await snap(page, f, '01-compat');
    // Type partner name
    const nameFilled = await page.evaluate(() => {
      const inps = [...document.querySelectorAll('input[type="text"], input:not([type])')];
      const nameInput = inps.find(i => /name/i.test(i.placeholder || '') || /name/i.test(i.name || '') || /name/i.test(i.getAttribute('aria-label') || ''));
      if (nameInput) { nameInput.focus(); nameInput.value = 'Alex'; nameInput.dispatchEvent(new Event('input', { bubbles: true })); nameInput.dispatchEvent(new Event('change', { bubbles: true })); return true; }
      return false;
    });
    f.notes.push(`partner name filled: ${nameFilled}`);
    // Try pick a zodiac glyph (♌ = Leo = U+264C)
    const zodiacPicked = await page.evaluate(() => {
      const all = [...document.querySelectorAll('button, [role="button"], div, span, li')];
      const leo = all.find(e => (e.innerText || '').trim() === '♌' || /leo$/i.test((e.innerText || '').trim()));
      if (leo) { leo.click(); return 'leo'; }
      // else any visible zodiac glyph
      const glyphRe = /^[\u2648-\u2653]$/;
      const glyph = all.find(e => glyphRe.test((e.innerText || '').trim()));
      if (glyph) { glyph.click(); return glyph.innerText; }
      return false;
    });
    f.notes.push(`partner zodiac picked: ${zodiacPicked}`);
    await wait(page, 1000);
    await snap(page, f, '02-partner-picked');
    // Click Calculate
    const calc = await clickContains(page, 'calculate compat|calculate|analy[sz]e|compat');
    f.notes.push(`Calculate clicked: ${calc}`);
    await wait(page, 5000);
    await snap(page, f, '03-result');
    const t = await snapText(page, f, 'result-body');
    const hasResult = /match|compatib|percent|score|%/i.test(t);
    f.notes.push(`result text includes compat score/match: ${hasResult}`);
    f.verdict = (zodiacPicked && calc && hasResult) ? 'pass' : 'warn';
  }

  // ---------- FLOW 6 retry: Library → Guides tab → open guide ----------
  {
    const f = flow('06-library-retry', 'Library → Guides → open first guide');
    await clickBottomNav(page, 'Readings');
    await wait(page, 1500);
    await clickTextExact(page, 'Library');
    await wait(page, 2000);
    await snap(page, f, '01-library');
    // Click Guides sub-pill
    const guides = await clickTextExact(page, 'Guides');
    f.notes.push(`Guides pill clicked: ${guides}`);
    await wait(page, 2500);
    await snap(page, f, '02-guides');
    await snapText(page, f, 'guides-list');
    // Try "Tarot Basics"
    const basics = await clickContains(page, 'tarot basics|getting started|introduction|basics');
    f.notes.push(`Basics-like guide clicked: ${basics}`);
    if (!basics) {
      // Try first visible guide card
      await page.evaluate(() => {
        const tiles = [...document.querySelectorAll('article, [class*="card"], [role="button"], button, a')].filter(e => (e.innerText || '').length > 20 && (e.innerText || '').length < 400);
        tiles[0]?.click();
      });
    }
    await wait(page, 2500);
    await snap(page, f, '03-guide-opened');
    const t = await snapText(page, f, 'guide-body');
    f.notes.push(`guide body length: ${t.length}`);
    f.verdict = (guides && t.length > 500) ? 'pass' : 'warn';
  }

  // ---------- FLOW 8 retry: Quizzes → Personality Type Assessment → 3 Qs ----------
  {
    const f = flow('08-quiz-retry', 'Quizzes → Personality Type Assessment → 3 Q');
    await clickBottomNav(page, 'Quizzes');
    await wait(page, 2000);
    await snap(page, f, '01-list');
    const started = await clickContains(page, 'personality type|mbti|16 personalit|take.*personality|start.*personality');
    f.notes.push(`Personality Type Assessment click: ${started}`);
    await wait(page, 1500);
    // If there's a Retake / Start button
    await clickContains(page, 'retake|start|begin|take quiz');
    await wait(page, 2500);
    await snap(page, f, '02-q1');
    const q1body = await snapText(page, f, 'q1-body');
    const hasQuestion = /\?\s*$|\?/.test(q1body.split('\n').slice(0, 20).join('\n'));
    f.notes.push(`Q1 body has question mark near top: ${hasQuestion}`);
    for (let q = 1; q <= 3; q++) {
      const ans = await page.evaluate(() => {
        const btns = [...document.querySelectorAll('button')].filter(b => {
          const t = (b.innerText || '').trim();
          return t.length > 3 && t.length < 250 &&
            !/^(next|back|skip|cancel|close|home|readings|horoscope|quizzes|more|start|begin)$/i.test(t);
        });
        btns[0]?.click();
        return !!btns[0];
      });
      f.notes.push(`Q${q} answered: ${ans}`);
      await wait(page, 1200);
      await clickContains(page, '^next$');
      await wait(page, 1000);
      await snap(page, f, `03-after-q${q}`);
    }
    f.verdict = started ? 'pass' : 'warn';
  }

  // ---------- FLOW 10 retry: Language switch (find the Language button on Profile) ----------
  {
    const f = flow('10-lang-retry', 'Profile → find Language switcher → JA → EN');
    await clickBottomNav(page, 'More');
    await wait(page, 1000);
    await clickTextExact(page, 'Profile');
    await wait(page, 2000);
    await snap(page, f, '01-profile');
    const pBody = await snapText(page, f, 'profile-body');
    const hasLang = /language|言語|settings/i.test(pBody);
    f.notes.push(`Profile page mentions language/settings: ${hasLang}`);
    // Click gear / settings cog if present — try common icon aria-labels
    const gear = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      const g = btns.find(b => /settings|setting|gear|preferences|言語|language/i.test(b.getAttribute('aria-label') || ''));
      if (g) { g.click(); return true; }
      // fallback: click any button containing an SVG that looks like settings (heuristic: titled 'Settings')
      const t = btns.find(b => /^\s*Settings\s*$/i.test((b.innerText || '').trim()));
      if (t) { t.click(); return 'text'; }
      return false;
    });
    f.notes.push(`gear/settings opener: ${gear}`);
    await wait(page, 1500);
    await snap(page, f, '02-after-gear');
    await snapText(page, f, 'settings-body');
    // Try direct language picker
    const langClick = await clickContains(page, 'language|言語');
    f.notes.push(`language row clicked: ${langClick}`);
    await wait(page, 1500);
    await snap(page, f, '03-lang-options');
    await snapText(page, f, 'lang-options');
    const jaPick = await clickContains(page, '日本語|japanese');
    f.notes.push(`Japanese option clicked: ${jaPick}`);
    await wait(page, 2500);
    await clickContains(page, 'save|apply|done|confirm|保存|完了');
    await wait(page, 2000);
    await clickBottomNav(page, 'Home');
    await wait(page, 2500);
    await snap(page, f, '04-home-ja');
    const homeJa = await snapText(page, f, 'home-ja');
    const htmlLang = await page.evaluate(() => document.documentElement.lang);
    const jaChars = /[\u3040-\u309f\u30a0-\u30ff]/.test(homeJa);
    f.notes.push(`html[lang]=${htmlLang}, Japanese chars on home: ${jaChars}`);
    // switch back
    await clickBottomNav(page, 'More');
    await wait(page, 1000);
    await clickContains(page, 'プロフィール|profile');
    await wait(page, 1500);
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(x => /言語|language/i.test(x.getAttribute('aria-label') || '') || /^\s*(言語|Settings|設定)\s*$/i.test((x.innerText || '').trim()));
      b?.click();
    });
    await wait(page, 1500);
    await clickContains(page, '言語|language');
    await wait(page, 1200);
    await clickContains(page, 'english|英語');
    await wait(page, 2000);
    await clickContains(page, 'save|apply|done|confirm|保存|完了');
    await wait(page, 2000);
    await clickBottomNav(page, 'Home');
    await wait(page, 2000);
    await snap(page, f, '05-home-en-back');
    const homeEn = await snapText(page, f, 'home-en-back');
    const backEn = /Home|Readings|Horoscope/i.test(homeEn);
    f.notes.push(`back to English: ${backEn}`);
    f.verdict = (jaPick && jaChars && backEn) ? 'pass' : (jaPick ? 'warn' : 'fail');
  }

  // ---------- FLOW 11 retry: Sign out (scroll profile / settings) ----------
  {
    const f = flow('11-signout-retry', 'Sign out');
    await clickBottomNav(page, 'More');
    await wait(page, 1000);
    await clickTextExact(page, 'Profile');
    await wait(page, 2000);
    // scroll full profile
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await wait(page, 800);
    await snap(page, f, '01-profile-bottom');
    const body = await snapText(page, f, 'profile-full');
    f.notes.push(`profile body mentions sign out: ${/sign ?out|log ?out|log off/i.test(body)}`);
    const clicked = await clickContains(page, 'sign ?out|log ?out');
    f.notes.push(`sign-out clicked: ${clicked}`);
    await wait(page, 1500);
    await clickContains(page, 'confirm|yes|sign ?out');
    await wait(page, 5000);
    await snap(page, f, '02-after-signout');
    const after = await snapText(page, f, 'after-signout');
    const stillAuthed = await page.evaluate(() => !!document.querySelector('nav[aria-label="Main navigation"]'));
    const url = page.url();
    f.notes.push(`url=${url}, still authed: ${stillAuthed}`);
    f.verdict = (clicked && !stillAuthed) ? 'pass' : 'warn';
  }

  // ---------- Summary ----------
  const icon = v => v === 'pass' ? '✅' : v === 'warn' ? '⚠️' : v === 'fail' ? '❌' : '❓';
  const out = [];
  out.push(`# Ship-Readiness Audit PASS 2 — tarotlife.app\n`);
  out.push(`Run: ${new Date().toISOString()}\n`);
  out.push(`## Verdicts\n`);
  out.push(`| Flow | Verdict |\n|---|---|`);
  for (const f of flows) out.push(`| ${f.id} | ${icon(f.verdict)} ${f.verdict} |`);
  out.push(`\n## Global\n- Console errors: ${events.console.length}\n- Page errors: ${events.pageErr.length}\n- Net failures: ${events.net.length}\n- HTTP 4xx/5xx: ${events.http.length}\n`);
  for (const f of flows) {
    out.push(`### ${icon(f.verdict)} ${f.id} — ${f.title}`);
    for (const n of f.notes) out.push(`- ${n}`);
    if (f.pageErrors.length) { out.push(`- **Uncaught:**`); for (const e of f.pageErrors) out.push(`  - \`${e}\``); }
    if (f.errors.length) { out.push(`- **Console errors:**`); for (const e of f.errors.slice(0, 5)) out.push(`  - \`${e.slice(0, 250)}\``); }
    if (f.httpErrors.length) { out.push(`- **HTTP:**`); for (const e of f.httpErrors) out.push(`  - \`${e}\``); }
    if (f.netFailures.length) { out.push(`- **Net failed:**`); for (const e of f.netFailures) out.push(`  - \`${e}\``); }
    out.push('');
  }
  out.push(`## All unique console errors`);
  for (const e of [...new Set(events.console)]) out.push(`- \`${e.slice(0, 300)}\``);
  out.push(`\n## All unique pageerrors`);
  for (const e of [...new Set(events.pageErr)]) out.push(`- \`${e}\``);
  out.push(`\n## All unique HTTP 4xx/5xx`);
  for (const e of [...new Set(events.http)]) out.push(`- \`${e}\``);
  out.push(`\n## All unique net failures`);
  for (const e of [...new Set(events.net)]) out.push(`- \`${e}\``);

  fs.writeFileSync(path.join(OUT_ROOT, 'REPORT.md'), out.join('\n'));
  console.log('\n=== PASS 2 SUMMARY ===');
  for (const f of flows) console.log(`${icon(f.verdict)} ${f.id}`);
  await browser.close();
})();
