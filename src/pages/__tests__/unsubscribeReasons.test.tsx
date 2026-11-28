import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

/*
 * p12 gap-1-17: a well-formed unsubscribe token that belongs to nobody read
 * "Already unsubscribed — No further emails will be sent.", a false
 * reassurance in an opt-out flow. newsletter_unsubscribe now answers
 * `already_unsubscribed` for a token a row holds and `unknown_token` for one
 * nobody holds (WP-P5-03); the page shows "Already unsubscribed" only for the
 * first, and "Link not recognised" for the second, for the old combined
 * reason and for anything it does not know.
 */

const rpc = vi.hoisted(() => vi.fn());
vi.mock('../../lib/supabase', () => ({ supabase: { rpc } }));

import i18n from '../../i18n/config';
import { UnsubscribePage } from '../UnsubscribePage';

const TOKEN = '00000000-0000-4000-8000-000000000000';

async function openWith(data: unknown, lng: 'en' | 'ja' = 'en') {
  await act(async () => { await i18n.changeLanguage(lng); });
  rpc.mockReset();
  rpc.mockResolvedValue({ data, error: null });
  render(
    <MemoryRouter initialEntries={[`/unsubscribe?token=${TOKEN}`]}>
      <Routes><Route path="/unsubscribe" element={<UnsubscribePage />} /></Routes>
    </MemoryRouter>,
  );
  const heading = await screen.findByRole('heading', { level: 1 });
  expect(rpc).toHaveBeenCalledWith('newsletter_unsubscribe', { p_token: TOKEN });
  return heading.textContent;
}

afterEach(async () => {
  cleanup();
  await act(async () => { await i18n.changeLanguage('en'); });
});

describe('the unsubscribe page reads the reason it is given (gap-1-17)', () => {
  it('a second click on a real link: Already unsubscribed', async () => {
    expect(await openWith({ ok: false, reason: 'already_unsubscribed' })).toBe('Already unsubscribed');
  });

  it.each(['unknown_token', 'unknown_or_already_unsubscribed', 'something_new'])('%s: Link not recognised', async (reason) => {
    expect(await openWith({ ok: false, reason })).toBe('Link not recognised');
  });

  it('a token that matched: You’re unsubscribed', async () => {
    expect(await openWith({ ok: true, email: 'luna@example.com' })).toBe('You’re unsubscribed');
  });

  it('Japanese: a token that belongs to nobody is not "already unsubscribed"', async () => {
    expect(await openWith({ ok: false, reason: 'unknown_token' }, 'ja')).toBe('リンクを確認できませんでした');
  });
});
