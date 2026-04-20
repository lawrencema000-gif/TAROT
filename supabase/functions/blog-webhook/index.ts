import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { AppError, handler } from "../_shared/handler.ts";

/**
 * Blog webhook — receives posts from SEO Booster (or any source) and upserts
 * into `blog_posts`. Auth is the shared BLOG_WEBHOOK_SECRET, verified by the
 * handler wrapper via `auth: "webhook"`.
 */

interface BlogWebhookPayload {
  title?: string;
  content?: string;
  content_html?: string;
  slug?: string;
  excerpt?: string;
  meta_description?: string;
  cover_image?: string;
  featured_image_url?: string;
  author?: string;
  tags?: string[];
  categories?: string[];
  published?: boolean;
  status?: string;
  event?: string;
  raw?: boolean;
}

interface NormalizedPost {
  title?: string;
  content?: string;
  slug?: string;
  excerpt?: string;
  cover_image?: string;
  author?: string;
  tags?: string[];
  published: boolean;
  raw?: boolean;
}

/** Wraps content in a consistent HTML structure unless already structured */
function formatContent(post: { content: string; excerpt?: string; raw?: boolean }): string {
  if (post.raw || post.content.includes("<article") || post.content.includes('class="blog-')) {
    return post.content;
  }
  return `<article class="blog-post">\n${post.excerpt ? `<p class="lead"><em>${post.excerpt}</em></p>\n` : ""}${post.content}\n</article>`;
}

/** Auto-generate URL slug from title */
function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/^-+|-+$/g, "").substring(0, 120);
}

/** Auto-generate excerpt by stripping HTML */
function autoExcerpt(content: string, max = 160): string {
  const text = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return text.substring(0, max).replace(/\s\S*$/, "") + "\u2026";
}

/**
 * Normalize incoming payload. Accepts two shapes:
 *
 * Our format:    { title, content, slug, excerpt, cover_image, author, tags, published }
 * SEO Booster:   { title, content_html, slug, meta_description, featured_image_url, tags, categories, status, event }
 */
function normalizePost(raw: BlogWebhookPayload): NormalizedPost {
  if (raw.event === "unpublish") {
    return {
      title: raw.title || "Untitled",
      content: raw.content_html || raw.content || "",
      slug: raw.slug,
      excerpt: raw.meta_description || raw.excerpt,
      cover_image: raw.featured_image_url || raw.cover_image,
      author: raw.author || "Arcana",
      tags: raw.tags || raw.categories || ["tarot", "spirituality"],
      published: false,
      raw: raw.raw,
    };
  }

  return {
    title: raw.title,
    content: raw.content_html || raw.content,
    slug: raw.slug,
    excerpt: raw.meta_description || raw.excerpt,
    cover_image: raw.featured_image_url || raw.cover_image,
    author: raw.author || "Arcana",
    tags: raw.tags || raw.categories,
    published: raw.status === "publish" || raw.published === true || raw.published === undefined,
    raw: raw.raw,
  };
}

type BlogBody = BlogWebhookPayload | BlogWebhookPayload[];

Deno.serve(
  handler<BlogBody>({
    fn: "blog-webhook",
    auth: "webhook",
    webhookSecretEnv: "BLOG_WEBHOOK_SECRET",
    rateLimit: { max: 60, windowMs: 60_000 },
    run: async (ctx, body) => {
      const rawPosts: BlogWebhookPayload[] = Array.isArray(body) ? body : [body];

      const results: Array<{
        slug: string;
        id?: string;
        status?: string;
        url?: string;
        published_url?: string;
        error?: string;
      }> = [];

      for (const rawPost of rawPosts) {
        const post = normalizePost(rawPost);
        const { title, content, cover_image, author, tags, published, raw: isRaw } = post;
        let slug = post.slug;
        let excerpt = post.excerpt;

        if (!title || !content) {
          results.push({ slug: slug || "unknown", error: "Missing required fields: title, content" });
          continue;
        }

        if (!slug) slug = slugify(title);
        if (!excerpt) excerpt = autoExcerpt(content);

        const formattedContent = formatContent({ content, excerpt, raw: isRaw });
        const finalTags = tags && tags.length > 0 ? tags : ["tarot", "spirituality"];

        const { data, error } = await ctx.supabase
          .from("blog_posts")
          .upsert(
            {
              slug,
              title,
              excerpt,
              content: formattedContent,
              cover_image: cover_image || null,
              author: author || "Arcana",
              tags: finalTags,
              published: published ?? true,
              published_at: published !== false ? new Date().toISOString() : null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "slug" },
          )
          .select()
          .single();

        if (error) {
          ctx.log.error("blog_webhook.upsert_failed", { err: error, slug });
          results.push({ slug, error: error.message });
        } else {
          results.push({
            slug,
            id: data.id,
            status: "ok",
            url: `https://tarotlife.app/blog/${slug}`,
            published_url: `https://tarotlife.app/blog/${slug}`,
          });
        }
      }

      ctx.log.info("blog_webhook.processed", { count: rawPosts.length });

      if (results.length === 0) {
        throw new AppError("NO_POSTS", "No posts supplied", 400);
      }

      return new Response(JSON.stringify({ results }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  }),
);
