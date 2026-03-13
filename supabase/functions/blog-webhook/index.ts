import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  // Verify webhook secret
  const webhookSecret = Deno.env.get('BLOG_WEBHOOK_SECRET')
  const providedSecret = req.headers.get('x-webhook-secret')

  if (!webhookSecret || providedSecret !== webhookSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await req.json()

    // Support single post or array of posts
    const posts = Array.isArray(body) ? body : [body]

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const results = []

    for (const post of posts) {
      const { slug, title, excerpt, content, cover_image, author, tags, published } = post

      if (!slug || !title || !content) {
        results.push({ slug: slug || 'unknown', error: 'Missing required fields: slug, title, content' })
        continue
      }

      const { data, error } = await supabase
        .from('blog_posts')
        .upsert(
          {
            slug,
            title,
            excerpt: excerpt || null,
            content,
            cover_image: cover_image || null,
            author: author || 'Arcana',
            tags: tags || [],
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
