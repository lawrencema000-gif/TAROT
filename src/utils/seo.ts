// ─── SEO Utilities ─────────────────────────────────────────────

const SITE_NAME = 'Arcana';
const SITE_URL = 'https://tarotlife.app';
const DEFAULT_IMAGE = `${SITE_URL}/image.png`;
const DEFAULT_DESC = 'Daily tarot readings, personalized horoscopes, reflective journaling, and personality quizzes — all in one beautifully crafted app.';

function setMeta(attr: 'property' | 'name', key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setLink(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

function removeJsonLd() {
  document.querySelectorAll('script[type="application/ld+json"][data-seo]').forEach(el => el.remove());
}

function addJsonLd(data: Record<string, unknown>) {
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.setAttribute('data-seo', 'true');
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

// ─── Organization (shared across schemas) ──────────────────────
// Expanded 2026-04-25 — `sameAs` is the single most important field
// for brand-entity linking in both traditional SERPs AND generative AI
// crawlers (ChatGPT, Perplexity, Gemini, Claude). When set, Google
// treats cross-linked social profiles as authoritative signals about
// the brand; LLMs use them to resolve "who is Arcana?" queries.
//
// `alternateName` covers common variants users might type.
// `foundingDate` + `areaServed` are secondary signals Google surfaces
// in knowledge panels.
const ORG_SCHEMA = {
  '@type': 'Organization',
  '@id': `${SITE_URL}#organization`,
  name: SITE_NAME,
  alternateName: ['Arcana Tarot', 'TarotLife', 'Arcana by TarotLife'],
  url: SITE_URL,
  logo: { '@type': 'ImageObject', url: DEFAULT_IMAGE, width: 512, height: 512 },
  description: DEFAULT_DESC,
  foundingDate: '2026-01',
  areaServed: 'Worldwide',
  // Cross-link to external profiles. Update when accounts are claimed.
  // Google + LLMs use these as brand-identity anchors.
  sameAs: [
    'https://play.google.com/store/apps/details?id=com.arcana.app',
    'https://www.instagram.com/tarotlife.app/',
    'https://www.tiktok.com/@tarotlife.app',
    'https://twitter.com/tarotlife_app',
    'https://www.pinterest.com/tarotlife/',
  ],
};

/**
 * Set page-level meta tags for SEO
 */
export function setPageMeta(title: string, description?: string, image?: string) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Know yourself. One ritual a day.`;
  const desc = description || DEFAULT_DESC;
  const img = image || DEFAULT_IMAGE;
  const url = window.location.href.split('?')[0].split('#')[0];

  document.title = fullTitle;

  // Basic meta
  setMeta('name', 'description', desc);

  // Canonical URL
  setLink('canonical', url);

  // Open Graph
  setMeta('property', 'og:title', title || SITE_NAME);
  setMeta('property', 'og:description', desc);
  setMeta('property', 'og:image', img);
  setMeta('property', 'og:image:width', '1200');
  setMeta('property', 'og:image:height', '630');
  setMeta('property', 'og:url', url);
  setMeta('property', 'og:type', 'website');
  setMeta('property', 'og:site_name', SITE_NAME);
  setMeta('property', 'og:locale', 'en_US');

  // Twitter Card
  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', title || SITE_NAME);
  setMeta('name', 'twitter:description', desc);
  setMeta('name', 'twitter:image', img);

  // Robots
  setMeta('name', 'robots', 'index, follow, max-image-preview:large');

  // Clean up previous JSON-LD
  removeJsonLd();
}

/**
 * Set article-specific meta tags for blog posts
 */
export function setArticleMeta(post: {
  title: string;
  excerpt?: string | null;
  cover_image?: string | null;
  author?: string | null;
  published_at?: string | null;
  updated_at?: string | null;
  tags?: string[] | null;
  slug: string;
}) {
  const url = `${SITE_URL}/blog/${post.slug}`;
  const desc = post.excerpt || DEFAULT_DESC;
  const img = post.cover_image || DEFAULT_IMAGE;
  const author = post.author || SITE_NAME;

  setPageMeta(post.title, desc, img);

  // Override OG type to article
  setMeta('property', 'og:type', 'article');
  setMeta('property', 'og:url', url);

  // Article-specific OG tags
  if (post.published_at) setMeta('property', 'article:published_time', post.published_at);
  if (post.updated_at) setMeta('property', 'article:modified_time', post.updated_at);
  setMeta('property', 'article:author', author);
  if (post.tags?.length) {
    // Remove old article tags
    document.querySelectorAll('meta[property="article:tag"][data-seo]').forEach(el => el.remove());
    post.tags.forEach(tag => {
      const el = document.createElement('meta');
      el.setAttribute('property', 'article:tag');
      el.setAttribute('content', tag);
      el.setAttribute('data-seo', 'true');
      document.head.appendChild(el);
    });
  }

  // Canonical
  setLink('canonical', url);

  // JSON-LD: Article + BreadcrumbList
  removeJsonLd();
  addJsonLd({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: desc,
    image: img,
    author: { '@type': 'Organization', name: author, url: SITE_URL },
    publisher: ORG_SCHEMA,
    url,
    datePublished: post.published_at || new Date().toISOString(),
    dateModified: post.updated_at || post.published_at || new Date().toISOString(),
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    keywords: post.tags?.join(', '),
  });

  // BreadcrumbList schema
  addJsonLd({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: url },
    ],
  });

  // FAQPage schema — auto-extract from article body if present. AI engines
  // (ChatGPT, Perplexity, Gemini) preferentially cite FAQ-tagged content
  // when answering long-tail questions. Pulls H2/H3 + following paragraph
  // pairs that look like Q/A from the rendered HTML.
  if (typeof document !== 'undefined') {
    const faqs = extractFaqsFromHtml();
    if (faqs.length >= 2) {
      addJsonLd({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.q,
          acceptedAnswer: { '@type': 'Answer', text: faq.a },
        })),
      });
    }
  }
}

/**
 * Pull FAQ Q/A pairs out of the rendered article body.
 *
 * Looks for headings (h2/h3) inside an `.blog-post` article container that
 * sit under a "Frequently Asked Questions" / "FAQ" section. Each heading
 * becomes a question; the following <p> sibling becomes its answer. Stops
 * at the next non-FAQ heading or end of article.
 *
 * Tolerant of a few common shapes — generator may emit either:
 *   - <h2>FAQ</h2><h3>Question?</h3><p>Answer.</p>...
 *   - <h2>Frequently Asked Questions</h2><h3>Q?</h3><p>A.</p>...
 */
function extractFaqsFromHtml(): Array<{ q: string; a: string }> {
  const faqs: Array<{ q: string; a: string }> = [];
  const article = document.querySelector('article.blog-post, .blog-post, article');
  if (!article) return faqs;

  const headings = Array.from(article.querySelectorAll('h2, h3'));
  // Find the FAQ section anchor — the H2 whose text contains "frequently asked", "faq", or "questions"
  let inFaq = false;
  for (const heading of headings) {
    const text = (heading.textContent || '').trim();
    const isFaqAnchor = /^(frequently asked|faq|common questions?|questions?)$/i.test(text);
    const isH2 = heading.tagName === 'H2';

    if (isH2 && isFaqAnchor) {
      inFaq = true;
      continue;
    }
    if (isH2 && inFaq) {
      // Hit a sibling H2 that isn't an FAQ — stop.
      break;
    }
    if (inFaq && (heading.tagName === 'H3' || (heading.tagName === 'H2' && /\?\s*$/.test(text)))) {
      // The Q is the heading text (must look like a question).
      const q = text.replace(/\s+/g, ' ').trim();
      if (!/\?$/.test(q)) continue;
      // Find the next <p> sibling for the answer.
      let next: Element | null = heading.nextElementSibling;
      while (next && !['P', 'UL', 'OL'].includes(next.tagName)) next = next.nextElementSibling;
      const a = next ? (next.textContent || '').replace(/\s+/g, ' ').trim() : '';
      if (q && a && a.length >= 20 && a.length <= 600) {
        faqs.push({ q, a });
      }
    }
  }
  return faqs.slice(0, 10);
}

/**
 * Set FAQPage schema (for landing page FAQ section)
 */
export function setFaqSchema(faqs: { q: string; a: string }[]) {
  addJsonLd({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  });
}

/**
 * Set WebSite + Organization + MobileApplication schemas (for homepage)
 */
export function setWebsiteSchema() {
  removeJsonLd();

  // Organization
  addJsonLd({
    '@context': 'https://schema.org',
    ...ORG_SCHEMA,
  });

  // WebSite with search
  addJsonLd({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESC,
    publisher: ORG_SCHEMA,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/blog?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  });

  // SoftwareApplication — richer than MobileApplication, used by both
  // Google SERPs (app-install cards) and LLMs when the user asks "what
  // is X app?". Lists the 13 features that differentiate Arcana from
  // generic tarot apps.
  addJsonLd({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    alternateName: 'Arcana Tarot',
    url: SITE_URL,
    description: DEFAULT_DESC,
    applicationCategory: 'LifestyleApplication',
    applicationSubCategory: 'Spirituality',
    operatingSystem: 'Android, iOS, Web',
    softwareVersion: '1.1',
    inLanguage: ['en', 'ja', 'ko', 'zh'],
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Free tier with Premium subscription available',
    },
    downloadUrl: 'https://play.google.com/store/apps/details?id=com.arcana.app',
    screenshot: `${SITE_URL}/image.png`,
    featureList: [
      '78-card Rider-Waite-Smith tarot deck',
      'Real-ephemeris daily horoscope and natal chart',
      'AI dream interpreter (Gemini 2.5)',
      'Real cross-aspect partner synastry',
      'Human Design bodygraph with 88-degree solar arc',
      'Bazi Chinese four-pillar astrology',
      'I-Ching three-coin cast with 64 hexagrams',
      'Elder Futhark rune casting',
      'Dice oracle (astragaloi tradition)',
      'Feng Shui bagua self-audit',
      'Mood diary with weekly AI letter',
      'Daily Pick-a-card with streak tracking',
      'Multi-language (English, Japanese, Korean, Chinese)',
    ],
    publisher: { '@id': `${SITE_URL}#organization` },
  });

  // MobileApplication kept for Android-specific rich results that
  // prefer that type. Google treats the two as complementary.
  addJsonLd({
    '@context': 'https://schema.org',
    '@type': 'MobileApplication',
    name: SITE_NAME,
    operatingSystem: 'Android',
    applicationCategory: 'LifestyleApplication',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    url: SITE_URL,
    description: DEFAULT_DESC,
    downloadUrl: 'https://play.google.com/store/apps/details?id=com.arcana.app',
  });
}

