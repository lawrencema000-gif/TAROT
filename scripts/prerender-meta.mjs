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
import {
  loadContentData, wrapBody, SEO_STYLE, landingHeroBody, LANDING_STYLE,
  tarotCardBody, astroBody, crystalBody, glossaryBody, numerologyBody, spreadBody, blogPostBody,
  cartomancyCardBody, cartomancyLessonBody,
  hubBody, tarotHubLinks, astroHubLinks, crystalHubLinks, glossaryHubLinks, numerologyHubLinks, spreadHubLinks, blogHubLinks,
  cartomancyCardLinks, cartomancyLessonLinks,
} from './seo-body.mjs';

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
  // 22 Major Arcana spreads
  'the-fool-spread', 'the-magician-spread', 'the-high-priestess-spread', 'the-empress-spread',
  'the-emperor-spread', 'the-hierophant-spread', 'the-lovers-spread', 'the-chariot-spread',
  'strength-spread', 'the-hermit-spread', 'the-wheel-of-fortune-spread', 'justice-spread',
  'the-hanged-man-spread', 'death-spread', 'temperance-spread', 'the-devil-spread',
  'the-tower-spread', 'the-star-spread', 'the-moon-spread', 'the-sun-spread',
  'judgement-spread', 'the-world-spread',
];

const NUMEROLOGY_SLUGS = ['1','2','3','4','5','6','7','8','9','11','22','33'];

const CRYSTAL_SLUGS = [
  'rose-quartz','rhodonite','rhodochrosite','malachite','emerald',
  'black-tourmaline','obsidian','hematite','jet','smoky-quartz',
  'citrine','pyrite','green-aventurine','jade','tigers-eye',
  'clear-quartz','fluorite','sodalite','lapis-lazuli','sapphire',
  'amethyst','selenite','bloodstone','carnelian','turquoise',
  'moonstone','labradorite','opal','kyanite','angelite',
];

const GLOSSARY_SLUGS = [
  'arcana','major-arcana','minor-arcana','suit','court-cards','page','knight','queen','king','spread','querent','reversed','upright','significator','deck',
  'natal-chart','ascendant','descendant','midheaven','ic','transit','retrograde','conjunction','opposition','square','trine','sextile','aspect','ephemeris','decan',
  'life-path','expression-number','soul-urge','master-number','karmic-number','numerology','pythagorean','chaldean',
  'chakra','aura','third-eye','kundalini','akashic-records','karma','meditation','mindfulness','manifestation','smudging','grounding','intuition',
  'divination','scrying','oracle','runes','i-ching','lenormand','palmistry','dowsing',
  'new-moon','full-moon','eclipse','mercury-retrograde','mercury-station',
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

function numerologyHubMeta() {
  return {
    title: 'Numerology — Life Path Numbers Explained | Arcana',
    description: 'Complete numerology reference: 9 core numbers + 3 master numbers (11, 22, 33). Pythagorean tradition, life-path meanings, tarot correspondences.',
    canonical: `${SITE_URL}/numerology`,
    jsonLd: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Numerology Learning Hub',
      url: `${SITE_URL}/numerology`,
    }],
  };
}

function numerologyEntryMeta(slug) {
  return {
    title: `Number ${slug} — Life Path Meaning | Arcana`,
    description: `Number ${slug} life-path meaning: personality, strengths, challenges, in love, career, spirituality, and tarot correspondence.`,
    canonical: `${SITE_URL}/numerology/${slug}`,
    jsonLd: [{
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: `Numerology Number ${slug}`,
      url: `${SITE_URL}/numerology/${slug}`,
      author: { '@type': 'Organization', name: 'Arcana', url: SITE_URL },
      publisher: { '@type': 'Organization', name: 'Arcana', url: SITE_URL },
    }],
  };
}

