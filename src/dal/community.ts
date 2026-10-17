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

/** moderation_status of a row. Other members only ever see 'allowed'. */
export type ModerationState = 'allowed' | 'flagged' | 'blocked' | 'pending';

// ------------------------------------------------------------------
// Row shapes
// ------------------------------------------------------------------

export interface CommunityPost {
  id: string;
  /**
   * The author's id — on named rows only. Null on every anonymous row, the
   * viewer's own included: nothing the client reads ever ties an anonymous
   * post to a person (20261003000014). `isMine` says which rows are yours.
   */
  userId: string | null;
  /** True when the viewer wrote it (anonymous or not). */
  isMine: boolean;
  /**
   * Whether "Block user" can work on this row. Always on someone else's row
   * once the server resolves authors itself (20261003000014); before that,
   * only on named rows, whose author id the client has.
   */
  canBlockAuthor: boolean;
  topic: CommunityTopic;
  content: string;
  isAnonymous: boolean;
  reactionCount: number;
  commentCount: number;
  isHidden: boolean;
  /** Only ever not 'allowed' on the viewer's own rows. */
  moderationStatus: ModerationState;
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
  /** On named comments only — null on every anonymous one. */
  userId: string | null;
  isMine: boolean;
  canBlockAuthor: boolean;
  parentId: string | null;
  content: string;
  isAnonymous: boolean;
  isHidden: boolean;
  moderationStatus: ModerationState;
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
function mapPost(row: Record<string, unknown>, serverResolvesAuthors: boolean): CommunityPost {
  const isMine = row.is_mine === true;
  const userId = (row.author_id as string | null) ?? null;
  return {
    id: row.id as string,
    userId,
    isMine,
    canBlockAuthor: !isMine && (serverResolvesAuthors || userId !== null),
    topic: row.topic as CommunityTopic,
    content: row.content as string,
    isAnonymous: (row.is_anonymous as boolean) ?? false,
    reactionCount: (row.reaction_count as number) ?? 0,
    commentCount: (row.comment_count as number) ?? 0,
    isHidden: (row.is_hidden as boolean) ?? false,
    moderationStatus: (row.moderation_status as ModerationState | undefined) ?? 'allowed',
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    authorDisplayName: row.is_anonymous ? undefined : ((row.author_display_name as string | null) ?? undefined),
    authorAvatarSeed: row.is_anonymous ? undefined : ((row.author_avatar_seed as string | null) ?? undefined),
  };
}

function mapComment(row: Record<string, unknown>, serverResolvesAuthors: boolean): CommunityComment {
  const isMine = row.is_mine === true;
  const userId = (row.author_id as string | null) ?? null;
  return {
    id: row.id as string,
    postId: row.post_id as string,
    userId,
    isMine,
    canBlockAuthor: !isMine && (serverResolvesAuthors || userId !== null),
    parentId: (row.parent_id as string) ?? null,
    content: row.content as string,
    isAnonymous: (row.is_anonymous as boolean) ?? false,
    isHidden: (row.is_hidden as boolean) ?? false,
    moderationStatus: (row.moderation_status as ModerationState | undefined) ?? 'allowed',
    createdAt: row.created_at as string,
    authorDisplayName: row.is_anonymous ? undefined : ((row.author_display_name as string | null) ?? undefined),
    authorAvatarSeed: row.is_anonymous ? undefined : ((row.author_avatar_seed as string | null) ?? undefined),
  };
}

const POST_COLUMNS = `
  id, topic, content, is_anonymous,
  reaction_count, comment_count, is_hidden, moderation_status,
  created_at, updated_at,
  author_id, is_mine, author_display_name, author_avatar_seed
`;

const COMMENT_COLUMNS = `
  id, post_id, parent_id, content,
  is_anonymous, is_hidden, moderation_status, created_at,
  author_id, is_mine, author_display_name, author_avatar_seed
`;

// Before 20261003000014 (and for a client that saw the database before it):
// the base tables, with the author id the old policies still return.
const LEGACY_POST_COLUMNS = `
  id, user_id, topic, content, is_anonymous,
  reaction_count, comment_count, is_hidden, moderation_status,
  created_at, updated_at,
  profiles!community_posts_user_id_profiles_fkey (display_name, avatar_seed)
`;

const LEGACY_COMMENT_COLUMNS = `
  id, post_id, user_id, parent_id, content,
  is_anonymous, is_hidden, moderation_status, created_at,
  profiles!community_comments_user_id_profiles_fkey (display_name, avatar_seed)
`;

// ------------------------------------------------------------------
// Deploy-order safety
//
// The web deploy and `db push` of 20261003000014 land minutes apart, and a
// client can outlive either. Until the migration is in, the feed views
// (PGRST205) and community_block_author (PGRST202) do not exist: the feed
// reads the base tables, builds the same row shape — never naming an
// anonymous author — and leaves out blocked authors itself, as the views
// would. Once the migration is in, the base tables return named rows and the
// viewer's own only, so this path is degraded, never wrong.
//
// What the session learned is remembered: one probe, not one 404 per load.
// A "missing" answer is asked again after REPROBE_MS, so a long-lived
// session (an app left open across the push) picks the views up by itself.
// ------------------------------------------------------------------

type ServerState = 'unknown' | 'present' | 'absent';
let feedViews: ServerState = 'unknown';
let feedViewsCheckedAt = 0;
const REPROBE_MS = 10 * 60_000;

interface PgError { code?: string; message?: string }

function isMissingView(error: PgError | null | undefined): boolean {
  if (!error) return false;
  return error.code === 'PGRST205' || error.code === '42P01'
    || /could not find the table|relation .* does not exist/i.test(error.message ?? '');
}

function isMissingFunction(error: PgError | null | undefined): boolean {
  if (!error) return false;
  return error.code === 'PGRST202' || error.code === '42883'
    || /could not find the function/i.test(error.message ?? '');
}

function viewsWorthTrying(): boolean {
  return feedViews !== 'absent' || Date.now() - feedViewsCheckedAt > REPROBE_MS;
}

function noteServer(present: boolean): void {
  feedViews = present ? 'present' : 'absent';
  feedViewsCheckedAt = Date.now();
}

// The probe in flight. Loads that start while it runs (the page mounts the
// feed twice under StrictMode, a topic tap can overlap a refresh) wait for
// its answer instead of each sending their own request to a missing view.
let probing: Promise<void> | null = null;

/**
 * Run a read against a feed view, as the session's probe when the answer is
 * not known yet. Resolves the view's result, or null when the views are not
 * there (then read the base tables).
 */
async function tryViews<R extends { error: PgError | null }>(viewQuery: () => PromiseLike<R>): Promise<R | null> {
  if (feedViews === 'present') {
    const r = await viewQuery();
    if (!isMissingView(r.error)) return r;
    noteServer(false);
    return null;
  }
  if (!viewsWorthTrying()) return null;
  if (probing) {
    await probing;
    return tryViews(viewQuery);
  }
  let settle!: () => void;
  probing = new Promise<void>((resolve) => { settle = resolve; });
  try {
    const r = await viewQuery();
    if (isMissingView(r.error)) {
      noteServer(false);
      return null;
    }
    if (!r.error) noteServer(true);
    return r;
  } finally {
    probing = null;
    settle();
  }
}

/**
 * Whether the server resolves authors itself (views + community_block_author).
 * False only once this session has seen them missing; the UI hides "Block
 * user" on anonymous rows then, because the old direct insert needs an
 * author id the client is never given for them.
 */
export function serverResolvesAuthors(): boolean {
  return feedViews !== 'absent';
}

/** Test seam: forget what this session learned about the server. */
export function __resetCommunityServerProbe(): void {
  feedViews = 'unknown';
  feedViewsCheckedAt = 0;
  probing = null;
}

function legacyToViewRow(row: Record<string, unknown>, me: string | null | undefined): Record<string, unknown> {
  const uid = row.user_id as string;
  const mine = !!me && uid === me;
  const profile = row.profiles as { display_name?: string; avatar_seed?: string } | null;
  const anon = row.is_anonymous === true;
  const out: Record<string, unknown> = {
    ...row,
    author_id: anon ? null : uid,
    is_mine: mine,
    author_display_name: anon ? null : profile?.display_name ?? null,
    author_avatar_seed: anon ? null : profile?.avatar_seed ?? null,
  };
  // Nothing downstream should hold the raw id of an anonymous row.
  delete out.user_id;
  delete out.profiles;
  return out;
}

/**
 * The legacy rows minus the ones the views would leave out: a block made
 * from a named row hides that member's named rows (20261003000014 keeps
 * named and anonymous blocks apart, so neither can reveal the other).
 */
function withoutBlockedNamedRows(rows: Record<string, unknown>[], blocked: Set<string>): Record<string, unknown>[] {
  if (blocked.size === 0) return rows;
  return rows.filter((r) => r.is_anonymous === true || !blocked.has(r.user_id as string));
}

async function blockedIdsFor(userId: string | null | undefined): Promise<Result<Set<string>>> {
  if (!userId) return { ok: true, data: new Set() };
  const res = await fetchBlockedIds(userId);
  return res.ok ? { ok: true, data: new Set(res.data) } : res;
}

// ------------------------------------------------------------------
// Feed fetching
//
// Reads go through the community_feed_posts / community_feed_comments
// views (migration 20261003000014). Profiles RLS is own-row only, so the
// old profiles embed signed every other member "User"; the views carry the
// author's name on named rows, nothing on anonymous ones, and leave out
// authors the viewer has blocked.
// ------------------------------------------------------------------

export interface FetchFeedOpts {
  topic?: CommunityTopic | 'all';
  limit?: number;
  before?: string;
  currentUserId?: string | null;
}

async function fetchFeedRows(opts: FetchFeedOpts, limit: number): Promise<{ rows: Record<string, unknown>[]; viaViews: boolean; error: PgError | null }> {
  const viewed = await tryViews(() => {
    let query = supabase
      .from('community_feed_posts')
      .select(POST_COLUMNS)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (opts.topic && opts.topic !== 'all') query = query.eq('topic', opts.topic);
    if (opts.before) query = query.lt('created_at', opts.before);
    return query;
  });
  if (viewed) {
    return { rows: (viewed.data ?? []) as Record<string, unknown>[], viaViews: true, error: viewed.error };
  }

  let legacy = supabase
    .from('community_posts')
    .select(LEGACY_POST_COLUMNS)
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (opts.topic && opts.topic !== 'all') legacy = legacy.eq('topic', opts.topic);
  if (opts.before) legacy = legacy.lt('created_at', opts.before);
  const [res, blocked] = await Promise.all([legacy, blockedIdsFor(opts.currentUserId)]);
  if (res.error) return { rows: [], viaViews: false, error: res.error };
  if (!blocked.ok) return { rows: [], viaViews: false, error: { message: blocked.error } };
  const rows = withoutBlockedNamedRows((res.data ?? []) as Record<string, unknown>[], blocked.data)
    .map((r) => legacyToViewRow(r, opts.currentUserId));
  return { rows, viaViews: false, error: null };
}

export async function fetchFeed(opts: FetchFeedOpts = {}): Promise<Result<CommunityPost[]>> {
  const limit = opts.limit ?? 20;

  const { rows, viaViews, error } = await fetchFeedRows(opts, limit);
  if (error) {
    captureException('dal.community.fetchFeed', error, { topic: opts.topic });
    return { ok: false, error: error.message ?? 'Could not load the feed' };
  }

  const posts = rows.map((r) => mapPost(r, viaViews));

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
  const read = await readBackOwnRow('post', (inserted as { id: string }).id, input.userId);
  if (!read.ok) {
    captureException('dal.community.createPost.reselect', read.error, { topic: input.topic });
    return { ok: false, error: read.error };
  }
  return { ok: true, data: mapPost(read.data.row, read.data.viaViews) };
}

/** Read a row the caller just wrote, through whichever read path the server has. */
async function readBackOwnRow(
  kind: 'post' | 'comment',
  id: string,
  me: string,
): Promise<Result<{ row: Record<string, unknown>; viaViews: boolean }>> {
  // Plain strings: a union of two select literals is more than the typed
  // select parser can represent (TS2590).
  const view: string = kind === 'post' ? 'community_feed_posts' : 'community_feed_comments';
  const viewColumns: string = kind === 'post' ? POST_COLUMNS : COMMENT_COLUMNS;
  const table: string = kind === 'post' ? 'community_posts' : 'community_comments';
  const tableColumns: string = kind === 'post' ? LEGACY_POST_COLUMNS : LEGACY_COMMENT_COLUMNS;
  const viewed = await tryViews(() => supabase.from(view).select(viewColumns).eq('id', id).single());
  if (viewed) {
    if (viewed.error) return { ok: false, error: viewed.error.message };
    return { ok: true, data: { row: viewed.data as unknown as Record<string, unknown>, viaViews: true } };
  }
  const { data, error } = await supabase
    .from(table)
    .select(tableColumns)
    .eq('id', id)
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { row: legacyToViewRow(data as unknown as Record<string, unknown>, me), viaViews: false } };
}

