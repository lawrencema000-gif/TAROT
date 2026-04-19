# Web Audit — tarotlife.app

Date: 2026-04-19 (run against production `https://tarotlife.app`)
Runner: `scripts/audit-web.mjs` (Playwright + Chromium headless, custom perf/SEO/a11y checks). Lighthouse was not available locally on Windows, so perf is measured via Navigation Timing + PerformanceObserver.
Raw data: `.audit/web-audit.json`

Pages probed (each at desktop 1440x900 and mobile iPhone 13 390x844):
- `/` (landing EN)
- `/?lang=ja` (landing JA)
- `/tarot-meanings`
- `/tarot-meanings/the-fool`
- `/blog`

Sitemap: `https://tarotlife.app/sitemap.xml` (89 URLs) — **all 25 sampled URLs returned 200**. No broken links detected.
Robots.txt: valid, references sitemap, disallows `/admin /profile /journal /achievements` (good).

---

## Critical (breaks user experience)

### C1. Blog page has no `<h1>` — breaks SEO and a11y
- `headingCount: 6`, `h1Count: 0` on both desktop and mobile for `/blog`.
- File: `src/pages/BlogPage.tsx`
- Fix: add a single visible `<h1>` (e.g. "News & Insights" or "Tarot & Astrology Blog") at the top of the page. Current header is likely a `<h2>` or a plain `<div>`.
- Why: Google treats missing `h1` on a listing page as a quality signal; screen-reader users also lose the page heading.

### C2. Blog post thumbnails blocked by CSP → broken images on `/blog`
- Console error (both viewports): `Refused to load the image 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800' because it violates img-src CSP`.
- Also shows up in `images.brokenSample`.
- File: blog post data lives in Supabase (`blog_posts` table, cover image field); CSP is set in `netlify.toml`.
- Fix (do not change netlify.toml per constraints — this is a content fix): swap the cover image of that Supabase blog row to a self-hosted asset under `public/blog-covers/*.webp` OR migrate the image into Supabase storage (`*.supabase.co` is already in the CSP allowlist).
- Why: Every blog reader sees a broken image placeholder. This is the single most visible defect during the audit.

---

## High (impacts conversion / SEO)

### H1. `/?lang=ja` still serves English meta description (and canonical points to `/`)
- `seo.landing-ja-desktop.metaDesc` = `"Daily tarot readings, personalized horoscopes, reflective journaling..."` (English).
- Title and OG title are translated (`毎日のタロット...`), but description and Twitter description are not.
- Canonical is `https://tarotlife.app/` — acceptable if we rely on hreflang alternates, but JA searchers still see an English snippet in Google JP SERPs.
- Files: wherever `document.title` / meta description are set per language (likely `src/pages/LandingPage.tsx` or a head-sync util near `src/i18n/hreflang.ts`).
- Fix: translate `metaDesc`, `og:description`, `twitter:description` when `i18n.language` changes. Keep separate strings in `public/locales/<lang>/landing.json` (or wherever landing copy lives).

### H2. JS payload on first navigation is heavy (~3.6 MB uncompressed)
- `bundle.jsTotalKb: 3723` across 24 JS chunks.
- Largest offenders (pre-gzip):
  - `index-BamytnP9.js` — **798 KB** (app shell; too large for the entry chunk).
  - `vendor-icons-FbbEw2KZ.js` — **448 KB** (lucide-react — we almost certainly only use ~80 icons).
  - `vendor-sentry-z9byLo4e.js` — **437 KB** (Sentry full browser bundle).
  - `data-astrology-CFlE2lWE.js` — **413 KB** (astrology data in JS; should be JSON fetch, not a chunk bundled with the app).
- Fixes:
  - `vendor-icons`: switch to per-icon imports (`import X from 'lucide-react/icons/x'`) — already supported by lucide-react 0.344+ and will drop this bundle by 80%+.
  - `vendor-sentry`: use `@sentry/react` lazy init — load only after first paint, or use `BrowserClient` without the full default integrations.
  - `data-astrology`/`data-tarot`/`data-horoscopes`/`data-quizzes` (~1.15 MB combined): move JSON-like payloads to `public/data/*.json` and fetch on demand (only ReadingsPage really needs `data-tarot` eagerly).
  - Split `index-BamytnP9.js`: route-level `React.lazy` boundaries are in place for sub-pages but not for `LandingPage` chunks (hero, demo deck, feature grid are all in the main bundle).
- Why: FCP is already ~1.5 s in a clean Playwright run with fast CPU; on real mobile networks this level of JS easily pushes LCP past 4 s which Google flags as poor.

### H3. No `<main>` landmark on the landing page
- `a11y.landing-desktop.landmarks.main: 0` (and `-mobile`, and both `landing-ja-*`).
- `/tarot-meanings`, `/the-fool`, `/blog` all have exactly 1 `<main>`.
- Landing is the most linked page; screen-reader users cannot jump to main content with the "skip to main" shortcut.
- File: `src/pages/LandingPage.tsx`.
- Fix: wrap the primary hero+content region in `<main>` (the current outer wrapper appears to be a `<div>` or `<section>`). Keep landmark roles `nav` and `footer` that already exist.

