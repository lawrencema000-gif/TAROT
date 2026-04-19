// One-shot migration: download external (Unsplash) blog cover images,
// upload into Supabase Storage's `blog-covers` bucket, and update
// blog_posts.cover_image to point at the Supabase-hosted URL.
//
// Requires: SUPABASE_SERVICE_KEY + VITE_SUPABASE_URL in env.
//
// Safe to re-run: skips rows that already point at *.supabase.co.

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error('Set VITE_SUPABASE_URL + SUPABASE_SERVICE_KEY env vars');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const BUCKET = 'blog-covers';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. Ensure bucket exists + is public
console.log('═══ Step 1: ensure storage bucket ═══');
const { data: buckets } = await supabase.storage.listBuckets();
const existing = buckets?.find(b => b.name === BUCKET);
if (!existing) {
  const { error: bErr } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024, // 5 MB cap
    allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png', 'image/avif'],
  });
  if (bErr) { console.error('Bucket create failed:', bErr); process.exit(1); }
  console.log(`  ✓ created public bucket "${BUCKET}"`);
} else {
  console.log(`  ✓ bucket "${BUCKET}" exists (public=${existing.public})`);
  if (!existing.public) {
    const { error } = await supabase.storage.updateBucket(BUCKET, { public: true });
    if (error) console.error('Could not set public:', error);
    else console.log('  ✓ flipped to public');
  }
}

// 2. Find blog_posts with external cover images
console.log('\n═══ Step 2: fetch blog_posts ═══');
const { data: posts, error } = await supabase
  .from('blog_posts')
  .select('id, slug, title, cover_image')
  .not('cover_image', 'is', null);

if (error) { console.error('Select failed:', error); process.exit(1); }
console.log(`  Found ${posts.length} posts with a cover image`);

const supabaseHost = new URL(url).host;
const external = posts.filter(p => p.cover_image && !p.cover_image.includes(supabaseHost) && !p.cover_image.startsWith('/'));
const already = posts.length - external.length;
console.log(`  ${external.length} need migration, ${already} already on Supabase or local`);

if (external.length === 0) {
  console.log('\n✓ Nothing to do.');
  process.exit(0);
}

// 3. For each: download → upload → update
console.log('\n═══ Step 3: migrate each post ═══');
const results = [];
for (const post of external) {
  console.log(`\n→ ${post.slug}`);
  console.log(`  old: ${post.cover_image}`);
  try {
    // Download (with redirect follow) — cap at 10s
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(post.cover_image, { redirect: 'follow', signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') || 'image/jpeg';

    // Derive extension from content-type
    const ext = contentType.includes('webp') ? 'webp'
      : contentType.includes('png') ? 'png'
      : contentType.includes('avif') ? 'avif'
      : 'jpg';
    const fileName = `${post.slug}.${ext}`;

    // Upload
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, buf, { contentType, upsert: true, cacheControl: '31536000' });
    if (upErr) throw new Error(`upload: ${upErr.message}`);

    // Public URL
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
    const newUrl = pub.publicUrl;

    // Update row
    const { error: updErr } = await supabase
      .from('blog_posts')
      .update({ cover_image: newUrl, updated_at: new Date().toISOString() })
      .eq('id', post.id);
    if (updErr) throw new Error(`update: ${updErr.message}`);

    console.log(`  new: ${newUrl}`);
    console.log(`  ✓ migrated (${buf.length} bytes, ${contentType})`);
    results.push({ slug: post.slug, status: 'migrated', bytes: buf.length, newUrl });
  } catch (e) {
    console.log(`  ✗ ${e.message}`);
    results.push({ slug: post.slug, status: 'failed', error: e.message });
  }
}

console.log('\n═══ Summary ═══');
const migrated = results.filter(r => r.status === 'migrated').length;
const failed = results.filter(r => r.status === 'failed').length;
console.log(`  migrated: ${migrated}  failed: ${failed}  already ok: ${already}`);
fs.writeFileSync(path.join(__dirname, '..', '.audit', 'blog-covers-migration.json'), JSON.stringify(results, null, 2));
console.log('\n✓ Report: .audit/blog-covers-migration.json');
