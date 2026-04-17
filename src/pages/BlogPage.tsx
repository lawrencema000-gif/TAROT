import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Tag, ChevronLeft, ChevronRight, Newspaper } from 'lucide-react';
import { Card } from '../components/ui';
import { useBlogPosts } from '../hooks/useBlogPosts';
import { setPageMeta } from '../utils/seo';
import { ListSkeleton } from '../components/ui';

export function BlogPage() {
  const [page, setPage] = useState(1);
  const { posts, totalPages, loading, error } = useBlogPosts(page);
  const navigate = useNavigate();

  useEffect(() => {
    setPageMeta('News & Insights', 'Tarot insights, spiritual guidance, and self-discovery articles from Arcana.');
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 pt-2">
        <ListSkeleton count={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-mystic-400">Failed to load articles.</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-16">
        <Newspaper className="w-12 h-12 text-mystic-600 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-mystic-200 mb-2">No articles yet</h2>
        <p className="text-mystic-400 text-sm">Check back soon for tarot insights and spiritual guidance.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2 pb-8">
      <div className="grid gap-4">
        {posts.map((post) => (
          <button
            key={post.id}
            onClick={() => navigate(`/blog/${post.slug}`)}
            className="text-left w-full"
          >
            <Card className="overflow-hidden hover:border-gold/30 transition-all duration-300 group">
              {post.cover_image && (
                <div className="h-40 overflow-hidden">
                  <img
                    src={post.cover_image}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="p-4 space-y-2">
                <h2 className="text-lg font-semibold text-mystic-100 group-hover:text-gold transition-colors line-clamp-2">
                  {post.title}
                </h2>
                {post.excerpt && (
                  <p className="text-sm text-mystic-400 line-clamp-2">{post.excerpt}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-mystic-500">
                  {post.published_at && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(post.published_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  )}
                  {post.tags.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {post.tags.slice(0, 2).join(', ')}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          </button>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg bg-mystic-800/50 text-mystic-300 disabled:opacity-30 hover:bg-mystic-700/50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-mystic-400">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg bg-mystic-800/50 text-mystic-300 disabled:opacity-30 hover:bg-mystic-700/50 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
