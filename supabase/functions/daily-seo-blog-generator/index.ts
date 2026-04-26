import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handler, AppError } from "../_shared/handler.ts";
import { marked } from "npm:marked@14.1.3";

/**
 * Daily SEO/GEO blog generator.
 *
 * Triggered by pg_cron once per day. Each run:
 *   1. Pulls the next unused topic from `seo_blog_topics` (priority DESC).
 *   2. Asks Gemini 2.5 Pro for a 1000–1500 word SEO-optimised article
 *      with strict structure: H1, intro, 3–5 H2 sections, FAQ block,
 *      conclusion. Tone: mystical-but-modern, matching the Arcana brand.
 *   3. Asks Imagen 3 for a cover image (16:9, mystical illustration).
 *   4. Uploads the cover to Supabase storage (`blog-covers` bucket).
 *   5. Inserts a blog_posts row with the new content.
 *   6. Marks the topic as used.
 *   7. Pings IndexNow for fast Bing/Yandex/DuckDuckGo indexing.
 *
 * Auth: webhook-style. Caller must include the `CRON_SECRET` as a
 * shared secret in the Authorization header. The pg_cron job sends it.
 *
 * Manual override: an admin-published post (via BlogManager) doesn't
 * change anything here — the queue keeps marching through topics. If
 * an admin wants to skip a day, just don't worry about it — the queue
 * has 75+ topics so missing one is fine.
 */

// Gemini 2.5 Flash — generous free-tier quota, more than capable for SEO blog
// posts. Switch to gemini-2.5-pro later if/when the project moves to a paid
// tier and we want higher reasoning depth (mostly noticeable on long-tail
// nuance, not on the kind of structured SEO articles this generates).
const TEXT_MODEL = "gemini-2.5-flash";

// Imagen requires a paid tier. We use Pollinations.ai instead — free, no
// key, high quality, reasonably fast. Keeps the generator working on the
// free Gemini tier without any external account setup.
const POLLINATIONS_BASE = "https://image.pollinations.ai/prompt";
const SITE_URL = "https://tarotlife.app";
const INDEXNOW_KEY_FILE = "arcana-indexnow-7c4e2b3a8f6d.txt"; // hex32 stored at site root
const INDEXNOW_KEY = "7c4e2b3a8f6d4a1c9e8b5d2f7a3c6e8b"; // hex32, must match the file

// ────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────

interface Topic {
  id: string;
  category: string;
  topic: string;
  brief: string;
  keyword: string;
  related_keywords: string[];
}

interface GeneratedArticleRaw {
  title: string;
  slug: string;
  excerpt: string;
  content_markdown: string;   // markdown body — converted to HTML server-side
  faqs: Array<{ q: string; a: string }>;
  tags: string[];
}

interface GeneratedArticle extends Omit<GeneratedArticleRaw, "content_markdown"> {
  contentHtml: string;
}

// ────────────────────────────────────────────────────────────────────
// Gemini Pro — article generation
// ────────────────────────────────────────────────────────────────────

