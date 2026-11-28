import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within, waitFor } from '@testing-library/react';
import { createElement, forwardRef, type ReactNode } from 'react';

/*
 * Member reports reach a moderator (WP-P0-20). Admin → Moderation reads
 * community_reported_queue() beside the flagged queue and shows every post and
 * comment with a pending member report, self-harm first; Dismiss, Restore
 * (only when the item is hidden) and Remove (after a confirm) call
 * community_resolve_reports and reload.
 */

type RpcResult = { data: unknown; error: { code?: string; message: string } | null };

const h = vi.hoisted(() => ({
  rpc: vi.fn<(fn: string, args?: Record<string, unknown>) => Promise<RpcResult>>(),
  queue: [] as unknown[],
  queueError: null as { code?: string; message: string } | null,
}));

vi.mock('../../../lib/supabase', () => {
  // from('moderation_events' | 'crisis_flags').select().eq().order().limit(): a thenable chain of empty rows.
  const chain = (): unknown =>
    new Proxy(function () {}, {
      get: (_t, k) => (k === 'then' ? (ok: (v: unknown) => void) => ok({ data: [], error: null }) : chain()),
      apply: () => chain(),
    });
  return { supabase: { from: () => chain(), rpc: h.rpc }, isSupabaseConfigured: true };
});
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

import i18n from '../../../i18n/config';
import { ToastContainer } from '../../ui';
import { ModerationPanel } from '../ModerationPanel';
import '@testing-library/jest-dom/vitest';

const HOUR_AGO = new Date(Date.now() - 3_600_000).toISOString();
const DAY_AGO = new Date(Date.now() - 86_400_000).toISOString();

const SELF_HARM_COMMENT = {
  kind: 'comment', id: 'c-1', post_id: 'p-9', topic: 'wellness', content: 'A comment someone worried about',
  is_anonymous: true, is_hidden: false, reports: 1, reasons: ['self-harm'], self_harm: true,
  first_reported: HOUR_AGO, last_reported: HOUR_AGO,
};
const HIDDEN_POST = {
  kind: 'post', id: 'p-1', post_id: null, topic: 'general', content: 'A post five members reported',
  is_anonymous: false, is_hidden: true, reports: 5, reasons: ['spam', 'harassment'], self_harm: false,
  first_reported: DAY_AGO, last_reported: HOUR_AGO,
};

function defaultRpc(fn: string): Promise<RpcResult> {
  if (fn === 'community_reported_queue') return Promise.resolve({ data: h.queueError ? null : h.queue, error: h.queueError });
  if (fn === 'community_flagged_queue') return Promise.resolve({ data: [], error: null });
  if (fn === 'community_resolve_reports') return Promise.resolve({ data: 1, error: null });
  return Promise.resolve({ data: null, error: { message: `unexpected ${fn}` } });
}

const queueCalls = () => h.rpc.mock.calls.filter(([fn]) => fn === 'community_reported_queue').length;

async function openPanel() {
  render(
    <>
      <ModerationPanel />
      <ToastContainer />
    </>,
  );
  fireEvent.click(screen.getByRole('button', { name: /Moderation Queue/ }));
  await waitFor(() => expect(queueCalls()).toBe(1));
}

const section = () => screen.getByRole('region', { name: 'Member reports' });
const rows = () => within(section()).queryAllByTestId('member-report');

