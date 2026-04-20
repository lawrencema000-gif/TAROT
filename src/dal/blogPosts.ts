import { supabase } from '../lib/supabase';
import { captureException } from '../utils/telemetry';
import type { Result } from './dailyRituals';
import type { BlogPost } from '../types/blog';

export async function listPublished(options: {
  from: number;
  to: number;
}): Promise<Result<{ posts: BlogPost[]; total: number }>> {
  const { data, error, count } = await supabase
    .from('blog_posts')
    .select('*', { count: 'exact' })
    .eq('published', true)
    .neq('archived', true)
    .order('published_at', { ascending: false })
    .range(options.from, options.to);

  if (error) {
    captureException('dal.blogPosts.listPublished', error, { from: options.from, to: options.to });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: { posts: (data ?? []) as BlogPost[], total: count ?? 0 } };
}

export async function getBySlug(slug: string): Promise<Result<BlogPost | null>> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .single();

  if (error) {
    // PGRST116 = no rows; treat as not-found rather than error
    if ((error as { code?: string }).code === 'PGRST116') {
      return { ok: true, data: null };
    }
    captureException('dal.blogPosts.getBySlug', error, { slug });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: data as BlogPost };
}

export async function setArchived(id: string, archived: boolean): Promise<Result<void>> {
  const { error } = await supabase
    .from('blog_posts')
    .update({ archived, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    captureException('dal.blogPosts.setArchived', error, { id, archived });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: undefined };
}

export async function setPublished(
  id: string,
  published: boolean,
  existingPublishedAt?: string | null,
): Promise<Result<void>> {
  const { error } = await supabase
    .from('blog_posts')
    .update({
      published,
      published_at: published ? new Date().toISOString() : existingPublishedAt ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) {
    captureException('dal.blogPosts.setPublished', error, { id, published });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: undefined };
}

export async function deleteById(id: string): Promise<Result<void>> {
  const { error } = await supabase.from('blog_posts').delete().eq('id', id);
  if (error) {
    captureException('dal.blogPosts.deleteById', error, { id });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: undefined };
}
