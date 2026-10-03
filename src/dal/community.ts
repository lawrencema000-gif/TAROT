// Community DAL — posts, comments, reactions, reports, blocks.
// Follows the established Result<T> pattern from other DALs.

import { supabase } from '../lib/supabase';
import { captureException } from '../utils/telemetry';
import type { Result } from './dailyRituals';

/** Zodiac sign zones — each sign gets its own room in the feed. */
export const SIGN_ZONES = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
] as const;
export type SignZone = (typeof SIGN_ZONES)[number];

export type CommunityTopic =
  | 'general' | 'tarot' | 'astrology' | 'moon'
  | 'love' | 'shadow' | 'career' | 'wellness' | 'whispering-well'
  | SignZone;

export function isSignZone(topic: string): topic is SignZone {
  return (SIGN_ZONES as readonly string[]).includes(topic);
}

export type ReactionType = 'heart' | 'sparkle' | 'moon' | 'eye' | 'flame';

export type ReportReason =
  | 'spam' | 'harassment' | 'self-harm' | 'explicit' | 'misinformation' | 'other';

// ------------------------------------------------------------------
// Row shapes
// ------------------------------------------------------------------

export interface CommunityPost {
  id: string;
  /**
   * The author's id — null on an anonymous row the viewer did not write.
   * The read views never reveal who wrote an anonymous post (20261003000014).
   */
  userId: string | null;
  /** True when the viewer wrote it (anonymous or not). */
  isMine: boolean;
  topic: CommunityTopic;
  content: string;
  isAnonymous: boolean;
  reactionCount: number;
  commentCount: number;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
  /** The author's display name — only on named (non-anonymous) rows */
  authorDisplayName?: string;
  authorAvatarSeed?: string;
  /** The viewer's own reaction on this post (if any) — added by fetchFeed */
  myReaction?: ReactionType | null;
}

export interface CommunityComment {
  id: string;
  postId: string;
  /** Null on an anonymous comment the viewer did not write. */
  userId: string | null;
  isMine: boolean;
  parentId: string | null;
  content: string;
  isAnonymous: boolean;
  isHidden: boolean;
  createdAt: string;
  authorDisplayName?: string;
  authorAvatarSeed?: string;
}

// ------------------------------------------------------------------
// Row mapping
// ------------------------------------------------------------------

// Rows come from the community_feed_posts / community_feed_comments views
// (migration 20261003000014): author_id is null on anonymous rows, and the
// author's name rides along only on named rows.
function mapPost(row: Record<string, unknown>): CommunityPost {
  return {
    id: row.id as string,
    userId: (row.author_id as string | null) ?? null,
    isMine: row.is_mine === true,
    topic: row.topic as CommunityTopic,
    content: row.content as string,
    isAnonymous: (row.is_anonymous as boolean) ?? false,
    reactionCount: (row.reaction_count as number) ?? 0,
    commentCount: (row.comment_count as number) ?? 0,
    isHidden: (row.is_hidden as boolean) ?? false,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    authorDisplayName: row.is_anonymous ? undefined : ((row.author_display_name as string | null) ?? undefined),
    authorAvatarSeed: row.is_anonymous ? undefined : ((row.author_avatar_seed as string | null) ?? undefined),
  };
}

function mapComment(row: Record<string, unknown>): CommunityComment {
  return {
    id: row.id as string,
    postId: row.post_id as string,
    userId: (row.author_id as string | null) ?? null,
    isMine: row.is_mine === true,
    parentId: (row.parent_id as string) ?? null,
    content: row.content as string,
    isAnonymous: (row.is_anonymous as boolean) ?? false,
    isHidden: (row.is_hidden as boolean) ?? false,
    createdAt: row.created_at as string,
    authorDisplayName: row.is_anonymous ? undefined : ((row.author_display_name as string | null) ?? undefined),
    authorAvatarSeed: row.is_anonymous ? undefined : ((row.author_avatar_seed as string | null) ?? undefined),
  };
}

const POST_COLUMNS = `
  id, topic, content, is_anonymous,
  reaction_count, comment_count, is_hidden,
  created_at, updated_at,
  author_id, is_mine, author_display_name, author_avatar_seed
`;

const COMMENT_COLUMNS = `
  id, post_id, parent_id, content,
  is_anonymous, is_hidden, created_at,
  author_id, is_mine, author_display_name, author_avatar_seed
`;