### H4. Heading hierarchy skips from `h1 → h3` on every page
- `skippedHeadings: [{ from: 1, to: 3 }]` on landing, landing-ja, tarot-meanings, the-fool.
- Root cause: the hero has a single `<h1>`, and the next visible heading inside a feature card jumps to `<h3>` — there is no `<h2>` section title between them.
- Fix: either add an `<h2>` ("What you'll do every day" / "Features") before the feature grid, or demote feature-card titles from `h3` to `h2` so the hierarchy is 1→2. This is a common Lighthouse a11y deduction.

### H5. Blog card image has `loading="lazy"` but no `webp` variant
- `a11y.blog-*.images: { total: 1, webp: 0 }` — the one rendered card uses a raw Unsplash JPG.
- Related to C2 — once the cover image moves to Supabase Storage, store it as `.webp` and serve via Netlify Image CDN (`/.netlify/images?url=...&fm=webp`).

---

## Medium (polish)

### M1. LCP element could not be identified
- `performance.getEntriesByType('largest-contentful-paint')` returned nothing on any page — suggests the hero hero is a CSS-background `<div>` (no img/text LCP entry because motion/framer renders text after first paint, or the element is transformed).
- File: `src/pages/LandingPage.tsx` hero section.
- Fix: render the hero headline as plain text that is in the DOM at first paint (no `opacity:0` → framer fade-in) OR make the hero card image a real `<img src>` so the browser records an LCP candidate. Currently Google PSI cannot attribute LCP either — this hurts Core Web Vitals reporting.

### M2. No `fetchpriority="high"` or preload on the hero image
- Hero art (`/hero/...webp` or the landing demo deck) likely loads via a React effect, which is after the JS bundle parses.
- Fix: add `<link rel="preload" as="image" href="/hero/hero-desktop.webp" imagesrcset="..." fetchpriority="high">` inside `index.html` head (not in config — it's in the static HTML, which is fine).

### M3. Font loading strategy is the default (no `font-display`)
- No custom `<link rel="preload" as="font">` or `@font-face { font-display: swap; }` inspected in `index.html`. Tailwind config shows custom font stacks in `tailwind.config.js` — confirm a self-hosted font (if any) declares `font-display: swap`.

### M4. WebGL fallback warning in console (noise, not broken)
- Every page logs: `Automatic fallback to software WebGL has been deprecated...`. Only in headless Chromium — real users won't see it, but worth suppressing any WebGL feature-detect that triggers it. Likely from a decorative canvas/particle effect.

### M5. CSP "Report Only" frame-ancestors warning on mobile landing
- `Refused to frame 'https://www.google.com/' because an ancestor violates frame-ancestors 'self'`.
- It is Report-Only so no functional impact, but indicates we load a Google iframe (AdSense?) that tries to embed content we explicitly forbid in CSP.

### M6. GA4 beacons blocked in audit context (`ERR_ABORTED`)
- Expected in headless/Playwright (no real user); not a production issue. Noted so future audits don't flag it.

### M7. Mobile "widest element" measurement shows 2384 px-wide `<div>` on landing
- `mobile.landing.widest` shows two `<div>` at 2384 px on a 390 px viewport. `horizontalOverflow: false` so these elements are clipped/contained, but they indicate an oversized background or parallax layer that still paints offscreen — an unnecessary paint cost on mobile.
- File: likely a full-bleed hero background or star-field overlay in `src/pages/LandingPage.tsx` or `src/styles/*`.

### M8. Landing page has `<footer>` but no `<header>` landmark
- Across all pages `header: 0`. The top navigation is `<nav>` (good) but consider wrapping the site-wide top bar in `<header>` for a11y completeness.

---

## Observations (info — not action items)

- Sitemap: 89 URLs, all sampled returned 200. Lastmod is 2026-04-19 (current).
- Canonical tags are present and correct on every audited page.
- OpenGraph + Twitter Card tags present on every page.
- hreflang alternates (en/ja/ko/zh/x-default) present on every page — re-confirms prior i18n sweep.
- `htmlLang` attribute correctly flips between `en` and `ja` based on `?lang=`.
- FCP on headless-fast-CPU is 1.2–1.9 s across pages; DOMContentLoaded 1.3–1.9 s. Expect real-world mobile to be ~2x worse.
- Accessibility: 0 buttons without labels, 0 anchors without text across all pages — strong baseline.
- All content images (cards) are webp and lazy-loaded (49/49 lazy on landing, 78/78 on tarot-meanings).
- Keyboard Tab reaches a focusable element within 1 tab on every page (sign-in form requires Google OAuth — could not test tab-order through form fields because it's a third-party iframe flow).
- Robots.txt correctly disallows authenticated-only routes.

---

## Suggested fix priority order

1. **C1** — add `<h1>` to BlogPage (10 lines, big SEO win).
2. **C2** — replace Unsplash cover image for existing blog post row in Supabase with a self-hosted/Storage asset.
3. **H3 / H4** — wrap LandingPage in `<main>` and fix heading hierarchy (both are 1-line changes).
4. **H1** — translate landing meta description + og/twitter description for ja/ko/zh.
5. **H2** — bundle trimming: per-icon lucide imports first (drops ~350 KB), then lazy Sentry, then move data/*.js to runtime-fetched JSON.
6. **M1/M2** — make hero LCP measurable + preload hero image.
7. **M3–M8** — polish and observability.

## Out-of-scope reminders (per audit constraints)
- `netlify.toml` CSP edits were explicitly out of scope — C2 is solved by changing the content, not the CSP.
- No source files modified; no commits; no deploy. Report-only.
