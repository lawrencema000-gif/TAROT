/**
 * Generate sitemap.xml with all public URLs:
 *   - Static pages (/, /blog, /horoscope, /tarot-meanings, privacy)
 *   - 78 tarot card meaning pages (/tarot-meanings/<slug>)
 *   - Published blog posts from Supabase
 *
 * Run: node scripts/generate-sitemap.mjs
 * Called automatically by: npm run build (via postbuild)
 */
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, readFileSync } from 'fs';
import { resolve } from 'path';

// Load env vars from .env file
try { const env = readFileSync('.env', 'utf8'); env.split('\n').forEach(line => { const [k, ...v] = line.split('='); if (k && !k.startsWith('#')) process.env[k.trim()] = v.join('=').trim(); }); } catch { /* .env may not exist in CI */ }

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const siteUrl = 'https://tarotlife.app';

if (!supabaseUrl || !supabaseKey) {
  console.warn('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — generating static sitemap only');
}

// Mirrors cardToSlug() in TarotMeaningsPage.tsx — keep in sync.
const toSlug = (name) =>
  name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

const MAJOR_ARCANA = [
  'The Fool', 'The Magician', 'The High Priestess', 'The Empress', 'The Emperor',
  'The Hierophant', 'The Lovers', 'The Chariot', 'Strength', 'The Hermit',
  'The Wheel of Fortune', 'Justice', 'The Hanged Man', 'Death', 'Temperance',
  'The Devil', 'The Tower', 'The Star', 'The Moon', 'The Sun',
  'Judgement', 'The World',
];

const MINOR_RANKS = [
  'Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
  'Eight', 'Nine', 'Ten', 'Page', 'Knight', 'Queen', 'King',
];
const MINOR_SUITS = ['Wands', 'Cups', 'Swords', 'Pentacles'];
const MINOR_ARCANA = MINOR_SUITS.flatMap(suit =>
  MINOR_RANKS.map(rank => `${rank} of ${suit}`)
);

const ALL_CARDS = [...MAJOR_ARCANA, ...MINOR_ARCANA];

// Supported locales mirror src/i18n/config.ts SUPPORTED_LOCALES.
const SUPPORTED_LOCALES = ['en', 'ja', 'ko', 'zh'];

/**
 * Emit xhtml:link alternates for every supported locale plus x-default so
 * Google serves the right-language page in SERPs. We encode locale as a
 * ?lang=xx query param since the SPA routes all locales through the same
 * URL space; the client's i18next LanguageDetector picks it up on load.
 */
function hreflangLinks(baseLoc) {
  const sep = baseLoc.includes('?') ? '&' : '?';
  const alt = (locale) => `${baseLoc}${sep}lang=${locale}`;
  const lines = SUPPORTED_LOCALES.map(
    (locale) => `    <xhtml:link rel="alternate" hreflang="${locale}" href="${alt(locale)}"/>`
  );
  lines.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${baseLoc}"/>`);
  return lines.join('\n');
}

async function fetchBlogPosts() {
  if (!supabaseUrl || !supabaseKey) return [];
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from('blog_posts')
      .select('slug, title, updated_at, published_at')
      .eq('published', true)
      .order('published_at', { ascending: false });
    if (error) {
      console.warn(`Failed to fetch blog posts (non-fatal): ${error.message}`);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.warn(`Supabase fetch crashed (non-fatal): ${err.message}`);
    return [];
  }
}

