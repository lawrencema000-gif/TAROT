import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Sparkles, MessageCircle, Heart, Eye, Moon as MoonIcon, Flame, Send, MoreVertical, Flag, UserMinus } from 'lucide-react';
import { Card, Button, toast } from '../components/ui';
import { useT } from '../i18n/useT';
import { useAuth } from '../context/AuthContext';
import { community } from '../dal';
import type {
  CommunityPost,
  CommunityComment,
  CommunityTopic,
  ReactionType,
  ReportReason,
} from '../dal/community';

type View = 'feed' | 'post-detail' | 'composer';

interface CommunityPageProps {
  /** If `whispering-well`, the page renders in anonymous-only mode with a distinct palette. */
  mode?: 'normal' | 'whispering-well';
}

const TOPICS: { id: CommunityTopic | 'all'; labelKey: string }[] = [
  { id: 'all',       labelKey: 'community.topics.all' },
  { id: 'general',   labelKey: 'community.topics.general' },
  { id: 'tarot',     labelKey: 'community.topics.tarot' },
  { id: 'astrology', labelKey: 'community.topics.astrology' },
  { id: 'moon',      labelKey: 'community.topics.moon' },
  { id: 'love',      labelKey: 'community.topics.love' },
  { id: 'shadow',    labelKey: 'community.topics.shadow' },
  { id: 'career',    labelKey: 'community.topics.career' },
  { id: 'wellness',  labelKey: 'community.topics.wellness' },
];

const REACTION_ICONS: Record<ReactionType, React.ComponentType<{ className?: string }>> = {
  heart: Heart,
  sparkle: Sparkles,
  moon: MoonIcon,
  eye: Eye,
  flame: Flame,
};

const REACTION_ORDER: ReactionType[] = ['heart', 'sparkle', 'moon', 'eye', 'flame'];

// Time formatter — relative for recent, date for older
function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}

