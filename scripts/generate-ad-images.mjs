/**
 * Generate Google Ads creative images from bundled tarot cards.
 *
 * Output:
 *   ad-creatives/v{1..5}/square-1200.jpg   (1:1 for Display/PMax)
 *   ad-creatives/v{1..5}/landscape-1200x628.jpg  (1.91:1 for Discovery)
 *
 * Each variant matches GOOGLE-ADS-WEB-VARIANTS.md.
 * Style is consistent with the app: dark cosmic background, gold accents,
 * the chosen card as the visual anchor, headline in display font.
 *
 * Run: node scripts/generate-ad-images.mjs
 */
import sharp from 'sharp';
import { mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';

const OUT_ROOT = resolve('ad-creatives');
const CARDS_DIR = resolve('public/bundled-cards/full');

const VARIANTS = [
  {
    id: 'v1',
    name: 'Ask the Cards',
    card: `${CARDS_DIR}/major-arcana/the-high-priestess.webp`,
    squareHeadline: 'Ask the Cards',
    squareSub: 'Free reading. No signup.',
    landscapeHeadline: 'Ask the Cards a Question',
    landscapeSub: 'Draw a free card in seconds — no email needed.',
  },
  {
    id: 'v2',
    name: 'Love Reading',
    card: `${CARDS_DIR}/major-arcana/the-lovers.webp`,
    squareHeadline: 'Free Love Tarot',
    squareSub: 'Does he think about you?',
    landscapeHeadline: 'Free Love Tarot Reading',
    landscapeSub: 'Clarity on feelings, timing, connection. Instant & free.',
  },
  {
    id: 'v3',
    name: 'Daily Ritual',
    card: `${CARDS_DIR}/major-arcana/the-sun.webp`,
    squareHeadline: 'Your Daily Ritual',
    squareSub: '3 minutes. Every morning.',
    landscapeHeadline: 'Your Daily Tarot Ritual',
    landscapeSub: 'Start each day with clarity. Free forever.',
  },
  {
    id: 'v4',
    name: 'Career Decision',
    card: `${CARDS_DIR}/major-arcana/the-emperor.webp`,
    squareHeadline: 'Should I Take It?',
    squareSub: 'Career tarot — free & instant.',
    landscapeHeadline: 'Tarot for Career Decisions',
    landscapeSub: 'Stuck on a big move? Draw a card, get a clear perspective.',
  },
  {
    id: 'v5',
    name: 'Card of the Day',
    card: `${CARDS_DIR}/major-arcana/the-star.webp`,
    squareHeadline: 'Your Card Today',
    squareSub: 'What does today hold?',
    landscapeHeadline: 'Your Card of the Day',
    landscapeSub: 'Pull a card, read the meaning, set your intention.',
  },
];

/* SVG layers — kept as templates so font rendering is consistent across sizes */

function escapeXml(s) {
  return String(s).replace(/[<>&"']/g, c => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
  }[c]));
}