function crystalsHubMeta() {
  return {
    title: 'Crystal Meanings — 30 Stones Explained | Arcana',
    description: 'Comprehensive crystal reference: 30 stones with metaphysical properties, chakra associations, Mohs hardness, and tarot connections.',
    canonical: `${SITE_URL}/crystals`,
    jsonLd: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Crystals Learning Hub',
      url: `${SITE_URL}/crystals`,
    }],
  };
}

function crystalEntryMeta(slug) {
  const name = titleCase(slug);
  return {
    title: `${name} — Meaning, Properties & How to Use | Arcana`,
    description: `${name} crystal: metaphysical properties, chakra associations, how to use, cleansing methods, and tarot connection.`,
    canonical: `${SITE_URL}/crystals/${slug}`,
    jsonLd: [{
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: `${name} — Crystal Meaning`,
      url: `${SITE_URL}/crystals/${slug}`,
      author: { '@type': 'Organization', name: 'Arcana', url: SITE_URL },
      publisher: { '@type': 'Organization', name: 'Arcana', url: SITE_URL },
    }],
  };
}

function glossaryHubMeta() {
  return {
    title: 'Glossary — Tarot, Astrology, Numerology Terms | Arcana',
    description: '63 terms with definitions across tarot, astrology, numerology, spirituality, and divination.',
    canonical: `${SITE_URL}/glossary`,
    jsonLd: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Glossary',
      url: `${SITE_URL}/glossary`,
    }],
  };
}

function glossaryEntryMeta(slug) {
  const term = titleCase(slug);
  return {
    title: `${term} — Definition | Arcana Glossary`,
    description: `Definition of ${term}, including origin and usage in context.`,
    canonical: `${SITE_URL}/glossary/${slug}`,
    jsonLd: [{
      '@context': 'https://schema.org',
      '@type': 'DefinedTerm',
      name: term,
      url: `${SITE_URL}/glossary/${slug}`,
      inDefinedTermSet: { '@type': 'DefinedTermSet', name: 'Arcana Glossary', url: `${SITE_URL}/glossary` },
    }],
  };
}

// ── Cartomancy (src/data/cartomancy): hub, 54 card pages, 12-lesson guide ──
// Slugs come from the data (`PlayingCard.slug`, `CartoLesson.slug`), never
// from a name, so the route list is read from the esbuild bundle at run time.

function cartomancyHubMeta(cardCount, lessonCount) {
  return {
    title: 'Cartomancy — Playing Card Reading | Arcana',
    description: `Read an ordinary deck of playing cards: ${cardCount} card meanings, nine spreads from a single card to the Romany and the Wish spread, and a ${lessonCount}-lesson guide to suits, numbers, courts and combinations.`,
    canonical: `${SITE_URL}/cartomancy`,
    jsonLd: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${SITE_URL}/cartomancy`,
      name: 'Cartomancy — Playing Card Reading',
      url: `${SITE_URL}/cartomancy`,
      description: 'Playing-card reading in the English and American tradition: card meanings, spreads and a guide.',
    }],
  };
}

function cartomancyCardsHubMeta(cards) {
  return {
    title: 'Playing Card Meanings — All 54 Cards in Cartomancy | Arcana',
    description: 'Every playing card read in cartomancy: Hearts, Clubs, Diamonds and Spades from Ace to King, plus the two Jokers — upright, reversed, love, career, advice, timing and combinations.',
    canonical: `${SITE_URL}/cartomancy/cards`,
    jsonLd: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${SITE_URL}/cartomancy/cards`,
      name: 'Playing Card Meanings',
      url: `${SITE_URL}/cartomancy/cards`,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: cards.length,
        itemListElement: cards.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, url: `${SITE_URL}/cartomancy/cards/${c.slug}` })),
      },
    }],
  };
}

