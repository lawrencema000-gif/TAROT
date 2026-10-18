import { describe, it, expect, vi, afterEach, afterAll } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';

/*
 * p9 QU1 R-e: the cost line's balance, 「所持：250個」, is one word run
 * together with a number. Set as plain text at the end of a sentence it
 * broke 「所/持：250個」 when the line ran out. It stays whole on its line
 * (whitespace-nowrap) and moves to the next one as a unit, after the " · ".
 */

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: '00000000-0000-4000-8000-0000000000c1' }, profile: { isPremium: false } }),
}));
vi.mock('../../dal', () => ({ moonstones: { getBalance: async () => ({ ok: true, data: 250 }) } }));
vi.mock('../../dal/moonstoneSpend', () => ({ ACTION_COST: 50, onBalanceChange: () => () => {} }));

import i18n from '../../i18n/config';
import { MoonstoneCostLine } from './MoonstoneCostLine';

afterEach(() => cleanup());
afterAll(async () => {
  await act(async () => { await i18n.changeLanguage('en'); });
});

const classes = (el: Element) => el.className.split(/\s+/).filter(Boolean);

describe('MoonstoneCostLine: the balance stays whole (QU1 R-e)', () => {
  it.each(['ja', 'ko', 'zh', 'en'])('%s: the "you have" span is one unbreakable unit with tabular figures', async (lng) => {
    await act(async () => { await i18n.changeLanguage(lng); });
    render(<MoonstoneCostLine />);
    const balance = await screen.findByText(i18n.t('app:moonstones.youHave', { n: 250 }));
    expect(balance.tagName).toBe('SPAN');
    expect(classes(balance)).toEqual(expect.arrayContaining(['whitespace-nowrap', 'tabular-nums']));
    if (lng === 'ja') expect(balance.textContent).toBe('所持：250個');
  });
});
