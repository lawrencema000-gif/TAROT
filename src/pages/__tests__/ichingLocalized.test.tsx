import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createElement, forwardRef, type ReactNode } from 'react';

/*
 * The I Ching result and its 六爻 panel, in the reader's language.
 *
 * Before the 'iching' and 'liuyao' content overlays a Chinese, Korean or
 * Japanese reader got the hexagram's name in their language over English
 * everything else — tagline, Judgement, reading, strengths, cautions, the
 * changing hexagram's tagline, the journal prompt — and a 六爻 panel that
 * was English throughout, with traditional hanzi (納甲, 兌, 歸魂卦, 子孫, 動,
 * 應) on a simplified-Chinese screen.
 *
 * The page is driven through its real flow (cast the coins, six tosses,
 * result, open the 六爻 panel, expand every line), then its whole text is
 * swept for Latin script: none may remain beyond the brand.
 */

const USER = { id: '00000000-0000-4000-8000-0000000000a9', email: 'qa@example.com' };
const PROFILE = { id: USER.id, displayName: 'QA', birthDate: '1991-03-08', timezone: 'Asia/Shanghai', isPremium: false };

const chain: Record<string, unknown> = {};
for (const m of ['select', 'eq', 'order', 'in', 'like', 'limit', 'gte', 'lte', 'neq', 'is', 'filter']) chain[m] = () => chain;
chain.maybeSingle = async () => ({ data: { balance: 500 }, error: null });
chain.single = async () => ({ data: null, error: null });
chain.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null });

vi.mock('../../lib/supabase', () => ({
  supabase: {
    functions: { invoke: vi.fn() },
    rpc: async () => ({ data: null, error: null }),
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
// The six tosses land on a chosen cast, so every locale reads the same hexagrams.
const cast = vi.hoisted(() => ({ lines: [7, 7, 8, 9, 8, 8] as number[] }));
vi.mock('../../data/ichingHexagrams', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../data/ichingHexagrams')>();
  return { ...mod, castReading: () => mod.castFromLineValues(cast.lines as import('../../data/ichingHexagrams').LineValue[])! };
});

import i18n from '../../i18n/config';
import { IChingPage } from '../IChingPage';

type Lng = 'ja' | 'ko' | 'zh';

/** The Latin words on a page, text node by text node, minus the allowed ones. */
function latinWords(root: Element, allowed: readonly string[]): string[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const words: string[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) words.push(...(n.nodeValue?.match(/[A-Za-z]{2,}/g) ?? []));
  return words.filter((w) => !allowed.includes(w));
}

const CAST: Record<Lng, string> = { ja: 'コインを投げる', ko: '동전 던지기', zh: '掷硬币' };
const LIUYAO: Record<Lng, string> = { ja: 'この卦を六爻で読む', ko: '이 괘를 육효로 읽기', zh: '以六爻解此卦' };

/**
 * Cast, wait for the reading, open 六爻, then open each line in turn (the rows
 * are an accordion: one open at a time). Returns the page and everything it
 * showed along the way — the Latin words found and the text of every state.
 */
async function readCast(lng: Lng, lines: number[]) {
  cast.lines = lines;
  await i18n.changeLanguage(lng);
  vi.useFakeTimers({ now: new Date('2026-10-18T10:00:00'), shouldAdvanceTime: true });
  const { container } = render(<MemoryRouter><IChingPage /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: new RegExp(CAST[lng]) }));
  await act(async () => { await vi.advanceTimersByTimeAsync(6500); });
  vi.useRealTimers();
  fireEvent.click(await screen.findByRole('button', { name: LIUYAO[lng] }, { timeout: 5000 }));
  // The panel (lazy code, lazy prose) has opened when its six line rows are there.
  await waitFor(() => expect(container.querySelectorAll('button[aria-expanded]').length).toBe(6), { timeout: 5000 });
  const latin: string[] = [];
  const seen: string[] = [];
  for (let i = 0; i < 6; i++) {
    const row = () => container.querySelectorAll('button[aria-expanded]')[i] as HTMLButtonElement;
    row().focus();
    fireEvent.click(row());
    await waitFor(() => expect(row().getAttribute('aria-expanded')).toBe('true'));
    // Toggling a line does not remount the rows, so the pressed row keeps keyboard focus.
    expect(document.activeElement).toBe(row());
    latin.push(...latinWords(container, ['Arcana']));
    seen.push(container.textContent ?? '');
  }
  return { container, latin, text: seen.join('\n') };
}

/** The forms localizeHanzi converts for zh / ja, which must never reach those screens. */
const ZH_TRADITIONAL = [...'納兌離遊歸孫陳動應宮財龍'];
const JA_KYUJITAI = [...'應歸'];

beforeAll(() => {
  if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};
});
beforeEach(() => {
  share.card.mockReset();
  share.out.mockReset();
});
afterEach(() => {
  vi.useRealTimers();
  cleanup();
});
afterAll(async () => {
  await i18n.changeLanguage('en');
});

