import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false, channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await context.newPage();

// Open Google Ads
await page.goto('https://ads.google.com');

console.log('\n===========================================');
console.log('  Google Ads is open.');
console.log('  Please LOG IN now.');
console.log('  Press ENTER in this terminal when done.');
console.log('===========================================\n');

// Wait for user to log in
await new Promise(resolve => {
  process.stdin.once('data', resolve);
});

console.log('Logged in! Taking over...');

// Keep browser open
await new Promise(() => {});
