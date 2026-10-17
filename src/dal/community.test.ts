import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * The community read and block paths on both sides of migration
 * 20261003000014 (P8 F34, F06, O#53, F67, F91, F48, F70).
 *
 * Before the push the feed views answer PGRST205 and community_block_author
 * PGRST202 — the bodies production returned on 2026-10-17. The DAL must then
 * read the base tables, leave out blocked authors itself, never pass on an
 * anonymous author's id, and not ask for the missing view again on every
 * load. After the push it reads the views only.
 */

const ME = '00000000-0000-4000-8000-00000000000a';
const BEN = '00000000-0000-4000-8000-00000000000b';
const CLEO = '00000000-0000-4000-8000-00000000000c';

const MISSING_VIEW = (name: string) => ({ code: 'PGRST205', message: `Could not find the table 'public.${name}' in the schema cache` });
const MISSING_RPC = (name: string) => ({ code: 'PGRST202', message: `Could not find the function public.${name} without parameters in the schema cache` });

interface Call { name: string; op: string; columns?: string; returning?: string; payload?: unknown; args?: unknown; filters: Array<[string, string, unknown]> }
const calls: Call[] = [];

const server = { migrated: false, blocksReadable: true };
let deletedRows: Array<{ id: string }> = [];
let blocked: string[] = [];

const at = (min: number) => new Date(Date.UTC(2026, 9, 17, 12, min)).toISOString();

const legacyPosts = () => [
  { id: 'B1', user_id: BEN, topic: 'tarot', content: 'Ben named', is_anonymous: false, reaction_count: 0, comment_count: 0, is_hidden: false, moderation_status: 'allowed', created_at: at(5), updated_at: at(5), profiles: null },
  { id: 'B2', user_id: BEN, topic: 'whispering-well', content: 'Ben whisper', is_anonymous: true, reaction_count: 0, comment_count: 0, is_hidden: false, moderation_status: 'allowed', created_at: at(4), updated_at: at(4), profiles: null },
  { id: 'C1', user_id: CLEO, topic: 'moon', content: 'Cleo named', is_anonymous: false, reaction_count: 0, comment_count: 0, is_hidden: false, moderation_status: 'allowed', created_at: at(3), updated_at: at(3), profiles: null },
  { id: 'A2', user_id: ME, topic: 'whispering-well', content: 'My whisper', is_anonymous: true, reaction_count: 0, comment_count: 0, is_hidden: false, moderation_status: 'flagged', created_at: at(2), updated_at: at(2), profiles: { display_name: 'Me', avatar_seed: 's' } },
];

const legacyComments = () => [
  { id: 'k1', post_id: 'C1', user_id: BEN, parent_id: null, content: 'Ben named comment', is_anonymous: false, is_hidden: false, moderation_status: 'allowed', created_at: at(6), profiles: null },
  { id: 'k2', post_id: 'C1', user_id: BEN, parent_id: null, content: 'Ben anonymous comment', is_anonymous: true, is_hidden: false, moderation_status: 'allowed', created_at: at(7), profiles: null },
  { id: 'k3', post_id: 'C1', user_id: ME, parent_id: null, content: 'Mine', is_anonymous: false, is_hidden: false, moderation_status: 'allowed', created_at: at(8), profiles: { display_name: 'Me', avatar_seed: 's' } },
];

// What the views return after the push: author on named rows only.
const viewPosts = () => [
  { id: 'C1', topic: 'moon', content: 'Cleo named', is_anonymous: false, reaction_count: 0, comment_count: 0, is_hidden: false, moderation_status: 'allowed', created_at: at(3), updated_at: at(3), author_id: CLEO, is_mine: false, author_display_name: 'Cleo', author_avatar_seed: 'c' },
  { id: 'B2', topic: 'whispering-well', content: 'Ben whisper', is_anonymous: true, reaction_count: 0, comment_count: 0, is_hidden: false, moderation_status: 'allowed', created_at: at(4), updated_at: at(4), author_id: null, is_mine: false, author_display_name: null, author_avatar_seed: null },
  { id: 'A2', topic: 'whispering-well', content: 'My whisper', is_anonymous: true, reaction_count: 0, comment_count: 0, is_hidden: false, moderation_status: 'flagged', created_at: at(2), updated_at: at(2), author_id: null, is_mine: true, author_display_name: null, author_avatar_seed: null },
];

function respond(c: Call): { data: unknown; error: unknown } {
  switch (c.name) {
    case 'community_feed_posts':
      return server.migrated ? { data: viewPosts(), error: null } : { data: null, error: MISSING_VIEW(c.name) };
    case 'community_feed_comments':
      return server.migrated ? { data: [], error: null } : { data: null, error: MISSING_VIEW(c.name) };
    case 'community_posts':
      if (c.op === 'delete') return { data: deletedRows, error: null };
      return { data: legacyPosts(), error: null };
    case 'community_comments':
      if (c.op === 'delete') return { data: deletedRows, error: null };
      return { data: legacyComments(), error: null };
    case 'community_blocks':
      if (c.op === 'insert') return { data: null, error: null };
      if (c.op === 'delete') return { data: deletedRows, error: null };
      if (!server.blocksReadable) return { data: null, error: { code: '500', message: 'upstream timeout' } };
      return { data: blocked.map((b) => ({ id: `blk-${b}`, blocked_id: b, created_at: at(1) })), error: null };
    case 'community_reactions':
      return { data: [], error: null };
    case 'rpc:community_block_author':
    case 'rpc:community_unblock':
      return server.migrated ? { data: true, error: null } : { data: null, error: MISSING_RPC(c.name.slice(4)) };
    case 'rpc:community_my_blocks':
      return server.migrated
        ? { data: [{ block_id: 'ab1', kind: 'anonymous', blocked_id: null, blocked_display_name: null, created_at: at(9) }], error: null }
        : { data: null, error: MISSING_RPC('community_my_blocks') };
    default:
      return { data: null, error: { message: `unexpected ${c.name}` } };
  }
}

function builder(name: string) {
  const c: Call = { name, op: 'select', filters: [] };
  const chain: Record<string, unknown> = {};
  chain.select = (cols: string) => { if (c.op === 'select') c.columns = cols; else c.returning = cols; return chain; };
  chain.insert = (payload: unknown) => { c.op = 'insert'; c.payload = payload; return chain; };
  chain.delete = () => { c.op = 'delete'; return chain; };
  for (const f of ['eq', 'in', 'lt']) chain[f] = (col: string, v: unknown) => { c.filters.push([f, col, v]); return chain; };
  chain.order = () => chain;
  chain.limit = () => chain;
  chain.single = () => chain;
  chain.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => {
    calls.push(c);
    return Promise.resolve(respond(c)).then(res, rej);
  };
  return chain;
}

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (name: string) => builder(name),
    rpc: (name: string, args?: unknown) => {
      const c: Call = { name: `rpc:${name}`, op: 'rpc', args, filters: [] };
      calls.push(c);
      return Promise.resolve(respond(c));
    },
  },
}));
vi.mock('../utils/telemetry', () => ({ captureException: vi.fn() }));

