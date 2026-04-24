// Community DAL — posts, comments, reactions, reports, blocks.
// Follows the established Result<T> pattern from other DALs.

import { supabase } from '../lib/supabase';
import { captureException } from '../utils/telemetry';
import type { Result } from './dailyRituals';

export type CommunityTopic =
  | 'general' | 'tarot' | 'astrology' | 'moon'
  | 'love' | 'shadow' | 'career' | 'wellness' | 'whispering-well';

export type ReactionType = 'heart' | 'sparkle' | 'moon' | 'eye' | 'flame';

export type ReportReason =
  | 'spam' | 'harassment' | 'self-harm' | 'explicit' | 'misinformation' | 'other';

// ------------------------------------------------------------------
// Row shapes
// ------------------------------------------------------------------

export interface CommunityPost {
  id: string;
  userId: string;
  topic: CommunityTopic;
  content: string;
  isAnonymous: boolean;
  reactionCount: number;
  commentCount: number;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
  /** Joined from profile — only for non-anonymous posts */
  authorDisplayName?: string;
  authorAvatarSeed?: string;
  /** The viewer's own reaction on this post (if any) — added by fetchFeed */
  myReaction?: ReactionType | null;
}

export interface CommunityComment {
  id: string;
  postId: string;
  userId: string;
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

function mapPost(row: Record<string, unknown>): CommunityPost {
  const profile = row.profiles as { display_name?: string; avatar_seed?: string } | null;
  return {
    id: row.id as string,
    userId: row.user_id as string,
    topic: row.topic as CommunityTopic,
    content: row.content as string,
    isAnonymous: (row.is_anonymous as boolean) ?? false,
    reactionCount: (row.reaction_count as number) ?? 0,
    commentCount: (row.comment_count as number) ?? 0,
    isHidden: (row.is_hidden as boolean) ?? false,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    authorDisplayName: row.is_anonymous ? undefined : profile?.display_name,
    authorAvatarSeed: row.is_anonymous ? undefined : profile?.avatar_seed,
  };
}

function mapComment(row: Record<string, unknown>): CommunityComment {
  const profile = row.profiles as { display_name?: string; avatar_seed?: string } | null;
  return {
    id: row.id as string,
    postId: row.post_id as string,
    userId: row.user_id as string,
    parentId: (row.parent_id as string) ?? null,
    content: row.content as string,
    isAnonymous: (row.is_anonymous as boolean) ?? false,
    isHidden: (row.is_hidden as boolean) ?? false,
    createdAt: row.created_at as string,
    authorDisplayName: row.is_anonymous ? undefined : profile?.display_name,
    authorAvatarSeed: row.is_anonymous ? undefined : profile?.avatar_seed,
  };
}

// ------------------------------------------------------------------
// Feed fetching
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
    .from('community_posts')
    .select(`
      id, user_id, topic, content, is_anonymous,
      reaction_count, comment_count, is_hidden,
      created_at, updated_at,
      profiles:user_id (display_name, avatar_seed)
    `)
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (opts.topic && opts.topic !== 'all') {
    query = query.eq('topic', opts.topic);
  }
  if (opts.before) {
    query = query.lt('created_at', opts.before);
  }

  const { data, error } = await query;
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
  const { data, error } = await supabase
    .from('community_posts')
    .insert({
      user_id: input.userId,
      topic: input.topic,
      content: trimmed,
      is_anonymous: input.isAnonymous ?? false,
    })
    .select(`
      id, user_id, topic, content, is_anonymous,
      reaction_count, comment_count, is_hidden,
      created_at, updated_at,
      profiles:user_id (display_name, avatar_seed)
    `)
    .single();

  if (error) {
    captureException('dal.community.createPost', error, { topic: input.topic });
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

export async function fetchComments(postId: string): Promise<Result<CommunityComment[]>> {
  const { data, error } = await supabase
    .from('community_comments')
    .select(`
      id, post_id, user_id, parent_id, content,
      is_anonymous, is_hidden, created_at,
      profiles:user_id (display_name, avatar_seed)
    `)
    .eq('post_id', postId)
    .eq('is_hidden', false)
    .order('created_at', { ascending: true });

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
  const { data, error } = await supabase
    .from('community_comments')
    .insert({
      post_id: input.postId,
      user_id: input.userId,
      parent_id: input.parentId ?? null,
      content: trimmed,
      is_anonymous: input.isAnonymous ?? false,
    })
    .select(`
      id, post_id, user_id, parent_id, content,
      is_anonymous, is_hidden, created_at,
      profiles:user_id (display_name, avatar_seed)
    `)
    .single();

  if (error) {
    captureException('dal.community.createComment', error, { postId: input.postId });
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
