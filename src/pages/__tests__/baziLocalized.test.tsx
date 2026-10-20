import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createElement, forwardRef, type ReactNode } from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/*
 * The Premium Bazi result, in the reader's language (QA Q19). Before the
 * 'bazi' content overlay a Chinese or Korean member read Chinese or Korean
 * headings over English: the Day Master's name, archetype, summary, lists,
 * thriving/struggling and affirmation, the romanized pillars ("Xin Wei"), the
 * Ten Gods ("偏财 Piancai / Windfall"), the 納音 ("Earth by the Roadside"), the
 * colour and direction ("red", "south"), every deep-mode text, the structure,
 * "{pillar} pillar", and the whole AI panel's chrome.
 *
 * The page is driven through its real flow — profile birth data, gender for
 * deep mode, "cast", the AI panel's fetch — for a Premium member with the
 * bazi-depth flag on, so every section renders. Then the page's text is swept
 * node by node for Latin script: none may remain but the brand ("Arcana", in
 * the disclaimer) and "AI", which the app's CJK copy writes in Latin.
 */

const USER = { id: '00000000-0000-4000-8000-0000000000b8', email: 'qa@example.com' };
const PROFILE = {
  id: USER.id, displayName: 'QA', birthDate: '1991-03-08', birthTime: '06:45', birthLat: 31.23, birthLon: 121.47,
  birthTz: 'Asia/Shanghai', timezone: 'Asia/Shanghai', isPremium: true,
};

vi.mock('../../lib/supabase', () => ({
  supabase: {
    functions: { invoke: vi.fn() },
    rpc: vi.fn(),
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
    auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }),
    removeChannel: () => {},
  },
}));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: USER, profile: PROFILE, updateProfile: async () => ({ error: null }), refreshProfile: async () => {} }),
}));
vi.mock('../../context/FeatureFlagContext', () => ({ useFeatureFlag: () => true }));
vi.mock('../../components/premium/PaywallSheet', () => ({ PaywallSheet: () => null }));
vi.mock('../../utils/telemetry', () => ({ captureException: vi.fn(), addBreadcrumb: vi.fn(), logWarn: vi.fn() }));
const share = vi.hoisted(() => ({ card: vi.fn(), out: vi.fn() }));
vi.mock('../../utils/shareableResultCard', () => ({
  renderShareCard: (data: unknown) => { share.card(data); return Promise.resolve(new Blob(['png'])); },
  shareOrDownload: (_blob: Blob, filename: string, text: string) => { share.out(filename, text); return Promise.resolve('shared'); },
}));
const ai = vi.hoisted(() => ({ generate: vi.fn() }));
vi.mock('../../services/baziInterpret', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../services/baziInterpret')>();
  return { ...real, generateBaziReading: (...a: unknown[]) => ai.generate(...a) };
});
vi.mock('framer-motion', () => {
  const strip = ({ initial, animate, exit, transition, whileTap, whileHover, layout, variants, ...rest }: Record<string, unknown>) => {
    void initial; void animate; void exit; void transition; void whileTap; void whileHover; void layout; void variants;
    return rest;
  };
  const motion = new Proxy({}, {
    get: (_t, tag: string) => forwardRef<HTMLElement, Record<string, unknown>>(function M(props, ref) {
      const { children, ...rest } = props as { children?: ReactNode } & Record<string, unknown>;
      return createElement(tag, { ...strip(rest), ref }, children);
    }),
  });
  return {
    motion,
    AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
    LayoutGroup: ({ children }: { children: ReactNode }) => <>{children}</>,
    useReducedMotion: () => true,
  };
});

import i18n from '../../i18n/config';
import { BaziPage } from '../BaziPage';
import { computeBazi, deepenBazi } from '../../data/bazi';
import { computeBaziDeep } from '../../data/baziDeep';
import { determineStructure } from '../../data/baziStructure';
import type { BaziAIReading } from '../../services/baziInterpret';

type Lng = 'ja' | 'ko' | 'zh';
type Json = Record<string, unknown>;
const overlay = (lng: Lng): Json =>
  JSON.parse(readFileSync(join(process.cwd(), 'src/i18n/locales', lng, 'content-bazi.json'), 'utf8'));
const at = (o: Json, path: string) => path.split('.').reduce<unknown>((c, k) => (c as Json)?.[k], o) as string;

