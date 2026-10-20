import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createElement, forwardRef, type ReactNode } from 'react';

/*
 * The paid Human Design result and the Partner compatibility result, in the
 * reader's language. Before the 'humanDesign' and 'compat' content overlays,
 * a Japanese reader got Japanese headings over English readings: the type
 * copy, the cases and scripts, everything the two edge functions send in
 * English (strategy, signature, authority and its explanation, activation
 * bodies, every aspect interpretation), the composite readings, the MBTI note
 * and the share text.
 *
 * Both pages are driven through their real flow (press, gate, function call,
 * result) with responses shaped exactly like the functions' (the strings are
 * the functions' own, held to their source by humanDesignReading.test.ts and
 * compatReading.test.ts). Then the whole page's text is swept for Latin
 * script: none may remain beyond the proper nouns and codes listed per test.
 */

const USER = { id: '00000000-0000-4000-8000-0000000000a9', email: 'qa@example.com' };
const PROFILE = {
  id: USER.id, displayName: 'QA', birthDate: '1991-03-08', birthTime: '06:45', birthLat: 34.6937, birthLon: 135.5023,
  birthTz: 'Asia/Tokyo', timezone: 'Asia/Tokyo', isPremium: false,
};

const invoke = vi.fn();
const rpc = vi.fn();
const chain: Record<string, unknown> = {};
for (const m of ['select', 'eq', 'order', 'in', 'like', 'limit', 'gte', 'lte', 'neq', 'is', 'filter']) chain[m] = () => chain;
chain.maybeSingle = async () => ({ data: { balance: 500 }, error: null });
chain.single = async () => ({ data: null, error: null });
chain.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null });

vi.mock('../../lib/supabase', () => ({
  supabase: {
    functions: { invoke: (...a: unknown[]) => invoke(...a) },
    rpc: (...a: unknown[]) => rpc(...a),
    from: () => chain,
    auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }),
    removeChannel: () => {},
  },
}));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: USER, profile: PROFILE, updateProfile: async () => ({ error: null }), refreshProfile: async () => {} }),
}));
vi.mock('../../utils/telemetry', () => ({ captureException: vi.fn(), addBreadcrumb: vi.fn() }));
const share = vi.hoisted(() => ({ card: vi.fn(), out: vi.fn() }));
vi.mock('../../utils/shareableResultCard', () => ({
  renderShareCard: (data: unknown) => { share.card(data); return Promise.resolve(new Blob(['png'])); },
  shareOrDownload: (_blob: Blob, filename: string, text: string) => { share.out(filename, text); return Promise.resolve('shared'); },
}));
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
import { HumanDesignPage } from '../HumanDesignPage';
import { PartnerCompatPage } from '../PartnerCompatPage';
import { HD_CHART_AUTHORITY_TEXT, HD_CHART_TYPE_TEXT } from '../../data/humanDesignReading';
import { SYNASTRY_ASPECT_TEXT } from '../../data/compatReading';

const later = <T,>(value: T, ms = 30) => new Promise<T>((r) => setTimeout(() => r(value), ms));
const gateOpen = () => later({ data: [{ allowed: true, balance: 500, premium_bypass: false, soft_cap_reached: false, reset_at: null, daily_used: 0 }], error: null });

type Lng = 'ja' | 'ko' | 'zh';

/**
 * The Latin words on a page, minus the ones allowed (proper nouns, codes).
 * Read text node by text node: textContent would glue neighbours together
 * (<span>INTJ</span><span>ENFP</span> is not one word).
 */
function latinWords(root: Element, allowed: readonly string[]): string[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const words: string[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) words.push(...(n.nodeValue?.match(/[A-Za-z]{2,}/g) ?? []));
  return words.filter((w) => !allowed.includes(w));
}

