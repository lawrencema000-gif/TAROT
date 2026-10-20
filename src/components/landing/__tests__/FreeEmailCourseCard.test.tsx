import { describe, it, expect, vi, afterEach, afterAll } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

/*
 * p10 d2-ja-06: the landing page's free course listed '第1回: 78枚のカードを5つの
 * キーワードで' — an ASCII colon typed after the lesson title in every
 * language. The separator is the language's (common:punctuation.labelSeparator):
 * '：' in Japanese and Chinese, ': ' in English and Korean. The ja and zh
 * cases need the p10 'pages' delta merged.
 */

vi.mock('../../../lib/supabase', () => ({ supabase: { from: () => ({ insert: async () => ({ error: null }) }) } }));

import i18n from '../../../i18n/config';
import { FreeEmailCourseCard } from '../FreeEmailCourseCard';

afterEach(() => cleanup());
afterAll(async () => {
  await i18n.changeLanguage('en');
});

describe.each([
  ['ja', ['第1回：78枚のカードを5つのキーワードで', '第2回：スートの対応（ワンド、カップ、ソード、ペンタクル）', '第3回：カードの組み合わせのための数秘術の基礎']],
  ['zh', ['第一课：用 5 个关键词理解 78 张牌', '第二课：花色对应（权杖、圣杯、宝剑、星币）', '第三课：牌组组合中的数字学基础']],
  ['ko', ['1강: 78장의 카드를 5개의 키워드로', '2강: 슈트 대응 (완드, 컵, 소드, 펜타클)', '3강: 카드 조합을 위한 수비학 기초']],
  ['en', ['Lesson 1: The 78 cards in 5 keywords', 'Lesson 2: Suit correspondences (Wands, Cups, Swords, Pentacles)', 'Lesson 3: Numerology basics for card combinations']],
] as const)('free email course lessons in %s', (lng, lessons) => {
  it('separate each title from its topic the way the language does', async () => {
    await i18n.changeLanguage(lng);
    render(<FreeEmailCourseCard />);
    // As rendered (not whitespace-normalised): a single space after the
    // colon in English and Korean, none after the full-width one.
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(lessons);
  });
});
