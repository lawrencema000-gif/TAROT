import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Tag, ChevronLeft, ChevronRight, Newspaper } from 'lucide-react';
import { Card } from '../components/ui';
import { useBlogPosts } from '../hooks/useBlogPosts';
import { setPageMeta } from '../utils/seo';
import { ListSkeleton } from '../components/ui';
import { useT } from '../i18n/useT';
import { getLocale } from '../i18n/config';

// Map our i18next locale codes to the Intl locales we prefer for dates
const DATE_LOCALES: Record<string, string> = {
  en: 'en-US',
  ja: 'ja-JP',
  ko: 'ko-KR',
  zh: 'zh-CN',
};

export function BlogPage() {
  const { t } = useT('app');
  const [page, setPage] = useState(1);
  const { posts, totalPages, loading, error } = useBlogPosts(page);
  const navigate = useNavigate();

  useEffect(() => {
    setPageMeta(t('blog.title'), t('blog.subtitle'));
  }, [t]);

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
        <p className="text-mystic-400">{t('blog.failedToLoad')}</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-16">
        <Newspaper className="w-12 h-12 text-mystic-600 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-mystic-200 mb-2">{t('blog.noArticles')}</h2>
        <p className="text-mystic-400 text-sm">{t('blog.comeBackSoon')}</p>
      </div>
    );
  }

  const dateLocale = DATE_LOCALES[getLocale()] || DATE_LOCALES.en;

  return (
    <div className="space-y-4 pt-2 pb-8">
      <header>
        <h1 className="font-display text-2xl text-mystic-100">{t('blog.title')}</h1>
        <p className="text-mystic-400 text-sm mt-1">{t('blog.subtitle')}</p>
      </header>
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
                      {new Date(post.published_at).toLocaleDateString(dateLocale, {
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