/** Dark cosmic gradient background with subtle star dots */
function backgroundSvg(w, h) {
  const stars = Array.from({ length: 40 }, () =>
    `<circle cx="${Math.random() * w}" cy="${Math.random() * h}" r="${Math.random() * 1.2 + 0.3}" fill="#fff" opacity="${Math.random() * 0.5 + 0.1}" />`
  ).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs>
      <radialGradient id="bg" cx="70%" cy="20%">
        <stop offset="0%" stop-color="#2a1a4a" />
        <stop offset="60%" stop-color="#15132a" />
        <stop offset="100%" stop-color="#0a0a15" />
      </radialGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#bg)" />
    ${stars}
  </svg>`;
}

/** Headline + sub text + logo + CTA, sized for the given canvas */
function textSvg({ w, h, headline, sub, textX, textAnchor }) {
  const headlineSize = Math.round(w * 0.065);
  const subSize = Math.round(w * 0.028);
  const logoSize = Math.round(w * 0.024);
  const ctaSize = Math.round(w * 0.025);

  const textY = Math.round(h * 0.40);
  const subY = textY + Math.round(headlineSize * 1.4);
  const ctaBoxY = subY + Math.round(subSize * 2.5);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs>
      <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#f4d775" />
        <stop offset="100%" stop-color="#d4af37" />
      </linearGradient>
    </defs>
    <text x="${Math.round(w * 0.06)}" y="${Math.round(h * 0.08)}"
      font-family="Georgia, serif" font-size="${logoSize}"
      fill="url(#gold)" letter-spacing="0.18em">ARCANA</text>

    <text x="${textX}" y="${textY}" text-anchor="${textAnchor}"
      font-family="Georgia, serif" font-size="${headlineSize}"
      font-weight="600" fill="#f0e8d8">${escapeXml(headline)}</text>

    <text x="${textX}" y="${subY}" text-anchor="${textAnchor}"
      font-family="-apple-system, Segoe UI, sans-serif" font-size="${subSize}"
      fill="#c0c0d0">${escapeXml(sub)}</text>

    <rect x="${textX - (textAnchor === 'start' ? 0 : Math.round(w * 0.14))}" y="${ctaBoxY}"
      width="${Math.round(w * 0.28)}" height="${Math.round(w * 0.06)}"
      rx="${Math.round(w * 0.03)}" fill="url(#gold)" />
    <text x="${textX + (textAnchor === 'start' ? Math.round(w * 0.14) : 0)}"
      y="${ctaBoxY + Math.round(w * 0.042)}" text-anchor="middle"
      font-family="-apple-system, Segoe UI, sans-serif" font-size="${ctaSize}"
      font-weight="600" fill="#0a0a15">Try Free →</text>
  </svg>`;
}

/** Compose a single ad image */
async function compose({ outPath, width, height, card, headline, sub, layout }) {
  const bg = Buffer.from(backgroundSvg(width, height));

  // Card image — resize to look good on the canvas
  const cardTargetH = Math.round(height * (layout === 'square' ? 0.75 : 0.85));
  const cardBuffer = await sharp(card)
    .resize({ height: cardTargetH })
    .png()
    .toBuffer();
  const cardMeta = await sharp(cardBuffer).metadata();

  // Layout: card on the right for landscape, centered-right for square
  const cardX = layout === 'square'
    ? width - cardMeta.width - Math.round(width * 0.06)
    : width - cardMeta.width - Math.round(width * 0.08);
  const cardY = Math.round((height - cardMeta.height) / 2);

  // Text anchored to the left
  const textX = Math.round(width * 0.06);
  const textAnchor = 'start';
  const text = Buffer.from(textSvg({ w: width, h: height, headline, sub, textX, textAnchor }));

  // Soft gold glow behind the card for visual pop
  const glow = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs><radialGradient id="g"><stop offset="0%" stop-color="#d4af37" stop-opacity="0.35"/><stop offset="70%" stop-color="#d4af37" stop-opacity="0"/></radialGradient></defs>
    <circle cx="${cardX + cardMeta.width / 2}" cy="${cardY + cardMeta.height / 2}" r="${cardMeta.height * 0.7}" fill="url(#g)" />
  </svg>`);

  await sharp(bg)
    .composite([
      { input: glow, top: 0, left: 0 },
      { input: cardBuffer, top: cardY, left: cardX },
      { input: text, top: 0, left: 0 },
    ])
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(outPath);
}

async function main() {
  if (!existsSync(OUT_ROOT)) mkdirSync(OUT_ROOT, { recursive: true });

  for (const v of VARIANTS) {
    const dir = resolve(OUT_ROOT, v.id);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    await compose({
      outPath: resolve(dir, 'square-1200.jpg'),
      width: 1200, height: 1200,
      card: v.card,
      headline: v.squareHeadline,
      sub: v.squareSub,
      layout: 'square',
    });

    await compose({
      outPath: resolve(dir, 'landscape-1200x628.jpg'),
      width: 1200, height: 628,
      card: v.card,
      headline: v.landscapeHeadline,
      sub: v.landscapeSub,
      layout: 'landscape',
    });

    console.log(`✓ ${v.id} — ${v.name}`);
  }
  console.log(`\nAll creatives written to ${OUT_ROOT}/`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