/**
 * Delete one of your own rows. RLS turns a delete of anyone else's row into
 * a silent no-op, so the deleted id is read back: "ok" means it is gone.
 */
async function deleteOwn(table: 'community_posts' | 'community_comments', id: string, where: string): Promise<Result<void>> {
  const { data, error } = await supabase.from(table).delete().eq('id', id).select('id');
  if (error) {
    captureException(where, error, { id });
    return { ok: false, error: error.message };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: 'Nothing was deleted' };
  }
  return { ok: true, data: undefined };
}

export async function deletePost(postId: string): Promise<Result<void>> {
  return deleteOwn('community_posts', postId, 'dal.community.deletePost');
}

// ------------------------------------------------------------------
// Comments
// ------------------------------------------------------------------

async function fetchCommentRows(postId: string, me: string | null | undefined): Promise<{ rows: Record<string, unknown>[]; viaViews: boolean; error: PgError | null }> {
  const viewed = await tryViews(() => supabase
    .from('community_feed_comments')
    .select(COMMENT_COLUMNS)
    .eq('post_id', postId)
    .eq('is_hidden', false)
    .order('created_at', { ascending: true }));
  if (viewed) {
    return { rows: (viewed.data ?? []) as Record<string, unknown>[], viaViews: true, error: viewed.error };
  }

  const [res, blocked] = await Promise.all([
    supabase
      .from('community_comments')
      .select(LEGACY_COMMENT_COLUMNS)
      .eq('post_id', postId)
      .eq('is_hidden', false)
      .order('created_at', { ascending: true }),
    blockedIdsFor(me),
  ]);
  if (res.error) return { rows: [], viaViews: false, error: res.error };
  if (!blocked.ok) return { rows: [], viaViews: false, error: { message: blocked.error } };
  const rows = withoutBlockedNamedRows((res.data ?? []) as Record<string, unknown>[], blocked.data)
    .map((r) => legacyToViewRow(r, me));
  return { rows, viaViews: false, error: null };
}

