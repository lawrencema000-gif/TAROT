import { describe, it, expect, afterAll } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import i18n from '../../../i18n/config';
import { readingsDone, formatUnlockDate } from '../achievementFigures';
import { AchievementCard } from '../AchievementCard';
import { AchievementStats } from '../AchievementStats';
import type { AchievementWithProgress } from '../../../services/achievements';

function badge(over: Partial<AchievementWithProgress>): AchievementWithProgress {
  return {
    id: over.id ?? 'a',
    name: 'Apprentice Reader',
    description: 'Complete 10 readings and hone your intuition.',
    icon_name: 'eye',
    category: 'mastery',
    rarity: 'common',
    xp_reward: 50,
    unlock_condition: { activity_type: 'reading_complete', target: 10 },
    is_premium_only: false,
    is_hidden: false,
    sort_order: 1,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    progress: 0,
    target: 10,
    unlocked_at: null,
    notified: true,
    ...over,
  };
}

const reading = (target: number, progress: number, unlocked = false) =>
  badge({
    id: `r${target}`,
    unlock_condition: { activity_type: 'reading_complete', target },
    target,
    progress,
    unlocked_at: unlocked ? '2026-10-07T10:00:00Z' : null,
  });

/**
 * The Readings tile counts what the reading badges count (p8 F64): it read
 * profiles.total_readings, the SAVED tarot readings, so two tarot and two
 * playing-card readings showed "Readings 2" above "Apprentice Reader 4/10".
 */
describe('readingsDone', () => {
  it('is the progress the locked reading badges carry', () => {
    // Card Curious (1) unlocked; 10/50/100/500 locked at the ledger count 4.
    const list = [reading(1, 1, true), reading(10, 4), reading(50, 4), reading(100, 4), reading(500, 4)];
    expect(readingsDone(list)).toEqual({ count: 4, atLeast: false });
  });

  it('ignores the other badges', () => {
    const journal = badge({ id: 'j', unlock_condition: { activity_type: 'journal_entry', target: 10 }, progress: 9 });
    expect(readingsDone([journal, reading(10, 3)])).toEqual({ count: 3, atLeast: false });
    expect(readingsDone([journal])).toBeNull();
    expect(readingsDone([])).toBeNull();
  });

  it('never reads below an unlocked badge, and is a floor once all are unlocked', () => {
    expect(readingsDone([reading(1, 1, true), reading(10, 0)])).toEqual({ count: 1, atLeast: false });
    expect(readingsDone([reading(1, 1, true), reading(500, 500, true), reading(10, 10, true)]))
      .toEqual({ count: 500, atLeast: true });
  });
});

describe('formatUnlockDate', () => {
  const now = new Date('2026-10-17T12:00:00');
  it('is month and day this year, in the locale', () => {
    expect(formatUnlockDate('2026-10-07T12:00:00', 'en-US', now)).toBe('Oct 7');
    expect(formatUnlockDate('2026-10-07T12:00:00', 'ja', now)).toBe('10月7日');
    expect(formatUnlockDate('2026-10-07T12:00:00', 'ko', now)).toBe('10월 7일');
    expect(formatUnlockDate('2026-10-07T12:00:00', 'zh-CN', now)).toBe('10月7日');
  });
  it('adds the year for an earlier year, and is empty for a bad value', () => {
    expect(formatUnlockDate('2025-12-28T12:00:00', 'en-US', now)).toBe('Dec 28, 2025');
    expect(formatUnlockDate('2025-12-28T12:00:00', 'ja', now)).toBe('2025年12月28日');
    expect(formatUnlockDate('not a date', 'en-US', now)).toBe('');
  });
});

describe('achievement surfaces', () => {
  afterAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('a Premium badge a free member has not unlocked shows its name, description and the pill (p8 F63)', async () => {
    await act(async () => {
      await i18n.changeLanguage('en');
    });
    const premium = badge({
      name: 'Spread Explorer',
      description: 'Experience all tarot spread types: single, three-card, and Celtic Cross.',
      is_premium_only: true,
      unlock_condition: { activity_type: 'spread_types_used', target: 3 },
      target: 3,
    });
    const { container } = render(<AchievementCard achievement={premium} isPremium={false} />);
    expect(screen.getByRole('heading', { name: 'Spread Explorer' })).toBeTruthy();
    expect(screen.getByText(/Experience all tarot spread types/)).toBeTruthy();
    expect(screen.getByText('Premium')).toBeTruthy();
    // No panel laid over the card any more, and no progress bar for it.
    expect(container.querySelector('.absolute.inset-0')).toBeNull();
    expect(container.querySelector('[role="progressbar"]')).toBeNull();
  });

  it('a hidden Premium badge still hides its name', async () => {
    const hidden = badge({ name: 'Secret', is_premium_only: true, is_hidden: true });
    render(<AchievementCard achievement={hidden} isPremium={false} />);
    expect(screen.getByRole('heading', { name: '???' })).toBeTruthy();
    expect(screen.queryByText('Secret')).toBeNull();
  });

  it('an unlocked card prints the same date form as Recent unlocks', async () => {
    const year = new Date().getFullYear();
    const unlocked = badge({ unlocked_at: `${year}-10-07T12:00:00`, progress: 10 });
    render(<AchievementCard achievement={unlocked} isPremium={false} />);
    expect(screen.getByText('Oct 7')).toBeTruthy();
  });

  it('the ja stat labels fit a tile: four characters at most (p8 F42/F83)', async () => {
    await act(async () => {
      await i18n.changeLanguage('ja');
    });
    const { container } = render(
      <AchievementStats totalXP={1200} streak={3} totalReadings={500} readingsAtLeast totalJournalEntries={2} quizzesCompleted={1} />,
    );
    const labels = [...container.querySelectorAll('dt')].map((d) => d.textContent ?? '');
    expect(labels).toEqual(['合計XP', '連続日数', '占い回数', '日記', '診断']);
    for (const l of labels) expect([...l.replace(/XP$/, 'X')].length).toBeLessThanOrEqual(4);
    expect([...container.querySelectorAll('dd')].map((d) => d.textContent)).toContain('500+');
  });
});
