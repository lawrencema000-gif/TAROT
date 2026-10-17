import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createElement, forwardRef, type ReactNode } from 'react';

/*
 * Love Tree in the reader's language (Q18). In zh and ko the twelve
 * statements, the dimension eyebrow, the five answers and the whole result
 * (title, archetype, summary, strengths, growth, in love, affirmation) were
 * the English of src/data/loveTree.ts: "ANXIETY", "I worry that partners
 * won't care about me…", "Strongly disagree", "Anxious / The reaching
 * branches". Driven through the real page, signed out (nothing is saved).
 */

vi.mock('../../lib/supabase', () => ({ supabase: {} }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: async () => {} }) }));
vi.mock('../../dal', () => ({ quizResults: { insert: async () => ({ ok: true, data: undefined }) } }));
vi.mock('../../utils/shareCard', () => ({ shareOrDownloadCard: async () => 'shared' }));
vi.mock('framer-motion', () => {
  const strip = ({ initial, animate, exit, transition, whileTap, whileHover, layout, variants, ...rest }: Record<string, unknown>) => {
    void initial; void animate; void exit; void transition; void whileTap; void whileHover; void layout; void variants;
    return rest;
  };
  const motion = new Proxy({}, {
    get: (_t, tag: string) => forwardRef<HTMLElement, Record<string, unknown> & { children?: ReactNode }>(function M(props, ref) {
      return createElement(tag, { ...strip(props), ref }, props.children as ReactNode);
    }),
  });
  return {
    motion,
    AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
    useReducedMotion: () => true,
  };
});

import i18n from '../../i18n/config';
import { LoveTreePage } from '../LoveTreePage';
import { ATTACHMENT_INFO, LOVE_TREE_QUIZ } from '../../data/loveTree';
import '@testing-library/jest-dom/vitest';

function mount() {
  return render(
    <MemoryRouter initialEntries={['/love-tree']}>
      <Routes>
        <Route path="/love-tree" element={<LoveTreePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Every English sentence the result could show for a style. */
function englishOf(style: keyof typeof ATTACHMENT_INFO): string[] {
  const i = ATTACHMENT_INFO[style];
  return [i.title, i.archetype, i.summary, ...i.strengths, ...i.growth, i.inLove, i.affirmation];
}

/** Answer every statement with `value` (1 = strongly disagree … 5 = strongly agree). */
async function answerAll(labelOf: (v: number) => string, value: number) {
  for (let n = 0; n < LOVE_TREE_QUIZ.length; n++) {
    fireEvent.click(await screen.findByRole('button', { name: new RegExp(`^${labelOf(value)}`) }));
  }
}

beforeEach(() => {
  vi.stubGlobal('scrollTo', () => {});
});
afterEach(() => cleanup());
afterAll(async () => {
  await i18n.changeLanguage('en');
});

describe('Love Tree in Japanese', () => {
  it('asks the statements, answers and eyebrow in Japanese and reads the result in Japanese', async () => {
    await i18n.changeLanguage('ja');
    mount();
    fireEvent.click(await screen.findByRole('button', { name: /私の木を育てる/ }));

    expect(await screen.findByText('自分が相手を思うほど、恋人は自分を大切に思ってくれないのではと不安になる。')).toBeInTheDocument();
    expect(screen.getByText('不安')).toBeInTheDocument();
    for (const label of ['まったくそう思わない', 'そう思わない', 'どちらでもない', 'そう思う', 'とてもそう思う']) {
      expect(screen.getByRole('button', { name: new RegExp(`^${label}\\d`) })).toBeInTheDocument();
    }
    expect(document.body.textContent).not.toMatch(/Strongly|Neutral|anxiety|I worry/);

    // All "strongly disagree": low anxiety, low avoidance (a4, a6, v5 reverse) → secure.
    await answerAll(() => 'まったくそう思わない', 1);
    expect(await screen.findByText('安定型')).toBeInTheDocument();
    expect(screen.getByText('揺るがない樹冠')).toBeInTheDocument();
    expect(screen.getByText('距離を置かれることと、拒絶されることを混同しません。')).toBeInTheDocument();
    expect(screen.getByText('愛は追いかけるものではなく、帰っていく場所です。')).toBeInTheDocument();
    const text = document.body.textContent ?? '';
    for (const en of englishOf('secure')) expect(text.includes(en), en).toBe(false);
  });
});

describe.each([
  ['zh', '种下我的树', '我担心恋人在乎我，不如我在乎他们那么多。', '焦虑', '非常同意', '恐惧回避型', '分裂的树冠'],
  ['ko', '내 나무 키우기', '내가 연인을 아끼는 만큼 연인이 나를 아껴 주지 않을까 봐 걱정된다.', '불안', '매우 그렇다', '공포 회피형', '둘로 갈라진 우듬지'],
])('Love Tree in %s', (lng, start, firstStatement, eyebrow, agree, title, archetype) => {
  it('the QA scenario: question 1 and the result are in the reader’s language', async () => {
    await i18n.changeLanguage(lng);
    mount();
    fireEvent.click(await screen.findByRole('button', { name: new RegExp(start) }));
    expect(await screen.findByText(firstStatement)).toBeInTheDocument();
    expect(screen.getByText(eyebrow)).toBeInTheDocument();

    // All "strongly agree": high anxiety and avoidance → fearful-avoidant.
    await answerAll(() => agree, 5);
    expect(await screen.findByText(title)).toBeInTheDocument();
    expect(screen.getByText(archetype)).toBeInTheDocument();
    const text = document.body.textContent ?? '';
    for (const en of englishOf('fearful')) expect(text.includes(en), en).toBe(false);
  });
});

describe('Love Tree in English', () => {
  it('still reads the English source', async () => {
    await i18n.changeLanguage('en');
    mount();
    fireEvent.click(await screen.findByRole('button', { name: /Grow my tree/ }));
    expect(await screen.findByText(LOVE_TREE_QUIZ[0].prompt)).toBeInTheDocument();
    expect(screen.getByText('Anxiety')).toBeInTheDocument();
    await answerAll(() => 'Strongly disagree', 1);
    expect(await screen.findByText('Secure')).toBeInTheDocument();
    expect(screen.getByText(ATTACHMENT_INFO.secure.affirmation)).toBeInTheDocument();
  });
});