function cartomancyCardMeta(card) {
  const url = `${SITE_URL}/cartomancy/cards/${card.slug}`;
  // quickMeaning is one or two short sentences (~60 characters); the search
  // snippet gets it plus what the page covers, so it reads as an answer
  // and still says why to click.
  const description = `${card.quickMeaning} The ${card.name} in playing-card reading: upright and reversed, love, career, timing and combinations.`;
  return {
    title: `${card.name} Meaning in Cartomancy — Playing Card Reading | Arcana`,
    description,
    canonical: url,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        '@id': `${url}#article`,
        headline: `${card.name} Meaning in Cartomancy`,
        description: card.quickMeaning,
        url,
        keywords: (card.keywords || []).join(', '),
        author: { '@type': 'Organization', name: 'Arcana', url: SITE_URL },
        publisher: { '@type': 'Organization', name: 'Arcana', url: SITE_URL },
        isPartOf: { '@type': 'CollectionPage', '@id': `${SITE_URL}/cartomancy/cards` },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Cartomancy', item: `${SITE_URL}/cartomancy` },
          { '@type': 'ListItem', position: 3, name: 'Playing card meanings', item: `${SITE_URL}/cartomancy/cards` },
          { '@type': 'ListItem', position: 4, name: card.name, item: url },
        ],
      },
    ],
  };
}

function cartomancyGuideHubMeta(lessons) {
  return {
    title: 'How to Read Playing Cards — The Cartomancy Guide | Arcana',
    description: `${lessons.length} short lessons: the deck in your hand, the four suits, numbers Ace to Ten, the court cards, red and black, the Jokers, shuffling and asking well, one card and three, combinations, timing, the big spreads, and reading for others.`,
    canonical: `${SITE_URL}/cartomancy/guide`,
    jsonLd: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${SITE_URL}/cartomancy/guide`,
      name: 'The Cartomancy Guide',
      url: `${SITE_URL}/cartomancy/guide`,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: lessons.length,
        itemListElement: lessons.map((l, i) => ({ '@type': 'ListItem', position: i + 1, name: l.title, url: `${SITE_URL}/cartomancy/guide/${l.slug}` })),
      },
    }],
  };
}

function cartomancyLessonMeta(lesson) {
  const url = `${SITE_URL}/cartomancy/guide/${lesson.slug}`;
  return {
    title: `${lesson.title} — Cartomancy Guide, ${lesson.eyebrow || `Lesson ${lesson.order}`} | Arcana`,
    description: lesson.lede,
    canonical: url,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        '@id': `${url}#article`,
        headline: lesson.title,
        description: lesson.lede,
        url,
        author: { '@type': 'Organization', name: 'Arcana', url: SITE_URL },
        publisher: { '@type': 'Organization', name: 'Arcana', url: SITE_URL },
        isPartOf: { '@type': 'CollectionPage', '@id': `${SITE_URL}/cartomancy/guide` },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Cartomancy', item: `${SITE_URL}/cartomancy` },
          { '@type': 'ListItem', position: 3, name: 'Guide', item: `${SITE_URL}/cartomancy/guide` },
          { '@type': 'ListItem', position: 4, name: lesson.title, item: url },
        ],
      },
    ],
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

// URL form — ONE canonical, the slashless one, everywhere.
//
// Every route is written twice: `dist/x/index.html` (Netlify serves it at
// `/x/`) and `dist/x.html` (served at `/x`, pretty URLs on), so neither form
// redirects. The previous arrangement wrote only `x/index.html` and chose the
// slash form as canonical; but the app links the slashless form everywhere
// (TarotCardMeaningPage, PickACardPage, the footer, App.tsx), so every
// in-app and every shared link cost a 301 (+776 ms on the card page in
// Lighthouse). The canonical, the sitemap, the hub link lists and the JSON-LD
// now all name the slashless form the links use; the slash form stays
// reachable and points at it. Files (privacy-policy.html) and the root are
// untouched.
function withoutSlash(u) {
  const [base, qs] = u.split('?');
  if (base === `${SITE_URL}/` || base === SITE_URL) return u;
  const last = base.split('/').pop();
  if (!last || last.includes('.') || last.includes('#')) return u;
  const bare = base.replace(/\/+$/, '');
  return qs !== undefined ? `${bare}?${qs}` : bare;
}