export function CommunityPage({ mode = 'normal' }: CommunityPageProps) {
  const { t } = useT('app');
  const { user } = useAuth();
  const [view, setView] = useState<View>('feed');
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<CommunityTopic | 'all'>('all');
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());

  const isWhisperingWell = mode === 'whispering-well';

  // Load feed
  const loadFeed = useCallback(async () => {
    setLoading(true);
    const topic = isWhisperingWell ? 'whispering-well' as const : (selectedTopic === 'all' ? undefined : selectedTopic);
    const res = await community.fetchFeed({
      topic: topic ?? (isWhisperingWell ? 'whispering-well' : 'all'),
      limit: 30,
      currentUserId: user?.id,
    });
    if (res.ok) {
      const filtered = res.data.filter((p) => !blockedIds.has(p.userId));
      setPosts(filtered);
    } else {
      toast(t('community.loadFailed', { defaultValue: 'Could not load feed' }), 'error');
    }
    setLoading(false);
  }, [selectedTopic, user?.id, blockedIds, isWhisperingWell, t]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  // Load user's blocks once
  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;
    community.fetchBlockedIds(user.id).then((res) => {
      if (mounted && res.ok) setBlockedIds(new Set(res.data));
    });
    return () => { mounted = false; };
  }, [user?.id]);

  const handleReact = async (post: CommunityPost, reaction: ReactionType) => {
    if (!user) {
      toast(t('community.signInFirst', { defaultValue: 'Sign in to react' }), 'error');
      return;
    }
    // Optimistic update
    const old = posts;
    const wasReaction = post.myReaction;
    setPosts((ps) => ps.map((p) => {
      if (p.id !== post.id) return p;
      const wasSame = wasReaction === reaction;
      return {
        ...p,
        myReaction: wasSame ? null : reaction,
        reactionCount: wasSame
          ? Math.max(0, p.reactionCount - 1)
          : (wasReaction ? p.reactionCount : p.reactionCount + 1),
      };
    }));
    const res = wasReaction === reaction
      ? await community.removeReaction(post.id, user.id)
      : await community.addReaction(post.id, user.id, reaction);
    if (!res.ok) {
      setPosts(old);
      toast(t('community.reactFailed', { defaultValue: 'Could not react' }), 'error');
    }
  };

  const handleBlock = async (post: CommunityPost) => {
    if (!user) return;
    const res = await community.blockUser(user.id, post.userId);
    if (res.ok) {
      setBlockedIds((prev) => new Set([...prev, post.userId]));
      setPosts((ps) => ps.filter((p) => p.userId !== post.userId));
      toast(t('community.blocked', { defaultValue: 'User blocked' }), 'success');
    } else {
      toast(t('community.blockFailed', { defaultValue: 'Could not block' }), 'error');
    }
  };

  const handleReport = async (post: CommunityPost, reason: ReportReason) => {
    if (!user) return;
    const res = await community.report({
      reporterId: user.id,
      postId: post.id,
      reason,
    });
    if (res.ok) {
      toast(t('community.reported', { defaultValue: 'Report submitted. Thank you.' }), 'success');
    } else {
      toast(t('community.reportFailed', { defaultValue: 'Could not submit report' }), 'error');
    }
  };

  // Composer
  if (view === 'composer') {
    return (
      <Composer
        mode={mode}
        topic={selectedTopic === 'all' ? 'general' : selectedTopic}
        onBack={() => setView('feed')}
        onSuccess={() => {
          setView('feed');
          loadFeed();
        }}
      />
    );
  }

  // Post detail with comments
  if (view === 'post-detail' && selectedPost) {
    return (
      <PostDetail
        post={selectedPost}
        onBack={() => { setView('feed'); setSelectedPost(null); loadFeed(); }}
        onReact={handleReact}
        onReport={handleReport}
        onBlock={handleBlock}
      />
    );
  }

  // Feed
  const headerIcon = isWhisperingWell ? MoonIcon : MessageCircle;
  const HeaderIcon = headerIcon;

  return (
    <div className={`space-y-4 pb-6 ${isWhisperingWell ? 'text-mystic-200' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <HeaderIcon className={`w-6 h-6 ${isWhisperingWell ? 'text-cosmic-violet' : 'text-gold'}`} />
          <h1 className="font-display text-2xl text-mystic-100">
            {isWhisperingWell
              ? t('community.whisperingWell.title', { defaultValue: 'Whispering Well' })
              : t('community.title', { defaultValue: 'Community' })}
          </h1>
        </div>
        {user && (
          <Button
            variant="primary"
            onClick={() => setView('composer')}
            className="min-h-[40px] text-sm"
          >
            <Send className="w-4 h-4 mr-1" />
            {isWhisperingWell
              ? t('community.whisperButton', { defaultValue: 'Whisper' })
              : t('community.postButton', { defaultValue: 'Post' })}
          </Button>
        )}
      </div>

      {isWhisperingWell && (
        <Card padding="md" className="bg-cosmic-violet/5 border-cosmic-violet/20">
          <p className="text-xs text-mystic-400 leading-relaxed italic">
            {t('community.whisperingWell.intro', {
              defaultValue:
                'A quiet place to whisper the unsayable. All posts are anonymous. Respect for each other is the rule. If something needs help, say so clearly — someone is listening.',
            })}
          </p>
        </Card>
      )}

      {!isWhisperingWell && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {TOPICS.map((t_) => (
            <button
              key={t_.id}
              onClick={() => setSelectedTopic(t_.id)}
              className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all border ${
                selectedTopic === t_.id
                  ? 'bg-gold/20 text-gold border-gold/40'
                  : 'bg-mystic-800/40 text-mystic-400 border-mystic-700/40'
              }`}
            >
              {t(t_.labelKey, { defaultValue: t_.id })}
            </button>
          ))}
        </div>
      )}

      {!user && (
        <Card padding="md" className="bg-gold/5 border-gold/20">
          <p className="text-sm text-mystic-300">
            {t('community.signInToPost', { defaultValue: 'Sign in to post, react, and comment.' })}
          </p>
        </Card>
      )}

      {loading && (
        <div className="text-center py-12 text-mystic-500 text-sm">
          {t('common.loading', { defaultValue: 'Loading…' })}
        </div>
      )}

      {!loading && posts.length === 0 && (
        <Card padding="lg" className="text-center">
          <p className="text-mystic-400 text-sm italic">
            {isWhisperingWell
              ? t('community.whisperingWell.empty', { defaultValue: 'The well is quiet. Be the first to whisper.' })
              : t('community.empty', { defaultValue: 'No posts here yet. Be the first.' })}
          </p>
        </Card>
      )}

      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          isWhisperingWell={isWhisperingWell}
          isOwn={post.userId === user?.id}
          onReact={handleReact}
          onReport={handleReport}
          onBlock={handleBlock}
          onOpenComments={() => { setSelectedPost(post); setView('post-detail'); }}
          t={t}
        />
      ))}
    </div>
  );
}