const ARTICLE_SYSTEM = `You are a senior SEO content writer for Arcana, a mystical-but-modern tarot, astrology, dream, and self-knowledge app. Your job is to write SEO-optimised articles that rank in Google AND get cited by AI engines (ChatGPT, Perplexity, Gemini) when users ask about the topic.

VOICE: poetic precision over florid mysticism. Each sentence earns its place. Treat the reader as a smart adult who appreciates clarity. Never hedge with "some say" / "it is believed" — speak with grounded authority.

STRUCTURE every article exactly as follows:
- H1: the topic, including the primary keyword naturally
- 1 paragraph intro (2–3 sentences): hook + what they'll learn
- 3–5 H2 sections, each with 1–2 paragraphs of substantive content. Use H3 sub-bullets where helpful.
- One H2 "Frequently Asked Questions" with 3–5 question/answer pairs. Each Q a real long-tail search question. Each A 1–2 sentences.
- 1 paragraph conclusion: integration, not summary. End with a soft CTA pointing to the relevant Arcana feature ("Try the AI Dream Interpreter on Arcana", "Run a Celtic Cross spread in the app", etc.).

LENGTH: 1000–1500 words total.

INTERNAL LINKS: include 1–3 inline links to relevant Arcana features. Use these URLs:
- /readings (tarot readings)
- /horoscope (daily horoscope + natal chart)
- /more/dream (dream interpreter)
- /more/human-design (HD chart)
- /more/bazi (Bazi)
- /more/feng-shui (Feng Shui)
- /more/partner (partner compatibility)
- /more/soulmate (soulmate score)
- /more/quick (quick AI reading)
- /quizzes (personality quizzes)

FORMAT YOUR RESPONSE EXACTLY AS THIS PLAIN-TEXT STRUCTURE.
Do NOT wrap it in JSON, markdown code blocks, or any other container.
Use real newlines (no \\n escapes). The delimiters must appear EXACTLY as written.

TITLE: <60–70 char title with primary keyword>
SLUG: <kebab-case-slug>
EXCERPT: <140–160 char meta description>
TAGS: tag1, tag2, tag3
---CONTENT---
# H1 (the post title again)

Intro paragraph here.

## First H2 section

Body. Use [internal links](/path) and **bold**.

## Second H2

More body.

## Frequently Asked Questions

### Real question one?

One- to two-sentence answer.

### Real question two?

Answer.

### Real question three?

Answer.

## Conclusion

Closing paragraph with a soft CTA pointing to the relevant Arcana feature.
---FAQS---
Q: Real question one?
A: Same answer as above, on one line.
Q: Real question two?
A: Same answer.
Q: Real question three?
A: Same answer.
---END---`;