/** Deep-walk JSON-LD and normalize every URL-bearing string that points at
 *  our site to the slashless form, so structured data agrees with the
 *  canonical + sitemap. */
function normalizeJsonLdUrls(node) {
  if (Array.isArray(node)) return node.map(normalizeJsonLdUrls);
  if (node && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      out[k] = (typeof v === 'string' && v.startsWith(SITE_URL))
        ? withoutSlash(v)
        : normalizeJsonLdUrls(v);
    }
    return out;
  }
  return node;
}

function rewriteHead(template, meta, body, opts = {}) {
  let html = template;
  const canon = withoutSlash(meta.canonical);

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(meta.title)}</title>`);
  html = html.replace(
    /<meta name="description" content="[^"]*" \/>/,
    `<meta name="description" content="${escapeAttr(meta.description)}" />`,
  );

  // canonical — replace existing or insert
  if (/<link rel="canonical"/.test(html)) {
    html = html.replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${escapeAttr(canon)}" />`);
  } else {
    html = html.replace('</head>', `    <link rel="canonical" href="${escapeAttr(canon)}" />\n  </head>`);
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
    `<meta property="og:url" content="${escapeAttr(canon)}" />`,
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

  // JSON-LD blocks injected before </head> (URLs slash-normalized so
  // structured data matches the canonical/sitemap form).
  if (meta.jsonLd && meta.jsonLd.length) {
    const blocks = meta.jsonLd
      .map((d) => `    <script type="application/ld+json">${JSON.stringify(normalizeJsonLdUrls(d))}</script>`)
      .join('\n');
    html = html.replace('</head>', `${blocks}\n  </head>`);
  }

  // Static body content — the SEO fix. Injected inside #root; main.tsx uses
  // createRoot().render() which replaces these children on hydration, so
  // crawlers index the real content and users get instant first paint.
  // `opts.raw` passes a body that is already wrapped (the landing hero);
  // `opts.style` swaps the inline stylesheet.
  if (body) {
    html = html.replace('</head>', `${opts.style || SEO_STYLE}\n  </head>`);
    html = html.replace('<div id="root"></div>', `<div id="root">${opts.raw ? body : wrapBody(body)}</div>`);
  }

  return html;
}

function escapeHtml(s) {
  return String(s).replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeAttr(s) {
  return String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function writeRoute(routePath, meta, template, body, opts) {
  const html = rewriteHead(template, meta, body, opts);
  // "/" → dist/index.html (overwrite the root template too — outer routes
  // should not rely on root meta). "/x" → dist/x/index.html AND dist/x.html,
  // so both `/x/` and `/x` are a direct 200 (see the URL-form note above).
  const cleanPath = routePath === '/' ? '' : routePath.replace(/^\/+/, '').replace(/\/+$/, '');
  const outDir = cleanPath ? join(DIST, cleanPath) : DIST;
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'index.html'), html);
  if (cleanPath) writeFileSync(join(DIST, `${cleanPath}.html`), html);
}