// ─── Human Design ─────────────────────────────────────────────────
// human-design-chart's ResponseBody for a 5/1 Splenic Projector: channel
// 16-48 (Throat to Spleen, no motor on the Throat, no Sacral), 13 + 13
// activations with the bodies the function names.
const act = (body: string, longitude: number, gate: number, line: number) => ({ body, longitude, gate, line });
const HD_CHART = {
  type: 'Projector',
  ...{ strategy: HD_CHART_TYPE_TEXT.projector.strategy, notSelfTheme: HD_CHART_TYPE_TEXT.projector.notSelfTheme, signature: HD_CHART_TYPE_TEXT.projector.signature },
  authority: 'Splenic',
  authorityExplanation: HD_CHART_AUTHORITY_TEXT.splenic.explanation,
  profile: '5/1',
  profileLines: [5, 1],
  definedCenters: ['Throat', 'Spleen'],
  openCenters: ['Head', 'Ajna', 'G', 'Heart', 'Sacral', 'SolarPlexus', 'Root'],
  channels: ['16-48'],
  definedGates: [1, 2, 5, 6, 7, 9, 11, 12, 16, 19, 24, 26, 33, 34, 35, 38, 39, 41, 45, 46, 48, 50, 58, 60, 62, 63],
  personality: [
    act('Sun', 79.41, 16, 5), act('Earth', 259.41, 9, 5), act('Moon', 186.02, 48, 2), act('NorthNode', 141.7, 33, 4),
    act('SouthNode', 321.7, 19, 4), act('Mercury', 85.1, 35, 1), act('Venus', 95.9, 45, 3), act('Mars', 141.2, 7, 6),
    act('Jupiter', 247.3, 26, 2), act('Saturn', 297.6, 60, 1), act('Uranus', 290.4, 38, 3), act('Neptune', 293.8, 58, 5),
    act('Pluto', 238.9, 34, 6),
  ],
  design: [
    act('Sun', 351.41, 1, 1), act('Earth', 171.41, 2, 1), act('Moon', 20.3, 63, 4), act('NorthNode', 196.8, 50, 2),
    act('SouthNode', 16.8, 46, 2), act('Mercury', 339.9, 24, 6), act('Venus', 25.4, 11, 3), act('Mars', 129.5, 39, 2),
    act('Jupiter', 120.2, 41, 5), act('Saturn', 291.1, 12, 4), act('Uranus', 284.6, 62, 1), act('Neptune', 289.3, 6, 3),
    act('Pluto', 232.7, 5, 5),
  ],
  sacralDefined: false,
  throatDefined: true,
};

const CALCULATE: Record<Lng, string> = { ja: '私のデザインを見る', ko: '나의 디자인 보기', zh: '揭示我的设计' };
const ACTIVATIONS: Record<Lng, string> = { ja: '26のアクティベーションすべて', ko: '26개 활성화 전체', zh: '全部 26 个激活' };
const STRATEGY: Record<Lng, string> = { ja: '招待を待つ', ko: '초대를 기다리기', zh: '等待邀请' };

async function readHumanDesign(lng: Lng) {
  await i18n.changeLanguage(lng);
  invoke.mockImplementation(() => later({ data: { data: HD_CHART, correlationId: 'c-hd' }, error: null }));
  const { container } = render(<MemoryRouter><HumanDesignPage /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: CALCULATE[lng] }));
  await screen.findByText(STRATEGY[lng], undefined, { timeout: 5000 });
  // The activation lists are lazy: open them, so their body names are read too.
  fireEvent.click(screen.getByRole('button', { name: new RegExp(ACTIVATIONS[lng]) }));
  await waitFor(() => expect(container.textContent).toContain(lng === 'ja' ? 'ノースノード' : lng === 'ko' ? '북교점' : '北交点'));
  return container;
}

