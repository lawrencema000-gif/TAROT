import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, screen, act, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

/*
 * The playing-card pages joined a card's keywords with ", " in every
 * language, so the Japanese and Chinese tab description read
 * 「トランプ占いにおけるハートのエース：愛, 喜び, …」. They take the reader's list
 * separator now (cardMeaning.listSeparator), as the tarot card pages do;
 * English reads as before.
 */

vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null }) }));
vi.mock('../../lib/supabase', () => ({
  supabase: { from: () => ({ insert: async () => ({ error: null }) }) },
}));

import i18n from '../../i18n/config';
import { CartomancyCardPage } from '../CartomancyCardPage';

const description = () => document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';

async function openCard(lng: string) {
  await act(async () => {
    await i18n.changeLanguage(lng);
  });
  render(
    <MemoryRouter initialEntries={['/cartomancy/cards/ace-of-hearts']}>
      <Routes>
        <Route path="/cartomancy/cards/:slug" element={<CartomancyCardPage />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { level: 1 });
}

beforeAll(() => {
  window.scrollTo = (() => {}) as typeof window.scrollTo;
});
afterEach(async () => {
  cleanup();
  await act(async () => {
    await i18n.changeLanguage('en');
  });
});

describe('CartomancyCardPage: the description lists keywords as the language does', () => {
  it('English: ", " between keywords, as before', async () => {
    await openCard('en');
    await waitFor(() => expect(description()).toMatch(/^Ace of Hearts in playing-card reading: \w[^.]*, \w/));
  });

  it.each(['ja', 'zh'])('%s: 、 between keywords, never ", "', async (lng) => {
    await openCard(lng);
    await waitFor(() => expect(description()).toMatch(/、/));
    // The keywords have arrived in the reader's language (no English left).
    await waitFor(() => expect(description()).not.toMatch(/[A-Za-z]{3,}/));
    expect(description()).not.toContain(', ');
  });
});
