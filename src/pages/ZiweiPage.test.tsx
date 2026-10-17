import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ContentOverlay } from '../i18n/contentOverlay';

const state = vi.hoisted(() => ({ locale: 'en' as 'en' | 'ja' | 'ko' | 'zh', overlay: null as ContentOverlay | null, ready: true }));

vi.mock('../i18n/config', () => ({
  getLocale: () => state.locale,
  default: { on() {}, off() {} },
}));
vi.mock('../i18n/useT', () => ({
  useT: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      let s = typeof opts?.defaultValue === 'string' ? opts.defaultValue : key;
      for (const [k, v] of Object.entries(opts ?? {})) s = s.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
      return s;
    },
  }),
}));
vi.mock('../i18n/contentOverlay', async (importOriginal) => {
  const real = await importOriginal<typeof import('../i18n/contentOverlay')>();
  return { ...real, useContentOverlay: () => ({ overlay: state.overlay, ready: state.ready }) };
});
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ profile: { birthDate: '1992-04-18', birthTime: '07:45' } }),
}));

import { ZiweiPage } from './ZiweiPage';

const overlay = (lng: string): ContentOverlay =>
  JSON.parse(readFileSync(join(process.cwd(), 'src', 'i18n', 'locales', lng, 'content-ziwei.json'), 'utf8'));

/** The palace rows' labels, in list order (each row is a Disclosure button). */
function rowLabels(container: HTMLElement): string[] {
  const h3 = [...container.querySelectorAll('h3')].find((h) => /twelve palaces/i.test(h.textContent ?? ''))!;
  const section = h3.closest('section') ?? h3.parentElement!.parentElement!;
  return [...section.querySelectorAll('button[aria-expanded]')].map((b) => {
    // The label is the row's first text block after the branch icon.
    const spans = [...b.querySelectorAll('span')].filter((s) => s.children.length === 0 && s.textContent?.trim());
    return spans.map((s) => s.textContent!.trim()).join('|');
  });
}

const page = () => render(<MemoryRouter><ZiweiPage /></MemoryRouter>);

describe('ZiweiPage: the twelve palaces list', () => {
  beforeEach(() => { state.locale = 'en'; state.overlay = null; state.ready = true; });

  it('Japanese: the traditional term, then the overlay gloss (P7 F22/F78)', () => {
    state.locale = 'ja';
    state.overlay = overlay('ja');
    const labels = rowLabels(page().container).join('\n');
    expect(labels).toContain('命宮|自分自身');
    expect(labels).toContain('財帛宮|富');
    expect(labels).toContain('遷移宮|旅');
    expect(labels).toContain('官禄宮|仕事');
    expect(labels).toContain('福徳宮|幸福');
    expect(labels).not.toMatch(/官祿宮|福德宮/);
    expect(labels).toContain('· 身宮');
  });

  it('Chinese: the overlay name is the term, so it prints once, simplified', () => {
    state.locale = 'zh';
    state.overlay = overlay('zh');
    const rows = rowLabels(page().container);
    const life = rows.find((r) => r.startsWith('丑') || r.includes('命宫'))!;
    expect(life).toContain('命宫');
    expect(life).not.toMatch(/命宫\|命宫|命宮/);
    expect(rows.join('\n')).toContain('财帛宫|· 身宫');
    expect(rows.join('\n')).not.toMatch(/[宮財遷祿權機陰陽貪門殺軍輔貞]/);
  });

  it('a CJK reader never sees the English gloss while the overlay loads', () => {
    state.locale = 'ja';
    state.ready = false;
    const labels = rowLabels(page().container).join('\n');
    expect(labels).toContain('命宮');
    expect(labels).not.toMatch(/\bLife\b|\bWealth\b/);
  });

  it('English and Korean keep the hanzi plus the gloss', () => {
    expect(rowLabels(page().container).join('\n')).toContain('命宮|Life');
    state.locale = 'ko';
    state.overlay = overlay('ko');
    expect(rowLabels(page().container).join('\n')).toContain('命宮|명궁');
  });
});
