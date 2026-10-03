import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Card } from '../Card';
import { Disclaimer } from '../Disclaimer';
import { Tag } from '../Chip';

describe('Card keeps the caller’s role (P7 #166)', () => {
  it('an interactive card that navigates stays a link, focusable, and still answers Enter', async () => {
    const onClick = vi.fn();
    render(
      <Card interactive role="link" onClick={onClick}>
        Today’s mansion
      </Card>,
    );
    const card = screen.getByRole('link', { name: /Today’s mansion/ });
    expect(card).toHaveAttribute('tabindex', '0');
    expect(screen.queryByRole('button')).toBeNull();
    card.focus();
    await userEvent.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('defaults to a button, and a given tabIndex wins', () => {
    const { rerender } = render(<Card interactive onClick={() => {}}>A</Card>);
    expect(screen.getByRole('button', { name: 'A' })).toHaveAttribute('tabindex', '0');
    rerender(<Card interactive onClick={() => {}} tabIndex={-1}>A</Card>);
    expect(screen.getByRole('button', { name: 'A' })).toHaveAttribute('tabindex', '-1');
  });

  it('without onClick it is not a control at all', () => {
    render(<Card interactive>Plain</Card>);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('Disclaimer tail sits flush under its Paper (P7 #120/#162)', () => {
  it('cancels the stack spacing with an important zero top margin', () => {
    render(
      <div className="space-y-6">
        <section>sheet</section>
        <Disclaimer tail />
      </div>,
    );
    const aside = screen.getByRole('complementary');
    expect(aside.className).toMatch(/(^|\s)!mt-0(\s|$)/);
    expect(aside.className).toMatch(/rounded-b-sheet/);
  });

  it('a standalone disclaimer keeps the stack spacing', () => {
    render(<Disclaimer />);
    expect(screen.getByRole('complementary').className).not.toMatch(/!mt-0/);
  });
});

describe('Keyword pill', () => {
  it('a long keyword is allowed to wrap inside the pill', () => {
    render(<Tag variant="keyword">Small talk that must become real talk</Tag>);
    const pill = screen.getByText(/Small talk/);
    expect(pill.className).toMatch(/\bmin-h-7\b/);
    expect(pill.className).toMatch(/\bleading-tight\b/);
    expect(pill.className).toMatch(/\btext-center\b/);
  });
});