async function generate() {
  const posts = await fetchBlogPosts();

  const today = new Date().toISOString().split('T')[0];

  const urls = [
    { loc: `${siteUrl}/`, changefreq: 'weekly', priority: '1.0', lastmod: today },
    { loc: `${siteUrl}/blog`, changefreq: 'daily', priority: '0.9', lastmod: today },
    { loc: `${siteUrl}/tarot-meanings`, changefreq: 'monthly', priority: '0.9', lastmod: today },
    { loc: `${siteUrl}/spreads`, changefreq: 'monthly', priority: '0.9', lastmod: today },
    { loc: `${siteUrl}/astrology`, changefreq: 'monthly', priority: '0.9', lastmod: today },
    { loc: `${siteUrl}/numerology`, changefreq: 'monthly', priority: '0.9', lastmod: today },
    { loc: `${siteUrl}/crystals`, changefreq: 'monthly', priority: '0.9', lastmod: today },
    { loc: `${siteUrl}/glossary`, changefreq: 'monthly', priority: '0.8', lastmod: today },
    { loc: `${siteUrl}/horoscope`, changefreq: 'daily', priority: '0.8', lastmod: today },
    { loc: `${siteUrl}/signin`, changefreq: 'yearly', priority: '0.5', lastmod: today },
    { loc: `${siteUrl}/signup`, changefreq: 'yearly', priority: '0.7', lastmod: today },
    { loc: `${siteUrl}/privacy-policy.html`, changefreq: 'monthly', priority: '0.3' },
  ];

  // 40 astrology learn pages
  const ASTRO_SLUGS = [
    // signs
    'aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces',
    // planets
    'sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto',
    // houses
    'first-house','second-house','third-house','fourth-house','fifth-house','sixth-house',
    'seventh-house','eighth-house','ninth-house','tenth-house','eleventh-house','twelfth-house',
    // aspects
    'conjunction','sextile','square','trine','opposition','quincunx',
  ];
  for (const slug of ASTRO_SLUGS) {
    urls.push({
      loc: `${siteUrl}/astrology/${slug}`,
      changefreq: 'monthly',
      priority: '0.7',
      lastmod: today,
    });
  }

  // 18 base tarot spread pages + 22 Major Arcana spreads = 40 total
  const SPREAD_SLUGS = [
    // base library
    'one-card-daily', 'three-card-past-present-future', 'celtic-cross', 'horseshoe',
    'relationship-cross', 'soulmate', 'love-yes-no',
    'career-path', 'job-decision', 'money-flow',
    'mind-body-spirit', 'weekly-forecast',
    'shadow-work', 'higher-self',
    'new-moon-intentions', 'full-moon-release',
    'crossroads', 'yes-no-pulse',
    // 22 Major Arcana spreads (one per card)
    'the-fool-spread', 'the-magician-spread', 'the-high-priestess-spread', 'the-empress-spread',
    'the-emperor-spread', 'the-hierophant-spread', 'the-lovers-spread', 'the-chariot-spread',
    'strength-spread', 'the-hermit-spread', 'the-wheel-of-fortune-spread', 'justice-spread',
    'the-hanged-man-spread', 'death-spread', 'temperance-spread', 'the-devil-spread',
    'the-tower-spread', 'the-star-spread', 'the-moon-spread', 'the-sun-spread',
    'judgement-spread', 'the-world-spread',
  ];
  for (const slug of SPREAD_SLUGS) {
    urls.push({
      loc: `${siteUrl}/spreads/${slug}`,
      changefreq: 'monthly',
      priority: '0.7',
      lastmod: today,
    });
  }

  // 12 numerology pages
  const NUMEROLOGY_SLUGS = ['1','2','3','4','5','6','7','8','9','11','22','33'];
  for (const slug of NUMEROLOGY_SLUGS) {
    urls.push({
      loc: `${siteUrl}/numerology/${slug}`,
      changefreq: 'monthly',
      priority: '0.7',
      lastmod: today,
    });
  }

  // 30 crystal pages
  const CRYSTAL_SLUGS = [
    'rose-quartz','rhodonite','rhodochrosite','malachite','emerald',
    'black-tourmaline','obsidian','hematite','jet','smoky-quartz',
    'citrine','pyrite','green-aventurine','jade','tigers-eye',
    'clear-quartz','fluorite','sodalite','lapis-lazuli','sapphire',
    'amethyst','selenite','bloodstone','carnelian','turquoise',
    'moonstone','labradorite','opal','kyanite','angelite',
  ];
  for (const slug of CRYSTAL_SLUGS) {
    urls.push({
      loc: `${siteUrl}/crystals/${slug}`,
      changefreq: 'monthly',
      priority: '0.7',
      lastmod: today,
    });
  }

  // 63 glossary entries
  const GLOSSARY_SLUGS = [
    // tarot
    'arcana','major-arcana','minor-arcana','suit','court-cards','page','knight','queen','king','spread','querent','reversed','upright','significator','deck',
    // astrology
    'natal-chart','ascendant','descendant','midheaven','ic','transit','retrograde','conjunction','opposition','square','trine','sextile','aspect','ephemeris','decan',
    // numerology
    'life-path','expression-number','soul-urge','master-number','karmic-number','numerology','pythagorean','chaldean',
    // spirituality
    'chakra','aura','third-eye','kundalini','akashic-records','karma','meditation','mindfulness','manifestation','smudging','grounding','intuition',
    // divination
    'divination','scrying','oracle','runes','i-ching','lenormand','palmistry','dowsing',
    // general
    'new-moon','full-moon','eclipse','mercury-retrograde','mercury-station',
  ];
  for (const slug of GLOSSARY_SLUGS) {
    urls.push({
      loc: `${siteUrl}/glossary/${slug}`,
      changefreq: 'monthly',
      priority: '0.6',
      lastmod: today,
    });
  }

  // 78 tarot card meaning pages
  for (const name of ALL_CARDS) {
    urls.push({
      loc: `${siteUrl}/tarot-meanings/${toSlug(name)}`,
      changefreq: 'monthly',
      priority: '0.7',
      lastmod: today,
    });
  }

  // Blog post pages
  for (const post of posts || []) {
    const lastmod = (post.updated_at || post.published_at || today).split('T')[0];
    urls.push({
      loc: `${siteUrl}/blog/${post.slug}`,
      changefreq: 'monthly',
      priority: '0.7',
      lastmod,
    });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
${hreflangLinks(u.loc)}
  </url>`).join('\n')}
</urlset>`;

  writeFileSync(resolve('public/sitemap.xml'), xml);
  try {
    writeFileSync(resolve('dist/sitemap.xml'), xml);
  } catch {
    // dist/ may not exist yet during first run
  }

  console.log(
    `Sitemap generated with ${urls.length} URLs ` +
    `(${ALL_CARDS.length} tarot cards, ${posts?.length || 0} blog posts)`
  );

  // Refresh llms.txt with the latest blog post list. Keeps AI crawlers
  // (ChatGPT, Perplexity, Gemini) up to date with our newest content.
  try {
    const llmsPath = resolve('public/llms.txt');
    let llmsTxt = readFileSync(llmsPath, 'utf8');
    const marker = '## Latest blog posts';
    const blogList = (posts || [])
      .slice(0, 50)
      .map((p) => `- [${p.title}](${siteUrl}/blog/${p.slug})${p.published_at ? ` (${p.published_at.split('T')[0]})` : ''}`)
      .join('\n');
    const newSection = `${marker}\n\nFresh SEO/GEO content published daily by the Arcana editorial system. ${posts?.length || 0} posts as of ${today}.\n\n${blogList}\n`;
    if (llmsTxt.includes(marker)) {
      // Replace existing section up to next ## or EOF.
      llmsTxt = llmsTxt.replace(/## Latest blog posts[\s\S]*?(?=\n##\s|$)/, newSection);
    } else {
      llmsTxt = llmsTxt.trimEnd() + '\n\n' + newSection;
    }
    writeFileSync(llmsPath, llmsTxt);
    try { writeFileSync(resolve('dist/llms.txt'), llmsTxt); } catch { /* dist may not exist on first run */ }
    console.log(`llms.txt refreshed with ${posts?.length || 0} blog post entries.`);
  } catch (e) {
    console.warn('llms.txt refresh skipped:', e.message);
  }
}

generate();
