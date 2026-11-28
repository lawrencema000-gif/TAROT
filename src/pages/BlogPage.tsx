import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useNavigationType, useSearchParams } from 'react-router-dom';
import { Calendar, Tag, ChevronLeft, ChevronRight, Newspaper } from 'lucide-react';
import { Card, ListSkeleton, Page, PageHeader } from '../components/ui';
import { useBlogPosts } from '../hooks/useBlogPosts';
import { setPageMeta } from '../utils/seo';
import { useT } from '../i18n/useT';
import { getLocale } from '../i18n/config';

// Map our i18next locale codes to the Intl locales we prefer for dates
const DATE_LOCALES: Record<string, string> = {
  en: 'en-US',
  ja: 'ja-JP',
  ko: 'ko-KR',
  zh: 'zh-CN',
};

/** Where the reader was on the list when they opened a post (this tab only), for Back. */
const LIST_PLACE_KEY = 'arcana_blog_list_place';

/** `?page=` as a page number: 1–9999; anything else is page 1. */
function pageFromParam(raw: string | null): number {
  return raw && /^[1-9]\d{0,3}$/.test(raw) ? Number(raw) : 1;
}

function scrollToY(top: number) {
  try {
    window.scrollTo({ top });
  } catch {
    // jsdom and old WebViews
  }
}

export function BlogPage() {
  const { t } = useT('app');
  const [params, setParams] = useSearchParams();
  const page = pageFromParam(params.get('page'));
  const { posts, totalPages, loading, error } = useBlogPosts(page);
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  /** Back (POP) to the page the reader left returns to their place on it; any other arrival opens at the top. */
  const [placeOnArrival] = useState<number | null>(() => {
    if (navigationType !== 'POP') return null;
    try {
      const saved = JSON.parse(sessionStorage.getItem(LIST_PLACE_KEY) ?? 'null') as { page?: unknown; y?: unknown } | null;
      return saved && saved.page === page && typeof saved.y === 'number' ? saved.y : null;
    } catch {
      return null;
    }
  });
  const arrived = useRef(false);

  /** The page in the address. Replace, not push: Back leaves the list rather than stepping through 12 pages. Other parameters (?lang=) are kept. */
  const setPageParam = useCallback((n: number) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (n > 1) next.set('page', String(n));
      else next.delete('page');
      return next;
    }, { replace: true });
  }, [setParams]);

  const goToPage = (n: number) => {
    setPageParam(n);
    scrollToY(0);
  };

  // Once a list is in: one form of the address (no ?page= for page 1), never past the last page.
  useEffect(() => {
    if (loading || error) return;
    const target = totalPages > 0 ? Math.min(page, totalPages) : page;
    if (params.get('page') !== (target > 1 ? String(target) : null)) setPageParam(target);
  }, [loading, error, totalPages, page, params, setPageParam]);

  // The first list on screen: the reader's place on a Back, else the top.
  useEffect(() => {
    if (loading || arrived.current) return;
    arrived.current = true;
    scrollToY(placeOnArrival ?? 0);
  }, [loading, placeOnArrival]);

  const openPost = (slug: string) => {
    try {
      sessionStorage.setItem(LIST_PLACE_KEY, JSON.stringify({ page, y: window.scrollY }));
    } catch {
      // storage unavailable: Back opens the same page at its top
    }
    navigate(`/blog/${slug}`, { state: { fromBlogList: true } });
  };

  useEffect(() => {
    setPageMeta(t('blog.title'), t('blog.subtitle'));
  }, [t]);

  if (loading && posts.length === 0) {
    return (
      <Page spacing="sm" className="pt-2 max-w-3xl mx-auto">
        <ListSkeleton count={4} />
      </Page>
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
    <Page spacing="sm" className="pt-2 max-w-3xl mx-auto">
      <PageHeader title={t('blog.title')} />
      <div className={`grid gap-4 transition-opacity duration-fast ${loading ? 'opacity-60' : ''}`} aria-busy={loading || undefined}>
        {posts.map((post) => (
          <button
            key={post.id}
            onClick={() => openPost(post.slug)}
            className="text-left w-full"
          >
            <Card className="overflow-hidden hover:border-gold/30 transition-all duration-slow group">
              {post.cover_image && (
                <div className="h-40 overflow-hidden">
                  <img
                    src={post.cover_image}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-deliberate"
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
                <div className="flex items-center gap-3 text-meta text-mystic-500">
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
            onClick={() => goToPage(Math.max(1, page - 1))}
            disabled={loading || page <= 1}
            aria-label={t('blog.prevPage', { defaultValue: 'Previous page' }) as string}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-mystic-800/50 text-mystic-300 disabled:opacity-30 hover:bg-mystic-700/50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-mystic-400">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => goToPage(Math.min(totalPages, page + 1))}
            disabled={loading || page >= totalPages}
            aria-label={t('blog.nextPage', { defaultValue: 'Next page' }) as string}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-mystic-800/50 text-mystic-300 disabled:opacity-30 hover:bg-mystic-700/50 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </Page>
  );
}
