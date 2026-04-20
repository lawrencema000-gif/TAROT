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
      .select('slug, updated_at, published_at')
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
    { loc: `${siteUrl}/horoscope`, changefreq: 'daily', priority: '0.8', lastmod: today },
    { loc: `${siteUrl}/privacy-policy.html`, changefreq: 'monthly', priority: '0.3' },
  ];

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
}

generate();
