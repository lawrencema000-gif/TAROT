// Deep language audit: signs in with real creds, walks every tab in every
// non-English locale, and extracts any run of English-looking text that
// renders in the UI. Finds untranslated content (not just chrome).
import { chromium } from 'playwright';
import fs from 'node:fs';

const EMAIL = process.env.TAROT_EMAIL;
const PASSWORD = process.env.TAROT_PASSWORD;

// Heuristic: a "suspicious English string" is 3+ consecutive ASCII words
// each 3+ chars, where the whole string has zero CJK chars.
const HAS_CJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/;
const ENGLISH_RUN = /\b[A-Za-z][A-Za-z'\-]{2,}(?:\s+[A-Za-z'\-]{3,}){2,}[A-Za-z\.!?]?/g;

function extractSuspicious(text) {
  if (!text) return [];
  const out = new Set();
  for (const m of text.matchAll(ENGLISH_RUN)) {
    const s = m[0].trim();
    if (HAS_CJK.test(s)) continue;
    if (s.length < 15) continue;
    // Skip things that are clearly proper nouns/brand
    if (/^(Arcana|TAROT|Google Play|Open Graph|Terms of Service|Privacy Policy)$/i.test(s)) continue;
    out.add(s);
  }
  return [...out];
}

const browser = await chromium.launch({ headless: true });
const report = {};

for (const lang of ['ja', 'ko', 'zh']) {
  console.log(`\n══════════════════════════════════════════`);
  console.log(`LOCALE: ${lang}`);
  console.log(`══════════════════════════════════════════`);

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const findings = {};

  try {
    await page.goto(`https://tarotlife.app/?lang=${lang}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.evaluate(() => [...document.querySelectorAll('a,button')].find(e => /sign ?in|ログイン|로그인|登录/i.test(e.innerText))?.click());
    await page.waitForTimeout(2500);
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find(b => /sign ?in|ログイン|로그인|登录/i.test(b.innerText) && !/google|facebook|apple/i.test(b.innerText));
      btn?.click();
    });
    await page.waitForTimeout(8000);

    const tabs = [
      { name: 'home', match: /home|ホーム|홈|首页/i },
      { name: 'readings', match: /readings|リーディング|리딩|牌阵/i },
      { name: 'horoscope', match: /horoscope|astrology|星占い|별자리 운세|星座运势/i },
      { name: 'quizzes', match: /quizzes|診断|퀴즈|测试/i },
    ];

    for (const t of tabs) {
      await page.evaluate((re) => {
        const btn = [...document.querySelectorAll('button, a')].find(b => new RegExp(re, 'i').test(b.innerText) || new RegExp(re, 'i').test(b.getAttribute('aria-label') || ''));
        btn?.click();
      }, t.match.source);
      await page.waitForTimeout(3500);

      const text = await page.evaluate(() => document.body.innerText);
      const suspicious = extractSuspicious(text);
      findings[t.name] = suspicious;
      console.log(`\n[${lang}] ${t.name}: ${suspicious.length} English runs found`);
      suspicious.slice(0, 10).forEach(s => console.log(`  - "${s.slice(0, 100)}"`));
    }

    // Horoscope — open sub-tabs
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button, a')].find(b => /horoscope|astrology|星占い|별자리|星座/i.test(b.innerText) || /horoscope|astrology/i.test(b.getAttribute('aria-label') || ''));
      btn?.click();
    });
    await page.waitForTimeout(3000);

    for (const sub of ['forecast', 'explore', 'birth chart', 'compatibility', 'today for you', '今日', '週間', '相性', 'チャート']) {
      try {
        const clicked = await page.evaluate((re) => {
          const btn = [...document.querySelectorAll('button, a, [role="tab"]')].find(b => new RegExp(re, 'i').test(b.innerText));
          if (btn) { btn.click(); return btn.innerText.trim().slice(0, 30); }
          return null;
        }, sub);
        if (!clicked) continue;
        await page.waitForTimeout(2500);
        const text = await page.evaluate(() => document.body.innerText);
        const suspicious = extractSuspicious(text);
        if (suspicious.length) {
          const key = `horoscope/${clicked}`;
          findings[key] = suspicious;
          console.log(`\n[${lang}] ${key}: ${suspicious.length} English runs`);
          suspicious.slice(0, 10).forEach(s => console.log(`  - "${s.slice(0, 100)}"`));
        }
      } catch {}
    }
  } catch (e) {
    console.log(`FATAL ${lang}: ${e.message}`);
  }

  report[lang] = findings;
  await ctx.close();
}

await browser.close();
fs.writeFileSync('.audit/language-audit.json', JSON.stringify(report, null, 2));

// Consolidate all findings
const allEnglishStrings = new Set();
for (const lang of Object.keys(report)) {
  for (const tab of Object.keys(report[lang])) {
    for (const s of report[lang][tab]) allEnglishStrings.add(s);
  }
}
console.log(`\n═══ UNIQUE English runs across all non-EN locales: ${allEnglishStrings.size} ═══`);
[...allEnglishStrings].sort().forEach(s => console.log(`  ${s}`));
fs.writeFileSync('.audit/language-audit-unique.txt', [...allEnglishStrings].sort().join('\n'));
