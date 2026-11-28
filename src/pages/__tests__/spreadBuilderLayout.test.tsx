import { describe, it, expect, vi, afterEach, afterAll } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/*
 * tarot-16: on a 390 px phone every position field read "Position name
 * (e.g. The cha", and at 360–375 px the row was wider than its card, so the
 * remove button sat on the card's edge. The input is a flex item that never
 * shrank below its intrinsic width. It shrinks now (min-w-0), and its
 * placeholder is the short name alone; the example moved to a hint line.
 */

const chain: Record<string, unknown> = {};
for (const m of ['select', 'eq', 'order']) chain[m] = () => chain;
chain.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null });

vi.mock('../../lib/supabase', () => ({ supabase: { from: () => chain } }));
// One user object for every render: the page loads saved spreads in an effect keyed on `user`.
const USER = { id: '00000000-0000-4000-8000-0000000000f1' };
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: USER }) }));

import i18n from '../../i18n/config';
import { SpreadBuilderPage } from '../SpreadBuilderPage';

const mount = () =>
  render(
    <MemoryRouter>
      <SpreadBuilderPage />
    </MemoryRouter>,
  );

afterEach(() => cleanup());
afterAll(async () => {
  await i18n.changeLanguage('en');
});

describe('spread builder position-name field (tarot-16)', () => {
  it('can shrink inside its row and carries the short placeholder', async () => {
    await act(async () => {
      await i18n.changeLanguage('en');
    });
    mount();
    const inputs = await screen.findAllByPlaceholderText('Position name');
    expect(inputs).toHaveLength(3);
    for (const el of inputs) {
      const classes = el.className.split(/\s+/);
      expect(classes).toContain('flex-1');
      expect(classes).toContain('min-w-0');
    }
  });

  it('reads the short placeholder in Japanese', async () => {
    await act(async () => {
      await i18n.changeLanguage('ja');
    });
    mount();
    const inputs = await screen.findAllByPlaceholderText('位置の名前');
    expect(inputs).toHaveLength(3);
  });
});
