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
const ORG_SCHEMA = {
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: { '@type': 'ImageObject', url: DEFAULT_IMAGE, width: 512, height: 512 },
  description: DEFAULT_DESC,
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

  // MobileApplication
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
