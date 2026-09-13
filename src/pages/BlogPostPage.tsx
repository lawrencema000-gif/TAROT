import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Tag, User } from 'lucide-react';
import { useBlogPost } from '../hooks/useBlogPosts';
import DOMPurify from 'dompurify';
import { setArticleMeta } from '../utils/seo';
import { ListSkeleton } from '../components/ui';
import { useT } from '../i18n/useT';
import { getLocale } from '../i18n/config';

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
      <div className="space-y-4 pt-2">
        <ListSkeleton count={3} />
      </div>
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
    <div className="space-y-4 pt-2 pb-8">
      <button
        onClick={() => navigate('/blog')}
        className="flex items-center gap-1 text-sm text-mystic-400 hover:text-gold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('common:nav.backToNews')}
      </button>

      <article>
        {/* Full-bleed to the shell's column edge (main is px-4 lg:px-8).
            Square on mobile, where the edges meet the viewport. */}
        {post.cover_image && (
          <div className="-mx-4 lg:-mx-8 max-w-none overflow-hidden rounded-none lg:rounded-xl mb-6">
            <img
              src={post.cover_image}
              alt={post.title}
              className="w-full h-56 sm:h-72 object-cover"
            />
          </div>
        )}

        <header className="space-y-4 mb-8">
          <h1 className="heading-display-xl text-mystic-100">
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-meta text-mystic-400">
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
          </div>

          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-mystic-800/50 text-meta text-mystic-400"
                >
                  <Tag className="w-3 h-3" aria-hidden />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </header>

        <div
          className="prose-reading"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content, {
            ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'h4', 'strong', 'em', 'a', 'img', 'blockquote', 'ul', 'ol', 'li', 'br', 'article', 'section', 'span', 'table', 'thead', 'tbody', 'tr', 'td', 'th'],
            ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'target', 'rel'],
          }) }}
        />
      </article>
    </div>
  );
}
