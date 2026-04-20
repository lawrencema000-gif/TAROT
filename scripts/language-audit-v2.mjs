// language-audit-v2: reproduces the state of a real user who already set
// their locale preference. Pre-writes `profiles.locale` via the Supabase
// REST API, THEN does the authed Playwright walk so AuthContext's
// locale sync keeps us in the target locale all the way through.
//
// Walks: home → readings (tarot/compatibility/library) → horoscope
// (today/forecast/explore/chart) → quizzes → more. In readings/tarot,
// explicitly reproduces the Money → 1-Card-Daily → reveal flow from the
// user's screenshot.
//
// Outputs:
//   .audit/language-audit-v2.json       per-locale per-tab findings
//   .audit/language-audit-v2-unique.txt sorted unique English runs
import { chromium } from 'playwright';
import fs from 'node:fs';

const EMAIL = process.env.TAROT_EMAIL;
const PASSWORD = process.env.TAROT_PASSWORD;
const SUPA_URL = 'https://ulzlthhkqjuohzjangcq.supabase.co';
const SUPA_ANON = process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsemx0aGhrcWp1b2h6amFuZ2NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyNTY4NTQsImV4cCI6MjA4MjgzMjg1NH0.pqf2bqHJZ_D1i2-KFEN07xYYvruIYHd2-nv7MI6yeyE';

if (!EMAIL || !PASSWORD) {
  console.error('TAROT_EMAIL and TAROT_PASSWORD must be set');
  process.exit(1);
}

const HAS_CJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/;
const ENGLISH_RUN = /\b[A-Za-z][A-Za-z'\-/&]{1,}(?:\s+[A-Za-z'\-/&]+){0,6}[A-Za-z.!?]?/g;

function extractSuspicious(text) {
  if (!text) return [];
  const out = new Set();
  for (const m of text.matchAll(ENGLISH_RUN)) {
    const s = m[0].trim();
    if (HAS_CJK.test(s)) continue;
    if (s.length < 4) continue;
    if (/^(Arcana|TAROT|AI|API|OK|No|Yes|AdMob|AdSense|Google|Apple|Meta|ESTJ|INTJ|INFJ|ENTJ|ISTJ|ISFJ|INFP|INTP|ENFP|ENFJ|ENTP|ESFJ|ESTP|ESFP|ISFP|ISTP)$/i.test(s)) continue;
    if (/^[0-9:\-/.]+$/.test(s)) continue;
    out.add(s);
  }
  return [...out];
}

async function signInREST() {
  const r = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPA_ANON },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!r.ok) throw new Error(`auth failed: ${r.status} ${await r.text()}`);
  const { access_token, user } = await r.json();
  return { token: access_token, userId: user.id };
}

