/**
 * Internal links in generated articles must point at pages the app has.
 *
 * Why: the article prompt used to list "/more/dream", "/more/quick" and five
 * more paths that never existed; by 2026-11-22, 121 of 133 published posts
 * carried 434 links to the app's "Page not found". The prompt now lists real
 * pages (APP_LINKS); this is the safety net for any path a model invents.
 */

/** The pages an article may link to, with what each offers (shown to the model). */
export const APP_LINKS: ReadonlyArray<readonly [path: string, what: string]> = [
  ["/readings", "tarot readings; its Systems tab also holds the dream interpreter, BaZi, Human Design, Feng Shui and partner compatibility"],
  ["/cartomancy", "playing-card (cartomancy) readings"],
  ["/horoscope", "daily horoscope and natal chart"],
  ["/ai/quick", "quick AI reading"],
  ["/companion", "AI companion chat"],
  ["/tarot-meanings", "the meaning of every tarot card"],
  ["/spreads", "tarot spreads"],
  ["/astrology", "astrology guide"],
  ["/soulmate-score", "soulmate score"],
  ["/journal", "reading journal"],
  ["/quizzes", "personality quizzes"],
  ["/numerology", "numerology guide"],
  ["/crystals", "crystal guide"],
];

/** Detail pages under these are real too (e.g. /tarot-meanings/the-star). */
const PREFIXES = ["/tarot-meanings/", "/spreads/", "/astrology/", "/numerology/", "/crystals/", "/blog/", "/cartomancy/"];

const EXACT = new Set(APP_LINKS.map(([p]) => p).concat(["/", "/blog"]));

/** True when `path` (no query or hash) is a page the app serves. */
export function isAppPath(path: string): boolean {
  if (EXACT.has(path)) return true;
  return PREFIXES.some((p) => path.startsWith(p) && path.length > p.length && /^[a-z0-9\-/]+$/.test(path.slice(p.length)));
}

/** Rewrite every root-relative href that is not an app page to /readings. Absolute URLs are left alone. */
export function fixInternalLinks(html: string): { html: string; rewritten: string[] } {
  const rewritten: string[] = [];
  const out = html.replace(/href="(\/[^"]*)"/g, (whole, href: string) => {
    if (href.startsWith("//")) return whole; // protocol-relative: external
    const path = href.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
    if (isAppPath(path)) return whole;
    rewritten.push(href);
    return `href="/readings"`;
  });
  return { html: out, rewritten };
}
