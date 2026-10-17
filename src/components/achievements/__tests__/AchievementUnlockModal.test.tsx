import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AchievementUnlockModal } from '../AchievementUnlockModal';
import type { AchievementWithProgress } from '../../../services/achievements';

function row(over: Partial<AchievementWithProgress> = {}): AchievementWithProgress {
  return {
    id: 'oracle',
    name: 'Oracle Vision',
    description: 'Complete 500 readings.',
    icon_name: 'crown',
    category: 'mastery',
    rarity: 'legendary',
    xp_reward: 900,
    unlock_condition: { activity_type: 'reading_complete', target: 500 },
    is_premium_only: false,
    is_hidden: false,
    sort_order: 4,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    progress: 500,
    target: 500,
    unlocked_at: '2026-10-17T00:00:00Z',
    notified: false,
    ...over,
  };
}

const xpFigure = () => screen.getByRole('dialog').querySelector('.tabular-nums')?.textContent;

describe('AchievementUnlockModal', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('shows a badge that arrives within 300 ms of mounting empty', () => {
    // The shell mounts the modal with no badge; the sign-in drain answers fast.
    const { rerender } = render(<AchievementUnlockModal achievement={null} onClose={() => {}} />);
    act(() => { vi.advanceTimersByTime(80); });
    rerender(<AchievementUnlockModal achievement={row()} onClose={() => {}} />);
    act(() => { vi.advanceTimersByTime(1500); });
    expect(screen.queryByRole('dialog')).not.toBeNull();
    expect(xpFigure()).toBe('+900');
  });

  it('a re-render with a new object for the same badge does not restart the count-up (p8 F41)', () => {
    const { rerender } = render(<AchievementUnlockModal achievement={row()} onClose={() => {}} />);
    act(() => { vi.advanceTimersByTime(1500); });
    expect(xpFigure()).toBe('+900');
    // What the shell does on every AuthContext change: localise again.
    rerender(<AchievementUnlockModal achievement={row({ name: 'オラクルのビジョン' })} onClose={() => {}} />);
    act(() => { vi.advanceTimersByTime(50); });
    expect(xpFigure()).toBe('+900');
  });

  it('the next badge in the queue counts up from zero, and closing hides it', () => {
    const { rerender } = render(<AchievementUnlockModal achievement={row()} onClose={() => {}} />);
    act(() => { vi.advanceTimersByTime(1500); });
    rerender(<AchievementUnlockModal achievement={row({ id: 'apprentice', xp_reward: 50, rarity: 'common' })} onClose={() => {}} />);
    act(() => { vi.advanceTimersByTime(40); });
    expect(Number(xpFigure()?.replace(/\D/g, ''))).toBeLessThan(50);
    act(() => { vi.advanceTimersByTime(1500); });
    expect(xpFigure()).toBe('+50');
    rerender(<AchievementUnlockModal achievement={null} onClose={() => {}} />);
    act(() => { vi.advanceTimersByTime(400); });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