async function generateArticle(topic: Topic, apiKey: string): Promise<GeneratedArticle> {
  const userPrompt = `Topic: ${topic.topic}
Category: ${topic.category}
Primary keyword: ${topic.keyword}
Related keywords (use as H2 themes): ${topic.related_keywords.join(", ")}

Brief from the editor:
${topic.brief}

Write the article now. Reply with the JSON object only — no markdown, no preamble.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${TEXT_MODEL}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: `${ARTICLE_SYSTEM}\n\n---\n\n${userPrompt}` }] }],
      generationConfig: {
        temperature: 0.7,
        // 1500-word article in plain text = ~3K tokens; we give plenty of
        // headroom in case Flash adds preamble or FAQ duplication.
        maxOutputTokens: 16384,
        // Plain text — no responseMimeType=application/json since we now
        // use a delimited format that's easier to parse than nested JSON.
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new AppError("ARTICLE_GEN_FAILED", `Gemini Pro article gen failed: ${text.slice(0, 300)}`, 502);
  }

  const data = await res.json();
  const completion = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!completion) throw new AppError("ARTICLE_GEN_EMPTY", "Article generation returned empty", 502);

  const parsed = parseDelimitedArticle(completion);
  if (!parsed.title || !parsed.slug || !parsed.content_markdown || !parsed.excerpt) {
    console.warn(`[article-gen] missing fields. First 400 chars: ${completion.slice(0, 400)}`);
    throw new AppError("ARTICLE_GEN_MISSING_FIELDS", "Article missing required fields", 502);
  }

  // Convert markdown body to HTML, then wrap in the blog-post article shell.
  const innerHtml = await marked.parse(parsed.content_markdown, { gfm: true, breaks: false });
  const wrappedHtml = `<article class="blog-post">\n${innerHtml}\n</article>`;

  return {
    title: parsed.title.slice(0, 100),
    slug: parsed.slug,
    excerpt: parsed.excerpt.slice(0, 200),
    contentHtml: wrappedHtml,
    faqs: parsed.faqs.slice(0, 6),
    tags: parsed.tags.slice(0, 5),
  };
}

/**
 * Parse a delimited plain-text response into structured fields.
 * Format: TITLE: / SLUG: / EXCERPT: / TAGS: prefix lines, then
 * ---CONTENT--- ... ---FAQS--- ... ---END--- blocks.
 */
function parseDelimitedArticle(text: string): GeneratedArticleRaw {
  const titleMatch = text.match(/^TITLE:\s*(.+)$/m);
  const slugMatch = text.match(/^SLUG:\s*(.+)$/m);
  const excerptMatch = text.match(/^EXCERPT:\s*(.+)$/m);
  const tagsMatch = text.match(/^TAGS:\s*(.+)$/m);

  const contentMatch = text.match(/---CONTENT---\s*\n([\s\S]*?)\n\s*---FAQS---/);
  const faqsMatch = text.match(/---FAQS---\s*\n([\s\S]*?)\n\s*---END---/);

  const title = titleMatch?.[1]?.trim() ?? "";
  const slug = (slugMatch?.[1]?.trim() ?? "").replace(/[^a-z0-9-]/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase();
  const excerpt = excerptMatch?.[1]?.trim() ?? "";
  const tags = (tagsMatch?.[1] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const content_markdown = contentMatch?.[1]?.trim() ?? "";

  const faqs: Array<{ q: string; a: string }> = [];
  if (faqsMatch) {
    const block = faqsMatch[1];
    const lines = block.split("\n");
    let currentQ = "";
    for (const line of lines) {
      const qMatch = line.match(/^Q:\s*(.+)$/);
      const aMatch = line.match(/^A:\s*(.+)$/);
      if (qMatch) currentQ = qMatch[1].trim();
      else if (aMatch && currentQ) {
        faqs.push({ q: currentQ, a: aMatch[1].trim() });
        currentQ = "";
      }
    }
  }

  return { title, slug, excerpt, tags, content_markdown, faqs };
}

// ────────────────────────────────────────────────────────────────────
// Imagen — cover image generation
// ────────────────────────────────────────────────────────────────────

const IMAGE_SYSTEM = `Generate a mystical illustration cover image for an Arcana blog article. Style: dark mystic aesthetic, deep purple and gold tones, ornate, dreamlike, painterly, cinematic lighting. Composition: centered subject, room for an overlay text title at top. NO text, NO words, NO letters in the image. Aspect ratio: 16:9 wide.`;

async function generateCoverImage(topic: Topic, _apiKey: string): Promise<Uint8Array | null> {
  // Pollinations.ai — free public image-generation API. Encodes the prompt
  // into the URL path; query params control size + model. Returns the raw
  // image bytes directly, no JSON wrapping.
  const subject = topic.topic;
  const prompt = `${IMAGE_SYSTEM} Subject: ${subject}. Keyword: ${topic.keyword}.`;
  const encoded = encodeURIComponent(prompt);
  // 1280x720 = 16:9 wide. `model=flux` is the highest-quality free tier.
  // `nologo=true` removes the small Pollinations watermark.
  const url = `${POLLINATIONS_BASE}/${encoded}?width=1280&height=720&model=flux&nologo=true&seed=${Math.floor(Math.random() * 1_000_000)}`;

  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) {
      console.warn(`[pollinations] failed status=${res.status}`);
      return null;
    }
    const buffer = await res.arrayBuffer();
    return new Uint8Array(buffer);
  } catch (e) {
    console.warn(`[pollinations] threw:`, e);
    return null;
  }
}

// ────────────────────────────────────────────────────────────────────
// IndexNow — instant Bing/Yandex/DuckDuckGo indexing
// ────────────────────────────────────────────────────────────────────

async function pingIndexNow(slug: string): Promise<void> {
  const fullUrl = `${SITE_URL}/blog/${slug}`;
  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host: "tarotlife.app",
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY_FILE}`,
        urlList: [fullUrl, `${SITE_URL}/blog`, `${SITE_URL}/sitemap.xml`],
      }),
    });
    if (!res.ok) {
      console.warn(`[indexnow] non-200 response: ${res.status}`);
    }
  } catch (e) {
    console.warn("[indexnow] ping failed:", e);
  }
}

// ────────────────────────────────────────────────────────────────────
// Main handler
// ────────────────────────────────────────────────────────────────────

interface RunBody {
  // Optional: explicitly pick a topic (debug/manual fire). Otherwise
  // pulls the next unused topic from the queue.
  topicId?: string;
}

