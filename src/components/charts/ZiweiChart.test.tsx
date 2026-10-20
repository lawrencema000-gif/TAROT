import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { computeZiweiChart } from '../../data/ziwei';
import type { ContentOverlay } from '../../i18n/contentOverlay';

const state = vi.hoisted(() => ({ locale: 'en' as 'en' | 'ja' | 'ko' | 'zh', overlay: null as ContentOverlay | null }));

vi.mock('../../i18n/config', () => ({
  getLocale: () => state.locale,
  default: { on() {}, off() {} },
}));
vi.mock('../../i18n/useT', () => ({
  useT: () => ({ t: (_key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? _key }),
}));
vi.mock('../../i18n/contentOverlay', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../i18n/contentOverlay')>();
  return { ...real, useContentOverlay: () => ({ overlay: state.overlay, ready: true }) };
});

import { ZiweiChart } from './ZiweiChart';

const overlay = (lng: string): ContentOverlay =>
  JSON.parse(readFileSync(join(process.cwd(), 'src', 'i18n', 'locales', lng, 'content-ziwei.json'), 'utf8'));

// Born 1992-04-18 07:45 (壬 year: 天梁祿 紫微權 左輔科 武曲忌): the Body palace is
// Wealth, in 申 — the chart the F51 report used.
const chart = computeZiweiChart('1992-04-18', '07:45')!;
const draw = () => render(<ZiweiChart palaces={chart.palaces} centre={<div>centre</div>} />);
const cellOf = (el: HTMLElement) => el.closest('div.rounded-inset') as HTMLElement;

describe('ZiweiChart', () => {
  beforeEach(() => { state.locale = 'en'; state.overlay = null; });

  it('the fixture puts the Body palace on Wealth, in 申', () => {
    const body = chart.palaces.find((p) => p.isBody)!;
    expect([body.key, body.branchCn]).toEqual(['wealth', '申']);
  });

  it('English: "Body" is its own item after the name, so "Wealth Body" wraps instead of overflowing (P7 F51)', () => {
    draw();
    const wealth = screen.getByText('Wealth');
    const body = screen.getByText('Body');
    expect(wealth).not.toBe(body);
    const footer = wealth.parentElement!;
    expect(body.parentElement).toBe(footer);
    // Three items that wrap between one another; the branch keeps the right edge.
    expect(footer.className).toContain('flex-wrap');
    const branch = [...footer.children].at(-1) as HTMLElement;
    expect(branch.textContent).toBe('申');
    expect(branch.className).toContain('ml-auto');
    // The name may shrink, but breaks inside a word only as a last resort.
    expect(wealth.className).toMatch(/min-w-0/);
    expect(wealth.className).toMatch(/break-keep/);
    // No palace name is glued to anything else.
    expect(screen.queryByText(/WealthBody/)).toBeNull();
  });

  it('Japanese: the cells read the traditional terms in shinjitai, not the overlay glosses (P7 F22/F78)', () => {
    state.locale = 'ja';
    state.overlay = overlay('ja');
    draw();
    for (const term of ['命宮', '財帛宮', '遷移宮', '官禄宮', '田宅宮', '福徳宮']) expect(screen.getByText(term)).toBeTruthy();
    for (const gloss of ['自分自身', '富', '旅', '仕事', '家と土地', '幸福']) expect(screen.queryByText(gloss)).toBeNull();
    expect(screen.queryByText('官祿宮')).toBeNull();
    // The Body mark and the transformation marks in the same script.
    expect(cellOf(screen.getByText('財帛宮')).textContent).toContain('身');
    expect(screen.getByText('権')).toBeTruthy();
    expect(screen.getByText('禄')).toBeTruthy();
  });

  it('Chinese: palaces, stars and transformation marks all simplified', () => {
    state.locale = 'zh';
    state.overlay = overlay('zh');
    const { container } = draw();
    for (const s of ['财帛宫', '迁移宫', '官禄宫', '天机', '太阴', '权', '禄']) expect(container.textContent).toContain(s);
    for (const s of ['財帛宮', '遷移宮', '天機', '太陰', '權', '祿']) expect(container.textContent).not.toContain(s);
  });

  it('Korean keeps the overlay readings for the palaces and hanja for the stars', () => {
    state.locale = 'ko';
    state.overlay = overlay('ko');
    const { container } = draw();
    for (const s of ['명궁', '재백궁', '天機', '權', '祿']) expect(container.textContent).toContain(s);
  });
});