async function fetchBlogPosts() {
  const url = process.env.VITE_SUPABASE_URL || '';
  const key = process.env.VITE_SUPABASE_ANON_KEY || '';
  if (!url || !key) return [];
  try {
    const supa = createClient(url, key);
    const { data } = await supa
      .from('blog_posts')
      .select('slug, title, excerpt, content, cover_image, published_at, updated_at')
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

  // Load rich content from src/data (via esbuild) + build slug lookups.
  let data = {};
  try { data = await loadContentData(); }
  catch (e) { console.warn('[prerender-meta] content data load failed — writing head-only:', e.message); }
  const cardByName = {}; for (const c of data.fullDeck || []) cardByName[c.name] = c;
  const enrichFor = (c) => c.arcana === 'major' ? (data.majorEnrichment || {})[c.id] : (data.minorEnrichment || {})[toSlug(c.name)];
  const bySlug = (arr, k = 'slug') => { const m = {}; for (const e of arr || []) m[e[k]] = e; return m; };
  const astroMap = bySlug(data.astrologyEntries);
  const crystalMap = bySlug(data.crystalEntries);
  const glossaryMap = bySlug(data.glossaryEntries);
  const numeroMap = bySlug(data.numerologyEntries);
  const spreadMap = data.spreadMap || {};

  // The landing hero as static HTML (LCP element); see landingHeroBody.
  let heroStrings = null;
  let playAlt;
  try {
    const landing = JSON.parse(readFileSync(resolve('src/i18n/locales/en/landing.json'), 'utf8'));
    heroStrings = landing.hero;
    playAlt = landing.play?.alt;
  }
  catch (e) { console.warn('[prerender-meta] landing.json unreadable — root gets a head-only page:', e.message); }

  // Public root + auth pages + main hubs. Hubs get crawlable link lists so
  // Googlebot can reach every leaf page from raw HTML.
  writeRoute('/', homeMeta(), template, heroStrings ? landingHeroBody(heroStrings, playAlt) : undefined, { raw: true, style: LANDING_STYLE }); count++;
  writeRoute('/signin', signinMeta(), template); count++;
  writeRoute('/signup', signupMeta(), template); count++;
  writeRoute('/tarot-meanings', tarotMeaningsHubMeta(), template,
    hubBody('Tarot Card Meanings — All 78 Cards', 'Complete Rider-Waite-Smith tarot meanings: upright, reversed, love, career, yes/no, and astrological correspondences for every card.', tarotHubLinks(data.fullDeck || []))); count++;
  writeRoute('/spreads', spreadsHubMeta(), template,
    hubBody('Tarot Spreads Library', 'Position-by-position guidance for every tarot spread — from the daily one-card to the Celtic Cross and lunar cycles.', spreadHubLinks(SPREAD_SLUGS, spreadMap))); count++;
  writeRoute('/astrology', astrologyHubMeta(), template,
    hubBody('Astrology Reference', 'The 12 zodiac signs, 10 planets, 12 houses, and major aspects — with rulerships, meanings, and correspondences.', astroHubLinks(data.astrologyEntries || []))); count++;
  writeRoute('/numerology', numerologyHubMeta(), template,
    hubBody('Numerology — Life Path Numbers', 'The 9 core numbers plus master numbers 11, 22 and 33 — personality, love, career, and tarot correspondences.', numerologyHubLinks(data.numerologyEntries || []))); count++;
  writeRoute('/crystals', crystalsHubMeta(), template,
    hubBody('Crystal Meanings', 'Metaphysical properties, chakra associations, and how to use 30 healing crystals.', crystalHubLinks(data.crystalEntries || []))); count++;
  writeRoute('/glossary', glossaryHubMeta(), template,
    hubBody('Tarot, Astrology & Numerology Glossary', 'Definitions across tarot, astrology, numerology, and divination.', glossaryHubLinks(data.glossaryEntries || []))); count++;

  // 78 tarot card pages
  for (const name of ALL_CARDS) {
    const card = cardByName[name];
    const body = card ? tarotCardBody(card, enrichFor(card)) : '';
    writeRoute(`/tarot-meanings/${toSlug(name)}`, tarotCardMeta(name), template, body);
    count++;
  }

  // spread leaf pages
  for (const slug of SPREAD_SLUGS) {
    writeRoute(`/spreads/${slug}`, spreadDetailMeta(slug), template, spreadBody(slug, spreadMap[slug]));
    count++;
  }

  // astrology leaf pages
  for (const slug of ASTRO_SLUGS) {
    const e = astroMap[slug];
    writeRoute(`/astrology/${slug}`, astrologyEntryMeta(slug), template, e ? astroBody(e) : '');
    count++;
  }

  // numerology leaf pages
  for (const slug of NUMEROLOGY_SLUGS) {
    const e = numeroMap[slug];
    writeRoute(`/numerology/${slug}`, numerologyEntryMeta(slug), template, e ? numerologyBody(e) : '');
    count++;
  }

  // crystal leaf pages
  for (const slug of CRYSTAL_SLUGS) {
    const e = crystalMap[slug];
    writeRoute(`/crystals/${slug}`, crystalEntryMeta(slug), template, e ? crystalBody(e) : '');
    count++;
  }

  // glossary leaf pages
  for (const slug of GLOSSARY_SLUGS) {
    const e = glossaryMap[slug];
    writeRoute(`/glossary/${slug}`, glossaryEntryMeta(slug), template, e ? glossaryBody(e) : '');
    count++;
  }

  // Cartomancy: hub, the card library, 54 card pages, the guide and 12 lessons.
  const playingCards = data.PLAYING_CARDS_ALL || [];
  const lessons = (data.CARTO_LESSONS || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  if (playingCards.length && lessons.length) {
    writeRoute('/cartomancy', cartomancyHubMeta(playingCards.length, lessons.length), template,
      hubBody('Cartomancy — Playing Card Reading', 'Read an ordinary deck: every card meaning, nine spreads, and a twelve-lesson guide to suits, numbers, courts and combinations.',
        [
          { href: `${SITE_URL}/cartomancy/cards`, label: 'Playing card meanings — all 54 cards' },
          { href: `${SITE_URL}/cartomancy/guide`, label: 'How to read playing cards — the guide' },
          ...cartomancyLessonLinks(lessons),
          ...cartomancyCardLinks(playingCards),
        ])); count++;
    writeRoute('/cartomancy/cards', cartomancyCardsHubMeta(playingCards), template,
      hubBody('Playing Card Meanings', 'Hearts, Clubs, Diamonds and Spades from Ace to King, and the two Jokers — upright, reversed, love, career, advice, timing and combinations.', cartomancyCardLinks(playingCards))); count++;
    for (const card of playingCards) {
      writeRoute(`/cartomancy/cards/${card.slug}`, cartomancyCardMeta(card), template, cartomancyCardBody(card));
      count++;
    }
    writeRoute('/cartomancy/guide', cartomancyGuideHubMeta(lessons), template,
      hubBody('How to Read Playing Cards', 'Twelve short lessons, in reading order, from the deck in your hand to reading for others.', cartomancyLessonLinks(lessons))); count++;
    for (const lesson of lessons) {
      writeRoute(`/cartomancy/guide/${lesson.slug}`, cartomancyLessonMeta(lesson), template, cartomancyLessonBody(lesson));
      count++;
    }
  } else {
    console.warn('[prerender-meta] cartomancy data missing — its routes were not written.');
  }

  // Blog posts (dynamic)
  try { const env = readFileSync('.env', 'utf8'); env.split('\n').forEach((line) => { const [k, ...v] = line.split('='); if (k && !k.startsWith('#')) process.env[k.trim()] = v.join('=').trim(); }); } catch {}
  const posts = await fetchBlogPosts();
  // Blog hub with links to every post
  writeRoute('/blog', blogHubMeta(), template, hubBody('Arcana Blog', 'Articles on tarot, astrology, and daily practice — new posts daily.', blogHubLinks(posts))); count++;
  for (const post of posts) {
    writeRoute(`/blog/${post.slug}`, blogPostMeta(post), template, blogPostBody(post));
    count++;
  }

  console.log(`[prerender-meta] Wrote ${count} prerendered route HTML files (${posts.length} blog posts).`);
}

main().catch((err) => {
  console.error('[prerender-meta] failed:', err);
  process.exit(1);
});
