import { describe, it, expect, vi, afterAll, beforeEach } from 'vitest';
import { render, screen, act, waitFor, fireEvent, cleanup } from '@testing-library/react';

/*
 * Settings → Blocked members: every block, named or anonymous, and an
 * Unblock that asks first. An anonymous block never shows who it was (no
 * id, no name), only "Anonymous member" and the date.
 */

const listMyBlocks = vi.fn();
const unblock = vi.fn();
vi.mock('../../../dal', () => ({
  community: {
    listMyBlocks: (...a: unknown[]) => listMyBlocks(...a),
    unblock: (...a: unknown[]) => unblock(...a),
  },
}));

import i18n from '../../../i18n/config';
import { BlockedMembers } from '../BlockedMembers';

const year = new Date().getFullYear();
const BLOCKS = [
  { blockId: 'b-named', kind: 'named', blockedId: 'u-1', blockedDisplayName: 'Luna', createdAt: `${year}-10-17T03:00:00Z` },
  { blockId: 'b-noname', kind: 'named', blockedId: 'u-2', blockedDisplayName: null, createdAt: `${year}-10-16T03:00:00Z` },
  { blockId: 'b-anon', kind: 'anonymous', blockedId: null, blockedDisplayName: null, createdAt: `${year}-10-15T03:00:00Z` },
];

describe('BlockedMembers', () => {
  beforeEach(() => {
    cleanup();
    listMyBlocks.mockReset();
    unblock.mockReset();
  });
  afterAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('names a named block, says "A member" without a name, and only "Anonymous member" for an anonymous one', async () => {
    await act(async () => { await i18n.changeLanguage('en'); });
    listMyBlocks.mockResolvedValue({ ok: true, data: BLOCKS });
    render(<BlockedMembers userId="me" />);
    await waitFor(() => expect(screen.getByText('Luna')).toBeTruthy());
    expect(screen.getByText('A member')).toBeTruthy();
    expect(screen.getByText('Anonymous member')).toBeTruthy();
    expect(screen.getByText('Blocked Oct 15')).toBeTruthy();
    const text = document.body.textContent ?? '';
    for (const id of ['u-1', 'u-2', 'b-named', 'b-noname', 'b-anon']) expect(text).not.toContain(id);
    expect(listMyBlocks).toHaveBeenCalledWith('me');
  });

  it('asks before unblocking, then unblocks by the block id and drops the row', async () => {
    await act(async () => { await i18n.changeLanguage('en'); });
    listMyBlocks.mockResolvedValue({ ok: true, data: BLOCKS });
    unblock.mockResolvedValue({ ok: true, data: true });
    render(<BlockedMembers userId="me" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Unblock Anonymous member' }));
    // Nothing happens on the first tap: the confirmation is up.
    expect(unblock).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('dialog', { name: 'Unblock this member?' });
    fireEvent.click([...dialog.querySelectorAll('button')].find((b) => b.textContent === 'Unblock')!);
    await waitFor(() => expect(unblock).toHaveBeenCalledWith('b-anon'));
    await waitFor(() => expect(screen.queryByText('Anonymous member')).toBeNull());
    expect(screen.getByText('Luna')).toBeTruthy();
  });

  it('says when nothing is blocked, in the reader’s language, and offers a retry when the list fails', async () => {
    await act(async () => { await i18n.changeLanguage('ja'); });
    listMyBlocks.mockResolvedValue({ ok: true, data: [] });
    render(<BlockedMembers userId="me" />);
    await waitFor(() => expect(screen.getByText('ブロックしているメンバーはいません。')).toBeTruthy());
    cleanup();
    listMyBlocks.mockResolvedValue({ ok: false, error: 'offline' });
    render(<BlockedMembers userId="me" />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'もう一度' })).toBeTruthy());
  });
});
