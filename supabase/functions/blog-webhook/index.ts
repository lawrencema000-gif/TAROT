import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/** Wraps content in a consistent tarot-themed HTML structure unless already structured */
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

  // Parse body first so we can check secret from body too
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
    const posts = Array.isArray(body) ? body : [body as Record<string, unknown>]

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const results = []

    for (const post of posts) {
      const { title, content, cover_image, author, tags, published, raw } = post
      let { slug, excerpt } = post

      if (!title || !content) {
        results.push({ slug: slug || 'unknown', error: 'Missing required fields: title, content' })
        continue
      }

      // Auto-generate slug & excerpt if not provided
      if (!slug) slug = slugify(title)
      if (!excerpt) excerpt = autoExcerpt(content)

      const formattedContent = formatContent({ content, excerpt, raw })
      const finalTags = tags && tags.length > 0 ? tags : ['tarot', 'spirituality']

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
        results.push({ slug, id: data.id, status: 'ok' })
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
