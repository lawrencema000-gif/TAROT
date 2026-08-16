import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ads = [
  { file: '08-daily-reading-landscape.html', width: 1200, height: 628, name: 'ad-reading-landscape-1200x628.png' },
  { file: '09-daily-reading-square.html', width: 1080, height: 1080, name: 'ad-reading-square-1080x1080.png' },
];

const browser = await chromium.launch({ headless: true });

for (const ad of ads) {
  console.log(`Screenshotting ${ad.file}...`);
  const ctx = await browser.newContext({ viewport: { width: ad.width, height: ad.height }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(`file://${path.join(__dirname, ad.file)}`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(__dirname, ad.name), fullPage: false });
  console.log(`  → ${ad.name}`);
  await ctx.close();
}

await browser.close();
console.log('Done!');
