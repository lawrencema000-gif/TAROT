import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { aiReadingSections, splitAiReading } from '../cartoFlow';
import { CartoAiSections } from '../CartomancyResultParts';
import { AiReadingSections } from '../../readings/tarot/TarotReadingResult';
import { splitLede } from '../../readings/tarot/readingText';

/*
 * p10 d2-ja-02: asked for "a section for each position", the model wrote
 * each position's heading as a list item over its paragraph. The paid
 * reading of a Japanese 3枚引き printed "- 過去から抱えているもの（Five of Clubs）"
 * as a paragraph, dash and all — on the reveal, the saved reading and the
 * Library's AI reading. The fixture is that reading's stored text, line for
 * line (the paragraphs shortened); its English card names are d2-ja-01's.
 */

afterEach(() => cleanup());

const STORED_JA = [
  '1) 全体の流れ',
  '人脈と協働が土台になり、望んでいた着地点に近づいていく流れです。',
  '',
  '2) ポジション別',
  '- 過去から抱えているもの（Five of Clubs）',
  'あなたは既に良い協働関係や新しいネットワークを育ててきました。',
  '',
  '- 今いる場所（Queen of Diamonds）',
  'いまは評判がよくも悪くも早く伝わる場にいます。',
  '',
  '- この先の傾き（Nine of Hearts）',
  '「願いのカード」。達成や納得のいく認知が見込めます。',
  '',
  '3) 具体的アクション',
  '- 願いを一文で定義する（例：「〇月までに新案件を受注する」）。数値や期日を入れて明確化。',
  '- 既存ネットワークを3件だけ深掘り：紹介依頼、近況共有、価値提案をセットで。',
  '- 週1で「体力の貯金」を作る習慣を固定。',
  '',
  '4) まとめ',
  'あなたの丁寧なつながり方と実直な働きが、願いの実現を後押しします。',
].join('\n');

const POSITIONS_JA = ['過去から抱えているもの（Five of Clubs）', '今いる場所（Queen of Diamonds）', 'この先の傾き（Nine of Hearts）'];

/** Every printed line that still starts with a list marker. */
const markedLines = (text: string) => text.split('\n').map((l) => l.trim()).filter((l) => /^[-*•・]\s?\S/.test(l));

