import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, Tag as TagIcon, User } from 'lucide-react';
import { useBlogPost } from '../hooks/useBlogPosts';
import DOMPurify from 'dompurify';
import { setArticleMeta } from '../utils/seo';
import { ListSkeleton, Page, PageHeader, Tag } from '../components/ui';
import { useT } from '../i18n/useT';
import { getLocale } from '../i18n/config';

/**
 * Generator-written bodies open with an <h1> that repeats the post title,
 * and this page renders the title itself — so every article carried two
 * h1s, and once the body got real typography the in-body one sat at 17px
 * regular above a 19px lede: an inverted hierarchy on 115 of 124 live posts.
 * Drop a LEADING h1 only (first element inside the article wrapper, or at
 * the top of a bare body). An h1 deeper in the body is content and stays.
 */
function stripDuplicateTitle(html: string): string {
  return html.replace(/^(\s*(?:<article\b[^>]*>\s*)?)<h1\b[^>]*>[\s\S]*?<\/h1>\s*/i, '$1');
}

const DATE_LOCALES: Record<string, string> = {
  en: 'en-US',
  ja: 'ja-JP',
  ko: 'ko-KR',
  zh: 'zh-CN',
};

/** Kana and CJK ideographs: written without spaces, so a whitespace word
 *  count reads every Japanese or Chinese article as "1 min". */
const CJK_CHARS = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/g;

/** ~220 words per minute for space-delimited text, ~500 characters per
 *  minute for kana/ideographs. Tags are stripped first so markup is not
 *  counted as words. */
function estimateReadingMinutes(html: string): number {
  const text = html.replace(/<[^>]+>/g, ' ');
  const cjkChars = (text.match(CJK_CHARS) ?? []).length;
  const words = text
    .replace(CJK_CHARS, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 220 + cjkChars / 500));
}

export function BlogPostPage() {
  const { t } = useT(['app', 'common']);
  const { slug } = useParams<{ slug: string }>();
  const { post, loading, error } = useBlogPost(slug || '');
  const navigate = useNavigate();

  useEffect(() => {
    if (post) {
      setArticleMeta({
        title: post.title,
        excerpt: post.excerpt,
        cover_image: post.cover_image,
        author: post.author,
        published_at: post.published_at,
        updated_at: post.updated_at,
        tags: post.tags,
        slug: post.slug,
      });
    }
  }, [post]);

  if (loading) {
    return (
      <Page spacing="sm" className="pt-2">
        <ListSkeleton count={3} />
      </Page>
    );
  }

  if (error || !post) {
    return (
      <div className="text-center py-12">
        <p className="text-mystic-400 mb-4">{t('blog.articleNotFound')}</p>
        <button
          onClick={() => navigate('/blog')}
          className="text-gold hover:text-gold/80 text-sm transition-colors"
        >
          {t('common:nav.backToNews')}
        </button>
      </div>
    );
  }

  const dateLocale = DATE_LOCALES[getLocale()] || DATE_LOCALES.en;
  const readingMinutes = estimateReadingMinutes(post.content);

  return (
    <Page spacing="sm" className="pt-2">
      <article>
        <div className="space-y-4 mb-8">
          <PageHeader
            as="h1"
            onBack={() => navigate('/blog')}
            backLabel={t('common:nav.backToNews') as string}
            title={post.title}
            subtitle={
              <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-meta">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" aria-hidden />
                  {post.author}
                </span>
                {post.published_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" aria-hidden />
                    {new Date(post.published_at).toLocaleDateString(dateLocale, {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" aria-hidden />
                  {t('blog.readingTime', { n: readingMinutes })}
                </span>
              </span>
            }
          />

          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Tag key={tag} tone="neutral" size="md" icon={<TagIcon className="w-3 h-3" aria-hidden />}>
                  {tag}
                </Tag>
              ))}
            </div>
          )}
        </div>

        {/* Under the headline, not over it: the back link and the title come
            first on the page. Full-bleed to the column edge. This route renders in two shells —
            signed-in (px-4 lg:px-8) and the public SEO shell (px-4 at every
            width) — so -mx-4 is the largest negative margin that never
            overhangs; at lg in the signed-in shell it sits 16px inside the
            edge, which reads as a deliberate inset rather than a spill. */}
        {post.cover_image && (
          <div className="-mx-4 max-w-none overflow-hidden rounded-none lg:rounded-xl mb-6">
            <img
              src={post.cover_image}
              alt={post.title}
              className="w-full h-56 sm:h-72 object-cover"
            />
          </div>
        )}

        <div
          className="prose-reading"
          dangerouslySetInnerHTML={{ __html: stripDuplicateTitle(DOMPurify.sanitize(post.content, {
            ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'h4', 'strong', 'em', 'a', 'img', 'blockquote', 'ul', 'ol', 'li', 'br', 'article', 'section', 'span', 'table', 'thead', 'tbody', 'tr', 'td', 'th'],
            ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'target', 'rel'],
          })) }}
        />
      </article>
    </Page>
  );
}
