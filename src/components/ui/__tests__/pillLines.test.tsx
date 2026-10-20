import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { Tag, Badge } from '../Chip';

/*
 * p10 d2-ja-04: in the Library at 390px the pills beside a truncated title
 * broke inside their word — キャリ/ア on a saved spread, A/I and Car/eer on
 * an AI reading — each two lines tall. A pill could shrink with the title,
 * and inside a button the ja/ko/zh text rules (`overflow-wrap: anywhere`)
 * let it break between any two letters.
 *
 * jsdom lays nothing out, so this holds the class lists that decide it.
 */

afterEach(() => cleanup());
const classes = (el: Element) => el.className.split(/\s+/).filter(Boolean);

describe('Tag and Badge beside a truncating title (d2-ja-04)', () => {
  it('a Tag never shrinks and keeps each word whole, in every script', () => {
    const { container } = render(<Tag tone="neutral" size="sm">キャリア</Tag>);
    const tag = container.firstElementChild!;
    expect(classes(tag)).toEqual(expect.arrayContaining(['shrink-0', 'break-keep', '[overflow-wrap:normal]']));
  });

  it('a Tag that carries a sentence may still wrap between its words (no nowrap)', () => {
    const { container } = render(<Tag tone="neutral" size="md" className="max-w-full text-center">Drag to pan · Pinch to zoom · Tap a place for insight</Tag>);
    expect(classes(container.firstElementChild!)).not.toContain('whitespace-nowrap');
  });

  it('a Badge is one line that never shrinks', () => {
    const { container } = render(<Badge tone="violet">AI</Badge>);
    expect(classes(container.firstElementChild!)).toEqual(expect.arrayContaining(['shrink-0', 'whitespace-nowrap']));
  });

  it('the keyword pill still wraps a long keyword inside itself (P7 #75)', () => {
    const { container } = render(<Tag variant="keyword">SMALL TALK THAT MUST BECOME REAL TALK</Tag>);
    const pill = classes(container.firstElementChild!);
    expect(pill).toContain('max-w-full');
    expect(pill).not.toContain('whitespace-nowrap');
    expect(pill).not.toContain('break-keep');
  });

  it('a caller’s own classes still come after the base', () => {
    const { container } = render(<Tag className="w-12 justify-center">Fire</Tag>);
    const list = classes(container.firstElementChild!);
    expect(list.indexOf('w-12')).toBeGreaterThan(list.indexOf('shrink-0'));
  });
});
