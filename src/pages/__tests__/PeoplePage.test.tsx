import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/*
 * p9 R17: each row formatted the birth date with toLocaleDateString(undefined, …)
 * — the device's language, not the app's — so a Japanese reader on a phone
 * set to English read 「ペット · Mar 15, 2024 · 時刻不明」. The app's language
 * is chosen in the app (the detector ignores the browser's).
 *
 * Checked in all four languages, so the test fails on any machine whatever
 * its own locale is (this runner's default is en-AU: "15 Mar 2024").
 */

const USER = { id: '00000000-0000-4000-8000-0000000000f1', email: 'qa@example.com' };
const listForUser = vi.fn();

vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: USER, profile: { isPremium: false } }) }));
vi.mock('../../dal', () => ({ people: { listForUser: (...a: unknown[]) => listForUser(...a) } }));
vi.mock('../../components/people/PersonForm', () => ({ PersonForm: () => null }));
vi.mock('../../components/people/FriendCircleStats', () => ({ FriendCircleStats: () => null }));

import i18n from '../../i18n/config';
import { PeoplePage } from '../PeoplePage';

const MOCHI = { id: 'p1', name: 'Mochi', relationship: 'pet', birthDate: '2024-03-15', birthTime: null };

describe('PeoplePage birth dates (p9 R17)', () => {
  beforeEach(() => {
    cleanup();
    listForUser.mockReset().mockResolvedValue({ ok: true, data: [MOCHI] });
  });
  afterAll(async () => {
    await i18n.changeLanguage('en');
  });

  it.each([
    ['ja', '2024年3月15日'],
    ['ko', '2024년 3월 15일'],
    ['zh', '2024年3月15日'],
    ['en', 'Mar 15, 2024'],
  ])('%s: the row dates the birthday in the app’s language', async (lng, date) => {
    await act(async () => { await i18n.changeLanguage(lng); });
    render(
      <MemoryRouter>
        <PeoplePage />
      </MemoryRouter>,
    );
    await screen.findByText('Mochi');
    expect(document.body.textContent).toContain(date);
  });
});
