import { useState, useEffect, useCallback } from 'react';
import { blogPosts } from '../dal';
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

    const res = await blogPosts.listPublished({ from, to });
    if (!res.ok) {
      setError(res.error);
    } else {
      setPosts(res.data.posts);
      setTotal(res.data.total);
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
    let cancelled = false;
    blogPosts.getBySlug(slug).then(res => {
      if (cancelled) return;
      if (!res.ok) {
        setError(res.error);
      } else {
        setPost(res.data);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [slug]);

  return { post, loading, error };
}
