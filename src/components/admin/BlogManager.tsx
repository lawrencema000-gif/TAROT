import { useState } from 'react';
import { Newspaper, ChevronDown, ChevronUp, Trash2, Archive, Eye, EyeOff } from 'lucide-react';
import { toast } from '../ui';
import { blogPosts } from '../../dal';
import type { BlogPost } from '../../types/blog';

interface BlogManagerProps {
  posts: BlogPost[];
  onRefresh: () => void;
}

export function BlogManager({ posts, onRefresh }: BlogManagerProps) {
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<'all' | 'published' | 'archived'>('all');

  const filteredPosts = posts.filter(p => {
    if (filter === 'published') return p.published && !p.archived;
    if (filter === 'archived') return p.archived;
    return true;
  });

  const toggleArchive = async (post: BlogPost) => {
    const res = await blogPosts.setArchived(post.id, !post.archived);
    if (!res.ok) {
      toast('Failed to update post', 'error');
    } else {
      toast(post.archived ? 'Post restored' : 'Post archived', 'success');
      onRefresh();
    }
  };

  const togglePublish = async (post: BlogPost) => {
    const res = await blogPosts.setPublished(post.id, !post.published, post.published_at);
    if (!res.ok) {
      toast('Failed to update post', 'error');
    } else {
      toast(post.published ? 'Post unpublished' : 'Post published', 'success');
      onRefresh();
    }
  };

  const deletePost = async (post: BlogPost) => {
    if (!confirm(`Delete "${post.title}" permanently? This cannot be undone.`)) return;
    const res = await blogPosts.deleteById(post.id);
    if (!res.ok) {
      toast('Failed to delete post', 'error');
    } else {
      toast('Post deleted', 'success');
      onRefresh();
    }
  };

  return (
    <div className="bg-mystic-900/60 border border-mystic-700/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-mystic-800/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gold/20 flex items-center justify-center">
            <Newspaper className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h3 className="font-medium text-mystic-100">Blog Manager</h3>
            <p className="text-xs text-mystic-500">{posts.length} posts total</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-mystic-400" /> : <ChevronDown className="w-5 h-5 text-mystic-400" />}
      </button>

      {expanded && (
        <div className="p-4 pt-0 space-y-3">
          <div className="flex gap-2">
            {(['all', 'published', 'archived'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filter === f
                    ? 'bg-gold/20 text-gold'
                    : 'bg-mystic-800/50 text-mystic-400 hover:text-mystic-300'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {filteredPosts.length === 0 ? (
            <p className="text-sm text-mystic-500 py-4 text-center">No posts found</p>
          ) : (
            <div className="space-y-2">
              {filteredPosts.map(post => (
                <div
                  key={post.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    post.archived
                      ? 'border-mystic-700/30 bg-mystic-900/30 opacity-60'
                      : 'border-mystic-700/50 bg-mystic-800/30'
                  }`}
                >
                  {post.cover_image && (
                    <img src={post.cover_image} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-mystic-100 truncate">{post.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-mystic-500">
                      <span>{post.published_at ? new Date(post.published_at).toLocaleDateString() : 'Draft'}</span>
                      {post.archived && <span className="text-amber-400">Archived</span>}
                      {!post.published && <span className="text-red-400">Unpublished</span>}
                      {post.tags.length > 0 && <span>· {post.tags.slice(0, 2).join(', ')}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => togglePublish(post)}
                      title={post.published ? 'Unpublish' : 'Publish'}
                      className="p-2 rounded-lg hover:bg-mystic-700/50 transition-colors"
                    >
                      {post.published ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-mystic-500" />}
                    </button>
                    <button
                      onClick={() => toggleArchive(post)}
                      title={post.archived ? 'Restore' : 'Archive'}
                      className="p-2 rounded-lg hover:bg-mystic-700/50 transition-colors"
                    >
                      <Archive className={`w-4 h-4 ${post.archived ? 'text-amber-400' : 'text-mystic-500'}`} />
                    </button>
                    <button
                      onClick={() => deletePost(post)}
                      title="Delete permanently"
                      className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
