import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

/*
 * p10 d2-ja-06, on a compatibility invite's result: "What you shared" put an
 * ASCII colon after each name ('あなた: …') and showed the sun sign as its
 * id ('aries'). The separator is the language's
 * (common:punctuation.labelSeparator): '：' in Japanese and Chinese, ': ' in
 * English and Korean; the sign is named in the reader's language.
 */

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'responder' }, profile: { birthDate: '1991-03-08', displayName: null } }),
}));
vi.mock('../../dal', () => ({
  compatInvites: {
    fetchPublicByCode: async () => ({
      ok: true,
      data: { id: 'i1', code: 'abc', kind: 'zodiac', inviter_name: 'Hana', inviter_user_id: 'inviter', created_at: '', expires_at: '' },
    }),
    respond: async () => ({
      ok: true,
      data: {
        kind: 'zodiac',
        inviter_name: 'Hana',
        responder_name: null,
        inviter_result: { birthDate: '1990-04-01' },
        responder_result: { birthDate: '1991-03-08' },
      },
    }),
  },
}));

import i18n from '../../i18n/config';
import { CompatInvitePage } from '../CompatInvitePage';

afterEach(async () => {
  cleanup();
  await act(async () => {
    await i18n.changeLanguage('en');
  });
});

describe.each([
  ['ja', ['Hana：牡羊座', 'あなた：魚座']],
  ['zh', ['Hana：白羊座', '你：双鱼座']],
  ['ko', ['Hana: 양자리', '당신: 물고기자리']],
  ['en', ['Hana: Aries', 'You: Pisces']],
] as const)('What you shared, in %s', (lng, lines) => {
  it(`reads ${lines.join(' / ')}`, { timeout: 20_000 }, async () => {
    await act(async () => {
      await i18n.changeLanguage(lng);
    });
    render(
      <MemoryRouter initialEntries={['/invite/abc']}>
        <Routes>
          <Route path="/invite/:code" element={<CompatInvitePage />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole('button', { name: i18n.t('app:compatInvite.reveal') }));
    const card = (await screen.findByText(i18n.t('app:compatInvite.yourSides'))).parentElement!;
    expect([...card.querySelectorAll('p.text-meta')].map((p) => p.textContent)).toEqual(lines);
  });
});