const dal = await import('./community');

const names = () => calls.map((c) => (c.op === 'select' || c.op === 'rpc' ? c.name : `${c.op}:${c.name}`));

beforeEach(() => {
  calls.length = 0;
  dal.__resetCommunityServerProbe();
  server.migrated = false;
  server.blocksReadable = true;
  deletedRows = [];
  blocked = [];
});
afterEach(() => {
  vi.useRealTimers();
});

describe('before 20261003000014 (production today)', () => {
  it('leaves out blocked members’ named posts, keeps their anonymous ones, and names no anonymous author', async () => {
    blocked = [BEN];
    const res = await dal.fetchFeed({ currentUserId: ME });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.map((p) => p.id)).toEqual(['B2', 'C1', 'A2']);
    const whisper = res.data.find((p) => p.id === 'B2')!;
    expect(whisper.userId).toBeNull();
    expect(JSON.stringify(whisper)).not.toContain(BEN);
    // the old direct insert needs an author id: not offered on anonymous rows
    expect(whisper.canBlockAuthor).toBe(false);
    expect(res.data.find((p) => p.id === 'C1')).toMatchObject({ userId: CLEO, canBlockAuthor: true, isMine: false });
    expect(res.data.find((p) => p.id === 'A2')).toMatchObject({ userId: null, isMine: true, canBlockAuthor: false, moderationStatus: 'flagged' });
    expect(dal.serverResolvesAuthors()).toBe(false);
  });

  it('asks for the missing view once per session, not on every load', async () => {
    await dal.fetchFeed({ currentUserId: ME });
    await dal.fetchFeed({ currentUserId: ME, topic: 'whispering-well' });
    await dal.fetchComments('C1', ME);
    expect(names().filter((n) => n === 'community_feed_posts')).toHaveLength(1);
    expect(names()).not.toContain('community_feed_comments');
    expect(names().filter((n) => n === 'community_posts')).toHaveLength(2);
  });

  it('sends one probe when loads start together (StrictMode mounts the feed twice)', async () => {
    const [a, b, c] = await Promise.all([
      dal.fetchFeed({ currentUserId: ME }),
      dal.fetchFeed({ currentUserId: ME, topic: 'moon' }),
      dal.fetchComments('C1', ME),
    ]);
    expect([a.ok, b.ok, c.ok]).toEqual([true, true, true]);
    expect(names().filter((n) => n === 'community_feed_posts')).toHaveLength(1);
    expect(names()).not.toContain('community_feed_comments');
  });

  it('asks again after ten minutes, and switches to the views once they exist', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-17T12:00:00Z'));
    await dal.fetchFeed({ currentUserId: ME });
    vi.setSystemTime(new Date('2026-10-17T12:05:00Z'));
    await dal.fetchFeed({ currentUserId: ME });
    expect(names().filter((n) => n === 'community_feed_posts')).toHaveLength(1);
    server.migrated = true;
    vi.setSystemTime(new Date('2026-10-17T12:11:00Z'));
    const res = await dal.fetchFeed({ currentUserId: ME });
    expect(names().filter((n) => n === 'community_feed_posts')).toHaveLength(2);
    expect(res.ok && res.data.map((p) => p.id)).toEqual(['C1', 'B2', 'A2']);
    expect(dal.serverResolvesAuthors()).toBe(true);
  });

  it('filters comments the same way', async () => {
    blocked = [BEN];
    const res = await dal.fetchComments('C1', ME);
    expect(res.ok && res.data.map((c) => c.id)).toEqual(['k2', 'k3']);
    if (!res.ok) return;
    expect(res.data[0]).toMatchObject({ userId: null, isAnonymous: true, canBlockAuthor: false });
    expect(res.data[1]).toMatchObject({ isMine: true, canBlockAuthor: false });
  });

  it('fails the load rather than show blocked members when the block list cannot be read', async () => {
    blocked = [BEN];
    server.blocksReadable = false;
    const res = await dal.fetchFeed({ currentUserId: ME });
    expect(res.ok).toBe(false);
  });

  it('blocks a named author with the old direct insert, and never tries an anonymous one', async () => {
    await dal.fetchFeed({ currentUserId: ME }); // learns the server is not migrated
    calls.length = 0;
    const named = await dal.blockAuthor({ postId: 'C1' }, { blockerId: ME, blockedId: CLEO });
    expect(named).toEqual({ ok: true, data: true });
    expect(names()).toEqual(['insert:community_blocks']); // no RPC 404 first
    expect(calls[0].payload).toEqual({ blocker_id: ME, blocked_id: CLEO });
    calls.length = 0;
    const anon = await dal.blockAuthor({ postId: 'B2' }, { blockerId: ME, blockedId: null });
    expect(anon.ok).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it('falls back from a missing RPC even on a cold session', async () => {
    const named = await dal.blockAuthor({ postId: 'C1' }, { blockerId: ME, blockedId: CLEO });
    expect(named).toEqual({ ok: true, data: true });
    expect(names()).toEqual(['rpc:community_block_author', 'insert:community_blocks']);
    expect(dal.serverResolvesAuthors()).toBe(false);
  });

  it('lists and removes named blocks from community_blocks', async () => {
    blocked = [CLEO];
    const list = await dal.listMyBlocks(ME);
    expect(list.ok && list.data).toEqual([{ blockId: `blk-${CLEO}`, kind: 'named', blockedId: CLEO, blockedDisplayName: null, createdAt: at(1) }]);
    deletedRows = [{ id: `blk-${CLEO}` }];
    const un = await dal.unblock(`blk-${CLEO}`);
    expect(un).toEqual({ ok: true, data: true });
  });
});

