import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handler, AppError } from "../_shared/handler.ts";

/**
 * One-shot backfill — generates Imagen cover images for any blog_posts
 * row where cover_image is null. Manual trigger via:
 *
 *   curl -X POST \
 *     "$SUPABASE_URL/functions/v1/backfill-blog-covers" \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "x-webhook-secret: $CRON_SECRET" \
 *     -d '{"limit": 6}'
 *
 * Auth: webhook (CRON_SECRET shared with daily-seo-blog-generator).
 *
 * Limited to N posts per call so we can run it incrementally if Imagen
 * rate limits us. Each post call is ~5s + the upload time.
 */

const POLLINATIONS_BASE = "https://image.pollinations.ai/prompt";

const IMAGE_SYSTEM = `Generate a mystical illustration cover image for an Arcana blog article. Style: dark mystic aesthetic, deep purple and gold tones, ornate, dreamlike, painterly, cinematic lighting. Composition: centered subject, room for an overlay text title at top. NO text, NO words, NO letters in the image.`;

interface BackfillBody {
  /** Max posts to process this run. Defaults to 5. */
  limit?: number;
  /** Optional: only backfill a specific slug. */
  slug?: string;
}

async function generateCover(prompt: string): Promise<Uint8Array | null> {
  // Pollinations.ai — free public image API, returns raw bytes directly.
  const encoded = encodeURIComponent(prompt);
  const url = `${POLLINATIONS_BASE}/${encoded}?width=1280&height=720&model=flux&nologo=true&seed=${Math.floor(Math.random() * 1_000_000)}`;
  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    return new Uint8Array(buffer);
  } catch {
    return null;
  }
}

Deno.serve(handler<BackfillBody>({
  fn: "backfill-blog-covers",
  auth: "webhook",
  webhookSecretEnv: "CRON_SECRET",
  rateLimit: { max: 5, windowMs: 60_000 },
  run: async (ctx, body) => {
    const limit = Math.min(Math.max(body?.limit ?? 5, 1), 20);

    let query = ctx.supabase
      .from("blog_posts")
      .select("id, slug, title, tags")
      .is("cover_image", null)
      .eq("published", true)
      .order("published_at", { ascending: false })
      .limit(limit);

    if (body?.slug) query = ctx.supabase
      .from("blog_posts")
      .select("id, slug, title, tags")
      .eq("slug", body.slug)
      .limit(1);

    const { data: posts, error } = await query;
    if (error) throw new AppError("FETCH_FAILED", error.message, 500);
    if (!posts || posts.length === 0) {
      return { processed: 0, results: [] };
    }

    const results: Array<{ slug: string; status: string; coverUrl?: string; error?: string }> = [];
    for (const post of posts) {
      try {
        const subject = post.title;
        const tagHint = (post.tags as string[] | null)?.slice(0, 2)?.join(", ") || "tarot";
        const prompt = `${IMAGE_SYSTEM}\n\nSubject: ${subject}.\nThemes: ${tagHint}.`;

        const bytes = await generateCover(prompt);
        if (!bytes) {
          results.push({ slug: post.slug, status: "imagen-failed" });
          continue;
        }

        const filename = `${post.slug}-${Date.now()}.png`;
        const { error: uploadErr } = await ctx.supabase.storage
          .from("blog-covers")
          .upload(filename, bytes, { contentType: "image/png", upsert: false });
        if (uploadErr) {
          results.push({ slug: post.slug, status: "upload-failed", error: uploadErr.message });
          continue;
        }

        const { data: pub } = ctx.supabase.storage.from("blog-covers").getPublicUrl(filename);
        const coverUrl = pub?.publicUrl;
        if (!coverUrl) {
          results.push({ slug: post.slug, status: "no-public-url" });
          continue;
        }

        const { error: updateErr } = await ctx.supabase
          .from("blog_posts")
          .update({ cover_image: coverUrl, updated_at: new Date().toISOString() })
          .eq("id", post.id);
        if (updateErr) {
          results.push({ slug: post.slug, status: "db-update-failed", error: updateErr.message });
          continue;
        }

        results.push({ slug: post.slug, status: "ok", coverUrl });
        ctx.log.info("backfill.cover_added", { slug: post.slug, coverUrl });
      } catch (e) {
        results.push({ slug: post.slug, status: "error", error: String(e) });
      }
    }

    return { processed: posts.length, results };
  },
}));
