import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createElement, forwardRef, type ReactNode } from 'react';

/*
 * The Love Tree result, p10 QA (ja):
 *
 *  - d2-ja-08: "Share my tree" sent '…あなたのツリーは arcana.app/love-tree で'.
 *    arcana.app is not the app (403 / 404); the same host was in every
 *    language. The link is the app's own page now, last in the text and
 *    never written against a word.
 *  - d2-ja-06: the two scores read '不安: 3.3 / 回避: 2.7', an ASCII colon
 *    after Japanese. The separator is the language's
 *    (common:punctuation.labelSeparator): '：' in ja and zh, ': ' in en and ko.
 *
 * Both read the locale files, so the ja / ko / zh cases need the p10 'pages'
 * delta merged (loveTree.shareText with {{url}}; the separator key).
 */

vi.mock('../../lib/supabase', () => ({ supabase: {} }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: async () => {} }) }));
vi.mock('../../dal', () => ({ quizResults: { insert: async () => ({ ok: true, data: undefined }) } }));
const shared = vi.hoisted(() => ({ texts: [] as string[] }));
vi.mock('../../utils/shareCard', () => ({
  shareOrDownloadCard: async (_card: unknown, _file: string, text: string) => {
    shared.texts.push(text);
    return 'shared';
  },
}));
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
import { LOVE_TREE_QUIZ, scoreLoveTree } from '../../data/loveTree';
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

/** Answer all twelve "agree" (4): a fresh result, with its two scores. */
async function growTree() {
  fireEvent.click(await screen.findByRole('button', { name: new RegExp(i18n.t('app:loveTree.startCta')) }));
  const agree = i18n.t('app:loveTree.likert.4');
  for (let n = 0; n < LOVE_TREE_QUIZ.length; n++) {
    fireEvent.click(await screen.findByRole('button', { name: new RegExp(`^${agree}\\d`) }));
  }
  await screen.findByRole('button', { name: i18n.t('app:loveTree.share') });
}

const SCORES = scoreLoveTree(Object.fromEntries(LOVE_TREE_QUIZ.map((q) => [q.id, 4])));

beforeEach(() => {
  shared.texts.length = 0;
  vi.stubGlobal('scrollTo', () => {});
});
afterEach(() => cleanup());
afterAll(async () => {
  await i18n.changeLanguage('en');
});

describe('Love Tree scores: label and value separated the language’s way (d2-ja-06)', () => {
  for (const [lng, anxiety, avoidance] of [
    ['ja', '不安：', '回避：'],
    ['zh', '焦虑：', '回避：'],
    ['ko', '불안: ', '회피: '],
    ['en', 'Anxiety: ', 'Avoidance: '],
  ] as const) {
    it(`${lng}: ${anxiety}${SCORES.anxiety} and ${avoidance}${SCORES.avoidance}`, async () => {
      await i18n.changeLanguage(lng);
      mount();
      await growTree();
      // The text as rendered, not whitespace-normalised: no ASCII colon, and
      // a space only where the language puts one.
      const raw = { normalizer: (s: string) => s };
      expect(screen.getByText(`${anxiety}${SCORES.anxiety}`, raw)).toBeInTheDocument();
      expect(screen.getByText(`${avoidance}${SCORES.avoidance}`, raw)).toBeInTheDocument();
    });
  }
});

describe('Love Tree share text links to the app (d2-ja-08)', () => {
  for (const lng of ['en', 'ja', 'ko', 'zh'] as const) {
    it(`${lng}: ends with https://tarotlife.app/love-tree and names no other host`, async () => {
      await i18n.changeLanguage(lng);
      mount();
      await growTree();
      fireEvent.click(screen.getByRole('button', { name: i18n.t('app:loveTree.share') }));
      await waitFor(() => expect(shared.texts).toHaveLength(1));
      const [text] = shared.texts;
      expect(text).not.toContain('arcana.app');
      expect(text).not.toContain('{{');
      // Last, after a space or the full-width colon: a word written against
      // the link ("…/love-tree에서") is taken into it by a messenger's linkifier.
      expect(text).toMatch(/(?: |：)https:\/\/tarotlife\.app\/love-tree$/);
    });
  }
});
