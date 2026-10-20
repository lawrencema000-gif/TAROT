import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, cleanup, within, act } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import i18n from '../../../i18n/config';
import { aiReadingSections, splitAiReading } from '../../cartomancy/cartoFlow';
import { TarotReadingResult } from './TarotReadingResult';
import type { TarotCard } from '../../../types';

/*
 * p9 Q10: a bought AI interpretation of a Past/Present/Future reading, as
 * generate-reading writes it ("1) A short overview… 2) A section for each
 * position… 3) 3 practical actions (bullets) 4) A calm closing"). The
 * summary took "1) Overview"; the rest was printed raw through ReadingProse:
 * "2) Past — Ace of Pentacles (Reversed)" with no 1), "- Build a results
 * dossier…" hyphens, and "3 Practical Actions" after "4) Future" (QA
 * m34-ai-0.png). The playing-card result already read the same shape into
 * headings (splitAiReading); both now share one reader of it.
 */

const QA_TEXT = [
  '1) Overview',
  'This spread shows a recent period where you may have missed a real opportunity.',
  '',
  '2) Past — Ace of Pentacles (Reversed)',
  'You’ve had chances to advance, but fear, timing, or scattered focus may have caused them to slip by.',
  '',
  '3) Present — Five of Wands (Upright)',
  'The current environment is competitive and a bit contentious.',
  '',
  '4) Future — Nine of Swords (Upright)',
  'Left unchecked, the stress around this decision could spiral into worry.',
  '',
  '3 Practical Actions',
  '- Build a results dossier: quantify 3–5 concrete wins.',
  '- Test the waters: schedule a brief alignment chat with your manager.',
  '- Set a decision window: choose a date this month to ask.',
  '',
  'Closing',
  'You have the talent — what you need now is structure, timing, and steadiness.',
].join('\n');

const JA_TEXT = [
  '1) 概要',
  'このスプレッドは、最近のチャンスを見送ってしまった時期を示しています。',
  '',
  '2) 過去 — ペンタクルのエース（逆位置）',
  '前に進む機会はありましたが、迷いがそれを遠ざけました。',
  '',
  '3) 実践的な行動',
  '・実績をまとめましょう。',
  '・上司と短く話してみましょう。',
  '・期限を決めましょう。',
  '',
  '結び',
  'あなたには力があります。',
].join('\n');

const card = (id: number, name: string): TarotCard =>
  ({ id, name, arcana: 'minor', suit: 'pentacles', keywords: ['k'], meaningUpright: 'Up.', meaningReversed: 'Down.' }) as unknown as TarotCard;
const CARDS = [
  { card: card(64, 'Ace of Pentacles'), reversed: true },
  { card: card(26, 'Five of Wands'), reversed: false },
  { card: card(58, 'Nine of Swords'), reversed: false },
];
const read = (lng: string, ns: string) => JSON.parse(readFileSync(join(process.cwd(), 'src', 'i18n', 'locales', lng, `${ns}.json`), 'utf8'));

beforeAll(async () => {
  for (const ns of ['app', 'common']) i18n.addResourceBundle('ja', ns, read('ja', ns), true, true);
  await i18n.changeLanguage('en');
});
afterEach(() => cleanup());
afterAll(async () => {
  await i18n.changeLanguage('en');
});

describe('the AI reading’s shape, read once for both decks (cartoFlow.aiReadingSections)', () => {
  it('the QA response: headings without their numbers, the actions as a list, the count gone from their heading', () => {
    const { lede, sections } = splitAiReading(QA_TEXT);
    expect(lede).toBe('This spread shows a recent period where you may have missed a real opportunity.');
    expect(sections.map((s) => s.heading)).toEqual([
      'Past — Ace of Pentacles (Reversed)',
      'Present — Five of Wands (Upright)',
      'Future — Nine of Swords (Upright)',
      'Practical Actions',
      'Closing',
    ]);
    expect(sections[3].items).toEqual([
      'Build a results dossier: quantify 3–5 concrete wins.',
      'Test the waters: schedule a brief alignment chat with your manager.',
      'Set a decision window: choose a date this month to ask.',
    ]);
    // The prose blocks are not lists.
    expect(sections[0].items).toBeUndefined();
  });

  it('a count that is not the list’s length stays: it is part of the heading', () => {
    const [s] = aiReadingSections('3 Things to watch\n- One.\n- Two.');
    expect(s.heading).toBe('3 Things to watch');
    expect(s.items).toEqual(['One.', 'Two.']);
  });

  it('ja: a sentence ending in 。 is never a heading; ・ items are a list', () => {
    const para = 'あなたは今、変化の入り口に立っています。\n次の一歩は小さくて構いません。';
    expect(aiReadingSections(para)).toEqual([{ body: para }]);
    const { lede, sections } = splitAiReading(JA_TEXT);
    expect(lede).toBe('このスプレッドは、最近のチャンスを見送ってしまった時期を示しています。');
    expect(sections.map((s) => s.heading)).toEqual(['過去 — ペンタクルのエース（逆位置）', '実践的な行動', '結び']);
    expect(sections[1].items).toEqual(['実績をまとめましょう。', '上司と短く話してみましょう。', '期限を決めましょう。']);
  });

  it('a heading alone in its block heads the paragraph after it (the summary is never "1) Overview")', () => {
    const { lede, sections } = splitAiReading('1) Overview\n\nThe gist.\n\n2) Past — The Fool\n\nWhere it began.');
    expect(lede).toBe('The gist.');
    expect(sections).toEqual([{ heading: 'Past — The Fool', body: 'Where it began.' }]);
  });
});

describe('p9 Q10 — the tarot result prints the AI reading as headings, paragraphs and a list', () => {
  it('en: no "2)" numbering, no raw "- " actions; three list items under "Practical Actions"', () => {
    render(
      <TarotReadingResult
        cards={CARDS}
        getPositionLabel={(i) => ['Past', 'Present', 'Future'][i]}
        selectedFocus="Career"
        eyebrow="Career reading"
        title="Past/Present/Future"
        aiInterpretation={QA_TEXT}
      />,
    );
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(expect.arrayContaining([
      'Past — Ace of Pentacles (Reversed)', 'Present — Five of Wands (Upright)', 'Future — Nine of Swords (Upright)', 'Practical Actions', 'Closing',
    ]));
    const text = document.body.textContent ?? '';
    expect(text).toContain('This spread shows a recent period');
    expect(text).not.toMatch(/\b[1-4]\) (?:Overview|Past|Present|Future)/);
    expect(text).not.toMatch(/- Build a results dossier/);
    expect(text).not.toContain('3 Practical Actions');
    const list = screen.getByRole('list');
    expect(within(list).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Build a results dossier: quantify 3–5 concrete wins.',
      'Test the waters: schedule a brief alignment chat with your manager.',
      'Set a decision window: choose a date this month to ask.',
    ]);
  });

  it('ja: the same, in the reader’s language', async () => {
    await act(async () => { await i18n.changeLanguage('ja'); });
    try {
      render(
        <TarotReadingResult
          cards={CARDS}
          getPositionLabel={(i) => ['過去', '現在', '未来'][i]}
          selectedFocus={null}
          eyebrow="キャリア"
          title="過去・現在・未来"
          aiInterpretation={JA_TEXT}
        />,
      );
      expect(screen.getByRole('heading', { level: 3, name: '過去 — ペンタクルのエース（逆位置）' })).toBeInTheDocument();
      expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(3);
      expect(document.body.textContent).not.toMatch(/[1-3]\) |・実績/);
    } finally {
      await act(async () => { await i18n.changeLanguage('en'); });
    }
  });
});
