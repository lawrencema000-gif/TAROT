import { describe, it, expect, vi, afterAll, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

/*
 * Home's hero and Moonstone widget (p8):
 *  - F72: the page title is punctuated by the language (no Latin "." after
 *    a Japanese greeting or name) and is never cut with an ellipsis;
 *  - F59/F80: the balance is set in Inter with tabular, lining figures;
 *  - F56: once claimed, the widget says when the next claim opens.
 */

const USER = { id: '00000000-0000-4000-8000-0000000000d3' };
let checkedIn = true;

vi.mock('../../lib/supabase', () => ({ supabase: {} }));
vi.mock('../../utils/telemetry', () => ({ captureException: () => {} }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: USER, profile: { isPremium: false } }) }));
vi.mock('../../dal', () => ({
  moonstones: {
    getBalance: async () => ({ ok: true, data: 100 }),
    hasCheckedInToday: async () => ({ ok: true, data: checkedIn }),
    doDailyCheckin: async () => ({ ok: true, data: { amountAwarded: 0, streakDay: 1, isStreakContinuation: false, alreadyCheckedIn: true } }),
  },
}));
vi.mock('../../dal/moonstoneSpend', () => ({ onBalanceChange: () => () => {} }));
vi.mock('../moonstones/EarnMoonstonesSheet', () => ({ EarnMoonstonesSheet: () => null }));

import i18n from '../../i18n/config';
import { HomeHero } from './HomeHero';
import { MoonstoneWidget } from './MoonstoneWidget';
import '@testing-library/jest-dom/vitest';

const hero = (greeting: string, name?: string) => (
  <HomeHero
    greeting={greeting}
    name={name}
    started={false}
    progress={{ horoscope: false, tarot: false, prompt: false }}
    progressLabel=""
    title="Today’s ritual"
    cta="Start"
    onStart={() => {}}
  />
);

afterEach(() => cleanup());
afterAll(async () => {
  await i18n.changeLanguage('en');
});

describe('the hero title (F72)', () => {
  it('en: "Good morning." and "Sakura." keep the house period', async () => {
    await i18n.changeLanguage('en');
    render(hero('Good morning'));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^Good morning\.$/);
    cleanup();
    render(hero('Good morning', 'Sakura'));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^Sakura\.$/);
  });

  it('ja: no Latin period; a name is addressed with さん', async () => {
    await i18n.changeLanguage('ja');
    render(hero('おはようございます'));
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent(/^おはようございます$/);
    // Never truncated with an ellipsis: it steps down a size, then wraps.
    expect(h1.className).not.toMatch(/\btruncate\b/);
    cleanup();
    render(hero('おはようございます', 'さくら'));
    // The honorific follows the name directly: 「さくらさん」, not 「さくら さん」 (QA Q34).
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^さくらさん$/);
  });

  it('ko and zh: their own punctuation', async () => {
    await i18n.changeLanguage('ko');
    render(hero('좋은 아침이에요', '사쿠라'));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^사쿠라님$/);
    cleanup();
    await i18n.changeLanguage('zh');
    render(hero('早上好'));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^早上好$/);
  });
});

describe('the Moonstone widget', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('sets the balance in Inter with lining, tabular figures (F59/F80)', async () => {
    checkedIn = true;
    render(<MoonstoneWidget />);
    const n = await screen.findByText('100');
    expect(n.className).toMatch(/\bfont-body\b/);
    expect(n.className).toMatch(/\btabular-nums\b/);
    expect(n.className).toMatch(/\blining-nums\b/);
    expect(n.className).not.toMatch(/heading-display/);
  });

  it('once claimed, says when the next claim opens instead of "Come back tomorrow" (F56)', async () => {
    checkedIn = true;
    render(<MoonstoneWidget />);
    // The opening is UTC midnight on this machine's clock: "Next claim [tomorrow] at h:mm", or
    // "Come back tomorrow" only where UTC midnight is local midnight.
    const offsetIsZero = new Date().getTimezoneOffset() === 0;
    const line = await screen.findByText(offsetIsZero ? /^Come back tomorrow$/ : /^Next claim (tomorrow )?at \d{1,2}:\d{2}( [AP]M)?$/);
    expect(line).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Claim daily/ })).not.toBeInTheDocument();
  });

  it('offers the claim, under the balance, while it is open', async () => {
    checkedIn = false;
    render(<MoonstoneWidget />);
    const claim = await screen.findByRole('button', { name: /Claim daily/ });
    // In the balance column, not squeezed into the row beside the label and "+".
    expect(claim.parentElement).toBe(screen.getByText('100').parentElement);
  });
});
