import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret, user-agent',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/** Wraps content in a consistent HTML structure unless already structured */
function formatContent(post: { content: string; excerpt?: string; raw?: boolean }): string {
  if (post.raw || post.content.includes('<article') || post.content.includes('class="blog-')) {
    return post.content;
  }
  return `<article class="blog-post">\n${post.excerpt ? `<p class="lead"><em>${post.excerpt}</em></p>\n` : ''}${post.content}\n</article>`;
}

/** Auto-generate URL slug from title */
function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 120);
}

/** Auto-generate excerpt by stripping HTML */
function autoExcerpt(content: string, max = 160): string {
  const text = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return text.substring(0, max).replace(/\s\S*$/, '') + '\u2026';
}

/**
 * Normalize incoming payload — accepts both our format and SEO Booster format:
 *
 * Our format:    { title, content, slug, excerpt, cover_image, author, tags, published }
 * SEO Booster:   { title, content_html, slug, meta_description, featured_image_url, tags, categories, status, event }
 */
function normalizePost(raw: Record<string, unknown>): Record<string, unknown> {
  // Handle SEO Booster "unpublish" event
  if (raw.event === 'unpublish') {
    return {
      title: raw.title || 'Untitled',
      content: raw.content_html || raw.content || '',
      slug: raw.slug,
      excerpt: raw.meta_description || raw.excerpt,
      cover_image: raw.featured_image_url || raw.cover_image,
      author: raw.author || 'Arcana',
      tags: raw.tags || raw.categories || ['tarot', 'spirituality'],
      published: false,
      raw: raw.raw,
    };
  }

  return {
    title: raw.title,
    // Accept content_html (SEO Booster) or content (our format)
    content: raw.content_html || raw.content,
    slug: raw.slug,
    // Accept meta_description (SEO Booster) or excerpt (our format)
    excerpt: raw.meta_description || raw.excerpt,
    // Accept featured_image_url (SEO Booster) or cover_image (our format)
    cover_image: raw.featured_image_url || raw.cover_image,
    author: raw.author || 'Arcana',
    // Accept tags or categories
    tags: raw.tags || raw.categories,
    // Accept status="publish" (SEO Booster) or published=true (our format)
    published: raw.status === 'publish' || raw.published === true || raw.published === undefined,
    raw: raw.raw,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const webhookSecret = Deno.env.get('BLOG_WEBHOOK_SECRET')

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Accept secret from: header, query param, Authorization bearer, or request body
  const url = new URL(req.url)
  const bodyObj = (body && typeof body === 'object' && !Array.isArray(body)) ? body as Record<string, unknown> : null
  const providedSecret =
    req.headers.get('x-webhook-secret') ||
    url.searchParams.get('secret') ||
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    (bodyObj?.secret as string) ||
    null

  if (!webhookSecret || providedSecret !== webhookSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const rawPosts = Array.isArray(body) ? body : [body as Record<string, unknown>]

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const results = []

    for (const rawPost of rawPosts) {
      const post = normalizePost(rawPost)
      const { title, content, cover_image, author, tags, published, raw: isRaw } = post
      let slug = post.slug as string | undefined
      let excerpt = post.excerpt as string | undefined

      if (!title || !content) {
        results.push({ slug: slug || 'unknown', error: 'Missing required fields: title, content' })
        continue
      }

      // Auto-generate slug & excerpt if not provided
      if (!slug) slug = slugify(title as string)
      if (!excerpt) excerpt = autoExcerpt(content as string)

      const formattedContent = formatContent({ content: content as string, excerpt, raw: isRaw as boolean })
      const finalTags = (tags as string[])?.length > 0 ? tags : ['tarot', 'spirituality']

      const { data, error } = await supabase
        .from('blog_posts')
        .upsert(
          {
            slug,
            title,
            excerpt,
            content: formattedContent,
            cover_image: cover_image || null,
            author: author || 'Arcana',
            tags: finalTags,
            published: published ?? true,
            published_at: published !== false ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'slug' }
        )
        .select()
        .single()

      if (error) {
        results.push({ slug, error: error.message })
      } else {
        results.push({
          slug,
          id: data.id,
          status: 'ok',
          // Return these for SEO Booster to track
          url: `https://tarotlife.app/blog/${slug}`,
          published_url: `https://tarotlife.app/blog/${slug}`,
        })
      }
    }

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
