import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Tag, User } from 'lucide-react';
import { Card } from '../components/ui';
import { useBlogPost } from '../hooks/useBlogPosts';
import { setArticleMeta } from '../utils/seo';
import { ListSkeleton } from '../components/ui';

export function BlogPostPage() {
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
        <p className="text-mystic-400 mb-4">Article not found.</p>
        <button
          onClick={() => navigate('/blog')}
          className="text-gold hover:text-gold/80 text-sm transition-colors"
        >
          Back to News
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2 pb-8">
      <button
        onClick={() => navigate('/blog')}
        className="flex items-center gap-1 text-sm text-mystic-400 hover:text-gold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to News
      </button>

      <article>
        {post.cover_image && (
          <div className="rounded-xl overflow-hidden mb-4">
            <img
              src={post.cover_image}
              alt={post.title}
              className="w-full h-48 sm:h-64 object-cover"
            />
          </div>
        )}

        <Card className="p-5 space-y-4">
          <h1 className="text-2xl font-bold text-mystic-50 leading-tight">
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center gap-3 text-xs text-mystic-500">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {post.author}
            </span>
            {post.published_at && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(post.published_at).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            )}
          </div>

          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-mystic-800/50 text-mystic-400 text-xs"
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div
            className="prose prose-invert prose-sm max-w-none
              prose-headings:text-mystic-100 prose-headings:font-semibold
              prose-p:text-mystic-300 prose-p:leading-relaxed
              prose-a:text-gold prose-a:no-underline hover:prose-a:underline
              prose-strong:text-mystic-200
              prose-ul:text-mystic-300 prose-ol:text-mystic-300
              prose-blockquote:border-gold/30 prose-blockquote:text-mystic-400
              prose-img:rounded-lg"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </Card>
      </article>
    </div>
  );
}
