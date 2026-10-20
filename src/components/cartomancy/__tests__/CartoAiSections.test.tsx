import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { CartoAiSections } from '../CartomancyResultParts';

/*
 * p9 QU1 R-b: a playing-card AI reading ends "3 Practical Actions" over
 * three "- " lines. splitAiReading reads them as list items (`items`) since
 * the QA round, and the tarot result prints them as a list
 * (TarotReadingResult.AiReadingSections); the playing-card result — the live
 * reveal and a saved reading in the Library both render CartoAiSections —
 * still printed the body through ReadingProse, hyphens and all.
 */

afterEach(() => cleanup());

const EN = [
  '1) Overview',
  'The cards point to a choice you have been putting off.',
  '',
  '2) The situation — Seven of Clubs',
  'You are holding your ground against pressure.',
  '',
  '3 Practical Actions',
  '- Write down the one thing you want.',
  '- Ask for it plainly, once.',
  '- Give it a week.',
  '',
  'Closing',
  'Steady hands make the next move.',
].join('\n');

const JA = [
  '1) 概要',
  'カードは、先延ばしにしてきた選択を示しています。',
  '',
  '2) 実践的な行動',
  '・望むことをひとつ書き出しましょう。',
  '・一度だけ、はっきり頼んでみましょう。',
  '・一週間待ちましょう。',
  '',
  '結び',
  '落ち着いた手が次の一歩を決めます。',
].join('\n');

describe('CartoAiSections: the actions as a list (QU1 R-b)', () => {
  it('en: three list items under "Practical Actions", no raw "- " lines; prose stays prose', () => {
    render(<CartoAiSections text={EN} />);
    expect(screen.getByRole('heading', { name: 'Practical Actions' })).toBeInTheDocument();
    const list = screen.getByRole('list');
    expect(list.className).toContain('list-disc');
    expect(within(list).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Write down the one thing you want.',
      'Ask for it plainly, once.',
      'Give it a week.',
    ]);
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/- Write down/);
    expect(text).toContain('You are holding your ground against pressure.');
    expect(text).toContain('Steady hands make the next move.');
    // The summary above the sections is the opening paragraph: not repeated here.
    expect(text).not.toContain('The cards point to a choice');
    expect(screen.getAllByRole('list')).toHaveLength(1);
  });

  it('ja: ・ items are a list too', () => {
    render(<CartoAiSections text={JA} />);
    expect(screen.getByRole('heading', { name: '実践的な行動' })).toBeInTheDocument();
    expect(within(screen.getByRole('list')).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      '望むことをひとつ書き出しましょう。',
      '一度だけ、はっきり頼んでみましょう。',
      '一週間待ちましょう。',
    ]);
    expect(document.body.textContent).not.toContain('・望む');
  });
});
