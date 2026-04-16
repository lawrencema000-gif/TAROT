/**
 * Generate sitemap.xml with all published blog post URLs.
 * Run: node scripts/generate-sitemap.mjs
 * Called automatically by: npm run build (via postbuild)
 */
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const supabaseUrl = 'https://ulzlthhkqjuohzjangcq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsemx0aGhrcWp1b2h6amFuZ2NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyNTY4NTQsImV4cCI6MjA4MjgzMjg1NH0.pqf2bqHJZ_D1i2-KFEN07xYYvruIYHd2-nv7MI6yeyE';
const siteUrl = 'https://tarotlife.app';

async function generate() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch published blog posts
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('slug, updated_at, published_at')
    .eq('published', true)
    .order('published_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch blog posts:', error.message);
    process.exit(1);
  }

  const today = new Date().toISOString().split('T')[0];

  // Static pages
  const urls = [
    { loc: `${siteUrl}/`, changefreq: 'weekly', priority: '1.0', lastmod: today },
    { loc: `${siteUrl}/blog`, changefreq: 'daily', priority: '0.9', lastmod: today },
    { loc: `${siteUrl}/privacy-policy.html`, changefreq: 'monthly', priority: '0.3' },
  ];

  // Blog post pages
  for (const post of posts || []) {
    const lastmod = (post.updated_at || post.published_at || today).split('T')[0];
    urls.push({
      loc: `${siteUrl}/blog/${post.slug}`,
      changefreq: 'monthly',
      priority: '0.7',
      lastmod,
    });
  }

  // Generate XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  // Write to both public/ (source) and dist/ (built output)
  writeFileSync(resolve('public/sitemap.xml'), xml);
  try {
    writeFileSync(resolve('dist/sitemap.xml'), xml);
  } catch {
    // dist/ may not exist yet during first run
  }

  console.log(`Sitemap generated with ${urls.length} URLs (${posts?.length || 0} blog posts)`);
}

generate();
