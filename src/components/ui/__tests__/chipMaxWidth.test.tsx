import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Brain } from 'lucide-react';
import { Chip } from '../Chip';

/*
 * p9 QU1 R-a: a chip is `flex-shrink-0` (a filter row scrolls rather than
 * squeezing its chips), so a chip whose label is longer than its row widened
 * the row: eight of the 80 ja Quick reading suggestions were 333–357 px on
 * one line against the 328 px row at 360 px, and the page scrolled sideways
 * (p9 Q30). The QA round held those chips to the row's width locally; every
 * chip now is (max-w-full), and a long label wraps inside it.
 *
 * jsdom lays nothing out, so this holds the class lists that decide it.
 */

afterEach(() => cleanup());
const classes = (el: Element) => el.className.split(/\s+/).filter(Boolean);
const LONG = '仕事と恋愛のどちらを優先するべきか、今の自分に必要な答えを教えてください';

describe('Chip: never wider than its row (QU1 R-a)', () => {
  it('a pressable chip is held to the row’s width and still does not shrink below its content', () => {
    render(<Chip label={LONG} onClick={() => {}} />);
    const chip = screen.getByRole('button', { name: LONG });
    expect(classes(chip)).toEqual(expect.arrayContaining(['max-w-full', 'flex-shrink-0', 'inline-flex']));
  });

  it('an inert chip (a label, a span) too', () => {
    const { container } = render(<Chip label={LONG} />);
    const chip = container.querySelector('span')!;
    expect(chip.textContent).toBe(LONG);
    expect(classes(chip)).toContain('max-w-full');
  });

  it('a chip with an icon keeps the icon at its size beside a wrapping label', () => {
    render(<Chip label={LONG} icon={<Brain />} onSelect={() => {}} selected={false} />);
    const chip = screen.getByRole('button', { name: LONG });
    expect(classes(chip)).toContain('max-w-full');
    const icon = chip.firstElementChild as HTMLElement;
    expect(icon.tagName).toBe('SPAN');
    expect(classes(icon)).toEqual(expect.arrayContaining(['inline-flex', 'shrink-0']));
    expect(icon.querySelector('svg')).not.toBeNull();
    expect(chip.textContent).toBe(LONG);
  });

  it('a caller’s own classes still come after the base (the local fixes keep working)', () => {
    render(<Chip label="a" onClick={() => {}} className="text-left" />);
    const list = classes(screen.getByRole('button', { name: 'a' }));
    expect(list.indexOf('text-left')).toBeGreaterThan(list.indexOf('max-w-full'));
  });
});