export async function fetchComments(postId: string, currentUserId?: string | null): Promise<Result<CommunityComment[]>> {
  const { rows, viaViews, error } = await fetchCommentRows(postId, currentUserId);
  if (error) {
    captureException('dal.community.fetchComments', error, { postId });
    return { ok: false, error: error.message ?? 'Could not load the comments' };
  }
  return { ok: true, data: rows.map((r) => mapComment(r, viaViews)) };
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
  const read = await readBackOwnRow('comment', (inserted as { id: string }).id, input.userId);
  if (!read.ok) {
    captureException('dal.community.createComment.reselect', read.error, { postId: input.postId });
    return { ok: false, error: read.error };
  }
  return { ok: true, data: mapComment(read.data.row, read.data.viaViews) };
}

export async function deleteComment(commentId: string): Promise<Result<void>> {
  return deleteOwn('community_comments', commentId, 'dal.community.deleteComment');
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
 * who that is. The server resolves the author (20261003000014): a block made
 * from a named row hides that member's named posts and comments, one made
 * from an anonymous row hides their anonymous ones, and the blocker is never
 * told who it was. Resolves false when there was nobody to block (own row,
 * or a row not visible).
 *
 * Before the migration the RPC is missing; the old direct insert then does
 * the job for a named row (its author id is known). An anonymous row cannot
 * be blocked then, and the UI does not offer it (`canBlockAuthor`).
 */
export async function blockAuthor(
  target: { postId: string } | { commentId: string },
  /** Pre-migration only: the direct insert the RPC replaces (needs a known author id). */
  fallback?: { blockerId: string; blockedId: string | null },
): Promise<Result<boolean>> {
  if (feedViews !== 'absent') {
    const { data, error } = await supabase.rpc('community_block_author', {
      p_post_id: 'postId' in target ? target.postId : null,
      p_comment_id: 'commentId' in target ? target.commentId : null,
    });
    if (!error) {
      noteServer(true);
      return { ok: true, data: data === true };
    }
    if (!isMissingFunction(error)) {
      captureException('dal.community.blockAuthor', error);
      return { ok: false, error: error.message };
    }
    // The RPC and the feed views ship in the same migration.
    noteServer(false);
  }
  if (!fallback?.blockedId) {
    return { ok: false, error: 'This author cannot be blocked yet' };
  }
  const res = await blockUser(fallback.blockerId, fallback.blockedId);
  if (!res.ok && /duplicate key|23505/i.test(res.error)) return { ok: true, data: true };
  return res.ok ? { ok: true, data: true } : res;
}

export interface CommunityBlock {
  /** The block row's id — what `unblock` takes. */
  blockId: string;
  /** 'named': made from a named row. 'anonymous': made from an anonymous row — it never says who. */
  kind: 'named' | 'anonymous';
  /** Named blocks only. */
  blockedId: string | null;
  /** Named blocks only, and only for a member who has visible named posts or comments. */
  blockedDisplayName: string | null;
  createdAt: string;
}

/** The viewer's blocks, newest first. */
export async function listMyBlocks(blockerId: string): Promise<Result<CommunityBlock[]>> {
  if (feedViews !== 'absent') {
    const { data, error } = await supabase.rpc('community_my_blocks');
    if (!error) {
      noteServer(true);
      return {
        ok: true,
        data: ((data ?? []) as Record<string, unknown>[]).map((r) => ({
          blockId: r.block_id as string,
          kind: r.kind === 'anonymous' ? 'anonymous' : 'named',
          blockedId: (r.blocked_id as string | null) ?? null,
          blockedDisplayName: (r.blocked_display_name as string | null) ?? null,
          createdAt: r.created_at as string,
        })),
      };
    }
    if (!isMissingFunction(error)) {
      captureException('dal.community.listMyBlocks', error);
      return { ok: false, error: error.message };
    }
    noteServer(false);
  }
  const { data, error } = await supabase
    .from('community_blocks')
    .select('id, blocked_id, created_at')
    .eq('blocker_id', blockerId)
    .order('created_at', { ascending: false });
  if (error) {
    captureException('dal.community.listMyBlocks.legacy', error);
    return { ok: false, error: error.message };
  }
  return {
    ok: true,
    data: (data ?? []).map((r) => ({
      blockId: r.id as string,
      kind: 'named' as const,
      blockedId: r.blocked_id as string,
      blockedDisplayName: null,
      createdAt: r.created_at as string,
    })),
  };
}

/** Undo a block by its id (either kind). Resolves false when there was no such block of yours. */
export async function unblock(blockId: string): Promise<Result<boolean>> {
  if (feedViews !== 'absent') {
    const { data, error } = await supabase.rpc('community_unblock', { p_block_id: blockId });
    if (!error) {
      noteServer(true);
      return { ok: true, data: data === true };
    }
    if (!isMissingFunction(error)) {
      captureException('dal.community.unblock', error);
      return { ok: false, error: error.message };
    }
    noteServer(false);
  }
  const { data, error } = await supabase.from('community_blocks').delete().eq('id', blockId).select('id');
  if (error) {
    captureException('dal.community.unblock.legacy', error);
    return { ok: false, error: error.message };
  }
  return { ok: true, data: (data ?? []).length > 0 };
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
