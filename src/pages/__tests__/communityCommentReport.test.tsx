import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, fireEvent, cleanup, within, waitFor } from '@testing-library/react';
import { createElement, forwardRef, type ReactNode } from 'react';

/*
 * Members can report a comment (WP-P0-20, social-ai-01 companion). The table
 * and the DAL took comment_id, but no screen offered it. Another member's
 * comment now has a 44 px Report button that opens the same sheet as a post
 * (drawn on <body>, WP-P0-01); the report reaches Admin → Moderation. The
 * member's own comment has Delete instead. A second report of the same
 * comment (23505, one report per member per comment) reads as the first one,
 * already filed.
 */

type Auth = { user: { id: string; email: string }; profile: Record<string, unknown> };
type ReportResult = { ok: true; data: undefined | void } | { ok: false; error: string };

const h = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  let state: unknown = null;
  return {
    get: () => state,
    set(next: unknown) {
      state = next;
      listeners.forEach((l) => l());
    },
    subscribe(l: () => void) {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    report: vi.fn<(input: Record<string, unknown>) => Promise<ReportResult>>(async () => ({ ok: true, data: undefined })),
    /** What supabase.from('community_reports').insert() answers, for the real DAL. */
    insertResult: { error: null } as { error: { code: string; message: string } | null },
    inserted: [] as unknown[],
  };
});

vi.mock('../../context/AuthContext', async () => {
  const { useSyncExternalStore } = await import('react');
  return { useAuth: () => useSyncExternalStore(h.subscribe, h.get) };
});
vi.mock('../../schema', () => new Proxy({}, { get: (_t, k) => (k === 'then' ? undefined : { parse: (x: unknown) => x }), has: () => true }));
vi.mock('../../lib/supabase', () => {
  const inert = (): unknown => new Proxy(function () {}, { get: (_t, k) => (k === 'then' ? undefined : inert()), apply: () => inert() });
  const supabase = new Proxy({}, {
    get: (_t, k) =>
      k === 'from'
        ? (table: string) =>
            table === 'community_reports'
              ? { insert: async (row: unknown) => { h.inserted.push(row); return h.insertResult; } }
              : inert()
        : inert(),
  });
  return { supabase, isSupabaseConfigured: true };
});
vi.mock('../../utils/telemetry', () => ({ captureException: () => {} }));
vi.mock('../../services/levelSystem', () => ({ awardXP: async () => null }));
vi.mock('../../services/moderation', () => ({
  publishContent: async () => ({ verdict: 'allow', publishedId: 'new-1', publishedStatus: 'allowed', crisis: false, categories: [] }),
}));
vi.mock('framer-motion', () => {
  const strip = ({ initial, animate, exit, transition, whileTap, whileHover, layout, variants, ...rest }: Record<string, unknown>) => {
    void initial; void animate; void exit; void transition; void whileTap; void whileHover; void layout; void variants;
    return rest;
  };
  const motion = new Proxy({}, {
    get: (_t, tag: string) => forwardRef<HTMLElement, Record<string, unknown> & { children?: ReactNode }>(function M(props, ref) {
      return createElement(tag, { ...strip(props), ref }, props.children as ReactNode);
    }),
  });
  return {
    motion,
    AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
    LayoutGroup: ({ children }: { children: ReactNode }) => <>{children}</>,
    useReducedMotion: () => true,
  };
});

const ME = { id: '00000000-0000-4000-8000-0000000000c1', email: 'qa.reader@example.com' };
const OTHER = '00000000-0000-4000-8000-0000000000c2';
const AT = '2026-10-17T09:00:00Z';

function feed() {
  const base = { reactionCount: 0, isHidden: false, moderationStatus: 'allowed', createdAt: AT, updatedAt: AT, myReaction: null, commentCount: 2 };
  return [
    { ...base, id: 'p2', userId: OTHER, isMine: false, canBlockAuthor: true, topic: 'general', content: 'A post by someone else', isAnonymous: false, authorDisplayName: 'Star Gazer' },
    { ...base, id: 'p3', userId: null, isMine: false, canBlockAuthor: true, topic: 'whispering-well', content: 'A whisper', isAnonymous: true, authorDisplayName: undefined },
  ];
}

function comments(postId: string) {
  const base = { postId, parentId: null, isHidden: false, moderationStatus: 'allowed', createdAt: AT, canBlockAuthor: false };
  return [
    { ...base, id: `${postId}-mine`, userId: ME.id, isMine: true, content: 'My own comment', isAnonymous: false, authorDisplayName: 'Moon Child' },
    { ...base, id: `${postId}-theirs`, userId: OTHER, isMine: false, canBlockAuthor: true, content: 'Someone else’s comment', isAnonymous: postId === 'p3', authorDisplayName: 'Star Gazer' },
  ];
}

vi.mock('../../dal', () => ({
  community: {
    fetchFeed: async (opts: { topic?: string }) => {
      const rows = feed();
      return { ok: true, data: opts.topic === 'whispering-well' ? rows.filter((p) => p.topic === 'whispering-well') : rows };
    },
    fetchComments: async (postId: string) => ({ ok: true, data: comments(postId) }),
    serverResolvesAuthors: () => true,
    screenContent: () => ({ ok: true }),
    addReaction: async () => ({ ok: true, data: undefined }),
    removeReaction: async () => ({ ok: true, data: undefined }),
    deletePost: async () => ({ ok: true, data: undefined }),
    deleteComment: async () => ({ ok: true, data: undefined }),
    report: (input: Record<string, unknown>) => h.report(input),
    blockAuthor: async () => ({ ok: true, data: true }),
  },
}));

import i18n from '../../i18n/config';
import { ToastContainer } from '../../components/ui';
import { CommunityPage } from '../CommunityPage';
import '@testing-library/jest-dom/vitest';