beforeAll(async () => {
  await i18n.changeLanguage('en');
});
beforeEach(() => {
  h.queue = [SELF_HARM_COMMENT, HIDDEN_POST];
  h.queueError = null;
  h.rpc.mockReset();
  h.rpc.mockImplementation(defaultRpc);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Member reports in Admin → Moderation (WP-P0-20)', () => {
  it('lists a self-harm comment and a hidden post, the self-harm one first with its chip', async () => {
    await openPanel();
    await waitFor(() => expect(rows()).toHaveLength(2));
    const [first, second] = rows();

    expect(within(first).getByText('Comment')).toBeInTheDocument();
    expect(within(first).getByText('Self-harm')).toBeInTheDocument();
    expect(within(first).getByText('A comment someone worried about')).toBeInTheDocument();
    expect(within(first).getByText('1 report')).toBeInTheDocument();
    expect(within(first).getByText('Self-harm content')).toBeInTheDocument();
    expect(within(first).queryByText('Hidden')).toBeNull();

    expect(within(second).getByText('Post')).toBeInTheDocument();
    expect(within(second).queryByText('Self-harm')).toBeNull();
    expect(within(second).getByText('Hidden')).toBeInTheDocument();
    expect(within(second).getByText('5 reports')).toBeInTheDocument();
    expect(within(second).getByText('Spam')).toBeInTheDocument();
    expect(within(second).getByText('Harassment')).toBeInTheDocument();

    // The section sits above the AI moderator's flagged queue.
    const flaggedHeading = screen.getByText('Flagged — waiting for a decision');
    expect(section().compareDocumentPosition(flaggedHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows the first 280 characters of a long post', async () => {
    h.queue = [{ ...HIDDEN_POST, content: 'x'.repeat(400) }];
    await openPanel();
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(within(rows()[0]).getByText(`${'x'.repeat(280)}…`)).toBeInTheDocument();
  });

  it('Dismiss closes the comment’s reports and reloads; the row leaves the list', async () => {
    await openPanel();
    await waitFor(() => expect(rows()).toHaveLength(2));
    h.queue = [HIDDEN_POST];
    fireEvent.click(within(rows()[0]).getByRole('button', { name: 'Dismiss' }));

    await waitFor(() =>
      expect(h.rpc).toHaveBeenCalledWith('community_resolve_reports', { p_kind: 'comment', p_id: 'c-1', p_action: 'dismiss' }),
    );
    await waitFor(() => expect(queueCalls()).toBe(2));
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(within(rows()[0]).getByText('A post five members reported')).toBeInTheDocument();
    expect(screen.getByText('Reports dismissed')).toBeInTheDocument();
  });

  it('Restore shows only on the hidden row, and restores it', async () => {
    await openPanel();
    await waitFor(() => expect(rows()).toHaveLength(2));
    const [comment, post] = rows();
    expect(within(comment).queryByRole('button', { name: 'Restore' })).toBeNull();
    fireEvent.click(within(post).getByRole('button', { name: 'Restore' }));
    await waitFor(() =>
      expect(h.rpc).toHaveBeenCalledWith('community_resolve_reports', { p_kind: 'post', p_id: 'p-1', p_action: 'restore' }),
    );
  });

  it('Remove asks first; Cancel removes nothing, Delete removes it for everyone', async () => {
    await openPanel();
    await waitFor(() => expect(rows()).toHaveLength(2));
    fireEvent.click(within(rows()[1]).getByRole('button', { name: 'Remove' }));
    const dialog = await screen.findByRole('dialog', { name: 'Remove this for everyone?' });
    expect(h.rpc).not.toHaveBeenCalledWith('community_resolve_reports', expect.anything());

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Remove this for everyone?' })).toBeNull());
    expect(h.rpc).not.toHaveBeenCalledWith('community_resolve_reports', expect.anything());

    fireEvent.click(within(rows()[1]).getByRole('button', { name: 'Remove' }));
    const again = await screen.findByRole('dialog', { name: 'Remove this for everyone?' });
    fireEvent.click(within(again).getByRole('button', { name: 'Delete' }));
    await waitFor(() =>
      expect(h.rpc).toHaveBeenCalledWith('community_resolve_reports', { p_kind: 'post', p_id: 'p-1', p_action: 'remove' }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Remove this for everyone?' })).toBeNull());
  });

  it('opening Remove clears earlier toasts, so they cannot cover the confirm on a phone', async () => {
    await openPanel();
    await waitFor(() => expect(rows()).toHaveLength(2));
    h.queue = [HIDDEN_POST];
    fireEvent.click(within(rows()[0]).getByRole('button', { name: 'Dismiss' }));
    await waitFor(() => expect(screen.getByText('Reports dismissed')).toBeInTheDocument());
    await waitFor(() => expect(rows()).toHaveLength(1));

    fireEvent.click(within(rows()[0]).getByRole('button', { name: 'Remove' }));
    await screen.findByRole('dialog', { name: 'Remove this for everyone?' });
    await waitFor(() => expect(screen.queryByText('Reports dismissed')).toBeNull());
  });

  it('a failed decision keeps the row and says so', async () => {
    await openPanel();
    await waitFor(() => expect(rows()).toHaveLength(2));
    h.rpc.mockImplementation((fn) =>
      fn === 'community_resolve_reports' ? Promise.resolve({ data: null, error: { code: '42501', message: 'admins only' } }) : defaultRpc(fn),
    );
    fireEvent.click(within(rows()[0]).getByRole('button', { name: 'Dismiss' }));
    expect(await screen.findByText('Couldn’t update the reports — try again.')).toBeInTheDocument();
    expect(rows()).toHaveLength(2);
  });

  it('with no function yet (42883) the section is not shown', async () => {
    h.queueError = { code: '42883', message: 'function public.community_reported_queue() does not exist' };
    await openPanel();
    await waitFor(() => expect(screen.getByText('Flagged — waiting for a decision')).toBeInTheDocument());
    expect(screen.queryByRole('region', { name: 'Member reports' })).toBeNull();
    expect(screen.queryByText('Couldn’t load member reports — tap Refresh to try again.')).toBeNull();
  });

  it('any other load error says so in a toast', async () => {
    h.queueError = { code: '42501', message: 'admins only' };
    await openPanel();
    expect(await screen.findByText('Couldn’t load member reports — tap Refresh to try again.')).toBeInTheDocument();
  });

  it('an empty queue says there is nothing open', async () => {
    h.queue = [];
    await openPanel();
    expect(await screen.findByText('No open reports.')).toBeInTheDocument();
  });
});
