import { describe, it, expect, afterEach, afterAll } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import i18n from '../../../i18n/config';
import { LuckPillarTimeline } from '../LuckPillarTimeline';
import { computeBazi } from '../../../data/bazi';
import { computeLuckPillars } from '../../../data/baziDeep';

/*
 * The 大運 band printed the romanized stems and branches ("Jia", "Zi") on a
 * Chinese, Japanese or Korean screen (QA Q19). It prints the characters there
 * now (the same in every script), and keeps the romanized keys in English.
 */

const chart = computeBazi('1991-03-08', '06:45')!;
const pillars = computeLuckPillars(chart, 'female', 1991, '1991-03-08', '06:45');
const CN_STEM: Record<string, string> = { Jia: '甲', Yi: '乙', Bing: '丙', Ding: '丁', Wu: '戊', Ji: '己', Geng: '庚', Xin: '辛', Ren: '壬', Gui: '癸' };
const CN_BRANCH: Record<string, string> = { Zi: '子', Chou: '丑', Yin: '寅', Mao: '卯', Chen: '辰', Si: '巳', Wu: '午', Wei: '未', Shen: '申', You: '酉', Xu: '戌', Hai: '亥' };

afterEach(() => cleanup());
afterAll(async () => {
  await i18n.changeLanguage('en');
});

describe('LuckPillarTimeline', () => {
  for (const lng of ['zh', 'ja', 'ko'] as const) {
    it(`${lng}: the band and the tapped pillar's tag print the stems and branches as characters`, async () => {
      await i18n.changeLanguage(lng);
      const { container } = render(<LuckPillarTimeline pillars={pillars} currentAge={35} />);
      const band = [...container.querySelectorAll('button')].map((b) => b.textContent);
      expect(band).toEqual(pillars.map((p) => `${CN_STEM[p.stem]}${CN_BRANCH[p.branch]}`));
      expect(container.textContent).not.toMatch(/\b(Jia|Yi|Bing|Ding|Wu|Ji|Geng|Xin|Ren|Gui)\b/);
      fireEvent.click(container.querySelectorAll('button')[0]);
      const first = pillars[0];
      expect(screen.getByRole('button', { pressed: true }).getAttribute('aria-label')).toContain(`${CN_STEM[first.stem]}${CN_BRANCH[first.branch]}`);
      // ko reads them as hanja (traditional), so they are marked zh-Hant; zh and ja inherit the page's language.
      const lang = container.querySelector('button span')?.getAttribute('lang');
      expect(lang).toBe(lng === 'ko' ? 'zh-Hant' : null);
    });
  }

  it('en: the romanized keys, as before', async () => {
    await i18n.changeLanguage('en');
    const { container } = render(<LuckPillarTimeline pillars={pillars} currentAge={35} />);
    expect([...container.querySelectorAll('button')].map((b) => b.textContent)).toEqual(pillars.map((p) => `${p.stem}${p.branch}`));
    expect(container.querySelector('button')?.getAttribute('aria-label')).toMatch(new RegExp(`^${pillars[0].stem}${pillars[0].branch} · Age `));
  });
});