// ─── Partner compatibility ────────────────────────────────────────
// partner-synastry-adhoc's Resp: the cross-aspects in its order (Sun, Moon,
// Venus and Mars pairs first, then by orb), each interpretation the
// function's text for its key, or its generic text for a pair it has none for.
const fnText = (a: string, b: string, type: string) => SYNASTRY_ASPECT_TEXT[`${a}-${b}-${type}`];
const pos = (planet: string, longitude: number, sign: string) => ({ planet, longitude, sign, degree: Math.round((longitude % 30) * 100) / 100 });
const SYNASTRY = {
  me: [
    pos('Sun', 347.5, 'Pisces'), pos('Moon', 28.4, 'Aries'), pos('Mercury', 331.2, 'Pisces'), pos('Venus', 15.8, 'Aries'),
    pos('Mars', 102.3, 'Cancer'), pos('Jupiter', 128.9, 'Leo'), pos('Saturn', 304.6, 'Aquarius'), pos('Uranus', 283.1, 'Capricorn'),
    pos('Neptune', 286.7, 'Capricorn'), pos('Pluto', 229.4, 'Scorpio'),
  ],
  partner: [
    pos('Sun', 44.1, 'Taurus'), pos('Moon', 118.0, 'Cancer'), pos('Mercury', 30.6, 'Taurus'), pos('Venus', 228.1, 'Scorpio'),
    pos('Mars', 352.7, 'Pisces'), pos('Jupiter', 271.4, 'Capricorn'), pos('Saturn', 101.4, 'Cancer'), pos('Uranus', 275.9, 'Capricorn'),
    pos('Neptune', 283.8, 'Capricorn'), pos('Pluto', 225.6, 'Scorpio'),
  ],
  crossAspects: [
    { myPlanet: 'Mars', partnerPlanet: 'Saturn', type: 'conjunction', flavour: 'intense', orb: 0.9,
      interpretation: 'Your Mars and their Saturn press on each other directly. Amplifies whatever energy is alive between you.' },
    { myPlanet: 'Sun', partnerPlanet: 'Venus', type: 'trine', flavour: 'harmonious', orb: 1.2, interpretation: fnText('Sun', 'Venus', 'trine') },
    { myPlanet: 'Pluto', partnerPlanet: 'Venus', type: 'conjunction', flavour: 'intense', orb: 1.3, interpretation: fnText('Pluto', 'Venus', 'conjunction') },
    { myPlanet: 'Moon', partnerPlanet: 'Sun', type: 'conjunction', flavour: 'intense', orb: 2.4, interpretation: fnText('Sun', 'Moon', 'conjunction') },
    { myPlanet: 'Venus', partnerPlanet: 'Mars', type: 'square', flavour: 'challenging', orb: 3.1, interpretation: fnText('Venus', 'Mars', 'square') },
    { myPlanet: 'Sun', partnerPlanet: 'Sun', type: 'trine', flavour: 'harmonious', orb: 3.4, interpretation: fnText('Sun', 'Sun', 'trine') },
    { myPlanet: 'Moon', partnerPlanet: 'Moon', type: 'square', flavour: 'challenging', orb: 4.2, interpretation: fnText('Moon', 'Moon', 'square') },
    { myPlanet: 'Mercury', partnerPlanet: 'Jupiter', type: 'sextile', flavour: 'harmonious', orb: 0.2,
      interpretation: 'Your Mercury and their Jupiter flow together — this aspect supports easy cooperation in the life-area they each rule.' },
  ],
  overallScore: 75,
  harmoniousCount: 3,
  challengingCount: 2,
  intenseCount: 3,
  elementalBlend: { fire: 31, earth: 22, air: 19, water: 28 },
};

const RUN: Record<Lng, string> = { ja: '相性を明かす', ko: '궁합 확인하기', zh: '揭晓我们的契合度' };
const SHARE_MATCH: Record<Lng, string> = { ja: 'この相性をシェア', ko: '이 궁합 공유', zh: '分享这份配对' };

async function readCompat(lng: Lng) {
  await i18n.changeLanguage(lng);
  invoke.mockImplementation(() => later({ data: { data: SYNASTRY, correlationId: 'c-syn' }, error: null }));
  const { container } = render(<MemoryRouter><PartnerCompatPage /></MemoryRouter>);
  const dates = () => container.querySelectorAll('input[type="date"]') as NodeListOf<HTMLInputElement>;
  await waitFor(() => expect(dates()[0].value).toBe(PROFILE.birthDate));
  fireEvent.change(dates()[1], { target: { value: '1990-05-05' } });
  const selects = container.querySelectorAll('select');
  fireEvent.change(selects[0], { target: { value: 'INTJ' } });
  fireEvent.change(selects[1], { target: { value: 'ENFP' } });
  fireEvent.click(screen.getByRole('button', { name: new RegExp(RUN[lng]) }));
  await screen.findByRole('button', { name: new RegExp(SHARE_MATCH[lng]) }, { timeout: 5000 });
  return container;
}