/**
 * Deploy-order safety: until migration 20261003000014 is pushed the views do
 * not exist (PGRST205) and members can still read user_id, so the feed falls
 * back to the base tables and builds the same row shape client-side — never
 * naming an anonymous author. Once the migration is in, this path is dead
 * (the base user_id is no longer readable), and the view is the only read.
 */
function isMissingView(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === 'PGRST205' || /schema cache|does not exist/i.test(error.message ?? '');
}

function legacyToViewRow(row: Record<string, unknown>, me: string | null | undefined): Record<string, unknown> {
  const uid = row.user_id as string;
  const mine = !!me && uid === me;
  const profile = row.profiles as { display_name?: string; avatar_seed?: string } | null;
  const anon = row.is_anonymous === true;
  return {
    ...row,
    author_id: anon && !mine ? null : uid,
    is_mine: mine,
    author_display_name: anon ? null : profile?.display_name ?? null,
    author_avatar_seed: anon ? null : profile?.avatar_seed ?? null,
  };
}

// ------------------------------------------------------------------
// Feed fetching
//
// Reads go through the community_feed_posts / community_feed_comments
// views (migration 20261003000014). Profiles RLS is own-row only, so the
// old profiles embed signed every other member "User"; and members can no
// longer read user_id from the base tables, because next to a name it
// would let anyone attribute an anonymous post. The views carry the
// author's name on named rows, nothing on anonymous ones, and leave out
// authors the viewer has blocked.
// ------------------------------------------------------------------

export interface FetchFeedOpts {
  topic?: CommunityTopic | 'all';
  limit?: number;
  before?: string;
  currentUserId?: string | null;
}

export async function fetchFeed(opts: FetchFeedOpts = {}): Promise<Result<CommunityPost[]>> {
  const limit = opts.limit ?? 20;

  let query = supabase
    .from('community_feed_posts')
    .select(POST_COLUMNS)
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (opts.topic && opts.topic !== 'all') {
    query = query.eq('topic', opts.topic);
  }
  if (opts.before) {
    query = query.lt('created_at', opts.before);
  }

  let { data, error } = await query;
  if (isMissingView(error)) {
    let legacy = supabase
      .from('community_posts')
      .select(`
        id, user_id, topic, content, is_anonymous,
        reaction_count, comment_count, is_hidden,
        created_at, updated_at,
        profiles!community_posts_user_id_profiles_fkey (display_name, avatar_seed)
      `)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (opts.topic && opts.topic !== 'all') legacy = legacy.eq('topic', opts.topic);
    if (opts.before) legacy = legacy.lt('created_at', opts.before);
    const res = await legacy;
    error = res.error;
    data = (res.data ?? []).map((r) => legacyToViewRow(r as Record<string, unknown>, opts.currentUserId)) as typeof data;
  }
  if (error) {
    captureException('dal.community.fetchFeed', error, { topic: opts.topic });
    return { ok: false, error: error.message };
  }

  const posts = (data ?? []).map((r) => mapPost(r as Record<string, unknown>));

  // Fetch viewer's reactions on visible posts (if authenticated)
  if (opts.currentUserId && posts.length > 0) {
    const postIds = posts.map((p) => p.id);
    const { data: reactions } = await supabase
      .from('community_reactions')
      .select('post_id, reaction')
      .in('post_id', postIds)
      .eq('user_id', opts.currentUserId);

    const byPost = new Map<string, ReactionType>();
    for (const r of reactions ?? []) {
      byPost.set(r.post_id as string, r.reaction as ReactionType);
    }
    for (const p of posts) {
      p.myReaction = byPost.get(p.id) ?? null;
    }
  }

  return { ok: true, data: posts };
}

// ------------------------------------------------------------------
// Create / delete posts
// ------------------------------------------------------------------

export interface CreatePostInput {
  userId: string;
  topic: CommunityTopic;
  content: string;
  isAnonymous?: boolean;
}