describe('d2-ja-02 — a position heading written as an item reads as a heading', () => {
  it('ja, the stored reading: three position headings without their dash, the actions still a list', () => {
    const { lede, sections } = splitAiReading(STORED_JA);
    expect(lede).toBe('人脈と協働が土台になり、望んでいた着地点に近づいていく流れです。');
    expect(sections.map((s) => s.heading)).toEqual(['ポジション別', ...POSITIONS_JA, '具体的アクション', 'まとめ']);
    expect(sections[0].body).toBe('');
    expect(sections[1]).toEqual({ heading: POSITIONS_JA[0], body: 'あなたは既に良い協働関係や新しいネットワークを育ててきました。' });
    expect(sections[3].body).toBe('「願いのカード」。達成や納得のいく認知が見込めます。');
    expect(sections[4].items).toEqual([
      '願いを一文で定義する（例：「〇月までに新案件を受注する」）。数値や期日を入れて明確化。',
      '既存ネットワークを3件だけ深掘り：紹介依頼、近況共有、価値提案をセットで。',
      '週1で「体力の貯金」を作る習慣を固定。',
    ]);
    for (const s of sections) if (!s.items) expect(markedLines(s.body), s.heading).toEqual([]);
  });

  it('ko, a blank line under each heading: the item still heads the paragraph after it', () => {
    const text = [
      '1) 전체 흐름',
      '협업이 바탕이 되어 바라던 곳에 가까워지고 있어요.',
      '',
      '2) 위치별 해석',
      '',
      '- 과거에서 안고 있는 것 (클로버 5)',
      '',
      '이미 좋은 협업 관계를 키워 왔어요.',
      '',
      '- 지금 있는 곳 (다이아몬드 퀸)',
      '',
      '평판이 빠르게 전해지는 자리에 있어요.',
    ].join('\n');
    const { sections } = splitAiReading(text);
    expect(sections).toEqual([
      { heading: '위치별 해석', body: '' },
      { heading: '과거에서 안고 있는 것 (클로버 5)', body: '이미 좋은 협업 관계를 키워 왔어요.' },
      { heading: '지금 있는 곳 (다이아몬드 퀸)', body: '평판이 빠르게 전해지는 자리에 있어요.' },
    ]);
  });

  it('zh, every position in one block: cut at each heading', () => {
    const text = [
      '1) 整体走向',
      '人脉与合作是基础。',
      '',
      '2) 各位置解读',
      '- 过去带来的（梅花5）',
      '你已经培养了良好的合作关系。',
      '- 现在所处（方块Q）',
      '你的口碑传得很快。',
      '- 未来的倾向（红心9）',
      '愿望有望实现。',
    ].join('\n');
    const { sections } = splitAiReading(text);
    expect(sections).toEqual([
      { heading: '各位置解读', body: '' },
      { heading: '过去带来的（梅花5）', body: '你已经培养了良好的合作关系。' },
      { heading: '现在所处（方块Q）', body: '你的口碑传得很快。' },
      { heading: '未来的倾向（红心9）', body: '愿望有望实现。' },
    ]);
  });

  it('en: a bold item, a "*" or a "・" marker heads its paragraph the same way', () => {
    expect(aiReadingSections('* **Past — Five of Clubs (Upright)**\nYou have built good partnerships.')).toEqual([
      { heading: 'Past — Five of Clubs (Upright)', body: 'You have built good partnerships.' },
    ]);
    expect(aiReadingSections('・現在：ダイヤのクイーン\n評判が早く伝わる場にいます。')).toEqual([
      { heading: '現在：ダイヤのクイーン', body: '評判が早く伝わる場にいます。' },
    ]);
  });

  it('a list stays a list: items over items, a sentence item, a closing line, one item to a block', () => {
    // Items over items, then a sentence that closes the list: nothing is cut.
    expect(aiReadingSections('- Write it down\n- Ask once\nThen give it a week.')).toEqual([
      { body: '- Write it down\n- Ask once\nThen give it a week.' },
    ]);
    // An item that is a sentence is never a heading.
    expect(aiReadingSections('- 願いを一文で定義する。\n数値や期日を入れて明確化。')).toEqual([
      { body: '- 願いを一文で定義する。\n数値や期日を入れて明確化。' },
    ]);
    // A list spaced one item to a block, then the closing paragraph: the last item stays an item.
    expect(aiReadingSections('3) Actions\n\n- Write it down\n\n- Ask once\n\nThen give it a week.')).toEqual([
      { heading: 'Actions', body: '- Write it down', items: ['Write it down'] },
      { body: '- Ask once', items: ['Ask once'] },
      { body: 'Then give it a week.' },
    ]);
    // The QA round's shapes keep reading as they did.
    expect(aiReadingSections('3 Things to watch\n- One.\n- Two.')).toEqual([
      { heading: '3 Things to watch', body: '- One.\n- Two.', items: ['One.', 'Two.'] },
    ]);
  });
});

describe('d2-ja-02 — the surfaces print the position headings as headings', () => {
  it('the tarot result and the Library’s AI reading (AiReadingSections): headings, no dash', () => {
    const { lede, rest } = splitLede(STORED_JA);
    expect(lede).toBe('人脈と協働が土台になり、望んでいた着地点に近づいていく流れです。');
    const { container } = render(<AiReadingSections text={rest} headingLevel="h5" />);
    for (const name of POSITIONS_JA) expect(screen.getByRole('heading', { level: 5, name })).toBeInTheDocument();
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(3);
    const printed = [...container.querySelectorAll('p, h5')].map((el) => el.textContent ?? '');
    expect(printed.filter((t) => /^-\s/.test(t.trim()))).toEqual([]);
    expect(container.textContent).not.toContain('- 過去');
  });

  it('the playing-card result and a saved playing-card reading (CartoAiSections): the same', () => {
    const { container } = render(<CartoAiSections text={STORED_JA} />);
    for (const name of ['ポジション別', ...POSITIONS_JA, '具体的アクション', 'まとめ']) {
      expect(screen.getByRole('heading', { level: 3, name })).toBeInTheDocument();
    }
    expect(container.textContent).not.toMatch(/- (過去|今いる|この先)/);
  });
});