// ==================================================================
// Post card
// ==================================================================

interface PostCardProps {
  post: CommunityPost;
  isWhisperingWell: boolean;
  isOwn: boolean;
  onReact: (post: CommunityPost, r: ReactionType) => void;
  onReport: (post: CommunityPost, reason: ReportReason) => void;
  onBlock: (post: CommunityPost) => void;
  onOpenComments: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function PostCard({ post, isWhisperingWell, isOwn, onReact, onReport, onBlock, onOpenComments, t }: PostCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const displayName = post.isAnonymous
    ? t('community.anonymous', { defaultValue: 'Anonymous seeker' })
    : post.authorDisplayName || 'User';

  return (
    <Card padding="md" className={isWhisperingWell ? 'bg-cosmic-violet/5 border-cosmic-violet/15' : ''}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 text-xs">
          <span className={post.isAnonymous ? 'text-mystic-500 italic' : 'text-mystic-300'}>
            {displayName}
          </span>
          <span className="text-mystic-600">·</span>
          <span className="text-mystic-500">{formatRelativeTime(post.createdAt)}</span>
        </div>
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 text-mystic-500 hover:text-mystic-300"
            aria-label="Options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-6 z-10 bg-mystic-800 border border-mystic-700 rounded-lg shadow-lg min-w-[150px]">
              {!isOwn && (
                <>
                  <button
                    onClick={() => { setMenuOpen(false); setReportOpen(true); }}
                    className="w-full text-left px-3 py-2 text-xs text-mystic-300 hover:bg-mystic-700 flex items-center gap-2"
                  >
                    <Flag className="w-3 h-3" /> {t('community.report', { defaultValue: 'Report' })}
                  </button>
                  {!post.isAnonymous && (
                    <button
                      onClick={() => { setMenuOpen(false); onBlock(post); }}
                      className="w-full text-left px-3 py-2 text-xs text-mystic-300 hover:bg-mystic-700 flex items-center gap-2"
                    >
                      <UserMinus className="w-3 h-3" /> {t('community.blockUser', { defaultValue: 'Block user' })}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <p className="text-mystic-200 text-sm leading-relaxed mb-3 whitespace-pre-wrap">{post.content}</p>

      {/* Reactions + comments */}
      <div className="flex items-center justify-between pt-2 border-t border-mystic-800/50">
        <div className="flex items-center gap-1">
          {REACTION_ORDER.map((r) => {
            const Icon = REACTION_ICONS[r];
            const isMine = post.myReaction === r;
            return (
              <button
                key={r}
                onClick={() => onReact(post, r)}
                className={`p-1.5 rounded-lg transition-all ${
                  isMine ? 'bg-gold/20 text-gold' : 'text-mystic-500 hover:text-mystic-300'
                }`}
                aria-label={r}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
          <span className="text-xs text-mystic-500 ml-1">{post.reactionCount}</span>
        </div>
        <button
          onClick={onOpenComments}
          className="flex items-center gap-1 text-xs text-mystic-500 hover:text-mystic-300"
        >
          <MessageCircle className="w-3 h-3" />
          <span>{post.commentCount}</span>
        </button>
      </div>

      {reportOpen && (
        <ReportDialog
          onClose={() => setReportOpen(false)}
          onSubmit={(reason) => {
            onReport(post, reason);
            setReportOpen(false);
          }}
          t={t}
        />
      )}
    </Card>
  );
}

// ==================================================================
// Composer
// ==================================================================

function Composer({
  mode,
  topic,
  onBack,
  onSuccess,
}: {
  mode: 'normal' | 'whispering-well';
  topic: CommunityTopic;
  onBack: () => void;
  onSuccess: () => void;
}) {
  const { t } = useT('app');
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<CommunityTopic>(
    mode === 'whispering-well' ? 'whispering-well' : topic,
  );
  const [isAnon, setIsAnon] = useState(mode === 'whispering-well');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user) return;
    const check = community.screenContent(content);
    if (!check.ok) {
      toast(
        check.reason === 'too_long'
          ? t('community.contentTooLong', { defaultValue: 'Post is too long (max 2000)' })
          : check.reason === 'disallowed'
            ? t('community.contentDisallowed', { defaultValue: 'That phrase is not allowed' })
            : t('community.contentEmpty', { defaultValue: 'Write something first' }),
        'error',
      );
      return;
    }
    setSubmitting(true);
    const res = await community.createPost({
      userId: user.id,
      topic: selectedTopic,
      content,
      isAnonymous: mode === 'whispering-well' ? true : isAnon,
    });
    setSubmitting(false);
    if (res.ok) {
      toast(t('community.posted', { defaultValue: 'Posted' }), 'success');
      onSuccess();
    } else {
      toast(t('community.postFailed', { defaultValue: 'Could not post' }), 'error');
    }
  };

  const isWW = mode === 'whispering-well';

  return (
    <div className="space-y-4 pb-6">
      <button onClick={onBack} className="flex items-center gap-2 text-mystic-400 hover:text-mystic-200">
        <ArrowLeft className="w-4 h-4" />
        {t('community.back', { defaultValue: 'Back to feed' })}
      </button>

      <Card variant="glow" padding="lg">
        <h2 className="font-display text-xl text-mystic-100 mb-3">
          {isWW
            ? t('community.whisperingWell.newWhisper', { defaultValue: 'Whisper into the well' })
            : t('community.newPost', { defaultValue: 'New post' })}
        </h2>

        {!isWW && (
          <>
            <label className="text-xs text-mystic-500 mb-1 block">
              {t('community.topicLabel', { defaultValue: 'Topic' })}
            </label>
            <div className="flex gap-2 flex-wrap mb-4">
              {TOPICS.filter((t_) => t_.id !== 'all').map((t_) => (
                <button
                  key={t_.id}
                  onClick={() => setSelectedTopic(t_.id as CommunityTopic)}
                  className={`px-3 py-1.5 rounded-full text-xs transition-all border ${
                    selectedTopic === t_.id
                      ? 'bg-gold/20 text-gold border-gold/40'
                      : 'bg-mystic-800/40 text-mystic-400 border-mystic-700/40'
                  }`}
                >
                  {t(t_.labelKey, { defaultValue: t_.id })}
                </button>
              ))}
            </div>
          </>
        )}

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          maxLength={2000}
          className="w-full bg-mystic-800/50 border border-mystic-700/50 rounded-xl p-3 text-mystic-100 text-sm placeholder-mystic-600 resize-none focus:outline-none focus:border-gold/40"
          placeholder={isWW
            ? t('community.whisperingWell.placeholder', { defaultValue: 'What needs to be said but has no audience?' }) as string
            : t('community.placeholder', { defaultValue: 'Share a reading, a thought, a question...' }) as string}
        />
        <p className="text-[10px] text-mystic-600 text-right mt-1">{content.length} / 2000</p>

        {!isWW && (
          <label className="flex items-center gap-2 mt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={isAnon}
              onChange={(e) => setIsAnon(e.target.checked)}
              className="rounded"
            />
            <span className="text-xs text-mystic-400">
              {t('community.postAnonymously', { defaultValue: 'Post anonymously' })}
            </span>
          </label>
        )}
      </Card>

      <Button variant="primary" fullWidth onClick={submit} disabled={submitting} className="min-h-[56px]">
        <Send className="w-5 h-5 mr-2" />
        {submitting
          ? t('community.posting', { defaultValue: 'Posting...' })
          : isWW
            ? t('community.whisperingWell.send', { defaultValue: 'Send whisper' })
            : t('community.send', { defaultValue: 'Post' })}
      </Button>
    </div>
  );
}

// ==================================================================
// Post detail + comments
// ==================================================================

interface PostDetailProps {
  post: CommunityPost;
  onBack: () => void;
  onReact: (post: CommunityPost, r: ReactionType) => void;
  onReport: (post: CommunityPost, reason: ReportReason) => void;
  onBlock: (post: CommunityPost) => void;
}

function PostDetail({ post, onBack, onReact, onReport, onBlock }: PostDetailProps) {
  const { t } = useT('app');
  const { user } = useAuth();
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isAnonComment, setIsAnonComment] = useState(post.isAnonymous);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await community.fetchComments(post.id);
    if (res.ok) setComments(res.data);
    setLoading(false);
  }, [post.id]);

  useEffect(() => { load(); }, [load]);

  const submitComment = async () => {
    if (!user || !newComment.trim()) return;
    const check = community.screenContent(newComment);
    if (!check.ok) {
      toast(t('community.contentDisallowed', { defaultValue: 'That phrase is not allowed' }), 'error');
      return;
    }
    setSubmitting(true);
    const res = await community.createComment({
      postId: post.id,
      userId: user.id,
      content: newComment,
      isAnonymous: isAnonComment,
    });
    setSubmitting(false);
    if (res.ok) {
      setComments((prev) => [...prev, res.data]);
      setNewComment('');
    } else {
      toast(t('community.commentFailed', { defaultValue: 'Could not post comment' }), 'error');
    }
  };

  return (
    <div className="space-y-4 pb-6">
      <button onClick={onBack} className="flex items-center gap-2 text-mystic-400 hover:text-mystic-200">
        <ArrowLeft className="w-4 h-4" />
        {t('community.backToFeed', { defaultValue: 'Back to feed' })}
      </button>

      <PostCard
        post={post}
        isWhisperingWell={post.topic === 'whispering-well'}
        isOwn={post.userId === user?.id}
        onReact={onReact}
        onReport={onReport}
        onBlock={onBlock}
        onOpenComments={() => {}}
        t={t}
      />

      <h3 className="font-medium text-mystic-200 pt-2">
        {t('community.commentsHeading', { defaultValue: 'Comments' })} ({comments.length})
      </h3>

      {loading && <p className="text-mystic-500 text-sm">{t('common.loading', { defaultValue: 'Loading…' })}</p>}

      {!loading && comments.length === 0 && (
        <p className="text-mystic-500 text-sm italic">
          {t('community.noComments', { defaultValue: 'No comments yet. Be the first to respond.' })}
        </p>
      )}

      <div className="space-y-3">
        {comments.map((c) => (
          <Card key={c.id} padding="md" className="bg-mystic-800/20">
            <div className="flex items-center gap-2 text-xs text-mystic-500 mb-2">
              <span className={c.isAnonymous ? 'italic' : 'text-mystic-300'}>
                {c.isAnonymous
                  ? t('community.anonymous', { defaultValue: 'Anonymous seeker' })
                  : c.authorDisplayName || 'User'}
              </span>
              <span>·</span>
              <span>{formatRelativeTime(c.createdAt)}</span>
            </div>
            <p className="text-mystic-200 text-sm whitespace-pre-wrap">{c.content}</p>
          </Card>
        ))}
      </div>

      {user && (
        <Card padding="md">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
            maxLength={1000}
            className="w-full bg-mystic-800/50 border border-mystic-700/50 rounded-xl p-3 text-mystic-100 text-sm placeholder-mystic-600 resize-none focus:outline-none focus:border-gold/40"
            placeholder={t('community.commentPlaceholder', { defaultValue: 'Write a response...' }) as string}
          />
          <div className="flex items-center justify-between mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isAnonComment}
                onChange={(e) => setIsAnonComment(e.target.checked)}
                className="rounded"
              />
              <span className="text-xs text-mystic-400">
                {t('community.commentAnonymously', { defaultValue: 'Comment anonymously' })}
              </span>
            </label>
            <Button variant="primary" onClick={submitComment} disabled={submitting || !newComment.trim()} className="text-sm">
              {t('community.send', { defaultValue: 'Post' })}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

// ==================================================================
// Report dialog
// ==================================================================

function ReportDialog({ onClose, onSubmit, t }: { onClose: () => void; onSubmit: (r: ReportReason) => void; t: (key: string, opts?: Record<string, unknown>) => string }) {
  const reasons: ReportReason[] = ['spam', 'harassment', 'self-harm', 'explicit', 'misinformation', 'other'];
  return (
    <div className="fixed inset-0 bg-mystic-950/80 z-50 flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <Card padding="lg" className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-medium text-mystic-200 mb-3">
          {t('community.reportPostTitle', { defaultValue: 'Report post' })}
        </h3>
        <div className="space-y-1">
          {reasons.map((r) => (
            <button
              key={r}
              onClick={() => onSubmit(r)}
              className="w-full text-left px-3 py-2 text-sm text-mystic-300 hover:bg-mystic-800 rounded-lg"
            >
              {t(`community.reportReasons.${r}`, { defaultValue: r })}
            </button>
          ))}
        </div>
        <Button variant="outline" fullWidth onClick={onClose} className="mt-3">
          {t('common.cancel', { defaultValue: 'Cancel' })}
        </Button>
      </Card>
    </div>
  );
}

export default CommunityPage;