/**
 * HowTo schema — for the landing page's "how it works" / onboarding
 * walkthrough. Eligible for Google's rich "How to" results and
 * picked up by generative AI engines when answering "how do I use X".
 *
 * Call alongside setWebsiteSchema() on the landing page.
 */
export function setHowToSchema() {
  addJsonLd({
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to start a daily tarot ritual on Arcana',
    description: 'A 5-minute daily ritual combining horoscope, tarot pull, and journaling prompt.',
    image: DEFAULT_IMAGE,
    totalTime: 'PT5M',
    step: [
      {
        '@type': 'HowToStep',
        name: 'Create your account',
        text: 'Sign in with Google or email on tarotlife.app. No card required for the free tier.',
        url: `${SITE_URL}/auth`,
      },
      {
        '@type': 'HowToStep',
        name: 'Enter your birth data',
        text: 'Add your birth date, time (optional), and place. This powers your natal chart, horoscope, and compatibility readings.',
      },
      {
        '@type': 'HowToStep',
        name: 'Read your daily horoscope',
        text: 'Today tab shows your personalised transit forecast based on your real natal chart, not generic sun-sign content.',
      },
      {
        '@type': 'HowToStep',
        name: 'Draw your daily tarot card',
        text: 'Tap the deck to shuffle, then pick a card. Arcana uses the 78-card Rider-Waite-Smith deck with full meaning pages for each card.',
      },
      {
        '@type': 'HowToStep',
        name: 'Write a journal reflection',
        text: 'End the ritual with a one-line reflection on a guided prompt. Builds streaks and surfaces themes over time.',
      },
    ],
  });
}

/**
 * WebPage + Breadcrumb schema — call on sub-route pages that should
 * advertise a specific topic to search + generative engines. Pair
 * with setPageMeta() for complete coverage.
 */
export function setTopicPageSchema(params: {
  url: string;
  name: string;
  description: string;
  breadcrumbs: Array<{ name: string; item: string }>;
}) {
  addJsonLd({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': params.url,
    name: params.name,
    description: params.description,
    url: params.url,
    isPartOf: { '@id': `${SITE_URL}#website`, '@type': 'WebSite', url: SITE_URL, name: SITE_NAME },
    inLanguage: 'en',
    publisher: { '@id': `${SITE_URL}#organization` },
  });

  if (params.breadcrumbs.length) {
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: params.breadcrumbs.map((b, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: b.name,
        item: b.item,
      })),
    });
  }
}