describe('after 20261003000014', () => {
  beforeEach(() => { server.migrated = true; });

  it('reads the views only; every other member’s row can be blocked, without an author id', async () => {
    const res = await dal.fetchFeed({ currentUserId: ME });
    expect(names()).not.toContain('community_posts');
    expect(names()).not.toContain('community_blocks');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.find((p) => p.id === 'B2')).toMatchObject({ userId: null, canBlockAuthor: true, authorDisplayName: undefined });
    expect(res.data.find((p) => p.id === 'C1')).toMatchObject({ userId: CLEO, authorDisplayName: 'Cleo', canBlockAuthor: true });
    expect(res.data.find((p) => p.id === 'A2')).toMatchObject({ isMine: true, canBlockAuthor: false });
  });

  it('blocks through the RPC alone, by row', async () => {
    const res = await dal.blockAuthor({ postId: 'B2' }, { blockerId: ME, blockedId: null });
    expect(res).toEqual({ ok: true, data: true });
    expect(names()).toEqual(['rpc:community_block_author']);
    expect(calls[0].args).toEqual({ p_post_id: 'B2', p_comment_id: null });
  });

  it('lists blocks with no author for anonymous ones, and unblocks by block id', async () => {
    const list = await dal.listMyBlocks(ME);
    expect(list.ok && list.data).toEqual([{ blockId: 'ab1', kind: 'anonymous', blockedId: null, blockedDisplayName: null, createdAt: at(9) }]);
    const un = await dal.unblock('ab1');
    expect(un).toEqual({ ok: true, data: true });
    expect(calls.at(-1)).toMatchObject({ name: 'rpc:community_unblock', args: { p_block_id: 'ab1' } });
  });
});

describe('deleting your own post or comment', () => {
  it('reads the deleted id back: a delete RLS turned into a no-op is a failure', async () => {
    deletedRows = [];
    const none = await dal.deletePost('B1');
    expect(none.ok).toBe(false);
    expect(calls[0]).toMatchObject({ name: 'community_posts', op: 'delete', returning: 'id', filters: [['eq', 'id', 'B1']] });
    deletedRows = [{ id: 'A2' }];
    expect(await dal.deletePost('A2')).toEqual({ ok: true, data: undefined });
  });

  it('does the same for comments', async () => {
    deletedRows = [];
    expect((await dal.deleteComment('k1')).ok).toBe(false);
    deletedRows = [{ id: 'k3' }];
    expect(await dal.deleteComment('k3')).toEqual({ ok: true, data: undefined });
    expect(calls.at(-1)).toMatchObject({ name: 'community_comments', op: 'delete', returning: 'id' });
  });
});