/** The chart the profile's birth data gives, computed the way the page does. */
const CHART = computeBazi(PROFILE.birthDate, PROFILE.birthTime)!;
const PHASE1 = deepenBazi(CHART);
const DEEP = computeBaziDeep(CHART, PROFILE.birthDate, 'female', PROFILE.birthTime);
const STRUCTURE = determineStructure(CHART)!;

const SECTIONS = ['core_summary', 'personality', 'elements', 'career', 'wealth', 'relationships', 'family', 'hidden_stems',
  'branch_relations', 'health', 'luck_pillar', 'annual', 'strategy', 'closing_summary'] as const;
/** What bazi-interpret writes in the UI language (it is told the locale). */
const READING_BODY: Record<Lng, string> = {
  zh: '你的命盘以日主为中轴，五行之间相互呼应。',
  ko: '당신의 사주는 일간을 축으로 오행이 서로 어울려요.',
  ja: 'あなたの命式は日主を軸に、五行が互いに響き合っています。',
};
const reading = (lng: Lng) => Object.fromEntries(SECTIONS.map((k) => [k, READING_BODY[lng]])) as unknown as BaziAIReading;

const CALCULATE: Record<Lng, string> = { zh: '起四柱', ko: '사주 뽑기', ja: '四柱を立てる' };
const AI_HEADING: Record<Lng, string> = { zh: '你的专属解读', ko: '나만을 위한 풀이', ja: 'あなただけのリーディング' };

/**
 * The Latin words on a page, minus the allowed ones. Read text node by text
 * node: textContent would glue neighbours together.
 */
function latinWords(root: Element, allowed: readonly string[]): string[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const words: string[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) words.push(...(n.nodeValue?.match(/[A-Za-z]{2,}/g) ?? []));
  return words.filter((w) => !allowed.includes(w));
}

async function castChart(lng: Lng | 'en') {
  await i18n.changeLanguage(lng);
  const { container } = render(<MemoryRouter><BaziPage /></MemoryRouter>);
  await waitFor(() => expect((container.querySelector('input[type="date"]') as HTMLInputElement).value).toBe(PROFILE.birthDate));
  fireEvent.change(container.querySelector('select')!, { target: { value: 'female' } });
  fireEvent.click(screen.getByRole('button', { name: lng === 'en' ? 'Cast the four pillars' : CALCULATE[lng] }));
  return container;
}

beforeAll(() => {
  if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};
});
beforeEach(() => {
  ai.generate.mockReset();
  share.card.mockReset();
  share.out.mockReset();
});
afterEach(() => cleanup());
afterAll(async () => {
  await i18n.changeLanguage('en');
});