export async function createPost(input: CreatePostInput): Promise<Result<CommunityPost>> {
  const trimmed = input.content.trim();
  if (trimmed.length < 1 || trimmed.length > 2000) {
    return { ok: false, error: 'Content must be 1-2000 characters.' };
  }
  const { data: inserted, error: insErr } = await supabase
    .from('community_posts')
    .insert({
      user_id: input.userId,
      topic: input.topic,
      content: trimmed,
      is_anonymous: input.isAnonymous ?? false,
    })
    .select('id')
    .single();

  if (insErr || !inserted) {
    if (insErr) captureException('dal.community.createPost', insErr, { topic: input.topic });
    return { ok: false, error: insErr?.message ?? 'Insert returned no row' };
  }
  // Read it back through the view (base user_id is not member-readable).
  const { data, error } = await supabase
    .from('community_feed_posts')
    .select(POST_COLUMNS)
    .eq('id', (inserted as { id: string }).id)
    .single();
  if (error) {
    captureException('dal.community.createPost.reselect', error, { topic: input.topic });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: mapPost(data as Record<string, unknown>) };
}

export async function deletePost(postId: string): Promise<Result<void>> {
  const { error } = await supabase.from('community_posts').delete().eq('id', postId);
  if (error) {
    captureException('dal.community.deletePost', error, { postId });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: undefined };
}

// ------------------------------------------------------------------
// Comments
// ------------------------------------------------------------------

export async function fetchComments(postId: string, currentUserId?: string | null): Promise<Result<CommunityComment[]>> {
  let { data, error } = await supabase
    .from('community_feed_comments')
    .select(COMMENT_COLUMNS)
    .eq('post_id', postId)
    .eq('is_hidden', false)
    .order('created_at', { ascending: true });

  if (isMissingView(error)) {
    const res = await supabase
      .from('community_comments')
      .select(`
        id, post_id, user_id, parent_id, content,
        is_anonymous, is_hidden, created_at,
        profiles!community_comments_user_id_profiles_fkey (display_name, avatar_seed)
      `)
      .eq('post_id', postId)
      .eq('is_hidden', false)
      .order('created_at', { ascending: true });
    error = res.error;
    data = (res.data ?? []).map((r) => legacyToViewRow(r as Record<string, unknown>, currentUserId)) as typeof data;
  }

  if (error) {
    captureException('dal.community.fetchComments', error, { postId });
    return { ok: false, error: error.message };
  }
  return {
    ok: true,
    data: (data ?? []).map((r) => mapComment(r as Record<string, unknown>)),
  };
}

export interface CreateCommentInput {
  postId: string;
  userId: string;
  content: string;
  parentId?: string;
  isAnonymous?: boolean;
}

export async function createComment(input: CreateCommentInput): Promise<Result<CommunityComment>> {
  const trimmed = input.content.trim();
  if (trimmed.length < 1 || trimmed.length > 1000) {
    return { ok: false, error: 'Comment must be 1-1000 characters.' };
  }
  const { data: inserted, error: insErr } = await supabase
    .from('community_comments')
    .insert({
      post_id: input.postId,
      user_id: input.userId,
      parent_id: input.parentId ?? null,
      content: trimmed,
      is_anonymous: input.isAnonymous ?? false,
    })
    .select('id')
    .single();

  if (insErr || !inserted) {
    if (insErr) captureException('dal.community.createComment', insErr, { postId: input.postId });
    return { ok: false, error: insErr?.message ?? 'Insert returned no row' };
  }
  const { data, error } = await supabase
    .from('community_feed_comments')
    .select(COMMENT_COLUMNS)
    .eq('id', (inserted as { id: string }).id)
    .single();
  if (error) {
    captureException('dal.community.createComment.reselect', error, { postId: input.postId });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: mapComment(data as Record<string, unknown>) };
}

export async function deleteComment(commentId: string): Promise<Result<void>> {
  const { error } = await supabase.from('community_comments').delete().eq('id', commentId);
  if (error) {
    captureException('dal.community.deleteComment', error, { commentId });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: undefined };
}

// ------------------------------------------------------------------
// Reactions
// ------------------------------------------------------------------

export async function addReaction(
  postId: string,
  userId: string,
  reaction: ReactionType,
): Promise<Result<void>> {
  // Upsert — one reaction per (post, user). Delete-and-insert pattern to
  // preserve trigger semantics even when the reaction type changes.
  const { error: delErr } = await supabase
    .from('community_reactions')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId);
  if (delErr) {
    captureException('dal.community.addReaction.delete', delErr, { postId });
    return { ok: false, error: delErr.message };
  }
  const { error } = await supabase
    .from('community_reactions')
    .insert({ post_id: postId, user_id: userId, reaction });
  if (error) {
    captureException('dal.community.addReaction.insert', error, { postId });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: undefined };
}

