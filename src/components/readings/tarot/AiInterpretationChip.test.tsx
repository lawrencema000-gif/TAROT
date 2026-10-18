import { describe, it, expect, vi, afterEach, afterAll } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';

/*
 * p9 QZ-5: the AI chip's price line ends with the reader's balance,
 * 「所持：250個」 — one word run together with a number. Set as plain text it
 * broke 「所/持」 when the line ran out, as the cost line's did before QU1 R-e
 * (MoonstoneCostLine.test.tsx). It stays whole on its line (whitespace-nowrap)
 * and moves to the next one as a unit, after the " · ".
 */

let balance = 250;
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: '00000000-0000-4000-8000-0000000000c2' }, profile: { isPremium: false } }),
}));
vi.mock('../../../dal', () => ({ moonstones: { getBalance: async () => ({ ok: true, data: balance }) } }));
vi.mock('../../../dal/moonstoneSpend', () => ({ ACTION_COST: 50, onBalanceChange: () => () => {} }));

import i18n from '../../../i18n/config';
import { AiInterpretationChip } from './AiInterpretationChip';

afterEach(() => {
  cleanup();
  balance = 250;
});
afterAll(async () => {
  await act(async () => { await i18n.changeLanguage('en'); });
});

const classes = (el: Element) => el.className.split(/\s+/).filter(Boolean);

describe('AiInterpretationChip: the balance stays whole (p9 QZ-5)', () => {
  it.each(['ja', 'ko', 'zh', 'en'])('%s: the "you have" span is one unbreakable unit with tabular figures', async (lng) => {
    await act(async () => { await i18n.changeLanguage(lng); });
    render(<AiInterpretationChip isPremium={false} loading={false} onClick={() => {}} />);
    const held = await screen.findByText(i18n.t('app:moonstones.youHave', { n: 250 }));
    expect(held.tagName).toBe('SPAN');
    expect(classes(held)).toEqual(expect.arrayContaining(['whitespace-nowrap', 'tabular-nums']));
    expect(classes(held)).not.toContain('text-coral');
    if (lng === 'ja') expect(held.textContent).toBe('所持：250個');
  });

  it('a balance under the price is still one unit, in coral', async () => {
    balance = 20;
    await act(async () => { await i18n.changeLanguage('ja'); });
    render(<AiInterpretationChip isPremium={false} loading={false} onClick={() => {}} />);
    const held = await screen.findByText('所持：20個');
    expect(classes(held)).toEqual(expect.arrayContaining(['whitespace-nowrap', 'tabular-nums', 'text-coral']));
  });

  it('a premium reader is not charged: no price, no balance', async () => {
    await act(async () => { await i18n.changeLanguage('ja'); });
    render(<AiInterpretationChip isPremium loading={false} onClick={() => {}} />);
    await act(async () => {});
    expect(screen.queryByText('所持：250個')).toBeNull();
  });
});
