import { describe, it, expect, vi, afterEach, afterAll } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';

/*
 * p10 d2-ja-06: the area needing attention read 'エレメント: 木 · 色: 紫／金色'
 * — ASCII colons after the Japanese labels (Chinese the same). The separator
 * is the language's (common:punctuation.labelSeparator): '：' in Japanese and
 * Chinese, ': ' in English and Korean. The ja and zh cases need the p10
 * 'pages' delta merged.
 */

vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ profile: null }) }));
vi.mock('../../utils/shareableResultCard', () => ({
  renderShareCard: async () => new Blob(),
  shareOrDownload: async () => 'shared',
}));

import i18n from '../../i18n/config';
import { FengShuiPage } from '../FengShuiPage';

afterEach(() => cleanup());
afterAll(async () => {
  await i18n.changeLanguage('en');
});

describe.each([
  ['ja', 'エレメント：木 · 色：紫／金色'],
  ['zh', '元素：木 · 颜色：紫色／金色'],
  ['ko', '원소: 목(木) · 색: 보라색 / 금색'],
  ['en', 'Element: Wood · Colour: Purple / Gold'],
] as const)('Feng Shui remedy line in %s', (lng, line) => {
  it(`Wealth rated 1 reads "${line}"`, { timeout: 20_000 }, async () => {
    await i18n.changeLanguage(lng);
    render(<FengShuiPage />);
    const wealth = screen.getByText(i18n.t('app:fengshui.areas.wealth.name')).closest('div')!;
    fireEvent.click(within(wealth).getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: i18n.t('app:fengshui.reveal') }));
    // The element and colour come from the 'fengshui' overlay in ja / ko / zh.
    expect(await screen.findByText(line, { normalizer: (s) => s }, { timeout: 4000 })).toBeInTheDocument();
  });
});
