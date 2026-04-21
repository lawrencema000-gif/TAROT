/**
 * Smoke-test the tarot-section-split feature flag rollout.
 *
 * The admin user (lawrence.ma000@gmail.com) has been added to
 * feature_flags.allowed_user_ids for 'tarot-section-split' — so this
 * browser session should render the extracted <TarotFocusView />,
 * <TarotShuffleView />, <TarotSelectView />, and <TarotRevealView />
 * components instead of the legacy inline JSX.
 *
 * The three checkpoints:
 *   1. Readings → Tarot tab renders (TarotHomeView)
 *   2. Tap Daily Draw → focus picker (TarotFocusView)
 *   3. Pick focus → continue → shuffle (TarotShuffleView)
 *
 * Each checkpoint saves a screenshot and dumps the full body text so
 * regressions (blank screens, untranslated chrome, mis-aligned layouts)
 * are visible in the audit artifacts.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';

const EMAIL = process.env.TAROT_EMAIL ?? 'lawrence.ma000@gmail.com';
const PASSWORD = process.env.TAROT_PASSWORD ?? 'Mmd208608!';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`console.error: ${msg.text().slice(0, 200)}`);
});

fs.mkdirSync('.audit/tarot-split', { recursive: true });

async function snapshot(label) {
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `.audit/tarot-split/${label}.png`, fullPage: false });
  const body = await page.evaluate(() => document.body.innerText);
  fs.writeFileSync(`.audit/tarot-split/${label}.txt`, body);
  console.log(`[${label}] snapshot saved (${body.length} chars)`);
}

async function clickByRegex(re) {
  return await page.evaluate((src) => {
    const r = new RegExp(src, 'i');
    // Include div with onclick (Card wrappers) + tappable anchors/buttons/tabs
    const els = [...document.querySelectorAll('button, a, [role="tab"], [role="button"], div[class*="interactive"], div[class*="cursor-pointer"]')];
    const b = els.find((el) => r.test(el.innerText) || r.test(el.getAttribute('aria-label') || ''));
    if (b) {
      b.click();
      return b.innerText.trim().slice(0, 60);
    }
    // Fallback: any element containing the text
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    let node;
    while ((node = walker.nextNode())) {
      if (r.test(node.innerText || '') && node.children.length < 20) {
        // Walk up to find a clickable ancestor
        let el = node;
        while (el && el !== document.body) {
          const style = window.getComputedStyle(el);
          if (style.cursor === 'pointer' || el.onclick) {
            el.click();
            return (node.innerText || '').trim().slice(0, 60);
          }
          el = el.parentElement;
        }
      }
    }
    return null;
  }, re.source);
}

try {
  await page.goto('https://tarotlife.app/', { waitUntil: 'networkidle', timeout: 30000 });

  await clickByRegex(/sign ?in/);
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

  // Readings tab
  await clickByRegex(/readings/);
  await page.waitForTimeout(1500);
  await clickByRegex(/^tarot$/i);
  await page.waitForTimeout(1500);
  await snapshot('1-home');

  // Daily Draw → focus picker
  const drawClicked = await clickByRegex(/daily draw/i);
  console.log(`Daily Draw clicked: ${drawClicked}`);
  await page.waitForTimeout(2000);
  await snapshot('2-focus');

  // Pick Money focus
  await clickByRegex(/^money$/i);
  await page.waitForTimeout(500);
  await snapshot('3-focus-money-picked');

  // Continue → shuffle
  await clickByRegex(/continue/i);
  await page.waitForTimeout(2000);
  await snapshot('4-shuffle');

  // Shuffle
  await clickByRegex(/shuffle deck|deck/i);
  await page.waitForTimeout(3500);
  await snapshot('5-select');

  // Select the first card (DOM grid button)
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('div.grid > button')];
    btns[0]?.click();
  });
  await page.waitForTimeout(500);
  await snapshot('6-select-1-card');

  // Reveal
  await clickByRegex(/reveal/i);
  await page.waitForTimeout(3000);
  await snapshot('7-reveal');

  // Tap the card to reveal it
  await page.evaluate(() => {
    const card = document.querySelector('.perspective-1000, [data-testid="card"]');
    if (card && typeof card.click === 'function') card.click();
  });
  await page.waitForTimeout(2500);
  await snapshot('8-revealed');
} catch (e) {
  errors.push(`FATAL: ${e instanceof Error ? e.message : String(e)}`);
  await snapshot('fatal').catch(() => {});
}

fs.writeFileSync('.audit/tarot-split/errors.txt', errors.join('\n'));
console.log(`\nErrors captured: ${errors.length}`);
if (errors.length) errors.slice(0, 10).forEach((e) => console.log(`  ${e}`));

await browser.close();
console.log(errors.length === 0 ? '\nPASS: split smoke test clean' : '\nFAIL: see errors.txt');
