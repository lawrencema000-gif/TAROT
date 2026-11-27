import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, fireEvent, cleanup, within, waitFor, act } from '@testing-library/react';
import { createElement, forwardRef, type ReactNode } from 'react';

/*
 * social-ai-01 (blocker): no post could be reported from a phone. The report
 * dialog was a fixed overlay drawn inside the shell's <main class="relative
 * z-10">, a stacking context of its own, so its z-50 ranked only inside main
 * and the bottom nav (z-40, main's sibling) painted over it. Below `md` the
 * card was bottom-anchored: Cancel and Report sat exactly under the nav, and
 * a tap opened another tab instead. community_reports never had a row.
 *
 * The report is now the shared Sheet, drawn on <body>: it holds the page
 * (`body.sheet-open`, which hides the nav), traps focus, and closes on
 * Cancel, Escape (Android Back), and the scrim, handing focus back to the
 * post's ⋮ button. A failed send keeps it up to try again.
 */

type Auth = { user: { id: string; email: string }; profile: Record<string, unknown> };
type ReportResult = { ok: true; data: undefined } | { ok: false; error: string };

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
  };
});

vi.mock('../../context/AuthContext', async () => {
  const { useSyncExternalStore } = await import('react');
  return { useAuth: () => useSyncExternalStore(h.subscribe, h.get) };
});
// App.tsx loads too (for androidBack), as in src/__tests__/androidBack.test.tsx:
// the shared zod schemas import Deno's `npm:zod`, and the Supabase client wants
// its environment.
vi.mock('../../schema', () => new Proxy({}, { get: (_t, k) => (k === 'then' ? undefined : { parse: (x: unknown) => x }), has: () => true }));
vi.mock('../../lib/supabase', () => {
  const inert = (): unknown => new Proxy(function () {}, { get: (_t, k) => (k === 'then' ? undefined : inert()), apply: () => inert() });
  return { supabase: inert(), isSupabaseConfigured: true };
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
  const base = { reactionCount: 0, isHidden: false, moderationStatus: 'allowed', createdAt: AT, updatedAt: AT, myReaction: null, commentCount: 0 };
  return [
    { ...base, id: 'p1', userId: ME.id, isMine: true, canBlockAuthor: false, topic: 'general', content: 'My first post', isAnonymous: false, authorDisplayName: 'Moon Child' },
    { ...base, id: 'p2', userId: OTHER, isMine: false, canBlockAuthor: true, topic: 'general', content: 'A post by someone else', isAnonymous: false, authorDisplayName: 'Star Gazer' },
    { ...base, id: 'p3', userId: null, isMine: false, canBlockAuthor: true, topic: 'whispering-well', content: 'A whisper', isAnonymous: true, authorDisplayName: undefined },
  ];
}

vi.mock('../../dal', () => ({
  community: {
    fetchFeed: async (opts: { topic?: string }) => {
      const rows = feed();
      return { ok: true, data: opts.topic === 'whispering-well' ? rows.filter((p) => p.topic === 'whispering-well') : rows };
    },
    fetchComments: async () => ({ ok: true, data: [] }),
    serverResolvesAuthors: () => true,
    screenContent: () => ({ ok: true }),
    addReaction: async () => ({ ok: true, data: undefined }),
    removeReaction: async () => ({ ok: true, data: undefined }),
    deletePost: async () => ({ ok: true, data: undefined }),
    deleteComment: async () => ({ ok: true, data: undefined }),
    report: h.report,
    blockAuthor: async () => ({ ok: true, data: true }),
  },
}));

import i18n from '../../i18n/config';
import { ToastContainer } from '../../components/ui';
import { androidBack, type AndroidBackShell } from '../../App';
import { CommunityPage } from '../CommunityPage';
import '@testing-library/jest-dom/vitest';

function signIn() {
  const auth: Auth = {
    user: ME,
    profile: { id: ME.id, email: ME.email, displayName: 'QA Reader', communityName: 'Moon Child', birthDate: '', isPremium: false },
  };
  h.set(auth);
}

/** As the shell draws it: the route inside <main class="relative z-10">, the toasts beside it. */
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

const sheetUp = () => document.body.classList.contains('sheet-open');

/** ⋮ on the post that reads `content`, then its Report item. */
async function openReport(
  content = 'A post by someone else',
  { options = 'Options', report = 'Report', title = 'Report post' } = {},
) {
  const card = (await screen.findByText(content)).parentElement as HTMLElement;
  const optionsButton = within(card).getByRole('button', { name: options });
  fireEvent.click(optionsButton);
  fireEvent.click(within(card).getByRole('menuitem', { name: report }));
  const dialog = await screen.findByRole('dialog', { name: title });
  return { card, options: optionsButton, dialog };
}

beforeEach(() => {
  h.report.mockReset();
  h.report.mockImplementation(async () => ({ ok: true, data: undefined }));
  signIn();
});
afterEach(() => cleanup());

describe('reporting a post (social-ai-01)', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('the sheet is drawn on <body>, outside the page’s <main>', async () => {
    mount();
    const { dialog } = await openReport();
    expect(dialog.closest('main')).toBeNull();
    expect(dialog.parentElement).toBe(document.body);
  });

  it('it holds the page while it is up: body.sheet-open, which hides the bottom nav', async () => {
    mount();
    expect(sheetUp()).toBe(false);
    await openReport();
    expect(sheetUp()).toBe(true);
  });

  it('Report waits for a reason; then one report goes, the sheet closes, the card says Reported, and a toast thanks the member', async () => {
    mount();
    const { card, dialog } = await openReport();
    const report = within(dialog).getByRole('button', { name: 'Report' });
    expect(report).toBeDisabled();

    const spam = within(dialog).getByRole('radio', { name: 'Spam' });
    fireEvent.click(spam);
    expect(spam).toHaveAttribute('aria-checked', 'true');
    expect(report).toBeEnabled();

    fireEvent.click(report);
    await waitFor(() => expect(h.report).toHaveBeenCalledTimes(1));
    expect(h.report).toHaveBeenCalledWith({ reporterId: ME.id, postId: 'p2', reason: 'spam' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Report post' })).toBeNull();
      expect(sheetUp()).toBe(false);
      expect(within(card).getByText('Reported')).toBeInTheDocument();
      expect(screen.getByText('Report submitted. Thank you.')).toBeInTheDocument();
    });
    expect(h.report).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['Cancel', (dialog: HTMLElement) => fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))],
    ['Escape (Android Back)', () => fireEvent.keyDown(document, { key: 'Escape' })],
    ['a tap on the scrim', (dialog: HTMLElement) => fireEvent.click(dialog.firstElementChild as HTMLElement)],
  ])('%s closes it without a report, and focus goes back to the post’s ⋮', async (_how, close) => {
    mount();
    const { dialog, options } = await openReport();
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Spam' }));
    close(dialog);
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Report post' })).toBeNull();
      expect(sheetUp()).toBe(false);
    });
    expect(h.report).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(options);
  });

  it('Android Back closes the sheet, not the page under it: no report, no trip Home, focus back on ⋮', async () => {
    mount();
    const { dialog, options } = await openReport();
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Spam' }));
    // /community is a tab root: with nothing up, Back would go Home.
    const shell: AndroidBackShell = {
      activeOverlay: null,
      closeOverlay: vi.fn(),
      pathname: '/community',
      navigateBack: vi.fn(),
      activeTab: 'community',
      goHome: vi.fn(),
      exitApp: vi.fn(),
    };
    act(() => androidBack(shell));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Report post' })).toBeNull();
      expect(sheetUp()).toBe(false);
    });
    expect(shell.goHome).not.toHaveBeenCalled();
    expect(shell.navigateBack).not.toHaveBeenCalled();
    expect(shell.exitApp).not.toHaveBeenCalled();
    expect(shell.closeOverlay).not.toHaveBeenCalled();
    expect(h.report).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(options);
  });

  it('opened again after Cancel, it starts with no reason picked', async () => {
    mount();
    const first = await openReport();
    fireEvent.click(within(first.dialog).getByRole('radio', { name: 'Harassment' }));
    fireEvent.click(within(first.dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Report post' })).toBeNull());

    fireEvent.click(first.options);
    fireEvent.click(within(first.card).getByRole('menuitem', { name: 'Report' }));
    const dialog = await screen.findByRole('dialog', { name: 'Report post' });
    const radios = within(dialog).getAllByRole('radio');
    expect(radios).toHaveLength(6);
    for (const radio of radios) expect(radio).toHaveAttribute('aria-checked', 'false');
    expect(within(dialog).getByRole('button', { name: 'Report' })).toBeDisabled();
  });

  it('a failed send keeps the sheet up, with the reason still picked and Report ready to try again', async () => {
    h.report.mockImplementation(async () => ({ ok: false, error: 'x' }));
    mount();
    const { card, dialog } = await openReport();
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Spam' }));
    const report = within(dialog).getByRole('button', { name: 'Report' });
    fireEvent.click(report);

    expect(await screen.findByText('Couldn’t send the report — check your connection and try again.')).toBeInTheDocument();
    await waitFor(() => expect(report).toBeEnabled());
    expect(screen.getByRole('dialog', { name: 'Report post' })).toBe(dialog);
    expect(within(dialog).getByRole('radio', { name: 'Spam' })).toHaveAttribute('aria-checked', 'true');
    expect(sheetUp()).toBe(true);
    expect(within(card).queryByText('Reported')).toBeNull();
    expect(h.report).toHaveBeenCalledTimes(1);
  });
});

describe('in Korean, in the Whispering Well', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('ko');
  });
  afterAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('a whisper is reported through the same sheet: 게시물 신고, 취소 and 신고하기, with the nav hidden', async () => {
    mount('whispering-well');
    const { card, dialog } = await openReport('A whisper', { options: '옵션', report: '신고', title: '게시물 신고' });
    expect(dialog.parentElement).toBe(document.body);
    expect(within(dialog).getByRole('button', { name: '취소' })).toBeInTheDocument();
    const report = within(dialog).getByRole('button', { name: '신고하기' });
    expect(report).toBeDisabled();
    expect(sheetUp()).toBe(true);

    fireEvent.click(within(dialog).getByRole('radio', { name: '스팸' }));
    fireEvent.click(report);
    await waitFor(() => expect(h.report).toHaveBeenCalledTimes(1));
    expect(h.report).toHaveBeenCalledWith({ reporterId: ME.id, postId: 'p3', reason: 'spam' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '게시물 신고' })).toBeNull();
      expect(within(card).getByText('신고됨')).toBeInTheDocument();
    });
  });
});
