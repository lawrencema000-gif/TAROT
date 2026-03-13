import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { BlogPost } from '../types/blog';

const PAGE_SIZE = 12;

export function useBlogPosts(page = 1) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error: err, count } = await supabase
      .from('blog_posts')
      .select('*', { count: 'exact' })
      .eq('published', true)
      .order('published_at', { ascending: false })
      .range(from, to);

    if (err) {
      setError(err.message);
    } else {
      setPosts(data || []);
      setTotal(count || 0);
    }
    setLoading(false);
  }, [page]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return { posts, total, totalPages: Math.ceil(total / PAGE_SIZE), loading, error, refetch: fetchPosts };
}

export function useBlogPost(slug: string) {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    setLoading(true);
    supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .single()
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setPost(data);
        setLoading(false);
      });
  }, [slug]);

  return { post, loading, error };
}
