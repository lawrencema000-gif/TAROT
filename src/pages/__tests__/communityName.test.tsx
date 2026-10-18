import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, fireEvent, cleanup, within, waitFor } from '@testing-library/react';
import { createElement, forwardRef, type ReactNode } from 'react';

/*
 * p9 QS R-1: 20261003000014 shows other members only profiles.community_name
 * (NULL until chosen, so named rows read "A member"), and nothing in the app
 * could set it. The composer and the comment box now say what name a named
 * post or comment carries and let the member choose it — never filled in
 * from the email or the display name. A save that fails (the column is not
 * there before 014) says so and leaves the composer as it was.
 *
 * QU2 R3 e: the comments heading is one translated string, "Comments (n)",
 * not a word with a count glued on in code.
 */

type Profile = Record<string, unknown>;
type Auth = { user: { id: string; email: string }; profile: Profile; updateProfile: (u: Profile) => Promise<{ error: Error | null }> };

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
    updates: [] as Array<Record<string, unknown>>,
    nextError: null as Error | null,
    serverHasViews: true,
    feedLoads: 0,
    commentLoads: 0,
    published: [] as Array<{ content: string; surface: string; opts: Record<string, unknown> }>,
  };
});

vi.mock('../../context/AuthContext', async () => {
  const { useSyncExternalStore } = await import('react');
  return { useAuth: () => useSyncExternalStore(h.subscribe, h.get) };
});
vi.mock('../../lib/supabase', () => ({ supabase: {} }));
vi.mock('../../utils/telemetry', () => ({ captureException: () => {} }));
vi.mock('../../services/levelSystem', () => ({ awardXP: async () => null }));
vi.mock('../../services/moderation', () => ({
  publishContent: async (content: string, surface: string, opts: Record<string, unknown>) => {
    h.published.push({ content, surface, opts });
    return { verdict: 'allow', publishedId: 'new-1', publishedStatus: 'allowed', crisis: false, categories: [] };
  },
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

const ME = { id: '00000000-0000-4000-8000-0000000000c1', email: 'jane.doe1990@gmail.com' };
const OTHER = '00000000-0000-4000-8000-0000000000c2';
const AT = '2026-10-17T09:00:00Z';

function auth(): Auth {
  return h.get() as Auth;
}

/** The feed views name a named row by its author's community_name, read live. */
function feed() {
  const mine = (auth().profile.communityName as string | null | undefined) ?? undefined;
  const base = { reactionCount: 0, isHidden: false, moderationStatus: 'allowed', createdAt: AT, updatedAt: AT, myReaction: null };
  return [
    { ...base, id: 'p1', userId: ME.id, isMine: true, canBlockAuthor: false, topic: 'general', content: 'My first post', isAnonymous: false, commentCount: 2, authorDisplayName: mine },
    { ...base, id: 'p2', userId: OTHER, isMine: false, canBlockAuthor: true, topic: 'general', content: 'A post by someone else', isAnonymous: false, commentCount: 0, authorDisplayName: 'Star Gazer' },
    { ...base, id: 'p3', userId: null, isMine: false, canBlockAuthor: true, topic: 'whispering-well', content: 'A whisper', isAnonymous: true, commentCount: 0, authorDisplayName: undefined },
  ];
}
function comments(postId: string) {
  const mine = (auth().profile.communityName as string | null | undefined) ?? undefined;
  if (postId !== 'p1') return [];
  const base = { postId, parentId: null, isHidden: false, moderationStatus: 'allowed', createdAt: AT };
  return [
    { ...base, id: 'c1', userId: ME.id, isMine: true, canBlockAuthor: false, content: 'My own comment', isAnonymous: false, authorDisplayName: mine },
    { ...base, id: 'c2', userId: OTHER, isMine: false, canBlockAuthor: true, content: 'Their comment', isAnonymous: false, authorDisplayName: 'Star Gazer' },
  ];
}

vi.mock('../../dal', () => ({
  community: {
    fetchFeed: async (opts: { topic?: string }) => {
      h.feedLoads += 1;
      const rows = feed();
      return { ok: true, data: opts.topic === 'whispering-well' ? rows.filter((p) => p.topic === 'whispering-well') : rows };
    },
    fetchComments: async (postId: string) => {
      h.commentLoads += 1;
      return { ok: true, data: comments(postId) };
    },
    serverResolvesAuthors: () => h.serverHasViews,
    screenContent: () => ({ ok: true }),
    addReaction: async () => ({ ok: true, data: undefined }),
    removeReaction: async () => ({ ok: true, data: undefined }),
    deletePost: async () => ({ ok: true, data: undefined }),
    deleteComment: async () => ({ ok: true, data: undefined }),
    report: async () => ({ ok: true, data: undefined }),
    blockAuthor: async () => ({ ok: true, data: true }),
  },
}));

import i18n from '../../i18n/config';
import { ToastContainer } from '../../components/ui';
import { CommunityPage } from '../CommunityPage';
import '@testing-library/jest-dom/vitest';

function signIn(profile: Profile) {
  h.set({
    user: ME,
    profile: { id: ME.id, email: ME.email, displayName: 'Jane Doe', birthDate: '', isPremium: false, ...profile },
    async updateProfile(u: Profile) {
      h.updates.push(u);
      if (h.nextError) return { error: h.nextError };
      const cur = auth();
      h.set({ ...cur, profile: { ...cur.profile, ...u } });
      return { error: null };
    },
  });
}

function mount(mode?: 'normal' | 'whispering-well') {
  return render(
    <>
      <CommunityPage mode={mode} />
      <ToastContainer />
    </>,
  );
}

const T = (key: string) => i18n.t(`app:${key}`);

async function openComposer() {
  mount();
  await screen.findByText('My first post');
  fireEvent.click(screen.getAllByRole('button', { name: T('community.postButton') })[0]);
  return screen.findByRole('heading', { name: T('community.newPost') });
}

async function openMyPost() {
  mount();
  const content = await screen.findByText('My first post');
  const card = content.parentElement as HTMLElement;
  fireEvent.click(within(card).getByRole('button', { name: '2' }));
  await screen.findByText('My own comment');
}

beforeEach(() => {
  h.updates.length = 0;
  h.published.length = 0;
  h.nextError = null;
  h.serverHasViews = true;
  h.feedLoads = 0;
  h.commentLoads = 0;
  signIn({});
});
afterEach(() => cleanup());

describe('choosing the name Community shows (QS R-1)', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('the composer says a named post reads "A member" until a name is chosen, and the field starts empty — never the email or the display name', async () => {
    await openComposer();
    expect(screen.getByText('Your name shows as “A member” until you choose one')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Choose a name' }));
    const field = screen.getByLabelText('Your name in Community');
    expect(field).toHaveValue('');
    expect(field).toHaveAttribute('maxLength', '32');
    expect(screen.getByText(/Up to 32 characters, no email address/)).toBeInTheDocument();
  });

  it('saving the name shows it on the composer and reloads the feed, which carries it', async () => {
    await openComposer();
    const loadsBefore = h.feedLoads;
    fireEvent.click(screen.getByRole('button', { name: 'Choose a name' }));
    fireEvent.change(screen.getByLabelText('Your name in Community'), { target: { value: '  Moon Child  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
    expect(await screen.findByText('Posting as Moon Child')).toBeInTheDocument();
    expect(h.updates).toEqual([{ communityName: 'Moon Child' }]);
    expect(screen.getByRole('button', { name: 'Change' })).toBeInTheDocument();
    await waitFor(() => expect(h.feedLoads).toBeGreaterThan(loadsBefore));
    // Back on the feed, the member's named post carries the new name.
    fireEvent.click(screen.getByRole('button', { name: T('community.back') }));
    const post = (await screen.findByText('My first post')).parentElement as HTMLElement;
    expect(within(post).getByText('Moon Child')).toBeInTheDocument();
  });

  it('Change opens the field on the chosen name; emptying it clears the name', async () => {
    signIn({ communityName: 'Moon Child' });
    await openComposer();
    expect(screen.getByText('Posting as Moon Child')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Change' }));
    const field = screen.getByLabelText('Your name in Community');
    expect(field).toHaveValue('Moon Child');
    fireEvent.change(field, { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
    expect(await screen.findByText('Your name shows as “A member” until you choose one')).toBeInTheDocument();
    expect(h.updates).toEqual([{ communityName: null }]);
  });

  it('Cancel closes the field without saving', async () => {
    await openComposer();
    fireEvent.click(screen.getByRole('button', { name: 'Choose a name' }));
    fireEvent.change(screen.getByLabelText('Your name in Community'), { target: { value: 'Half typed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByLabelText('Your name in Community')).not.toBeInTheDocument();
    expect(screen.getByText('Your name shows as “A member” until you choose one')).toBeInTheDocument();
    expect(h.updates).toEqual([]);
  });

  it.each([
    ['an email address', 'jane.doe1990@gmail.com'],
    ['an @', 'moon@child'],
    ['a control character', 'Moon\u0007Child'],
    ['more than 32 characters', 'x'.repeat(33)],
  ])('refuses %s inline, before any request', async (_what, value) => {
    await openComposer();
    fireEvent.click(screen.getByRole('button', { name: 'Choose a name' }));
    const field = screen.getByLabelText('Your name in Community');
    fireEvent.change(field, { target: { value } });
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
    expect(await screen.findByText('Use 1 to 32 characters, without “@”.')).toBeInTheDocument();
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(h.updates).toEqual([]);
    // Typing again clears the complaint.
    fireEvent.change(field, { target: { value: 'Moon Child' } });
    expect(screen.queryByText('Use 1 to 32 characters, without “@”.')).not.toBeInTheDocument();
  });

  it('the database’s own refusal (its check constraint) reads as the same inline message', async () => {
    h.nextError = new Error('new row for relation "profiles" violates check constraint "profiles_community_name_shape"');
    await openComposer();
    fireEvent.click(screen.getByRole('button', { name: 'Choose a name' }));
    fireEvent.change(screen.getByLabelText('Your name in Community'), { target: { value: 'Moon Child' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
    expect(await screen.findByText('Use 1 to 32 characters, without “@”.')).toBeInTheDocument();
  });

  it('before 014 the column is missing: the save fails with a toast, and the composer still publishes', async () => {
    h.nextError = new Error("Could not find the 'community_name' column of 'profiles' in the schema cache");
    await openComposer();
    const draft = screen.getByPlaceholderText(T('community.placeholder'));
    fireEvent.change(draft, { target: { value: 'A reading I want to share' } });
    fireEvent.click(screen.getByRole('button', { name: 'Choose a name' }));
    fireEvent.change(screen.getByLabelText('Your name in Community'), { target: { value: 'Moon Child' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
    const alert = await screen.findByText('Couldn’t save your name — check your connection and try again.');
    expect(alert.closest('[role="alert"]')).not.toBeNull();
    // Nothing else moved: the draft, the field and its value are all still
    // there to try again, and no name was taken.
    expect(h.updates).toEqual([{ communityName: 'Moon Child' }]);
    expect(draft).toHaveValue('A reading I want to share');
    expect(screen.getByLabelText('Your name in Community')).toHaveValue('Moon Child');
    expect(screen.getByLabelText('Your name in Community')).toBeEnabled();
    expect(screen.queryByText(/Posting as/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: T('community.publishPost') }));
    await waitFor(() => expect(h.published).toHaveLength(1));
    expect(h.published[0]).toMatchObject({ content: 'A reading I want to share', surface: 'post', opts: { isAnonymous: false } });
  });

  it('when this session has seen the server without 014, no name is offered at all', async () => {
    h.serverHasViews = false;
    await openComposer();
    expect(screen.queryByText('Your name shows as “A member” until you choose one')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Choose a name' })).not.toBeInTheDocument();
  });

  it('an anonymous post has no name to show: the line goes while "Post anonymously" is ticked', async () => {
    await openComposer();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Post anonymously' }));
    expect(screen.queryByText('Your name shows as “A member” until you choose one')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Post anonymously' }));
    expect(screen.getByText('Your name shows as “A member” until you choose one')).toBeInTheDocument();
  });

  it('the Whispering Well composer offers no name', async () => {
    mount('whispering-well');
    await screen.findByText('A whisper');
    fireEvent.click(screen.getAllByRole('button', { name: T('community.whisperButton') })[0]);
    await screen.findByRole('heading', { name: T('community.whisperingWell.newWhisper') });
    expect(screen.queryByRole('button', { name: 'Choose a name' })).not.toBeInTheDocument();
    expect(screen.queryByText(/until you choose one/)).not.toBeInTheDocument();
  });

  it('the comment box offers it too; saving reloads the comments and the open post, which carry the name', async () => {
    await openMyPost();
    const box = screen.getByPlaceholderText(T('community.commentPlaceholder')).parentElement as HTMLElement;
    expect(within(box).getByText('Your name shows as “A member” until you choose one')).toBeInTheDocument();
    const commentLoads = h.commentLoads;
    fireEvent.click(within(box).getByRole('button', { name: 'Choose a name' }));
    fireEvent.change(within(box).getByLabelText('Your name in Community'), { target: { value: 'Moon Child' } });
    fireEvent.click(within(box).getByRole('button', { name: 'Save name' }));
    expect(await within(box).findByText('Posting as Moon Child')).toBeInTheDocument();
    await waitFor(() => expect(h.commentLoads).toBeGreaterThan(commentLoads));
    // My comment and my open post both read the new name.
    const myComment = (await screen.findByText('My own comment')).parentElement as HTMLElement;
    await waitFor(() => expect(within(myComment).getByText('Moon Child')).toBeInTheDocument());
    const myPost = screen.getByText('My first post').parentElement as HTMLElement;
    await waitFor(() => expect(within(myPost).getByText('Moon Child')).toBeInTheDocument());
  });

  it('an anonymous comment has no name to show', async () => {
    await openMyPost();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Comment anonymously' }));
    expect(screen.queryByText('Your name shows as “A member” until you choose one')).not.toBeInTheDocument();
  });
});

describe('the open post follows the feed', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('a reaction on the open post shows on it at once (it held a copy taken on open)', async () => {
    await openMyPost();
    const post = screen.getByText('My first post').parentElement as HTMLElement;
    const heart = within(post).getByRole('button', { name: T('community.reactions.heart') });
    expect(heart).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(heart);
    await waitFor(() => expect(within(post).getByRole('button', { name: T('community.reactions.heart') })).toHaveAttribute('aria-pressed', 'true'));
    expect(within(post).getByText('1')).toBeInTheDocument();
  });
});

describe('the comments heading (QU2 R3 e)', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('is one string with the count in it', async () => {
    await openMyPost();
    expect(screen.getByRole('heading', { name: 'Comments (2)' })).toBeInTheDocument();
  });
});

describe('in Japanese', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('ja');
  });
  afterAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('the composer offers the name in Japanese', async () => {
    await openComposer();
    expect(screen.getByText('名前を決めるまで「あるメンバー」と表示されます')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '名前を決める' }));
    fireEvent.change(screen.getByLabelText('コミュニティでの名前'), { target: { value: '月の子' } });
    fireEvent.click(screen.getByRole('button', { name: '名前を保存' }));
    expect(await screen.findByText('月の子として投稿します')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '変更' })).toBeInTheDocument();
  });

  it('refuses an email address in Japanese', async () => {
    await openComposer();
    fireEvent.click(screen.getByRole('button', { name: '名前を決める' }));
    fireEvent.change(screen.getByLabelText('コミュニティでの名前'), { target: { value: 'tsuki@example.jp' } });
    fireEvent.click(screen.getByRole('button', { name: '名前を保存' }));
    expect(await screen.findByText('1〜32文字で、「@」を含めずに入力してください。')).toBeInTheDocument();
    expect(h.updates).toEqual([]);
  });

  it('the comments heading reads コメント（2）', async () => {
    await openMyPost();
    expect(screen.getByRole('heading', { name: 'コメント（2）' })).toBeInTheDocument();
  });
});