describe('Premium Bazi result, in the reader’s language', () => {
  for (const lng of ['zh', 'ko', 'ja'] as const) {
    it(`${lng}: the whole result — chart, deep mode and AI panel — reads in ${lng}, with no Latin but the brand and “AI”`, async () => {
      ai.generate.mockResolvedValue({ ok: true, reading: reading(lng), cached: true });
      const container = await castChart(lng);
      await screen.findByText(AI_HEADING[lng], undefined, { timeout: 5000 });
      const text = container.textContent ?? '';

      expect(latinWords(container, ['Arcana', 'AI'])).toEqual([]);

      const o = overlay(lng);
      const dm = CHART.dayMaster;
      for (const path of [
        `dayMasters.${dm}.name`, `dayMasters.${dm}.archetype`, `dayMasters.${dm}.summary`, `dayMasters.${dm}.thriving`,
        `dayMasters.${dm}.affirmation`, `dayMasters.${dm}.strengths.0`, `dayMasters.${dm}.challenges.0`,
        `tenGods.${PHASE1.tenGods.month}.name`, `tenGods.${PHASE1.tenGods.month}.classical`, `tenGods.${PHASE1.tenGods.month}.headline`,
        `nayin.${PHASE1.nayin!.id}.name`, `colors.${PHASE1.favorable.element}`, `directions.${PHASE1.favorable.direction}`,
        `careerHints.${PHASE1.favorable.element}`, 'pillars.year', 'pillars.hour', `annual.${DEEP.annualLuck.tenGod}`,
        `luckThemes.${DEEP.luckPillars[0].relation}`, `climate.${DEEP.climate.dominant}`, `careers.${dm}.0`,
        `spouse.${DEEP.lifeAreas.keys.spouseLevel}`, `health.${DEEP.lifeAreas.keys.healthElement}`, 'structureIntro',
        `structures.${STRUCTURE.key}.title`, `structures.${STRUCTURE.key}.strengthNote`,
        ...DEEP.spiritStars.map((s) => `stars.${s.id}.meaning`),
      ]) {
        expect(text, path).toContain(at(o, path));
      }
      // The pillars as characters, not romanized: 辛未 · 辛卯 · 丁丑 · 癸卯 for this birth.
      for (const p of [CHART.year, CHART.month, CHART.day, CHART.hour]) expect(text).not.toContain(`${p.stem} ${p.branch}`);
      expect(text).toContain(`${'甲乙丙丁戊己庚辛壬癸'[['Jia', 'Yi', 'Bing', 'Ding', 'Wu', 'Ji', 'Geng', 'Xin', 'Ren', 'Gui'].indexOf(CHART.day.stem)]}`);
      // The AI panel: its chrome is the locale's, its body what the function wrote.
      expect(text).toContain(READING_BODY[lng]);
    });
  }

  it('zh: simplified characters for the structure and the stars; the AI panel’s failure in Chinese, by its code', async () => {
    ai.generate.mockResolvedValue({ ok: false, code: 'RATE_LIMITED', status: 429, detail: 'Too many requests' });
    const container = await castChart('zh');
    await screen.findByText('请求过于频繁，请稍等一分钟后再试。', undefined, { timeout: 5000 });
    expect(screen.getByRole('button', { name: /重试/ })).toBeTruthy();
    const text = container.textContent ?? '';
    expect(text).not.toContain('Too many requests');
    expect(latinWords(container, ['Arcana', 'AI'])).toEqual([]);
    // Traditional forms the closed table converts never reach a zh screen.
    for (const ch of '殺財傷祿陽貴驛華蓋紅鸞將輿') expect(text, ch).not.toContain(ch);
  });

  it('ko: Premium-required is worded in Korean and offers Premium, not a retry', async () => {
    ai.generate.mockResolvedValue({ ok: false, code: 'PREMIUM_REQUIRED', status: 403, detail: 'Bazi AI reading requires Premium subscription' });
    const container = await castChart('ko');
    await screen.findByText('나만을 위한 풀이는 프리미엄 기능이에요.', undefined, { timeout: 5000 });
    expect(screen.queryByRole('button', { name: /다시 시도/ })).toBeNull();
    expect(screen.getByRole('button', { name: /프리미엄으로 열기/ })).toBeTruthy();
    expect(container.textContent).not.toContain('바지');
  });

  it('English is unchanged: the data’s English, romanized pillars, the English panel', async () => {
    ai.generate.mockResolvedValue({ ok: true, reading: Object.fromEntries(SECTIONS.map((k) => [k, 'Your chart turns on its Day Master.'])), cached: true });
    const container = await castChart('en');
    await screen.findByText('Your personalised reading', undefined, { timeout: 5000 });
    const text = container.textContent ?? '';
    for (const s of [
      `${CHART.year.stem} ${CHART.year.branch}`,
      PHASE1.favorable.careerHint,
      DEEP.climate.remedy,
      DEEP.annualLuck.reading,
      'Core summary',
      `Year ahead (${new Date().getFullYear()})`,
      'Written by AI in the classical BaZi tradition (子平真诠 / 滴天髓). Refreshes once a year.',
    ]) expect(text, s).toContain(s);
    if (DEEP.spiritStars[0]) expect(text).toContain(`${DEEP.spiritStars[0].pillar.charAt(0).toUpperCase()}${DEEP.spiritStars[0].pillar.slice(1)} pillar`);
  });

  it('the share card and share text are in the reader’s language', async () => {
    ai.generate.mockResolvedValue({ ok: true, reading: reading('zh'), cached: true });
    await castChart('zh');
    await screen.findByText(AI_HEADING.zh, undefined, { timeout: 5000 });
    fireEvent.click(screen.getByRole('button', { name: /分享我的四柱/ }));
    await waitFor(() => expect(share.out).toHaveBeenCalledTimes(1));
    const o = overlay('zh');
    const name = at(o, `dayMasters.${CHART.dayMaster}.name`);
    const archetype = at(o, `dayMasters.${CHART.dayMaster}.archetype`);
    expect(share.out).toHaveBeenCalledWith(`arcana-bazi-${CHART.dayMaster}.png`, `我的八字日主：${name}——${archetype}`);
    expect(share.card).toHaveBeenCalledWith(expect.objectContaining({ title: name, subtitle: archetype, tagline: `日主：${name}`, brand: '八字' }));
  });
});