describe('I Ching result and 六爻 panel, in the reader’s language', () => {
  it('Chinese: 归妹 changing to 临 reads in simplified Chinese throughout, with no Latin but the brand', async () => {
    const { latin, text } = await readCast('zh', [7, 7, 8, 9, 8, 8]);
    expect(latin).toEqual([]);
    expect(ZH_TRADITIONAL.filter((ch) => text.includes(ch))).toEqual([]);
    // Typographic quotes in the Chinese, never ASCII ones.
    expect(text).not.toContain('"');
    for (const s of [
      // the result
      '归妹·嫁妹', '雷泽归妹', '不相称的安排——清醒地前行。', '有所行动则凶，没有什么有利之处。',
      '一段不太对劲的牵连就在这里', '清醒的认识', '在否认中走进去',
      '临·来临', '力量正在临近——趁窗口还开着，好好利用。',
      '我在哪里走进或停留在一个明知不太对的安排里？',
      // the 六爻 panel
      '六爻 · 纳甲筮法', '传统的易经解卦', '兑', '归魂卦', '日辰',
      '兑宫主“说”（悦）', '世爻就是你', '动爻是局面中没有静止的地方',
      '伏神 · 隐伏的六亲', '第4爻下伏子孙——这些是本卦中缺失的六亲',
      '动', '应', '妻财 · 资源与供给', '先把基础打好',
    ]) expect(text, s).toContain(s);

    fireEvent.click(screen.getByRole('button', { name: /分享这一卦/ }));
    await waitFor(() => expect(share.out).toHaveBeenCalledTimes(1));
    expect(share.out).toHaveBeenCalledWith('arcana-iching-54.png', '我的易经卦象：归妹·嫁妹。不相称的安排——清醒地前行。');
    expect(share.card).toHaveBeenCalledWith(expect.objectContaining({
      title: '归妹·嫁妹',
      tagline: '不相称的安排——清醒地前行。',
      affirmation: '我在哪里走进或停留在一个明知不太对的安排里？清醒的认识要求我做些什么？',
      brand: '易经',
    }));
  });

  it('Korean: 이괘 changing to 익괘 reads in Korean, the hanja kept beside the Korean names, with no Latin but the brand', async () => {
    const { latin, text } = await readCast('ko', [7, 8, 8, 8, 6, 7]);
    expect(latin).toEqual([]);
    for (const s of [
      '이·기름', '산뢰이(山雷頤)', '무엇을 먹이고 있는지 살피세요 — 몸, 마음, 영혼.', '바름을 지키면 길해요.',
      '당신은 무엇을 받아들이고 있나요?', '받아들이는 것을 살피는 마음', '폭식',
      '익·증가', '풍요가 흘러들어요 — 너그럽게 쓰세요.',
      // the 六爻 panel: hanja glyphs (traditional), Korean names and prose
      '六爻 · 納甲筮法', '巽', '遊魂卦', '고전적인 주역은', '손궁(巽宮)은 입(入)이에요',
      '父母 부모', '伏神 · 숨은 육친', '3효 아래의 官鬼 (관귀)', '5효 아래의 子孫 (자손)',
      '세효(世爻)는 당신이에요', '동효는 상황이 가만히 있지 않은 자리예요',
    ]) expect(text, s).toContain(s);
  });

  it('Japanese: the same 帰妹 cast reads in Japanese, in shinjitai (帰魂卦, 応), with no Latin but the brand', async () => {
    const { latin, text } = await readCast('ja', [7, 7, 8, 9, 8, 8]);
    expect(latin).toEqual([]);
    expect(JA_KYUJITAI.filter((ch) => text.includes(ch))).toEqual([]);
    for (const s of [
      '帰妹・嫁ぐ娘', '雷沢帰妹', 'ふさわしくない取り決め——自覚をもって進みましょう。', '事を起こせば凶です。',
      '臨・接近', '力が近づいています——窓が開いているうちに生かしましょう。',
      '六爻 · 納甲筮法', '兌', '帰魂卦', '応', '動', '兌宮は「説（悦）」です', '第4爻の下に子孫',
    ]) expect(text, s).toContain(s);
  });
});
