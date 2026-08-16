import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ads = [
  { file: '01-hero-landscape.html', width: 1200, height: 628, name: 'ad-hero-landscape-1200x628.png' },
  { file: '02-hero-square.html', width: 1080, height: 1080, name: 'ad-hero-square-1080x1080.png' },
  { file: '03-zodiac-square.html', width: 1080, height: 1080, name: 'ad-zodiac-scorpio-1080x1080.png' },
  { file: '04-pick-a-card-square.html', width: 1080, height: 1080, name: 'ad-pick-a-card-1080x1080.png' },
  { file: '05-story-vertical.html', width: 1080, height: 1920, name: 'ad-story-vertical-1080x1920.png' },
];

const browser = await chromium.launch({ headless: true });

for (const ad of ads) {
  console.log(`Screenshotting ${ad.file}...`);
  const context = await browser.newContext({
    viewport: { width: ad.width, height: ad.height },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  const filePath = path.join(__dirname, ad.file);
  await page.goto(`file://${filePath}`);
  await page.waitForTimeout(1000); // Let fonts load
  const outPath = path.join(__dirname, ad.name);
  await page.screenshot({ path: outPath, fullPage: false });
  console.log(`  → Saved: ${ad.name}`);
  await context.close();
}

await browser.close();
console.log('\nAll ad creatives screenshotted!');