function signIn() {
  const auth: Auth = {
    user: ME,
    profile: { id: ME.id, email: ME.email, displayName: 'QA Reader', communityName: 'Moon Child', birthDate: '', isPremium: false },
  };
  h.set(auth);
}

function mount(mode?: 'normal' | 'whispering-well') {
  return render(
    <>
      <main className="relative z-10">
        <CommunityPage mode={mode} />
      </main>
      <ToastContainer />
    </>,
  );
}

/** Open the post that reads `content` and wait for its comments. */
async function openPost(content = 'A post by someone else', mode?: 'normal' | 'whispering-well') {
  mount(mode);
  const card = (await screen.findByText(content)).parentElement as HTMLElement;
  fireEvent.click(within(card).getByRole('button', { name: '2' }));
  await screen.findByText('Someone else’s comment');
}

/** The comment card that reads `content`. */
const commentCard = (content: string) => (screen.getByText(content).closest('.bg-mystic-800\\/20') as HTMLElement);

async function reportTheirs(reasonName = 'Spam', { report = 'Report', confirm = 'Report' } = {}) {
  const theirs = commentCard('Someone else’s comment');
  fireEvent.click(within(theirs).getByRole('button', { name: report }));
  const dialog = await screen.findByRole('dialog', { name: report });
  expect(dialog.parentElement).toBe(document.body);
  fireEvent.click(within(dialog).getByRole('radio', { name: reasonName }));
  fireEvent.click(within(dialog).getByRole('button', { name: confirm }));
  return { theirs, dialog };
}

const sheetUp = () => document.body.classList.contains('sheet-open');

beforeEach(() => {
  h.report.mockReset();
  h.report.mockImplementation(async () => ({ ok: true, data: undefined }));
  h.insertResult = { error: null };
  h.inserted.length = 0;
  signIn();
});
afterEach(() => cleanup());

describe('reporting a comment (WP-P0-20)', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('another member’s comment has a 44 px Report button; the member’s own has Delete and no Report', async () => {
    await openPost();
    const theirs = commentCard('Someone else’s comment');
    const button = within(theirs).getByRole('button', { name: 'Report' });
    expect(button.className).toMatch(/min-w-\[44px\]/);
    expect(button.className).toMatch(/min-h-\[44px\]/);

    const mine = commentCard('My own comment');
    expect(within(mine).queryByRole('button', { name: 'Report' })).toBeNull();
    expect(within(mine).getByRole('button', { name: 'Delete comment' })).toBeInTheDocument();
  });

  it('Spam, then Report: one report with the comment’s id and no post id; the sheet closes and the comment says Reported', async () => {
    await openPost();
    const { theirs } = await reportTheirs('Spam');
    await waitFor(() => expect(h.report).toHaveBeenCalledTimes(1));
    expect(h.report).toHaveBeenCalledWith({ reporterId: ME.id, commentId: 'p2-theirs', reason: 'spam' });
    expect(h.report.mock.calls[0][0]).not.toHaveProperty('postId');
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Report' })).toBeNull();
      expect(sheetUp()).toBe(false);
      expect(screen.getByText('Report submitted. Thank you.')).toBeInTheDocument();
      expect(within(theirs).getByText('Reported')).toBeInTheDocument();
    });
    expect(within(theirs).queryByRole('button', { name: 'Report' })).toBeNull();
  });

  it('a second report of the same comment (23505) reads as the first, already filed', async () => {
    const { report } = await vi.importActual<typeof import('../../dal/community')>('../../dal/community');
    h.report.mockImplementation((input) => report(input as unknown as Parameters<typeof report>[0]));
    h.insertResult = { error: { code: '23505', message: 'duplicate key value violates unique constraint "community_reports_one_per_comment"' } };
    await openPost();
    const { theirs } = await reportTheirs('Spam');
    await waitFor(() => expect(h.inserted).toHaveLength(1));
    expect(h.inserted[0]).toMatchObject({ reporter_id: ME.id, post_id: null, comment_id: 'p2-theirs', reason: 'spam' });
    expect(await screen.findByText('Report submitted. Thank you.')).toBeInTheDocument();
    await waitFor(() => expect(within(theirs).getByText('Reported')).toBeInTheDocument());
    expect(screen.queryByText('Couldn’t send the report — check your connection and try again.')).toBeNull();
  });

  it('a failed send keeps the sheet up to try again, under the error toast', async () => {
    h.report.mockImplementation(async () => ({ ok: false, error: 'x' }));
    await openPost();
    const { theirs, dialog } = await reportTheirs('Harassment');
    expect(await screen.findByText('Couldn’t send the report — check your connection and try again.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Report' })).toBe(dialog);
    expect(within(dialog).getByRole('radio', { name: 'Harassment' })).toHaveAttribute('aria-checked', 'true');
    expect(within(theirs).queryByText('Reported')).toBeNull();
  });

  it('signed out, no comment offers Report', async () => {
    h.set({ user: null, profile: null });
    mount();
    const card = (await screen.findByText('A post by someone else')).parentElement as HTMLElement;
    fireEvent.click(within(card).getByRole('button', { name: '2' }));
    await screen.findByText('Someone else’s comment');
    expect(within(commentCard('Someone else’s comment')).queryByRole('button', { name: 'Report' })).toBeNull();
  });
});

describe('in Korean, in the Whispering Well', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('ko');
  });
  afterAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('a reply in the Well is reported through the same sheet', async () => {
    await openPost('A whisper', 'whispering-well');
    await reportTheirs('스팸', { report: '신고', confirm: '신고하기' });
    await waitFor(() => expect(h.report).toHaveBeenCalledWith({ reporterId: ME.id, commentId: 'p3-theirs', reason: 'spam' }));
  });
});