Deno.serve(handler<RunBody>({
  fn: "daily-seo-blog-generator",
  auth: "webhook",
  webhookSecretEnv: "CRON_SECRET",
  rateLimit: { max: 10, windowMs: 60_000 },
  run: async (ctx, body) => {
    const geminiKey = Deno.env.get("GEMINI_API_KEY") || "";
    if (!geminiKey) throw new AppError("AI_NOT_CONFIGURED", "GEMINI_API_KEY not set", 503);

    // 1. Pick a topic — body override or queue-head.
    let topic: Topic | null = null;
    if (body?.topicId) {
      const { data, error } = await ctx.supabase
        .from("seo_blog_topics")
        .select("id, category, topic, brief, keyword, related_keywords")
        .eq("id", body.topicId)
        .maybeSingle();
      if (error || !data) throw new AppError("TOPIC_NOT_FOUND", "Topic not in queue", 404);
      topic = data as Topic;
    } else {
      const { data, error } = await ctx.supabase
        .from("seo_blog_topics")
        .select("id, category, topic, brief, keyword, related_keywords")
        .is("used_at", null)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw new AppError("TOPIC_FETCH_FAILED", error.message, 500);
      if (!data) throw new AppError("QUEUE_EMPTY", "No unused topics in queue — add more", 400);
      topic = data as Topic;
    }

    ctx.log.info("daily_seo.topic_picked", { topicId: topic.id, keyword: topic.keyword });

    // 2. Generate article via Gemini Pro.
    const article = await generateArticle(topic, geminiKey);
    ctx.log.info("daily_seo.article_generated", {
      slug: article.slug,
      titleLen: article.title.length,
      contentLen: article.contentHtml?.length ?? 0,
    });

    // 3. Generate cover image via Imagen (non-fatal on failure).
    const imageBytes = await generateCoverImage(topic, geminiKey);
    let coverUrl: string | null = null;
    if (imageBytes) {
      const filename = `${article.slug}-${Date.now()}.png`;
      const { error: uploadErr } = await ctx.supabase.storage
        .from("blog-covers")
        .upload(filename, imageBytes, {
          contentType: "image/png",
          upsert: false,
        });
      if (uploadErr) {
        ctx.log.warn("daily_seo.cover_upload_failed", { err: uploadErr.message });
      } else {
        const { data: pub } = ctx.supabase.storage.from("blog-covers").getPublicUrl(filename);
        coverUrl = pub?.publicUrl ?? null;
        ctx.log.info("daily_seo.cover_uploaded", { coverUrl });
      }
    } else {
      ctx.log.warn("daily_seo.cover_skipped", { reason: "imagen returned no image" });
    }

    // 4. Insert blog post (or update if slug already exists).
    const finalTags = (article.tags?.length ? article.tags : [topic.category, "tarot", "spirituality"])
      .map((t) => t.toLowerCase().slice(0, 30));

    const { data: post, error: insertErr } = await ctx.supabase
      .from("blog_posts")
      .upsert(
        {
          slug: article.slug,
          title: article.title,
          excerpt: article.excerpt,
          content: article.contentHtml,
          cover_image: coverUrl,
          author: "Arcana",
          tags: finalTags,
          published: true,
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "slug" },
      )
      .select()
      .single();

    if (insertErr) {
      ctx.log.error("daily_seo.post_insert_failed", { err: insertErr.message });
      throw new AppError("POST_INSERT_FAILED", insertErr.message, 500);
    }

    // 5. Mark topic as used.
    await ctx.supabase
      .from("seo_blog_topics")
      .update({ used_at: new Date().toISOString(), post_id: post.id })
      .eq("id", topic.id);

    // 6. Ping IndexNow (non-blocking on failure).
    pingIndexNow(article.slug).catch((e) =>
      ctx.log.warn("daily_seo.indexnow_failed", { err: String(e) }),
    );

    ctx.log.info("daily_seo.published", { postId: post.id, slug: article.slug });

    return {
      post: {
        id: post.id,
        slug: article.slug,
        title: article.title,
        url: `${SITE_URL}/blog/${article.slug}`,
        cover_image: coverUrl,
      },
      topic: { id: topic.id, keyword: topic.keyword },
      faqs_count: article.faqs?.length ?? 0,
    };
  },
}));
