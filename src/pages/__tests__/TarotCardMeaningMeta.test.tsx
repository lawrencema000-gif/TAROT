import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

/*
 * p10 d2-ja-10: the tarot card pages titled themselves with English
 * templates around the localized name — "愚者 Tarot Card Meaning — Major
 * Arcana", "愚者 tarot meaning: 新しい始まり, … Upright and reversed
 * interpretations…" — under a Japanese page, where the playing-card pages
 * are Japanese throughout. The tab title and description now read in the
 * reader's language; English reads exactly as before (the prerendered head
 * the crawlers get is English and untouched).
 */

vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null }) }));
vi.mock('../../lib/supabase', () => ({
  supabase: { from: () => ({ insert: async () => ({ error: null }) }) },
}));
vi.mock('../../components/oracle/AskOracleButton', () => ({ AskOracleButton: () => null }));

import i18n from '../../i18n/config';
import { TarotCardMeaningPage } from '../TarotCardMeaningPage';

async function openCard(lng: string, slug: string, name: string) {
  await act(async () => {
    await i18n.changeLanguage(lng);
  });
  render(
    <MemoryRouter initialEntries={[`/tarot-meanings/${slug}`]}>
      <Routes>
        <Route path="/tarot-meanings/:slug" element={<TarotCardMeaningPage />} />
      </Routes>
    </MemoryRouter>,
  );
  expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe(name);
  return {
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '',
  };
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

describe('TarotCardMeaningPage: the tab title and description (p10 d2-ja-10)', () => {
  it('English reads as it always has', async () => {
    expect(await openCard('en', 'the-fool', 'The Fool')).toEqual({
      title: 'The Fool Tarot Card Meaning — Major Arcana | Arcana',
      description: 'The Fool tarot meaning: New beginnings, Innocence, Spontaneity, Free spirit. Upright and reversed interpretations, love, career, yes/no readings.',
    });
    cleanup();
    const minor = await openCard('en', 'three-of-wands', 'Three of Wands');
    expect(minor.title).toBe('Three of Wands Tarot Card Meaning — Wands | Arcana');
  });

  // Needs the p10 locale delta (tarot.seo.cardTitle and tarot.seo.cardDesc in ja/ko/zh).
  it.each([
    ['ja', 'the-fool', '愚者', '大アルカナ', ['新しい始まり', '無邪気さ', '自発性', '自由な精神'], '、'],
    ['ko', 'the-fool', '바보', '메이저 아르카나', ['새로운 시작', '순수함', '자발성', '자유로운 영혼'], ', '],
    ['zh', 'the-fool', '愚者', '大阿卡纳', ['新的开始', '纯真', '自发性', '自由精神'], '、'],
    ['ja', 'three-of-wands', 'ワンドの3', 'ワンド', null, '、'],
  ])('%s %s: title and description in the reader’s language', async (lng, slug, name, group, keywords, separator) => {
    const { title, description } = await openCard(lng, slug, name);
    expect(title).toContain(name);
    expect(title).toContain(group);
    expect(title).toMatch(/ \| Arcana$/);
    expect(title).not.toMatch(/Tarot Card Meaning|Major Arcana/);
    expect(description).toContain(name);
    expect(description).not.toMatch(/tarot meaning|Upright and reversed|love, career/);
    if (keywords) expect(description).toContain(keywords.join(separator));
  });
});
