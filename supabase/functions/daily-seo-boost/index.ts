import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handler, AppError } from "../_shared/handler.ts";
import { captureEdgeException } from "../_shared/sentry.ts";

/**
 * Daily SEO booster.
 *
 * Pings IndexNow with the full evergreen URL inventory once per day so
 * Bing/Yandex/DuckDuckGo keep the index of those pages fresh — even when
 * the page content itself hasn't changed, lastmod stays current and the
 * search engines re-evaluate ranking signals.
 *
 * Why this matters: `daily-seo-blog-generator` already pings IndexNow for
 * each new blog post, but evergreen pages (home, blog index, the 78 tarot
 * card meaning pages, /tarot-meanings) were only ever pinged once at deploy
 * time. Without daily refresh signals, Bing's index of those pages goes
 * stale within weeks. This cron keeps them fresh.
 *
 * IndexNow accepts up to 10,000 URLs per ping — we send ~110 each day, so
 * we're well within limits. Bing rate-limits the same site to a couple of
 * full re-submits per day, so 09:00 UTC is plenty.
 *
 * Auth: webhook-style. Caller (pg_cron) must include CRON_SECRET as the
 * X-Webhook-Secret header.
 */

const SITE_URL = "https://tarotlife.app";
const INDEXNOW_KEY = "7c4e2b3a8f6d4a1c9e8b5d2f7a3c6e8b";
const INDEXNOW_KEY_FILE = "arcana-indexnow-7c4e2b3a8f6d.txt";

const MAJOR_ARCANA = [
  "The Fool", "The Magician", "The High Priestess", "The Empress", "The Emperor",
  "The Hierophant", "The Lovers", "The Chariot", "Strength", "The Hermit",
  "The Wheel of Fortune", "Justice", "The Hanged Man", "Death", "Temperance",
  "The Devil", "The Tower", "The Star", "The Moon", "The Sun",
  "Judgement", "The World",
];
const MINOR_RANKS = [
  "Ace", "Two", "Three", "Four", "Five", "Six", "Seven",
  "Eight", "Nine", "Ten", "Page", "Knight", "Queen", "King",
];
const MINOR_SUITS = ["Wands", "Cups", "Swords", "Pentacles"];
const MINOR_ARCANA = MINOR_SUITS.flatMap((suit) =>
  MINOR_RANKS.map((rank) => `${rank} of ${suit}`)
);
const ALL_CARDS = [...MAJOR_ARCANA, ...MINOR_ARCANA];

function toSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

interface BoostResult {
  ok: true;
  totalUrls: number;
  blogCount: number;
  batches: number;
  pingResults: Array<{ status: number; ok: boolean }>;
}

Deno.serve(handler<unknown>({
  fn: "daily-seo-boost",
  auth: "webhook",
  webhookSecretEnv: "CRON_SECRET",
  rateLimit: { max: 10, windowMs: 60_000 },
  run: async (ctx): Promise<BoostResult> => {
    const urls: string[] = [];

    urls.push(`${SITE_URL}/`);
    urls.push(`${SITE_URL}/blog`);
    urls.push(`${SITE_URL}/tarot-meanings`);
    urls.push(`${SITE_URL}/horoscope`);
    urls.push(`${SITE_URL}/sitemap.xml`);

    for (const card of ALL_CARDS) {
      urls.push(`${SITE_URL}/tarot-meanings/${toSlug(card)}`);
    }

    const { data: posts, error: blogErr } = await ctx.supabase
      .from("blog_posts")
      .select("slug")
      .eq("published", true)
      .order("published_at", { ascending: false })
      .limit(50);
    if (blogErr) {
      ctx.log.warn("daily_seo_boost.blog_fetch_failed", { err: blogErr.message });
      captureEdgeException(blogErr, {
        fn: "daily-seo-boost",
        correlationId: ctx.correlationId,
        level: "warning",
        tags: { stage: "blog_fetch" },
        extra: { message: blogErr.message },
      });
    }
    const blogCount = posts?.length ?? 0;
    for (const post of posts ?? []) {
      urls.push(`${SITE_URL}/blog/${post.slug}`);
    }

    ctx.log.info("daily_seo_boost.urls_assembled", {
      total: urls.length,
      blogCount,
      cardCount: ALL_CARDS.length,
    });

    const batches = chunk(urls, 1000);
    const pingResults: Array<{ status: number; ok: boolean }> = [];
    for (const batch of batches) {
      try {
        const res = await fetch("https://api.indexnow.org/indexnow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            host: "tarotlife.app",
            key: INDEXNOW_KEY,
            keyLocation: `${SITE_URL}/${INDEXNOW_KEY_FILE}`,
            urlList: batch,
          }),
        });
        pingResults.push({ status: res.status, ok: res.ok });
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          ctx.log.warn("daily_seo_boost.indexnow_non_ok", {
            status: res.status,
            body: body.slice(0, 500),
          });
          captureEdgeException(
            new Error(`IndexNow batch returned ${res.status}: ${body.slice(0, 200)}`),
            {
              fn: "daily-seo-boost",
              correlationId: ctx.correlationId,
              level: "warning",
              tags: {
                stage: "indexnow_ping",
                status: String(res.status),
                batch_size: String(batch.length),
              },
              extra: { responseBody: body.slice(0, 500), batchSample: batch.slice(0, 5) },
            },
          );
        }
      } catch (e) {
        ctx.log.warn("daily_seo_boost.indexnow_threw", { err: String(e) });
        pingResults.push({ status: 0, ok: false });
        captureEdgeException(e, {
          fn: "daily-seo-boost",
          correlationId: ctx.correlationId,
          level: "warning",
          tags: { stage: "indexnow_fetch_threw", batch_size: String(batch.length) },
          extra: { batchSample: batch.slice(0, 5) },
        });
      }
    }

    const allOk = pingResults.every((r) => r.ok);
    if (!allOk) {
      ctx.log.warn("daily_seo_boost.partial_failure", { pingResults });
    }

    if (pingResults.length > 0 && pingResults.every((r) => !r.ok)) {
      throw new AppError(
        "INDEXNOW_FAILED",
        "All IndexNow batches failed — check key file + host header",
        502,
      );
    }

    return {
      ok: true,
      totalUrls: urls.length,
      blogCount,
      batches: batches.length,
      pingResults,
    };
  },
}));