async function setProfileLocale({ token, userId, locale }) {
  const r = await fetch(`${SUPA_URL}/rest/v1/profiles?id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPA_ANON,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ locale }),
  });
  if (!r.ok) throw new Error(`profile patch failed: ${r.status} ${await r.text()}`);
}

async function snapshotTab(page, label, findings) {
  await page.waitForTimeout(1800);
  const text = await page.evaluate(() => document.body.innerText);
  const hits = extractSuspicious(text);
  findings[label] = hits;
  console.log(`  [${label}] ${hits.length} English runs`);
  hits.slice(0, 6).forEach((s) => console.log(`    - ${JSON.stringify(s.slice(0, 80))}`));
}

async function clickByRegex(page, re) {
  return await page.evaluate((src) => {
    const r = new RegExp(src, 'i');
    const b = [...document.querySelectorAll('button, a, [role="tab"], [role="button"]')].find(
      (el) => r.test(el.innerText) || r.test(el.getAttribute('aria-label') || '')
    );
    if (b) { b.click(); return b.innerText.trim().slice(0, 40); }
    return null;
  }, re.source);
}

const auth = await signInREST();
console.log(`Signed in REST as ${auth.userId}`);

const browser = await chromium.launch({ headless: true });
const report = {};

for (const lang of ['ja', 'ko', 'zh']) {
  console.log(`\n═══ LOCALE ${lang} ═══`);
  await setProfileLocale({ ...auth, locale: lang });
  console.log(`  profile.locale = ${lang} ✓`);

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const findings = {};

  try {
    await page.goto(`https://tarotlife.app/?lang=${lang}`, { waitUntil: 'networkidle', timeout: 30000 });

    // Sign in
    await clickByRegex(page, /sign ?in|ログイン|로그인|登录/);
    await page.waitForTimeout(1500);
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find(
        (b) => /sign ?in|ログイン|로그인|登录/i.test(b.innerText) && !/google|facebook|apple/i.test(b.innerText)
      );
      btn?.click();
    });
    await page.waitForTimeout(9000);

    // Guard: assert locale actually stuck
    const htmlLang = await page.evaluate(() => document.documentElement.lang);
    findings['_meta'] = { htmlLang, expected: lang };
    console.log(`  html[lang]=${htmlLang} (expected ${lang})`);

    // Bottom-tab walks
    for (const [label, re] of [
      ['home', /home|ホーム|홈|首页/],
      ['readings', /readings|リーディング|리딩|牌阵/],
      ['horoscope', /horoscope|星占い|별자리|星座/],
      ['quizzes', /quizzes|診断|퀴즈|测试/],
      ['more', /more|その他|더보기|更多|プロフィール|프로필|个人资料/],
    ]) {
      const got = await clickByRegex(page, re);
      if (got) await snapshotTab(page, label, findings);
    }

    // Reproduce the screenshot: Readings → Tarot tab → Money focus → 1-Card Daily
    await clickByRegex(page, /readings|リーディング|리딩|牌阵/);
    await page.waitForTimeout(1500);
    await clickByRegex(page, /^tarot$|^タロット$|^타로$|^塔罗$/i);
    await page.waitForTimeout(1500);
    await snapshotTab(page, 'readings/tarot', findings);

    const focusClicked = await clickByRegex(page, /money|love|career|health|お金|愛情|金|사랑|돈|钱|爱情/);
    if (focusClicked) {
      await page.waitForTimeout(1800);
      await snapshotTab(page, `readings/tarot/focus-${focusClicked.replace(/\s+/g, '_').toLowerCase().slice(0, 20)}`, findings);

      await clickByRegex(page, /daily|1[\-\s]*card|single|1枚|데일리|每日|1장/);
      await page.waitForTimeout(2500);
      await snapshotTab(page, 'readings/tarot/spread-single', findings);

      await page.evaluate(() => {
        const target = document.querySelector('[data-card], .tarot-card, [aria-label*="card"]') ||
          [...document.querySelectorAll('button')].find((b) => /tap|reveal|draw|flip|タップ|눌|点击/i.test(b.innerText));
        target?.click?.();
        target?.dispatchEvent?.(new MouseEvent('click', { bubbles: true }));
      });
      await page.waitForTimeout(3500);
      await snapshotTab(page, 'readings/tarot/revealed', findings);
    }

    // Horoscope sub-tabs
    await clickByRegex(page, /horoscope|星占い|별자리|星座/);
    await page.waitForTimeout(1800);
    for (const sub of [/forecast|予報|예보|预报/, /explore|探索|탐색|探索/, /chart|チャート|차트|星盘/, /today|今日|오늘|今天/]) {
      const got = await clickByRegex(page, sub);
      if (got) await snapshotTab(page, `horoscope/${sub.source.split('|')[0]}`, findings);
    }

    // Back to readings → compatibility, library
    await clickByRegex(page, /readings|リーディング|리딩|牌阵/);
    await page.waitForTimeout(1200);
    const comp = await clickByRegex(page, /compatibility|相性|궁합|配对/);
    if (comp) await snapshotTab(page, 'readings/compatibility', findings);
    const lib = await clickByRegex(page, /library|ライブラリ|라이브러리|资料库|도서관/);
    if (lib) await snapshotTab(page, 'readings/library', findings);
  } catch (e) {
    console.log(`  FATAL ${lang}: ${e.message}`);
    findings['_error'] = String(e.message).slice(0, 200);
  }

  report[lang] = findings;
  await ctx.close();
}

// Restore profile to en so future logins are normal
await setProfileLocale({ ...auth, locale: 'en' });
console.log('\nprofile.locale restored to en');

await browser.close();

fs.mkdirSync('.audit', { recursive: true });
fs.writeFileSync('.audit/language-audit-v2.json', JSON.stringify(report, null, 2));

const all = new Set();
for (const lang of Object.keys(report)) {
  for (const tab of Object.keys(report[lang])) {
    if (tab.startsWith('_')) continue;
    if (!Array.isArray(report[lang][tab])) continue;
    for (const s of report[lang][tab]) all.add(s);
  }
}
const sorted = [...all].sort();
fs.writeFileSync('.audit/language-audit-v2-unique.txt', sorted.join('\n'));
console.log(`\n═══ UNIQUE English runs across ja/ko/zh (post-signin): ${sorted.length} ═══`);
sorted.slice(0, 100).forEach((s) => console.log(`  ${s}`));
