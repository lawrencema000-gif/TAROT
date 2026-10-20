import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LevelUpCelebration } from './LevelUpCelebration';

describe('LevelUpCelebration', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.classList.remove('sheet-open');
  });

  it('is one flat sheet: the level as the title, the rank, one button, no exclamation', () => {
    render(<LevelUpCelebration open onClose={() => {}} newLevel={7} seekerRank="Novice Seeker" xpEarned={25} />);
    const dialog = screen.getByRole('dialog');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Level 7');
    expect(dialog.textContent).not.toMatch(/!/);
    // The content is flat (the shared Sheet panel and the gold Button are their own primitives).
    const content = screen.getByRole('heading', { level: 2 }).parentElement as HTMLElement;
    expect([...content.querySelectorAll('*')].filter((el) => el.tagName !== 'BUTTON' && /bg-gradient/.test(String(el.getAttribute('class'))))).toHaveLength(0);
    expect(screen.getAllByRole('button').filter((b) => /Continue/.test(b.textContent ?? ''))).toHaveLength(1);
  });

  it('waits while another sheet is open, then opens', () => {
    vi.useFakeTimers();
    document.body.classList.add('sheet-open');
    render(<LevelUpCelebration open onClose={() => {}} newLevel={3} seekerRank="Novice Seeker" xpEarned={0} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    document.body.classList.remove('sheet-open');
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
