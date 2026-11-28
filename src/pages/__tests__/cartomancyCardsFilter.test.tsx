import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, screen, act, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

/*
 * /cartomancy/cards: the filter (cartomancy-17). A rank as the corners print
 * it (A, 2–10, J, Q, K, and 1 for the ace) or a rank word finds exactly the
 * cards of that rank, in every language and inside the selected tab; other
 * English words match at the start of a word; Japanese and Korean words
 * still match anywhere. The expected lists come from the card text itself
 * (cards.en.ts and the ja/ko cartomancy.json), computed outside the app.
 */

vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null }) }));
vi.mock('../../lib/supabase', () => ({
  supabase: { from: () => ({ insert: async () => ({ error: null }) }) },
}));

import i18n from '../../i18n/config';
import { CartomancyCardsPage } from '../CartomancyCardsPage';

const SUITS_EN = ['Hearts', 'Clubs', 'Diamonds', 'Spades'];
const fourEn = (rank: string) => SUITS_EN.map((s) => `${rank} of ${s}`);
const SUITS_JA = ['ハート', 'クラブ', 'ダイヤ', 'スペード'];
const fourJa = (rank: string) => SUITS_JA.map((s) => `${s}の${rank}`);
const SUITS_KO = ['하트', '클로버', '다이아몬드', '스페이드'];
const fourKo = (rank: string) => SUITS_KO.map((s) => `${s} ${rank}`);

async function openPage(lng: string) {
  await act(async () => {
    await i18n.changeLanguage(lng);
  });
  render(
    <MemoryRouter initialEntries={['/cartomancy/cards']}>
      <Routes>
        <Route path="/cartomancy/cards" element={<CartomancyCardsPage />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByRole('searchbox', {}, { timeout: 3000 });
}

/** The tiles' names, in the order shown. */
function shown(): string[] {
  return Array.from(document.querySelectorAll('ul[role="list"] a[aria-label]')).map((a) => a.getAttribute('aria-label') ?? '');
}

async function typeQuery(q: string) {
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: q } });
  await act(() => new Promise((r) => setTimeout(r, 160)));
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

describe('CartomancyCardsPage filter: English', () => {
  it.each<[string, string[]]>([
    ['7', fourEn('Seven')],
    ['10', fourEn('Ten')],
    ['K', fourEn('King')],
    ['k', fourEn('King')],
    ['A', fourEn('Ace')],
    ['1', fourEn('Ace')],
    ['J', fourEn('Jack')],
    ['Q', fourEn('Queen')],
    ['ten', fourEn('Ten')],
    ['king', fourEn('King')],
    ['kings', fourEn('King')],
    ['seven', fourEn('Seven')],
    ['７', fourEn('Seven')],
    ['Ｋ', fourEn('King')],
    ['money', ['Ten of Clubs', 'Ace of Diamonds', 'Six of Diamonds', 'Seven of Diamonds', 'King of Diamonds']],
    ['work', ['Ace of Clubs', 'Two of Clubs', 'Seven of Clubs', 'Eight of Clubs', 'Ten of Clubs', 'Eight of Diamonds']],
    ['bad luck', ['Nine of Spades']],
    ['joker', ['Red Joker', 'Black Joker']],
  ])('“%s”', async (q, expected) => {
    await openPage('en');
    expect(shown()).toHaveLength(54);
    await typeQuery(q);
    expect(shown()).toEqual(expected);
  });

  it('a rank applies inside the selected tab', async () => {
    await openPage('en');
    fireEvent.click(screen.getByRole('tab', { name: 'Hearts' }));
    await typeQuery('7');
    expect(shown()).toEqual(['Seven of Hearts']);

    fireEvent.click(screen.getByRole('tab', { name: 'Courts' }));
    await typeQuery('K');
    expect(shown()).toEqual(fourEn('King'));

    fireEvent.click(screen.getByRole('tab', { name: 'Jokers' }));
    await typeQuery('7');
    expect(shown()).toEqual([]);
    expect(screen.getByText('No card matches that')).toBeInTheDocument();
  });
});

describe('CartomancyCardsPage filter: Japanese and Korean', () => {
  it.each<[string, string[]]>([
    ['K', fourJa('キング')],
    ['A', fourJa('エース')],
    ['J', fourJa('ジャック')],
    ['Q', fourJa('クイーン')],
    ['7', fourJa('7')],
    ['キング', fourJa('キング')],
    ['お金', ['ダイヤのエース', 'ダイヤの6', 'ダイヤの7', 'ダイヤのキング']],
  ])('ja “%s”', async (q, expected) => {
    await openPage('ja');
    await waitFor(() => expect(shown()[0]).toBe('ハートのエース'), { timeout: 3000 });
    await typeQuery(q);
    expect(shown()).toEqual(expected);
  });

  it.each<[string, string[]]>([
    ['K', fourKo('킹')],
    ['킹', fourKo('킹')],
    ['사랑', ['하트 에이스', '다이아몬드 6']],
  ])('ko “%s”', async (q, expected) => {
    await openPage('ko');
    await waitFor(() => expect(shown()[0]).toBe('하트 에이스'), { timeout: 3000 });
    await typeQuery(q);
    expect(shown()).toEqual(expected);
  });
});