beforeAll(() => {
  if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};
});
beforeEach(() => {
  invoke.mockReset();
  rpc.mockReset();
  rpc.mockImplementation((name: string) => (name === 'action_gate_status' ? gateOpen() : later({ data: null, error: null })));
  share.card.mockReset();
  share.out.mockReset();
});
afterEach(() => cleanup());
afterAll(async () => {
  await i18n.changeLanguage('en');
});

describe('Human Design result, in the reader’s language', () => {
  it('Japanese: the whole result reads in Japanese, with no Latin left but the brand', async () => {
    const container = await readHumanDesign('ja');
    const text = container.textContent ?? '';
    // "Arcana" is the brand, in the paper's disclaimer; the bodygraph's "G" is one letter.
    expect(latinWords(container, ['Arcana'])).toEqual([]);
    for (const s of [
      'ヒューマンデザイン · 人口の約20%',
      'プロファイル 5/1 · オーソリティ スプリーン',
      'プロジェクターは、世界の導き手です。',
      '苦々しさ', '成功',
      'あなたの内的オーソリティ：スプリーン',
      '静かでやわらかい、今この瞬間の直感です。',
      '人への深い洞察', '「とにかく動け」と言う世界の中で待つこと',
      '私は導き手です。認められるのを待ち、招待が来たとき、私の知恵は物事を変えていきます。',
      'タロットとの対応：女教皇／隠者',
      '同僚のプロジェクトについて、すばらしい洞察を得ました。',
      '感じられるシグネチャー：苦々しさはありません。',
      '決断のしかた：スプリーン・オーソリティ',
      'スプリーンの声は、一度だけ語ります。',
      '太陽', '地球', 'ノースノード', 'サウスノード', '冥王星',
    ]) expect(text, s).toContain(s);

    fireEvent.click(screen.getByRole('button', { name: /私のデザインをシェア/ }));
    await waitFor(() => expect(share.out).toHaveBeenCalledTimes(1));
    expect(share.out).toHaveBeenCalledWith('arcana-human-design-projector.png', '私のヒューマンデザイン：プロジェクター（5/1）。戦略：招待を待つ。');
    expect(share.card).toHaveBeenCalledWith(expect.objectContaining({
      title: 'プロジェクター',
      subtitle: 'プロファイル 5/1',
      tagline: '招待を待つ',
      affirmation: '私は導き手です。認められるのを待ち、招待が来たとき、私の知恵は物事を変えていきます。',
      brand: 'ヒューマンデザイン',
    }));
  });

  it('Korean and Chinese: the same result, no Latin left but the brand', async () => {
    const ko = await readHumanDesign('ko');
    expect(latinWords(ko, ['Arcana'])).toEqual([]);
    for (const s of ['프로젝터는 세상의 안내자예요.', '당신의 내적 권위: 비장', '결정하는 법: 비장 권위', '북교점', '타로 페어링: 여사제 / 은둔자']) {
      expect(ko.textContent, s).toContain(s);
    }
    cleanup();
    const zh = await readHumanDesign('zh');
    expect(latinWords(zh, ['Arcana'])).toEqual([]);
    for (const s of ['投射者是世界的引导者。', '你的内在权威：直觉型', '如何做决定：直觉型权威', '北交点', '塔罗对应：女祭司／隐士']) {
      expect(zh.textContent, s).toContain(s);
    }
  });

  it('English is unchanged: the function’s own strings and the English copy', async () => {
    await i18n.changeLanguage('en');
    invoke.mockImplementation(() => later({ data: { data: HD_CHART, correlationId: 'c-hd' }, error: null }));
    const { container } = render(<MemoryRouter><HumanDesignPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Reveal my design' }));
    await screen.findByText('Wait for the invitation', undefined, { timeout: 5000 });
    const text = container.textContent ?? '';
    for (const s of [HD_CHART.authorityExplanation, 'Your inner authority: Splenic', 'Tarot pairing: The High Priestess / The Hermit', 'How to make decisions: Splenic Authority']) {
      expect(text, s).toContain(s);
    }
  });
});

describe('Partner compatibility result, in the reader’s language', () => {
  // The MBTI codes the reader chose, and the "MBTI" of the layer's own label.
  const CODES = ['INTJ', 'ENFP', 'MBTI'];

  it('Japanese: planets, aspects, every interpretation, the composite and the MBTI note read in Japanese', async () => {
    const container = await readCompat('ja');
    const text = container.textContent ?? '';
    expect(latinWords(container, CODES)).toEqual([]);
    for (const s of [
      // The function's own texts, by their keys (the Moon–Sun pair in the order it was sent).
      'お互いを自然に楽しめます。一緒にいて気楽な関係です。',
      '一方のアイデンティティが、もう一方の気持ちをじかに育みます。',
      '熱くなったり冷めたりします。',
      '強烈な愛です。',
      // Its generic texts, with the planets in Japanese.
      'あなたの火星と相手の土星は、じかに強く作用し合います。',
      'あなたの水星と相手の木星は、なめらかに調和します。',
      // Planet labels, aspect names, the orb.
      'あなたの太陽', '相手の金星', 'トライン', 'スクエア', '合', 'オーブ 0.9°',
      // Elements, composite, MBTI.
      '火', '風', '水',
      '土星の結びつき', '冥王星の接触', '太陽 ↔ 太陽', '月 ↔ 月',
      'コンポジットの太陽は、この関係の核となるアイデンティティを示します。',
      'ふたりは世界の捉え方が似ています（ふたりとも直観型）が、決め方は違います（T と F）。',
    ]) expect(text, s).toContain(s);

    fireEvent.click(screen.getByRole('button', { name: /この相性をシェア/ }));
    await waitFor(() => expect(share.out).toHaveBeenCalledTimes(1));
    const [, shareText] = share.out.mock.calls[0];
    expect(shareText).toMatch(/^ふたりの相性：\d+%$/);
    expect(share.card).toHaveBeenCalledWith(expect.objectContaining({
      tagline: 'アスペクト：調和 3 · 試練 2 · 強烈 3',
      affirmation: 'あなたの火星と相手の土星は、じかに強く作用し合います。ふたりのあいだに息づいているエネルギーを、それが何であれ増幅します。',
      brand: 'パートナー相性',
    }));
  });

  it('Korean and Chinese: the same result, no Latin left but the MBTI codes', async () => {
    const ko = await readCompat('ko');
    expect(latinWords(ko, CODES)).toEqual([]);
    for (const s of ['당신의 화성과 상대의 토성이 서로를 직접 강하게 눌러요.', '서로를 자연스럽게 즐겨요.', '토성의 결속', '오브 1.2°', '직관형']) {
      expect(ko.textContent, s).toContain(s);
    }
    cleanup();
    const zh = await readCompat('zh');
    expect(latinWords(zh, CODES)).toEqual([]);
    for (const s of ['你的火星与伴侣的土星直接相互施压。', '自然而然地享受彼此。', '土星的联结', '容许度 1.2°', '直觉型']) {
      expect(zh.textContent, s).toContain(s);
    }
  });

  it('English is unchanged: the function’s interpretations and the English MBTI note', async () => {
    await i18n.changeLanguage('en');
    const container = await (async () => {
      invoke.mockImplementation(() => later({ data: { data: SYNASTRY, correlationId: 'c-syn' }, error: null }));
      const r = render(<MemoryRouter><PartnerCompatPage /></MemoryRouter>);
      const dates = () => r.container.querySelectorAll('input[type="date"]') as NodeListOf<HTMLInputElement>;
      await waitFor(() => expect(dates()[0].value).toBe(PROFILE.birthDate));
      fireEvent.change(dates()[1], { target: { value: '1990-05-05' } });
      const selects = r.container.querySelectorAll('select');
      fireEvent.change(selects[0], { target: { value: 'INTJ' } });
      fireEvent.change(selects[1], { target: { value: 'ENFP' } });
      fireEvent.click(screen.getByRole('button', { name: /Reveal our compatibility/ }));
      await screen.findByRole('button', { name: /Share this match/ }, { timeout: 5000 });
      return r.container;
    })();
    const text = container.textContent ?? '';
    for (const a of SYNASTRY.crossAspects) expect(text).toContain(a.interpretation);
    for (const s of ['Your Mars', 'Partner’s Saturn', 'orb 0.9°', 'Saturn binding', 'Sun ↔ Sun',
      'You perceive the world similarly (both intuitive) but decide differently (T vs F).']) expect(text, s).toContain(s);
  });
});
