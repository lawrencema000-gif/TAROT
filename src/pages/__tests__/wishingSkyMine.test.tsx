import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Wish, WishLinkPair } from '../../dal/wishes';

/*
 * WP-P0-03 (social-ai-03): the Wishing Sky no longer receives account ids.
 * "yours", the echo state and the echo lines come from the server's
 * is_mine / echoed_by_me and wish_sky_links, and the echo, offer and report
 * controls follow them.
 */

const ME = '00000000-0000-4000-8000-00000000000a';

type EchoFn = (wishId: string, userId: string) => Promise<{ ok: true; data: true }>;

const h = vi.hoisted(() => {
  const state = {
    sky: [] as Wish[],
    pairs: [] as WishLinkPair[],
    skyProps: [] as Array<{ links: unknown[]; myWishIds: Set<string> }>,
  };
  return {
    state,
    listLinks: vi.fn(async () => ({ ok: true as const, data: state.pairs })),
    echo: vi.fn<EchoFn>(async () => ({ ok: true as const, data: true as const })),
    unecho: vi.fn<EchoFn>(async () => ({ ok: true as const, data: true as const })),
  };
});

vi.mock('../../components/wishes/WishSky', () => ({
  WishSky: (props: { links: unknown[]; myWishIds: Set<string> }) => {
    h.state.skyProps.push({ links: props.links, myWishIds: props.myWishIds });
    return <div data-testid="wish-sky" />;
  },
}));
vi.mock('../../lib/supabase', () => ({ supabase: {} }));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: '00000000-0000-4000-8000-00000000000a', email: 'me@example.com' }, profile: null }),
}));
vi.mock('../../dal', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../dal')>();
  return {
    ...actual,
    wishes: {
      ...actual.wishes,
      listSky: async () => ({ ok: true as const, data: h.state.sky }),
      listLinks: h.listLinks,
      echo: h.echo,
      unecho: h.unecho,
    },
  };
});

import { WishingSkyPage } from '../WishingSkyPage';

function wish(over: Partial<Wish>): Wish {
  return {
    id: 'w', text: 'A wish', theme: 'other', starX: 0.5, starY: 0.5, starSeed: 1, openToHelp: false,
    wisherLabel: null, grantedAt: null, echoCount: 0, createdAt: '2026-11-27T00:00:00Z',
    isMine: false, echoedByMe: false, ...over,
  };
}

const MINE = wish({ id: 'w-mine', text: 'My own wish', isMine: true, createdAt: '2026-11-27T01:00:00Z' });
const OTHER = wish({ id: 'w-other', text: 'Their wish', openToHelp: true });

function renderPage() {
  return render(<MemoryRouter><WishingSkyPage /></MemoryRouter>);
}

/** The row in "Recent wishes" that holds `text`. */
const row = (text: string) => screen.getByText(text, { selector: 'button p' }).closest('button') as HTMLElement;

beforeEach(() => {
  h.state.sky = [MINE, OTHER];
  h.state.pairs = [{ fromWishId: 'w-mine', toWishId: 'w-other' }];
  h.state.skyProps = [];
  h.listLinks.mockClear();
  h.echo.mockClear();
  h.unecho.mockClear();
});
afterEach(cleanup);

describe('the Wishing Sky reads "yours" and echoes from the server', () => {
  it('marks only the member’s own wish as yours, and draws the server’s line', async () => {
    renderPage();
    await screen.findByText('Their wish', { selector: 'button p' });
    expect(within(row('My own wish')).queryByText(/yours/)).not.toBeNull();
    expect(within(row('Their wish')).queryByText(/yours/)).toBeNull();
    await waitFor(() => expect(h.state.skyProps.at(-1)?.links).toHaveLength(1));
    expect([...h.state.skyProps.at(-1)!.myWishIds]).toEqual(['w-mine']);
  });

  it('offers echo, help and report on someone else’s wish, and echoing links the stars', async () => {
    renderPage();
    await screen.findByText('Their wish', { selector: 'button p' });
    await waitFor(() => expect(h.listLinks).toHaveBeenCalledTimes(1));
    fireEvent.click(row('Their wish'));
    const echoButton = await screen.findByRole('button', { name: /I wish this too/ });
    expect(screen.getByRole('button', { name: /Offer to help/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Report this wish/ })).toBeTruthy();
    expect(screen.queryByText('This one is yours.')).toBeNull();

    fireEvent.click(echoButton);
    expect(h.echo).toHaveBeenCalledWith('w-other', ME);
    expect(await screen.findByRole('button', { name: /Echoed/ })).toBeTruthy();
    expect(screen.getByText('Your star and theirs are linked in the sky now.')).toBeTruthy();
    await waitFor(() => expect(h.listLinks).toHaveBeenCalledTimes(2));
  });

  it('says a member’s own wish is theirs, with no echo button', async () => {
    renderPage();
    await screen.findByText('My own wish', { selector: 'button p' });
    fireEvent.click(row('My own wish'));
    expect(await screen.findByText('This one is yours.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /I wish this too/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Echoed/ })).toBeNull();
  });

  it('asks for no lines when the sky holds a single star', async () => {
    h.state.sky = [MINE];
    renderPage();
    await screen.findByText('My own wish', { selector: 'button p' });
    // Give any pending effect a chance to run.
    await new Promise((r) => setTimeout(r, 20));
    expect(h.listLinks).not.toHaveBeenCalled();
  });
});
