/**
 * AdSense configuration — one source of truth for client + slot IDs.
 *
 * Slot IDs are set via Netlify env vars so they can be rotated without a
 * code deploy. If a slot is undefined, the component short-circuits and
 * renders nothing, letting AdSense Auto Ads fill the space instead.
 */

export const ADSENSE_CLIENT = 'ca-pub-9489106590476826';

export const AD_SLOTS = {
  sidebar: import.meta.env.VITE_ADSENSE_SIDEBAR_SLOT as string | undefined,
  inArticle: import.meta.env.VITE_ADSENSE_IN_ARTICLE_SLOT as string | undefined,
  endOfArticle: import.meta.env.VITE_ADSENSE_END_ARTICLE_SLOT as string | undefined,
  blogGrid: import.meta.env.VITE_ADSENSE_BLOG_GRID_SLOT as string | undefined,
} as const;
