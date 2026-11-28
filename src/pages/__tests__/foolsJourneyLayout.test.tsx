import { describe, it, expect, vi, afterEach, afterAll } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/*
 * WP-P1-24 (gap-1-13) stopgap: /journey printed the raw profile level
 * ("Level 23 of 22") although the page clamps the journey to 22, and every
 * row truncated its title and theme to one line (19 of 22 themes cut at
 * 390 px). The label reads the clamped level and the rows wrap to two lines.
 */

const USER = { id: '00000000-0000-4000-8000-0000000000b1' };
const auth = { user: USER, profile: { level: 23, seekerRank: 'Adept' } };
vi.mock('../../lib/supabase', () => ({ supabase: {} }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }));

import i18n from '../../i18n/config';
import { FoolsJourneyPage } from '../FoolsJourneyPage';

afterEach(() => cleanup());
afterAll(async () => {
  await i18n.changeLanguage('en');
});

describe("the Fool's Journey stopgap (gap-1-13)", () => {
  it('never shows a level above 22 and wraps every row instead of truncating it', async () => {
    await act(async () => {
      await i18n.changeLanguage('en');
    });
    render(
      <MemoryRouter>
        <FoolsJourneyPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Level 22 of 22')).toBeTruthy();
    expect(screen.queryByText('Level 23 of 22')).toBeNull();

    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(22);
    for (const row of rows) {
      const title = row.querySelector('h2')!;
      const theme = row.querySelector('h2 + p')!;
      for (const el of [title, theme]) {
        const classes = el.className.split(/\s+/);
        expect(classes).not.toContain('truncate');
        expect(classes).toContain('line-clamp-2');
      }
    }
  });
});