export async function removeReaction(
  postId: string,
  userId: string,
): Promise<Result<void>> {
  const { error } = await supabase
    .from('community_reactions')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId);
  if (error) {
    captureException('dal.community.removeReaction', error, { postId });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: undefined };
}

// ------------------------------------------------------------------
// Reports
// ------------------------------------------------------------------

export interface ReportInput {
  reporterId: string;
  postId?: string;
  commentId?: string;
  reason: ReportReason;
  details?: string;
}

export async function report(input: ReportInput): Promise<Result<void>> {
  if (!input.postId && !input.commentId) {
    return { ok: false, error: 'Must report a post or a comment.' };
  }
  const { error } = await supabase.from('community_reports').insert({
    reporter_id: input.reporterId,
    post_id: input.postId ?? null,
    comment_id: input.commentId ?? null,
    reason: input.reason,
    details: input.details ?? null,
  });
  if (error) {
    captureException('dal.community.report', error, { reason: input.reason });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: undefined };
}

// ------------------------------------------------------------------
// Blocks
// ------------------------------------------------------------------

export async function blockUser(blockerId: string, blockedId: string): Promise<Result<void>> {
  const { error } = await supabase
    .from('community_blocks')
    .insert({ blocker_id: blockerId, blocked_id: blockedId });
  if (error) {
    captureException('dal.community.blockUser', error);
    return { ok: false, error: error.message };
  }
  return { ok: true, data: undefined };
}

/**
 * Block whoever wrote a post or comment, without the client ever learning
 * who that is (an anonymous author's id is not readable). Their posts and
 * comments then drop out of the viewer's feed server-side. Resolves false
 * when there was nobody to block (own row, or a row not visible).
 */
export async function blockAuthor(
  target: { postId: string } | { commentId: string },
  /** Pre-migration only: the direct insert the RPC replaces (needs a known author id). */
  fallback?: { blockerId: string; blockedId: string | null },
): Promise<Result<boolean>> {
  const { data, error } = await supabase.rpc('community_block_author', {
    p_post_id: 'postId' in target ? target.postId : null,
    p_comment_id: 'commentId' in target ? target.commentId : null,
  });
  if (error && (error.code === 'PGRST202' || /could not find the function/i.test(error.message)) && fallback?.blockedId) {
    const res = await blockUser(fallback.blockerId, fallback.blockedId);
    return res.ok ? { ok: true, data: true } : res;
  }
  if (error) {
    captureException('dal.community.blockAuthor', error);
    return { ok: false, error: error.message };
  }
  return { ok: true, data: data === true };
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<Result<void>> {
  const { error } = await supabase
    .from('community_blocks')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId);
  if (error) {
    captureException('dal.community.unblockUser', error);
    return { ok: false, error: error.message };
  }
  return { ok: true, data: undefined };
}

export async function fetchBlockedIds(blockerId: string): Promise<Result<string[]>> {
  const { data, error } = await supabase
    .from('community_blocks')
    .select('blocked_id')
    .eq('blocker_id', blockerId);
  if (error) {
    captureException('dal.community.fetchBlockedIds', error);
    return { ok: false, error: error.message };
  }
  return { ok: true, data: (data ?? []).map((r) => r.blocked_id as string) };
}

// ------------------------------------------------------------------
// Client-side content screen (belt + braces; Supabase CHECK is authoritative)
// ------------------------------------------------------------------

const SHOCK_WORDS: RegExp[] = [
  // Basic profanity list — kept lightweight; primary moderation is via
  // reports + server-side future integration with OpenAI Moderation.
  /\b(kill\s*(your|ur)self)\b/i,
  /\b(kys)\b/i,
];

export interface ContentCheck {
  ok: boolean;
  reason?: string;
}

export function screenContent(text: string): ContentCheck {
  if (!text || text.trim().length === 0) return { ok: false, reason: 'empty' };
  if (text.length > 2000) return { ok: false, reason: 'too_long' };
  for (const re of SHOCK_WORDS) {
    if (re.test(text)) return { ok: false, reason: 'disallowed' };
  }
  return { ok: true };
}
