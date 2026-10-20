import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, screen, act, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

/*
 * p10 d2-ja-06, on the card page: the correspondences read 'エレメント: 風',
 * an ASCII colon after the Japanese label (Chinese the same). The separator
 * is the language's (common:punctuation.labelSeparator): '：' in Japanese
 * and Chinese, ': ' in English and Korean.
 */

vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null }) }));
vi.mock('../../lib/supabase', () => ({
  supabase: { from: () => ({ insert: async () => ({ error: null }) }) },
}));
vi.mock('../../components/oracle/AskOracleButton', () => ({ AskOracleButton: () => null }));

import i18n from '../../i18n/config';
import { TarotCardMeaningPage } from '../TarotCardMeaningPage';

beforeAll(() => {
  window.scrollTo = (() => {}) as typeof window.scrollTo;
});
afterEach(async () => {
  cleanup();
  await act(async () => {
    await i18n.changeLanguage('en');
  });
});

describe.each([
  ['ja', '愚者', ['エレメント：風', '惑星：天王星', 'ヘブライ文字：アレフ']],
  ['zh', '愚者', ['元素：风', '行星：天王星', '希伯来字母：阿列夫（Aleph）']],
  ['ko', '바보', ['원소: 공기', '행성: 천왕성', '히브리 문자: 알레프']],
  ['en', 'The Fool', ['Element: Air', 'Planet: Uranus', 'Hebrew letter: Aleph']],
] as const)('The Fool’s correspondences in %s', (lng, name, lines) => {
  it(`read ${lines.join(' / ')}`, { timeout: 20_000 }, async () => {
    await act(async () => {
      await i18n.changeLanguage(lng);
    });
    render(
      <MemoryRouter initialEntries={['/tarot-meanings/the-fool']}>
        <Routes>
          <Route path="/tarot-meanings/:slug" element={<TarotCardMeaningPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe(name);
    fireEvent.click(screen.getByRole('button', { name: i18n.t('app:cardMeaning.correspondences') }));
    const list = (await screen.findByRole('heading', { name: i18n.t('app:cardMeaning.astrology') })).nextElementSibling!;
    // In ja / ko / zh the planet and the letter come from the 'enrichment' overlay, loaded on demand.
    await waitFor(() => expect([...list.querySelectorAll('li')].map((li) => li.textContent)).toEqual(lines), { timeout: 4000 });
  });
});
