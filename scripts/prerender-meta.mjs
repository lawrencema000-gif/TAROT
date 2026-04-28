/**
 * Per-route meta prerenderer.
 *
 * After Vite builds dist/index.html, we duplicate it for each indexable
 * route and rewrite the HEAD with route-appropriate <title>, meta
 * description, canonical, OpenGraph tags, and JSON-LD structured data.
 * Crawlers (including Googlebot, Bingbot, ChatGPT/Perplexity scrapers)
 * see correct meta in the source HTML without executing JavaScript.
 *
 * This is not full SSR — body content still hydrates client-side — but
 * it captures the SEO-critical signals (title, description, canonical,
 * structured data) that competitors fully render.
 *
 * Run via npm run build → postbuild → this script.
 *
 * Trade-offs accepted in v1:
 *   - Body content is still SPA-rendered. Modern Googlebot does execute
 *     JS so it sees the body; older bots and AI scrapers may not.
 *   - Structured data per route is generated from static maps in this
 *     file (mirroring src/utils/seo.ts). Drift between the two is a
 *     known risk — kept manageable by the small set of route shapes.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { createClient } from '@supabase/supabase-js';

const DIST = resolve('dist');
const TEMPLATE_PATH = join(DIST, 'index.html');
const SITE_URL = 'https://tarotlife.app';

// Canonical card list — kept in sync with scripts/generate-sitemap.mjs.
const MAJOR_ARCANA = [
  'The Fool', 'The Magician', 'The High Priestess', 'The Empress', 'The Emperor',
  'The Hierophant', 'The Lovers', 'The Chariot', 'Strength', 'The Hermit',
  'The Wheel of Fortune', 'Justice', 'The Hanged Man', 'Death', 'Temperance',
  'The Devil', 'The Tower', 'The Star', 'The Moon', 'The Sun',
  'Judgement', 'The World',
];
const MINOR_RANKS = ['Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Page', 'Knight', 'Queen', 'King'];
const MINOR_SUITS = ['Wands', 'Cups', 'Swords', 'Pentacles'];
const MINOR_ARCANA = MINOR_SUITS.flatMap((suit) => MINOR_RANKS.map((rank) => `${rank} of ${suit}`));
const ALL_CARDS = [...MAJOR_ARCANA, ...MINOR_ARCANA];

const SPREAD_SLUGS = [
  'one-card-daily', 'three-card-past-present-future', 'celtic-cross', 'horseshoe',
  'relationship-cross', 'soulmate', 'love-yes-no',
  'career-path', 'job-decision', 'money-flow',
  'mind-body-spirit', 'weekly-forecast',
  'shadow-work', 'higher-self',
  'new-moon-intentions', 'full-moon-release',
  'crossroads', 'yes-no-pulse',
];

const ASTRO_SLUGS = [
  'aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces',
  'sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto',
  'first-house','second-house','third-house','fourth-house','fifth-house','sixth-house',
  'seventh-house','eighth-house','ninth-house','tenth-house','eleventh-house','twelfth-house',
  'conjunction','sextile','square','trine','opposition','quincunx',
];

function toSlug(name) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function titleCase(slug) {
  return slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ────────────────────────────────────────────────────────────────────
// Per-route meta builders — return { title, description, jsonLd }
// ────────────────────────────────────────────────────────────────────

function homeMeta() {
  return {
    title: 'Arcana - Know yourself. One ritual a day.',
    description: 'A calming daily practice with astrology, tarot, and reflective journaling. Free 3-day Premium trial.',
    canonical: `${SITE_URL}/`,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': `${SITE_URL}#organization`,
        name: 'Arcana',
        alternateName: ['Arcana Tarot', 'TarotLife'],
        url: SITE_URL,
        logo: `${SITE_URL}/image.png`,
        sameAs: [
          'https://play.google.com/store/apps/details?id=com.arcana.app',
        ],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Arcana',
        url: SITE_URL,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${SITE_URL}/blog?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };
}

function tarotMeaningsHubMeta() {
  return {
    title: 'Tarot Card Meanings — All 78 Cards | Arcana',
    description: 'Complete tarot card meanings library — all 78 Rider-Waite-Smith cards with upright, reversed, love, career, yes/no, astrological correspondences and more.',
    canonical: `${SITE_URL}/tarot-meanings`,
    jsonLd: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Tarot Card Meanings',
      url: `${SITE_URL}/tarot-meanings`,
      description: 'All 78 tarot cards with full upright/reversed meanings.',
    }],
  };
}

function tarotCardMeta(name) {
  const slug = toSlug(name);
  const isMajor = MAJOR_ARCANA.includes(name);
  return {
    title: `${name} Tarot Card Meaning ${isMajor ? '— Major Arcana' : ''} | Arcana`,
    description: `${name} tarot meaning: upright and reversed interpretations, love, career, finances, yes/no readings, astrological correspondences, card combinations, and FAQ.`,
    canonical: `${SITE_URL}/tarot-meanings/${slug}`,
    jsonLd: [{
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: `${name} Tarot Card Meaning`,
      description: `Complete ${name} tarot card meaning with upright + reversed + love + career interpretations.`,
      url: `${SITE_URL}/tarot-meanings/${slug}`,
      author: { '@type': 'Organization', name: 'Arcana', url: SITE_URL },
      publisher: { '@type': 'Organization', name: 'Arcana', url: SITE_URL },
    }],
  };
}

function spreadsHubMeta() {
  return {
    title: 'Tarot Spreads — Complete Library | Arcana',
    description: 'Comprehensive tarot spread library: Celtic Cross, three-card, love, career, lunar cycles, shadow work, and more. Position-by-position meanings.',
    canonical: `${SITE_URL}/spreads`,
    jsonLd: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Tarot Spreads Library',
      url: `${SITE_URL}/spreads`,
    }],
  };
}

function spreadDetailMeta(slug) {
  const name = titleCase(slug);
  return {
    title: `${name} Tarot Spread — Position Meanings | Arcana`,
    description: `${name} tarot spread: position-by-position interpretation, when to use it, example questions, and FAQs.`,
    canonical: `${SITE_URL}/spreads/${slug}`,
    jsonLd: [{
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: `How to read the ${name} tarot spread`,
      url: `${SITE_URL}/spreads/${slug}`,
    }],
  };
}

function astrologyHubMeta() {
  return {
    title: 'Astrology Learn — Signs, Planets, Houses & Aspects | Arcana',
    description: 'Complete astrology reference: 12 zodiac signs, 10 planets, 12 houses, and 6 major aspects with rulerships, correspondences, and FAQ.',
    canonical: `${SITE_URL}/astrology`,
    jsonLd: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Astrology Learning Hub',
      url: `${SITE_URL}/astrology`,
    }],
  };
}

function astrologyEntryMeta(slug) {
  const name = titleCase(slug);
  return {
    title: `${name} — Astrology Meaning | Arcana`,
    description: `${name}: complete astrological meaning, in love, career, and spirituality. Strengths, challenges, FAQs.`,
    canonical: `${SITE_URL}/astrology/${slug}`,
    jsonLd: [{
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: `${name} — Astrology`,
      url: `${SITE_URL}/astrology/${slug}`,
      author: { '@type': 'Organization', name: 'Arcana', url: SITE_URL },
      publisher: { '@type': 'Organization', name: 'Arcana', url: SITE_URL },
    }],
  };
}

function blogHubMeta() {
  return {
    title: 'Blog — Tarot, Astrology, Daily Practice | Arcana',
    description: 'Articles on tarot, astrology, and daily ritual practice. New posts daily.',
    canonical: `${SITE_URL}/blog`,
    jsonLd: [{
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: 'Arcana Blog',
      url: `${SITE_URL}/blog`,
    }],
  };
}

function blogPostMeta(post) {
  return {
    title: `${post.title} | Arcana Blog`,
    description: post.excerpt || `Read "${post.title}" on the Arcana blog.`,
    canonical: `${SITE_URL}/blog/${post.slug}`,
    image: post.cover_image || `${SITE_URL}/image.png`,
    jsonLd: [{
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description: post.excerpt || '',
      image: post.cover_image || `${SITE_URL}/image.png`,
      url: `${SITE_URL}/blog/${post.slug}`,
      datePublished: post.published_at,
      dateModified: post.updated_at || post.published_at,
      author: { '@type': 'Organization', name: 'Arcana', url: SITE_URL },
      publisher: { '@type': 'Organization', name: 'Arcana', url: SITE_URL },
    }],
  };
}

function signinMeta() {
  return {
    title: 'Sign in to Arcana — Continue your daily ritual',
    description: 'Sign in to Arcana to continue your daily tarot, horoscope, and journaling practice.',
    canonical: `${SITE_URL}/signin`,
    jsonLd: [],
  };
}

function signupMeta() {
  return {
    title: 'Sign up — Free 3-day Premium trial | Arcana',
    description: 'Create your free Arcana account. Daily tarot readings, personalized horoscopes, journaling, and a 3-day Premium trial.',
    canonical: `${SITE_URL}/signup`,
    jsonLd: [],
  };
}

// ────────────────────────────────────────────────────────────────────
// HTML rewriter — replaces <title>, meta description, canonical, OG,
// twitter, and injects JSON-LD <script>s before </head>.
// ────────────────────────────────────────────────────────────────────

function rewriteHead(template, meta) {
  let html = template;

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(meta.title)}</title>`);
  html = html.replace(
    /<meta name="description" content="[^"]*" \/>/,
    `<meta name="description" content="${escapeAttr(meta.description)}" />`,
  );

  // canonical — replace existing or insert
  if (/<link rel="canonical"/.test(html)) {
    html = html.replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${escapeAttr(meta.canonical)}" />`);
  } else {
    html = html.replace('</head>', `    <link rel="canonical" href="${escapeAttr(meta.canonical)}" />\n  </head>`);
  }

  // OG/Twitter title + description + url
  html = html.replace(
    /<meta property="og:title" content="[^"]*" \/>/,
    `<meta property="og:title" content="${escapeAttr(meta.title)}" />`,
  );
  html = html.replace(
    /<meta property="og:description" content="[^"]*" \/>/,
    `<meta property="og:description" content="${escapeAttr(meta.description)}" />`,
  );
  html = html.replace(
    /<meta property="og:url" content="[^"]*" \/>/,
    `<meta property="og:url" content="${escapeAttr(meta.canonical)}" />`,
  );
  html = html.replace(
    /<meta name="twitter:title" content="[^"]*" \/>/,
    `<meta name="twitter:title" content="${escapeAttr(meta.title)}" />`,
  );
  html = html.replace(
    /<meta name="twitter:description" content="[^"]*" \/>/,
    `<meta name="twitter:description" content="${escapeAttr(meta.description)}" />`,
  );

  if (meta.image) {
    const imgUrl = meta.image.startsWith('http') ? meta.image : `${SITE_URL}${meta.image}`;
    html = html.replace(
      /<meta property="og:image" content="[^"]*" \/>/,
      `<meta property="og:image" content="${escapeAttr(imgUrl)}" />`,
    );
    html = html.replace(
      /<meta name="twitter:image" content="[^"]*" \/>/,
      `<meta name="twitter:image" content="${escapeAttr(imgUrl)}" />`,
    );
  }

  // JSON-LD blocks injected before </head>
  if (meta.jsonLd && meta.jsonLd.length) {
    const blocks = meta.jsonLd
      .map((d) => `    <script type="application/ld+json">${JSON.stringify(d)}</script>`)
      .join('\n');
    html = html.replace('</head>', `${blocks}\n  </head>`);
  }

  return html;
}

function escapeHtml(s) {
  return String(s).replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeAttr(s) {
  return String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function writeRoute(routePath, meta, template) {
  const html = rewriteHead(template, meta);
  // Map "/" → dist/index.html (overwrite root template too — outer routes
  // should not rely on root meta), "/x" → dist/x/index.html
  const cleanPath = routePath === '/' ? '' : routePath.replace(/^\/+/, '');
  const outDir = cleanPath ? join(DIST, cleanPath) : DIST;
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'index.html'), html);
}

async function fetchBlogPosts() {
  const url = process.env.VITE_SUPABASE_URL || '';
  const key = process.env.VITE_SUPABASE_ANON_KEY || '';
  if (!url || !key) return [];
  try {
    const supa = createClient(url, key);
    const { data } = await supa
      .from('blog_posts')
      .select('slug, title, excerpt, cover_image, published_at, updated_at')
      .eq('published', true)
      .order('published_at', { ascending: false })
      .limit(200);
    return data || [];
  } catch {
    return [];
  }
}

async function main() {
  if (!existsSync(TEMPLATE_PATH)) {
    console.warn(`[prerender-meta] dist/index.html not found — skipping.`);
    return;
  }
  const template = readFileSync(TEMPLATE_PATH, 'utf8');
  let count = 0;

  // Public root + auth pages + main hubs
  writeRoute('/', homeMeta(), template); count++;
  writeRoute('/signin', signinMeta(), template); count++;
  writeRoute('/signup', signupMeta(), template); count++;
  writeRoute('/tarot-meanings', tarotMeaningsHubMeta(), template); count++;
  writeRoute('/spreads', spreadsHubMeta(), template); count++;
  writeRoute('/astrology', astrologyHubMeta(), template); count++;
  writeRoute('/blog', blogHubMeta(), template); count++;

  // 78 tarot card pages
  for (const card of ALL_CARDS) {
    writeRoute(`/tarot-meanings/${toSlug(card)}`, tarotCardMeta(card), template);
    count++;
  }

  // 18 spread leaf pages
  for (const slug of SPREAD_SLUGS) {
    writeRoute(`/spreads/${slug}`, spreadDetailMeta(slug), template);
    count++;
  }

  // 40 astrology leaf pages
  for (const slug of ASTRO_SLUGS) {
    writeRoute(`/astrology/${slug}`, astrologyEntryMeta(slug), template);
    count++;
  }

  // Blog posts (dynamic)
  try { const env = readFileSync('.env', 'utf8'); env.split('\n').forEach((line) => { const [k, ...v] = line.split('='); if (k && !k.startsWith('#')) process.env[k.trim()] = v.join('=').trim(); }); } catch {}
  const posts = await fetchBlogPosts();
  for (const post of posts) {
    writeRoute(`/blog/${post.slug}`, blogPostMeta(post), template);
    count++;
  }

  console.log(`[prerender-meta] Wrote ${count} prerendered route HTML files (${posts.length} blog posts).`);
}

main().catch((err) => {
  console.error('[prerender-meta] failed:', err);
  process.exit(1);
});
