import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { forwardRef, type ReactNode } from 'react';

// Same pass-through as phase7.test.tsx: the toast stack's state, not its motion.
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  LayoutGroup: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: forwardRef<HTMLDivElement, { children?: ReactNode; className?: string }>(function MotionDiv(
      { children, className },
      ref,
    ) {
      return <div ref={ref} className={className}>{children}</div>;
    }),
  },
  useReducedMotion: () => true,
}));

import { Disclosure } from '../Disclosure';
import { KeywordRow } from '../Chip';
import { ToastContainer, toast, dismissToasts } from '../Toast';
import { ListRow } from '../ListRow';

describe('Disclosure surface="paper" (replaces the two PaperDisclosures)', () => {
  it('takes the ink roles and the paper hairline, and still discloses', async () => {
    const { container } = render(
      <Disclosure surface="paper" variant="row" lazy label="Read the full meaning">
        <p>The long text</p>
      </Disclosure>,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/border-t border-paper-hairline/);
    expect(root.className).not.toMatch(/mystic-700/);
    const trigger = screen.getByRole('button', { name: 'Read the full meaning' });
    expect(trigger.className).toMatch(/ring-ink-gold\/50/);
    expect(screen.getByText('Read the full meaning').className).toMatch(/text-ink-2/);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('The long text')).toBeNull();
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('The long text')).toBeInTheDocument();
  });

  it('keeps the canvas inks by default', () => {
    render(<Disclosure label="Canvas row">x</Disclosure>);
    expect(screen.getByText('Canvas row').className).toMatch(/text-mystic-200/);
  });
});

describe('KeywordRow align', () => {
  it('centres by default and starts when asked', () => {
    const { container, rerender } = render(<KeywordRow keywords={['a', 'b']} />);
    expect((container.firstChild as HTMLElement).className).toMatch(/justify-center/);
    rerender(<KeywordRow keywords={['a', 'b']} align="start" />);
    expect((container.firstChild as HTMLElement).className).toMatch(/justify-start/);
    expect((container.firstChild as HTMLElement).className).not.toMatch(/justify-center/);
  });
});

describe('Toasts are announced', () => {
  it('success and info ride a polite status region; an error rides a sibling alert region', () => {
    render(<ToastContainer />);
    const region = screen.getByRole('status');
    const alert = screen.getByRole('alert');
    // Both regions exist, empty, before anything is announced.
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
    expect(region).toBeEmptyDOMElement();
    expect(alert).toBeEmptyDOMElement();
    act(() => {
      toast('Reading saved', 'success');
      toast('Couldn’t save', 'error');
    });
    expect(region).toHaveTextContent('Reading saved');
    expect(region).not.toHaveTextContent('Couldn’t save');
    expect(alert).toHaveTextContent('Couldn’t save');
    // P7 #124: never a live region inside another (announced twice).
    expect(region.contains(alert)).toBe(false);
    expect(alert.contains(region)).toBe(false);
    expect(region.querySelector('[role="alert"],[aria-live]')).toBeNull();
    expect(alert.querySelector('[role="status"],[aria-live]')).toBeNull();
    // P7 #153: the dismiss control is named through i18n, not a literal.
    expect(screen.getAllByRole('button', { name: 'Dismiss' })).toHaveLength(2);
    act(() => dismissToasts());
  });
});

describe('ListRow meta', () => {
  it('clamps to two lines (no `block` overriding the -webkit-box)', () => {
    render(<ListRow label="Row" meta="A long description" />);
    const meta = screen.getByText('A long description');
    expect(meta.className).toMatch(/\bline-clamp-2\b/);
    expect(meta.className).not.toMatch(/\bblock\b/);
  });
});
